import { cleanText, normalizeText, parsePlayerRange } from './gameUtils.js';

const DEFAULT_LIMIT = 3;
const MIN_PLAYER_COUNT = 1;
const MAX_PLAYER_COUNT = 30;
const NEAR_DURATION_GRACE_MINUTES = 15;

const FIT_PRIORITY = {
  best: 500,
  good: 400,
  flexible: 300,
  near: 200,
  unknown: 100,
  long: 0,
};

const FIT_LABELS = {
  best: 'Vừa thời lượng',
  good: 'Nhanh gọn',
  flexible: 'Linh hoạt thời gian',
  near: 'Có thể dài hơn',
  unknown: 'Chưa rõ thời lượng',
  long: 'Dài hơn mong muốn',
};

const DIFFICULTY_EASE_SCORES = {
  de: 10,
  'rat de': 10,
  easy: 10,
  'de vua': 8,
  vua: 6,
  medium: 6,
  'trung binh': 6,
  kho: 2,
  hard: 2,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toPositiveNumber = (value) => {
  const number = toFiniteNumber(value);
  return number !== null && number >= 0 ? number : null;
};

const normalizeDecimal = (value) => Number(String(value).replace(',', '.'));

const getUnitMultiplier = (value) => {
  const unit = normalizeText(value);
  return /(?:^|\s)(?:gio|tieng|g|h|hr|hrs|hour|hours)(?:\s|$)/.test(` ${unit} `)
    ? 60
    : 1;
};

const parseDurationPart = (value, fallbackMultiplier = 1) => {
  const text = normalizeText(value).replace(/,/g, '.');

  if (!text) {
    return null;
  }

  const explicitTokens = [...text.matchAll(
    /(\d+(?:\.\d+)?)\s*(gio|tieng|g|h|hrs?|hours?|phut|p|mins?|minutes?)/g
  )];

  if (explicitTokens.length) {
    const total = explicitTokens.reduce((sum, token) => {
      const amount = normalizeDecimal(token[1]);
      const multiplier = getUnitMultiplier(token[2]);
      return sum + amount * multiplier;
    }, 0);

    const lastToken = explicitTokens[explicitTokens.length - 1];
    const consumedUntil = (lastToken.index ?? 0) + lastToken[0].length;
    const trailingNumber = text
      .slice(consumedUntil)
      .match(/^\s*(\d+(?:\.\d+)?)\s*$/);

    // Common shorthand such as "1h30" means 1 hour 30 minutes.
    if (
      trailingNumber &&
      getUnitMultiplier(lastToken[2]) === 60 &&
      Number(trailingNumber[1]) < 60
    ) {
      return Math.round(total + Number(trailingNumber[1]));
    }

    return Math.round(total);
  }

  const numberMatch = text.match(/\d+(?:\.\d+)?/);
  if (!numberMatch) {
    return null;
  }

  const number = normalizeDecimal(numberMatch[0]);
  return Number.isFinite(number) ? Math.round(number * fallbackMultiplier) : null;
};

/**
 * Parse a customer-facing duration into minutes.
 *
 * Supported examples include: "30 phút", "30-60 phút", "1-2 giờ",
 * "1 giờ 30 phút", "1h30", "30 phút - 1 giờ", "<15 phút" and
 * "120+ phút". The returned object deliberately keeps open-ended durations
 * as Infinity so callers can distinguish them from a fixed 120-minute game.
 */
export const parseDurationRangeMinutes = (value) => {
  const source = cleanText(value);
  let text = normalizeText(source)
    .replace(/,/g, '.')
    .replace(/\b(?:den|toi|to)\b/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return { min: null, max: null };
  }

  const isLessThan = /^\s*</.test(text);
  const isOpenEnded = /\d+(?:\.\d+)?\s*\+/.test(text);
  const fallbackMultiplier = getUnitMultiplier(text);

  text = text.replace(/^\s*[<>~≈]+\s*/, '').trim();

  const rangeMatch = text.match(
    /^(.*?)\s+-\s+(.*)$/
  ) || text.match(
    /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(gio|tieng|g|h|hrs?|hours?|phut|p|mins?|minutes?)\b/
  );

  if (rangeMatch) {
    const firstPart = rangeMatch[1];
    const secondPart = rangeMatch[2];
    const sharedUnit = rangeMatch[3] || text;
    const sharedMultiplier = getUnitMultiplier(sharedUnit);
    const first = parseDurationPart(firstPart, sharedMultiplier);
    const second = parseDurationPart(secondPart, sharedMultiplier);

    if (first !== null && second !== null) {
      return {
        min: Math.min(first, second),
        max: Math.max(first, second),
      };
    }
  }

  const duration = parseDurationPart(text, fallbackMultiplier);

  if (duration === null) {
    return { min: null, max: null };
  }

  if (isLessThan) {
    return {
      min: 0,
      max: Math.max(0, duration - 1),
    };
  }

  if (isOpenEnded) {
    return {
      min: duration,
      max: Infinity,
    };
  }

  return { min: duration, max: duration };
};

const normalizePlayerCount = (value) => {
  const number = toFiniteNumber(value);

  if (number === null) {
    return null;
  }

  return clamp(Math.round(number), MIN_PLAYER_COUNT, MAX_PLAYER_COUNT);
};

const normalizeRequestedDuration = (preferences) => {
  const directValue = toPositiveNumber(
    preferences?.durationMinutes ?? preferences?.minutes
  );

  if (directValue !== null) {
    return Math.round(directValue);
  }

  const parsed = parseDurationRangeMinutes(
    preferences?.duration ?? preferences?.time
  );

  if (Number.isFinite(parsed.max)) {
    return parsed.max;
  }

  return Number.isFinite(parsed.min) ? parsed.min : null;
};

const getGamePlayerRange = (game) => {
  const parsed = parsePlayerRange(game?.players);
  const minPlayers = toPositiveNumber(game?.minPlayers) ?? parsed.min;
  const rawMax = game?.maxPlayers;
  const maxPlayers = rawMax === Infinity
    ? Infinity
    : toPositiveNumber(rawMax) ?? parsed.max;

  return {
    min: minPlayers,
    max: maxPlayers,
  };
};

const getGameDurationRange = (game) => {
  // Prefer the raw customer-facing value because the existing normalizer may
  // have parsed "1-2 giờ" as 1-2 without converting hours to minutes.
  const parsed = parseDurationRangeMinutes(game?.time);

  if (parsed.min !== null && parsed.max !== null) {
    return parsed;
  }

  const minTime = toPositiveNumber(game?.minTime);
  const rawMax = game?.maxTime;
  const maxTime = rawMax === Infinity
    ? Infinity
    : toPositiveNumber(rawMax);

  if (minTime === null && maxTime === null) {
    return { min: null, max: null };
  }

  return {
    min: minTime ?? maxTime,
    max: maxTime ?? minTime,
  };
};

const formatMinutes = (minutes) => {
  if (!Number.isFinite(minutes)) {
    return 'không cố định';
  }

  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} giờ`;
  }

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours} giờ ${remainder} phút`;
  }

  return `${minutes} phút`;
};

export const formatDurationRangeMinutes = ({ min, max } = {}) => {
  if (min === null || min === undefined || max === null || max === undefined) {
    return '';
  }

  if (max === Infinity) {
    return `từ ${formatMinutes(min)}`;
  }

  if (min === 0) {
    return `dưới ${formatMinutes(max + 1)}`;
  }

  if (min === max) {
    return formatMinutes(max);
  }

  return `${formatMinutes(min)}–${formatMinutes(max)}`;
};

const getPlayerFitScore = (range, playerCount) => {
  if (range.max === Infinity) {
    return 30;
  }

  const span = Math.max(0, range.max - range.min);
  if (span === 0) {
    return 40;
  }

  const distanceToEdge = Math.min(
    playerCount - range.min,
    range.max - playerCount
  );
  const centeredness = clamp(distanceToEdge / Math.max(1, span / 2), 0, 1);

  return Math.round(30 + centeredness * 10);
};

const classifyDurationFit = (range, requestedDuration) => {
  if (
    requestedDuration === null ||
    range.min === null ||
    range.max === null
  ) {
    return {
      fit: 'unknown',
      durationScore: 8,
      warning: 'Chưa có đủ dữ liệu thời lượng để ước tính chính xác.',
    };
  }

  const lower = range.min;
  const upper = range.max;

  if (upper === Infinity) {
    if (lower <= requestedDuration) {
      return {
        fit: 'flexible',
        durationScore: 22,
        warning: 'Ván chơi có thể kéo dài tùy nhịp của bàn.',
      };
    }

    return {
      fit: 'long',
      durationScore: 0,
      warning: `Thường cần ít nhất ${formatMinutes(lower)}.`,
    };
  }

  if (upper <= requestedDuration) {
    const gap = requestedDuration - upper;
    const closeThreshold = Math.max(10, Math.round(requestedDuration * 0.3));

    if (gap <= closeThreshold) {
      return {
        fit: 'best',
        durationScore: Math.round(35 - (gap / closeThreshold) * 5),
        warning: '',
      };
    }

    return {
      fit: 'good',
      durationScore: Math.max(
        20,
        Math.round(30 - (gap / Math.max(1, requestedDuration)) * 10)
      ),
      warning: '',
    };
  }

  if (lower <= requestedDuration) {
    return {
      fit: 'flexible',
      durationScore: 22,
      warning: `Một số ván có thể dài hơn mốc ${formatMinutes(requestedDuration)}.`,
    };
  }

  const overBy = lower - requestedDuration;
  if (overBy <= NEAR_DURATION_GRACE_MINUTES) {
    return {
      fit: 'near',
      durationScore: Math.max(10, 18 - overBy),
      warning: `Có thể dài hơn khoảng ${formatMinutes(overBy)}.`,
    };
  }

  return {
    fit: 'long',
    durationScore: 0,
    warning: `Thường dài hơn ít nhất ${formatMinutes(overBy)}.`,
  };
};

const getGuideCompletenessScore = (game) => {
  const hasWinCondition = Boolean(cleanText(game?.winCondition));
  const hasTurnSteps = Array.isArray(game?.turnSteps)
    ? game.turnSteps.length > 0
    : Boolean(cleanText(game?.turnSteps));
  const hasScoring = Array.isArray(game?.scoring)
    ? game.scoring.length > 0
    : Boolean(cleanText(game?.scoring));

  return Number(hasWinCondition) * 4 + Number(hasTurnSteps) * 4 + Number(hasScoring) * 2;
};

const getDifficultyScore = (difficulty) => {
  const key = normalizeText(difficulty);
  if (!key) return 0;

  if (Object.hasOwn(DIFFICULTY_EASE_SCORES, key)) {
    return DIFFICULTY_EASE_SCORES[key];
  }

  if (key.includes('de') || key.includes('easy')) return 9;
  if (key.includes('vua') || key.includes('medium')) return 6;
  if (key.includes('kho') || key.includes('hard')) return 2;
  return 4;
};

const getDurationBucket = (range) => {
  const representative = Number.isFinite(range.max) ? range.max : range.min;

  if (!Number.isFinite(representative)) return 'unknown';
  if (representative <= 30) return 'quick';
  if (representative <= 60) return 'medium';
  if (representative <= 90) return 'long';
  return 'epic';
};

const createReasons = ({
  game,
  playerCount,
  durationRange,
  difficultyScore,
  guideScore,
}) => {
  const reasons = [`Hợp ${playerCount} người`];
  const durationLabel = formatDurationRangeMinutes(durationRange);

  if (durationLabel) {
    reasons.push(`Một ván khoảng ${durationLabel}`);
  }

  if (difficultyScore >= 8) {
    reasons.push('Dễ bắt đầu');
  } else if (guideScore >= 8) {
    reasons.push('Có hướng dẫn nhanh');
  } else if (cleanText(game?.category)) {
    reasons.push(cleanText(game.category));
  }

  if (game?.featured && reasons.length < 3) {
    reasons.push('Game nổi bật tại quán');
  }

  return reasons.slice(0, 3);
};

const compareCandidates = (left, right) => {
  if (right.rankScore !== left.rankScore) {
    return right.rankScore - left.rankScore;
  }

  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (Number(Boolean(right.game?.featured)) !== Number(Boolean(left.game?.featured))) {
    return Number(Boolean(right.game?.featured)) - Number(Boolean(left.game?.featured));
  }

  const nameComparison = normalizeText(left.game?.name).localeCompare(
    normalizeText(right.game?.name),
    'vi'
  );

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return cleanText(left.game?.id).localeCompare(cleanText(right.game?.id), 'vi');
};

const selectDiverseCandidates = (candidates, limit) => {
  const selected = [];
  const remaining = [...candidates];

  while (selected.length < limit && remaining.length) {
    const rescored = remaining.map((candidate) => {
      const sameCategoryCount = selected.filter(
        (item) => item.categoryKey && item.categoryKey === candidate.categoryKey
      ).length;
      const sameDurationCount = selected.filter(
        (item) => item.durationBucket === candidate.durationBucket
      ).length;
      const diversityPenalty = sameCategoryCount * 7 + sameDurationCount * 4;

      return {
        ...candidate,
        rankScore: candidate.rankScore - diversityPenalty,
      };
    });

    rescored.sort(compareCandidates);
    const winner = rescored[0];
    selected.push(winner);

    const winnerIndex = remaining.findIndex(
      (candidate) => candidate.sourceIndex === winner.sourceIndex
    );
    remaining.splice(winnerIndex, 1);
  }

  return selected.map((candidate, index) => ({
    game: candidate.game,
    rank: index + 1,
    score: candidate.score,
    fit: candidate.fit,
    fitLabel: candidate.fitLabel,
    reasons: candidate.reasons,
    warning: candidate.warning,
    durationRange: candidate.durationRange,
    durationLabel: candidate.durationLabel,
    playerRange: candidate.playerRange,
  }));
};

/**
 * Return up to `limit` deterministic recommendations without mutating `games`.
 *
 * `preferences` accepts `{ players, durationMinutes }`. For compatibility with
 * form values it also accepts `minutes`, `duration` or `time`.
 */
export const recommendGames = (
  games,
  preferences = {},
  { limit = DEFAULT_LIMIT } = {}
) => {
  if (!Array.isArray(games) || !games.length) {
    return [];
  }

  const playerCount = normalizePlayerCount(preferences?.players);
  const requestedDuration = normalizeRequestedDuration(preferences);
  const safeLimit = clamp(Math.round(toFiniteNumber(limit) ?? DEFAULT_LIMIT), 1, 12);

  if (playerCount === null) {
    return [];
  }

  const candidates = games.flatMap((game, sourceIndex) => {
    if (!game || game.available === false) {
      return [];
    }

    const playerRange = getGamePlayerRange(game);
    const supportsPlayerCount =
      playerRange.min !== null &&
      playerRange.max !== null &&
      playerCount >= playerRange.min &&
      playerCount <= playerRange.max;

    if (!supportsPlayerCount) {
      return [];
    }

    const durationRange = getGameDurationRange(game);
    const durationFit = classifyDurationFit(durationRange, requestedDuration);
    const playerScore = getPlayerFitScore(playerRange, playerCount);
    const difficultyScore = getDifficultyScore(game?.difficulty);
    const guideScore = getGuideCompletenessScore(game);
    const featuredScore = game?.featured ? 5 : 0;
    const score =
      playerScore +
      durationFit.durationScore +
      difficultyScore +
      guideScore +
      featuredScore;
    const durationLabel = formatDurationRangeMinutes(durationRange);

    return [{
      sourceIndex,
      game,
      score,
      rankScore: score + FIT_PRIORITY[durationFit.fit],
      fit: durationFit.fit,
      fitLabel: FIT_LABELS[durationFit.fit],
      warning: durationFit.warning,
      reasons: createReasons({
        game,
        playerCount,
        durationRange,
        difficultyScore,
        guideScore,
      }),
      durationRange,
      durationLabel,
      playerRange,
      categoryKey: normalizeText(game?.category),
      durationBucket: getDurationBucket(durationRange),
    }];
  });

  return selectDiverseCandidates(candidates, safeLimit);
};

export const GAME_RECOMMENDER_DEFAULTS = Object.freeze({
  players: 4,
  durationMinutes: 60,
});
