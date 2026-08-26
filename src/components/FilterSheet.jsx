import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock3,
  UsersRound,
  X,
  Check,
} from 'lucide-react';

const FilterSheet = ({
  isOpen,
  onClose,
  filter = {},
  onFilterChange,
}) => {
  const categories = [
    {
      label: 'Thời gian',
      key: 'time',
      icon: Clock3,
      options: [
        '<15 phút',
        '30-60 phút',
        '45-90 phút',
      ],
    },
    {
      label: 'Số người',
      key: 'players',
      icon: UsersRound,
      options: [
        '2',
        '3-4',
        'Nhóm đông',
      ],
    },
  ];

  const handleChipClick = (key, option) => {
    const isCurrentlySelected =
      filter?.[key] === option;

    onFilterChange({
      ...(filter || {}),
      [key]: isCurrentlySelected
        ? null
        : option,
    });
  };

  const handleClearAll = () => {
    onFilterChange({});
  };

  const hasActiveFilters =
    Boolean(filter?.time || filter?.players);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'rgba(0, 0, 0, 0.76)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter:
                'blur(8px)',
            }}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 32,
              mass: 0.8,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxHeight: '82vh',
              overflowY: 'auto',
              boxSizing: 'border-box',

              paddingBottom:
                'calc(24px + env(safe-area-inset-bottom))',

              background:
                'linear-gradient(180deg, #1c1e24 0%, #111216 100%)',

              borderTop:
                '1px solid rgba(255,255,255,0.10)',

              borderRadius:
                '28px 28px 0 0',

              boxShadow:
                '0 -18px 60px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 10,
                paddingBottom: 4,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 999,
                  background:
                    'rgba(255,255,255,0.18)',
                }}
              />
            </div>

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: 16,
                padding:
                  '18px 20px 16px',
                borderBottom:
                  '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing:
                      '0.14em',
                    textTransform:
                      'uppercase',
                    color: '#a1a1aa',
                    marginBottom: 6,
                  }}
                >
                  Tìm game phù hợp
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    lineHeight: 1.1,
                    fontWeight: 800,
                    color: '#f4f4f5',
                  }}
                >
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
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  border:
                    '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 14,
                  background:
                    'rgba(255,255,255,0.055)',
                  color: '#e4e4e7',
                  cursor: 'pointer',
                }}
              >
                <X
                  size={21}
                  strokeWidth={2.2}
                />
              </motion.button>
            </div>

            {/* Content */}
            <div
              style={{
                padding:
                  '22px 20px 8px',
              }}
            >
              {categories.map(
                (category) => {
                  const Icon =
                    category.icon;

                  return (
                    <section
                      key={category.key}
                      style={{
                        marginBottom: 28,
                      }}
                    >
                      {/* Section title */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            display: 'grid',
                            placeItems:
                              'center',
                            borderRadius: 11,
                            background:
                              'rgba(255,255,255,0.055)',
                            border:
                              '1px solid rgba(255,255,255,0.08)',
                            color: '#d4d4d8',
                          }}
                        >
                          <Icon
                            size={17}
                            strokeWidth={2.1}
                          />
                        </div>

                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 15,
                              fontWeight: 800,
                              color:
                                '#e4e4e7',
                            }}
                          >
                            {category.label}
                          </h3>

                          {category.key ===
                            'players' && (
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                color:
                                  '#8f8f98',
                              }}
                            >
                              Nhóm đông =
                              từ 5 người
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Options */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            `repeat(${category.options.length}, minmax(0, 1fr))`,
                          gap: 9,
                        }}
                      >
                        {category.options.map(
                          (option) => {
                            const isSelected =
                              filter?.[
                                category.key
                              ] === option;

                            return (
                              <motion.button
                                key={option}
                                type="button"
                                whileTap={{
                                  scale: 0.96,
                                }}
                                aria-pressed={
                                  isSelected
                                }
                                onClick={() =>
                                  handleChipClick(
                                    category.key,
                                    option
                                  )
                                }
                                style={{
                                  position:
                                    'relative',
                                  minHeight: 50,
                                  padding:
                                    '9px 8px',
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  justifyContent:
                                    'center',
                                  textAlign:
                                    'center',

                                  borderRadius:
                                    15,

                                  border:
                                    isSelected
                                      ? '1px solid rgba(245,158,11,0.82)'
                                      : '1px solid rgba(255,255,255,0.08)',

                                  background:
                                    isSelected
                                      ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                                      : 'rgba(255,255,255,0.045)',

                                  color:
                                    isSelected
                                      ? '#171717'
                                      : '#d4d4d8',

                                  fontSize: 14,

                                  fontWeight:
                                    isSelected
                                      ? 800
                                      : 650,

                                  cursor:
                                    'pointer',

                                  boxShadow:
                                    isSelected
                                      ? '0 8px 24px rgba(245,158,11,0.20), inset 0 1px 0 rgba(255,255,255,0.24)'
                                      : 'inset 0 1px 0 rgba(255,255,255,0.025)',

                                  transition:
                                    'all 160ms ease',
                                }}
                              >
                                {option}

                                {isSelected && (
                                  <span
                                    style={{
                                      position:
                                        'absolute',
                                      top: 7,
                                      right: 8,
                                      width: 17,
                                      height: 17,
                                      display:
                                        'grid',
                                      placeItems:
                                        'center',
                                      borderRadius:
                                        '50%',
                                      background:
                                        'rgba(255,255,255,0.24)',
                                    }}
                                  >
                                    <Check
                                      size={11}
                                      strokeWidth={
                                        3
                                      }
                                    />
                                  </span>
                                )}
                              </motion.button>
                            );
                          }
                        )}
                      </div>
                    </section>
                  );
                }
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding:
                  '2px 20px 0',
              }}
            >
              <motion.button
                type="button"
                whileTap={{
                  scale: 0.98,
                }}
                onClick={handleClearAll}
                disabled={!hasActiveFilters}
                style={{
                  width: '100%',
                  minHeight: 48,
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  gap: 8,
                  borderRadius: 14,
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                  background:
                    hasActiveFilters
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(255,255,255,0.025)',
                  color:
                    hasActiveFilters
                      ? '#e4e4e7'
                      : '#66666f',
                  fontSize: 14,
                  fontWeight: 750,
                  cursor:
                    hasActiveFilters
                      ? 'pointer'
                      : 'default',
                  opacity:
                    hasActiveFilters
                      ? 1
                      : 0.6,
                }}
              >
                <X size={17} />
                Xóa tất cả bộ lọc
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FilterSheet;