import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LogOut,
  RefreshCw,
  UsersRound,
  X,
} from 'lucide-react';

import { useModalBehavior } from '../hooks/useModalBehavior.js';
import {
  createRequestToken,
  requestJsonp,
  submitWithStatus,
} from '../utils/appsScriptClient.js';

const STORAGE_KEY = 'noburi:waitlist:v1';
const TEMP_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const clean = (value) => String(value ?? '').trim();

const createTemporaryQueueCode = () => {
  const values = new Uint32Array(4);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    values.forEach((_, index) => {
      values[index] = Math.floor(Math.random() * TEMP_CODE_ALPHABET.length);
    });
  }

  return `T-${Array.from(values, (value) =>
    TEMP_CODE_ALPHABET[value % TEMP_CODE_ALPHABET.length]
  ).join('')}`;
};

const readStoredWaitlist = () => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed?.waitlistId && parsed?.claimToken ? parsed : null;
  } catch {
    return null;
  }
};

const saveStoredWaitlist = (value) => {
  try {
    if (value?.waitlistId && value?.claimToken) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // The live view still works when private browsing disables storage.
  }
};

const normalizeWaitlist = (payload, claimToken = '') => ({
  waitlistId: clean(payload?.waitlistId),
  claimToken: clean(payload?.claimToken || claimToken),
  queueCode: clean(payload?.queueCode),
  waitlistStatus: clean(payload?.waitlistStatus || 'waiting'),
  position: Math.max(0, Number(payload?.position) || 0),
  estimateMin: Math.max(0, Number(payload?.estimateMin) || 0),
  estimateMax: Math.max(0, Number(payload?.estimateMax) || 0),
  groupSize: Math.max(1, Number(payload?.groupSize) || 1),
  displayName: clean(payload?.displayName),
  message: clean(payload?.message),
  updatedAt: clean(payload?.updatedAt),
});

const WaitlistStatus = ({ entry, refreshing }) => {
  const status = entry?.waitlistStatus || 'waiting';
  const ready = status === 'notified';
  const completed = status === 'seated';
  const ended = status === 'cancelled';

  return (
    <div className={`waitlist-ticket ${status}`}>
      <div className="waitlist-ticket-head">
        <span className="waitlist-code">{entry.queueCode || 'ĐANG TẠO MÃ'}</span>
        <span className="waitlist-live">
          {refreshing ? <LoaderCircle className="spin-icon" size={14} /> : <Clock3 size={14} />}
          {ready ? 'MỜI ĐẾN QUẦY' : completed ? 'ĐÃ XẾP BÀN' : ended ? 'ĐÃ KẾT THÚC' : 'ĐANG CHỜ'}
        </span>
      </div>

      {status === 'waiting' && (
        <div className="waitlist-position">
          <strong>{entry.position || '–'}</strong>
          <span>vị trí hiện tại</span>
        </div>
      )}

      {(ready || completed) && (
        <div className="waitlist-ready-mark" aria-hidden="true">
          <CheckCircle2 size={44} />
        </div>
      )}

      <p className="waitlist-message">
        {entry.message ||
          (ready
            ? 'Quán đang chuẩn bị bàn cho bạn. Hãy đến quầy nhé!'
            : 'Quán sẽ cập nhật khi có bàn phù hợp.')}
      </p>

      {status === 'waiting' && entry.estimateMax > 0 && (
        <p className="waitlist-estimate">
          Ước tính rộng: {entry.estimateMin}–{entry.estimateMax} phút. Đây không phải giờ hẹn cố định.
        </p>
      )}
    </div>
  );
};

const WaitlistSheet = ({
  isOpen,
  onClose,
  submitUrl,
  pollIntervalMs = 15000,
}) => {
  const reduceMotion = useReducedMotion();
  const controllerRef = useRef(null);
  const submittingRef = useRef(false);
  const [form, setForm] = useState({ name: '', phone: '', groupSize: '2' });
  const [entry, setEntry] = useState(readStoredWaitlist);
  const [temporaryCode, setTemporaryCode] = useState('');
  const [state, setState] = useState({ type: '', message: '' });
  const [refreshing, setRefreshing] = useState(false);

  useModalBehavior({ isOpen, onEscape: onClose });

  const applyEntry = useCallback((payload, claimToken = '') => {
    const next = normalizeWaitlist(payload, claimToken);
    if (!next.waitlistId || !next.claimToken) return;
    setEntry(next);
    saveStoredWaitlist(next);
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!entry?.waitlistId || !entry?.claimToken || !clean(submitUrl)) return;
    setRefreshing(true);
    try {
      const result = await requestJsonp(
        submitUrl,
        {
          action: 'waitlistStatus',
          waitlistId: entry.waitlistId,
          token: entry.claimToken,
        },
        { timeoutMs: 12000 }
      );
      if (result?.success === false) {
        throw new Error(clean(result?.message) || 'Không đọc được hàng chờ.');
      }
      applyEntry(result, entry.claimToken);
      setState({ type: '', message: '' });
    } catch (error) {
      setState({
        type: 'error',
        message: clean(error?.message) || 'Chưa cập nhật được. Hệ thống sẽ thử lại.',
      });
    } finally {
      setRefreshing(false);
    }
  }, [applyEntry, entry, submitUrl]);

  useEffect(() => {
    if (!isOpen || !entry?.waitlistId) return undefined;
    const initialRefresh = window.setTimeout(refreshStatus, 0);
    if (!['waiting', 'notified'].includes(entry.waitlistStatus)) {
      return () => window.clearTimeout(initialRefresh);
    }
    const timer = window.setInterval(refreshStatus, Math.max(10000, pollIntervalMs));
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
    };
  }, [entry?.waitlistId, entry?.waitlistStatus, isOpen, pollIntervalMs, refreshStatus]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current || state.type === 'loading') return;
    const name = clean(form.name);
    const phone = clean(form.phone);
    const groupSize = Number(form.groupSize);

    if (name.length < 2) {
      setState({ type: 'error', message: 'Vui lòng nhập tên hoặc biệt danh.' });
      return;
    }
    if (!/^(?:\+84|84|0)[0-9]{8,10}$/.test(phone.replace(/[\s().-]/g, ''))) {
      setState({ type: 'error', message: 'Số điện thoại chưa đúng định dạng.' });
      return;
    }
    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 30) {
      setState({ type: 'error', message: 'Số khách phải từ 1 đến 30.' });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const claimToken = createRequestToken('waitlist');
    submittingRef.current = true;
    setTemporaryCode(createTemporaryQueueCode());
    setState({ type: 'loading', message: 'Đang thêm nhóm vào hàng chờ…' });

    try {
      const result = await submitWithStatus({
        url: submitUrl,
        token: claimToken,
        timeoutMs: 45000,
        signal: controller.signal,
        payload: {
          action: 'joinWaitlist',
          name,
          phone,
          groupSize,
        },
      });
      applyEntry(result, claimToken);
      setTemporaryCode('');
      setState({ type: 'success', message: 'Đã vào hàng chờ.' });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setTemporaryCode('');
      setState({
        type: 'error',
        message: clean(error?.message) || 'Chưa thể vào hàng chờ.',
      });
    } finally {
      submittingRef.current = false;
    }
  };

  const leaveWaitlist = async () => {
    if (!entry?.waitlistId || state.type === 'loading') return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ type: 'loading', message: 'Đang rời hàng chờ…' });
    try {
      const result = await submitWithStatus({
        url: submitUrl,
        token: createRequestToken('waitlist-leave'),
        timeoutMs: 45000,
        signal: controller.signal,
        payload: {
          action: 'leaveWaitlist',
          waitlistId: entry.waitlistId,
          claimToken: entry.claimToken,
        },
      });
      applyEntry({ ...entry, ...result }, entry.claimToken);
      setState({ type: 'success', message: 'Đã rời hàng chờ.' });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setState({ type: 'error', message: clean(error?.message) || 'Chưa thể rời hàng chờ.' });
    }
  };

  const startNew = () => {
    saveStoredWaitlist(null);
    setEntry(null);
    setState({ type: '', message: '' });
  };

  if (typeof document === 'undefined') return null;
  const entryActive = entry && ['waiting', 'notified'].includes(entry.waitlistStatus);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="filter-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="filter-backdrop" aria-label="Đóng hàng chờ" onClick={onClose} />
          <motion.section
            className="filter-sheet operational-sheet waitlist-sheet"
            initial={reduceMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduceMotion ? { y: 0 } : { y: '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="waitlist-sheet-title"
          >
            <div className="filter-handle" aria-hidden="true" />
            <header className="filter-header">
              <div>
                <span className="eyebrow">KHI QUÁN HẾT BÀN</span>
                <h2 id="waitlist-sheet-title">Hàng chờ nhận bàn</h2>
              </div>
              <button type="button" className="filter-close" onClick={onClose} aria-label="Đóng hàng chờ">
                <X size={20} />
              </button>
            </header>

            <div className="operational-body">
              {entry ? (
                <>
                  <WaitlistStatus entry={entry} refreshing={refreshing} />
                  {state.message && <p className={`operational-message ${state.type}`} role="status">{state.message}</p>}
                  <div className="operational-actions">
                    {entryActive && (
                      <button type="button" className="operational-secondary" onClick={refreshStatus} disabled={refreshing || state.type === 'loading'}>
                        <RefreshCw size={16} /> Cập nhật
                      </button>
                    )}
                    {entryActive ? (
                      <button type="button" className="operational-danger" onClick={leaveWaitlist} disabled={state.type === 'loading'}>
                        <LogOut size={16} /> Rời hàng chờ
                      </button>
                    ) : (
                      <button type="button" className="operational-primary" onClick={startNew}>Tạo lượt chờ mới</button>
                    )}
                  </div>
                </>
              ) : (
                <form className="operational-form" onSubmit={handleSubmit} noValidate>
                  <div className="waitlist-intro">
                    <UsersRound size={20} aria-hidden="true" />
                    <p>Quán chỉ báo một khoảng chờ rộng và vị trí tương đối, không thúc khách đang chơi rời bàn.</p>
                  </div>
                  <label>
                    <span>Tên hoặc biệt danh</span>
                    <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoComplete="name" maxLength={80} placeholder="Ví dụ: Nguyên" required />
                  </label>
                  <label>
                    <span>Số điện thoại</span>
                    <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="09xxxxxxxx" required />
                  </label>
                  <label>
                    <span>Nhóm có bao nhiêu người?</span>
                    <input value={form.groupSize} onChange={(event) => setForm((current) => ({ ...current, groupSize: event.target.value }))} type="number" inputMode="numeric" min="1" max="30" required />
                  </label>
                  {state.type === 'loading' && temporaryCode && (
                    <div className="waitlist-temporary-ticket" role="status">
                      <span>Mã tạm thời trên máy</span>
                      <strong>{temporaryCode}</strong>
                      <small>Mã chính thức sẽ tự thay thế sau khi Sheet xác nhận đã lưu.</small>
                    </div>
                  )}
                  {state.message && <p className={`operational-message ${state.type}`} role="status">{state.message}</p>}
                  <button type="submit" className="operational-primary" disabled={state.type === 'loading'}>
                    {state.type === 'loading' ? <LoaderCircle className="spin-icon" size={17} /> : <Clock3 size={17} />}
                    Vào hàng chờ
                  </button>
                </form>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default WaitlistSheet;
