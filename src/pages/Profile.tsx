import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Calendar,
  Clock,
  Pencil,
  Package,
  Plus,
  Star,
  MessageSquare,
  Bell,
  Settings,
  ChevronRight,
  History,
  ArrowLeft,
} from 'lucide-react';
import './Profile.css';

// Use the same design-language as other pages that have a back affordance.
// (This is the only header control on /profile; AppNavbar is intentionally removed.)


const Profile: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Prefer browser history when available; fall back to dashboard.
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="profile-dashboard">
      <header className="profile-header" aria-label="Profile header">
        <button
          type="button"
          className="profile-header__back-btn"
          onClick={handleBack}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </header>

      <div className="profile-dashboard__container">
        {/* Row 1: Profile Summary & Active Reservations */}
        <div className="profile-dashboard__row profile-dashboard__row--two-col">
          {/* Left Card: Profile Summary */}
          <section className="profile-card profile-card--summary" aria-label="Profile summary">
            <div className="profile-summary__header">
              <div className="profile-summary__avatar" aria-hidden="true">
                <span>MR</span>
              </div>
              <div className="profile-summary__identity">
                <h1 className="profile-summary__name">Mika Reyes</h1>
                <p className="profile-summary__role">Buyer and seller</p>
              </div>
            </div>

            <div className="profile-summary__badges" aria-label="Account status badges">
              <span className="profile-badge profile-badge--verified">
                <Check size={14} className="profile-badge__icon" strokeWidth={2.5} />
                <span>Email verified</span>
              </span>
              <span className="profile-badge profile-badge--neutral">
                <Calendar size={14} className="profile-badge__icon" />
                <span>Member since Feb 2026</span>
              </span>
            </div>

            <div className="profile-summary__actions">
              <button type="button" className="profile-btn-outline">
                <Pencil size={15} />
                <span>Edit profile</span>
              </button>
            </div>
          </section>

          {/* Right Card: Active Reservations */}
          <section className="profile-card profile-card--reservations" aria-label="Active reservations">
            <div className="profile-card__header">
              <div className="profile-card__title-wrap">
                <Clock size={18} className="profile-card__header-icon" />
                <h2 className="profile-card__title">Active reservations</h2>
              </div>
            </div>

            <div className="profile-reservations__list">
              <div className="profile-reservation-item">
                <div className="profile-reservation-item__info">
                  <span className="profile-reservation-item__name">Denim jacket, size M</span>
                </div>
                <span className="profile-status-pill profile-status-pill--pending">
                  <span className="profile-status-pill__dot" />
                  Pending · 19h left
                </span>
              </div>

              <div className="profile-reservation-item">
                <div className="profile-reservation-item__info">
                  <span className="profile-reservation-item__name">Ceramic mug set</span>
                </div>
                <span className="profile-status-pill profile-status-pill--confirmed">
                  <span className="profile-status-pill__dot" />
                  Confirmed
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Row 2: My Listings */}
        <section className="profile-card profile-card--listings" aria-label="My listings summary">
          <div className="profile-card__header">
            <div className="profile-card__title-wrap">
              <Package size={18} className="profile-card__header-icon" />
              <h2 className="profile-card__title">My listings</h2>
            </div>
            <button
              type="button"
              className="profile-btn-sm-outline"
              onClick={() => navigate('/create-listing')}
              aria-label="Create new listing"
            >
              <Plus size={15} />
              <span>New</span>
            </button>
          </div>

          <div className="profile-listings__stats-grid">
            <div className="profile-listing-stat">
              <span className="profile-listing-stat__value">6</span>
              <span className="profile-listing-stat__label">Active</span>
            </div>
            <div className="profile-listing-stat__divider" aria-hidden="true" />
            <div className="profile-listing-stat">
              <span className="profile-listing-stat__value">2</span>
              <span className="profile-listing-stat__label">Reserved</span>
            </div>
            <div className="profile-listing-stat__divider" aria-hidden="true" />
            <div className="profile-listing-stat">
              <span className="profile-listing-stat__value">14</span>
              <span className="profile-listing-stat__label">Sold</span>
            </div>
          </div>
        </section>

        {/* Row 3: Four Small Stat Cards */}
        <div className="profile-dashboard__row profile-dashboard__row--four-col" aria-label="Quick metrics">
          {/* Card 1: Reviews */}
          <div className="profile-stat-card">
            <div className="profile-stat-card__icon-wrap profile-stat-card__icon-wrap--star">
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-value">4.8</div>
              <div className="profile-stat-card__meta">23 reviews</div>
            </div>
          </div>

          {/* Card 2: Chats */}
          <div className="profile-stat-card">
            <div className="profile-stat-card__icon-wrap">
              <MessageSquare size={18} color="#94a3b8" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-text">2 open chats</div>
              <div className="profile-stat-card__meta">Unlocks after confirm</div>
            </div>
          </div>

          {/* Card 3: Notifications */}
          <div className="profile-stat-card">
            <div className="profile-stat-card__icon-wrap profile-stat-card__icon-wrap--active">
              <Bell size={18} color="#94a3b8" />
              <span className="profile-stat-card__dot" aria-hidden="true" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-text">3 unread</div>
              <div className="profile-stat-card__meta">Reservation confirmed</div>
            </div>
          </div>

          {/* Card 4: Account Settings (Clickable) */}
          <button
            type="button"
            className="profile-stat-card profile-stat-card--interactive"
            onClick={() => navigate('/dashboard')}
            aria-label="Manage Account: Password, security settings"
          >
            <div className="profile-stat-card__top">
              <div className="profile-stat-card__icon-wrap">
                <Settings size={18} color="#94a3b8" />
              </div>
              <ChevronRight size={16} className="profile-stat-card__chevron" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-text">Account</div>
              <div className="profile-stat-card__meta">Password, security</div>
            </div>
          </button>
        </div>

        {/* Row 4: Transaction History */}
        <section className="profile-card profile-card--transactions" aria-label="Transaction history">
          <div className="profile-card__header">
            <div className="profile-card__title-wrap">
              <History size={18} className="profile-card__header-icon" />
              <h2 className="profile-card__title">Transaction history</h2>
            </div>
          </div>

          <div className="profile-transactions__chips-container">
            <div className="profile-tx-chip profile-tx-chip--completed">
              <span className="profile-tx-chip__item">Vinyl records</span>
              <span className="profile-tx-chip__separator">·</span>
              <span className="profile-tx-chip__status">Completed</span>
            </div>

            <div className="profile-tx-chip profile-tx-chip--completed">
              <span className="profile-tx-chip__item">Desk lamp</span>
              <span className="profile-tx-chip__separator">·</span>
              <span className="profile-tx-chip__status">Completed</span>
            </div>

            <div className="profile-tx-chip profile-tx-chip--expired">
              <span className="profile-tx-chip__item">Wool coat</span>
              <span className="profile-tx-chip__separator">·</span>
              <span className="profile-tx-chip__status">Expired</span>
            </div>

            <div className="profile-tx-chip profile-tx-chip--cancelled">
              <span className="profile-tx-chip__item">Sneakers</span>
              <span className="profile-tx-chip__separator">·</span>
              <span className="profile-tx-chip__status">Cancelled</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
