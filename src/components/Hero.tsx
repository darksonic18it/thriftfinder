import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Tag, Heart, MapPin } from 'lucide-react';
import './Hero.css';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="hero" id="home">
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
