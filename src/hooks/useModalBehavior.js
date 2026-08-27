import { useEffect, useRef } from 'react';

let bodyLockCount = 0;
let savedBodyStyles = null;
const modalStack = [];

const lockBody = () => {
  if (typeof document === 'undefined') return;

  if (bodyLockCount === 0) {
    savedBodyStyles = {
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
    };
  }

  bodyLockCount += 1;
  document.body.style.overflow = 'hidden';
  document.body.style.overscrollBehavior = 'none';
};

const unlockBody = () => {
  if (typeof document === 'undefined') return;

  bodyLockCount = Math.max(0, bodyLockCount - 1);

  if (bodyLockCount === 0 && savedBodyStyles) {
    document.body.style.overflow = savedBodyStyles.overflow;
    document.body.style.overscrollBehavior = savedBodyStyles.overscrollBehavior;
    savedBodyStyles = null;
  }
};

/**
 * Shared modal behaviour.
 *
 * It deliberately uses a small module-level lock counter because multiple
 * portals can briefly overlap (for example announcement -> meetup). Without a
 * counter, one modal cleanup can restore body scrolling while another modal is
 * still open, leaving the UI in a confusing half-locked state.
 */
export const useModalBehavior = ({ isOpen, onEscape }) => {
  const onEscapeRef = useRef(onEscape);
  const modalIdRef = useRef(Symbol('modal'));

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const modalId = modalIdRef.current;
    modalStack.push(modalId);
    lockBody();

    const handleKeyDown = (event) => {
      const isTopMostModal = modalStack[modalStack.length - 1] === modalId;

      if (event.key === 'Escape' && isTopMostModal) {
        onEscapeRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      const index = modalStack.lastIndexOf(modalId);
      if (index >= 0) {
        modalStack.splice(index, 1);
      }

      unlockBody();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);
};
