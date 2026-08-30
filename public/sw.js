/*
 * Noburi PWA service worker.
 *
 * Cache policy is intentionally conservative:
 * - app shell and same-origin static build assets can be cached;
 * - images are cached only after the browser requests them;
 * - live data, identity-bearing URLs and every non-GET request always bypass
 *   Cache Storage.
 */

const CACHE_PREFIX = 'noburi-pwa-';
const CACHE_VERSION = 'v3';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}images-${CACHE_VERSION}`;
const CURRENT_CACHES = new Set([SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE]);

const SCOPE_URL = new URL(self.registration.scope);
const ROOT_URL = new URL('./', SCOPE_URL).href;
const INDEX_URL = new URL('index.html', SCOPE_URL).href;
const MAX_IMAGE_ENTRIES = 80;
const MAX_RUNTIME_ENTRIES = 40;
const NAVIGATION_TIMEOUT_MS = 3000;

const CORE_URLS = [
  ROOT_URL,
  INDEX_URL,
  new URL('manifest.webmanifest', SCOPE_URL).href,
  new URL('pwa-icon.svg', SCOPE_URL).href,
  new URL('logo.png', SCOPE_URL).href,
  new URL('favicon.svg', SCOPE_URL).href,
];

const STATIC_DESTINATIONS = new Set([
  'font',
  'manifest',
  'script',
  'style',
  'worker',
]);

const SENSITIVE_URL_TERMS = [
  'token',
  'callback',
  'status',
  'checkin',
  'check-in',
  'ticket',
  'admin',
];

const isHttpUrl = (url) => url.protocol === 'http:' || url.protocol === 'https:';

const isWithinScope = (url) =>
  url.origin === SCOPE_URL.origin && url.href.startsWith(SCOPE_URL.href);

const isAppsScriptHost = (hostname) => {
  const host = hostname.toLowerCase();

  return (
    host === 'script.google.com' ||
    host.endsWith('.script.google.com') ||
    host === 'script.googleusercontent.com' ||
    host.endsWith('.script.googleusercontent.com')
  );
};

const isGoogleSheetOrCsv = (url) => {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const isGoogleDocsHost =
    host === 'docs.google.com' ||
    host.endsWith('.docs.google.com') ||
    host === 'docs.googleusercontent.com' ||
    host.endsWith('.docs.googleusercontent.com');

  return (
    (isGoogleDocsHost && path.includes('/spreadsheets/')) ||
    String(url.searchParams.get('output') || '').toLowerCase() === 'csv'
  );
};

const isSensitiveUrl = (url) => {
  if (isAppsScriptHost(url.hostname) || isGoogleSheetOrCsv(url)) {
    return true;
  }

  let searchableUrl = `${url.pathname}${url.search}`.toLowerCase();

  try {
    searchableUrl = decodeURIComponent(searchableUrl);
  } catch {
    // A malformed escape sequence is safest left undecoded.
  }

  return SENSITIVE_URL_TERMS.some((term) => searchableUrl.includes(term));
};

const canCacheShellResponse = (response) =>
  Boolean(response && response.ok && response.type !== 'opaque');

const canCacheImageResponse = (response) =>
  Boolean(response && (response.ok || response.type === 'opaque'));

const discoverStaticAssets = (markup) => {
  const urls = new Set();
  const attributePattern = /(?:src|href)=["']([^"'<>]+)["']/gi;
  let match = attributePattern.exec(markup);

  while (match) {
    try {
      const url = new URL(match[1], ROOT_URL);
      const isStaticAsset =
        url.pathname.includes('/assets/') ||
        /\.(?:css|js|mjs|woff2?|ttf|svg|png|jpe?g|webp|avif|ico)$/i.test(
          url.pathname
        );

      if (
        isHttpUrl(url) &&
        isWithinScope(url) &&
        isStaticAsset &&
        !isSensitiveUrl(url) &&
        !url.pathname.endsWith('/sw.js')
      ) {
        urls.add(url.href);
      }
    } catch {
      // Ignore malformed or non-URL attributes in the generated HTML.
    }

    match = attributePattern.exec(markup);
  }

  return [...urls];
};

const fetchAndCacheShellUrl = async (cache, url) => {
  try {
    const response = await fetch(new Request(url, { cache: 'reload' }));

    if (!canCacheShellResponse(response)) {
      return '';
    }

    const contentType = response.headers.get('content-type') || '';
    const markup = contentType.includes('text/html')
      ? await response.clone().text()
      : '';

    await cache.put(url, response);
    return markup;
  } catch {
    return '';
  }
};

const warmAppShell = async () => {
  const cache = await caches.open(SHELL_CACHE);
  let generatedMarkup = '';

  for (const url of CORE_URLS) {
    const markup = await fetchAndCacheShellUrl(cache, url);
    if (markup) {
      generatedMarkup = markup;
    }
  }

  const assetUrls = discoverStaticAssets(generatedMarkup);

  await Promise.all(
    assetUrls.map((url) => fetchAndCacheShellUrl(cache, url))
  );
};

const trimCache = async (cache, maximumEntries) => {
  const keys = await cache.keys();
  const overflow = keys.length - maximumEntries;

  if (overflow <= 0) {
    return;
  }

  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
};

const fetchAndCacheImage = async (request) => {
  const response = await fetch(request);

  if (canCacheImageResponse(response)) {
    try {
      const cache = await caches.open(IMAGE_CACHE);
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_IMAGE_ENTRIES);
    } catch {
      // Quota, opaque-response and private-mode failures must not break images.
    }
  }

  return response;
};

const respondWithVisitedImage = (event) => {
  const networkPromise = fetchAndCacheImage(event.request);

  event.waitUntil(networkPromise.then(() => undefined, () => undefined));

  return caches.open(IMAGE_CACHE).then(async (cache) => {
    const cachedResponse = await cache.match(event.request);
    return cachedResponse || networkPromise;
  });
};

const cacheFirstStaticAsset = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (canCacheShellResponse(response)) {
    try {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_RUNTIME_ENTRIES);
    } catch {
      // A cache failure should never prevent a usable network response.
    }
  }

  return response;
};

const fetchAndRefreshNavigation = async (request) => {
  const response = await fetch(request);

  if (canCacheShellResponse(response)) {
    try {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(ROOT_URL, response.clone());
    } catch {
      // Continue with the network document when storage is unavailable.
    }
  }

  return response;
};

const getOfflineDocument = async () => {
  const cache = await caches.open(SHELL_CACHE);

  return (
    (await cache.match(ROOT_URL)) ||
    (await cache.match(INDEX_URL)) ||
    new Response(
      '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Noburi đang ngoại tuyến</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0c0e;color:#f5f5f4;font:16px system-ui"><main style="max-width:28rem;padding:2rem;text-align:center"><h1>Đang ngoại tuyến</h1><p>Hãy kết nối mạng một lần để chuẩn bị tủ game dùng khi Wi-Fi yếu.</p></main></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  );
};

const respondWithNavigation = (event) => {
  const networkPromise = fetchAndRefreshNavigation(event.request);

  event.waitUntil(networkPromise.then(() => undefined, () => undefined));

  return getOfflineDocument().then(async (cachedDocument) => {
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve(cachedDocument), NAVIGATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([networkPromise, timeoutPromise]);
    } catch {
      return cachedDocument;
    } finally {
      clearTimeout(timeoutId);
    }
  });
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    warmAppShell()
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.has(cacheName)) {
              return caches.delete(cacheName);
            }

            return false;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Mutations and live transactions are always handled by the browser/network.
  if (request.method !== 'GET') {
    return;
  }

  let url;

  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (
    !isHttpUrl(url) ||
    isSensitiveUrl(url) ||
    url.pathname.endsWith('/sw.js')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    if (isWithinScope(url)) {
      event.respondWith(respondWithNavigation(event));
    }
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(respondWithVisitedImage(event));
    return;
  }

  if (
    isWithinScope(url) &&
    (STATIC_DESTINATIONS.has(request.destination) ||
      url.pathname.includes('/assets/'))
  ) {
    event.respondWith(cacheFirstStaticAsset(request));
  }
});
