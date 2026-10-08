import React, { useEffect, useRef, useState } from 'react';
import './CirculationCTA.css';

/**
 * Landing-page "Keep good things in circulation." banner.
 *
 * UI ONLY — sits between FeaturedCategories and FeaturedProducts.
 * No backend / routing / data changes. Temporary Unsplash photo,
 * exact Framer wordings, scroll-triggered reveal + subtle parallax.
 */

const TEMP_PHOTO =
  'https://i.pinimg.com/1200x/8c/dc/d0/8cdcd081c3c2668648d2b8d320ecb168.jpg';

const CirculationCTA: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  // Reveal once when scrolled into view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Subtle scroll parallax — headline drifts up, photo drifts down.
  // Writes --circ-p in [-0.5, 0.5]; CSS consumes it. Skipped for reduced motion.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const centerDelta = (rect.top + rect.height / 2 - vh / 2) / vh;
      const clamped = Math.max(-0.6, Math.min(0.6, centerDelta));
      el.style.setProperty('--circ-p', clamped.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`circ-section${inView ? ' circ-in' : ''}`}
      aria-label="Keep good things in circulation"
    >
      <div className="circ-container">
        <div className="circ-top">
          <figure
            className="circ-photo-wrap circ-reveal"
            style={{ '--circ-i': 0 } as React.CSSProperties}
          >
            <img
              src={TEMP_PHOTO}
              alt="Two friends wearing thrifted outfits in sunlight"
              className="circ-photo"
              loading="lazy"
              draggable={false}
            />
          </figure>

          <h2 className="circ-title">
            <span
              className="circ-line circ-reveal"
              style={{ '--circ-i': 1 } as React.CSSProperties}
            >
              <span className="circ-line__inner">Keep good things</span>
            </span>
            <span
              className="circ-line circ-reveal"
              style={{ '--circ-i': 2 } as React.CSSProperties}
            >
              <span className="circ-line__inner">
                in <span className="circ-blue">circulation.</span>
              </span>
            </span>
          </h2>
        </div>

        <div className="circ-bottom">
          <p
            className="circ-copy circ-reveal"
            style={{ '--circ-i': 3 } as React.CSSProperties}
          >
            Give pieces another life and make room for your next find. Every
            listing on ThriftFinder is one less thing made new.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CirculationCTA;
