/**
 * Board Game Cafe - admin authentication for Google Apps Script.
 *
 * Secrets are deliberately NOT stored in this source file. The one-time
 * configureAdminPassword() flow writes only a salted password hash to Script
 * Properties. Admin sessions are short-lived and live in Script Cache.
 *
 * This file shares the global Apps Script namespace with Code.gs. All private
 * helpers therefore use an admin-specific prefix to avoid collisions.
 */

const ADMIN_AUTH_CONFIG = Object.freeze({
  passwordHashProperty: 'BOARD_GAME_CAFE_ADMIN_PASSWORD_HASH',
  passwordSaltProperty: 'BOARD_GAME_CAFE_ADMIN_PASSWORD_SALT',
  passwordRoundsProperty: 'BOARD_GAME_CAFE_ADMIN_PASSWORD_ROUNDS',
  authVersionProperty: 'BOARD_GAME_CAFE_ADMIN_AUTH_VERSION',
  sessionCachePrefix: 'bgc:admin:session:',
  loginThrottleCachePrefix: 'bgc:admin:login:',
  sessionTtlSeconds: 60 * 60,
  passwordHashRounds: 2000,
  minimumPasswordLength: 12,
  maximumPasswordLength: 256,
  maximumLoginFailures: 8,
  loginFailureWindowSeconds: 10 * 60,
  loginLockSeconds: 10 * 60,
});

/**
 * One-time password setup. Run this function manually from the bound
 * spreadsheet/Apps Script project while signed in as the spreadsheet owner.
 *
 * The password is requested through the Spreadsheet UI and is never written
 * to a source file. Changing it rotates authVersion, invalidating every prior
 * admin session even if a stale CacheService entry remains.
 */
function configureAdminPassword() {
  adminAssertActiveSpreadsheetOwner_();

  const ui = SpreadsheetApp.getUi();
  const first = ui.prompt(
    'Thiết lập mật khẩu quản trị',
    `Nhập mật khẩu mới (ít nhất ${ADMIN_AUTH_CONFIG.minimumPasswordLength} ký tự). ` +
      'Mật khẩu sẽ chỉ được lưu dưới dạng hash trong Script Properties.',
    ui.ButtonSet.OK_CANCEL
  );

  if (first.getSelectedButton() !== ui.Button.OK) {
    return 'Đã hủy thiết lập mật khẩu quản trị.';
  }

  const password = String(first.getResponseText() || '');
  adminValidateNewPassword_(password);

  const confirmation = ui.prompt(
    'Xác nhận mật khẩu quản trị',
    'Nhập lại mật khẩu vừa chọn.',
    ui.ButtonSet.OK_CANCEL
  );

  if (confirmation.getSelectedButton() !== ui.Button.OK) {
    return 'Đã hủy thiết lập mật khẩu quản trị.';
  }

  if (password !== String(confirmation.getResponseText() || '')) {
    throw new Error('ADMIN_PASSWORD_MISMATCH: Hai lần nhập mật khẩu không giống nhau.');
  }

  const salt = adminCreateRandomToken_();
  const rounds = ADMIN_AUTH_CONFIG.passwordHashRounds;
  const passwordHash = adminDerivePasswordHash_(password, salt, rounds);
  const authVersion = Utilities.getUuid();

  PropertiesService.getScriptProperties().setProperties(
    {
      [ADMIN_AUTH_CONFIG.passwordHashProperty]: passwordHash,
      [ADMIN_AUTH_CONFIG.passwordSaltProperty]: salt,
      [ADMIN_AUTH_CONFIG.passwordRoundsProperty]: String(rounds),
      [ADMIN_AUTH_CONFIG.authVersionProperty]: authVersion,
    },
    false
  );

  ui.alert(
    'Đã thiết lập mật khẩu quản trị',
    'Mọi phiên đăng nhập quản trị cũ đã bị vô hiệu hóa.',
    ui.ButtonSet.OK
  );

  return 'Đã thiết lập mật khẩu quản trị.';
}

/**
 * Login contract used by AdminDashboard.html.
 *
 * Success:
 *   { success: true, sessionToken, expiresInSeconds }
 * Failure:
 *   { success: false, code, message, retryAfterSeconds? }
 */
function adminLogin(password) {
  const throttleKey = adminLoginThrottleKey_();
  const throttle = adminReadLoginThrottle_(throttleKey);
  const now = Date.now();

  if (throttle.blockedUntil > now) {
    return {
      success: false,
      code: 'ADMIN_LOGIN_RATE_LIMITED',
      message: 'Đăng nhập tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau.',
      retryAfterSeconds: Math.max(1, Math.ceil((throttle.blockedUntil - now) / 1000)),
    };
  }

  const rawSuppliedPassword = String(password == null ? '' : password);
  const suppliedPasswordTooLong =
    rawSuppliedPassword.length > ADMIN_AUTH_CONFIG.maximumPasswordLength;
  // Bound work for untrusted web-app input. Configured passwords can never be
  // longer than this because configureAdminPassword() enforces the same cap.
  const suppliedPassword = rawSuppliedPassword.slice(
    0,
    ADMIN_AUTH_CONFIG.maximumPasswordLength
  );
  const properties = PropertiesService.getScriptProperties();
  const passwordHash = String(
    properties.getProperty(ADMIN_AUTH_CONFIG.passwordHashProperty) || ''
  );
  const passwordSalt = String(
    properties.getProperty(ADMIN_AUTH_CONFIG.passwordSaltProperty) || ''
  );
  const authVersion = String(
    properties.getProperty(ADMIN_AUTH_CONFIG.authVersionProperty) || ''
  );
  const configuredRounds = Number(
    properties.getProperty(ADMIN_AUTH_CONFIG.passwordRoundsProperty)
  );
  const rounds =
    Number.isInteger(configuredRounds) && configuredRounds > 0
      ? configuredRounds
      : ADMIN_AUTH_CONFIG.passwordHashRounds;

  if (!passwordHash || !passwordSalt || !authVersion) {
    return {
      success: false,
      code: 'ADMIN_NOT_CONFIGURED',
      message: 'Chưa thiết lập mật khẩu quản trị trong Apps Script.',
    };
  }

  // Always derive a hash before rejecting so configured logins have a more
  // uniform response path. The dashboard applies the stricter length rules at
  // password-creation time; login accepts the exact configured value.
  const suppliedHash = adminDerivePasswordHash_(suppliedPassword, passwordSalt, rounds);

  if (
    suppliedPasswordTooLong ||
    !adminConstantTimeEquals_(suppliedHash, passwordHash)
  ) {
    adminRecordLoginFailure_(throttleKey, throttle, now);
    return {
      success: false,
      code: 'ADMIN_INVALID_CREDENTIALS',
      message: 'Mật khẩu quản trị không đúng.',
    };
  }

  CacheService.getScriptCache().remove(throttleKey);

  const sessionToken = adminCreateRandomToken_();
  const sessionKey = adminSessionCacheKey_(sessionToken);
  const session = {
    authVersion,
    createdAt: now,
    lastSeenAt: now,
  };

  CacheService.getScriptCache().put(
    sessionKey,
    JSON.stringify(session),
    ADMIN_AUTH_CONFIG.sessionTtlSeconds
  );

  return {
    success: true,
    sessionToken,
    expiresInSeconds: ADMIN_AUTH_CONFIG.sessionTtlSeconds,
  };
}

function adminLogout(sessionToken) {
  const token = String(sessionToken == null ? '' : sessionToken).trim();

  if (token) {
    CacheService.getScriptCache().remove(adminSessionCacheKey_(token));
  }

  return { success: true };
}

/**
 * Shared private guard for AdminService.gs and CheckInService.gs.
 * It throws a stable code prefix so AdminDashboard.html can distinguish an
 * expired session from an ordinary backend error.
 */
function requireAdminSession_(sessionToken) {
  const token = String(sessionToken == null ? '' : sessionToken).trim();

  if (!token || token.length > 512) {
    throw new Error('ADMIN_SESSION_REQUIRED: Vui lòng đăng nhập quản trị.');
  }

  const sessionKey = adminSessionCacheKey_(token);
  const cache = CacheService.getScriptCache();
  const serialized = cache.get(sessionKey);

  if (!serialized) {
    throw new Error('ADMIN_SESSION_REQUIRED: Phiên quản trị đã hết hạn.');
  }

  let session;
  try {
    session = JSON.parse(serialized);
  } catch (_) {
    cache.remove(sessionKey);
    throw new Error('ADMIN_SESSION_REQUIRED: Phiên quản trị không hợp lệ.');
  }

  const currentAuthVersion = String(
    PropertiesService.getScriptProperties().getProperty(
      ADMIN_AUTH_CONFIG.authVersionProperty
    ) || ''
  );

  if (!currentAuthVersion || session.authVersion !== currentAuthVersion) {
    cache.remove(sessionKey);
    throw new Error('ADMIN_SESSION_REQUIRED: Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.');
  }

  session.lastSeenAt = Date.now();
  cache.put(
    sessionKey,
    JSON.stringify(session),
    ADMIN_AUTH_CONFIG.sessionTtlSeconds
  );

  return {
    authenticated: true,
    createdAt: Number(session.createdAt) || 0,
    lastSeenAt: session.lastSeenAt,
  };
}

function adminAssertActiveSpreadsheetOwner_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      'ADMIN_OWNER_REQUIRED: Chỉ có thể thiết lập mật khẩu từ Apps Script gắn với Google Sheet.'
    );
  }

  const owner = spreadsheet.getOwner();
  const ownerEmail = owner ? String(owner.getEmail() || '').trim().toLowerCase() : '';
  const activeEmail = String(Session.getActiveUser().getEmail() || '')
    .trim()
    .toLowerCase();

  // Do not fall back to Session.getEffectiveUser(): a public web app deployed
  // as the owner also runs with the owner's effective identity for anonymous
  // visitors. Requiring the active identity prevents that privilege confusion.
  if (!ownerEmail || !activeEmail || ownerEmail !== activeEmail) {
    throw new Error(
      'ADMIN_OWNER_REQUIRED: Chỉ chủ sở hữu Google Sheet đang đăng nhập mới được đổi mật khẩu.'
    );
  }
}

function adminValidateNewPassword_(password) {
  const length = String(password == null ? '' : password).length;

  if (length < ADMIN_AUTH_CONFIG.minimumPasswordLength) {
    throw new Error(
      `ADMIN_PASSWORD_TOO_SHORT: Mật khẩu phải có ít nhất ${ADMIN_AUTH_CONFIG.minimumPasswordLength} ký tự.`
    );
  }

  if (length > ADMIN_AUTH_CONFIG.maximumPasswordLength) {
    throw new Error(
      `ADMIN_PASSWORD_TOO_LONG: Mật khẩu không được vượt quá ${ADMIN_AUTH_CONFIG.maximumPasswordLength} ký tự.`
    );
  }
}

function adminDerivePasswordHash_(password, salt, rounds) {
  let value = `${String(salt)}:${String(password)}`;
  const count = Math.max(1, Number(rounds) || 1);

  for (let index = 0; index < count; index += 1) {
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      value,
      Utilities.Charset.UTF_8
    );
    value = Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
  }

  return value;
}

function adminSha256_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function adminCreateRandomToken_() {
  const material = [
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(Date.now()),
    String(Math.random()),
  ].join(':');

  return adminSha256_(material) + adminSha256_(material.split('').reverse().join(''));
}

function adminSessionCacheKey_(sessionToken) {
  return ADMIN_AUTH_CONFIG.sessionCachePrefix + adminSha256_(sessionToken);
}

function adminLoginThrottleKey_() {
  let actorKey = '';

  try {
    actorKey = String(Session.getTemporaryActiveUserKey() || '');
  } catch (_) {
    actorKey = '';
  }

  return (
    ADMIN_AUTH_CONFIG.loginThrottleCachePrefix +
    adminSha256_(actorKey || 'anonymous').slice(0, 40)
  );
}

function adminReadLoginThrottle_(cacheKey) {
  const serialized = CacheService.getScriptCache().get(cacheKey);

  if (!serialized) {
    return { count: 0, firstFailureAt: 0, blockedUntil: 0 };
  }

  try {
    const value = JSON.parse(serialized);
    return {
      count: Math.max(0, Number(value.count) || 0),
      firstFailureAt: Math.max(0, Number(value.firstFailureAt) || 0),
      blockedUntil: Math.max(0, Number(value.blockedUntil) || 0),
    };
  } catch (_) {
    return { count: 0, firstFailureAt: 0, blockedUntil: 0 };
  }
}

function adminRecordLoginFailure_(cacheKey, current, now) {
  const windowMs = ADMIN_AUTH_CONFIG.loginFailureWindowSeconds * 1000;
  const isWithinWindow = current.firstFailureAt && now - current.firstFailureAt < windowMs;
  const count = isWithinWindow ? current.count + 1 : 1;
  const firstFailureAt = isWithinWindow ? current.firstFailureAt : now;
  const blockedUntil =
    count >= ADMIN_AUTH_CONFIG.maximumLoginFailures
      ? now + ADMIN_AUTH_CONFIG.loginLockSeconds * 1000
      : 0;

  CacheService.getScriptCache().put(
    cacheKey,
    JSON.stringify({ count, firstFailureAt, blockedUntil }),
    Math.max(
      ADMIN_AUTH_CONFIG.loginFailureWindowSeconds,
      ADMIN_AUTH_CONFIG.loginLockSeconds
    )
  );
}

function adminConstantTimeEquals_(left, right) {
  const first = String(left == null ? '' : left);
  const second = String(right == null ? '' : right);
  const maxLength = Math.max(first.length, second.length);
  let difference = first.length ^ second.length;

  for (let index = 0; index < maxLength; index += 1) {
    const firstCode = index < first.length ? first.charCodeAt(index) : 0;
    const secondCode = index < second.length ? second.charCodeAt(index) : 0;
    difference |= firstCode ^ secondCode;
  }

  return difference === 0;
}
