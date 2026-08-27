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
  // Leave empty when this script is bound to the same spreadsheet.
  spreadsheetId: '',
  meetupSheetId: 1475285450,
  meetupSheetName: 'Meetups',
  registrationSheetName: 'Registrations',
  tableSessionSheetName: 'TableSessions',
  adminEmail: '',
  roomOptions: ['Phòng 1', 'Phòng 2', 'Phòng 3'],
  statusOptions: ['active', 'full', 'closed', 'cancelled'],
  requestStatusTtlSeconds: 21600,
};

const REGISTRATION_HEADERS = [
  'timestamp',
  'meetupId',
  'gameId',
  'gameName',
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

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = clean_(params.action);
  const view = clean_(params.view);

  if (view === 'admin') {
    return HtmlService.createHtmlOutputFromFile('AdminDashboard')
      .setTitle('Noburi — Quản lý quán')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  }

  if (action === 'status') {
    return outputPayload_(readRequestStatus_(params.token), params.callback);
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
  return 'Đã thiết lập Meetups, Registrations và TableSessions.';
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
    'startTime',
    'requiredPlayers',
    'currentPlayers',
    'room',
    'status',
    'note',
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
  return 'Sheet Ghép tụ đã được thiết lập.';
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
  const checkInCode = createCheckInCode_(registrationId);
  const now = new Date();
  const record = {
    timestamp: now,
    meetupId: payload.meetupId,
    gameId: payload.gameId,
    gameName: payload.gameName,
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
  notifyAdmin_(payload, seatsRequested, updatedPlayers, capacity);

  return {
    message: 'Đăng ký thành công! Hãy giữ QR để check-in tại quán.',
    meetupId: payload.meetupId,
    registrationId: registrationId,
    currentPlayers: updatedPlayers,
    status: updatedStatus,
    checkInCode: checkInCode,
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
    roundMinutes: parseNonNegativeInteger_(params.roundMinutes),
    note: clean_(params.note).slice(0, 240),
    requestToken: clean_(params.requestToken || params.submissionToken),
  });
  SpreadsheetApp.flush();

  return {
    message: 'Đã cập nhật nhịp bàn. Cảm ơn bạn!',
    tableCode: tableCode,
    tableState: tableState,
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

function adminGetDashboard(sessionToken) {
  requireAdminSession_(sessionToken);
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
  const meetups = meetupSheet ? readTable_(meetupSheet).rows : [];
  const registrations = readTable_(registrationsSheet).rows;
  const tableSessions = readTable_(tableSheet).rows;
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
      gameName: totals.gameName || clean_(field_(row, 'gameId')),
      startTime: serializedDateValue_(field_(row, 'startTime')),
      room: clean_(field_(row, 'room')),
      note: clean_(field_(row, 'note')),
      status: normalizeStatus_(field_(row, 'status')),
      capacity: capacity,
      sheetCurrentPlayers: Number(field_(row, 'currentPlayers')) || 0,
      confirmedSeats: totals.confirmedSeats,
      checkedInSeats: totals.checkedInSeats,
      remainingSeats: capacity ? Math.max(0, capacity - totals.confirmedSeats) : null,
      groups: totals.groups,
    };
  });

  const recentRegistrations = registrations
    .slice(-120)
    .reverse()
    .map(function (row) {
      const registrationId = clean_(field_(row, 'registrationId'));
      return {
        registrationId: registrationId,
        meetupId: clean_(field_(row, 'meetupId')),
        gameName: clean_(field_(row, 'gameName')),
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

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    meetups: meetupSnapshot,
    registrations: recentRegistrations,
    tables: Object.keys(latestTables)
      .sort()
      .map(function (key) {
        return latestTables[key];
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

    let statusToWrite = safeStatus;
    if (safeStatus === 'active') {
      const registrationsSheet = getOrCreateSheetWithHeaders_(
        spreadsheet,
        APP_BACKEND_CONFIG.registrationSheetName,
        REGISTRATION_HEADERS
      );
      const registrations = readTable_(registrationsSheet).rows;
      const confirmed = countConfirmedSeats_(registrations, clean_(meetupId));
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

function adminCheckInRegistration(sessionToken, checkInCode, operationId) {
  requireAdminSession_(sessionToken);
  if (wasOperationProcessed_(operationId)) {
    return { success: true, ok: true, message: 'Lượt quét này đã được xử lý.' };
  }

  const registrationId = verifyCheckInCode_(checkInCode);
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

function wasOperationProcessed_(operationId) {
  const id = clean_(operationId);
  return id ? CacheService.getScriptCache().get('admin_op_' + id) === '1' : false;
}

function markOperationProcessed_(operationId) {
  const id = clean_(operationId);
  if (id) CacheService.getScriptCache().put('admin_op_' + id, '1', 21600);
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

function notifyAdmin_(payload, seatsRequested, currentPlayers, capacity) {
  const email = clean_(APP_BACKEND_CONFIG.adminEmail);
  if (!email) return;
  const capacityText = capacity ? currentPlayers + '/' + capacity : String(currentPlayers);
  const subject = '[Noburi] Đăng ký ' + (payload.gameName || payload.gameId);
  const body = [
    'Game: ' + (payload.gameName || payload.gameId),
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
  return normalizePhoneRaw_(value).replace(/^\+84/, '0').replace(/^84/, '0');
}

function parsePositiveInteger_(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseNonNegativeInteger_(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : '';
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
