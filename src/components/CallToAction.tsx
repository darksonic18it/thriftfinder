import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Store, PackageCheck } from 'lucide-react';
import './CallToAction.css';

const CallToAction: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="cta-section">
      <div className="cta-container">
        {/* How it works */}
        <div className="how-it-works">
          <div className="how-header">
            <h2 className="how-title">How it works</h2>
            <p className="how-subtitle">
              A simple way to find something you’ll use, and sell what you don’t need.
            </p>
          </div>

          <div className="steps">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-content">
                <div className="step-title">Find an item</div>
                <p className="step-description">Browse secondhand listings from sellers near you.</p>
              </div>
              <PackageCheck size={18} className="step-icon" aria-hidden="true" />
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-content">
                <div className="step-title">Choose what you like</div>
                <p className="step-description">Check the item name, condition, price, and location.</p>
              </div>
              <PackageCheck size={18} className="step-icon" aria-hidden="true" />
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-content">
                <div className="step-title">Reserve & arrange pickup</div>
                <p className="step-description">Use the listing page to reserve and arrange the next step.</p>
              </div>
              <PackageCheck size={18} className="step-icon" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Community / sustainability */}
        <div className="community">
          <div className="community-card">
            <div className="community-title">Give Pre-Loved Items a Second Life</div>
            <p className="community-copy">
              Keep useful items in the community, discover better deals, and make secondhand shopping easier.
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="final-cta">
          <div className="final-card">
            <div className="final-content">
              <h2 className="final-title">Ready to find your next great find?</h2>
              <p className="final-description">
                Browse what’s available near you—or list your own pre-loved items to help someone else find theirs.
              </p>

              <div className="cta-actions">
                <button
                  type="button"
                  className="cta-btn-primary"
                  onClick={() => navigate('/browse')}
                >
                  <ShoppingBag size={20} />
                  <span>Browse Items</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  className="cta-btn-secondary"
                  onClick={() => navigate('/create-listing')}
                >
                  <Store size={20} />
                  <span>Sell an Item</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
