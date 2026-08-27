const getBasePath = () => {
  const configuredBase = String(import.meta.env.BASE_URL || '/');
  return configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;
};

const waitForWindowLoad = () => {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.addEventListener('load', resolve, { once: true });
  });
};

/**
 * Registers the production service worker without forcing a page refresh.
 * Calling this function more than once is safe: the browser reuses the same
 * registration for an unchanged URL and scope.
 */
export const registerServiceWorker = async ({ onRegistered, onError } = {}) => {
  if (
    !import.meta.env.PROD ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }

  await waitForWindowLoad();

  const basePath = getBasePath();

  try {
    const registration = await navigator.serviceWorker.register(
      `${basePath}sw.js`,
      {
        scope: basePath,
        updateViaCache: 'none',
      }
    );

    onRegistered?.(registration);
    return registration;
  } catch (error) {
    onError?.(error);

    if (!onError) {
      console.error('[PWA] Không thể đăng ký chế độ ngoại tuyến:', error);
    }

    return null;
  }
};

export default registerServiceWorker;
