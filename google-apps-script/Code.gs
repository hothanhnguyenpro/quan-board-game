/**
 * Noburi Board Game Cafe — meetup, table pulse and admin backend.
 *
 * Deployment:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Security notes:
 * - Customer registration stays public by design.
 * - Admin passwords and signing secrets never live in this file. They are
 *   stored in Apps Script Script Properties by AdminConfig.gs.
 * - Admin mutations are served from AdminDashboard.html via google.script.run.
 */

const APP_BACKEND_CONFIG = {
  // Explicit ID keeps editor triggers and the Web App on the same workbook,
  // even if this Apps Script project is later copied or made standalone.
  spreadsheetId: '18yJP_SNdEavd5EZhx4Rk9MqDg79qfWKCYPzVEK0DDZo',
  meetupSheetId: 1475285450,
  meetupSheetName: 'Meetups',
  registrationSheetName: 'Registrations',
  meetupHistorySheetName: 'MeetupHistory',
  tableSessionSheetName: 'TableSessions',
  waitlistSheetName: 'Waitlist',
  supportRequestSheetName: 'SupportRequests',
  meetupEditorSheetName: 'Tạo Tụ',
  gameChoiceSheetName: '_GameChoices',
  adminEmail: '',
  roomOptions: ['Phòng chung', 'Phòng 1', 'Phòng 2', 'Phòng 3'],
  statusOptions: ['active', 'full', 'closed', 'cancelled'],
  requestStatusTtlSeconds: 21600,
  adminDashboardCacheSeconds: 15,
};

const ADMIN_DASHBOARD_CACHE_KEY = 'noburi_admin_dashboard_v2';
const MEETUP_EDITOR_TRIGGER_HANDLER = 'installedMeetupEditorOnEdit';
const SHORT_CHECKIN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SHORT_CHECKIN_LENGTH = 6;

const MEETUP_EDITOR_HEADERS = [
  'Mã tụ',
  'Game (ID — Tên)',
  'Tên leader',
  'Ngày chơi',
  'Giờ bắt đầu',
  'Số người',
  'Phòng',
  'Ghi chú',
  'Trạng thái',
  'Đã đăng ký',
];

const REGISTRATION_HEADERS = [
  'timestamp',
  'meetupId',
  'gameId',
  'gameName',
  'leaderName',
  'startTime',
  'room',
  'name',
  'phone',
  'facebook',
  'companions',
  'totalSeats',
  'status',
  'registrationId',
  'submissionToken',
  'checkInCode',
  'checkInStatus',
  'checkedInAt',
  'checkedInSeats',
  'checkedInBy',
  'updatedAt',
];

const TABLE_SESSION_HEADERS = [
  'timestamp',
  'tableCode',
  'groupSize',
  'tableState',
  'gameId',
  'gameName',
  'roundMinutes',
  'note',
  'requestToken',
];

const WAITLIST_HEADERS = [
  'joinedAt',
  'waitlistId',
  'queueCode',
  'claimToken',
  'name',
  'phone',
  'groupSize',
  'status',
  'notifiedAt',
  'seatedAt',
  'cancelledAt',
  'note',
  'requestToken',
  'updatedAt',
  'updatedBy',
];

const SUPPORT_REQUEST_HEADERS = [
  'createdAt',
  'requestId',
  'tableCode',
  'category',
  'gameId',
  'gameName',
  'note',
  'status',
  'requestToken',
  'acknowledgedAt',
  'resolvedAt',
  'updatedAt',
  'updatedBy',
  'notificationChannel',
  'notificationStatus',
  'notificationAt',
  'notificationError',
];

const MEETUP_HISTORY_HEADERS = [
  'endedAt',
  'meetupId',
  'gameId',
  'gameName',
  'leaderName',
  'scheduledStartTime',
  'hostDate',
  'hostStartedAt',
  'hostEndedAt',
  'hostDurationMinutes',
  'hostDurationHours',
  'registeredSeats',
  'checkedInSeats',
  'attendanceSummary',
  'registeredGroups',
  'checkedInGroups',
  'room',
  'note',
  'endedBy',
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = clean_(params.action);
  const view = clean_(params.view);
  // `c` and `sid` are reserved query names in Google Apps Script. A URL using
  // either name is rejected by Google before this function is invoked.
  const checkInCode = clean_(
    params.checkInCode || params.checkin || params.ticket
  );

  if (view === 'admin' || checkInCode) {
    return HtmlService.createTemplateFromFile('AdminDashboard')
      .evaluate()
      .setTitle('Noburi — Quản lý quán')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  }

  if (action === 'status') {
    return outputPayload_(readRequestStatus_(params.token), params.callback);
  }

  if (action === 'waitlistStatus') {
    return outputPayload_(readWaitlistStatus_(params), params.callback);
  }

  try {
    const spreadsheet = getSpreadsheet_();
    return outputPayload_(
      {
        ok: true,
        service: 'Noburi meetup service',
        spreadsheet: spreadsheet.getName(),
        protocol: 2,
      },
      params.callback
    );
  } catch (error) {
    return outputPayload_(
      {
        ok: false,
        message: error && error.message ? error.message : String(error),
      },
      params.callback
    );
  }
}

function includeHtml_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const action = clean_(params.action) || 'register';
  const requestToken = clean_(params.requestToken || params.submissionToken);
  const lock = LockService.getScriptLock();

  saveRequestStatus_(requestToken, 'processing', 'Apps Script đã nhận yêu cầu.');

  try {
    if (!requestToken) {
      throw new Error('Thiếu mã xác nhận yêu cầu.');
    }

    if (!lock.tryLock(15000)) {
      throw new Error('Hệ thống đang bận. Vui lòng thử lại sau.');
    }

    let result;

    if (action === 'register') {
      result = handleRegistration_(params);
    } else if (action === 'tablePulse') {
      result = handleTablePulse_(params);
    } else if (action === 'joinWaitlist') {
      result = handleJoinWaitlist_(params);
    } else if (action === 'leaveWaitlist') {
      result = handleLeaveWaitlist_(params);
    } else if (action === 'supportRequest') {
      result = handleSupportRequest_(params);
    } else {
      throw new Error('Thao tác không được hỗ trợ.');
    }

    saveRequestStatus_(
      requestToken,
      'success',
      result.message || 'Đã xử lý thành công.',
      result
    );

    return legacyPostResponse_(requestToken, true, result.message, result);
  } catch (error) {
    const message = error && error.message ? error.message : 'Không thể xử lý yêu cầu.';
    console.error(error);
    saveRequestStatus_(requestToken, 'error', message);
    return legacyPostResponse_(requestToken, false, message);
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // Lock may not have been acquired.
    }
  }
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Noburi Board Game Cafe')
      .addItem('Thiết lập các Sheet vận hành', 'setupOperationalSheets')
      .addItem('Làm mới form Tạo Tụ và danh sách game', 'setupMeetupEditorSheet')
      .addItem('Đồng bộ toàn bộ Tạo Tụ → Meetups', 'syncAllMeetupEditorRows')
      .addItem('Cài lại trigger đồng bộ Tạo Tụ', 'installMeetupEditorTrigger')
      .addItem('Tạo QR check-in cho đăng ký cũ', 'backfillRegistrationCheckInCodes')
      .addItem('Rút gọn mã check-in hiện có', 'migrateCheckInCodesToShort')
      .addItem('Gộp lượt chờ bị trùng số điện thoại', 'repairWaitlistDuplicates')
      .addSeparator()
      .addItem('Kết nối Telegram cho leadgame', 'configureLeadgameTelegram')
      .addItem('Gửi thử cảnh báo Telegram', 'testLeadgameTelegram')
      .addItem('Tắt cảnh báo Telegram', 'disableLeadgameTelegram')
      .addItem('Đặt hoặc đổi mật khẩu Admin', 'configureAdminPassword')
      .addToUi();
  } catch (_) {
    // onOpen only exists for a spreadsheet-bound script.
  }
}

function setupOperationalSheets() {
  setupMeetupSheet();
  const spreadsheet = getSpreadsheet_();
  getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.registrationSheetName,
    REGISTRATION_HEADERS
  );
  getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.tableSessionSheetName,
    TABLE_SESSION_HEADERS
  );
  const waitlistSheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.waitlistSheetName,
    WAITLIST_HEADERS
  );
  ensureTextColumn_(waitlistSheet, 'phone');
  getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.supportRequestSheetName,
    SUPPORT_REQUEST_HEADERS
  );
  setupMeetupHistorySheet_(spreadsheet);
  const editorMessage = setupMeetupEditorSheet();
  const triggerMessage = installMeetupEditorTrigger();
  const syncMessage = syncAllMeetupEditorRows();
  return (
    'Đã thiết lập các Sheet vận hành. ' +
    editorMessage +
    ' ' +
    triggerMessage +
    ' ' +
    syncMessage
  );
}

function repairWaitlistDuplicates() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.waitlistSheetName,
      WAITLIST_HEADERS
    );
    ensureTextColumn_(sheet, 'phone');
    const table = readTable_(sheet);
    const seenPhones = {};
    const now = new Date();
    let repaired = 0;

    table.rows
      .map(function (row, index) {
        return { row: row, index: index };
      })
      .sort(function (left, right) {
        const leftDate = dateValueOrNull_(field_(left.row, 'joinedAt'));
        const rightDate = dateValueOrNull_(field_(right.row, 'joinedAt'));
        return (leftDate ? leftDate.getTime() : 0) -
          (rightDate ? rightDate.getTime() : 0);
      })
      .forEach(function (item) {
        const status = normalizeWaitlistStatus_(field_(item.row, 'status'));
        if (status !== 'waiting' && status !== 'notified') return;
        const phoneKey = normalizePhone_(field_(item.row, 'phone'));
        if (!phoneKey) return;
        if (!seenPhones[phoneKey]) {
          seenPhones[phoneKey] = true;
          return;
        }

        const rowNumber = item.index + 2;
        sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'status')).setValue('cancelled');
        sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'cancelledAt')).setValue(now);
        sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedAt')).setValue(now);
        sheet
          .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedBy'))
          .setValue('repair-duplicate-phone');
        repaired += 1;
      });

    SpreadsheetApp.flush();
    clearAdminDashboardCache_();
    return 'Đã kết thúc ' + repaired + ' lượt chờ trùng; giữ lại lượt sớm nhất.';
  } finally {
    lock.releaseLock();
  }
}

function installMeetupEditorTrigger() {
  const spreadsheet = getSpreadsheet_();
  const triggers = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === MEETUP_EDITOR_TRIGGER_HANDLER;
  });

  if (!triggers.length) {
    ScriptApp.newTrigger(MEETUP_EDITOR_TRIGGER_HANDLER)
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();
    return 'Đã cài trigger tự đồng bộ khi chỉnh Tạo Tụ hoặc Meetups.';
  }

  triggers.slice(1).forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  return triggers.length > 1
    ? 'Đã xóa trigger đồng bộ bị trùng; giữ lại một trigger.'
    : 'Trigger tự đồng bộ đã tồn tại.';
}

function setupMeetupHistorySheet_(spreadsheet) {
  const sheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.meetupHistorySheetName,
    MEETUP_HISTORY_HEADERS
  );
  ['endedAt', 'scheduledStartTime', 'hostStartedAt', 'hostEndedAt'].forEach(
    function (header) {
      const column = findHeaderColumn_(sheet, header);
      if (column && sheet.getMaxRows() > 1) {
        sheet
          .getRange(2, column, sheet.getMaxRows() - 1, 1)
          .setNumberFormat('dd/MM/yyyy HH:mm');
      }
    }
  );
  const hoursColumn = findHeaderColumn_(sheet, 'hostDurationHours');
  if (hoursColumn && sheet.getMaxRows() > 1) {
    sheet
      .getRange(2, hoursColumn, sheet.getMaxRows() - 1, 1)
      .setNumberFormat('0.00');
  }
  return sheet;
}

/**
 * Optional one-time migration for registrations created before QR check-in
 * existed. Existing IDs/codes are preserved; only missing fields are filled.
 */
function backfillRegistrationCheckInCodes() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.registrationSheetName,
      REGISTRATION_HEADERS
    );
    const table = readTable_(sheet);
    const registrationIdColumn = ensureHeaderColumn_(sheet, 'registrationId');
    const checkInCodeColumn = ensureHeaderColumn_(sheet, 'checkInCode');
    const checkInStatusColumn = ensureHeaderColumn_(sheet, 'checkInStatus');
    const updatedAtColumn = ensureHeaderColumn_(sheet, 'updatedAt');
    const usedCodes = collectShortCheckInCodes_(table.rows);
    let migrated = 0;

    table.rows.forEach(function (row, index) {
      const hasRegistrationData =
        clean_(field_(row, 'meetupId')) ||
        clean_(field_(row, 'name')) ||
        clean_(field_(row, 'phone'));

      if (!hasRegistrationData) return;

      const rowNumber = index + 2;
      let registrationId = clean_(field_(row, 'registrationId'));
      let changed = false;

      if (!registrationId) {
        registrationId = Utilities.getUuid();
        sheet.getRange(rowNumber, registrationIdColumn).setValue(registrationId);
        changed = true;
      }

      if (!clean_(field_(row, 'checkInCode'))) {
        const shortCode = createShortCheckInCode_(usedCodes);
        sheet
          .getRange(rowNumber, checkInCodeColumn)
          .setValue(shortCode);
        usedCodes[shortCode] = true;
        changed = true;
      }

      if (!clean_(field_(row, 'checkInStatus'))) {
        sheet.getRange(rowNumber, checkInStatusColumn).setValue('pending');
        changed = true;
      }

      if (changed) {
        sheet.getRange(rowNumber, updatedAtColumn).setValue(new Date());
        migrated += 1;
      }
    });

    SpreadsheetApp.flush();
    clearAdminDashboardCache_();
    return migrated
      ? 'Đã bổ sung QR check-in cho ' + migrated + ' đăng ký cũ.'
      : 'Không có đăng ký cũ nào cần bổ sung QR.';
  } finally {
    lock.releaseLock();
  }
}

/**
 * Converts stored long codes to six-character staff-friendly codes.
 * Legacy signed QR values remain valid because verification can still resolve
 * their registrationId even after the displayed code has been shortened.
 */
function migrateCheckInCodesToShort() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.registrationSheetName,
      REGISTRATION_HEADERS
    );
    const table = readTable_(sheet);
    const registrationIdColumn = ensureHeaderColumn_(sheet, 'registrationId');
    const codeColumn = ensureHeaderColumn_(sheet, 'checkInCode');
    const updatedAtColumn = ensureHeaderColumn_(sheet, 'updatedAt');
    const usedCodes = collectShortCheckInCodes_(table.rows);
    let migrated = 0;

    table.rows.forEach(function (row, index) {
      const hasRegistration =
        clean_(field_(row, 'registrationId')) ||
        clean_(field_(row, 'meetupId')) ||
        clean_(field_(row, 'phone'));
      if (!hasRegistration) return;

      const rowNumber = index + 2;
      if (!clean_(field_(row, 'registrationId'))) {
        sheet.getRange(rowNumber, registrationIdColumn).setValue(Utilities.getUuid());
      }
      const currentCode = clean_(field_(row, 'checkInCode'));
      if (isShortCheckInCode_(currentCode)) return;
      const shortCode = createShortCheckInCode_(usedCodes);
      usedCodes[shortCode] = true;
      sheet.getRange(rowNumber, codeColumn).setValue(shortCode);
      sheet.getRange(rowNumber, updatedAtColumn).setValue(new Date());
      migrated += 1;
    });

    SpreadsheetApp.flush();
    clearAdminDashboardCache_();
    return migrated
      ? 'Đã rút gọn mã check-in cho ' + migrated + ' đăng ký.'
      : 'Tất cả mã check-in hiện tại đã là mã ngắn.';
  } finally {
    lock.releaseLock();
  }
}

function setupMeetupSheet() {
  const spreadsheet = getSpreadsheet_();
  let sheet = getMeetupSheet_(spreadsheet);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(APP_BACKEND_CONFIG.meetupSheetName || 'Meetups');
  }

  [
    'id',
    'gameId',
    'gameName',
    'leaderName',
    'startTime',
    'requiredPlayers',
    'currentPlayers',
    'room',
    'status',
    'note',
    'hostStartedAt',
    'hostStartedBy',
    'updatedAt',
    'updatedBy',
  ].forEach(function (header) {
    ensureHeaderColumn_(sheet, header);
  });

  sheet.setFrozenRows(1);
  const maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  const startTimeColumn = findHeaderColumn_(sheet, 'startTime');
  const requiredPlayersColumn = findHeaderColumn_(sheet, 'requiredPlayers');
  const currentPlayersColumn = findHeaderColumn_(sheet, 'currentPlayers');
  const roomColumn = findHeaderColumn_(sheet, 'room');
  const statusColumn = findHeaderColumn_(sheet, 'status');

  if (startTimeColumn) {
    const range = sheet.getRange(2, startTimeColumn, maxRows, 1);
    range.setNumberFormat('dd/MM/yyyy HH:mm');
    range.setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireDate()
        .setAllowInvalid(false)
        .setHelpText('Chọn ngày và giờ bắt đầu.')
        .build()
    );
  }

  if (requiredPlayersColumn) {
    sheet
      .getRange(2, requiredPlayersColumn, maxRows, 1)
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireNumberGreaterThanOrEqualTo(1)
          .setAllowInvalid(false)
          .setHelpText('Nhập tổng số chỗ của tụ game.')
          .build()
      );
  }

  if (currentPlayersColumn) {
    sheet
      .getRange(2, currentPlayersColumn, maxRows, 1)
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireNumberGreaterThanOrEqualTo(0)
          .setAllowInvalid(false)
          .build()
      );
  }

  if (roomColumn && APP_BACKEND_CONFIG.roomOptions.length) {
    sheet
      .getRange(2, roomColumn, maxRows, 1)
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(APP_BACKEND_CONFIG.roomOptions, true)
          .setAllowInvalid(false)
          .build()
      );
  }

  if (statusColumn) {
    sheet
      .getRange(2, statusColumn, maxRows, 1)
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(APP_BACKEND_CONFIG.statusOptions, true)
          .setAllowInvalid(false)
          .build()
      );
  }

  sheet.autoResizeColumns(1, sheet.getLastColumn());
  clearAdminDashboardCache_();
  return 'Sheet Ghép tụ đã được thiết lập.';
}

/**
 * Creates a leader-friendly editor without exposing operational columns.
 * Existing Meetups remain the single source used by the website/backend.
 */
function setupMeetupEditorSheet() {
  const spreadsheet = getSpreadsheet_();
  const operationalSheet = getMeetupSheet_(spreadsheet);
  if (!operationalSheet) throw new Error('Không tìm thấy sheet Meetups.');

  const choices = rebuildGameChoices_(spreadsheet);
  let editorSheet = spreadsheet.getSheetByName(
    APP_BACKEND_CONFIG.meetupEditorSheetName
  );
  if (!editorSheet) {
    editorSheet = spreadsheet.insertSheet(APP_BACKEND_CONFIG.meetupEditorSheetName);
  }

  editorSheet.showSheet();
  editorSheet.getRange(1, 1, 1, MEETUP_EDITOR_HEADERS.length).setValues([
    MEETUP_EDITOR_HEADERS,
  ]);
  editorSheet.setFrozenRows(1);
  editorSheet.setHiddenGridlines(true);
  editorSheet.setTabColor('#d5a94c');
  editorSheet.hideColumns(1);

  const headerRange = editorSheet.getRange(1, 1, 1, MEETUP_EDITOR_HEADERS.length);
  headerRange
    .setBackground('#2d241b')
    .setFontColor('#fff4df')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const rowCount = Math.max(editorSheet.getMaxRows() - 1, 1);
  const choiceSheet = spreadsheet.getSheetByName(
    APP_BACKEND_CONFIG.gameChoiceSheetName
  );
  const choiceRange = choiceSheet.getRange(
    2,
    1,
    Math.max(choices.length, 1),
    1
  );
  editorSheet
    .getRange(2, 2, rowCount, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(choiceRange, true)
        .setAllowInvalid(true)
        .setHelpText('Gõ ID hoặc tên game để lọc, sau đó chọn “ID — Tên game”.')
        .build()
    );
  editorSheet
    .getRange(2, 4, rowCount, 1)
    .setNumberFormat('dd/MM/yyyy')
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireDate()
        .setAllowInvalid(false)
        .setHelpText('Bấm đúp để chọn ngày trên lịch.')
        .build()
    );
  editorSheet
    .getRange(2, 5, rowCount, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(createMeetupTimeOptions_(), true)
        .setAllowInvalid(false)
        .setHelpText('Chọn giờ bắt đầu; danh sách cách nhau 30 phút.')
        .build()
    );
  editorSheet
    .getRange(2, 6, rowCount, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireNumberGreaterThanOrEqualTo(1)
        .setAllowInvalid(false)
        .setHelpText('Nhập tổng số người của tụ.')
        .build()
    );
  if (APP_BACKEND_CONFIG.roomOptions.length) {
    editorSheet
      .getRange(2, 7, rowCount, 1)
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(APP_BACKEND_CONFIG.roomOptions, true)
          .setAllowInvalid(false)
          .build()
      );
  }

  editorSheet.getRange(2, 1, rowCount, 1).setBackground('#f2eee8');
  editorSheet.getRange(2, 9, rowCount, 2).setBackground('#eef3ea');
  editorSheet.getRange(1, 1).setNote('Mã tụ được tạo tự động. Không cần nhập.');
  editorSheet
    .getRange(1, 9)
    .setNote('Trạng thái và số đã đăng ký được backend tự cập nhật.');
  [120, 260, 150, 120, 110, 95, 120, 240, 120, 110].forEach(function (
    width,
    index
  ) {
    editorSheet.setColumnWidth(index + 1, width);
  });

  syncOperationalMeetupsToEditor_(spreadsheet, editorSheet, operationalSheet);
  clearAdminDashboardCache_();
  return choices.length
    ? 'Tab “Tạo Tụ” đã sẵn sàng với ' + choices.length + ' game để chọn.'
    : 'Đã tạo tab “Tạo Tụ”, nhưng chưa tìm thấy sheet game có cột id và name.';
}

function createMeetupTimeOptions_() {
  const options = [];
  for (let hour = 8; hour <= 23; hour += 1) {
    ['00', '30'].forEach(function (minute) {
      options.push(String(hour).padStart(2, '0') + ':' + minute);
    });
  }
  return options;
}

function editorStatusLabel_(status) {
  const normalized = normalizeStatus_(status);
  if (normalized === 'active') return 'Đang mở';
  if (normalized === 'full') return 'Đã đủ';
  if (normalized === 'cancelled') return 'Đã hủy';
  return 'Đã đóng';
}

function findGameCatalogSheet_(spreadsheet) {
  const excluded = [
    APP_BACKEND_CONFIG.meetupSheetName,
    APP_BACKEND_CONFIG.registrationSheetName,
    APP_BACKEND_CONFIG.meetupHistorySheetName,
    APP_BACKEND_CONFIG.tableSessionSheetName,
    APP_BACKEND_CONFIG.meetupEditorSheetName,
    APP_BACKEND_CONFIG.gameChoiceSheetName,
  ];
  const candidates = spreadsheet
    .getSheets()
    .filter(function (sheet) {
      return excluded.indexOf(sheet.getName()) < 0 && sheet.getLastColumn() > 0;
    })
    .sort(function (left, right) {
      return Number(right.getSheetId() === 0) - Number(left.getSheetId() === 0);
    });

  for (let index = 0; index < candidates.length; index += 1) {
    const sheet = candidates[index];
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0]
      .map(normalizeHeader_);
    if (headers.indexOf('id') >= 0 && headers.indexOf('name') >= 0) return sheet;
  }
  return null;
}

function rebuildGameChoices_(spreadsheet) {
  const source = findGameCatalogSheet_(spreadsheet);
  let choices = [];

  if (source && source.getLastRow() > 1) {
    const values = source
      .getRange(1, 1, source.getLastRow(), source.getLastColumn())
      .getDisplayValues();
    const headers = values[0].map(normalizeHeader_);
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const seen = {};
    choices = values
      .slice(1)
      .map(function (row) {
        const id = clean_(row[idIndex]);
        const name = clean_(row[nameIndex]);
        return { id: id, name: name, label: id + ' — ' + name };
      })
      .filter(function (game) {
        const key = normalizeText_(game.id);
        if (!game.id || !game.name || seen[key]) return false;
        seen[key] = true;
        return true;
      });
  }

  let choiceSheet = spreadsheet.getSheetByName(
    APP_BACKEND_CONFIG.gameChoiceSheetName
  );
  if (!choiceSheet) {
    choiceSheet = spreadsheet.insertSheet(APP_BACKEND_CONFIG.gameChoiceSheetName);
  }
  choiceSheet.showSheet();
  choiceSheet.clearContents();
  choiceSheet.getRange(1, 1, 1, 3).setValues([
    ['gameSelection', 'gameId', 'gameName'],
  ]);
  if (choices.length) {
    choiceSheet
      .getRange(2, 1, choices.length, 3)
      .setValues(
        choices.map(function (game) {
          return [game.label, game.id, game.name];
        })
      );
  }
  choiceSheet.hideSheet();
  return choices;
}

function readGameChoices_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(APP_BACKEND_CONFIG.gameChoiceSheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 3)
    .getDisplayValues()
    .map(function (row) {
      return { label: clean_(row[0]), id: clean_(row[1]), name: clean_(row[2]) };
    })
    .filter(function (game) {
      return game.id && game.name;
    });
}

function resolveEditorGame_(value, choices) {
  const query = normalizeText_(value);
  if (!query) return null;
  const exact = choices.find(function (game) {
    return (
      normalizeText_(game.label) === query ||
      normalizeText_(game.id) === query ||
      normalizeText_(game.name) === query
    );
  });
  if (exact) return exact;
  const matches = choices.filter(function (game) {
    return (
      normalizeText_(game.id).indexOf(query) === 0 ||
      normalizeText_(game.name).indexOf(query) === 0
    );
  });
  return matches.length === 1 ? matches[0] : null;
}

function combineEditorDateTime_(dateValue, timeValue) {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return null;
  let hour = 0;
  let minute = 0;
  if (timeValue instanceof Date && !Number.isNaN(timeValue.getTime())) {
    hour = timeValue.getHours();
    minute = timeValue.getMinutes();
  } else {
    const match = clean_(timeValue).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    hour = Number(match[1]);
    minute = Number(match[2]);
  }
  const result = new Date(dateValue);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function syncOperationalMeetupsToEditor_(spreadsheet, editorSheet, operationalSheet) {
  const meetups = readTable_(operationalSheet).rows;
  const existingEditorRows =
    editorSheet.getLastRow() > 1
      ? editorSheet
          .getRange(
            2,
            1,
            editorSheet.getLastRow() - 1,
            MEETUP_EDITOR_HEADERS.length
          )
          .getDisplayValues()
      : [];
  const populatedEditorIds = {};

  existingEditorRows.forEach(function (row) {
    const meetupId = clean_(row[0]);
    const hasLeaderInput = row.slice(1, 8).some(function (value) {
      return clean_(value) !== '';
    });
    if (meetupId && hasLeaderInput) populatedEditorIds[meetupId] = true;
  });

  meetups.forEach(function (meetup) {
    const meetupId = clean_(field_(meetup, 'id'));
    // Never overwrite a leader's populated editor row with an older or
    // partially blank operational row during setup/repair.
    if (meetupId && populatedEditorIds[meetupId]) return;
    upsertEditorMeetup_(spreadsheet, editorSheet, meetup);
  });
}

function upsertEditorMeetup_(spreadsheet, editorSheet, meetup) {
  const meetupId = clean_(field_(meetup, 'id'));
  if (!meetupId) return;
  const lastRow = Math.max(editorSheet.getLastRow(), 1);
  const ids =
    lastRow > 1
      ? editorSheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat()
      : [];
  const matchIndex = ids.findIndex(function (id) {
    return clean_(id) === meetupId;
  });
  const rowNumber = matchIndex >= 0 ? matchIndex + 2 : lastRow + 1;
  const gameId = clean_(field_(meetup, 'gameId'));
  const gameName = clean_(field_(meetup, 'gameName'));
  const game = resolveEditorGame_(gameId, readGameChoices_(spreadsheet));
  const startTime = field_(meetup, 'startTime');
  const validDate = startTime instanceof Date && !Number.isNaN(startTime.getTime());
  const timezone = spreadsheet.getSpreadsheetTimeZone();
  const dateOnly = validDate
    ? new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())
    : '';
  const timeText = validDate ? Utilities.formatDate(startTime, timezone, 'HH:mm') : '';
  editorSheet.getRange(rowNumber, 1, 1, MEETUP_EDITOR_HEADERS.length).setValues([
    [
      meetupId,
      game ? game.label : gameId && gameName ? gameId + ' — ' + gameName : gameId,
      clean_(field_(meetup, 'leaderName')),
      dateOnly,
      timeText,
      field_(meetup, 'requiredPlayers') || '',
      clean_(field_(meetup, 'room')),
      clean_(field_(meetup, 'note')),
      editorStatusLabel_(field_(meetup, 'status')),
      Number(field_(meetup, 'currentPlayers')) || 0,
    ],
  ]);
}

function syncLeaderMeetupProgress_(spreadsheet, meetupId, status, currentPlayers) {
  const editorSheet = spreadsheet.getSheetByName(
    APP_BACKEND_CONFIG.meetupEditorSheetName
  );
  if (!editorSheet || editorSheet.getLastRow() < 2) return;
  const ids = editorSheet
    .getRange(2, 1, editorSheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .flat();
  const index = ids.findIndex(function (id) {
    return clean_(id) === clean_(meetupId);
  });
  if (index < 0) return;
  editorSheet
    .getRange(index + 2, 9, 1, 2)
    .setValues([[editorStatusLabel_(status), Number(currentPlayers) || 0]]);
}

function onEdit(e) {
  handleMeetupWorkbookEdit_(e);
}

function installedMeetupEditorOnEdit(e) {
  handleMeetupWorkbookEdit_(e);
}

function handleMeetupWorkbookEdit_(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const editCache = CacheService.getScriptCache();
  const editKey = [
    'meetup-edit',
    sheet.getSheetId(),
    e.range.getA1Notation(),
    clean_(e.value).slice(0, 40),
    clean_(e.oldValue).slice(0, 40),
  ].join(':');
  if (editCache.get(editKey)) return;
  editCache.put(editKey, '1', 5);
  const firstRow = Math.max(2, e.range.getRow());
  const lastRow = e.range.getLastRow();

  if (sheet.getName() === APP_BACKEND_CONFIG.meetupEditorSheetName) {
    for (let rowNumber = firstRow; rowNumber <= lastRow; rowNumber += 1) {
      try {
        syncEditorRowToOperational_(sheet, rowNumber);
      } catch (error) {
        sheet
          .getRange(rowNumber, 1)
          .setNote(
            'Lỗi đồng bộ: ' +
              clean_(error && error.message ? error.message : error)
          );
        throw error;
      }
    }
    return;
  }

  const spreadsheet = sheet.getParent();
  const operationalSheet = getMeetupSheet_(spreadsheet);
  if (!operationalSheet || sheet.getSheetId() !== operationalSheet.getSheetId()) {
    return;
  }

  const editorSheet = spreadsheet.getSheetByName(
    APP_BACKEND_CONFIG.meetupEditorSheetName
  );
  if (!editorSheet) return;
  const table = readTable_(operationalSheet);
  for (let rowNumber = firstRow; rowNumber <= lastRow; rowNumber += 1) {
    const meetup = table.rows[rowNumber - 2];
    if (meetup) upsertEditorMeetup_(spreadsheet, editorSheet, meetup);
  }
}

function syncAllMeetupEditorRows() {
  const spreadsheet = getSpreadsheet_();
  const editorSheet = spreadsheet.getSheetByName(
    APP_BACKEND_CONFIG.meetupEditorSheetName
  );
  if (!editorSheet) throw new Error('Không tìm thấy tab Tạo Tụ.');
  if (editorSheet.getLastRow() < 2) return 'Tab Tạo Tụ chưa có dữ liệu để đồng bộ.';

  let synced = 0;
  let incomplete = 0;
  for (let rowNumber = 2; rowNumber <= editorSheet.getLastRow(); rowNumber += 1) {
    const values = editorSheet
      .getRange(rowNumber, 1, 1, MEETUP_EDITOR_HEADERS.length)
      .getDisplayValues()[0];
    const hasUserData = values.slice(1, 8).some(function (value) {
      return clean_(value) !== '';
    });
    if (!hasUserData) continue;

    syncEditorRowToOperational_(editorSheet, rowNumber);
    const note = clean_(editorSheet.getRange(rowNumber, 1).getNote());
    if (note.indexOf('Đã đồng bộ') === 0) synced += 1;
    else incomplete += 1;
  }

  SpreadsheetApp.flush();
  clearAdminDashboardCache_();
  return (
    'Đã đồng bộ ' +
    synced +
    ' dòng Tạo Tụ sang Meetups.' +
    (incomplete ? ' Có ' + incomplete + ' dòng chưa đủ thông tin.' : '')
  );
}

function syncEditorRowToOperational_(editorSheet, rowNumber) {
  const spreadsheet = editorSheet.getParent();
  const values = editorSheet
    .getRange(rowNumber, 1, 1, MEETUP_EDITOR_HEADERS.length)
    .getValues()[0];
  const hasUserData = values.slice(1, 8).some(function (value) {
    return clean_(value) !== '';
  });
  if (!hasUserData) return;

  let meetupId = clean_(values[0]);
  if (!meetupId) {
    meetupId = 'meetup-' + Utilities.getUuid().slice(0, 8);
    editorSheet.getRange(rowNumber, 1).setValue(meetupId);
  }

  const gameCell = editorSheet.getRange(rowNumber, 2);
  const game = resolveEditorGame_(values[1], readGameChoices_(spreadsheet));
  if (clean_(values[1]) && !game) {
    gameCell
      .setNote('Không tìm thấy game duy nhất. Hãy gõ ID/tên rồi chọn một dòng trong dropdown.')
      .setBackground('#ffe5df');
    return;
  }
  if (game) {
    gameCell.setValue(game.label).setNote('').setBackground('#ffffff');
  }

  const startTime = combineEditorDateTime_(values[3], values[4]);
  const leaderName = clean_(values[2]);
  const requiredPlayers = parsePositiveInteger_(values[5]);
  const room = clean_(values[6]);
  const missing = [];
  if (!game) missing.push('game');
  if (!leaderName) missing.push('leader');
  if (!startTime) missing.push('ngày/giờ');
  if (!requiredPlayers) missing.push('số người');
  if (!room) missing.push('phòng');
  editorSheet
    .getRange(rowNumber, 1)
    .setNote(missing.length ? 'Còn thiếu: ' + missing.join(', ') : 'Đã đồng bộ sang Meetups.');
  if (missing.length) return;

  const operationalSheet = getMeetupSheet_(spreadsheet);
  const table = readTable_(operationalSheet);
  const existingIndex = table.rows.findIndex(function (row) {
    return clean_(field_(row, 'id')) === meetupId;
  });
  const existing = existingIndex >= 0 ? table.rows[existingIndex] : {};
  const currentPlayers = Number(field_(existing, 'currentPlayers')) || 0;
  const existingStatus = normalizeStatus_(field_(existing, 'status') || 'active');
  const automaticStatus =
    existingStatus === 'closed' || existingStatus === 'cancelled'
      ? existingStatus
      : currentPlayers >= requiredPlayers
        ? 'full'
        : 'active';
  const record = {
    id: meetupId,
    gameId: game.id,
    gameName: game.name,
    leaderName: leaderName,
    startTime: startTime,
    requiredPlayers: requiredPlayers,
    currentPlayers: currentPlayers,
    room: room,
    status: automaticStatus,
    note: clean_(values[7]),
    updatedAt: new Date(),
    updatedBy: 'leader-editor',
  };
  const headerCount = operationalSheet.getLastColumn();
  const headers = operationalSheet
    .getRange(1, 1, 1, headerCount)
    .getDisplayValues()[0];
  const rowValues = headers.map(function (header) {
    const key = normalizeHeader_(header);
    const matchingKey = Object.keys(record).find(function (recordKey) {
      return normalizeHeader_(recordKey) === key;
    });
    return matchingKey ? record[matchingKey] : field_(existing, header);
  });
  const operationalRow = existingIndex >= 0 ? existingIndex + 2 : operationalSheet.getLastRow() + 1;
  operationalSheet.getRange(operationalRow, 1, 1, headerCount).setValues([rowValues]);
  editorSheet
    .getRange(rowNumber, 9, 1, 2)
    .setValues([[editorStatusLabel_(record.status), record.currentPlayers]]);
  SpreadsheetApp.flush();
  clearAdminDashboardCache_();
}

function handleRegistration_(params) {
  const payload = readRegistrationPayload_(params);
  validateRegistrationPayload_(payload);

  const spreadsheet = getSpreadsheet_();
  const meetupSheet = getMeetupSheet_(spreadsheet);

  if (!meetupSheet) {
    throw new Error('Không tìm thấy sheet lịch ghép tụ.');
  }

  const registrationsSheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.registrationSheetName,
    REGISTRATION_HEADERS
  );
  const registrationTable = readTable_(registrationsSheet);
  const existingByToken = registrationTable.rows.find(function (row) {
    return clean_(field_(row, 'submissionToken')) === payload.submissionToken;
  });

  if (existingByToken) {
    return existingRegistrationResult_(existingByToken);
  }

  const meetupTable = readTable_(meetupSheet);
  const meetupIndex = meetupTable.rows.findIndex(function (row) {
    return clean_(field_(row, 'id')) === payload.meetupId;
  });

  if (meetupIndex < 0) {
    throw new Error('Tụ game không còn tồn tại.');
  }

  const meetup = meetupTable.rows[meetupIndex];
  const meetupStatus = normalizeStatus_(field_(meetup, 'status'));

  if (meetupStatus !== 'active') {
    throw new Error(statusMessage_(meetupStatus));
  }

  const normalizedPhone = normalizePhone_(payload.phone);
  const duplicate = registrationTable.rows.some(function (row) {
    return (
      clean_(field_(row, 'meetupId')) === payload.meetupId &&
      normalizePhone_(field_(row, 'phone')) === normalizedPhone &&
      normalizeText_(field_(row, 'status') || 'confirmed') !== 'cancelled'
    );
  });

  if (duplicate) {
    throw new Error('Số điện thoại này đã đăng ký tụ game này rồi.');
  }

  const seatsRequested = 1 + Number(payload.companions);
  const capacity = parsePositiveInteger_(field_(meetup, 'requiredPlayers'));
  const currentPlayers = countConfirmedSeats_(registrationTable.rows, payload.meetupId);

  if (capacity && currentPlayers + seatsRequested > capacity) {
    throw new Error(
      'Tụ này chỉ còn ' + Math.max(0, capacity - currentPlayers) + ' chỗ.'
    );
  }

  const registrationId = Utilities.getUuid();
  const checkInCode = createShortCheckInCode_(registrationTable.rows);
  const now = new Date();
  const leaderName = clean_(field_(meetup, 'leaderName'));
  payload.leaderName = leaderName;
  const record = {
    timestamp: now,
    meetupId: payload.meetupId,
    gameId: payload.gameId,
    gameName: payload.gameName,
    leaderName: leaderName,
    startTime: payload.startTime,
    room: payload.room,
    name: payload.name,
    phone: payload.phone,
    facebook: payload.facebook,
    companions: Number(payload.companions),
    totalSeats: seatsRequested,
    status: 'confirmed',
    registrationId: registrationId,
    submissionToken: payload.submissionToken,
    checkInCode: checkInCode,
    checkInStatus: 'pending',
    checkedInAt: '',
    checkedInSeats: 0,
    checkedInBy: '',
    updatedAt: now,
  };

  const appendedRow = appendRecord_(registrationsSheet, record);
  SpreadsheetApp.flush();

  const savedToken = clean_(
    registrationsSheet
      .getRange(appendedRow, findHeaderColumn_(registrationsSheet, 'submissionToken'))
      .getDisplayValue()
  );

  if (savedToken !== payload.submissionToken) {
    throw new Error('Không xác minh được dữ liệu vừa ghi vào Registrations.');
  }

  const updatedPlayers = currentPlayers + seatsRequested;
  const updatedStatus = capacity && updatedPlayers >= capacity ? 'full' : 'active';
  updateMeetupProgress_(meetupSheet, meetupIndex + 2, updatedStatus, updatedPlayers);
  syncLeaderMeetupProgress_(
    spreadsheet,
    payload.meetupId,
    updatedStatus,
    updatedPlayers
  );
  clearAdminDashboardCache_();
  notifyAdmin_(payload, seatsRequested, updatedPlayers, capacity);

  return {
    message: 'Đăng ký thành công! Hãy giữ QR để check-in tại quán.',
    meetupId: payload.meetupId,
    registrationId: registrationId,
    currentPlayers: updatedPlayers,
    status: updatedStatus,
    checkInCode: checkInCode,
    checkInUrl: createAdminCheckInUrl_(checkInCode),
  };
}

function handleTablePulse_(params) {
  const tableCode = clean_(params.tableCode)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
  const tableState = clean_(params.tableState);
  const allowedStates = ['playing', 'last_round', 'leaving_soon', 'available'];

  if (!tableCode) throw new Error('Thiếu mã bàn.');
  if (allowedStates.indexOf(tableState) < 0) {
    throw new Error('Nhịp bàn không hợp lệ.');
  }

  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.tableSessionSheetName,
    TABLE_SESSION_HEADERS
  );

  appendRecord_(sheet, {
    timestamp: new Date(),
    tableCode: tableCode,
    groupSize: parseNonNegativeInteger_(params.groupSize),
    tableState: tableState,
    gameId: clean_(params.gameId),
    gameName: clean_(params.gameName),
    leaderName: clean_(params.leaderName),
    roundMinutes: parseNonNegativeInteger_(params.roundMinutes),
    note: clean_(params.note).slice(0, 240),
    requestToken: clean_(params.requestToken || params.submissionToken),
  });
  SpreadsheetApp.flush();
  clearAdminDashboardCache_();

  return {
    message: 'Đã cập nhật nhịp bàn. Cảm ơn bạn!',
    tableCode: tableCode,
    tableState: tableState,
  };
}

function handleJoinWaitlist_(params) {
  const name = clean_(params.name).slice(0, 80);
  const phone = clean_(params.phone).slice(0, 30);
  const normalizedPhone = normalizePhone_(phone);
  const groupSize = parsePositiveInteger_(params.groupSize);
  const requestToken = clean_(params.requestToken || params.submissionToken);

  if (name.length < 2) throw new Error('Vui lòng nhập tên hoặc biệt danh.');
  if (!/^0[0-9]{9,10}$/.test(normalizedPhone)) {
    throw new Error('Số điện thoại chưa đúng định dạng.');
  }
  if (!groupSize || groupSize > 30) {
    throw new Error('Số khách phải từ 1 đến 30 người.');
  }

  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.waitlistSheetName,
    WAITLIST_HEADERS
  );
  ensureTextColumn_(sheet, 'phone');
  const table = readTable_(sheet);
  const existingByToken = table.rows.find(function (row) {
    return clean_(field_(row, 'requestToken')) === requestToken;
  });

  if (existingByToken) {
    return serializeWaitlistForCustomer_(existingByToken, table.rows, spreadsheet);
  }

  const existingActive = table.rows.find(function (row) {
    const status = normalizeWaitlistStatus_(field_(row, 'status'));
    return (
      normalizePhone_(field_(row, 'phone')) === normalizedPhone &&
      (status === 'waiting' || status === 'notified')
    );
  });

  if (existingActive) {
    throw new Error('Số điện thoại này đang có một lượt chờ hoạt động.');
  }

  const now = new Date();
  const waitlistId = Utilities.getUuid();
  const queueCode = createWaitlistCode_(table.rows);
  const record = {
    joinedAt: now,
    waitlistId: waitlistId,
    queueCode: queueCode,
    claimToken: requestToken,
    name: name,
    phone: phone,
    groupSize: groupSize,
    status: 'waiting',
    notifiedAt: '',
    seatedAt: '',
    cancelledAt: '',
    note: clean_(params.note).slice(0, 240),
    requestToken: requestToken,
    updatedAt: now,
    updatedBy: 'customer-web',
  };

  appendRecord_(sheet, record);
  SpreadsheetApp.flush();
  clearAdminDashboardCache_();

  return serializeWaitlistForCustomer_(record, table.rows.concat([record]), spreadsheet);
}

function handleLeaveWaitlist_(params) {
  const waitlistId = clean_(params.waitlistId);
  const claimToken = clean_(params.claimToken);

  if (!waitlistId || !claimToken) {
    throw new Error('Thiếu thông tin lượt chờ.');
  }

  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.waitlistSheetName,
    WAITLIST_HEADERS
  );
  const table = readTable_(sheet);
  const rowIndex = table.rows.findIndex(function (row) {
    return (
      clean_(field_(row, 'waitlistId')) === waitlistId &&
      constantTimeEqual_(clean_(field_(row, 'claimToken')), claimToken)
    );
  });

  if (rowIndex < 0) throw new Error('Không tìm thấy lượt chờ này.');

  const currentStatus = normalizeWaitlistStatus_(
    field_(table.rows[rowIndex], 'status')
  );
  if (currentStatus === 'seated' || currentStatus === 'cancelled') {
    return {
      message: currentStatus === 'seated' ? 'Lượt chờ đã được xếp bàn.' : 'Lượt chờ đã hủy.',
      waitlistId: waitlistId,
      waitlistStatus: currentStatus,
    };
  }

  const rowNumber = rowIndex + 2;
  const now = new Date();
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'status'))
    .setValue('cancelled');
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'cancelledAt'))
    .setValue(now);
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedAt'))
    .setValue(now);
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedBy'))
    .setValue('customer-web');
  SpreadsheetApp.flush();
  clearAdminDashboardCache_();

  return {
    message: 'Đã rời hàng chờ.',
    waitlistId: waitlistId,
    waitlistStatus: 'cancelled',
  };
}

function handleSupportRequest_(params) {
  const tableCode = sanitizeTableCode_(params.tableCode);
  const category = normalizeSupportCategory_(params.category);
  const requestToken = clean_(params.requestToken || params.submissionToken);

  if (!tableCode) throw new Error('Thiếu mã bàn. Hãy mở web từ QR của bàn.');
  if (!category) throw new Error('Vui lòng chọn loại hỗ trợ.');

  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.supportRequestSheetName,
    SUPPORT_REQUEST_HEADERS
  );
  const table = readTable_(sheet);
  const existingByToken = table.rows.find(function (row) {
    return clean_(field_(row, 'requestToken')) === requestToken;
  });

  if (existingByToken) {
    return serializeSupportRequest_(existingByToken);
  }

  const now = new Date();
  const duplicate = table.rows
    .slice()
    .reverse()
    .find(function (row) {
      const createdAt = dateValueOrNull_(field_(row, 'createdAt'));
      const status = normalizeSupportStatus_(field_(row, 'status'));
      return (
        sanitizeTableCode_(field_(row, 'tableCode')) === tableCode &&
        normalizeSupportCategory_(field_(row, 'category')) === category &&
        status !== 'resolved' &&
        createdAt &&
        now.getTime() - createdAt.getTime() < 3 * 60 * 1000
      );
    });

  if (duplicate) {
    return Object.assign(serializeSupportRequest_(duplicate), {
      message: 'Nhân viên đã nhận yêu cầu này trước đó.',
      duplicate: true,
    });
  }

  const record = {
    createdAt: now,
    requestId: Utilities.getUuid(),
    tableCode: tableCode,
    category: category,
    gameId: clean_(params.gameId).slice(0, 100),
    gameName: clean_(params.gameName).slice(0, 120),
    note: clean_(params.note).slice(0, 300),
    status: 'pending',
    requestToken: requestToken,
    acknowledgedAt: '',
    resolvedAt: '',
    updatedAt: now,
    updatedBy: 'customer-web',
  };

  const rowNumber = appendRecord_(sheet, record);
  SpreadsheetApp.flush();

  // The Apps Script dashboard is an iframe-based page and cannot be trusted
  // to stay alive while the phone is locked or another app is in front. Send
  // the urgent alert through Telegram immediately after the Sheet write. A
  // notification failure never discards the customer's saved request.
  const delivery = notifyLeadgameSupportRequest_(record);
  updateSupportNotificationDelivery_(sheet, rowNumber, delivery);
  record.notificationChannel = delivery.channel;
  record.notificationStatus = delivery.status;
  record.notificationAt = delivery.sentAt || '';
  record.notificationError = delivery.error || '';
  SpreadsheetApp.flush();
  clearAdminDashboardCache_();

  return Object.assign(serializeSupportRequest_(record), {
    message:
      delivery.status === 'sent' || delivery.status === 'partial'
        ? 'Đã báo ngay cho leadgame của bàn ' + tableCode + '.'
        : 'Yêu cầu đã được lưu. Nếu cần gấp, vui lòng gọi nhân viên trực tiếp.',
    notificationStatus: delivery.status,
  });
}

function readWaitlistStatus_(params) {
  try {
    const waitlistId = clean_(params.waitlistId);
    const claimToken = clean_(params.token || params.claimToken);
    if (!waitlistId || !claimToken) {
      return { success: false, message: 'Thiếu thông tin lượt chờ.' };
    }

    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.waitlistSheetName,
      WAITLIST_HEADERS
    );
    const table = readTable_(sheet);
    const row = table.rows.find(function (item) {
      return (
        clean_(field_(item, 'waitlistId')) === waitlistId &&
        constantTimeEqual_(clean_(field_(item, 'claimToken')), claimToken)
      );
    });

    if (!row) return { success: false, message: 'Không tìm thấy lượt chờ.' };
    return Object.assign(
      { success: true },
      serializeWaitlistForCustomer_(row, table.rows, spreadsheet)
    );
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : 'Không thể đọc hàng chờ.',
    };
  }
}

function serializeWaitlistForCustomer_(row, rows, spreadsheet) {
  const waitlistId = clean_(field_(row, 'waitlistId'));
  const status = normalizeWaitlistStatus_(field_(row, 'status'));
  const activeRows = (rows || [])
    .filter(function (item) {
      return normalizeWaitlistStatus_(field_(item, 'status')) === 'waiting';
    })
    .sort(function (left, right) {
      const leftDate = dateValueOrNull_(field_(left, 'joinedAt'));
      const rightDate = dateValueOrNull_(field_(right, 'joinedAt'));
      return (leftDate ? leftDate.getTime() : 0) - (rightDate ? rightDate.getTime() : 0);
    });
  const index = activeRows.findIndex(function (item) {
    return clean_(field_(item, 'waitlistId')) === waitlistId;
  });
  const position = status === 'waiting' && index >= 0 ? index + 1 : 0;
  const estimate = estimateWaitRange_(position, spreadsheet);

  return {
    message: waitlistCustomerMessage_(status, position),
    waitlistId: waitlistId,
    queueCode: clean_(field_(row, 'queueCode')),
    waitlistStatus: status,
    position: position,
    estimateMin: estimate.min,
    estimateMax: estimate.max,
    groupSize: Math.max(1, Number(field_(row, 'groupSize')) || 1),
    displayName: clean_(field_(row, 'name')),
    updatedAt: serializedDateValue_(field_(row, 'updatedAt') || new Date()),
  };
}

function estimateWaitRange_(position, spreadsheet) {
  if (!position) return { min: 0, max: 0 };
  let min = 10 + Math.max(0, position - 1) * 15;
  let max = min + 25;

  try {
    const tableSheet = spreadsheet.getSheetByName(
      APP_BACKEND_CONFIG.tableSessionSheetName
    );
    if (!tableSheet) return { min: min, max: max };
    const latest = {};
    readTable_(tableSheet).rows.forEach(function (row) {
      const code = sanitizeTableCode_(field_(row, 'tableCode'));
      if (code) latest[code] = clean_(field_(row, 'tableState'));
    });
    const states = Object.keys(latest).map(function (key) { return latest[key]; });
    if (states.indexOf('available') >= 0) {
      min = 5;
      max = Math.min(max, 15 + Math.max(0, position - 1) * 10);
    } else if (states.indexOf('leaving_soon') >= 0) {
      min = Math.max(8, min - 8);
      max = Math.max(min + 10, max - 10);
    } else if (states.indexOf('last_round') >= 0) {
      min = Math.max(10, min - 4);
      max = Math.max(min + 15, max - 5);
    }
  } catch (_) {
    // A broad estimate is safer than failing the waitlist status request.
  }

  return { min: Math.round(min / 5) * 5, max: Math.round(max / 5) * 5 };
}

function waitlistCustomerMessage_(status, position) {
  if (status === 'notified') return 'Quán đang chuẩn bị bàn cho bạn. Hãy đến quầy nhé!';
  if (status === 'seated') return 'Bạn đã được xếp bàn. Chúc cả nhóm chơi vui!';
  if (status === 'cancelled') return 'Lượt chờ này đã kết thúc.';
  return position > 1
    ? 'Còn khoảng ' + (position - 1) + ' nhóm trước bạn.'
    : 'Bạn đang ở đầu hàng chờ.';
}

function createWaitlistCode_(rows) {
  const used = {};
  (rows || []).forEach(function (row) {
    const code = clean_(field_(row, 'queueCode')).toUpperCase();
    if (code) used[code] = true;
  });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    let code = 'W';
    for (let index = 0; index < 4; index += 1) {
      code += SHORT_CHECKIN_ALPHABET.charAt(
        Math.floor(Math.random() * SHORT_CHECKIN_ALPHABET.length)
      );
    }
    if (!used[code]) return code;
  }
  throw new Error('Không thể tạo mã hàng chờ. Vui lòng thử lại.');
}

function normalizeWaitlistStatus_(value) {
  const status = normalizeText_(value);
  if (status === 'notified') return 'notified';
  if (status === 'seated') return 'seated';
  if (status === 'cancelled' || status === 'expired') return 'cancelled';
  return 'waiting';
}

function sanitizeTableCode_(value) {
  return clean_(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
}

function normalizeSupportCategory_(value) {
  const category = clean_(value);
  return ['rules', 'missing_piece', 'change_game', 'order', 'other'].indexOf(category) >= 0
    ? category
    : '';
}

function normalizeSupportStatus_(value) {
  const status = normalizeText_(value);
  if (status === 'acknowledged') return 'acknowledged';
  if (status === 'resolved') return 'resolved';
  return 'pending';
}

function serializeSupportRequest_(row) {
  return {
    requestId: clean_(field_(row, 'requestId')),
    tableCode: sanitizeTableCode_(field_(row, 'tableCode')),
    category: normalizeSupportCategory_(field_(row, 'category')),
    gameName: clean_(field_(row, 'gameName')),
    supportStatus: normalizeSupportStatus_(field_(row, 'status')),
    createdAt: serializedDateValue_(field_(row, 'createdAt')),
    notificationChannel: clean_(field_(row, 'notificationChannel')),
    notificationStatus: clean_(field_(row, 'notificationStatus')),
    notificationAt: serializedDateValue_(field_(row, 'notificationAt')),
  };
}

function readRegistrationPayload_(params) {
  return {
    meetupId: clean_(params.meetupId),
    gameId: clean_(params.gameId),
    gameName: clean_(params.gameName),
    startTime: clean_(params.startTime),
    room: clean_(params.room),
    name: clean_(params.name),
    phone: clean_(params.phone),
    facebook: clean_(params.facebook),
    companions: clean_(params.companions),
    submissionToken: clean_(params.submissionToken || params.requestToken),
  };
}

function validateRegistrationPayload_(payload) {
  if (!payload.submissionToken) throw new Error('Thiếu submissionToken.');
  if (!payload.meetupId) throw new Error('Thiếu mã tụ game.');
  if (!payload.name) throw new Error('Vui lòng nhập tên hoặc biệt danh.');
  if (!payload.phone) throw new Error('Vui lòng nhập số điện thoại.');
  if (!/^(?:\+84|84|0)\d{8,10}$/.test(normalizePhoneRaw_(payload.phone))) {
    throw new Error('Số điện thoại không hợp lệ.');
  }
  if (!/^\d+$/.test(payload.companions)) {
    throw new Error('Số người đi cùng không hợp lệ.');
  }

  const companions = Number(payload.companions);
  if (!Number.isInteger(companions) || companions < 0 || companions > 30) {
    throw new Error('Số người đi cùng không hợp lệ.');
  }
}

function existingRegistrationResult_(row) {
  const registrationId = clean_(field_(row, 'registrationId'));
  const checkInCode =
    clean_(field_(row, 'checkInCode')) ||
    (registrationId ? createCheckInCode_(registrationId) : '');

  return {
    message: 'Đăng ký này đã được lưu trước đó.',
    meetupId: clean_(field_(row, 'meetupId')),
    registrationId: registrationId,
    status: 'active',
    checkInCode: checkInCode,
  };
}

function saveRequestStatus_(token, state, message, extra) {
  const safeToken = clean_(token);
  if (!safeToken) return;

  const payload = Object.assign(
    {
      token: safeToken,
      state: state,
      success: state === 'success',
      message: clean_(message),
      updatedAt: Date.now(),
    },
    extra || {}
  );

  CacheService.getScriptCache().put(
    requestStatusKey_(safeToken),
    JSON.stringify(payload),
    APP_BACKEND_CONFIG.requestStatusTtlSeconds
  );
}

function readRequestStatus_(token) {
  const safeToken = clean_(token);

  if (!safeToken) {
    return {
      state: 'error',
      success: false,
      message: 'Thiếu token.',
    };
  }

  const raw = CacheService.getScriptCache().get(requestStatusKey_(safeToken));

  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      // Continue to durable lookup.
    }
  }

  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = spreadsheet.getSheetByName(APP_BACKEND_CONFIG.registrationSheetName);

    if (sheet && sheet.getLastRow() > 1) {
      const row = readTable_(sheet).rows.find(function (item) {
        return clean_(field_(item, 'submissionToken')) === safeToken;
      });

      if (row) {
        const result = existingRegistrationResult_(row);
        return Object.assign(
          {
            token: safeToken,
            state: 'success',
            success: true,
          },
          result
        );
      }
    }

    const waitlistSheet = spreadsheet.getSheetByName(
      APP_BACKEND_CONFIG.waitlistSheetName
    );
    if (waitlistSheet && waitlistSheet.getLastRow() > 1) {
      const waitlistRows = readTable_(waitlistSheet).rows;
      const waitlistRow = waitlistRows.find(function (item) {
        return clean_(field_(item, 'requestToken')) === safeToken;
      });
      if (waitlistRow) {
        return Object.assign(
          {
            token: safeToken,
            state: 'success',
            success: true,
          },
          serializeWaitlistForCustomer_(waitlistRow, waitlistRows, spreadsheet)
        );
      }
    }

    const supportSheet = spreadsheet.getSheetByName(
      APP_BACKEND_CONFIG.supportRequestSheetName
    );
    if (supportSheet && supportSheet.getLastRow() > 1) {
      const supportRow = readTable_(supportSheet).rows.find(function (item) {
        return clean_(field_(item, 'requestToken')) === safeToken;
      });
      if (supportRow) {
        return Object.assign(
          {
            token: safeToken,
            state: 'success',
            success: true,
            message: 'Nhân viên đã nhận yêu cầu hỗ trợ.',
          },
          serializeSupportRequest_(supportRow)
        );
      }
    }
  } catch (error) {
    console.warn('Không thể khôi phục status từ Registrations:', error);
  }

  return {
    token: safeToken,
    state: 'pending',
    success: false,
    message: '',
  };
}

function requestStatusKey_(token) {
  return 'noburi_request_' + clean_(token).slice(0, 180);
}

function outputPayload_(payload, callback) {
  const callbackName = clean_(callback);
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');

  if (callbackName) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,120}$/.test(callbackName)) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, message: 'Callback không hợp lệ.' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(callbackName + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(json).setMimeType(
    ContentService.MimeType.JSON
  );
}

function legacyPostResponse_(token, success, message, extra) {
  const payload = Object.assign(
    {
      type: 'MEETUP_REGISTRATION_RESULT',
      token: clean_(token),
      success: Boolean(success),
      message: clean_(message),
    },
    extra || {}
  );
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');

  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><script>' +
      'try{window.parent.postMessage(' +
      json +
      ',"*");}catch(e){}' +
      '</script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function readAdminDashboardCache_() {
  const serialized = CacheService.getScriptCache().get(ADMIN_DASHBOARD_CACHE_KEY);
  if (!serialized) return null;
  try {
    return JSON.parse(serialized);
  } catch (_) {
    return null;
  }
}

function writeAdminDashboardCache_(snapshot) {
  try {
    CacheService.getScriptCache().put(
      ADMIN_DASHBOARD_CACHE_KEY,
      JSON.stringify(snapshot),
      APP_BACKEND_CONFIG.adminDashboardCacheSeconds
    );
  } catch (_) {
    // Cache is only a performance optimization; live Sheet data still works.
  }
}

function clearAdminDashboardCache_() {
  CacheService.getScriptCache().remove(ADMIN_DASHBOARD_CACHE_KEY);
}

function serializeAdminRegistration_(row, leaderByMeetupId) {
  const registrationId = clean_(field_(row, 'registrationId'));
  const meetupId = clean_(field_(row, 'meetupId'));

  return {
    registrationId: registrationId,
    meetupId: meetupId,
    gameName: clean_(field_(row, 'gameName')),
    leaderName:
      clean_(field_(row, 'leaderName')) ||
      clean_(leaderByMeetupId && leaderByMeetupId[meetupId]),
    name: clean_(field_(row, 'name')),
    maskedPhone: maskPhone_(field_(row, 'phone')),
    totalSeats: Math.max(1, Number(field_(row, 'totalSeats')) || 1),
    status: clean_(field_(row, 'status') || 'confirmed'),
    checkInStatus: clean_(field_(row, 'checkInStatus') || 'pending'),
    checkedInAt: serializedDateValue_(field_(row, 'checkedInAt')),
    checkInCode:
      clean_(field_(row, 'checkInCode')) ||
      (registrationId ? createCheckInCode_(registrationId) : ''),
  };
}

function serializeAdminWaitlist_(row, rows, spreadsheet) {
  const customerView = serializeWaitlistForCustomer_(row, rows, spreadsheet);
  return Object.assign(customerView, {
    joinedAt: serializedDateValue_(field_(row, 'joinedAt')),
    maskedPhone: maskPhone_(field_(row, 'phone')),
    note: clean_(field_(row, 'note')),
  });
}

function serializeAdminSupportRequest_(row) {
  return Object.assign(serializeSupportRequest_(row), {
    note: clean_(field_(row, 'note')),
    gameId: clean_(field_(row, 'gameId')),
    updatedAt: serializedDateValue_(field_(row, 'updatedAt')),
  });
}

function activeWaitlistRowsForDashboard_(rows) {
  const seenPhones = {};
  return (rows || [])
    .filter(function (row) {
      const status = normalizeWaitlistStatus_(field_(row, 'status'));
      return status === 'waiting' || status === 'notified';
    })
    .sort(function (left, right) {
      const leftDate = dateValueOrNull_(field_(left, 'joinedAt'));
      const rightDate = dateValueOrNull_(field_(right, 'joinedAt'));
      return (leftDate ? leftDate.getTime() : 0) -
        (rightDate ? rightDate.getTime() : 0);
    })
    .filter(function (row) {
      const phoneKey = normalizePhone_(field_(row, 'phone'));
      if (!phoneKey) return true;
      if (seenPhones[phoneKey]) return false;
      seenPhones[phoneKey] = true;
      return true;
    });
}

function adminGetDashboard(sessionToken) {
  requireAdminSession_(sessionToken);
  const cachedSnapshot = readAdminDashboardCache_();
  if (cachedSnapshot) return cachedSnapshot;

  const spreadsheet = getSpreadsheet_();
  const meetupSheet = getMeetupSheet_(spreadsheet);
  const registrationsSheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.registrationSheetName,
    REGISTRATION_HEADERS
  );
  const tableSheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.tableSessionSheetName,
    TABLE_SESSION_HEADERS
  );
  const waitlistSheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.waitlistSheetName,
    WAITLIST_HEADERS
  );
  const supportSheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.supportRequestSheetName,
    SUPPORT_REQUEST_HEADERS
  );
  const meetups = meetupSheet ? readTable_(meetupSheet).rows : [];
  const registrations = readTable_(registrationsSheet).rows;
  const tableSessions = readTable_(tableSheet).rows;
  const waitlistRows = readTable_(waitlistSheet).rows;
  const supportRows = readTable_(supportSheet).rows;
  const dashboardWaitlistRows = activeWaitlistRowsForDashboard_(waitlistRows);
  const registrationGroups = {};

  registrations.forEach(function (row) {
    const meetupId = clean_(field_(row, 'meetupId'));
    if (!meetupId) return;
    if (!registrationGroups[meetupId]) {
      registrationGroups[meetupId] = {
        confirmedSeats: 0,
        checkedInSeats: 0,
        groups: 0,
        gameName: '',
      };
    }

    if (!registrationGroups[meetupId].gameName) {
      registrationGroups[meetupId].gameName = clean_(field_(row, 'gameName'));
    }

    if (normalizeText_(field_(row, 'status') || 'confirmed') !== 'cancelled') {
      const seats = Math.max(1, Number(field_(row, 'totalSeats')) || 1);
      registrationGroups[meetupId].confirmedSeats += seats;
      registrationGroups[meetupId].groups += 1;

      if (normalizeText_(field_(row, 'checkInStatus')) === 'checked in') {
        registrationGroups[meetupId].checkedInSeats += Math.max(
          0,
          Number(field_(row, 'checkedInSeats')) || seats
        );
      }
    }
  });

  const meetupSnapshot = meetups.map(function (row) {
    const id = clean_(field_(row, 'id'));
    const totals = registrationGroups[id] || {
      confirmedSeats: 0,
      checkedInSeats: 0,
      groups: 0,
      gameName: '',
    };
    const capacity = parsePositiveInteger_(field_(row, 'requiredPlayers')) || 0;

    return {
      id: id,
      gameId: clean_(field_(row, 'gameId')),
      gameName:
        clean_(field_(row, 'gameName')) ||
        totals.gameName ||
        clean_(field_(row, 'gameId')),
      leaderName: clean_(field_(row, 'leaderName')),
      startTime: serializedDateValue_(field_(row, 'startTime')),
      room: clean_(field_(row, 'room')),
      note: clean_(field_(row, 'note')),
      status: normalizeStatus_(field_(row, 'status')),
      hostStartedAt: serializedDateValue_(field_(row, 'hostStartedAt')),
      hostStartedBy: clean_(field_(row, 'hostStartedBy')),
      capacity: capacity,
      sheetCurrentPlayers: Number(field_(row, 'currentPlayers')) || 0,
      confirmedSeats: totals.confirmedSeats,
      checkedInSeats: totals.checkedInSeats,
      remainingSeats: capacity ? Math.max(0, capacity - totals.confirmedSeats) : null,
      groups: totals.groups,
    };
  });
  const leaderByMeetupId = {};
  meetupSnapshot.forEach(function (meetup) {
    if (meetup.id) leaderByMeetupId[meetup.id] = meetup.leaderName;
  });

  const recentRegistrations = registrations
    .slice(-12)
    .reverse()
    .map(function (row) {
      return serializeAdminRegistration_(row, leaderByMeetupId);
    });

  const latestTables = {};
  tableSessions.forEach(function (row) {
    const tableCode = clean_(field_(row, 'tableCode'));
    if (!tableCode) return;
    latestTables[tableCode] = {
      tableCode: tableCode,
      timestamp: serializedDateValue_(field_(row, 'timestamp')),
      tableState: clean_(field_(row, 'tableState')),
      groupSize: Number(field_(row, 'groupSize')) || 0,
      gameName: clean_(field_(row, 'gameName')),
      roundMinutes: Number(field_(row, 'roundMinutes')) || 0,
    };
  });

  const snapshot = {
    success: true,
    generatedAt: new Date().toISOString(),
    leadgameAlerts: getLeadgameTelegramStatus_(),
    meetups: meetupSnapshot,
    registrations: recentRegistrations,
    registrationTotal: registrations.length,
    tables: Object.keys(latestTables)
      .sort()
      .map(function (key) {
        return latestTables[key];
      }),
    waitlist: dashboardWaitlistRows
      .map(function (row) {
        return serializeAdminWaitlist_(row, waitlistRows, spreadsheet);
      })
      .sort(function (left, right) {
        return new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime();
      }),
    supportRequests: supportRows
      .filter(function (row) {
        return normalizeSupportStatus_(field_(row, 'status')) !== 'resolved';
      })
      .slice(-30)
      .reverse()
      .map(serializeAdminSupportRequest_),
  };
  writeAdminDashboardCache_(snapshot);
  return snapshot;
}

function adminGetRegistrationPage(sessionToken, requestedPage, requestedPageSize) {
  requireAdminSession_(sessionToken);

  const pageSize = Math.min(
    25,
    Math.max(6, Math.floor(Number(requestedPageSize) || 12))
  );
  const spreadsheet = getSpreadsheet_();
  const registrationsSheet = getOrCreateSheetWithHeaders_(
    spreadsheet,
    APP_BACKEND_CONFIG.registrationSheetName,
    REGISTRATION_HEADERS
  );
  const meetupSheet = getMeetupSheet_(spreadsheet);
  const registrations = readTable_(registrationsSheet).rows;
  const leaderByMeetupId = {};

  if (meetupSheet) {
    readTable_(meetupSheet).rows.forEach(function (row) {
      const meetupId = clean_(field_(row, 'id'));
      if (meetupId) {
        leaderByMeetupId[meetupId] = clean_(field_(row, 'leaderName'));
      }
    });
  }

  const total = registrations.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(
    pageCount - 1,
    Math.max(0, Math.floor(Number(requestedPage) || 0))
  );
  const end = Math.max(0, total - page * pageSize);
  const start = Math.max(0, end - pageSize);

  return {
    success: true,
    page: page,
    pageSize: pageSize,
    total: total,
    registrations: registrations
      .slice(start, end)
      .reverse()
      .map(function (row) {
        return serializeAdminRegistration_(row, leaderByMeetupId);
      }),
  };
}

function adminSetMeetupStatus(sessionToken, meetupId, nextStatus, operationId) {
  requireAdminSession_(sessionToken);
  const safeStatus = clean_(nextStatus);
  if (['active', 'closed'].indexOf(safeStatus) < 0) {
    throw new Error('Admin chỉ có thể mở hoặc đóng đăng ký.');
  }
  if (wasOperationProcessed_(operationId)) {
    return { success: true, ok: true, message: 'Thao tác này đã được xử lý.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getMeetupSheet_(spreadsheet);
    if (!sheet) throw new Error('Không tìm thấy Meetups.');
    const table = readTable_(sheet);
    const rowIndex = table.rows.findIndex(function (row) {
      return clean_(field_(row, 'id')) === clean_(meetupId);
    });
    if (rowIndex < 0) throw new Error('Không tìm thấy tụ game.');

    if (
      safeStatus === 'active' &&
      dateValueOrNull_(field_(table.rows[rowIndex], 'hostStartedAt'))
    ) {
      throw new Error('Tụ đã bắt đầu tính giờ nên không thể mở đăng ký lại.');
    }

    let statusToWrite = safeStatus;
    let currentPlayersForEditor =
      Number(field_(table.rows[rowIndex], 'currentPlayers')) || 0;
    if (safeStatus === 'active') {
      const registrationsSheet = getOrCreateSheetWithHeaders_(
        spreadsheet,
        APP_BACKEND_CONFIG.registrationSheetName,
        REGISTRATION_HEADERS
      );
      const registrations = readTable_(registrationsSheet).rows;
      const confirmed = countConfirmedSeats_(registrations, clean_(meetupId));
      currentPlayersForEditor = confirmed;
      const capacity = parsePositiveInteger_(
        field_(table.rows[rowIndex], 'requiredPlayers')
      );
      if (capacity && confirmed >= capacity) statusToWrite = 'full';
      updateMeetupProgress_(sheet, rowIndex + 2, statusToWrite, confirmed);
    } else {
      sheet
        .getRange(rowIndex + 2, ensureHeaderColumn_(sheet, 'status'))
        .setValue(statusToWrite);
      sheet
        .getRange(rowIndex + 2, ensureHeaderColumn_(sheet, 'updatedAt'))
        .setValue(new Date());
      sheet
        .getRange(rowIndex + 2, ensureHeaderColumn_(sheet, 'updatedBy'))
        .setValue('admin-dashboard');
    }

    SpreadsheetApp.flush();
    syncLeaderMeetupProgress_(
      spreadsheet,
      meetupId,
      statusToWrite,
      currentPlayersForEditor
    );
    clearAdminDashboardCache_();
    markOperationProcessed_(operationId);
    return {
      success: true,
      ok: true,
      meetupId: clean_(meetupId),
      status: statusToWrite,
      message:
        statusToWrite === 'full'
          ? 'Tụ đã đủ chỗ nên vẫn được giữ ở trạng thái full.'
          : statusToWrite === 'active'
            ? 'Đã mở đăng ký.'
            : 'Đã đóng đăng ký.',
    };
  } finally {
    lock.releaseLock();
  }
}

function adminStartMeetup(sessionToken, meetupId, operationId) {
  requireAdminSession_(sessionToken);
  if (wasOperationProcessed_(operationId)) {
    return { success: true, ok: true, message: 'Thao tác này đã được xử lý.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getMeetupSheet_(spreadsheet);
    if (!sheet) throw new Error('Không tìm thấy Meetups.');
    const table = readTable_(sheet);
    const rowIndex = table.rows.findIndex(function (row) {
      return clean_(field_(row, 'id')) === clean_(meetupId);
    });
    if (rowIndex < 0) throw new Error('Không tìm thấy tụ game.');

    const meetup = table.rows[rowIndex];
    const existingStartedAt = dateValueOrNull_(field_(meetup, 'hostStartedAt'));
    if (existingStartedAt) {
      return {
        success: true,
        ok: true,
        alreadyStarted: true,
        meetupId: clean_(meetupId),
        hostStartedAt: existingStartedAt.toISOString(),
        message: 'Tụ này đã bắt đầu tính giờ trước đó.',
      };
    }

    if (normalizeStatus_(field_(meetup, 'status')) === 'cancelled') {
      throw new Error('Không thể bắt đầu một tụ đã hủy.');
    }

    const now = new Date();
    const rowNumber = rowIndex + 2;
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'hostStartedAt'))
      .setValue(now);
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'hostStartedBy'))
      .setValue('admin-dashboard');
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'status'))
      .setValue('closed');
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedAt'))
      .setValue(now);
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedBy'))
      .setValue('admin-dashboard-start');

    syncLeaderMeetupProgress_(
      spreadsheet,
      meetupId,
      'closed',
      Number(field_(meetup, 'currentPlayers')) || 0
    );
    SpreadsheetApp.flush();
    clearAdminDashboardCache_();
    markOperationProcessed_(operationId);

    return {
      success: true,
      ok: true,
      meetupId: clean_(meetupId),
      status: 'closed',
      hostStartedAt: now.toISOString(),
      message: 'Đã bắt đầu tính giờ và đóng nhận đăng ký cho tụ.',
    };
  } finally {
    lock.releaseLock();
  }
}

function adminEndMeetup(sessionToken, meetupId, operationId) {
  requireAdminSession_(sessionToken);
  if (wasOperationProcessed_(operationId)) {
    return { success: true, ok: true, message: 'Tụ này đã được kết thúc.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = getSpreadsheet_();
    const meetupSheet = getMeetupSheet_(spreadsheet);
    if (!meetupSheet) throw new Error('Không tìm thấy Meetups.');
    const historySheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.meetupHistorySheetName,
      MEETUP_HISTORY_HEADERS
    );
    const registrationSheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.registrationSheetName,
      REGISTRATION_HEADERS
    );
    const safeMeetupId = clean_(meetupId);
    const meetupTable = readTable_(meetupSheet);
    const meetupIndex = meetupTable.rows.findIndex(function (row) {
      return clean_(field_(row, 'id')) === safeMeetupId;
    });
    const historyTable = readTable_(historySheet);
    let historyRecord = historyTable.rows.find(function (row) {
      return clean_(field_(row, 'meetupId')) === safeMeetupId;
    });

    if (meetupIndex < 0 && !historyRecord) {
      throw new Error('Không tìm thấy tụ game để kết thúc.');
    }

    const registrations = readTable_(registrationSheet).rows;
    const registrationIndexes = [];
    const activeRegistrations = [];
    registrations.forEach(function (row, index) {
      if (clean_(field_(row, 'meetupId')) !== safeMeetupId) return;
      registrationIndexes.push(index);
      if (normalizeText_(field_(row, 'status') || 'confirmed') !== 'cancelled') {
        activeRegistrations.push(row);
      }
    });

    if (!historyRecord) {
      const meetup = meetupTable.rows[meetupIndex];
      const startedAt = dateValueOrNull_(field_(meetup, 'hostStartedAt'));
      if (!startedAt) {
        throw new Error('Hãy nhấn “Bắt đầu tính giờ” trước khi kết thúc tụ.');
      }
      const endedAt = new Date();
      const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
      const durationMinutes = Math.round(durationMs / 60000);
      const registeredSeats = activeRegistrations.reduce(function (sum, row) {
        return sum + Math.max(1, Number(field_(row, 'totalSeats')) || 1);
      }, 0);
      const checkedInRegistrations = activeRegistrations.filter(function (row) {
        return normalizeText_(field_(row, 'checkInStatus')) === 'checked in';
      });
      const checkedInSeats = checkedInRegistrations.reduce(function (sum, row) {
        const registeredForRow = Math.max(1, Number(field_(row, 'totalSeats')) || 1);
        return sum + Math.max(
          0,
          Number(field_(row, 'checkedInSeats')) || registeredForRow
        );
      }, 0);
      const timezone = spreadsheet.getSpreadsheetTimeZone();

      historyRecord = {
        endedAt: endedAt,
        meetupId: safeMeetupId,
        gameId: clean_(field_(meetup, 'gameId')),
        gameName: clean_(field_(meetup, 'gameName')),
        leaderName: clean_(field_(meetup, 'leaderName')),
        scheduledStartTime: field_(meetup, 'startTime'),
        hostDate: Utilities.formatDate(startedAt, timezone, 'dd/MM/yyyy'),
        hostStartedAt: startedAt,
        hostEndedAt: endedAt,
        hostDurationMinutes: durationMinutes,
        hostDurationHours: Math.round((durationMs / 3600000) * 100) / 100,
        registeredSeats: registeredSeats,
        checkedInSeats: checkedInSeats,
        attendanceSummary: checkedInSeats + '/' + registeredSeats,
        registeredGroups: activeRegistrations.length,
        checkedInGroups: checkedInRegistrations.length,
        room: clean_(field_(meetup, 'room')),
        note: clean_(field_(meetup, 'note')),
        endedBy: 'admin-dashboard',
      };
      appendRecord_(historySheet, historyRecord);
      SpreadsheetApp.flush();
      historyRecord = readTable_(historySheet).rows.slice(-1)[0];
    }

    registrationIndexes
      .sort(function (left, right) { return right - left; })
      .forEach(function (index) {
        registrationSheet.deleteRow(index + 2);
      });

    const editorSheet = spreadsheet.getSheetByName(
      APP_BACKEND_CONFIG.meetupEditorSheetName
    );
    if (editorSheet && editorSheet.getLastRow() > 1) {
      const editorIds = editorSheet
        .getRange(2, 1, editorSheet.getLastRow() - 1, 1)
        .getDisplayValues()
        .flat();
      for (let index = editorIds.length - 1; index >= 0; index -= 1) {
        if (clean_(editorIds[index]) === safeMeetupId) {
          editorSheet.deleteRow(index + 2);
        }
      }
    }

    if (meetupIndex >= 0) meetupSheet.deleteRow(meetupIndex + 2);

    SpreadsheetApp.flush();
    clearAdminDashboardCache_();
    markOperationProcessed_(operationId);

    return {
      success: true,
      ok: true,
      meetupId: safeMeetupId,
      checkedInSeats: Number(field_(historyRecord, 'checkedInSeats')) || 0,
      registeredSeats: Number(field_(historyRecord, 'registeredSeats')) || 0,
      hostDurationMinutes: Number(field_(historyRecord, 'hostDurationMinutes')) || 0,
      message:
        'Đã kết thúc tụ, lưu lịch sử ' +
        (field_(historyRecord, 'attendanceSummary') || '0/0') +
        ' người đến/đăng ký và dọn dữ liệu đang hoạt động.',
    };
  } finally {
    lock.releaseLock();
  }
}

function adminCheckInRegistration(sessionToken, checkInCode, operationId) {
  requireAdminSession_(sessionToken);
  if (wasOperationProcessed_(operationId)) {
    return { success: true, ok: true, message: 'Lượt quét này đã được xử lý.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.registrationSheetName,
      REGISTRATION_HEADERS
    );
    const table = readTable_(sheet);
    const registrationId = resolveRegistrationIdFromCheckInCode_(
      checkInCode,
      table.rows
    );
    const rowIndex = table.rows.findIndex(function (row) {
      return clean_(field_(row, 'registrationId')) === registrationId;
    });

    if (rowIndex < 0) throw new Error('Không tìm thấy vé đăng ký.');
    const registration = table.rows[rowIndex];
    if (normalizeText_(field_(registration, 'status')) === 'cancelled') {
      throw new Error('Đăng ký này đã bị hủy.');
    }

    if (normalizeText_(field_(registration, 'checkInStatus')) === 'checked in') {
      return {
        success: true,
        ok: true,
        alreadyCheckedIn: true,
        name: clean_(field_(registration, 'name')),
        gameName: clean_(field_(registration, 'gameName')),
        checkedInAt: serializedDateValue_(field_(registration, 'checkedInAt')),
        message: 'Vé này đã check-in trước đó.',
      };
    }

    const rowNumber = rowIndex + 2;
    const totalSeats = Math.max(1, Number(field_(registration, 'totalSeats')) || 1);
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'checkInStatus'))
      .setValue('checked_in');
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'checkedInAt'))
      .setValue(new Date());
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'checkedInSeats'))
      .setValue(totalSeats);
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'checkedInBy'))
      .setValue('admin-dashboard');
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedAt'))
      .setValue(new Date());
    SpreadsheetApp.flush();
    clearAdminDashboardCache_();
    markOperationProcessed_(operationId);

    return {
      success: true,
      ok: true,
      name: clean_(field_(registration, 'name')),
      gameName: clean_(field_(registration, 'gameName')),
      totalSeats: totalSeats,
      message: 'Check-in thành công cho ' + totalSeats + ' người.',
    };
  } finally {
    lock.releaseLock();
  }
}

function adminUpdateWaitlistStatus(sessionToken, waitlistId, nextStatus, operationId) {
  requireAdminSession_(sessionToken);
  if (wasOperationProcessed_(operationId)) {
    return { success: true, ok: true, message: 'Trạng thái hàng chờ đã được xử lý.' };
  }

  const safeStatus = clean_(nextStatus);
  if (['waiting', 'notified', 'seated', 'cancelled'].indexOf(safeStatus) < 0) {
    throw new Error('Trạng thái hàng chờ không hợp lệ.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.waitlistSheetName,
      WAITLIST_HEADERS
    );
    const table = readTable_(sheet);
    const rowIndex = table.rows.findIndex(function (row) {
      return clean_(field_(row, 'waitlistId')) === clean_(waitlistId);
    });
    if (rowIndex < 0) throw new Error('Không tìm thấy lượt chờ.');

    const rowNumber = rowIndex + 2;
    const now = new Date();
    sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'status')).setValue(safeStatus);
    if (safeStatus === 'notified') {
      sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'notifiedAt')).setValue(now);
    }
    if (safeStatus === 'seated') {
      sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'seatedAt')).setValue(now);
    }
    if (safeStatus === 'cancelled') {
      sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'cancelledAt')).setValue(now);
    }
    sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedAt')).setValue(now);
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedBy'))
      .setValue('admin-dashboard');
    SpreadsheetApp.flush();
    clearAdminDashboardCache_();
    markOperationProcessed_(operationId);

    const messages = {
      waiting: 'Đã đưa khách về trạng thái đang chờ.',
      notified: 'Đã báo khách đến quầy nhận bàn.',
      seated: 'Đã xác nhận khách được xếp bàn.',
      cancelled: 'Đã kết thúc lượt chờ.',
    };
    return {
      success: true,
      ok: true,
      waitlistId: clean_(waitlistId),
      waitlistStatus: safeStatus,
      message: messages[safeStatus],
    };
  } finally {
    lock.releaseLock();
  }
}

function adminUpdateSupportStatus(sessionToken, requestId, nextStatus, operationId) {
  requireAdminSession_(sessionToken);
  if (wasOperationProcessed_(operationId)) {
    return { success: true, ok: true, message: 'Yêu cầu hỗ trợ đã được xử lý.' };
  }

  const safeStatus = clean_(nextStatus);
  if (['pending', 'acknowledged', 'resolved'].indexOf(safeStatus) < 0) {
    throw new Error('Trạng thái hỗ trợ không hợp lệ.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getOrCreateSheetWithHeaders_(
      spreadsheet,
      APP_BACKEND_CONFIG.supportRequestSheetName,
      SUPPORT_REQUEST_HEADERS
    );
    const table = readTable_(sheet);
    const rowIndex = table.rows.findIndex(function (row) {
      return clean_(field_(row, 'requestId')) === clean_(requestId);
    });
    if (rowIndex < 0) throw new Error('Không tìm thấy yêu cầu hỗ trợ.');

    const rowNumber = rowIndex + 2;
    const now = new Date();
    sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'status')).setValue(safeStatus);
    if (safeStatus === 'acknowledged') {
      sheet
        .getRange(rowNumber, ensureHeaderColumn_(sheet, 'acknowledgedAt'))
        .setValue(now);
    }
    if (safeStatus === 'resolved') {
      sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'resolvedAt')).setValue(now);
    }
    sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedAt')).setValue(now);
    sheet
      .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedBy'))
      .setValue('admin-dashboard');
    SpreadsheetApp.flush();
    clearAdminDashboardCache_();
    markOperationProcessed_(operationId);

    return {
      success: true,
      ok: true,
      requestId: clean_(requestId),
      supportStatus: safeStatus,
      message:
        safeStatus === 'resolved'
          ? 'Đã hoàn tất yêu cầu hỗ trợ.'
          : safeStatus === 'acknowledged'
            ? 'Đã nhận xử lý yêu cầu.'
            : 'Đã đưa yêu cầu về trạng thái mới.',
    };
  } finally {
    lock.releaseLock();
  }
}

function wasOperationProcessed_(operationId) {
  const id = clean_(operationId);
  return id ? CacheService.getScriptCache().get('admin_op_' + id) === '1' : false;
}

function markOperationProcessed_(operationId) {
  const id = clean_(operationId);
  if (id) CacheService.getScriptCache().put('admin_op_' + id, '1', 21600);
}

function normalizeShortCheckInCode_(value) {
  return clean_(value)
    .toUpperCase()
    .replace(/^NOBURI-CHECKIN:/i, '')
    .replace(/[\s-]+/g, '');
}

function createAdminCheckInUrl_(checkInCode) {
  const code = normalizeShortCheckInCode_(checkInCode);
  if (!code) return '';

  try {
    const serviceUrl = clean_(ScriptApp.getService().getUrl());
    if (!serviceUrl) return '';

    return (
      serviceUrl.replace(/[?#].*$/, '') +
      '?view=admin&checkin=' +
      encodeURIComponent(code)
    );
  } catch (_) {
    return '';
  }
}

function isShortCheckInCode_(value) {
  const code = normalizeShortCheckInCode_(value);
  if (code.length !== SHORT_CHECKIN_LENGTH) return false;
  for (let index = 0; index < code.length; index += 1) {
    if (SHORT_CHECKIN_ALPHABET.indexOf(code.charAt(index)) < 0) return false;
  }
  return true;
}

function collectShortCheckInCodes_(rows) {
  const used = {};
  (rows || []).forEach(function (row) {
    const code = normalizeShortCheckInCode_(field_(row, 'checkInCode'));
    if (isShortCheckInCode_(code)) used[code] = true;
  });
  return used;
}

function createShortCheckInCode_(rowsOrUsedCodes) {
  const used = Array.isArray(rowsOrUsedCodes)
    ? collectShortCheckInCodes_(rowsOrUsedCodes)
    : rowsOrUsedCodes || {};

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const material = [
      Utilities.getUuid(),
      Utilities.getUuid(),
      String(Date.now()),
      String(Math.random()),
    ].join(':');
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      material,
      Utilities.Charset.UTF_8
    );
    let code = '';
    for (let index = 0; index < SHORT_CHECKIN_LENGTH; index += 1) {
      const byte = (Number(bytes[index]) + 256) % 256;
      code += SHORT_CHECKIN_ALPHABET.charAt(byte % SHORT_CHECKIN_ALPHABET.length);
    }
    if (!used[code]) return code;
  }

  throw new Error('Không tạo được mã check-in duy nhất. Vui lòng thử lại.');
}

function resolveRegistrationIdFromCheckInCode_(value, rows) {
  const shortCode = normalizeShortCheckInCode_(value);
  if (isShortCheckInCode_(shortCode)) {
    const matching = (rows || []).find(function (row) {
      return normalizeShortCheckInCode_(field_(row, 'checkInCode')) === shortCode;
    });
    const registrationId = clean_(field_(matching, 'registrationId'));
    if (!registrationId) throw new Error('Mã check-in không tồn tại.');
    return registrationId;
  }

  // Keep every previously issued signed QR/code valid.
  return verifyCheckInCode_(value);
}

function createCheckInCode_(registrationId) {
  const id = clean_(registrationId);
  const signature = Utilities.computeHmacSha256Signature(id, getCheckInSecret_());
  const encoded = Utilities.base64EncodeWebSafe(signature).replace(/=+$/g, '').slice(0, 22);
  return id + '.' + encoded;
}

function verifyCheckInCode_(value) {
  const code = clean_(value).replace(/^noburi-checkin:/i, '');
  const separatorIndex = code.lastIndexOf('.');
  if (separatorIndex <= 0) throw new Error('Mã check-in không hợp lệ.');
  const registrationId = code.slice(0, separatorIndex);
  const expected = createCheckInCode_(registrationId);
  if (!constantTimeEqual_(code, expected)) throw new Error('Mã check-in không hợp lệ.');
  return registrationId;
}

function getCheckInSecret_() {
  const properties = PropertiesService.getScriptProperties();
  let secret = properties.getProperty('CHECKIN_SIGNING_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty('CHECKIN_SIGNING_SECRET', secret);
  }
  return secret;
}

function constantTimeEqual_(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function getSpreadsheet_() {
  if (clean_(APP_BACKEND_CONFIG.spreadsheetId)) {
    return SpreadsheetApp.openById(APP_BACKEND_CONFIG.spreadsheetId);
  }
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Apps Script chưa được liên kết với Google Sheet.');
  return spreadsheet;
}

function getMeetupSheet_(spreadsheet) {
  const configuredId = Number(APP_BACKEND_CONFIG.meetupSheetId);
  if (Number.isInteger(configuredId) && configuredId >= 0) {
    const byId = spreadsheet.getSheets().find(function (sheet) {
      return sheet.getSheetId() === configuredId;
    });
    if (byId) return byId;
  }
  return spreadsheet.getSheetByName(APP_BACKEND_CONFIG.meetupSheetName);
}

function getOrCreateSheetWithHeaders_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);

  const existingColumnCount = Math.max(sheet.getLastColumn(), 1);
  const existingHeaders = sheet
    .getRange(1, 1, 1, existingColumnCount)
    .getValues()[0]
    .map(function (value) {
      return clean_(value);
    });

  if (existingHeaders.every(function (value) { return !value; })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const normalizedExisting = {};
    existingHeaders.forEach(function (header) {
      normalizedExisting[normalizeHeader_(header)] = true;
    });
    const missing = headers.filter(function (header) {
      return !normalizedExisting[normalizeHeader_(header)];
    });
    if (missing.length) {
      sheet
        .getRange(1, existingHeaders.length + 1, 1, missing.length)
        .setValues([missing]);
    }
  }

  sheet.setFrozenRows(1);
  return sheet;
}

function readTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], rows: [] };
  const headers = values[0].map(function (value) {
    return clean_(value);
  });
  const normalizedHeaders = headers.map(normalizeHeader_);
  const rows = values.slice(1).map(function (row) {
    const object = {};
    normalizedHeaders.forEach(function (header, index) {
      object[header] = row[index];
    });
    return object;
  });
  return { headers: headers, rows: rows };
}

function appendRecord_(sheet, record) {
  const headerCount = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, headerCount).getValues()[0];
  const normalizedRecord = {};
  Object.keys(record).forEach(function (key) {
    normalizedRecord[normalizeHeader_(key)] = record[key];
  });
  const values = headers.map(function (header) {
    const value = normalizedRecord[normalizeHeader_(header)];
    return value === undefined || value === null ? '' : value;
  });
  sheet.appendRow(values);
  return sheet.getLastRow();
}

function countConfirmedSeats_(rows, meetupId) {
  return rows.reduce(function (sum, row) {
    if (
      clean_(field_(row, 'meetupId')) !== clean_(meetupId) ||
      normalizeText_(field_(row, 'status') || 'confirmed') === 'cancelled'
    ) {
      return sum;
    }
    return sum + Math.max(
      1,
      Number(field_(row, 'totalSeats')) || 1 + (Number(field_(row, 'companions')) || 0)
    );
  }, 0);
}

function updateMeetupProgress_(sheet, rowNumber, status, currentPlayers) {
  sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'status')).setValue(status);
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'currentPlayers'))
    .setValue(currentPlayers);
  sheet.getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedAt')).setValue(new Date());
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'updatedBy'))
    .setValue('registration-backend');
}

function findHeaderColumn_(sheet, key) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(normalizeHeader_);
  const index = headers.indexOf(normalizeHeader_(key));
  return index >= 0 ? index + 1 : null;
}

function ensureHeaderColumn_(sheet, key) {
  const existing = findHeaderColumn_(sheet, key);
  if (existing) return existing;
  const column = Math.max(sheet.getLastColumn(), 0) + 1;
  sheet.getRange(1, column).setValue(key);
  return column;
}

function ensureTextColumn_(sheet, key) {
  const column = ensureHeaderColumn_(sheet, key);
  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(2, column, rowCount, 1).setNumberFormat('@');
  return column;
}

function notifyAdmin_(payload, seatsRequested, currentPlayers, capacity) {
  const email = clean_(APP_BACKEND_CONFIG.adminEmail);
  if (!email) return;
  const capacityText = capacity ? currentPlayers + '/' + capacity : String(currentPlayers);
  const subject = '[Noburi] Đăng ký ' + (payload.gameName || payload.gameId);
  const body = [
    'Game: ' + (payload.gameName || payload.gameId),
    'Leader: ' + (payload.leaderName || '(chưa nhập)'),
    'Meetup ID: ' + payload.meetupId,
    'Thời gian: ' + payload.startTime,
    'Phòng: ' + payload.room,
    'Tên: ' + payload.name,
    'Số điện thoại: ' + payload.phone,
    'Facebook: ' + (payload.facebook || '(không có)'),
    'Số người đi cùng: ' + payload.companions,
    'Số chỗ đăng ký lần này: ' + seatsRequested,
    'Tổng hiện tại: ' + capacityText,
  ].join('\n');
  try {
    MailApp.sendEmail(email, subject, body);
  } catch (error) {
    console.warn('Không thể gửi email admin:', error);
  }
}

function statusMessage_(status) {
  if (status === 'full') return 'Tụ game đã đủ người.';
  if (status === 'cancelled') return 'Tụ game đã hủy.';
  return 'Tụ game đã đóng đăng ký.';
}

function normalizeStatus_(value) {
  const text = normalizeText_(value);
  if (['active', 'open', 'dang nhan dang ky'].indexOf(text) >= 0) return 'active';
  if (['full', 'da du nguoi'].indexOf(text) >= 0) return 'full';
  if (['cancelled', 'canceled', 'da huy'].indexOf(text) >= 0) return 'cancelled';
  return 'closed';
}

function normalizePhoneRaw_(value) {
  return clean_(value).replace(/[\s().-]/g, '');
}

function normalizePhone_(value) {
  const normalized = normalizePhoneRaw_(value)
    .replace(/^\+84/, '0')
    .replace(/^84(?=[0-9]{9,10}$)/, '0');

  // A legacy numeric column may have stripped the leading zero from 093….
  return /^[1-9][0-9]{8}$/.test(normalized) ? '0' + normalized : normalized;
}

function parsePositiveInteger_(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseNonNegativeInteger_(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : '';
}

function dateValueOrNull_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (!clean_(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function field_(row, key) {
  return (row || {})[normalizeHeader_(key)];
}

function normalizeHeader_(value) {
  return normalizeText_(value).replace(/[\s_-]+/g, '');
}

function normalizeText_(value) {
  return clean_(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/_/g, ' ')
    .toLowerCase();
}

function displayValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone() || 'Asia/Bangkok',
      'dd/MM/yyyy HH:mm'
    );
  }
  return clean_(value);
}

function serializedDateValue_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return clean_(value);
}

function maskPhone_(value) {
  const phone = normalizePhoneRaw_(value);
  if (phone.length <= 5) return phone ? '•••••' : '';
  return phone.slice(0, 2) + '•••••' + phone.slice(-3);
}

function clean_(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}
