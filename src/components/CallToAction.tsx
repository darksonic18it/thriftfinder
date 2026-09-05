import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Store } from 'lucide-react';
import './CallToAction.css';

const CallToAction: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="cta-section">
      <div className="cta-container">
        <div className="cta-card">
          <div className="cta-content">
            <h2 className="cta-title">
              Your next treasure is waiting
            </h2>
            <p className="cta-description">
              Whether you're hunting for unique finds or ready to give your pre-loved items a new home,
              ThriftFinder connects you with a community that values sustainability and style.
            </p>
            <div className="cta-actions">
              <button
                type="button"
                className="btn-cta-primary"
                onClick={() => navigate('/browse')}
              >
                <ShoppingBag size={20} />
                <span>Browse Items</span>
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="btn-cta-secondary"
                onClick={() => navigate('/create-listing')}
              >
                <Store size={20} />
                <span>Start Selling</span>
              </button>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="cta-background">
            <div className="cta-shape shape-1"></div>
            <div className="cta-shape shape-2"></div>
            <div className="cta-grid"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
