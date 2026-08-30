import { memo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const getInitials = (name) =>
  String(name || 'Board Game')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const GameCard = ({ game, onSelect }) => {
  const reduceMotion = useReducedMotion();
  const edgeColor = game?.edgeColor || game?.coverColor || '#5a4635';
  const image = String(game?.image || '').trim();
  const name = String(game?.name || 'Board game').trim();
  const [failedImage, setFailedImage] = useState('');
  const imageFailed = !image || failedImage === image;

  return (
    <motion.button
      type="button"
      aria-label={`Mở hướng dẫn ${name}`}
      onClick={() => onSelect?.(game)}
      whileHover={reduceMotion ? undefined : { y: -3, scale: 1.015 }}
      whileTap={reduceMotion ? undefined : { y: 2, scale: 0.97 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 450, damping: 25 }
      }
      className="game-card"
      style={{
        '--game-edge-color': edgeColor,
      }}
    >
      <span className="game-card-face">
        <span className="game-card-fallback" aria-hidden="true">
          <strong>{getInitials(name)}</strong>
          <small>{name}</small>
        </span>

        {image && !imageFailed && (
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="game-card-image"
            loading="lazy"
            decoding="async"
            sizes="92px"
            onError={() => setFailedImage(image)}
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
