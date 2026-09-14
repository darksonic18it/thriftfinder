import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Heart, Search, SquarePlus, ShoppingBag, User } from 'lucide-react';

import ThemeToggle from './ThemeToggle';
import './AppNavbar.css';

const AppNavbar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="app-navbar" role="banner">
      <div className="app-navbar-container">
        <Link to="/dashboard" className="app-navbar-logo" aria-label="ThriftFinder">
          <div className="logo-icon" aria-hidden="true">
            <ShoppingBag size={24} color="#ffffff" />
          </div>
          <span className="logo-text">
            Thrift<span className="logo-accent">Finder</span>
          </span>
        </Link>

        <div className="app-navbar-center" aria-label="Primary navigation">
          <div className="app-navbar-icon-row">
            <button
              type="button"
              className="app-navbar-icon-btn"
              onClick={() => {}}
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            <button
              type="button"
              className="app-navbar-icon-btn"
              onClick={() => navigate('/create-listing')}
              aria-label="Create listing"
            >
              <SquarePlus size={20} />
            </button>

            <button
              type="button"
              className="app-navbar-icon-btn"
              onClick={() => {}}
              aria-label="Saved items"
            >
              <Heart size={20} />
            </button>

            <button
              type="button"
              className="app-navbar-icon-btn app-navbar-icon-btn--bell"
              onClick={() => {}}
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="app-navbar__notification-dot" aria-hidden="true" />
            </button>
          </div>

          <ThemeToggle />
        </div>

        <div className="app-navbar-profile-pill" aria-label="User profile">
          <div className="app-navbar-profile-avatar-ring" aria-hidden="true">
            <div className="app-navbar-profile-avatar">
              <User size={18} />
            </div>
          </div>
          <span className="app-navbar-profile-name">Juan D.</span>
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
