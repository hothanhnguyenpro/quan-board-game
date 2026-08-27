import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const clampDimension = (value, fallback, min, max) => {
  const parsed = Number.parseFloat(String(value ?? ''));
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(safeValue, max));
};

const GameCard = ({ game, onSelect }) => {
  const reduceMotion = useReducedMotion();
  const edgeColor = game?.edgeColor || '#5a4635';
  const width = clampDimension(game?.boxThickness, 58, 48, 90);
  const height = clampDimension(game?.boxHeight, 175, 120, 220);
  const image = String(game?.image || '').trim();
  const name = String(game?.name || 'Board game').trim();

  return (
    <motion.button
      type="button"
      aria-label={`Mở hướng dẫn ${name}`}
      onClick={() => onSelect?.(game)}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
      whileTap={reduceMotion ? undefined : { y: 2, scale: 0.97 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 450, damping: 25 }
      }
      className="game-card"
      style={{
        width,
        minWidth: width,
        height,
        '--game-edge-color': edgeColor,
      }}
    >
      <span className="game-card-face">
        {image && (
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="game-card-image"
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}

        <span className="game-card-image-shade" aria-hidden="true" />
        <span className="game-card-highlight-left" aria-hidden="true" />
        <span className="game-card-shadow-right" aria-hidden="true" />
        <span className="game-card-edge-bottom" aria-hidden="true" />
        <span className="game-card-title">{name}</span>
      </span>

      <span className="game-card-contact-shadow" aria-hidden="true" />
    </motion.button>
  );
};

export default memo(GameCard);
