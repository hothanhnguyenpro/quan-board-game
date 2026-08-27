const clean = (value) => String(value ?? '').trim();

export const createRequestToken = (prefix = 'request') => {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const postFormNoCors = async (url, payload, { signal } = {}) => {
  const endpoint = clean(url);

  if (!endpoint) {
    throw new Error('Chưa cấu hình địa chỉ Apps Script.');
  }

  const body = new URLSearchParams();

  Object.entries(payload || {}).forEach(([key, value]) => {
    body.set(key, String(value ?? ''));
  });

  await fetch(endpoint, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-store',
    body,
    signal,
  });
};

export const requestJsonp = (
  url,
  parameters,
  { timeoutMs = 12000, signal } = {}
) =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('JSONP chỉ dùng được trong trình duyệt.'));
      return;
    }

    const callbackName = `__noburi_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement('script');
    let settled = false;
    let timeoutId;
    let lateCleanupId;

    const removeCallbackLater = () => {
      // Apps Script đôi khi hoàn tất sau timeout. Giữ một callback no-op ngắn
      // để phản hồi muộn không tạo ReferenceError trong console của khách.
      globalThis[callbackName] = () => {};
      lateCleanupId = window.setTimeout(() => {
        try {
          delete globalThis[callbackName];
        } catch {
          globalThis[callbackName] = undefined;
        }
      }, 30000);
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', handleAbort);
      script.remove();
      removeCallbackLater();
    };

    const finish = (handler) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler();
    };

    const handleAbort = () => {
      finish(() => reject(new DOMException('Đã hủy yêu cầu.', 'AbortError')));
    };

    globalThis[callbackName] = (data) => {
      finish(() => resolve(data));
    };

    let endpoint;

    try {
      endpoint = new URL(clean(url));
    } catch {
      finish(() => reject(new Error('Địa chỉ Apps Script không hợp lệ.')));
      return;
    }

    Object.entries(parameters || {}).forEach(([key, value]) => {
      endpoint.searchParams.set(key, String(value ?? ''));
    });
    endpoint.searchParams.set('callback', callbackName);
    endpoint.searchParams.set('_', String(Date.now()));

    script.src = endpoint.toString();
    script.async = true;
    script.onerror = () => {
      finish(() => reject(new Error('Không tải được trạng thái Apps Script.')));
    };

    timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error('Yêu cầu trạng thái đã quá thời gian.')));
    }, timeoutMs);

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
    document.head.appendChild(script);

    // Keep the identifier referenced so aggressive optimizers cannot remove it
    // before the delayed cleanup callback has been scheduled.
    void lateCleanupId;
  });

const wait = (milliseconds, signal) =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, milliseconds);

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Đã hủy yêu cầu.', 'AbortError'));
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
  });

export const submitWithStatus = async ({
  url,
  payload,
  token = createRequestToken(),
  timeoutMs = 45000,
  signal,
  onState,
}) => {
  const endpoint = clean(url);

  if (!endpoint) {
    throw new Error('Chưa cấu hình Apps Script.');
  }

  const deadline = Date.now() + Math.max(5000, Number(timeoutMs) || 45000);
  let sawProcessing = false;

  const postPromise = postFormNoCors(
    endpoint,
    {
      ...payload,
      requestToken: token,
      submissionToken: payload?.submissionToken || token,
    },
    { signal }
  ).catch((error) => {
    if (error?.name === 'AbortError') throw error;
    // A no-cors POST can fail to expose its result. Status polling remains the
    // source of truth, so transient POST errors are handled by the deadline.
    return undefined;
  });

  await wait(700, signal);

  while (Date.now() < deadline) {
    try {
      const data = await requestJsonp(
        endpoint,
        { action: 'status', token },
        {
          timeoutMs: Math.min(12000, Math.max(1500, deadline - Date.now())),
          signal,
        }
      );

      const state = clean(data?.state).toLowerCase();
      onState?.(state, data);

      if (state === 'processing') sawProcessing = true;

      if (state === 'success' && data?.success === true) {
        await postPromise;
        return data;
      }

      if (state === 'error') {
        throw new Error(clean(data?.message) || 'Apps Script không thể xử lý yêu cầu.');
      }
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      if (clean(error?.message) && !/trạng thái|JSONP|quá thời gian/i.test(error.message)) {
        throw error;
      }
    }

    await wait(900, signal);
  }

  throw new Error(
    sawProcessing
      ? 'Apps Script đã nhận yêu cầu nhưng chưa hoàn tất. Vui lòng thử lại.'
      : 'Không thấy Apps Script nhận yêu cầu. Vui lòng kiểm tra kết nối và bản triển khai /exec.'
  );
};

