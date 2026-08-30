import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Gamepad2,
  GlassWater,
  LoaderCircle,
  MessageCircleMore,
  PackageX,
  X,
} from 'lucide-react';

import { useTableContext } from '../hooks/useTableContext.js';
import { useModalBehavior } from '../hooks/useModalBehavior.js';
import { createRequestToken, submitWithStatus } from '../utils/appsScriptClient.js';

const clean = (value) => String(value ?? '').trim();
const sanitizeTableCode = (value) =>
  clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);

const SUPPORT_OPTIONS = [
  { key: 'rules', label: 'Hướng dẫn luật', hint: 'Nhờ Game Master hướng dẫn hoặc giải thích tình huống.', icon: BookOpenCheck },
  { key: 'missing_piece', label: 'Thiếu hoặc hỏng quân', hint: 'Báo thẻ, token, xúc xắc hoặc linh kiện có vấn đề.', icon: PackageX },
  { key: 'change_game', label: 'Nhờ đổi game', hint: 'Cần gợi ý hoặc hỗ trợ lấy một game khác.', icon: Gamepad2 },
  { key: 'order', label: 'Gọi thêm nước', hint: 'Báo nhân viên ghé qua bàn.', icon: GlassWater },
  { key: 'other', label: 'Hỗ trợ khác', hint: 'Mô tả ngắn điều bàn bạn đang cần.', icon: MessageCircleMore },
];

const TableSupport = ({ enabled = true, submitUrl, game }) => {
  const { tableCode: detectedTableCode } = useTableContext();
  const reduceMotion = useReducedMotion();
  const controllerRef = useRef(null);
  const [isOpen, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [tableInput, setTableInput] = useState(detectedTableCode);
  const [state, setState] = useState({ type: '', message: '' });

  useModalBehavior({ isOpen, onEscape: () => setOpen(false) });

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    []
  );

  if (!enabled || typeof document === 'undefined') return null;

  const selectedOption = SUPPORT_OPTIONS.find((option) => option.key === category);
  const tableCode = sanitizeTableCode(tableInput || detectedTableCode);

  const openSheet = () => {
    setState({ type: '', message: '' });
    setOpen(true);
  };

  const submitRequest = async () => {
    if (!tableCode || !category || state.type === 'loading') {
      if (!tableCode) {
        setState({ type: 'error', message: 'Hãy nhập mã bàn, ví dụ B03.' });
        return;
      }
      if (!category) setState({ type: 'error', message: 'Hãy chọn điều bàn bạn đang cần.' });
      return;
    }

    try {
      window.sessionStorage.setItem('noburi:table-code', tableCode);
    } catch {
      // The request still works when session storage is unavailable.
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ type: 'loading', message: 'Đang gửi đến nhân viên…' });

    try {
      const result = await submitWithStatus({
        url: submitUrl,
        token: createRequestToken('support'),
        timeoutMs: 40000,
        signal: controller.signal,
        payload: {
          action: 'supportRequest',
          tableCode,
          category,
          gameId: game?.id || '',
          gameName: game?.name || '',
          note: clean(note),
        },
      });
      setState({
        type: 'success',
        message: clean(result?.message) || `Nhân viên đã nhận yêu cầu của bàn ${tableCode}.`,
      });
      globalThis.navigator?.vibrate?.(90);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setState({
        type: 'error',
        message: clean(error?.message) || 'Chưa gửi được yêu cầu. Vui lòng gọi nhân viên trực tiếp.',
      });
    }
  };

  const resetRequest = () => {
    setCategory('');
    setNote('');
    setState({ type: '', message: '' });
  };

  return createPortal(
    <>
      <button type="button" className="table-support-fab" onClick={openSheet} aria-label={tableCode ? `Gọi leadgame tại bàn ${tableCode}` : 'Gọi leadgame'}>
        <CircleHelp size={21} aria-hidden="true" />
        <span>Gọi leadgame</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div className="filter-overlay" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="filter-backdrop" aria-label="Đóng hỗ trợ tại bàn" onClick={() => setOpen(false)} />
            <motion.section
              className="filter-sheet operational-sheet table-support-sheet"
              initial={reduceMotion ? false : { y: '100%' }}
              animate={{ y: 0 }}
              exit={reduceMotion ? { y: 0 } : { y: '100%' }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="table-support-title"
            >
              <div className="filter-handle" aria-hidden="true" />
              <header className="filter-header">
                <div>
                  <span className="eyebrow">{tableCode ? `BÀN ${tableCode}` : 'GỌI LEADGAME'}</span>
                  <h2 id="table-support-title">Bạn cần hỗ trợ gì?</h2>
                </div>
                <button type="button" className="filter-close" onClick={() => setOpen(false)} aria-label="Đóng hỗ trợ tại bàn">
                  <X size={20} />
                </button>
              </header>

              <div className="operational-body">
                {state.type === 'success' ? (
                  <div className="support-success">
                    <CheckCircle2 size={48} aria-hidden="true" />
                    <h3>Nhân viên đã nhận</h3>
                    <p>{state.message}</p>
                    <button type="button" className="operational-secondary" onClick={resetRequest}>Gửi yêu cầu khác</button>
                  </div>
                ) : (
                  <>
                    <label className="support-table-field">
                      <span>Mã bàn</span>
                      <input
                        value={tableInput}
                        onChange={(event) =>
                          setTableInput(sanitizeTableCode(event.target.value))
                        }
                        inputMode="text"
                        autoComplete="off"
                        maxLength={24}
                        placeholder="Ví dụ: B03"
                        required
                      />
                      <small>Quét QR bàn sẽ tự điền; mở web thường thì nhập mã trên bàn.</small>
                    </label>
                    <div className="support-options">
                      {SUPPORT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const active = category === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            className={active ? 'support-option active' : 'support-option'}
                            aria-pressed={active}
                            onClick={() => setCategory(option.key)}
                          >
                            <Icon size={19} aria-hidden="true" />
                            <span><strong>{option.label}</strong><small>{option.hint}</small></span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedOption && (
                      <label className="support-note-field">
                        <span>Ghi chú ngắn — không bắt buộc</span>
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          maxLength={300}
                          rows={3}
                          placeholder={selectedOption.key === 'missing_piece' ? 'Ví dụ: thiếu 1 token màu đỏ' : 'Nhân viên cần biết thêm điều gì?'}
                        />
                      </label>
                    )}

                    {state.message && <p className={`operational-message ${state.type}`} role="status">{state.message}</p>}
                    <button type="button" className="operational-primary" onClick={submitRequest} disabled={!tableCode || !category || state.type === 'loading'}>
                      {state.type === 'loading' ? <LoaderCircle className="spin-icon" size={17} /> : <CircleHelp size={17} />}
                      Gửi cho nhân viên
                    </button>
                  </>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};

export default TableSupport;
