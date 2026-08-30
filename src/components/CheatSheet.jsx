import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  Calculator,
  Clock3,
  Lightbulb,
  ListChecks,
  Sparkles,
  Trophy,
  UsersRound,
  Wrench,
} from 'lucide-react';

import { APP_CONFIG } from '../config.js';
import GameCompanionSheet from './GameCompanionSheet.jsx';

const toList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const text = String(value ?? '').trim();

  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n|\||;/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatPlayers = (value) => {
  const text = String(value ?? '').trim();

  if (!text) {
    return '';
  }

  return /người|nguoi/i.test(text) ? text : `${text} người`;
};

const InfoPill = ({ icon, children }) => (
  <div className="info-pill">
    {icon}
    <span>{children}</span>
  </div>
);

const Section = ({ icon, title, children, tone = 'default' }) => (
  <section className={`guide-section ${tone}`}>
    <div className="guide-section-title">
      <span className="guide-section-icon">{icon}</span>
      <h2>{title}</h2>
    </div>
    <div className="guide-section-body">{children}</div>
  </section>
);

const GameCover = ({ game }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const image = String(game?.detailImage || game?.image || '').trim();
  const shouldShowImage = image && !imageFailed;

  if (shouldShowImage) {
    return (
      <img
        src={image}
        alt={`Hộp game ${game.name}`}
        className="guide-cover"
        loading="eager"
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className="guide-cover fallback"
      style={{ background: game?.edgeColor || '#5a4635' }}
      aria-label={`Không có ảnh cho ${game?.name || 'game này'}`}
    >
      <Sparkles size={40} strokeWidth={1.6} />
    </div>
  );
};

const CheatSheet = ({ game, onBack }) => {
  const reduceMotion = useReducedMotion();
  const [isCompanionOpen, setCompanionOpen] = useState(false);
  if (!game) {
    return (
      <div className="app-state">
        <h1>Không tìm thấy game</h1>
        <button type="button" className="state-button" onClick={onBack}>
          Quay lại tủ game
        </button>
      </div>
    );
  }

  const turnSteps = toList(game.turnSteps);
  const scoring = toList(game.scoring);
  const tricks = toList(game.tricks);

  return (
    <main className="guide-page">
      <div className="guide-shell">
        <header className="guide-topbar">
          <button type="button" onClick={onBack} className="back-button">
            <ArrowLeft size={19} />
            Tủ game
          </button>
          <span className="guide-topbar-label">CHEAT SHEET</span>
        </header>

        <section className="guide-hero">
          <div className="guide-cover-wrap">
            <GameCover game={game} />
          </div>

          <div className="guide-hero-content">
            <span className="eyebrow">{game.category || 'BOARD GAME'}</span>
            <h1>{game.name}</h1>

            {game.description && (
              <p className="guide-description">{game.description}</p>
            )}

            <div className="guide-info">
              {game.players && (
                <InfoPill icon={<UsersRound size={16} />}>
                  {formatPlayers(game.players)}
                </InfoPill>
              )}

              {game.time && (
                <InfoPill icon={<Clock3 size={16} />}>{game.time}</InfoPill>
              )}

              {game.difficulty && (
                <InfoPill icon={<Sparkles size={16} />}>
                  {game.difficulty}
                </InfoPill>
              )}
            </div>

            {APP_CONFIG?.gameCompanion?.enabled === true && (
              <button
                type="button"
                className="game-tools-launch"
                onClick={() => setCompanionOpen(true)}
              >
                <Wrench size={17} aria-hidden="true" />
                {APP_CONFIG?.gameCompanion?.buttonLabel || 'Công cụ trong ván'}
              </button>
            )}
          </div>
        </section>

        <div className="guide-content">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
          >
            <Section icon={<Trophy size={20} />} title="Cách thắng" tone="gold">
              <p className="guide-main-text">
                {game.winCondition || 'Chưa có thông tin.'}
              </p>
            </Section>

            <Section
              icon={<ListChecks size={20} />}
              title="Lượt của bạn"
              tone="blue"
            >
              {turnSteps.length ? (
                <div className="step-list">
                  {turnSteps.map((step, index) => (
                    <div key={`${index}-${step}`} className="step-item">
                      <span className="step-number">{index + 1}</span>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="guide-muted">Chưa có thông tin lượt chơi.</p>
              )}
            </Section>

            <Section
              icon={<Calculator size={20} />}
              title="Tính điểm"
              tone="green"
            >
              {scoring.length ? (
                <div className="bullet-list">
                  {scoring.map((item, index) => (
                    <div key={`${index}-${item}`} className="bullet-item">
                      <span>✓</span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="guide-muted">Chưa có thông tin tính điểm.</p>
              )}
            </Section>

            <Section
              icon={<Lightbulb size={20} />}
              title="Mẹo & lưu ý"
              tone="red"
            >
              {tricks.length ? (
                <div className="bullet-list">
                  {tricks.map((item, index) => (
                    <div key={`${index}-${item}`} className="bullet-item">
                      <span>💡</span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="guide-muted">Chưa có mẹo nào.</p>
              )}
            </Section>
          </motion.div>
        </div>
      </div>

      <GameCompanionSheet
        key={game.id || game.name}
        game={game}
        isOpen={isCompanionOpen}
        onClose={() => setCompanionOpen(false)}
      />
    </main>
  );
};

export default CheatSheet;
