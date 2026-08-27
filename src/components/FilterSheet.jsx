import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Clock3, UsersRound, X } from 'lucide-react';

import { useModalBehavior } from '../hooks/useModalBehavior.js';

const FILTER_CATEGORIES = [
  {
    label: 'Thời gian',
    key: 'time',
    icon: Clock3,
    hint: 'Bạn có bao nhiêu thời gian?',
    options: ['<15 phút', '30-60 phút', '45-90 phút'],
  },
  {
    label: 'Số người',
    key: 'players',
    icon: UsersRound,
    hint: 'Nhóm đông = game hỗ trợ từ 5 người trở lên',
    options: ['2', '3-4', 'Nhóm đông'],
  },
];

const FilterSheet = ({
  isOpen,
  onClose,
  filter = {},
  onFilterChange,
}) => {
  const reduceMotion = useReducedMotion();

  useModalBehavior({
    isOpen,
    onEscape: onClose,
  });

  const handleSelect = (key, option) => {
    const currentValue = filter?.[key] ?? null;

    onFilterChange?.({
      ...filter,
      [key]: currentValue === option ? null : option,
    });
  };

  const handleClear = () => {
    onFilterChange?.({});
  };

  const hasFilters = Boolean(filter?.time || filter?.players);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="filter-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        >
          <button
            type="button"
            className="filter-backdrop"
            aria-label="Đóng bộ lọc"
            onClick={onClose}
          />

          <motion.section
            className="filter-sheet"
            initial={reduceMotion ? false : { y: '100%', opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { y: 0 } : { y: '100%', opacity: 0.92 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 360, damping: 32, mass: 0.82 }
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="filter-handle" aria-hidden="true" />

            <header className="filter-header">
              <div>
                <span className="eyebrow">LỌC TỦ GAME</span>
                <h2 id="filter-sheet-title">Tìm game phù hợp</h2>
              </div>

              <button
                type="button"
                className="filter-close"
                onClick={onClose}
                aria-label="Đóng bộ lọc"
              >
                <X size={20} />
              </button>
            </header>

            <div className="filter-body">
              {FILTER_CATEGORIES.map((category) => {
                const Icon = category.icon;

                return (
                  <section key={category.key} className="filter-group">
                    <div className="filter-group-title">
                      <span className="filter-group-icon" aria-hidden="true">
                        <Icon size={17} />
                      </span>

                      <div>
                        <h3>{category.label}</h3>
                        <p>{category.hint}</p>
                      </div>
                    </div>

                    <div className="filter-options">
                      {category.options.map((option) => {
                        const active = filter?.[category.key] === option;

                        return (
                          <motion.button
                            key={option}
                            type="button"
                            className={active ? 'filter-option active' : 'filter-option'}
                            aria-pressed={active}
                            onClick={() => handleSelect(category.key, option)}
                            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                          >
                            <span>{option}</span>
                            {active && (
                              <span className="filter-check" aria-hidden="true">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <footer className="filter-footer">
              <button
                type="button"
                className="filter-clear"
                onClick={handleClear}
                disabled={!hasFilters}
              >
                Xóa tất cả bộ lọc
              </button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FilterSheet;
