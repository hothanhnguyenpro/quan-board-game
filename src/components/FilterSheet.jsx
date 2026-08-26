import React from 'react';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';

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
      hint: 'Bạn có bao nhiêu thời gian?',
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
      hint: 'Có bao nhiêu người chơi?',
      options: [
        '2',
        '3-4',
        'Nhóm đông',
      ],
    },
  ];

  const selectFilter = (
    key,
    option
  ) => {
    const current =
      filter?.[key];

    onFilterChange?.({
      ...(filter || {}),
      [key]:
        current === option
          ? null
          : option,
    });
  };

  const clearAll = () => {
    onFilterChange?.({});
  };

  const hasFilters = Boolean(
    filter?.time ||
      filter?.players
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="filter-overlay">
          <motion.div
            className="filter-backdrop"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={onClose}
          />

          <motion.div
            className="filter-sheet"
            initial={{
              y: '100%',
            }}
            animate={{
              y: 0,
            }}
            exit={{
              y: '100%',
            }}
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 32,
            }}
          >
            <div className="filter-handle" />

            <div className="filter-header">
              <div>
                <span className="eyebrow">
                  LỌC TỦ GAME
                </span>

                <h2>
                  Tìm game phù hợp
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="filter-close"
                aria-label="Đóng bộ lọc"
              >
                <X size={20} />
              </button>
            </div>

            <div className="filter-body">
              {categories.map(
                (category) => {
                  const Icon =
                    category.icon;

                  return (
                    <section
                      key={
                        category.key
                      }
                      className="filter-group"
                    >
                      <div className="filter-group-title">
                        <span className="filter-group-icon">
                          <Icon size={17} />
                        </span>

                        <div>
                          <h3>
                            {
                              category.label
                            }
                          </h3>

                          <p>
                            {category.hint}
                          </p>
                        </div>
                      </div>

                      <div className="filter-options">
                        {category.options.map(
                          (
                            option
                          ) => {
                            const active =
                              filter?.[
                                category.key
                              ] ===
                              option;

                            return (
                              <motion.button
                                key={
                                  option
                                }
                                type="button"
                                whileTap={{
                                  scale: 0.96,
                                }}
                                aria-pressed={
                                  active
                                }
                                className={
                                  active
                                    ? 'filter-option active'
                                    : 'filter-option'
                                }
                                onClick={() =>
                                  selectFilter(
                                    category.key,
                                    option
                                  )
                                }
                              >
                                <span>
                                  {
                                    option
                                  }
                                </span>

                                {active && (
                                  <span className="filter-check">
                                    <Check
                                      size={
                                        12
                                      }
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

            <div className="filter-footer">
              <button
                type="button"
                onClick={clearAll}
                disabled={
                  !hasFilters
                }
                className="filter-clear"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FilterSheet;