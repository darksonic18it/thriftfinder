import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Tag, ShieldCheck, Heart } from 'lucide-react';
import './Hero.css';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="hero" id="home">
      <div className="hero-container">
        {/* Left Column: Text & CTAs */}
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} className="badge-icon" />
            <span>The #1 Local Secondhand Marketplace</span>
          </div>

          <h1 className="hero-title">
            Discover Rare Finds & <span className="text-gradient">Unique Vintage</span> Gems
          </h1>

          <p className="hero-description">
            ThriftFinder connects you with thousands of verified vintage clothes,
            retro electronics, and unique collectibles. Sustainable shopping made effortless.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/browse')}
            >
              <span>Start Exploring</span>
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

          {/* Social Proof / Trust Highlights */}
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">50k+</span>
              <span className="stat-label">Unique Items</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">12k+</span>
              <span className="stat-label">Happy Thrifters</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">4.9/5</span>
              <span className="stat-label">Community Rating</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Composite */}
        <div className="hero-visual">
          <div className="visual-background-blob"></div>

          {/* Main Hero Card */}
          <div className="hero-card main-card">
            <div className="image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800&auto=format&fit=crop"
                alt="Vintage fashion collection"
                className="card-image"
              />
              <span className="tag-vintage">Vintage 90s</span>
              <button className="like-btn" aria-label="Favorite item">
                <Heart size={18} color="#ec4899" fill="#ec4899" />
              </button>
            </div>
            <div className="card-info">
              <div className="card-header">
                <h3>Oversized Denim Jacket</h3>
                <span className="card-price">$38.00</span>
              </div>
              <p className="card-meta">Condition: Excellent • Size L</p>
            </div>
          </div>

          {/* Floating Feature Card 1 */}
          <div className="floating-card float-top">
            <div className="floating-icon check-icon">
              <ShieldCheck size={20} color="#10b981" />
            </div>
            <div className="floating-text">
              <span className="floating-title">100% Verified</span>
              <span className="floating-desc">Authenticity guaranteed</span>
            </div>
          </div>

          {/* Floating Feature Card 2 */}
          <div className="floating-card float-bottom">
            <div className="floating-preview">
              <img
                src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=200&auto=format&fit=crop"
                alt="Polaroid Camera"
              />
            </div>
            <div className="floating-text">
              <span className="floating-title">Vintage Polaroid</span>
              <span className="floating-price">$45.00 <span className="discount">-40%</span></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
