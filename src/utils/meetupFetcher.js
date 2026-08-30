import Papa from 'papaparse';

import {
  APP_CONFIG,
  GOOGLE_SHEETS_MEETUP_CSV_URL,
} from '../config.js';
import { normalizeText } from './gameUtils.js';

const clean = (value) => String(value ?? '').trim();

const normalizeHeader = (value) =>
  normalizeText(value)
    .replace(/^\ufeff/, '')
    .replace(/[\s_-]+/g, '');

const createFieldReader = (row) => {
  const fields = Object.fromEntries(
    Object.entries(row || {}).map(([key, value]) => [normalizeHeader(key), value])
  );

  return (...keys) => {
    for (const key of keys) {
      const value = fields[normalizeHeader(key)];
      if (clean(value)) return value;
    }
    return '';
  };
};

export const normalizeMeetupStatus = (value) => {
  const status = normalizeText(value).replace(/\s+/g, ' ');

  const aliases = {
    active: ['active', 'open', 'dang nhan dang ky', 'nhan dang ky'],
    full: ['full', 'da du nguoi', 'du nguoi'],
    closed: ['closed', 'da dong', 'dong'],
    cancelled: ['cancelled', 'canceled', 'da huy', 'huy'],
  };

  for (const [normalized, terms] of Object.entries(aliases)) {
    if (terms.includes(status)) return normalized;
  }

  // Unknown values are intentionally conservative: do not allow registration.
  return status ? 'closed' : 'active';
};

const parseOptionalInteger = (value) => {
  const text = clean(value);
  if (!text) return null;

  const number = Number(text);
  return Number.isInteger(number) && number >= 0 ? number : null;
};

export const normalizeMeetup = (row, index = 0) => {
  const get = createFieldReader(row);

  return {
    id: clean(get('id')) || `meetup-${index + 1}`,
    gameId: clean(get('gameId', 'game_id')),
    gameName: clean(get('gameName', 'game_name', 'name', 'tenGame')),
    leaderName: clean(
      get(
        'leaderName',
        'leader_name',
        'leader',
        'host',
        'meetupLeader',
        'tenLeader',
        'truongNhom'
      )
    ),
    startTime: clean(get('startTime', 'start_time', 'datetime', 'dateTime')),
    requiredPlayers: parseOptionalInteger(
      get('requiredPlayers', 'required_players', 'playersNeeded', 'capacity')
    ),
    currentPlayers: parseOptionalInteger(
      get('currentPlayers', 'registeredPlayers', 'current_players')
    ),
    room: clean(get('room', 'table', 'area')),
    status: normalizeMeetupStatus(get('status')),
    note: clean(get('note', 'notes')),
  };
};

export const parseMeetupCsv = (csvText) => {
  const results = Papa.parse(String(csvText ?? ''), {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    transformHeader: (header) => clean(header).replace(/^\ufeff/, ''),
  });

  if (results.errors?.length) {
    console.warn('[meetupFetcher] CSV warnings:', results.errors);
  }

  const seenIds = new Set();

  return (results.data || [])
    .map(normalizeMeetup)
    .filter((meetup) => meetup.gameId && meetup.startTime)
    .filter((meetup) => {
      if (seenIds.has(meetup.id)) {
        console.warn(`[meetupFetcher] Bỏ qua meetup trùng id: ${meetup.id}`);
        return false;
      }
      seenIds.add(meetup.id);
      return true;
    });
};

const looksLikeGoogleLoginPage = (contentType, text) =>
  contentType.includes('text/html') ||
  /<html[\s>]/i.test(text) ||
  /accounts\.google\.com|ServiceLogin/i.test(text);

export const fetchMeetupData = async ({ signal } = {}) => {
  const url = clean(
    APP_CONFIG?.meetup?.sheetUrl || GOOGLE_SHEETS_MEETUP_CSV_URL
  );

  if (!url) {
    return [];
  }

  const response = await fetch(url, {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Không thể tải Sheet 2: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const csvText = await response.text();

  if (looksLikeGoogleLoginPage(contentType, csvText)) {
    throw new Error('Google Sheet 2 chưa được công khai dưới dạng CSV.');
  }

  return parseMeetupCsv(csvText);
};
