/**
 * Native leadgame alerts for support requests.
 *
 * Apps Script HTML runs inside a sandboxed iframe. Its timer, sound and
 * vibration cannot be relied on after the dashboard is backgrounded or the
 * phone is locked. Telegram is used only as the delivery channel; the Sheet
 * remains the source of truth and the dashboard remains the place to accept
 * and resolve requests.
 *
 * Secrets are stored in Script Properties, never in source code or Sheets.
 */

const LEADGAME_TELEGRAM_CONFIG = Object.freeze({
  tokenProperty: 'NOBURI_LEADGAME_TELEGRAM_BOT_TOKEN',
  chatsProperty: 'NOBURI_LEADGAME_TELEGRAM_CHAT_IDS',
  labelsProperty: 'NOBURI_LEADGAME_TELEGRAM_CHAT_LABELS',
  usernameProperty: 'NOBURI_LEADGAME_TELEGRAM_BOT_USERNAME',
  enabledProperty: 'NOBURI_LEADGAME_TELEGRAM_ENABLED',
  maximumRecipients: 8,
});

const LEADGAME_SUPPORT_LABELS = Object.freeze({
  rules: 'Hướng dẫn luật',
  missing_piece: 'Thiếu hoặc hỏng quân',
  change_game: 'Nhờ đổi game',
  order: 'Gọi thêm nước',
  other: 'Hỗ trợ khác',
});

/**
 * One-time setup from the spreadsheet menu.
 *
 * 1. Create a bot with @BotFather.
 * 2. On every leadgame phone, open the bot and press Start. A shared Telegram
 *    group with the bot also works and is easier for rotating shifts.
 * 3. Run this function and paste the BotFather token.
 */
function configureLeadgameTelegram() {
  adminAssertActiveSpreadsheetOwner_();
  const ui = SpreadsheetApp.getUi();
  const tokenPrompt = ui.prompt(
    'Kết nối Telegram cho leadgame',
    'Trước tiên, hãy mở bot trên Telegram và nhấn Start (hoặc gửi /start trong nhóm trực). Sau đó dán Bot Token do @BotFather cấp. Token chỉ được lưu trong Script Properties.',
    ui.ButtonSet.OK_CANCEL
  );

  if (tokenPrompt.getSelectedButton() !== ui.Button.OK) {
    return 'Đã hủy kết nối Telegram.';
  }

  const token = clean_(tokenPrompt.getResponseText());
  if (!/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(token)) {
    throw new Error('TELEGRAM_TOKEN_INVALID: Bot Token không đúng định dạng.');
  }

  const bot = telegramApiRequest_(token, 'getMe', {});
  const chats = telegramDiscoverChats_(token);

  if (!chats.length) {
    ui.alert(
      'Chưa thấy điện thoại leadgame',
      'Mở @' + clean_(bot.username) + ' trên Telegram, nhấn Start hoặc gửi /start trong nhóm trực, rồi chạy “Kết nối Telegram cho leadgame” lại.',
      ui.ButtonSet.OK
    );
    return 'Chưa tìm thấy chat Telegram đã chủ động liên hệ bot.';
  }

  let selectedChats = chats;
  if (chats.length > 1) {
    const choices = chats
      .map(function (chat, index) {
        return index + 1 + '. ' + chat.label + ' — ' + chat.id;
      })
      .join('\n');
    const selectionPrompt = ui.prompt(
      'Chọn nơi nhận cảnh báo',
      choices + '\n\nNhập số thứ tự. Có thể chọn nhiều nơi bằng dấu phẩy, ví dụ: 1,2.',
      ui.ButtonSet.OK_CANCEL
    );
    if (selectionPrompt.getSelectedButton() !== ui.Button.OK) {
      return 'Đã hủy kết nối Telegram.';
    }
    const selectedIndexes = clean_(selectionPrompt.getResponseText())
      .split(',')
      .map(function (value) {
        return Number(clean_(value)) - 1;
      })
      .filter(function (value, index, values) {
        return Number.isInteger(value) && value >= 0 && value < chats.length && values.indexOf(value) === index;
      });
    if (!selectedIndexes.length) {
      throw new Error('TELEGRAM_CHAT_SELECTION_INVALID: Chưa chọn nơi nhận hợp lệ.');
    }
    selectedChats = selectedIndexes.map(function (index) {
      return chats[index];
    });
  }

  selectedChats = selectedChats.slice(0, LEADGAME_TELEGRAM_CONFIG.maximumRecipients);
  PropertiesService.getScriptProperties().setProperties(
    {
      [LEADGAME_TELEGRAM_CONFIG.tokenProperty]: token,
      [LEADGAME_TELEGRAM_CONFIG.chatsProperty]: JSON.stringify(
        selectedChats.map(function (chat) {
          return chat.id;
        })
      ),
      [LEADGAME_TELEGRAM_CONFIG.labelsProperty]: JSON.stringify(
        selectedChats.map(function (chat) {
          return chat.label;
        })
      ),
      [LEADGAME_TELEGRAM_CONFIG.usernameProperty]: clean_(bot.username),
      [LEADGAME_TELEGRAM_CONFIG.enabledProperty]: 'true',
    },
    false
  );

  const delivery = sendLeadgameTelegramText_(
    '✅ Noburi đã kết nối cảnh báo leadgame. Từ bây giờ, yêu cầu hỗ trợ tại bàn sẽ được gửi vào đây ngay sau khi lưu vào Sheet.'
  );

  if (delivery.status !== 'sent') {
    throw new Error(
      'TELEGRAM_TEST_FAILED: Đã lưu cấu hình nhưng gửi thử chưa thành công. ' +
        (delivery.error || 'Kiểm tra quyền gửi tin của bot.')
    );
  }

  ui.alert(
    'Đã bật báo tức thời',
    'Đã gửi tin thử tới ' + selectedChats.length + ' nơi nhận. Hãy bật âm thanh và rung cho Telegram trên điện thoại leadgame.',
    ui.ButtonSet.OK
  );
  return 'Telegram đã sẵn sàng cho ' + selectedChats.length + ' nơi nhận.';
}

function testLeadgameTelegram() {
  adminAssertActiveSpreadsheetOwner_();
  const delivery = sendLeadgameTelegramText_(
    '🔔 Tin thử từ Noburi: cảnh báo gọi leadgame đang hoạt động. ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')
  );
  if (delivery.status !== 'sent') {
    throw new Error(
      'TELEGRAM_TEST_FAILED: ' +
        (delivery.error || 'Telegram chưa được cấu hình hoặc chưa gửi được tin.')
    );
  }
  SpreadsheetApp.getUi().alert(
    'Gửi thử thành công',
    'Kiểm tra điện thoại leadgame. Nếu có tin nhưng không rung, hãy bật âm thanh/rung cho Telegram trong cài đặt điện thoại.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return 'Đã gửi thử cảnh báo Telegram.';
}

function disableLeadgameTelegram() {
  adminAssertActiveSpreadsheetOwner_();
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    'Tắt cảnh báo Telegram?',
    'Yêu cầu của khách vẫn được lưu vào Sheet nhưng điện thoại leadgame sẽ không nhận báo tức thời.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return 'Đã giữ nguyên cảnh báo Telegram.';
  PropertiesService.getScriptProperties().setProperty(
    LEADGAME_TELEGRAM_CONFIG.enabledProperty,
    'false'
  );
  return 'Đã tắt cảnh báo Telegram.';
}

function getLeadgameTelegramStatus_() {
  const settings = readLeadgameTelegramSettings_();
  return {
    channel: 'telegram',
    configured: settings.enabled && Boolean(settings.token) && settings.chatIds.length > 0,
    recipientCount: settings.chatIds.length,
    botUsername: settings.botUsername,
    botUrl: settings.botUsername ? 'https://t.me/' + settings.botUsername : '',
  };
}

function notifyLeadgameSupportRequest_(request) {
  const label =
    LEADGAME_SUPPORT_LABELS[normalizeSupportCategory_(request.category)] ||
    'Cần hỗ trợ';
  const timestamp = Utilities.formatDate(
    dateValueOrNull_(request.createdAt) || new Date(),
    Session.getScriptTimeZone(),
    'dd/MM/yyyy HH:mm:ss'
  );
  let dashboardUrl = '';
  try {
    dashboardUrl = clean_(ScriptApp.getService().getUrl());
  } catch (_) {
    dashboardUrl = '';
  }
  if (dashboardUrl) dashboardUrl += '?view=admin';

  const lines = [
    '🆘 NOBURI — BÀN ' + sanitizeTableCode_(request.tableCode) + ' GỌI LEADGAME',
    '',
    'Cần: ' + label,
    clean_(request.gameName) ? 'Game: ' + clean_(request.gameName) : '',
    clean_(request.note) ? 'Khách nhắn: ' + clean_(request.note) : '',
    'Lúc: ' + timestamp,
    dashboardUrl ? 'Mở Dashboard: ' + dashboardUrl : '',
  ].filter(Boolean);

  return sendLeadgameTelegramText_(lines.join('\n'));
}

function updateSupportNotificationDelivery_(sheet, rowNumber, delivery) {
  const safeDelivery = delivery || {};
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'notificationChannel'))
    .setValue(clean_(safeDelivery.channel || 'telegram'));
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'notificationStatus'))
    .setValue(clean_(safeDelivery.status || 'failed'));
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'notificationAt'))
    .setValue(safeDelivery.sentAt || '');
  sheet
    .getRange(rowNumber, ensureHeaderColumn_(sheet, 'notificationError'))
    .setValue(clean_(safeDelivery.error).slice(0, 500));
}

function sendLeadgameTelegramText_(text) {
  const settings = readLeadgameTelegramSettings_();
  if (!settings.enabled || !settings.token || !settings.chatIds.length) {
    return {
      channel: 'telegram',
      status: 'not_configured',
      sentAt: '',
      error: 'Telegram chưa được kết nối.',
    };
  }

  let sentCount = 0;
  const errors = [];
  settings.chatIds.forEach(function (chatId) {
    try {
      telegramApiRequest_(settings.token, 'sendMessage', {
        chat_id: chatId,
        text: String(text || '').slice(0, 4096),
        disable_notification: false,
        link_preview_options: { is_disabled: true },
      });
      sentCount += 1;
    } catch (error) {
      errors.push(cleanTelegramError_(error));
    }
  });

  return {
    channel: 'telegram',
    status:
      sentCount === settings.chatIds.length
        ? 'sent'
        : sentCount > 0
          ? 'partial'
          : 'failed',
    sentAt: sentCount > 0 ? new Date() : '',
    error: errors.join(' | ').slice(0, 500),
  };
}

function readLeadgameTelegramSettings_() {
  const properties = PropertiesService.getScriptProperties();
  let chatIds = [];
  try {
    const parsed = JSON.parse(
      properties.getProperty(LEADGAME_TELEGRAM_CONFIG.chatsProperty) || '[]'
    );
    if (Array.isArray(parsed)) {
      chatIds = parsed
        .map(function (value) {
          return clean_(value);
        })
        .filter(Boolean)
        .slice(0, LEADGAME_TELEGRAM_CONFIG.maximumRecipients);
    }
  } catch (_) {
    chatIds = [];
  }
  return {
    enabled:
      properties.getProperty(LEADGAME_TELEGRAM_CONFIG.enabledProperty) === 'true',
    token: clean_(properties.getProperty(LEADGAME_TELEGRAM_CONFIG.tokenProperty)),
    chatIds: chatIds,
    botUsername: clean_(
      properties.getProperty(LEADGAME_TELEGRAM_CONFIG.usernameProperty)
    ),
  };
}

function telegramDiscoverChats_(token) {
  const updates = telegramApiRequest_(token, 'getUpdates', {
    limit: 100,
    timeout: 0,
    allowed_updates: ['message', 'channel_post', 'my_chat_member'],
  });
  const chatsById = {};
  (updates || []).forEach(function (update) {
    const message = update.message || update.channel_post || {};
    const chat = message.chat || (update.my_chat_member && update.my_chat_member.chat);
    if (!chat || chat.id === undefined || chat.id === null) return;
    const id = String(chat.id);
    const label = clean_(
      chat.title ||
        [chat.first_name, chat.last_name].filter(Boolean).join(' ') ||
        chat.username ||
        id
    );
    chatsById[id] = { id: id, label: label || id };
  });
  return Object.keys(chatsById)
    .map(function (id) {
      return chatsById[id];
    })
    .slice(-LEADGAME_TELEGRAM_CONFIG.maximumRecipients);
}

function telegramApiRequest_(token, method, payload) {
  const response = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + token + '/' + method,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload || {}),
      muteHttpExceptions: true,
    }
  );
  const statusCode = response.getResponseCode();
  let body = {};
  try {
    body = JSON.parse(response.getContentText() || '{}');
  } catch (_) {
    body = {};
  }
  if (statusCode < 200 || statusCode >= 300 || !body.ok) {
    throw new Error(
      'Telegram ' + statusCode + ': ' + clean_(body.description || 'không gửi được yêu cầu')
    );
  }
  return body.result;
}

function cleanTelegramError_(error) {
  const message = clean_(error && error.message ? error.message : error);
  return message.replace(/bot\d{5,15}:[A-Za-z0-9_-]+/g, 'bot[ẩn-token]').slice(0, 220);
}
