import { ArrowRight, Tag } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthGate } from '../context/AuthGateContext';
import './Hero.css';
import HeroBackgroundVideo from './HeroBackgroundVideo';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { requireAuthToSell } = useAuthGate();

  // UI-only hero: centered editorial layout (no photo stack).
  // Backend untouched — CTAs/routes below are unchanged.
  return (
    <section className="hero" id="home">
      <HeroBackgroundVideo />
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