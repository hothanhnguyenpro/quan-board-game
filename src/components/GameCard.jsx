import React from 'react';
import { motion } from 'framer-motion';

// Hàm hỗ trợ: Tự động chuyển đổi link Google Drive thông thường thành link ảnh trực tiếp
const getDirectImageUrl = (url) => {
  if (!url) return null;
  // Nếu là link Google Drive dạng chia sẻ
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/d\/(.+?)\//);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  return url;
};

const GameCard = ({ game, onClick }) => {
  const edgeColor = game.edgeColor || '#5a4635';
  const height = game.boxHeight || '160px';
  const width = game.boxThickness || '48px';
  
  // Tự động tìm ảnh ở các cột phổ biến và convert link Drive
  const rawImageUrl = game.image || game.thumbnail || game.cover || game.imageUrl || game.img || '';
  const imageUrl = getDirectImageUrl(rawImageUrl);
  const hasImage = Boolean(imageUrl);

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.97, y: 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.6 }}
      style={{
        position: 'relative',
        width,
        minWidth: width,
        height,
        flex: '0 0 auto',
        alignSelf: 'flex-end',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.14)',
          // Cập nhật background để sử dụng imageUrl chuẩn
          background: hasImage
            ? `linear-gradient(90deg, rgba(255,255,255,.12), transparent 18%, rgba(0,0,0,.28)), url("${imageUrl}") center/cover no-repeat`
            : `linear-gradient(90deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.04) 9%, rgba(0,0,0,.03) 42%, rgba(0,0,0,.28) 100%), linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.22)), ${edgeColor}`,
          boxShadow: 'inset 1px 0 0 rgba(255,255,255,.18), inset -3px 0 0 rgba(0,0,0,.28), inset 0 -5px 0 rgba(0,0,0,.18), 2px 5px 8px rgba(0,0,0,.34)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '2px',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,.05) 60%, rgba(0,0,0,.18))',
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '4px',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.42))',
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '2px',
            right: '4px',
            bottom: 0,
            height: '5px',
            background: 'linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.42))',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: '7px 4px 9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <span
            title={game.name}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              maxHeight: '100%',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              color: '#f7f3e9',
              fontSize: Number.parseFloat(String(width)) >= 70 ? '12px' : '11px',
              fontWeight: 800,
              letterSpacing: '0.02em',
              lineHeight: 1,
              textShadow: '0 1px 2px rgba(0,0,0,.9)',
            }}
          >
            {game.name}
          </span>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '3px',
          right: '3px',
          bottom: '-5px',
          height: '7px',
          borderRadius: '50%',
          background: 'rgba(0,0,0,.5)',
          filter: 'blur(3px)',
          zIndex: -1,
        }}
      />
    </motion.div>
  );
};

export default GameCard;