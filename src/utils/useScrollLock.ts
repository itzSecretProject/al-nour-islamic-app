import { useEffect } from 'react';
import { useUI } from '../context/UIContext';

// Locks the underlying page scroll while a full-screen modal/sheet is mounted,
// so touch/scroll gestures don't bleed through to the main content behind it,
// and registers the modal so the bottom nav hides while it's open.
export function useScrollLock() {
  const { pushModal, popModal } = useUI();
  useEffect(() => {
    const main = document.querySelector('main') as HTMLElement | null;
    const prevMain = main?.style.overflow ?? '';
    const prevBody = document.body.style.overflow;
    if (main) main.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    pushModal();
    return () => {
      if (main) main.style.overflow = prevMain;
      document.body.style.overflow = prevBody;
      popModal();
    };
  }, [pushModal, popModal]);
}
