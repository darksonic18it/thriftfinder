import { useEffect, useRef, useState } from 'react';

/**
 * Instagram-style hide-on-scroll-down / show-on-scroll-up.
 * Mirrors Navbar / AppNavbar timing so sticky bars move together:
 * DELTA 10px, COOLDOWN 140ms, rAF-throttled, reduced-motion safe.
 */
const SCROLL_DELTA_PX = 10;
const TOGGLE_COOLDOWN_MS = 140;

export function useHideOnScroll(disabled = false): boolean {
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(hidden);

  useEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);

  useEffect(() => {
    if (disabled) {
      hiddenRef.current = false;
      setHidden(false);
      return;
    }
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setHidden(false);
      return;
    }

    let lastScrollY = window.scrollY;
    let lastToggleAt = 0;
    let rafId: number | null = null;

    const onScroll = () => {
      if (rafId !== null) return;

      rafId = window.requestAnimationFrame(() => {
        rafId = null;

        const currentY = window.scrollY;
        const deltaY = currentY - lastScrollY;
        lastScrollY = currentY;

        if (Math.abs(deltaY) < SCROLL_DELTA_PX) return;

        const now = performance.now();
        if (now - lastToggleAt < TOGGLE_COOLDOWN_MS) return;

        if (deltaY > 0 && currentY > 0) {
          if (!hiddenRef.current) {
            // Don't hide while the user is typing in the sticky bar.
            const active = document.activeElement as HTMLElement | null;
            if (active && active.closest && active.closest('.browse-controls')) return;
            hiddenRef.current = true;
            setHidden(true);
            lastToggleAt = now;
          }
        } else if (deltaY < 0) {
          if (hiddenRef.current) {
            hiddenRef.current = false;
            setHidden(false);
            lastToggleAt = now;
          }
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [disabled]);

  return hidden;
}

export default useHideOnScroll;
