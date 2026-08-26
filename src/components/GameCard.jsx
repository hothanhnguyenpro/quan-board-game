import React from 'react';
import { motion } from 'framer-motion';

const GameCard = ({
  game,
  onClick,
}) => {
  const edgeColor =
    game.edgeColor ||
    '#5a4635';

  const rawWidth = Number.parseFloat(
    String(
      game.boxThickness ||
        '58px'
    )
  );

  const rawHeight =
    Number.parseFloat(
      String(
        game.boxHeight ||
          '175px'
      )
    );

  const width = Math.max(
    48,
    Math.min(
      Number.isFinite(
        rawWidth
      )
        ? rawWidth
        : 58,
      90
    )
  );

  const height = Math.max(
    120,
    Math.min(
      Number.isFinite(
        rawHeight
      )
        ? rawHeight
        : 175,
      220
    )
  );

  const image =
    game.image || '';

  const hasImage =
    Boolean(image);

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      onClick?.();
    }
  };

  const background =
    hasImage
      ? `
        linear-gradient(
          90deg,
          rgba(255,255,255,.16) 0%,
          rgba(255,255,255,.03) 9%,
          rgba(0,0,0,.06) 48%,
          rgba(0,0,0,.40) 100%
        ),
        url("${image}") center / cover no-repeat
      `
      : `
        linear-gradient(
          90deg,
          rgba(255,255,255,.17),
          rgba(255,255,255,.025) 15%,
          rgba(0,0,0,.32)
        ),
        ${edgeColor}
      `;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Mở hướng dẫn ${game.name}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      whileHover={{
        y: -2,
        scale: 1.01,
      }}
      whileTap={{
        y: 2,
        scale: 0.97,
      }}
      transition={{
        type: 'spring',
        stiffness: 450,
        damping: 25,
      }}
      className="game-card"
      style={{
        width,
        minWidth: width,
        height,
      }}
    >
      <div
        className="game-card-face"
        style={{
          backgroundColor:
            edgeColor,
          background,
        }}
      >
        <span
          className="game-card-highlight-left"
          aria-hidden="true"
        />

        <span
          className="game-card-shadow-right"
          aria-hidden="true"
        />

        <span
          className="game-card-edge-bottom"
          aria-hidden="true"
        />

        <span className="game-card-title">
          {game.name}
        </span>
      </div>

      <span
        className="game-card-contact-shadow"
        aria-hidden="true"
      />
    </motion.div>
  );
};

export default GameCard;