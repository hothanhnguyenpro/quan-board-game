const UNLIMITED_PLAYER_TERMS = [
  'khong gioi han',
  'khong han che',
  'unlimited',
];

export const cleanText = (value) => String(value ?? '').trim();

export const normalizeText = (value) =>
  cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const parseFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const parsePlayerRange = (value) => {
  const text = normalizeText(value);

  if (!text) {
    return { min: null, max: null };
  }

  if (UNLIMITED_PLAYER_TERMS.some((term) => text.includes(term))) {
    return { min: 1, max: Infinity };
  }

  const numbers = text.match(/\d+/g);

  if (!numbers?.length) {
    return { min: null, max: null };
  }

  const first = parseFiniteNumber(numbers[0]);
  const second = parseFiniteNumber(numbers[1] ?? numbers[0]);

  if (first === null || second === null) {
    return { min: null, max: null };
  }

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
};

export const parseTimeRange = (value) => {
  const text = normalizeText(value);

  if (!text) {
    return { min: null, max: null };
  }

  const numbers = text.match(/\d+/g);

  if (!numbers?.length) {
    return { min: null, max: null };
  }

  const first = parseFiniteNumber(numbers[0]);

  if (first === null) {
    return { min: null, max: null };
  }

  if (text.startsWith('<')) {
    return {
      min: 0,
      max: Math.max(0, first - 1),
    };
  }

  const second = parseFiniteNumber(numbers[1] ?? numbers[0]);

  if (second === null) {
    return { min: null, max: null };
  }

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
};

const rangesOverlap = (range, min, max) =>
  range.min !== null &&
  range.max !== null &&
  range.min <= max &&
  range.max >= min;

export const matchesPlayerFilter = (players, selectedFilter) => {
  const filter = normalizeText(selectedFilter);

  if (!filter) {
    return true;
  }

  const range = parsePlayerRange(players);

  if (range.min === null || range.max === null) {
    return false;
  }

  if (filter === '2') {
    return range.min <= 2 && range.max >= 2;
  }

  if (filter === '3-4') {
    return rangesOverlap(range, 3, 4);
  }

  if (filter === 'nhom dong') {
    return range.max >= 5;
  }

  return false;
};

export const matchesTimeFilter = (time, selectedFilter) => {
  const filter = normalizeText(selectedFilter);

  if (!filter) {
    return true;
  }

  const range = parseTimeRange(time);

  if (range.min === null || range.max === null) {
    return false;
  }

  if (filter === '<15 phut') {
    return range.max < 15;
  }

  if (filter === '30-60 phut') {
    return rangesOverlap(range, 30, 60);
  }

  if (filter === '45-90 phut') {
    return rangesOverlap(range, 45, 90);
  }

  return false;
};

export const matchesGameSearch = (game, query) => {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return true;
  }

  const name = normalizeText(game?.name);
  const alias = normalizeText(game?.alias);

  return (
    name.startsWith(normalizedQuery) ||
    alias.startsWith(normalizedQuery)
  );
};

export const filterGames = (
  games,
  { query = '', time = '', players = '' } = {}
) =>
  games.filter(
    (game) =>
      matchesGameSearch(game, query) &&
      matchesTimeFilter(game?.time, time) &&
      matchesPlayerFilter(game?.players, players)
  );
