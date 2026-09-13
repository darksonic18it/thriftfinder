import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Tag, Heart, MapPin } from 'lucide-react';

import GradientWaves from './GradientWaves';
import { useTheme } from '../context/ThemeContext';

import './Hero.css';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const heroRef = useRef<HTMLElement | null>(null);
  const [wavesOpacity, setWavesOpacity] = useState(1);


  useEffect(() => {
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
        horizonColor: '#64748b',
        waveColor: '#285943',
        crestColor: '#f1f5f9',
        speed: 0.25,
        amplitude: 2.0,
        waveScale: 0.6,
        waveRatio: 0.85,
        fogDepth: 45,
        detail: 'medium' as const,
        brightness: 1.1,
        // Shader alpha (uOpacity)
        opacity: 0.8,
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

  return (
    <section className="hero" id="home" ref={heroRef}>
      <div className="hero-waves" aria-hidden="true">
        <div className="hero-waves-fade" style={{ opacity: wavesOpacity }}>
          <GradientWaves {...gradientProps} />
        </div>
      </div>
      <div className="hero-container">
        {/* Left Column: Text & CTAs */}
        <div className="hero-content">
          <h1 className="hero-title">
            Find Great{' '}
            <span className="text-gradient">Secondhand</span>
            <br />
            Items Near You
          </h1>

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
              onClick={() => navigate('/create-listing')}
            >
              <Tag size={18} />
              <span>Sell an Item</span>
            </button>
          </div>
        </div>

        {/* Right Column: Visual */}
        <div className="hero-visual">
          <div className="hero-card-wrap">
            {/* Main Hero Listing Card (demo) */}
            <div className="hero-card" role="group" aria-label="Featured secondhand listing (demo)">
              <div className="image-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800&auto=format&fit=crop"
                  alt="Oversized denim jacket listing photo"
                  className="card-image"
                />

                <button
                  type="button"
                  className="like-btn"
                  aria-label="Favorite item"
                >
                  <Heart size={18} color="#ec4899" fill="#ec4899" />
                </button>
              </div>

              <div className="card-info">
                <div className="card-header">
                  <h3>Oversized Denim Jacket</h3>
                  <span className="card-price">₱1,250</span>
                </div>

                <p className="card-meta">Excellent • Size L • Cagayan de Oro</p>
              </div>
            </div>

            {/* Local Discovery Card (demo) */}
            <aside className="local-info-card" aria-label="Nearby listings demo location">
              <MapPin size={16} className="local-icon" />
              <div className="local-info-text">
                <div className="local-info-title">Cagayan de Oro</div>
                <div className="local-info-subtitle">Nearby listings (demo)</div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
