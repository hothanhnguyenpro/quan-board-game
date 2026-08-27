import Papa from 'papaparse';
import { GOOGLE_SHEETS_CSV_URL } from '../config.js';
import {
  cleanText,
  normalizeText,
  parsePlayerRange,
  parseTimeRange,
} from './gameUtils.js';

const FALLBACK_GAMES = [
  {
    id: 'fallback-1',
    name: 'Mèo Nổ',
    alias: 'Exploding Kittens',
    image: '',
    players: '2-5',
    minPlayers: 2,
    maxPlayers: 5,
    time: '<15 phút',
    minTime: 0,
    maxTime: 14,
    edgeColor: '#8e3b32',
    boxHeight: '165px',
    boxThickness: '58px',
    difficulty: 'Dễ',
    category: 'Party',
    description: 'Một game bài nhanh, vui và dễ bắt đầu.',
    winCondition: 'Tránh Mèo Nổ và là người sống sót cuối cùng.',
    turnSteps: [
      'Rút một lá bài.',
      'Chơi các lá bài hành động nếu muốn.',
      'Cố gắng tránh Mèo Nổ.',
    ],
    scoring: [],
    tricks: ['Đừng vội dùng mọi lá bài tốt ngay từ đầu.'],
    featured: false,
    available: true,
  },
  {
    id: 'fallback-2',
    name: 'Splendor',
    alias: '',
    image: '',
    players: '2-4',
    minPlayers: 2,
    maxPlayers: 4,
    time: '30-60 phút',
    minTime: 30,
    maxTime: 60,
    edgeColor: '#4b587c',
    boxHeight: '190px',
    boxThickness: '62px',
    difficulty: 'Dễ',
    category: 'Chiến thuật',
    description: 'Thu thập đá quý và phát triển đế chế buôn bán.',
    winCondition: 'Đạt số điểm cần thiết trước đối thủ.',
    turnSteps: [
      'Lấy token hoặc mua thẻ.',
      'Sử dụng các bonus từ thẻ đã sở hữu.',
      'Theo dõi điểm và điều kiện kết thúc.',
    ],
    scoring: ['Mỗi thẻ cho số điểm được ghi trên thẻ.'],
    tricks: ['Đừng chỉ tập trung vào một màu đá quý.'],
    featured: true,
    available: true,
  },
];

const GAME_CACHE_KEY = 'noburi:game-library:v2';
const INFINITY_MARKER = '__NOBURI_INFINITY__';

const saveGameSnapshot = (games) => {
  if (typeof window === 'undefined' || !Array.isArray(games) || !games.length) {
    return;
  }

  try {
    const data = JSON.stringify(
      {
        savedAt: Date.now(),
        games,
      },
      (_key, value) => (value === Infinity ? INFINITY_MARKER : value)
    );
    window.localStorage.setItem(GAME_CACHE_KEY, data);
  } catch (error) {
    console.warn('[dataFetcher] Không thể lưu snapshot offline:', error);
  }
};

const readGameSnapshot = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(GAME_CACHE_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw, (_key, value) =>
      value === INFINITY_MARKER ? Infinity : value
    );

    if (!Array.isArray(snapshot?.games) || !snapshot.games.length) {
      return null;
    }

    return snapshot;
  } catch (error) {
    console.warn('[dataFetcher] Snapshot offline không hợp lệ:', error);
    return null;
  }
};

const splitList = (value) => {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  const text = cleanText(value);

  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n|\||;/)
    .map(cleanText)
    .filter(Boolean);
};

const normalizeBoolean = (value, fallback = false) => {
  const text = normalizeText(value);

  if (!text) {
    return fallback;
  }

  if (['true', '1', 'yes', 'y', 'co', 'x'].includes(text)) {
    return true;
  }

  if (['false', '0', 'no', 'n', 'khong'].includes(text)) {
    return false;
  }

  return fallback;
};

const normalizeDimension = (value, fallback) => {
  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  const number = Number.parseFloat(text);

  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }

  return `${number}px`;
};

const normalizeColor = (value, fallback = '#5a4635') => {
  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  const safeColor = /^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(text);
  return safeColor ? text : fallback;
};

const getDirectImageUrl = (url) => {
  const value = cleanText(url);

  if (!value) {
    return '';
  }

  const fileMatch = value.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
  const idMatch = value.match(/[?&]id=([^&#]+)/i);
  const driveId = fileMatch?.[1] || idMatch?.[1];

  if (driveId) {
    return `https://drive.google.com/uc?export=view&id=${driveId}`;
  }

  return value;
};

const createFieldReader = (rawGame) => {
  const normalizedFields = Object.fromEntries(
    Object.entries(rawGame || {}).map(([key, value]) => [
      cleanText(key).replace(/^\uFEFF/, '').toLowerCase(),
      value,
    ])
  );

  return (...keys) => {
    for (const key of keys) {
      const value = normalizedFields[String(key).toLowerCase()];
      if (cleanText(value)) {
        return value;
      }
    }
    return '';
  };
};

const normalizeGame = (rawGame, index) => {
  const get = createFieldReader(rawGame);
  const name = cleanText(get('name'));
  const players = cleanText(get('players'));
  const time = cleanText(get('time'));
  const playerRange = parsePlayerRange(players);
  const timeRange = parseTimeRange(time);

  return {
    id: cleanText(get('id')) || `game-${index + 1}`,
    name,
    alias: cleanText(get('alias', 'altname', 'altName')),
    image: getDirectImageUrl(
      get('image', 'thumbnail', 'cover', 'imageurl', 'imageUrl', 'img')
    ),
    coverColor: cleanText(get('covercolor', 'coverColor')),
    players,
    minPlayers: playerRange.min,
    maxPlayers: playerRange.max,
    time,
    minTime: timeRange.min,
    maxTime: timeRange.max,
    edgeColor: normalizeColor(get('edgecolor', 'edgeColor')),
    boxHeight: normalizeDimension(get('boxheight', 'boxHeight'), '175px'),
    boxThickness: normalizeDimension(
      get('boxthickness', 'boxThickness'),
      '58px'
    ),
    difficulty: cleanText(get('difficulty')),
    category: cleanText(get('category')),
    description: cleanText(get('description')),
    winCondition:
      cleanText(get('wincondition', 'winCondition', 'rule1')) ||
      'Chưa có thông tin cách thắng.',
    turnSteps: splitList(get('turnsteps', 'turnSteps', 'rule2')),
    scoring: splitList(get('scoring')),
    tricks: splitList(get('tricks')),
    featured: normalizeBoolean(get('featured'), false),
    available: normalizeBoolean(get('available'), true),
  };
};

const parseCsv = (csvText) => {
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    transformHeader: (header) => cleanText(header).replace(/^\uFEFF/, ''),
  });

  if (results.errors?.length) {
    console.warn('[dataFetcher] CSV warnings:', results.errors);
  }

  const seenIds = new Set();

  return (results.data || [])
    .map(normalizeGame)
    .filter((game) => game.name && game.available)
    .filter((game) => {
      if (seenIds.has(game.id)) {
        console.warn(`[dataFetcher] Bỏ qua game trùng id: ${game.id}`);
        return false;
      }

      seenIds.add(game.id);
      return true;
    });
};

const fetchCsv = async (url, signal) => {
  const response = await fetch(url, {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Google Sheet trả về HTTP ${response.status}`);
  }

  return response.text();
};

export const fetchGameData = async ({ signal, onWarning } = {}) => {
  if (!cleanText(GOOGLE_SHEETS_CSV_URL)) {
    return readGameSnapshot()?.games || FALLBACK_GAMES;
  }

  try {
    const csvText = await fetchCsv(GOOGLE_SHEETS_CSV_URL, signal);
    const games = parseCsv(csvText);

    if (!games.length) {
      throw new Error('Google Sheet không có game hợp lệ.');
    }

    saveGameSnapshot(games);
    return games;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }

    console.error('[dataFetcher] Không thể tải Google Sheet:', error);
    const snapshot = readGameSnapshot();

    if (snapshot) {
      onWarning?.(
        'Mạng đang yếu. Ứng dụng dùng bản tủ game đã lưu để bạn vẫn xem được Cheat Sheet.'
      );
      return snapshot.games;
    }

    onWarning?.('Không thể đọc Google Sheet chính. Ứng dụng đang dùng dữ liệu dự phòng.');
    return FALLBACK_GAMES;
  }
};
