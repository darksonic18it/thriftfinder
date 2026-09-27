import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Camera,
} from 'lucide-react';
import { listingService, type MyListingRow } from '../services/listingService';
import { reservationService } from '../services/reservationService';
import { profileService } from '../services/profileService';
import { favoriteService } from '../services/favoriteService';
import { followService } from '../services/followService';
import { supabase } from '../lib/supabaseClient';
import { formatPeso, randomToken, sanitizeFileName, describeError } from '../lib/listingMappers';
import {
  PROFILE_AVATARS_BUCKET,
  PROFILE_COVERS_BUCKET,
  type MyStatsRow,
  type ReservationWithListing,
} from '../types/database';
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
  const isOwner = !!(user && profile?.id && profile.id === user.id);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [followCounts, setFollowCounts] = useState<
    { followers: number; following: number } | null
  >(null);

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

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!profile?.id) return;

    void (async () => {
      const res = await followService.getFollowCounts(profile.id);
      if (res.data) {
        setFollowCounts({ followers: res.data.followers_count, following: res.data.following_count });
      } else {
        setFollowCounts(null);
      }
    })();
  }, [profile?.id]);

    useEffect(() => {
    const avatarPath = profile?.avatar_path
    if (avatarPath == null) {
      setAvatarUrl(null)
      return
    }

    void (async () => {
      try {
        const { data, error } = await supabase.storage
          .from(PROFILE_AVATARS_BUCKET)
          .createSignedUrl(avatarPath, 60 * 60)
        if (error) {
          console.error('[avatar signed url]', error)
        }
        setAvatarUrl(data?.signedUrl ?? null)
      } catch (err) {
        console.error('[avatar signed url] threw', err)
        setAvatarUrl(null)
      }
    })()
  }, [profile?.avatar_path]);


  useEffect(() => {
    const coverPath = profile?.cover_path
    if (coverPath == null) {
      setCoverUrl(null)
      return
    }

    void (async () => {
      try {
        const { data, error } = await supabase.storage
          .from(PROFILE_COVERS_BUCKET)
          .createSignedUrl(coverPath, 60 * 60)
        if (error) {
          console.error('[cover signed url]', error)
        }
        setCoverUrl(data?.signedUrl ?? null)
      } catch (err) {
        console.error('[cover signed url] threw', err)
        setCoverUrl(null)
      }
    })()
  }, [profile?.cover_path]);


  // Live preview of a newly chosen avatar/cover file, before it's uploaded.
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);


  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setActionError(null);

    const userId = user?.id;
    if (!userId) {
      setActionError('Sign in to update your profile.');
      setSavingProfile(false);
      return;
    }

    const patch: {
      full_name: string;
      contact_phone: string | null;
      avatar_path?: string | null;
      cover_path?: string | null;
    } = {
      full_name: fullNameDraft.trim(),
      contact_phone: phoneDraft.trim() || null,
    };

    let saveError: string | null = null;
    let uploadedAvatarPath: string | null = null;
    let uploadedCoverPath: string | null = null;

    try {
      if (avatarFile) {
        const key = `${userId}/${randomToken()}_${sanitizeFileName(avatarFile.name)}`;
        const { error } = await supabase.storage.from(PROFILE_AVATARS_BUCKET).upload(key, avatarFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: avatarFile.type || 'application/octet-stream',
        });

        if (error) {
          saveError = describeError(error as { message?: string; code?: string; details?: string }, 'Could not upload profile picture.').message;
        } else {
          uploadedAvatarPath = key;
          patch.avatar_path = key;
        }
      }

      if (!saveError && coverFile) {
        const key = `${userId}/${randomToken()}_${sanitizeFileName(coverFile.name)}`;
        const { error } = await supabase.storage.from(PROFILE_COVERS_BUCKET).upload(key, coverFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: coverFile.type || 'application/octet-stream',
        });

        if (error) {
          saveError = describeError(error as { message?: string; code?: string; details?: string }, 'Could not upload cover photo.').message;
        } else {
          uploadedCoverPath = key;
          patch.cover_path = key;
        }
      }

      if (!saveError) {
        const { error } = await profileService.updateMyProfile(patch);
        if (error) {
          saveError = error.message;
        } else {
          await refreshProfile();
          setEditing(false);
          setAvatarFile(null);
          setCoverFile(null);
          return;
        }
      }
    } finally {
      if (saveError) {
        // Cleanup uploaded-but-not-referenced objects.
        if (uploadedAvatarPath) {
          await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([uploadedAvatarPath]).catch(() => {});
        }
        if (uploadedCoverPath) {
          await supabase.storage.from(PROFILE_COVERS_BUCKET).remove([uploadedCoverPath]).catch(() => {});
        }
        setActionError(saveError);
      }
      setSavingProfile(false);
    }
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

  const activeReservations = myReservations.filter((r) => ['Pending', 'Confirmed'].includes(String(r.status)));
  const pastReservations = myReservations.filter((r) => ['Completed', 'Cancelled', 'Expired'].includes(String(r.status)));
  const activeIncoming = incoming.filter((r) => ['Pending', 'Confirmed'].includes(String(r.status)));

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const followersLabel = followCounts ? followCounts.followers : '—';
  const followingLabel = followCounts ? followCounts.following : '—';

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
            <div className="profile-summary__cover">
              {editing && coverPreview ? (
                <img src={coverPreview} alt="" />
              ) : profile?.cover_path && coverUrl ? (
                <img src={coverUrl} alt="" />
              ) : (
                <div className="profile-summary__cover-fallback" />
              )}
              <div className="profile-summary__cover-overlay" />

              {isOwner && editing ? (
                <button
                  type="button"
                  className="profile-summary__cover-edit-btn"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Camera size={15} />
                  <span>Change cover</span>
                </button>
              ) : null}
            </div>

            <div className="profile-summary__header">
              <div className="profile-summary__avatar-wrap">
                <div className="profile-summary__avatar">
                  {editing && avatarPreview ? (
                    <img src={avatarPreview} alt="" />
                  ) : profile?.avatar_path && avatarUrl ? (
                    <img src={avatarUrl} alt="" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                {isOwner && isEmailVerified ? (
                  <span className="profile-verified-badge" aria-hidden="true">
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                ) : null}

                {isOwner && editing ? (
                  <button
                    type="button"
                    className="profile-summary__avatar-edit-btn"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Change profile picture"
                  >
                    <Camera size={13} />
                  </button>
                ) : null}
              </div>

              <div className="profile-summary__identity">
                <h1 className="profile-summary__name">{displayName}</h1>
                <p className="profile-summary__role">User</p>
              </div>
            </div>

            {isOwner ? (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="profile-visually-hidden-input"
                  tabIndex={-1}
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="profile-visually-hidden-input"
                  tabIndex={-1}
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                />
              </>
            ) : null}

            <div className="profile-summary__badges" aria-label="Account status badges">
              <span className="profile-badge profile-badge--neutral">
                <Calendar size={14} className="profile-badge__icon" />
                <span>Member since {memberSince}</span>
              </span>

              <span className="profile-badge profile-badge--neutral">
                <span>Followers {followersLabel}</span>
              </span>

              <span className="profile-badge profile-badge--neutral">
                <span>Following {followingLabel}</span>
              </span>
            </div>

            {editing ? (
              <div className="profile-edit-form">
                <p className="profile-edit-hint">
                  Tap the cover photo or your profile picture above to change it.
                </p>

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
                    onClick={() => {
                      setEditing(false);
                      setAvatarFile(null);
                      setCoverFile(null);
                    }}
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
                {isOwner ? (
                  <button
                    type="button"
                    className="profile-btn-outline"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil size={15} />
                    <span>Edit profile</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="profile-btn-sm-outline"
                    disabled
                    aria-disabled="true"
                    title="Messaging is not available yet"
                  >
                    <MessageSquare size={15} />
                    <span>Message / Get in Touch</span>
                  </button>
                )}
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

        {/* Row 1b: Reservations on MY listings (seller side). */}
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
        <div className="profile-dashboard__row profile-dashboard__row--four-col" aria-label="Quick metrics">
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

                  <span className="profile-tx-chip__status">{String(reservation.status)}</span>
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