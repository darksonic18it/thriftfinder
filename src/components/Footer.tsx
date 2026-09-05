import React from 'react';
import { ShoppingBag, Mail } from 'lucide-react';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Top Footer Section */}
        <div className="footer-top">
          {/* Brand Column */}
          <div className="footer-brand">
            <a href="/" className="footer-logo">
              <div className="footer-logo-icon">
                <ShoppingBag size={22} color="#ffffff" />
              </div>
              <span className="footer-logo-text">
                Thrift<span className="logo-accent">Finder</span>
              </span>
            </a>
            <p className="footer-description">
              Your trusted marketplace for discovering unique secondhand treasures and giving pre-loved items a new home. Sustainable shopping made easy.
            </p>
            {/* Social Links */}
            <div className="footer-social">
              <a href="#facebook" className="social-link" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#instagram" className="social-link" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a href="#twitter" className="social-link" aria-label="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#email" className="social-link" aria-label="Email">
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="footer-nav">
            <div className="footer-column">
              <h4 className="footer-heading">Navigate</h4>
              <ul className="footer-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#browse">Browse</a></li>
                <li><a href="#sell">Sell</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-heading">Categories</h4>
              <ul className="footer-links">
                <li><a href="#clothing">Clothing</a></li>
                <li><a href="#shoes">Shoes</a></li>
                <li><a href="#accessories">Accessories</a></li>
                <li><a href="#electronics">Electronics</a></li>
                <li><a href="#collectibles">Collectibles</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-heading">Support</h4>
              <ul className="footer-links">
                <li><a href="#help">Help Center</a></li>
                <li><a href="#safety">Safety & Trust</a></li>
                <li><a href="#shipping">Shipping Info</a></li>
                <li><a href="#returns">Returns Policy</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Footer Section */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {currentYear} ThriftFinder. All rights reserved.
          </p>
          <div className="footer-legal">
            <a href="#privacy">Privacy Policy</a>
            <span className="separator">•</span>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
