import { ArrowRight, Tag } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthGate } from '../context/AuthGateContext';
import { useTheme } from '../context/ThemeContext';
import GradientWaves from './GradientWaves';
import './Hero.css';
import HeroBackgroundVideo from './HeroBackgroundVideo';

// Which animated backdrop the hero uses. Flip to 'waves' to bring back the
// WebGL wave field (the video layer is then not rendered at all).
const HERO_BACKGROUND = 'video' as 'video' | 'waves';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { requireAuthToSell } = useAuthGate();

  const heroRef = useRef<HTMLElement | null>(null);
  const [wavesOpacity, setWavesOpacity] = useState(1);

  useEffect(() => {
    // The scroll-fade only belongs to the wave field.
    if (HERO_BACKGROUND !== 'waves') return;

    const el = heroRef.current;
    if (!el) return;

    let raf = 0;

    const update = () => {
      raf = 0;

      const rect = el.getBoundingClientRect();
      const vh = Math.max(1, window.innerHeight);

      // Opacity is based on how far the Hero's bottom edge has moved into view.
      // - When the Hero is at the top, rect.bottom is well below the viewport => opacity ~ 1
      // - As the Hero exits, rect.bottom approaches 0 => opacity approaches 0
      const fadeStart = vh * 0.65;
      const fadeEnd = vh * 0.05;

      const raw = (rect.bottom - fadeEnd) / (fadeStart - fadeEnd);
      const opacity = Math.max(0, Math.min(1, raw));
      setWavesOpacity(Math.pow(opacity, 0.85));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const gradientProps = theme === 'dark'
    ? {
        // Monochrome wave field: white crests fading into the #02000D page.
        horizonColor: '#02000D',
        waveColor: '#FFFFFF',
        crestColor: '#FFFFFF',
        speed: 0.25,
        amplitude: 2.0,
        waveScale: 0.6,
        waveRatio: 0.85,
        fogDepth: 45,
        detail: 'medium' as const,
        brightness: 0.55,
        // Shader alpha (uOpacity)
        opacity: 0.35,
        mouseInteraction: false,
        grain: false,
        className: 'hero-waves-inner',
      }
    : {
        horizonColor: '#64748b',
        waveColor: '#285943',
        crestColor: '#f1f5f9',
        speed: 0.25,
        amplitude: 1.6,
        waveScale: 0.55,
        waveRatio: 0.85,
        fogDepth: 45,
        detail: 'medium' as const,
        brightness: 1.0,
        // Shader alpha (uOpacity)
        opacity: 0.85,
        mouseInteraction: false,
        grain: false,
        className: 'hero-waves-inner',
      };

  // UI-only hero: centered editorial layout (no photo stack).
  // Backend untouched — CTAs/routes below are unchanged.
  useEffect(() => {
    return;
  }, []);

  return (
    <section className="hero" id="home" ref={heroRef}>
      {HERO_BACKGROUND === 'video' ? (
        <HeroBackgroundVideo />
      ) : (
        <div className="hero-waves" aria-hidden="true">
          <div className="hero-waves-fade" style={{ opacity: wavesOpacity }}>
            <GradientWaves {...gradientProps} />
          </div>
        </div>
      )}
      <div className="hero-container">
        {/* Centered editorial column */}
        <div className="hero-content">

          <div className="hero-giant" aria-hidden="true">
            {'ThriftFinder'.split('').map((ch, i) => (
              <span
                key={i}
                className={`hero-giant-letter${i >= 6 ? ' hero-giant-letter--finder' : ''}`}
              >
                {ch}
              </span>
            ))}
          </div>

          <p className="hero-description">
            Discover pre-loved clothes, electronics, furniture, collectibles, and more from sellers in your local area.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/browse')}
            >
              <span>Browse Items</span>
              <ArrowRight size={18} />
            </button>

            <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (requireAuthToSell()) navigate('/create-listing')
                }}
              >
                <Tag size={18} />
                <span>Sell an Item</span>
              </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;