import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Flag,
  History,
  Inbox,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Settings,
  ShoppingBag,
  Star,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChatBuyerModal from '../components/ChatBuyerModal';
import DeleteListingModal from '../components/DeleteListingModal';
import MessageSellerModal from '../components/MessageSellerModal';
import ReportSellerModal from '../components/ReportSellerModal';
import SellerRatingWidget from '../components/SellerRatingWidget';
import SellerReviewsList from '../components/SellerReviewsList';
import { useAuth } from '../context/AuthContext';
import { describeError, formatPeso, randomToken, sanitizeFileName } from '../lib/listingMappers';
import { supabase } from '../lib/supabaseClient';
import { favoriteService } from '../services/favoriteService';
import { followService } from '../services/followService';
import { listingService, type MyListingRow } from '../services/listingService';
import { messageService, openMessagesWidget } from '../services/messageService';
import { profileService, type ProfileDisplay } from '../services/profileService';
import { reservationService } from '../services/reservationService';
import { reviewService } from '../services/reviewService';
import {
  LISTING_PHOTOS_BUCKET,
  PROFILE_AVATARS_BUCKET,
  PROFILE_COVERS_BUCKET,
  type MyStatsRow,
  type PublicSellerListingRow,
  type PublicSellerStats,
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

/** Most frequent non-empty city across the seller's active listings. */
function mostCommonCity(listings: { city: string }[]): string {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const city = listing.city?.trim();
    if (!city) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [city, count] of counts) {
    if (count > bestCount) {
      best = city;
      bestCount = count;
    }
  }
  return best;
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
  const { userId } = useParams<{ userId: string }>();
  const { user, profile, displayName, refreshProfile } = useAuth();

  const viewingUserId = userId ?? user?.id ?? null;
  const isOwner = !!viewingUserId && viewingUserId === user?.id;

  const isEmailVerified = !!user?.email_confirmed_at;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [viewedProfile, setViewedProfile] = useState<ProfileDisplay | null>(null);
  const [publicListings, setPublicListings] = useState<PublicSellerListingRow[]>([]);
  const [publicStats, setPublicStats] = useState<PublicSellerStats | null>(null);
  const [publicStatsFailed, setPublicStatsFailed] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Bumped after a review is posted/deleted so the rating widget and the
  // reviews list reload together (FR-011).
  const [reviewsVersion, setReviewsVersion] = useState(0);
  const [ownReviewSummary, setOwnReviewSummary] = useState<{ average: number; count: number } | null>(null);
  const [bioDraft, setBioDraft] = useState('');
  const [locationDraft, setLocationDraft] = useState('');
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const [publicListingImageUrls, setPublicListingImageUrls] = useState<
  Record<string, string>
  >({});

  const profileName = isOwner
    ? displayName
    : viewedProfile?.full_name ?? 'User';

  const initials = getInitials(profileName);

  const [followCounts, setFollowCounts] = useState<
    { followers: number; following: number } | null
  >(null);

  const memberSinceDate = isOwner
  ? profile?.created_at
  : viewedProfile?.created_at;

const memberSince = memberSinceDate
  ? new Date(memberSinceDate).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    })
  : '—';

  const [stats, setStats] = useState<MyStatsRow>(EMPTY_STATS);
  const [savedCount, setSavedCount] = useState(0);
  const [myListings, setMyListings] = useState<MyListingRow[]>([]);
  const [myReservations, setMyReservations] = useState<ReservationWithListing[]>([]);
  const [incoming, setIncoming] = useState<ReservationWithListing[]>([]);
  const [buyerDisplays, setBuyerDisplays] = useState<Record<string, ProfileDisplay>>({});
  const [chatModal, setChatModal] = useState<{
    buyerName: string;
    listingTitle: string;
    listingId: string;
    buyerId: string;
  } | null>(null);
  const [messageSellerOpen, setMessageSellerOpen] = useState(false);
  const [messageSellerBusyId, setMessageSellerBusyId] = useState<string | null>(null);
  const [messageSellerBusy, setMessageSellerBusy] = useState(false);
  const [messageSellerError, setMessageSellerError] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
  id: string;
  title: string;
  hasReservations: boolean;
} | null>(null);

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
    const incomingRows = incomingResult.data ?? [];
    setIncoming(incomingRows);
    setSavedCount(saved);
    setLoading(false);

    const buyerIds = Array.from(new Set(incomingRows.map((r) => r.buyer_id).filter(Boolean)));
    if (buyerIds.length > 0) {
      const displays = await profileService.getProfileDisplays(buyerIds);
      setBuyerDisplays(displays);
    } else {
      setBuyerDisplays({});
    }
  }, []);

    const loadViewedProfile = useCallback(async () => {
    if (!userId || isOwner) {
      setViewedProfile(null);
      return;
    }

    setLoading(true);
    setActionError(null);

    const publicProfile = await profileService.getProfileDisplay(userId);

    if (!publicProfile) {
      setViewedProfile(null);
      setActionError('User profile not found.');
      setLoading(false);
      return;
    }

    setViewedProfile(publicProfile);
    setLoading(false);
  }, [userId, isOwner]);

  const loadPublicListings = useCallback(async () => {
    if (!userId || isOwner) {
      setPublicListings([]);
      return;
    }

    const result = await listingService.getPublicListingsBySeller(userId);

    if (result.error) {
      console.error('[Profile] Failed to load public listings:', result.error);
      setPublicListings([]);
      setActionError(result.error.message);
      return;
    }

    setPublicListings(result.data ?? []);
  }, [userId, isOwner]);

  const loadPublicSellerExtras = useCallback(async () => {
    if (!userId || isOwner) {
      setPublicStats(null);
      setPublicStatsFailed(false);
      setIsFollowing(false);
      setFollowError(null);
      return;
    }

    setFollowError(null);
    const [statsResult, following] = await Promise.all([
      listingService.getPublicSellerStats(userId),
      followService.isFollowing(userId),
    ]);

    if (statsResult.data) {
      setPublicStats(statsResult.data);
      setPublicStatsFailed(false);
    } else {
      setPublicStats(null);
      // Missing-function means pre-migration DB: hide stats rather than error.
      setPublicStatsFailed(!/not available yet/i.test(statsResult.error?.message ?? ''));
    }
    setIsFollowing(following);
  }, [userId, isOwner]);

  const loadPublicListingImages = useCallback(async () => {
  if (isOwner || publicListings.length === 0) {
    setPublicListingImageUrls({});
    return;
  }

  const entries = await Promise.all(
    publicListings
      .filter((listing) => listing.cover_image_path)
      .map(async (listing) => {
        const { data, error } = await supabase.storage
          .from(LISTING_PHOTOS_BUCKET)
          .createSignedUrl(listing.cover_image_path!, 60 * 60);

        if (error) {
          console.error(
            '[Profile] Failed to create listing image URL:',
            error
          );
          return null;
        }

        return data?.signedUrl
          ? ([listing.id, data.signedUrl] as const)
          : null;
      })
  );

  setPublicListingImageUrls(
    Object.fromEntries(
      entries.filter(
        (entry): entry is readonly [string, string] => entry !== null
      )
    )
  );
}, [isOwner, publicListings]);

  useEffect(() => {
    if (!isOwner || !user?.id) {
      setOwnReviewSummary(null);
      return;
    }
    let cancelled = false;
    void reviewService.getSellerSummary(user.id).then((res) => {
      if (cancelled || !res.data) return;
      setOwnReviewSummary({ average: res.data.average_rating, count: res.data.review_count });
    });
    return () => {
      cancelled = true;
    };
  }, [isOwner, user?.id]);

    useEffect(() => {
    if (isOwner) {
      void loadAll();
      return;
    }

    if (userId) {
      void loadViewedProfile();
      void loadPublicListings();
      void loadPublicSellerExtras();
    }
    // loadPublicSellerExtras is stable per userId; keep deps explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOwner,
    userId,
    loadAll,
    loadViewedProfile,
    loadPublicListings,
  ]);

useEffect(() => {
  void loadPublicListingImages();
}, [loadPublicListingImages]);

  useEffect(() => {
    setFullNameDraft(profile?.full_name ?? displayName ?? '');
    setPhoneDraft(profile?.contact_phone ?? '');
    setBioDraft(profile?.bio ?? '');
    setLocationDraft(profile?.location_city ?? '');
  }, [profile, displayName]);

  useEffect(() => {
  const targetUserId = isOwner ? user?.id : viewedProfile?.id;

  if (!targetUserId) {
    setFollowCounts(null);
    return;
  }

  void (async () => {
    const res = await followService.getFollowCounts(targetUserId);

    if (res.data) {
      setFollowCounts({
        followers: res.data.followers_count,
        following: res.data.following_count,
      });
    } else {
      setFollowCounts(null);
    }
  })();
  }, [isOwner, user?.id, viewedProfile?.id]);

  useEffect(() => {
  const avatarPath = isOwner
    ? profile?.avatar_path
    : viewedProfile?.avatar_path;

  if (avatarPath == null) {
    setAvatarUrl(null);
    return;
  }

  void (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(PROFILE_AVATARS_BUCKET)
        .createSignedUrl(avatarPath, 60 * 60);

      if (error) {
        console.error('[avatar signed url]', error);
      }

      setAvatarUrl(data?.signedUrl ?? null);
    } catch (err) {
      console.error('[avatar signed url] threw', err);
      setAvatarUrl(null);
    }
  })();
  }, [isOwner, profile?.avatar_path, viewedProfile?.avatar_path]);


useEffect(() => {
  const coverPath = isOwner
    ? profile?.cover_path
    : viewedProfile?.cover_path;

  if (coverPath == null) {
    setCoverUrl(null);
    return;
  }

  void (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(PROFILE_COVERS_BUCKET)
        .createSignedUrl(coverPath, 60 * 60);

      if (error) {
        console.error('[cover signed url]', error);
      }

      setCoverUrl(data?.signedUrl ?? null);
    } catch (err) {
      console.error('[cover signed url] threw', err);
      setCoverUrl(null);
    }
  })();
}, [isOwner, profile?.cover_path, viewedProfile?.cover_path]);


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
      bio?: string | null;
      location_city?: string | null;
    } = {
      full_name: fullNameDraft.trim(),
      contact_phone: phoneDraft.trim() || null,
      bio: bioDraft.trim() || null,
      location_city: locationDraft.trim() || null,
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

  // Every conversation is about one listing, so "Message" on a seller's
  // profile picks the listing first (see MessageSellerModal).
  const startSellerConversation = async (listingId: string): Promise<string | null> => {
    const { data, error } = await messageService.startConversation(listingId);
    if (error || !data) return error?.message ?? 'Could not start the conversation.';
    setMessageSellerOpen(false);
    openMessagesWidget(data);
    return null;
  };

  const handlePickSellerListing = async (listingId: string): Promise<void> => {
    setMessageSellerBusyId(listingId);
    setMessageSellerError(null);
    const err = await startSellerConversation(listingId);
    setMessageSellerBusyId(null);
    if (err) setMessageSellerError(err);
  };

  const handleMessageSellerClick = async () => {
    if (!userId || isOwner || messageSellerBusy) return;
    if (!user) {
      navigate('/login', { state: { from: `/profile/${userId}` } });
      return;
    }
    setActionError(null);
    setMessageSellerError(null);

    // Several items: let the buyer choose which one they are asking about.
    if (publicListings.length > 1) {
      setMessageSellerOpen(true);
      return;
    }

    setMessageSellerBusy(true);
    let err: string | null = null;
    if (publicListings.length === 1) {
      err = await startSellerConversation(publicListings[0].id);
    } else {
      // No active listings: reopen an existing thread if there is one.
      const existing = await messageService.findThreadWithSeller(userId);
      if (existing.error) err = existing.error.message;
      else if (existing.data) openMessagesWidget(existing.data);
      else err = 'This seller has no active listings to message about right now.';
    }
    setMessageSellerBusy(false);
    if (err) setActionError(err);
  };

  const handleToggleFollow = async () => {
    if (!userId || isOwner || followBusy) return;
    if (!user) {
      navigate('/login', { state: { from: `/profile/${userId}` } });
      return;
    }
    setFollowBusy(true);
    setFollowError(null);
    const result = isFollowing
      ? await followService.unfollow(userId)
      : await followService.follow(userId);
    if (result.error) {
      setFollowError(result.error.message);
    } else {
      setIsFollowing(!isFollowing);
      const counts = await followService.getFollowCounts(userId);
      if (counts.data) {
        setFollowCounts({
          followers: counts.data.followers_count,
          following: counts.data.following_count,
        });
      }
    }
    setFollowBusy(false);
  };

  useEffect(() => {
    if (moreOpen) {
      const onPointerDown = (event: PointerEvent) => {
        if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
          setMoreOpen(false);
        }
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setMoreOpen(false);
      };
      document.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
      };
    }
    return undefined;
  }, [moreOpen]);

  // Step 1: check the listing, then open the modal (no window.confirm).
const handleDeleteListing = async (listingId: string, title: string) => {
  setDeletingListingId(listingId);
  setActionError(null);

  const infoResult = await listingService.getDeleteInfo(listingId);
  setDeletingListingId(null);

  if (infoResult.error) {
    setActionError(infoResult.error.message);
    return;
  }

  if (!infoResult.data) {
    setActionError('Could not verify the listing.');
    return;
  }

  setDeleteTarget({
    id: listingId,
    title,
    hasReservations: infoResult.data.hasReservations,
  });
};

// Step 2: runs when the user confirms in the modal.
const handleConfirmDelete = async () => {
  if (!deleteTarget) return;

  setDeletingListingId(deleteTarget.id);
  setActionError(null);

  const { error } = await listingService.hardDeleteListing(deleteTarget.id);

  setDeletingListingId(null);
  setDeleteTarget(null);

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
  const profileBio = isOwner
    ? profile?.bio?.trim() || ''
    : viewedProfile?.bio?.trim() || '';
  // Public city: reuse the profile field; fall back to the seller's most
  // common listing city (real listing data, never an invented location).
  const sellerLocation = isOwner
    ? profile?.location_city?.trim() || ''
    : viewedProfile?.location_city?.trim() ||
      mostCommonCity(publicListings) ||
      '';
  const featuredListings = publicListings.filter((item) => item.is_featured).slice(0, 3);
  const showFeatured = !isOwner && featuredListings.length > 0;

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
          <section
                  className={`profile-card profile-card--summary ${
                    !isOwner ? 'profile-card--summary-public' : ''
                  }`}
                  aria-label="Profile summary"
                >
            <div className="profile-summary__cover">
              {editing && coverPreview ? (
                    <img src={coverPreview} alt="" />
                  ) : coverUrl ? (
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
                    ) : avatarUrl ? (
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
                <h1 className="profile-summary__name">{profileName}</h1>
                <p className="profile-summary__role">
                  {!isOwner && sellerLocation ? (
                    <span className="profile-summary__location">
                      <MapPin size={13} aria-hidden="true" />
                      <span>{sellerLocation}</span>
                    </span>
                  ) : (
                    'User'
                  )}
                </p>
                {!isOwner && profileBio ? (
                  <p className="profile-summary__bio">{profileBio}</p>
                ) : null}
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

            <div
              className={`profile-summary__badges${!isOwner ? ' profile-summary__badges--seller' : ''}`}
              aria-label="Account status badges"
            >
              <span className="profile-badge profile-badge--neutral">
                <Calendar size={14} className="profile-badge__icon" />
                <span>Member since {memberSince}</span>
              </span>

              {!isOwner && viewingUserId ? (
                <SellerRatingWidget
                  sellerId={viewingUserId}
                  sellerName={profileName}
                  refreshKey={reviewsVersion}
                  onSubmitted={() => setReviewsVersion((v) => v + 1)}
                />
              ) : null}

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

                <label className="profile-edit-field">
                  <span>City (shown publicly)</span>
                  <input
                    type="text"
                    value={locationDraft}
                    maxLength={120}
                    placeholder="e.g. Davao City"
                    onChange={(e) => setLocationDraft(e.target.value)}
                  />
                </label>

                <label className="profile-edit-field">
                  <span>Seller bio (shown publicly)</span>
                  <textarea
                    value={bioDraft}
                    maxLength={500}
                    rows={3}
                    placeholder="Tell buyers what you sell…"
                    onChange={(e) => setBioDraft(e.target.value)}
                  />
                  <span className="profile-edit-counter">{bioDraft.trim().length}/500</span>
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
                  <>
                    <button
                      type="button"
                      className={isFollowing ? 'profile-btn-outline' : 'profile-btn-sm-outline'}
                      onClick={handleToggleFollow}
                      disabled={followBusy}
                      aria-pressed={isFollowing}
                    >
                      <span>{followBusy ? 'Working…' : isFollowing ? 'Following' : 'Follow'}</span>
                    </button>
                    <button
                      type="button"
                      className="profile-btn-sm-outline"
                      onClick={() => void handleMessageSellerClick()}
                      disabled={messageSellerBusy}
                      aria-busy={messageSellerBusy}
                    >
                      <MessageSquare size={15} />
                      <span>{messageSellerBusy ? 'Opening…' : 'Message / Get in Touch'}</span>
                    </button>
                    <div className="profile-more-wrap" ref={moreMenuRef}>
                      <button
                        type="button"
                        className="profile-more-btn"
                        onClick={() => setMoreOpen((open) => !open)}
                        aria-haspopup="menu"
                        aria-expanded={moreOpen}
                        aria-label="More options"
                        title="More options"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                      {moreOpen ? (
                        <div className="profile-more-menu" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            className="profile-more-menu__item profile-more-menu__item--danger"
                            onClick={() => {
                              setMoreOpen(false);
                              setReportOpen(true);
                            }}
                          >
                            <Flag size={14} aria-hidden="true" />
                            <span>Report seller</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
                {followError ? (
                  <p className="profile-action-error" role="alert">
                    {followError}
                  </p>
                ) : null}
              </div>
            )}
          </section>

          {/* Right Card: Active Reservations (as buyer) */}
          {isOwner && (
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
          )}
        </div>

        {/* Row 1b: Reservations on MY listings (seller side). */}
        {isOwner && (
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
                    <span className="profile-reservation-item__buyer">
                      Reserved by{' '}
                      <strong>
                        {buyerDisplays[reservation.buyer_id]?.full_name?.trim() || 'a buyer'}
                      </strong>
                    </span>
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
                        onClick={async () => {
                          const buyerName =
                            buyerDisplays[reservation.buyer_id]?.full_name?.trim() || 'The buyer';
                          const listingTitle = reservation.listing?.title ?? 'this listing';
                          setActionError(null);
                          const { error } = await reservationService.confirmReservation(reservation.id);
                          if (error) {
                            setActionError(error.message);
                            return;
                          }
                          await loadAll();
                          setChatError(null);
                          setChatModal({
                            buyerName,
                            listingTitle,
                            listingId: reservation.listing_id,
                            buyerId: reservation.buyer_id,
                          });
                        }}
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
        )}

        {/* Row 2: My Listings */}
        {isOwner && (
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
                  <div className="profile-listing-actions">
                      <button
                        type="button"
                        className="profile-btn-sm-outline"
                        onClick={() => navigate(`/edit-listing/${item.id}`)}
                        disabled={deletingListingId === item.id}
                      >
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="profile-listing-delete-btn"
                        onClick={() => handleDeleteListing(item.id, item.title)}
                        disabled={deletingListingId === item.id}
                        aria-label={`Delete ${item.title}`}
                        title="Delete listing permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                </div>
              ))
            )}
          </div>
        </section>
        )}

                  {!isOwner && (
          <>
            {publicStats ? (
              <section className="profile-card profile-card--storefront" aria-label="Seller stats">
                <div className="profile-card__header">
                  <div className="profile-card__title-wrap">
                    <BadgeCheck size={18} className="profile-card__header-icon" />
                    <h2 className="profile-card__title">Seller stats</h2>
                  </div>
                </div>
                <div className="profile-storefront-stats">
                  <div className="profile-storefront-stat">
                    <span className="profile-storefront-stat__value">{publicStats.active_listings}</span>
                    <span className="profile-storefront-stat__label">Active listings</span>
                  </div>
                  <div className="profile-storefront-stat">
                    <span className="profile-storefront-stat__value">{publicStats.sold_listings}</span>
                    <span className="profile-storefront-stat__label">Items sold</span>
                  </div>
                  <div className="profile-storefront-stat">
                    <span className="profile-storefront-stat__value">{followCounts ? followCounts.followers : '—'}</span>
                    <span className="profile-storefront-stat__label">Followers</span>
                  </div>
                </div>
              </section>
            ) : publicStatsFailed ? (
              <p className="profile-empty-note" role="alert">
                Could not load seller stats.
              </p>
            ) : null}

            <section className="profile-card profile-card--storefront" aria-label="About this seller">
              <div className="profile-card__header">
                <div className="profile-card__title-wrap">
                  <h2 className="profile-card__title">About this seller</h2>
                </div>
              </div>
              {profileBio ? (
                <p className="profile-storefront-bio">{profileBio}</p>
              ) : (
                <p className="profile-empty-note">No seller bio yet.</p>
              )}
            </section>

            <section className="profile-card profile-card--storefront" aria-label="Seller ratings">
              <div className="profile-card__header">
                <div className="profile-card__title-wrap">
                  <Star size={18} className="profile-card__header-icon" />
                  <h2 className="profile-card__title">Seller ratings</h2>
                </div>
              </div>
              {viewingUserId ? (
                <SellerReviewsList
                  sellerId={viewingUserId}
                  currentUserId={user?.id ?? null}
                  refreshKey={reviewsVersion}
                  onChanged={() => setReviewsVersion((v) => v + 1)}
                />
              ) : (
                <p className="profile-empty-note">No reviews yet.</p>
              )}
            </section>

            {showFeatured ? (
              <section className="profile-card profile-card--storefront" aria-label="Featured finds">
                <div className="profile-card__header">
                  <div className="profile-card__title-wrap">
                    <h2 className="profile-card__title">Featured finds</h2>
                  </div>
                </div>
                <div className="profile-featured-grid">
                  {featuredListings.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="profile-featured-card"
                      onClick={() => navigate(`/listing/${item.id}`)}
                      aria-label={`View listing: ${item.title}`}
                    >
                      {publicListingImageUrls[item.id] ? (
                        <img
                          src={publicListingImageUrls[item.id]}
                          alt=""
                          className="profile-featured-card__image"
                          loading="lazy"
                        />
                      ) : (
                        <span className="profile-featured-card__image profile-featured-card__image--empty" aria-hidden="true" />
                      )}
                      <span className="profile-featured-card__body">
                        <span className="profile-featured-card__title">{item.title}</span>
                        <span className="profile-featured-card__meta">
                          {formatPeso(item.price)}{item.city ? ` · ${item.city}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        {!isOwner && (
          <section
            className="profile-card profile-card--listings"
            aria-label="Public listings"
          >
            <div className="profile-card__header">
              <div className="profile-card__title-wrap">
                <Package size={18} className="profile-card__header-icon" />
                <h2 className="profile-card__title">Listings</h2>
              </div>
            </div>

            <div className="profile-reservations__list">
              {loading ? (
                <p className="profile-empty-note">Loading…</p>
              ) : publicListings.length === 0 ? (
                <p className="profile-empty-note">
                  {profileName} has no active listings.
                </p>
              ) : (
                publicListings.map((item) => (
                  <div className="profile-reservation-item" key={item.id}>
                    {publicListingImageUrls[item.id] && (
                      <img
                        src={publicListingImageUrls[item.id]}
                        alt=""
                        className="profile-listing-thumb"
                      />
                    )}

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
                      {formatPeso(item.price)} · {item.city}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}


        {/* Row 3: Four Small Stat Cards */}
        {isOwner && (
        <div className="profile-dashboard__row profile-dashboard__row--four-col" aria-label="Quick metrics">
          {/* Card 1: Reviews (FR-011) — the signed-in seller's own average */}
          <div className="profile-stat-card">
            <div className="profile-stat-card__icon-wrap profile-stat-card__icon-wrap--star">
              <Star size={18} className="profile-stat-icon" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-text">
                {ownReviewSummary && ownReviewSummary.count > 0
                  ? `${ownReviewSummary.average.toFixed(1)} / 5`
                  : 'No reviews yet'}
              </div>
              <div className="profile-stat-card__meta">
                {ownReviewSummary && ownReviewSummary.count > 0
                  ? `${ownReviewSummary.count} ${ownReviewSummary.count === 1 ? 'review' : 'reviews'} from buyers`
                  : 'Buyers can rate you after a completed reservation'}
              </div>
            </div>
          </div>

          {/* Card 2: Saved items — replaces the old "open chats" placeholder */}
          <button
            type="button"
            className="profile-stat-card profile-stat-card--interactive"
            onClick={() => navigate('/saved-items')}
          >
            <div className="profile-stat-card__icon-wrap">
              <ShoppingBag size={18} className="profile-stat-icon" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-value">{savedCount}</div>
              <div className="profile-stat-card__meta">Saved items</div>
            </div>
          </button>

          {/* Card 3: Incoming reservations — replaces the fake unread count */}
          <div className="profile-stat-card">
            <div className="profile-stat-card__icon-wrap profile-stat-card__icon-wrap--active">
              <Bell size={18} className="profile-stat-icon" />
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
                <Settings size={18} className="profile-stat-icon" />
              </div>
              <ChevronRight size={16} className="profile-stat-card__chevron" />
            </div>
            <div className="profile-stat-card__body">
              <div className="profile-stat-card__primary-text">Account</div>
              <div className="profile-stat-card__meta">Name, contact number</div>
            </div>
          </button>
        </div>
        )}

        {/* Row 4: Transaction History (finished reservations, as a buyer) */}
        {isOwner && (
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
        )}
            </div>

      {!isOwner && viewingUserId ? (
        <MessageSellerModal
          open={messageSellerOpen}
          onOpenChange={(open) => {
            setMessageSellerOpen(open);
            if (!open) setMessageSellerError(null);
          }}
          sellerName={profileName}
          listings={publicListings.map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price,
          }))}
          busyListingId={messageSellerBusyId}
          error={messageSellerError}
          onPick={handlePickSellerListing}
        />
      ) : null}

      <ChatBuyerModal
        open={chatModal !== null}
        onOpenChange={(open) => {
          if (!open) setChatModal(null);
        }}
        buyerName={chatModal?.buyerName ?? ''}
        listingTitle={chatModal?.listingTitle ?? ''}
        busy={chatBusy}
        error={chatError}
        onMessageBuyer={async () => {
          if (!chatModal) return;
          setChatBusy(true);
          setChatError(null);
          const { data, error } = await messageService.startConversation(
            chatModal.listingId,
            chatModal.buyerId
          );
          setChatBusy(false);
          if (error || !data) {
            setChatError(error?.message ?? 'Could not open the conversation.');
            return;
          }
          setChatModal(null);
          openMessagesWidget(data);
        }}
      />
      {!isOwner ? (
        <ReportSellerModal
          open={reportOpen}
          onOpenChange={setReportOpen}
          sellerName={profileName}
        />
      ) : null}
      <DeleteListingModal
          open={deleteTarget !== null}
          listingTitle={deleteTarget?.title ?? ''}
          hasReservations={deleteTarget?.hasReservations ?? false}
          busy={deletingListingId !== null && deletingListingId === deleteTarget?.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
    </div>
  );
};

export default Profile;