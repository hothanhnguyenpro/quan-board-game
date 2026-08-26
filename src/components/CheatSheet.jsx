import React from 'react';
import { motion } from 'framer-motion';

import {
  ArrowLeft,
  Trophy,
  ListChecks,
  Calculator,
  Lightbulb,
  UsersRound,
  Clock3,
  Sparkles,
} from 'lucide-react';

const InfoPill = ({
  icon,
  children,
}) => (
  <div className="info-pill">
    {icon}
    <span>{children}</span>
  </div>
);

const Section = ({
  icon,
  title,
  children,
  tone = 'default',
}) => (
  <section
    className={`guide-section ${tone}`}
  >
    <div className="guide-section-title">
      <span className="guide-section-icon">
        {icon}
      </span>

      <h2>{title}</h2>
    </div>

    <div className="guide-section-body">
      {children}
    </div>
  </section>
);

const CheatSheet = ({
  game,
  onBack,
}) => {
  if (!game) {
    return (
      <div className="app-state">
        <h1>
          Không tìm thấy game
        </h1>

        <button
          type="button"
          className="state-button"
          onClick={onBack}
        >
          Quay lại tủ game
        </button>
      </div>
    );
  }

  const turnSteps =
    Array.isArray(
      game.turnSteps
    )
      ? game.turnSteps
      : [];

  const scoring =
    Array.isArray(
      game.scoring
    )
      ? game.scoring
      : [];

  const tricks =
    Array.isArray(
      game.tricks
    )
      ? game.tricks
      : [];

  return (
    <main className="guide-page">
      <div className="guide-shell">
        <header className="guide-topbar">
          <button
            type="button"
            onClick={onBack}
            className="back-button"
          >
            <ArrowLeft size={19} />
            Tủ game
          </button>

          <span className="guide-topbar-label">
            CHEAT SHEET
          </span>
        </header>

        <section className="guide-hero">
          <div className="guide-cover-wrap">
            {game.image ? (
              <img
                src={game.image}
                alt={game.name}
                className="guide-cover"
                loading="eager"
              />
            ) : (
              <div
                className="guide-cover fallback"
                style={{
                  background:
                    game.edgeColor ||
                    '#5a4635',
                }}
              >
                <Sparkles
                  size={40}
                  strokeWidth={1.6}
                />
              </div>
            )}
          </div>

          <div className="guide-hero-content">
            <span className="eyebrow">
              {game.category ||
                'BOARD GAME'}
            </span>

            <h1>
              {game.name}
            </h1>

            {game.description && (
              <p className="guide-description">
                {game.description}
              </p>
            )}

            <div className="guide-info">
              {game.players && (
                <InfoPill
                  icon={
                    <UsersRound
                      size={16}
                    />
                  }
                >
                  {game.players}
                  {' người'}
                </InfoPill>
              )}

              {game.time && (
                <InfoPill
                  icon={
                    <Clock3
                      size={16}
                    />
                  }
                >
                  {game.time}
                </InfoPill>
              )}

              {game.difficulty && (
                <InfoPill
                  icon={
                    <Sparkles
                      size={16}
                    />
                  }
                >
                  {game.difficulty}
                </InfoPill>
              )}
            </div>
          </div>
        </section>

        <div className="guide-content">
          <motion.div
            initial={{
              opacity: 0,
              y: 14,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <Section
              icon={
                <Trophy size={20} />
              }
              title="Cách thắng"
              tone="gold"
            >
              <p className="guide-main-text">
                {game.winCondition ||
                  'Chưa có thông tin.'}
              </p>
            </Section>

            <Section
              icon={
                <ListChecks size={20} />
              }
              title="Lượt của bạn"
              tone="blue"
            >
              {turnSteps.length ? (
                <div className="step-list">
                  {turnSteps.map(
                    (step, index) => (
                      <div
                        key={`${step}-${index}`}
                        className="step-item"
                      >
                        <span className="step-number">
                          {index + 1}
                        </span>

                        <p>
                          {step}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="guide-muted">
                  Chưa có thông tin
                  lượt chơi.
                </p>
              )}
            </Section>

            <Section
              icon={
                <Calculator size={20} />
              }
              title="Tính điểm"
              tone="green"
            >
              {scoring.length ? (
                <div className="bullet-list">
                  {scoring.map(
                    (item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="bullet-item"
                      >
                        <span>
                          ✓
                        </span>

                        <p>
                          {item}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="guide-muted">
                  Chưa có thông tin
                  tính điểm.
                </p>
              )}
            </Section>

            <Section
              icon={
                <Lightbulb size={20} />
              }
              title="Mẹo & lưu ý"
              tone="red"
            >
              {tricks.length ? (
                <div className="bullet-list">
                  {tricks.map(
                    (item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="bullet-item"
                      >
                        <span>
                          💡
                        </span>

                        <p>
                          {item}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="guide-muted">
                  Chưa có mẹo nào.
                </p>
              )}
            </Section>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default CheatSheet;