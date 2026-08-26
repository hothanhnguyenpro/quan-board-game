import Papa from 'papaparse';
import { GOOGLE_SHEETS_CSV_URL } from '../config';

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
    tricks: [
      'Đừng vội dùng mọi lá bài tốt ngay từ đầu.',
    ],
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
    scoring: [
      'Mỗi thẻ cho số điểm được ghi trên thẻ.',
    ],
    tricks: [
      'Đừng chỉ tập trung vào một màu đá quý.',
    ],
    featured: true,
    available: true,
  },
];

const clean = (value) => String(value ?? '').trim();

const normalizeText = (value) =>
  clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const splitList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(clean)
      .filter(Boolean);
  }

  const text = clean(value);

  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n|\|/)
    .map(clean)
    .filter(Boolean);
};

const parsePlayerRange = (value) => {
  const text = normalizeText(value)
    .replace(/[–—]/g, '-')
    .replace(/\s+den\s+/g, '-');

  if (!text) {
    return {
      min: null,
      max: null,
    };
  }

  if (
    text.includes('khong gioi han') ||
    text.includes('unlimited')
  ) {
    return {
      min: 0,
      max: Infinity,
    };
  }

  const numbers = text.match(/\d+/g);

  if (!numbers?.length) {
    return {
      min: null,
      max: null,
    };
  }

  const first = Number(numbers[0]);

  if (!Number.isFinite(first)) {
    return {
      min: null,
      max: null,
    };
  }

  const second =
    numbers.length > 1
      ? Number(numbers[1])
      : first;

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
};

const parseTimeRange = (value) => {
  const text = normalizeText(value)
    .replace(/[–—]/g, '-')
    .replace(/\s+den\s+/g, '-');

  if (!text) {
    return {
      min: null,
      max: null,
    };
  }

  const numbers = text.match(/\d+/g);

  if (!numbers?.length) {
    return {
      min: null,
      max: null,
    };
  }

  const first = Number(numbers[0]);

  if (!Number.isFinite(first)) {
    return {
      min: null,
      max: null,
    };
  }

  if (text.startsWith('<')) {
    return {
      min: 0,
      max: Math.max(0, first - 1),
    };
  }

  const second =
    numbers.length > 1
      ? Number(numbers[1])
      : first;

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
};

const getDirectImageUrl = (url) => {
  const value = clean(url);

  if (!value) {
    return '';
  }

  const driveMatch = value.match(
    /drive\.google\.com\/file\/d\/([^/]+)/
  );

  if (driveMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }

  return value;
};

const normalizeBoolean = (
  value,
  fallback = false
) => {
  const text = normalizeText(value);

  if (!text) {
    return fallback;
  }

  if (
    ['true', '1', 'yes', 'y', 'co', 'x'].includes(text)
  ) {
    return true;
  }

  if (
    ['false', '0', 'no', 'n', 'khong'].includes(text)
  ) {
    return false;
  }

  return fallback;
};

const normalizeGame = (rawGame, index) => {
  const players = clean(rawGame.players);
  const time = clean(rawGame.time);

  const playerRange = parsePlayerRange(players);
  const timeRange = parseTimeRange(time);

  const image = getDirectImageUrl(
    rawGame.image ||
      rawGame.thumbnail ||
      rawGame.cover ||
      rawGame.imageUrl ||
      rawGame.img
  );

  const name =
    clean(rawGame.name) ||
    `Game ${index + 1}`;

  return {
    id:
      clean(rawGame.id) ||
      `game-${index + 1}`,

    name,

    alias:
      clean(rawGame.alias) ||
      clean(rawGame.altName),

    image,

    coverColor:
      clean(rawGame.coverColor),

    players,

    minPlayers:
      playerRange.min,

    maxPlayers:
      playerRange.max,

    time,

    minTime:
      timeRange.min,

    maxTime:
      timeRange.max,

    edgeColor:
      clean(rawGame.edgeColor) ||
      '#5a4635',

    boxHeight:
      clean(rawGame.boxHeight) ||
      '175px',

    boxThickness:
      clean(rawGame.boxThickness) ||
      '58px',

    difficulty:
      clean(rawGame.difficulty) ||
      'Dễ',

    category:
      clean(rawGame.category),

    description:
      clean(rawGame.description),

    winCondition:
      clean(
        rawGame.winCondition ||
          rawGame.rule1
      ) ||
      'Chưa có thông tin cách thắng.',

    turnSteps:
      splitList(
        rawGame.turnSteps ||
          rawGame.rule2
      ),

    scoring:
      splitList(
        rawGame.scoring
      ),

    tricks:
      splitList(
        rawGame.tricks
      ),

    featured:
      normalizeBoolean(
        rawGame.featured,
        false
      ),

    available:
      normalizeBoolean(
        rawGame.available,
        true
      ),
  };
};

const fetchCsv = async (url) => {
  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Google Sheet trả về HTTP ${response.status}`
    );
  }

  return response.text();
};

const parseCsv = (csvText) =>
  new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,

      complete: (results) => {
        if (results.errors?.length) {
          console.warn(
            '[dataFetcher] CSV warnings:',
            results.errors
          );
        }

        const games = (results.data || [])
          .map(normalizeGame)
          .filter(
            (game) =>
              game.name &&
              game.available
          );

        resolve(games);
      },

      error: reject,
    });
  });

export const fetchGameData = async () => {
  if (!GOOGLE_SHEETS_CSV_URL) {
    return FALLBACK_GAMES;
  }

  try {
    const csvText = await fetchCsv(
      GOOGLE_SHEETS_CSV_URL
    );

    const games = await parseCsv(
      csvText
    );

    if (!games.length) {
      throw new Error(
        'Google Sheet không có game hợp lệ.'
      );
    }

    return games;
  } catch (error) {
    console.error(
      '[dataFetcher] Không thể tải Google Sheet:',
      error
    );

    return FALLBACK_GAMES;
  }
};