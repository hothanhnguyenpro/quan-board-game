const clean = (value) => String(value ?? '').trim();

export const createCheckInQrPayload = (checkInCode, adminBaseUrl) => {
  const code = clean(checkInCode);
  if (!code) return '';

  try {
    const url = new URL(clean(adminBaseUrl));
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('unsupported-protocol');
    }

    url.search = '';
    url.hash = '';
    url.searchParams.set('view', 'admin');
    // `c` and `sid` are reserved by Google Apps Script and make the Web App
    // return HTTP 400 before doGet is invoked.
    url.searchParams.set('checkin', code);
    return url.toString();
  } catch {
    // The short opaque form remains readable by the dashboard image scanner.
    return `noburi-checkin:${code}`;
  }
};
