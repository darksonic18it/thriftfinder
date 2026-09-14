import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
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

  useEffect(() => {
    const wrap = heroRef.current?.querySelector<HTMLElement>('.hero-card-wrap');
    if (!wrap) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const cardEls = Array.from(
      wrap.querySelectorAll<HTMLElement>('.hero-card[data-stack-index]')
    );

    if (cardEls.length !== 3) return;

    const byStackIndex = new Map<number, HTMLElement>();
    cardEls.forEach((el) => {
      const raw = el.dataset.stackIndex;
      if (!raw) return;
      const idx = Number(raw);
      if (Number.isNaN(idx)) return;
      byStackIndex.set(idx, el);
    });

    if (byStackIndex.size !== 3) return;

    const pos = [
      { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 3 },
      { x: 18, y: 14, rotation: 4, scale: 0.96, opacity: 0.9, zIndex: 2 },
      { x: 36, y: 28, rotation: 8, scale: 0.92, opacity: 0.75, zIndex: 1 },
    ] as const;

    const orderRef = { current: [0, 1, 2] as number[] };

    // Align initial state with the CSS fanned resting deck.
    const setCardToPosition = (cardEl: HTMLElement, position: 0 | 1 | 2) => {
      gsap.set(cardEl, {
        x: pos[position].x,
        y: pos[position].y,
        rotation: pos[position].rotation,
        scale: pos[position].scale,
        opacity: pos[position].opacity,
        zIndex: pos[position].zIndex,
      });
    };

    setCardToPosition(byStackIndex.get(orderRef.current[0])!, 0);
    setCardToPosition(byStackIndex.get(orderRef.current[1])!, 1);
    setCardToPosition(byStackIndex.get(orderRef.current[2])!, 2);

    let intervalId: number | null = null;
    let isCycling = false;

    const cycle = () => {
      if (isCycling) return;

      const [front, middle, back] = orderRef.current;
      const frontEl = byStackIndex.get(front);
      const middleEl = byStackIndex.get(middle);
      const backEl = byStackIndex.get(back);

      if (!frontEl || !middleEl || !backEl) return;

      isCycling = true;

      // Ensure stacking order before tweening.
      gsap.set(frontEl, { zIndex: pos[2].zIndex });
      gsap.set(middleEl, { zIndex: pos[0].zIndex });
      gsap.set(backEl, { zIndex: pos[1].zIndex });

      let completed = 0;
      const onTweenComplete = () => {
        completed += 1;
        if (completed !== 3) return;
        orderRef.current = [middle, back, front];
        isCycling = false;
      };

      gsap.to(frontEl, {
        x: pos[2].x,
        y: pos[2].y,
        rotation: pos[2].rotation,
        scale: pos[2].scale,
        opacity: pos[2].opacity,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: onTweenComplete,
      });

      gsap.to(middleEl, {
        x: pos[0].x,
        y: pos[0].y,
        rotation: pos[0].rotation,
        scale: pos[0].scale,
        opacity: pos[0].opacity,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: onTweenComplete,
      });

      gsap.to(backEl, {
        x: pos[1].x,
        y: pos[1].y,
        rotation: pos[1].rotation,
        scale: pos[1].scale,
        opacity: pos[1].opacity,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: onTweenComplete,
      });
    };

    const start = () => {
      if (intervalId != null) return;
      intervalId = window.setInterval(cycle, 3500);
    };

    const pause = () => {
      if (intervalId == null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const handleEnter = () => pause();
    const handleLeave = () => start();

    wrap.addEventListener('mouseenter', handleEnter);
    wrap.addEventListener('mouseleave', handleLeave);

    start();

    return () => {
      pause();
      wrap.removeEventListener('mouseenter', handleEnter);
      wrap.removeEventListener('mouseleave', handleLeave);
      gsap.killTweensOf(cardEls);
    };
  }, []);

  const heroCards = [
    {
      title: 'Oversized Denim Jacket',
      price: '₱1,250',
      meta: 'Excellent • Size L • Cagayan de Oro',
      image:
        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800&auto=format&fit=crop',
    },
    {
      title: 'Nike Sneakers',
      price: '₱1,200',
      meta: 'Like New • Size 9 • Lapasan',
      image:
        'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=800&auto=format&fit=crop',
    },
    {
      title: 'Y2K Shoulder Bag',
      price: '₱650',
      meta: 'Good • Carmen',
      image:
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop',
    },
  ];

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
            {heroCards.map((card, i) => (
              <div
                key={card.title}
                className="hero-card"
                data-stack-index={i}
                role="group"
                aria-label={`Featured secondhand listing (demo) ${i + 1}`}
              >
                <div className="image-wrapper">
                  <img src={card.image} alt={card.title} className="card-image" />

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
                    <h3>{card.title}</h3>
                    <span className="card-price">{card.price}</span>
                  </div>

                  <p className="card-meta">{card.meta}</p>
                </div>
              </div>
            ))}

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
