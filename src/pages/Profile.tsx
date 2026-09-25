import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  Inbox,
} from 'lucide-react';
import { listingService, type MyListingRow } from '../services/listingService';
import { reservationService } from '../services/reservationService';
import { profileService } from '../services/profileService';
import { favoriteService } from '../services/favoriteService';
import { formatPeso } from '../lib/listingMappers';
import type { MyStatsRow, ReservationWithListing } from '../types/database';
import './Profile.css';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusPillClass(status: string): string {
  switch (status) {
    case 'Pending':
      return 'profile-status-pill--pending';
    case 'Confirmed':
      return 'profile-status-pill--confirmed';
    case 'Completed':
      return 'profile-status-pill--completed';
    case 'Cancelled':
      return 'profile-status-pill--cancelled';
    case 'Expired':
      return 'profile-status-pill--expired';
    default:
      return '';
  }
}

function txChipClass(status: string): string {
  switch (status) {
    case 'Completed':
      return 'profile-tx-chip--completed';
    case 'Expired':
      return 'profile-tx-chip--expired';
    case 'Cancelled':
      return 'profile-tx-chip--cancelled';
    default:
      return '';
  }
}

function hoursLeft(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return ' · holding period passed';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return ` · ${hours}h left`;
  return ` · ${Math.max(1, Math.round(ms / 60_000))}m left`;
}

const EMPTY_STATS: MyStatsRow = {
  active_listings: 0,
  archived_listings: 0,
  reserved_listings: 0,
  sold_listings: 0,
  my_active_reservations: 0,
  my_past_reservations: 0,
  incoming_reservations: 0,
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, displayName, refreshProfile } = useAuth();

  const initials = getInitials(displayName);
  const isEmailVerified = !!user?.email_confirmed_at;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const [stats, setStats] = useState<MyStatsRow>(EMPTY_STATS);
  const [savedCount, setSavedCount] = useState(0);
  const [myListings, setMyListings] = useState<MyListingRow[]>([]);
  const [myReservations, setMyReservations] = useState<ReservationWithListing[]>([]);
  const [incoming, setIncoming] = useState<ReservationWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Inline profile editing (FR-002)
  const [editing, setEditing] = useState(false);
  const [fullNameDraft, setFullNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);

    // FR-008 sweep — a no-op unless optional migration 05 is applied.
    await reservationService.expireDue();

    const [statsResult, listingsResult, mineResult, incomingResult, saved] = await Promise.all([
      listingService.getMyStats(),
      listingService.getMyListings(),
      reservationService.getMyReservations(),
      reservationService.getIncomingReservations(),
      favoriteService.countMyFavorites(),
    ]);

    setStats(statsResult.data ?? EMPTY_STATS);
    setMyListings(listingsResult.data ?? []);
    setMyReservations(mineResult.data ?? []);
    setIncoming(incomingResult.data ?? []);
    setSavedCount(saved);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setFullNameDraft(profile?.full_name ?? displayName ?? '');
    setPhoneDraft(profile?.contact_phone ?? '');
  }, [profile, displayName]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setActionError(null);
    const { error } = await profileService.updateMyProfile({
      full_name: fullNameDraft.trim(),
      contact_phone: phoneDraft.trim() || null,
    });
    setSavingProfile(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    await refreshProfile();
    setEditing(false);
  };

  const runReservationAction = async (
    action: () => Promise<{ error: { message: string } | null }>
  ) => {
    setActionError(null);
    const { error } = await action();
    if (error) {
      setActionError(error.message);
      return;
    }
    await loadAll();
  };

  const activeReservations = myReservations.filter((r) =>
    ['Pending', 'Confirmed'].includes(String(r.status))
  );
  const pastReservations = myReservations.filter((r) =>
    ['Completed', 'Cancelled', 'Expired'].includes(String(r.status))
  );
  const activeIncoming = incoming.filter((r) =>
    ['Pending', 'Confirmed'].includes(String(r.status))
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

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
        {actionError ? (
          <div className="profile-inline-error" role="alert">
            {actionError}
          </div>
        ) : null}

        {/* Row 1: Profile Summary & Active Reservations */}
        <div className="profile-dashboard__row profile-dashboard__row--two-col">
          {/* Left Card: Profile Summary */}
          <section className="profile-card profile-card--summary" aria-label="Profile summary">
            <div className="profile-summary__header">
              <div className="profile-summary__avatar" aria-hidden="true">
                <span>{initials}</span>
              </div>
              <div className="profile-summary__identity">
                <h1 className="profile-summary__name">{displayName}</h1>
                <p className="profile-summary__role">Buyer and seller</p>
              </div>
            </div>

            <div className="profile-summary__badges" aria-label="Account status badges">
              {isEmailVerified ? (
                <span className="profile-badge profile-badge--verified">
                  <Check size={14} className="profile-badge__icon" strokeWidth={2.5} />
                  <span>Email verified</span>
                </span>
              ) : (
                <span className="profile-badge profile-badge--neutral">
                  <span>Email not verified</span>
                </span>
              )}
              <span className="profile-badge profile-badge--neutral">
                <Calendar size={14} className="profile-badge__icon" />
                <span>Member since {memberSince}</span>
              </span>
            </div>

            {editing ? (
              <div className="profile-edit-form">
                <label className="profile-edit-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    value={fullNameDraft}
                    onChange={(e) => setFullNameDraft(e.target.value)}
                  />
                </label>
                <label className="profile-edit-field">
                  <span>Contact number</span>
                  <input
                    type="tel"
                    value={phoneDraft}
                    placeholder="e.g. 0917 000 0000"
                    onChange={(e) => setPhoneDraft(e.target.value)}
                  />
                </label>
                <div className="profile-summary__actions">
                  <button
                    type="button"
                    className="profile-btn-outline"
                    onClick={() => setEditing(false)}
                    disabled={savingProfile}
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    className="profile-btn-sm-outline"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    <span>{savingProfile ? 'Saving…' : 'Save'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-summary__actions">
                <button
                  type="button"
                  className="profile-btn-outline"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={15} />
                  <span>Edit profile</span>
                </button>
              </div>
            )}
          </section>

          {/* Right Card: Active Reservations (as buyer) */}
          <section
            className="profile-card profile-card--reservations"
            aria-label="Active reservations"
          >
            <div className="profile-card__header">
              <div className="profile-card__title-wrap">
                <Clock size={18} className="profile-card__header-icon" />
                <h2 className="profile-card__title">Active reservations</h2>
              </div>
            </div>

            <div className="profile-reservations__list">
              {loading ? (
                <p className="profile-empty-note">Loading…</p>
              ) : activeReservations.length === 0 ? (
                <p className="profile-empty-note">
                  You have no active reservations. Reserve an item from Browse to hold it.
                </p>
              ) : (
                activeReservations.map((reservation) => (
                  <div className="profile-reservation-item" key={reservation.id}>
                    <div className="profile-reservation-item__info">
                      <button
                        type="button"
                        className="profile-reservation-item__name profile-linkish"
                        onClick={() => navigate(`/listing/${reservation.listing_id}`)}
                      >
                        {reservation.listing?.title ?? 'Listing removed'}
                      </button>
                    </div>
                    <span
                      className={`profile-status-pill ${statusPillClass(String(reservation.status))}`}
                    >
                      <span className="profile-status-pill__dot" />
                      {String(reservation.status)}
                      {reservation.status === 'Pending' ? hoursLeft(reservation.expires_at) : ''}
                    </span>
                    <button
                      type="button"
                      className="profile-btn-sm-outline"
                      onClick={() =>
                        runReservationAction(() =>
                          reservationService.cancelReservation(reservation.id)
                        )
                      }
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/*
          Row 1b: Reservations on MY listings (seller side).
          SRS FR-007 requires BOTH parties to see the same reservation state,
          and the business rules give the seller the Confirm/Complete actions.
          The shipped UI had no seller-side view at all, so this card is the
          minimum addition needed. It reuses the existing profile-card styling.
        */}
        <section className="profile-card profile-card--reservations" aria-label="Reservations on my listings">
          <div className="profile-card__header">
            <div className="profile-card__title-wrap">
              <Inbox size={18} className="profile-card__header-icon" />
              <h2 className="profile-card__title">Reservations on my listings</h2>
            </div>
          </div>

          <div className="profile-reservations__list">
            {loading ? (
              <p className="profile-empty-note">Loading…</p>
            ) : activeIncoming.length === 0 ? (
              <p className="profile-empty-note">No one has reserved your items yet.</p>
            ) : (
              activeIncoming.map((reservation) => (
                <div className="profile-reservation-item" key={reservation.id}>
                  <div className="profile-reservation-item__info">
                    <button
                      type="button"
                      className="profile-reservation-item__name profile-linkish"
                      onClick={() => navigate(`/listing/${reservation.listing_id}`)}
                    >
                      {reservation.listing?.title ?? 'Listing removed'}
                    </button>
                  </div>

                  <span
                    className={`profile-status-pill ${statusPillClass(String(reservation.status))}`}
                  >
                    <span className="profile-status-pill__dot" />
                    {String(reservation.status)}
                    {reservation.status === 'Pending' ? hoursLeft(reservation.expires_at) : ''}
                  </span>

                  <div className="profile-reservation-item__actions">
                    {reservation.status === 'Pending' ? (
                      <button
                        type="button"
                        className="profile-btn-sm-outline"
                        onClick={() =>
                          runReservationAction(() =>
                            reservationService.confirmReservation(reservation.id)
                          )
                        }
                      >
                        <span>Confirm</span>
                      </button>
                    ) : null}

                    {reservation.status === 'Confirmed' ? (
                      <button
                        type="button"
                        className="profile-btn-sm-outline"
                        onClick={() =>
                          runReservationAction(() =>
                            reservationService.completeReservation(reservation.id)
                          )
                        }
                      >
                        <span>Mark completed</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="profile-btn-sm-outline"
                      onClick={() =>
                        runReservationAction(() =>
                          reservationService.cancelReservation(reservation.id)
                        )
                      }
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

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
              <span className="profile-listing-stat__value">{stats.active_listings}</span>
              <span className="profile-listing-stat__label">Active</span>
            </div>
            <div className="profile-listing-stat__divider" aria-hidden="true" />
            <div className="profile-listing-stat">
              <span className="profile-listing-stat__value">{stats.reserved_listings}</span>
              <span className="profile-listing-stat__label">Reserved</span>
            </div>
            <div className="profile-listing-stat__divider" aria-hidden="true" />
            <div className="profile-listing-stat">
              <span className="profile-listing-stat__value">{stats.sold_listings}</span>
              <span className="profile-listing-stat__label">Sold</span>
            </div>
          </div>

          <div className="profile-reservations__list">
            {loading ? (
              <p className="profile-empty-note">Loading…</p>
            ) : myListings.length === 0 ? (
              <p className="profile-empty-note">
                You haven't listed anything yet. Tap New to post your first item.
              </p>
            ) : (
              myListings.map((item) => (
                <div className="profile-reservation-item" key={item.id}>
                  <div className="profile-reservation-item__info">
                    <button
                      type="button"
                      className="profile-reservation-item__name profile-linkish"
                      onClick={() => navigate(`/listing/${item.id}`)}
                    >
                      {item.title}
                    </button>
                  </div>
                  <span className="profile-status-pill">
                    <span className="profile-status-pill__dot" />
                    {formatPeso(item.price)} · {item.status === 'active' ? 'Active' : 'Archived'}
                  </span>
                  <button
                    type="button"
                    className="profile-btn-sm-outline"
                    onClick={() => navigate(`/edit-listing/${item.id}`)}
                  >
                    <span>Edit</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Row 3: Four Small Stat Cards */}
        <div
          className="profile-dashboard__row profile-dashboard__row--four-col"
          aria-label="Quick metrics"
        >
          {/* Card 1: Reviews — FR-011 is Low priority, not built yet */}
          <div className="profile-stat-card">
            <div className="profile-stat-card__icon-wrap profile-stat-card__icon-wrap--star">
              <Star size={18} color="#94a3b8" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-text">No reviews yet</div>
              <div className="profile-stat-card__meta">Ratings arrive in a later release</div>
            </div>
          </div>

          {/* Card 2: Saved items — replaces the old "open chats" placeholder */}
          <button
            type="button"
            className="profile-stat-card profile-stat-card--interactive"
            onClick={() => navigate('/saved-items')}
          >
            <div className="profile-stat-card__icon-wrap">
              <MessageSquare size={18} color="#94a3b8" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-value">{savedCount}</div>
              <div className="profile-stat-card__meta">Saved items</div>
            </div>
          </button>

          {/* Card 3: Incoming reservations — replaces the fake unread count */}
          <div className="profile-stat-card">
            <div className="profile-stat-card__icon-wrap profile-stat-card__icon-wrap--active">
              <Bell size={18} color="#94a3b8" />
              {stats.incoming_reservations > 0 ? (
                <span className="profile-stat-card__dot" aria-hidden="true" />
              ) : null}
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-value">{stats.incoming_reservations}</div>
              <div className="profile-stat-card__meta">Awaiting your action</div>
            </div>
          </div>

          {/* Card 4: Account Settings */}
          <button
            type="button"
            className="profile-stat-card profile-stat-card--interactive"
            onClick={() => setEditing(true)}
            aria-label="Manage account details"
          >
            <div className="profile-stat-card__top">
              <div className="profile-stat-card__icon-wrap">
                <Settings size={18} color="#94a3b8" />
              </div>
              <ChevronRight size={16} className="profile-stat-card__chevron" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-text">Account</div>
              <div className="profile-stat-card__meta">Name, contact number</div>
            </div>
          </button>
        </div>

        {/* Row 4: Transaction History (finished reservations, as a buyer) */}
        <section className="profile-card profile-card--transactions" aria-label="Transaction history">
          <div className="profile-card__header">
            <div className="profile-card__title-wrap">
              <History size={18} className="profile-card__header-icon" />
              <h2 className="profile-card__title">Transaction history</h2>
            </div>
          </div>

          <div className="profile-transactions__chips-container">
            {loading ? (
              <p className="profile-empty-note">Loading…</p>
            ) : pastReservations.length === 0 ? (
              <p className="profile-empty-note">No finished reservations yet.</p>
            ) : (
              pastReservations.map((reservation) => (
                <div
                  className={`profile-tx-chip ${txChipClass(String(reservation.status))}`}
                  key={reservation.id}
                >
                  <span className="profile-tx-chip__item">
                      {reservation.listing?.title ?? 'Listing removed'}
                    </span>

                    <span className="profile-tx-chip__separator">·</span>

                    <span className="profile-tx-chip__seller">
                     Seller: {reservation.listing?.seller?.full_name ?? 'Unknown seller'}
                    </span>

                    <span className="profile-tx-chip__separator">·</span>

                    <span className="profile-tx-chip__status">
                      {String(reservation.status)}
                    </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;