import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { gsap } from 'gsap';

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

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (reduceMotion || !canHover) return;

    const items = Array.from(
      document.querySelectorAll<HTMLElement>('.pill-desktop-item')
    );

    const cleanups: Array<() => void> = [];
    const timelines: gsap.core.Timeline[] = [];

    items.forEach((item) => {
      const bg = item.querySelector<HTMLElement>('.pill-bg');
      const normal = item.querySelector<HTMLElement>('.pill-label-normal');
      const hover = item.querySelector<HTMLElement>('.pill-label-hover');

      if (!bg || !normal || !hover) return;

      const isActive = item.classList.contains('active');

      // Ensure CSS class rules are the source of truth before GSAP initializes.
      gsap.set([bg, normal, hover], { clearProps: 'all' });

      const tl = gsap.timeline({ paused: true });

      tl.to(
        bg,
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.35,
          ease: 'power3.out',
        },
        0
      );

      tl.to(
        normal,
        {
          yPercent: -100,
          opacity: 0,
          duration: 0.28,
          ease: 'power3.out',
        },
        0
      );

      tl.to(
        hover,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.28,
          ease: 'power3.out',
        },
        0.06
      );

      if (isActive) {
        gsap.set(bg, { scaleX: 1, opacity: 1 });
        gsap.set(normal, { yPercent: -100, opacity: 0 });
        gsap.set(hover, { yPercent: 0, opacity: 1 });
        tl.progress(1).pause();
      } else {
        gsap.set(bg, { scaleX: 0.2, opacity: 0 });
        gsap.set(normal, { yPercent: 0, opacity: 1 });
        gsap.set(hover, { yPercent: 100, opacity: 0 });
        tl.progress(0).pause();
      }

      const onEnter = () => {
        if (isActive) {
          tl.pause(1, false);
          return;
        }
        tl.play(0);
      };

      const onLeave = () => {
        if (isActive) {
          tl.pause(1, false);
          return;
        }

        tl.reverse(0).eventCallback('onReverseComplete', () => {
          gsap.set([bg, normal, hover], { clearProps: 'all' });
        });
      };

      item.addEventListener('mouseenter', onEnter);
      item.addEventListener('mouseleave', onLeave);

      cleanups.push(() => {
        item.removeEventListener('mouseenter', onEnter);
        item.removeEventListener('mouseleave', onLeave);
      });

      timelines.push(tl);
    });

    return () => {
      cleanups.forEach((fn) => fn());
      timelines.forEach((tl) => tl.kill());
    };
  }, [location.pathname]);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <ShoppingBag size={24} color="#ffffff" />
          </div>
          <span className="logo-text">
            Thrift<span className="logo-accent">Finder</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="navbar-links">
          <Link
            to="/"
            className={`nav-link pill-desktop-item ${isHomeActive ? 'active' : ''}`}
          >
            <span className="pill-bg" aria-hidden="true" />
            <span className="pill-label-wrap">
              <span className="pill-label-normal">Home</span>
              <span className="pill-label-hover" aria-hidden="true">
                Home
              </span>
            </span>
          </Link>
          <Link
            to="/browse"
            className={`nav-link pill-desktop-item ${isBrowseActive ? 'active' : ''}`}
          >
            <span className="pill-bg" aria-hidden="true" />
            <span className="pill-label-wrap">
              <span className="pill-label-normal">Browse</span>
              <span className="pill-label-hover" aria-hidden="true">
                Browse
              </span>
            </span>
          </Link>
          <Link
            to="/about"
            className={`nav-link pill-desktop-item ${isAboutActive ? 'active' : ''}`}
          >
            <span className="pill-bg" aria-hidden="true" />
            <span className="pill-label-wrap">
              <span className="pill-label-normal">About</span>
              <span className="pill-label-hover" aria-hidden="true">
                About
              </span>
            </span>
          </Link>
          <Link
            to="/create-listing"
            className={`nav-link pill-desktop-item ${isCreateListingActive ? 'active' : ''}`}
          >
            <span className="pill-bg" aria-hidden="true" />
            <span className="pill-label-wrap">
              <span className="pill-label-normal">Sell an Item</span>
              <span className="pill-label-hover" aria-hidden="true">
                Sell an Item
              </span>
            </span>
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
        <button
          className="mobile-menu-btn"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
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
