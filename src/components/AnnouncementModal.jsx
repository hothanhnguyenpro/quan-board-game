import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';

import { APP_CONFIG } from '../config.js';
import { useModalBehavior } from '../hooks/useModalBehavior.js';

const isExternalUrl = (value) => /^https?:\/\//i.test(value);
const EMPTY_ANNOUNCEMENT = Object.freeze({});

const getAnnouncementKey = (announcement) => {
  const campaignId = String(
    announcement?.id || announcement?.title || 'default'
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .slice(0, 80);

  return `noburi:announcement:${campaignId || 'default'}:seen`;
};

const wasSeenInThisSession = (announcement) => {
  if (announcement?.showOncePerSession === false) return false;

  try {
    return window.sessionStorage.getItem(getAnnouncementKey(announcement)) === '1';
  } catch {
    return false;
  }
};

const markSeenInThisSession = (announcement) => {
  if (announcement?.showOncePerSession === false) return;

  try {
    window.sessionStorage.setItem(getAnnouncementKey(announcement), '1');
  } catch {
    // Private browsing can block storage. Local component state still prevents
    // repeated display during the current mount.
  }
};

const AnnouncementModal = ({ onOpenMeetup }) => {
  const announcement = APP_CONFIG?.announcement || EMPTY_ANNOUNCEMENT;
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(
    () => Boolean(announcement.enabled) && !wasSeenInThisSession(announcement)
  );

  useEffect(() => {
    if (isOpen) markSeenInThisSession(announcement);
  }, [announcement, isOpen]);

  const close = useCallback(() => {
    if (announcement.dismissible !== false) {
      markSeenInThisSession(announcement);
      setIsOpen(false);
    }
  }, [announcement]);

  useModalBehavior({
    isOpen: Boolean(announcement.enabled && isOpen),
    onEscape: close,
  });

  if (!announcement.enabled || typeof document === 'undefined') {
    return null;
  }

  const target = String(announcement.buttonUrl || '').trim();
  const buttonText = String(announcement.buttonText || '').trim();
  const showAction = Boolean(target && buttonText);

  const handleAction = () => {
    if (!target) return;

    markSeenInThisSession(announcement);
    setIsOpen(false);

    if (target === '#meetup') {
      onOpenMeetup?.();
      return;
    }

    if (isExternalUrl(target)) {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.assign(target);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="announcement-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        >
          <button
            type="button"
            className="announcement-backdrop"
            aria-label="Đóng thông báo"
            onClick={close}
            disabled={announcement.dismissible === false}
            tabIndex={-1}
          />

          <motion.section
            className="announcement-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={announcement.title ? 'announcement-title' : undefined}
            aria-describedby={announcement.message ? 'announcement-message' : undefined}
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.97 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 280, damping: 24 }
            }
          >
            {announcement.dismissible !== false && (
              <button
                type="button"
                className="announcement-close"
                aria-label="Đóng thông báo"
                onClick={close}
              >
                <X size={18} />
              </button>
            )}

            <motion.div
              className="announcement-logo-wrap"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      rotate: [0, -4, 4, -2, 2, 0],
                      y: [0, -2, 0],
                    }
              }
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 1.7,
                      repeat: Infinity,
                      repeatDelay: 3.2,
                      ease: 'easeInOut',
                    }
              }
            >
              <img
                src={APP_CONFIG?.brand?.logoUrl || '/logo.png'}
                alt=""
                className="announcement-logo"
              />
            </motion.div>

            {announcement.title && (
              <h2 id="announcement-title">{announcement.title}</h2>
            )}

            {announcement.message && (
              <p id="announcement-message" className="announcement-message">
                {announcement.message}
              </p>
            )}

            {showAction && (
              <button
                type="button"
                className="announcement-action"
                onClick={handleAction}
              >
                <span>{buttonText}</span>
                <ArrowRight size={17} />
              </button>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AnnouncementModal;
