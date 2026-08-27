const clean = (value) => String(value ?? '').trim();

const makeLocalDate = (
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0
) => {
  const date = new Date(year, month - 1, day, hour, minute, second, 0);

  // Guard against JavaScript silently rolling invalid dates forward, e.g.
  // 31/02 -> March.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }

  return date;
};

const parseDayMonthYear = (match) => {
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const seconds = Number(match[6] || 0);

  // Vietnamese sheets normally emit DD/MM/YYYY. If the second segment cannot
  // be a month but the first one can, accept the common US MM/DD/YYYY export as
  // a defensive fallback.
  const isClearlyMonthFirst = first <= 12 && second > 12;
  const day = isClearlyMonthFirst ? second : first;
  const month = isClearlyMonthFirst ? first : second;

  return makeLocalDate(year, month, day, hour, minute, seconds);
};

/**
 * Parse common Google Sheet date-time formats as local browser time.
 * This avoids accidental UTC shifts for cafe schedules.
 */
export const parseLocalDate = (value) => {
  const text = clean(value);

  if (!text) {
    return null;
  }

  // YYYY-MM-DD HH:mm[:ss] or YYYY-MM-DDTHH:mm[:ss]
  let match = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/
  );

  if (match) {
    return makeLocalDate(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      Number(match[4] || 0),
      Number(match[5] || 0),
      Number(match[6] || 0)
    );
  }

  // DD/MM/YYYY HH:mm[:ss], DD-MM-YYYY..., and defensively MM/DD/YYYY.
  match = text.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/
  );

  if (match) {
    return parseDayMonthYear(match);
  }

  // ISO strings with explicit timezone are safe to delegate to Date.
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const getCurrentWeekRange = (now = new Date()) => {
  const start = new Date(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;

  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
};

export const isDateInCurrentWeek = (date, now = new Date()) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }

  const { start, end } = getCurrentWeekRange(now);
  return date >= start && date < end;
};

export const formatMeetupDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return {
      date: 'Thời gian chưa rõ',
      time: '',
      full: 'Thời gian chưa rõ',
    };
  }

  const dateText = date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });

  const timeText = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    date: dateText,
    time: timeText,
    full: `${dateText} · ${timeText}`,
  };
};
