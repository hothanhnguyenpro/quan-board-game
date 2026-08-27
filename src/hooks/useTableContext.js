import { useMemo } from 'react';

const STORAGE_KEY = 'noburi:table-code';

const sanitizeTableCode = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);

const readTableCode = () => {
  if (typeof window === 'undefined') return '';

  const fromUrl = sanitizeTableCode(
    new URLSearchParams(window.location.search).get('table')
  );

  if (fromUrl) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, fromUrl);
    } catch {
      // Storage can be disabled; the URL value still works for this render.
    }
    return fromUrl;
  }

  try {
    return sanitizeTableCode(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return '';
  }
};

export const useTableContext = () =>
  useMemo(
    () => ({
      tableCode: readTableCode(),
    }),
    []
  );

