import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CalendarDays, RefreshCw, Search, X } from 'lucide-react';

import { APP_CONFIG } from '../config.js';
import { useModalBehavior } from '../hooks/useModalBehavior.js';
import {
  isDateInCurrentWeek,
  parseLocalDate,
} from '../utils/dateUtils.js';
import { normalizeText } from '../utils/gameUtils.js';
import MeetupCard from './MeetupCard.jsx';
import MeetupRegistrationForm from './MeetupRegistrationForm.jsx';

const clean = (value) => String(value ?? '').trim();

const normalizeStatus = (value) => {
  const status = clean(value).toLowerCase();
  return ['active', 'full', 'closed', 'cancelled'].includes(status)
    ? status
    : 'closed';
};

const MeetupSheet = ({
  isOpen,
  onClose,
  games = [],
  meetups = [],
  loading = false,
  error = '',
  onRetry,
  onRegistrationSuccess,
  onViewRules,
}) => {
  const config = APP_CONFIG?.meetup || {};
  const registrationConfig = config.registration || {};
  const reduceMotion = useReducedMotion();
  const [selectedMeetup, setSelectedMeetup] = useState(null);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [meetupQuery, setMeetupQuery] = useState('');

  const gameById = useMemo(() => {
    return new Map(
      games
        .map((game) => [clean(game?.id), game])
        .filter(([id]) => Boolean(id))
    );
  }, [games]);

  const showOnlyCurrentWeek = config.showOnlyCurrentWeek !== false;

  const { preparedMeetups, invalidMeetupCount } = useMemo(() => {
    const enrichedMeetups = meetups.map((meetup) => {
      const gameId = clean(meetup?.gameId);
      const game = gameById.get(gameId) || null;
      const date = parseLocalDate(meetup?.startTime);

      return {
        ...meetup,
        status: normalizeStatus(meetup?.status),
        game,
        date,
      };
    });

    const validMeetups = enrichedMeetups.filter(
      (meetup) => Boolean(meetup.game) && Boolean(meetup.date)
    );

    const visibleMeetups = showOnlyCurrentWeek
      ? validMeetups.filter((meetup) => isDateInCurrentWeek(meetup.date))
      : validMeetups;

    return {
      preparedMeetups: [...visibleMeetups].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      ),
      invalidMeetupCount: enrichedMeetups.length - validMeetups.length,
    };
  }, [gameById, meetups, showOnlyCurrentWeek]);

  const filteredMeetups = useMemo(() => {
    const query = normalizeText(meetupQuery);
    if (!query) return preparedMeetups;

    return preparedMeetups.filter((meetup) =>
      normalizeText(
        [meetup.game?.name, meetup.gameName, meetup.leaderName, meetup.room]
          .filter(Boolean)
          .join(' ')
      ).includes(query)
    );
  }, [meetupQuery, preparedMeetups]);

  const handleClose = useCallback(() => {
    if (registrationBusy) return;

    setSelectedMeetup(null);
    setMeetupQuery('');
    setRegistrationBusy(false);
    onClose?.();
  }, [onClose, registrationBusy]);

  useModalBehavior({
    isOpen: Boolean(isOpen && config.enabled),
    onEscape: handleClose,
  });

  const handleBackToList = useCallback(() => {
    if (registrationBusy) return;

    setRegistrationBusy(false);
    setSelectedMeetup(null);
  }, [registrationBusy]);

  const openRegistration = useCallback(
    (meetup) => {
      if (
        normalizeStatus(meetup?.status) !== 'active' ||
        registrationConfig.enabled !== true
      ) {
        return;
      }

      setRegistrationBusy(false);
      setSelectedMeetup(meetup);
    },
    [registrationConfig.enabled]
  );

  if (!config.enabled || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="meetup-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        >
          <button
            type="button"
            className="meetup-backdrop"
            aria-label="Đóng ghép tụ"
            onClick={handleClose}
            disabled={registrationBusy}
          />

          <motion.section
            className="meetup-sheet"
            initial={reduceMotion ? false : { y: '100%', opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { y: 0 } : { y: '100%', opacity: 0.96 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 330,
                    damping: 30,
                    mass: 0.86,
                  }
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="meetup-title"
          >
            <header className="meetup-header">
              <div className="meetup-header-copy">
                <span className="eyebrow">{config.eyebrow || 'GHÉP TỤ'}</span>
                <h2 id="meetup-title">
                  {config.title || 'Những tụ game tuần này'}
                </h2>
                {config.description && <p>{config.description}</p>}
              </div>

              <button
                type="button"
                className="meetup-close"
                onClick={handleClose}
                aria-label="Đóng ghép tụ"
                disabled={registrationBusy}
              >
                <X size={20} />
              </button>
            </header>

            {selectedMeetup ? (
              <MeetupRegistrationForm
                meetup={selectedMeetup}
                config={registrationConfig}
                onBack={handleBackToList}
                onSuccess={onRegistrationSuccess}
                onBusyChange={setRegistrationBusy}
              />
            ) : (
              <div className="meetup-content">
                {loading && (
                  <div className="meetup-state" role="status" aria-live="polite">
                    <div className="loading-spinner" aria-hidden="true" />
                    <p>Đang tải lịch ghép tụ...</p>
                  </div>
                )}

                {!loading && error && (
                  <div className="meetup-state meetup-error" role="alert">
                    <AlertCircle size={26} aria-hidden="true" />
                    <h3>Không thể tải lịch</h3>
                    <p>{error || config.loadErrorMessage}</p>
                    {onRetry && (
                      <button type="button" onClick={onRetry}>
                        <RefreshCw size={15} />
                        Thử lại
                      </button>
                    )}
                  </div>
                )}

                {!loading && !error && preparedMeetups.length === 0 && (
                  <div className="meetup-state">
                    <CalendarDays size={32} aria-hidden="true" />
                    <h3>{config.emptyMessage || 'Chưa có tụ game tuần này.'}</h3>
                    <p>Khi có lịch phù hợp, tụ game sẽ xuất hiện tại đây.</p>
                  </div>
                )}

                {!loading && !error && preparedMeetups.length > 0 && (
                  <label className="meetup-filter">
                    <Search size={17} aria-hidden="true" />
                    <input
                      type="search"
                      value={meetupQuery}
                      onChange={(event) => setMeetupQuery(event.target.value)}
                      placeholder="Tìm tên leader, game hoặc phòng..."
                      aria-label="Tìm tụ theo tên leader, game hoặc phòng"
                    />
                  </label>
                )}

                {!loading && !error && filteredMeetups.length > 0 && (
                  <div className="meetup-list">
                    {filteredMeetups.map((meetup, index) => (
                      <MeetupCard
                        key={
                          clean(meetup.id) ||
                          `${clean(meetup.gameId)}-${clean(meetup.startTime)}-${index}`
                        }
                        meetup={meetup}
                        statusLabel={
                          config.statusLabels?.[meetup.status] ||
                          config.statusLabels?.closed ||
                          'Đã đóng đăng ký'
                        }
                        registrationEnabled={registrationConfig.enabled === true}
                        registerLabel={registrationConfig.openButtonText || 'Đăng ký'}
                        onRegister={openRegistration}
                        onViewRules={onViewRules}
                      />
                    ))}
                  </div>
                )}

                {!loading &&
                  !error &&
                  preparedMeetups.length > 0 &&
                  filteredMeetups.length === 0 && (
                    <div className="meetup-state">
                      <Search size={28} aria-hidden="true" />
                      <h3>Không thấy tụ phù hợp</h3>
                      <p>Thử tìm bằng tên leader, tên game hoặc phòng khác.</p>
                    </div>
                  )}

                {!loading && !error && invalidMeetupCount > 0 && (
                  <p className="meetup-data-note">
                    {invalidMeetupCount} lịch bị ẩn vì thiếu gameId hợp lệ hoặc thời gian
                    không đúng định dạng.
                  </p>
                )}
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MeetupSheet;
