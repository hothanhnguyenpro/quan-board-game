import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CircleStop,
  Coins,
  Dices,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  UserRoundPlus,
  X,
} from 'lucide-react';

import { useModalBehavior } from '../hooks/useModalBehavior.js';

const clean = (value) => String(value ?? '').trim();
const MAX_PLAYERS = 12;

const createPlayer = (index) => ({
  id: `player-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  name: `Người ${index + 1}`,
  score: 0,
});

const defaultState = () => ({
  players: [createPlayer(0), createPlayer(1)],
  round: 1,
  elapsedSeconds: 0,
  timerStartedAt: null,
  firstPlayerId: '',
  diceResult: '',
  coinResult: '',
});

const storageKey = (game) => `noburi:companion:${clean(game?.id || game?.name || 'game')}:v1`;

const readState = (game) => {
  if (typeof window === 'undefined') return defaultState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(game)) || 'null');
    if (!parsed || !Array.isArray(parsed.players) || !parsed.players.length) return defaultState();
    return {
      ...defaultState(),
      ...parsed,
      players: parsed.players.slice(0, MAX_PLAYERS).map((player, index) => ({
        id: clean(player?.id) || createPlayer(index).id,
        name: clean(player?.name) || `Người ${index + 1}`,
        score: Number(player?.score) || 0,
      })),
    };
  } catch {
    return defaultState();
  }
};

const randomIndex = (length) => {
  if (length <= 1) return 0;
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] % length;
  }
  return Math.floor(Math.random() * length);
};

const formatTimer = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return [hours, minutes, rest].map((part) => String(part).padStart(2, '0')).join(':');
};

const GameCompanionSheet = ({ game, isOpen, onClose }) => {
  const reduceMotion = useReducedMotion();
  const [toolState, setToolState] = useState(() => readState(game));
  const [tick, setTick] = useState(0);

  useModalBehavior({ isOpen, onEscape: onClose });

  useEffect(() => {
    if (!toolState.timerStartedAt) return undefined;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [toolState.timerStartedAt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey(game), JSON.stringify(toolState));
    } catch {
      // The toolkit remains usable for the current tab without persistence.
    }
  }, [game, toolState]);

  const elapsedSeconds = useMemo(() => {
    const runningSeconds = toolState.timerStartedAt
      ? Math.max(0, Math.floor((tick - toolState.timerStartedAt) / 1000))
      : 0;
    return toolState.elapsedSeconds + runningSeconds;
  }, [tick, toolState.elapsedSeconds, toolState.timerStartedAt]);

  const updatePlayer = (id, patch) => {
    setToolState((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === id ? { ...player, ...patch } : player
      ),
    }));
  };

  const addPlayer = () => {
    setToolState((current) =>
      current.players.length >= MAX_PLAYERS
        ? current
        : { ...current, players: [...current.players, createPlayer(current.players.length)] }
    );
  };

  const removePlayer = (id) => {
    setToolState((current) => {
      if (current.players.length <= 1) return current;
      return {
        ...current,
        players: current.players.filter((player) => player.id !== id),
        firstPlayerId: current.firstPlayerId === id ? '' : current.firstPlayerId,
      };
    });
  };

  const toggleTimer = () => {
    setToolState((current) => {
      if (current.timerStartedAt) {
        const extra = Math.max(0, Math.floor((Date.now() - current.timerStartedAt) / 1000));
        return {
          ...current,
          elapsedSeconds: current.elapsedSeconds + extra,
          timerStartedAt: null,
        };
      }
      setTick(Date.now());
      return { ...current, timerStartedAt: Date.now() };
    });
  };

  const stopTimer = () => {
    setToolState((current) => ({ ...current, elapsedSeconds: 0, timerStartedAt: null }));
    setTick(Date.now());
  };

  const chooseFirstPlayer = () => {
    setToolState((current) => ({
      ...current,
      firstPlayerId: current.players[randomIndex(current.players.length)]?.id || '',
    }));
  };

  const rollDice = () => {
    setToolState((current) => ({ ...current, diceResult: String(randomIndex(6) + 1) }));
  };

  const flipCoin = () => {
    setToolState((current) => ({ ...current, coinResult: randomIndex(2) ? 'Ngửa' : 'Sấp' }));
  };

  const resetAll = () => {
    if (!window.confirm('Xóa điểm, vòng và đồng hồ của ván này?')) return;
    const next = defaultState();
    setToolState(next);
    setTick(Date.now());
  };

  if (typeof document === 'undefined') return null;
  const firstPlayer = toolState.players.find((player) => player.id === toolState.firstPlayerId);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div className="filter-overlay" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="filter-backdrop" aria-label="Đóng công cụ trong ván" onClick={onClose} />
          <motion.section
            className="filter-sheet operational-sheet game-tools-sheet"
            initial={reduceMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduceMotion ? { y: 0 } : { y: '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-tools-title"
          >
            <div className="filter-handle" aria-hidden="true" />
            <header className="filter-header">
              <div>
                <span className="eyebrow">LƯU OFFLINE TRÊN MÁY</span>
                <h2 id="game-tools-title">Công cụ · {game?.name}</h2>
              </div>
              <button type="button" className="filter-close" onClick={onClose} aria-label="Đóng công cụ trong ván"><X size={20} /></button>
            </header>

            <div className="operational-body game-tools-body">
              <section className="game-tool-card timer-tool">
                <div className="game-tool-heading"><span>Đồng hồ ván</span><strong>{formatTimer(elapsedSeconds)}</strong></div>
                <div className="tool-button-row">
                  <button type="button" onClick={toggleTimer}>{toolState.timerStartedAt ? <Pause size={17} /> : <Play size={17} />}{toolState.timerStartedAt ? 'Tạm dừng' : 'Bắt đầu'}</button>
                  <button type="button" onClick={stopTimer}><CircleStop size={17} />Đặt lại giờ</button>
                </div>
              </section>

              <section className="game-tool-card round-tool">
                <span>Vòng hiện tại</span>
                <div className="round-control">
                  <button type="button" onClick={() => setToolState((current) => ({ ...current, round: Math.max(1, current.round - 1) }))} aria-label="Giảm vòng"><Minus size={18} /></button>
                  <strong>{toolState.round}</strong>
                  <button type="button" onClick={() => setToolState((current) => ({ ...current, round: current.round + 1 }))} aria-label="Tăng vòng"><Plus size={18} /></button>
                </div>
              </section>

              <section className="game-tool-card score-tool">
                <div className="game-tool-heading"><span>Bảng điểm</span><button type="button" className="inline-tool-button" onClick={addPlayer} disabled={toolState.players.length >= MAX_PLAYERS}><UserRoundPlus size={16} />Thêm người</button></div>
                <div className="score-list">
                  {toolState.players.map((player) => (
                    <div key={player.id} className={player.id === toolState.firstPlayerId ? 'score-row first-player' : 'score-row'}>
                      <input value={player.name} onChange={(event) => updatePlayer(player.id, { name: event.target.value.slice(0, 24) })} aria-label="Tên người chơi" />
                      <button type="button" onClick={() => updatePlayer(player.id, { score: player.score - 1 })} aria-label={`Trừ điểm ${player.name}`}><Minus size={17} /></button>
                      <strong>{player.score}</strong>
                      <button type="button" onClick={() => updatePlayer(player.id, { score: player.score + 1 })} aria-label={`Cộng điểm ${player.name}`}><Plus size={17} /></button>
                      <button type="button" className="remove-player" onClick={() => removePlayer(player.id)} aria-label={`Xóa ${player.name}`}><X size={15} /></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="game-tool-card random-tool">
                <div className="random-result">
                  <span>Đi trước</span><strong>{firstPlayer?.name || '—'}</strong>
                  <button type="button" onClick={chooseFirstPlayer}><Sparkles size={16} />Chọn</button>
                </div>
                <div className="random-result">
                  <span>Xúc xắc</span><strong>{toolState.diceResult || '—'}</strong>
                  <button type="button" onClick={rollDice}><Dices size={16} />Tung</button>
                </div>
                <div className="random-result">
                  <span>Đồng xu</span><strong>{toolState.coinResult || '—'}</strong>
                  <button type="button" onClick={flipCoin}><Coins size={16} />Tung</button>
                </div>
              </section>

              <button type="button" className="reset-tools-button" onClick={resetAll}><RotateCcw size={16} />Xóa dữ liệu ván này</button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default GameCompanionSheet;
