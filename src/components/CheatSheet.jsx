import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Calculator,
  ChevronDown,
  Clock3,
  Lightbulb,
  ListChecks,
  Sparkles,
  Trophy,
  UsersRound,
  Wrench,
} from 'lucide-react';

import { APP_CONFIG } from '../config.js';
import { getGameCheatSheet } from '../data/cheatSheets.js';
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

const RuleAccordion = ({ item, isOpen, onToggle }) => {
  const contentId = `rule-content-${item.id}`;

  return (
    <details className="rule-accordion" open={isOpen}>
      <summary
        className="rule-accordion-summary"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault();
          onToggle(item.id);
        }}
      >
        <span className="rule-accordion-emoji" aria-hidden="true">
          {item.icon || '⚡'}
        </span>
        <span className="rule-accordion-label">
          <strong>{item.title}</strong>
          <span>{item.summary}</span>
        </span>
        <ChevronDown
          className="rule-accordion-chevron"
          size={20}
          aria-hidden="true"
        />
      </summary>

      <div id={contentId} className="rule-accordion-content">
        <div className="rule-detail-block">
          <h3>
            <ListChecks size={18} aria-hidden="true" />
            Chi tiết luật
          </h3>
          <ul>
            {(item.rules || []).map((rule, index) => (
              <li key={`${item.id}-rule-${index}`}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="rule-logic-block">
          <h3>
            <Brain size={18} aria-hidden="true" />
            Tại sao lại thế?
          </h3>
          <p>{item.logic}</p>
        </div>

        {item.memory && (
          <p className="rule-memory-line">
            <span aria-hidden="true">🧠</span>
            {item.memory}
          </p>
        )}

        {item.warning && (
          <p className="rule-warning">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>
              <strong>Dễ quên:</strong> {item.warning}
            </span>
          </p>
        )}
      </div>
    </details>
  );
};

const LegacyCheatSheet = ({ game, turnSteps, scoring, tricks }) => (
  <>
    <Section icon={<Trophy size={20} />} title="Cách thắng" tone="gold">
      <p className="guide-main-text">
        {game.winCondition || 'Chưa có thông tin.'}
      </p>
    </Section>

    <Section icon={<ListChecks size={20} />} title="Lượt của bạn" tone="blue">
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

    <Section icon={<Calculator size={20} />} title="Tính điểm" tone="green">
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

    <Section icon={<Lightbulb size={20} />} title="Mẹo & lưu ý" tone="red">
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
  </>
);

const CheatSheet = ({ game, onBack, backLabel = 'Tủ game' }) => {
  const reduceMotion = useReducedMotion();
  const [isCompanionOpen, setCompanionOpen] = useState(false);
  const [openRuleId, setOpenRuleId] = useState(null);
  if (!game) {
    return (
      <div className="app-state">
        <h1>Không tìm thấy game</h1>
        <button type="button" className="state-button" onClick={onBack}>
          Quay lại {backLabel.toLowerCase()}
        </button>
      </div>
    );
  }

  const turnSteps = toList(game.turnSteps);
  const scoring = toList(game.scoring);
  const tricks = toList(game.tricks);
  const detailedGuide = getGameCheatSheet(game);

  return (
    <main className="guide-page">
      <div className="guide-shell">
        <header className="guide-topbar">
          <button type="button" onClick={onBack} className="back-button">
            <ArrowLeft size={19} />
            {backLabel}
          </button>
          <span className="guide-topbar-label">LUẬT NHANH</span>
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
            {detailedGuide ? (
              <>
                <Section
                  icon={<Sparkles size={20} />}
                  title="Không khí và cái hay của trò chơi"
                  tone="gold"
                >
                  <p className="guide-main-text">{detailedGuide.intro}</p>
                  <p className="guide-memory-banner">
                    {detailedGuide.memoryLine}
                  </p>
                </Section>

                <Section
                  icon={<Trophy size={20} />}
                  title="Mục tiêu chiến thắng"
                  tone="green"
                >
                  <p className="guide-main-text">{detailedGuide.objective}</p>
                </Section>

                {detailedGuide.sections.map((section) => (
                  <Section
                    key={section.id}
                    icon={<ListChecks size={20} />}
                    title={section.title}
                    tone={section.tone}
                  >
                    <div className="rule-accordion-list">
                      {section.items.map((item) => (
                        <RuleAccordion
                          key={item.id}
                          item={item}
                          isOpen={openRuleId === item.id}
                          onToggle={(itemId) =>
                            setOpenRuleId((current) =>
                              current === itemId ? null : itemId
                            )
                          }
                        />
                      ))}
                    </div>
                  </Section>
                ))}
              </>
            ) : (
              <LegacyCheatSheet
                game={game}
                turnSteps={turnSteps}
                scoring={scoring}
                tricks={tricks}
              />
            )}
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
