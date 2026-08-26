import React from 'react';
import { motion } from 'framer-motion';
import { Clock3, UsersRound, X } from 'lucide-react';

const FilterSheet = ({ isOpen, onClose, filter = {}, onFilterChange }) => {
  const categories = [
    {
      label: 'Thời gian',
      key: 'time',
      icon: Clock3,
      options: ['<15 phút', '30-60 phút', '45-90 phút'],
    },
    {
      label: 'Số người',
      key: 'players',
      icon: UsersRound,
      options: ['2', '3-4', 'Nhóm đông'],
    },
  ];

  const handleChipClick = (key, option) => {
    onFilterChange({
      ...filter,
      [key]: filter[key] === option ? null : option,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        pointerEvents: isOpen ? 'auto' : 'none',
        visibility: isOpen ? 'visible' : 'hidden',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,.74)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.8 }}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '78vh',
          overflowY: 'auto',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(255,255,255,.10)',
          borderRadius: '28px 28px 0 0',
          background: 'linear-gradient(180deg, #1c1e24 0%, #111216 100%)',
          boxShadow: '0 -16px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 44, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.18)' }} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,.07)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 5 }}>
              Tìm game phù hợp
            </div>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800, color: '#f4f4f5' }}>
              Bộ lọc tủ game
            </h2>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="Đóng bộ lọc"
            style={{
              width: 42,
              height: 42,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 14,
              background: 'rgba(255,255,255,.055)',
              color: '#e4e4e7',
              cursor: 'pointer',
            }}
          >
            <X size={21} strokeWidth={2.2} />
          </motion.button>
        </div>

        <div style={{ padding: '22px 20px 8px' }}>
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <section key={category.key} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.07)', color: '#d4d4d8' }}>
                    <Icon size={17} strokeWidth={2} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 750, color: '#e4e4e7' }}>{category.label}</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${category.options.length}, minmax(0,1fr))`, gap: 9 }}>
                  {category.options.map((option) => {
                    const isSelected = filter[category.key] === option;
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        aria-pressed={isSelected}
                        onClick={() => handleChipClick(category.key, option)}
                        style={{
                          minHeight: 48,
                          padding: '9px 8px',
                          borderRadius: 14,
                          border: isSelected ? '1px solid rgba(245,158,11,.78)' : '1px solid rgba(255,255,255,.08)',
                          background: isSelected ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255,255,255,.045)',
                          color: isSelected ? '#171717' : '#d4d4d8',
                          fontSize: 14,
                          fontWeight: isSelected ? 800 : 650,
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 8px 22px rgba(245,158,11,.2), inset 0 1px 0 rgba(255,255,255,.22)' : 'inset 0 1px 0 rgba(255,255,255,.025)',
                        }}
                      >
                        {option}
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default FilterSheet;
