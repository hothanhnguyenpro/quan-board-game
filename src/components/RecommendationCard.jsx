import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Clock3,
  Sparkles,
  UsersRound,
} from 'lucide-react';

const RANK_LABELS = {
  1: 'Gợi ý hàng đầu',
  2: 'Lựa chọn cân bằng',
  3: 'Phương án linh hoạt',
};

const formatPlayers = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return /người|nguoi/i.test(text) ? text : `${text} người`;
};

const RecommendationCover = ({ game }) => {
  const image = String(game?.image || '').trim();
  const name = String(game?.name || 'Board game').trim();

  return (
    <div
      className="recommendation-card-cover"
      style={{ '--recommendation-cover-color': game?.edgeColor || '#6b4e36' }}
    >
      <span className="recommendation-card-cover-fallback" aria-hidden="true">
        <Sparkles size={26} strokeWidth={1.7} />
      </span>

      {image && (
        <img
          src={image}
          alt={`Hộp game ${name}`}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </div>
  );
};

const RecommendationCard = ({
  recommendation,
  rank,
  onSelect,
  disabled = false,
}) => {
  const reduceMotion = useReducedMotion();
  const game = recommendation?.game;

  if (!game) {
    return null;
  }

  const safeRank = Number(rank || recommendation?.rank || 1);
  const name = String(game?.name || 'Board game').trim();
  const playerText = formatPlayers(game?.players);
  const durationText = String(
    recommendation?.durationLabel || game?.time || ''
  ).trim();
  const fit = String(recommendation?.fit || 'unknown');
  const reasons = Array.isArray(recommendation?.reasons)
    ? recommendation.reasons.filter(Boolean).slice(0, 3)
    : [];

  return (
    <motion.article
      className={`recommendation-card fit-${fit}`}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.24, delay: Math.min(0.12, (safeRank - 1) * 0.045) }
      }
    >
      <RecommendationCover game={game} />

      <div className="recommendation-card-content">
        <div className="recommendation-card-heading">
          <div>
            <span className="recommendation-rank-label">
              #{safeRank} {RANK_LABELS[safeRank] || 'Gợi ý phù hợp'}
            </span>
            <h3>{name}</h3>
          </div>

          <span className={`recommendation-fit fit-${fit}`}>
            {recommendation?.fitLabel || 'Phù hợp'}
          </span>
        </div>

        {(playerText || durationText) && (
          <div className="recommendation-meta" aria-label="Thông tin game">
            {playerText && (
              <span>
                <UsersRound size={14} aria-hidden="true" />
                {playerText}
              </span>
            )}

            {durationText && (
              <span>
                <Clock3 size={14} aria-hidden="true" />
                {durationText}
              </span>
            )}
          </div>
        )}

        {reasons.length > 0 && (
          <ul className="recommendation-reasons" aria-label="Lý do đề xuất">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}

        {recommendation?.warning && (
          <p className="recommendation-warning">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{recommendation.warning}</span>
          </p>
        )}

        <motion.button
          type="button"
          className="recommendation-select"
          onClick={() => onSelect?.(recommendation)}
          disabled={disabled}
          whileTap={reduceMotion || disabled ? undefined : { scale: 0.98 }}
          aria-label={`Xem hướng dẫn ${name}`}
        >
          <span>Xem cách chơi</span>
          <ArrowRight size={17} aria-hidden="true" />
        </motion.button>
      </div>
    </motion.article>
  );
};

export default memo(RecommendationCard);
