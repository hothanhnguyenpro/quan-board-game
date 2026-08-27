import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  Clock3,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';

import { useModalBehavior } from '../hooks/useModalBehavior.js';
import {
  createRequestToken,
  postFormNoCors,
} from '../utils/appsScriptClient.js';
import {
  GAME_RECOMMENDER_DEFAULTS,
  recommendGames,
} from '../utils/gameRecommender.js';
import RecommendationCard from './RecommendationCard.jsx';
import './GameRecommender.css';

const PLAYER_MIN = 1;
const PLAYER_MAX = 30;
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const clampPlayerCount = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return GAME_RECOMMENDER_DEFAULTS.players;
  return Math.min(PLAYER_MAX, Math.max(PLAYER_MIN, Math.round(number)));
};

const normalizeDuration = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.round(number)
    : GAME_RECOMMENDER_DEFAULTS.durationMinutes;
};

const submitSelectionSignal = ({
  submitUrl,
  tableCode,
  game,
  preferences,
}) => {
  const endpoint = String(submitUrl || '').trim();
  const table = String(tableCode || '').trim();

  if (!endpoint || !table || !game) {
    return;
  }

  const requestToken = createRequestToken('table-game');

  // This operational signal is deliberately best-effort: recommending and
  // opening a Cheat Sheet never depends on the network being available. The
  // backend stores it as the current table pulse, not as a promised departure
  // time, so staff only sees the estimated length of the selected round.
  void postFormNoCors(endpoint, {
    action: 'tablePulse',
    tableCode: table,
    tableState: 'playing',
    groupSize: preferences.players,
    roundMinutes: preferences.durationMinutes,
    gameId: String(game.id || ''),
    gameName: String(game.name || ''),
    requestToken,
    submissionToken: requestToken,
  }).catch(() => undefined);
};

const GameRecommenderSheet = ({
  isOpen,
  onClose,
  games = [],
  preferences = GAME_RECOMMENDER_DEFAULTS,
  onPreferencesChange,
  onSelectGame,
  tableCode = '',
  submitUrl = '',
}) => {
  const reduceMotion = useReducedMotion();
  const [showResults, setShowResults] = useState(false);
  const players = clampPlayerCount(preferences?.players);
  const durationMinutes = normalizeDuration(preferences?.durationMinutes);
  const normalizedPreferences = useMemo(
    () => ({ players, durationMinutes }),
    [players, durationMinutes]
  );
  const recommendations = useMemo(
    () => recommendGames(games, normalizedPreferences),
    [games, normalizedPreferences]
  );

  const handleClose = () => {
    setShowResults(false);
    onClose?.();
  };

  useModalBehavior({
    isOpen,
    onEscape: handleClose,
  });

  const updatePreferences = (patch) => {
    onPreferencesChange?.({
      ...preferences,
      players,
      durationMinutes,
      ...patch,
    });
  };

  const handlePlayerChange = (value) => {
    updatePreferences({ players: clampPlayerCount(value) });
  };

  const handleSelect = (recommendation) => {
    if (!recommendation?.game) return;

    submitSelectionSignal({
      submitUrl,
      tableCode,
      game: recommendation.game,
      preferences: normalizedPreferences,
    });

    handleClose();
    onSelectGame?.(recommendation.game, recommendation);
  };

  if (typeof document === 'undefined') {
    return null;
  }

  const safeTableCode = String(tableCode || '').trim();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="game-recommender-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        >
          <button
            type="button"
            className="game-recommender-backdrop"
            aria-label="Đóng gợi ý game"
            onClick={handleClose}
            tabIndex={-1}
          />

          <motion.section
            className="game-recommender-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-recommender-title"
            initial={reduceMotion ? false : { y: '100%', opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { y: 0 } : { y: '100%', opacity: 0.96 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 350, damping: 32, mass: 0.84 }
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="game-recommender-handle" aria-hidden="true" />

            <header className="game-recommender-header">
              <div className="game-recommender-title-wrap">
                <span className="game-recommender-icon" aria-hidden="true">
                  <Sparkles size={19} />
                </span>

                <div>
                  <span className="game-recommender-eyebrow">
                    {safeTableCode ? `BÀN ${safeTableCode}` : 'GỢI Ý NHANH'}
                  </span>
                  <h2 id="game-recommender-title">
                    {showResults ? '3 game hợp với bàn bạn' : 'Chọn game cho bàn tôi'}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                className="game-recommender-close"
                onClick={handleClose}
                aria-label="Đóng gợi ý game"
                autoFocus
              >
                <X size={20} />
              </button>
            </header>

            <div className="game-recommender-scroll">
              {!showResults ? (
                <div className="game-recommender-form">
                  <p className="game-recommender-intro">
                    Chọn số người và nhịp một ván. Hệ thống sẽ tìm ba game dễ
                    bắt đầu và vừa với bàn nhất.
                  </p>

                  <section className="game-recommender-field">
                    <div className="game-recommender-field-label">
                      <span aria-hidden="true"><UsersRound size={18} /></span>
                      <div>
                        <h3>Bàn mình có</h3>
                        <p>Nhập đúng tổng số người đang chơi.</p>
                      </div>
                    </div>

                    <div className="game-recommender-stepper">
                      <button
                        type="button"
                        onClick={() => handlePlayerChange(players - 1)}
                        disabled={players <= PLAYER_MIN}
                        aria-label="Giảm số người"
                      >
                        <Minus size={19} />
                      </button>

                      <label>
                        <span className="sr-only">Số người</span>
                        <input
                          type="number"
                          min={PLAYER_MIN}
                          max={PLAYER_MAX}
                          inputMode="numeric"
                          value={players}
                          onChange={(event) => handlePlayerChange(event.target.value)}
                        />
                        <span>người</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handlePlayerChange(players + 1)}
                        disabled={players >= PLAYER_MAX}
                        aria-label="Tăng số người"
                      >
                        <Plus size={19} />
                      </button>
                    </div>
                  </section>

                  <section className="game-recommender-field">
                    <div className="game-recommender-field-label">
                      <span aria-hidden="true"><Clock3 size={18} /></span>
                      <div>
                        <h3>Muốn một ván khoảng</h3>
                        <p>Chọn độ dài một ván hợp với nhịp của bàn.</p>
                      </div>
                    </div>

                    <div className="game-recommender-duration-options">
                      {DURATION_OPTIONS.map((minutes) => {
                        const active = durationMinutes === minutes;

                        return (
                          <motion.button
                            key={minutes}
                            type="button"
                            className={active ? 'active' : undefined}
                            aria-pressed={active}
                            onClick={() => updatePreferences({ durationMinutes: minutes })}
                            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                          >
                            {minutes === 120 ? '120+' : minutes}
                            <span>phút</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>

                  <div className="game-recommender-reassurance" role="note">
                    <ShieldCheck size={20} aria-hidden="true" />
                    <div>
                      <strong>Đây là nhịp một ván, không phải giờ rời quán.</strong>
                      <span>Quán vẫn chơi không giới hạn thời gian.</span>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    className="game-recommender-submit"
                    onClick={() => setShowResults(true)}
                    whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                  >
                    <Sparkles size={18} aria-hidden="true" />
                    Xem 3 game phù hợp
                  </motion.button>
                </div>
              ) : (
                <div className="game-recommender-results" aria-live="polite">
                  <div className="game-recommender-results-summary">
                    <button
                      type="button"
                      className="game-recommender-edit"
                      onClick={() => setShowResults(false)}
                    >
                      <ArrowLeft size={16} aria-hidden="true" />
                      Chỉnh lại
                    </button>

                    <p>
                      <strong>{players} người</strong>
                      <span aria-hidden="true">·</span>
                      <strong>{durationMinutes === 120 ? '120+' : durationMinutes} phút/ván</strong>
                    </p>
                  </div>

                  {recommendations.length ? (
                    <div className="game-recommender-result-list">
                      {recommendations.map((recommendation, index) => (
                        <RecommendationCard
                          key={recommendation.game.id || `${recommendation.game.name}-${index}`}
                          recommendation={recommendation}
                          rank={index + 1}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="game-recommender-empty">
                      <span aria-hidden="true"><Sparkles size={28} /></span>
                      <h3>Chưa tìm thấy game vừa khít</h3>
                      <p>
                        Thử đổi mốc thời lượng hoặc nhờ nhân viên gợi ý thêm cho bàn bạn.
                      </p>
                      <button type="button" onClick={() => setShowResults(false)}>
                        Chỉnh lựa chọn
                      </button>
                    </div>
                  )}

                  <p className="game-recommender-result-note">
                    Thời lượng là ước tính cho một ván và có thể thay đổi theo
                    cách chơi của từng bàn.
                  </p>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default GameRecommenderSheet;
