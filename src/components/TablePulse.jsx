import { useEffect, useRef, useState } from 'react';
import { Check, Clock3, LoaderCircle, Sparkles } from 'lucide-react';

import { createRequestToken, submitWithStatus } from '../utils/appsScriptClient.js';

const PULSE_OPTIONS = [
  {
    state: 'playing',
    label: 'Đang chơi vui',
    description: 'Bàn vẫn đang trong một ván.',
  },
  {
    state: 'last_round',
    label: 'Đây là ván cuối',
    description: 'Quán có thể chuẩn bị nhẹ nhàng cho lượt kế tiếp.',
  },
  {
    state: 'leaving_soon',
    label: 'Sắp thu dọn',
    description: 'Bàn chủ động báo sắp kết thúc.',
  },
];

const TablePulse = ({ tableCode, submitUrl }) => {
  const controllerRef = useRef(null);
  const [selected, setSelected] = useState('');
  const [state, setState] = useState({ type: '', message: '' });

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    []
  );

  if (!tableCode) return null;

  const sendPulse = async (nextState) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSelected(nextState);
    setState({ type: 'loading', message: 'Đang gửi nhịp bàn...' });

    try {
      const result = await submitWithStatus({
        url: submitUrl,
        token: createRequestToken('table'),
        timeoutMs: 25000,
        signal: controller.signal,
        payload: {
          action: 'tablePulse',
          tableCode,
          tableState: nextState,
        },
      });

      setState({
        type: 'success',
        message: result?.message || 'Đã cập nhật nhịp bàn. Cảm ơn bạn!',
      });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setState({
        type: 'error',
        message: 'Chưa gửi được. Bạn vẫn có thể tiếp tục chơi bình thường.',
      });
    }
  };

  return (
    <section className="table-pulse" aria-labelledby="table-pulse-title">
      <div className="table-pulse-heading">
        <span className="table-pulse-icon" aria-hidden="true">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="table-pulse-kicker">BÀN {tableCode}</p>
          <h2 id="table-pulse-title">Nhịp của bàn mình</h2>
          <p>
            Không cần báo giờ về. Chỉ khi bạn muốn, hãy cho quán biết nhịp của
            ván hiện tại.
          </p>
        </div>
      </div>

      <div className="table-pulse-options">
        {PULSE_OPTIONS.map((option) => {
          const active = selected === option.state;
          return (
            <button
              key={option.state}
              type="button"
              className={active ? 'table-pulse-option active' : 'table-pulse-option'}
              onClick={() => sendPulse(option.state)}
              disabled={state.type === 'loading'}
              title={option.description}
            >
              {active && state.type === 'loading' ? (
                <LoaderCircle className="spin-icon" size={16} />
              ) : active && state.type === 'success' ? (
                <Check size={16} />
              ) : (
                <Clock3 size={16} />
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {state.message && (
        <p
          className={`table-pulse-message ${state.type}`}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
    </section>
  );
};

export default TablePulse;

