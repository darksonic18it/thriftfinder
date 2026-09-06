import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isHomeActive = location.pathname === '/';
  const isBrowseActive = location.pathname === '/browse';
  const isAboutActive = location.pathname === '/about';
  const isCreateListingActive = location.pathname === '/create-listing';

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <ShoppingBag size={24} color="#ffffff" />
          </div>
          <span className="logo-text">Thrift<span className="logo-accent">Finder</span></span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${isHomeActive ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/browse"
            className={`nav-link ${isBrowseActive ? 'active' : ''}`}
          >
            Browse
          </Link>
          <Link
            to="/about"
            className={`nav-link ${isAboutActive ? 'active' : ''}`}
          >
            About
          </Link>
          <Link
            to="/create-listing"
            className={`nav-link ${isCreateListingActive ? 'active' : ''}`}
          >
            Sell an Item
          </Link>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="navbar-actions">
          <Link to="/login" className="btn-login">
            Log In
          </Link>
          <Link to="/signup" className="btn-signup">
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle navigation menu">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <nav className="mobile-nav-links">
            <Link
              to="/"
              className={`mobile-nav-link ${isHomeActive ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/browse"
              className={`mobile-nav-link ${isBrowseActive ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Browse
            </Link>
            <Link
              to="/about"
              className={`mobile-nav-link ${isAboutActive ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/create-listing"
              className={`mobile-nav-link ${isCreateListingActive ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Sell an Item
            </Link>
          </nav>
          <div className="mobile-actions">
            <Link to="/login" className="btn-login full-width">
              Log In
            </Link>
            <Link to="/signup" className="btn-signup full-width">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
