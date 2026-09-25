import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Package, Loader2, Pencil, Archive } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { listingService } from '../services/listingService';
import { reservationService } from '../services/reservationService';
import { favoriteService } from '../services/favoriteService';
import { listingImageUrl, formatPeso, IMAGE_PLACEHOLDER } from '../lib/listingMappers';
import { useAuth } from '../context/AuthContext';
import type { ListingDetail, ReservationStatus } from '../types/database';
import './ListingDetails.css';

function getConditionClass(condition: string) {
  switch (condition) {
    case 'Like New':
      return 'condition-like-new';
    case 'Excellent':
      return 'condition-excellent';
    case 'Good':
      return 'condition-good';
    case 'Fair':
      return 'condition-fair';
    default:
      return '';
  }
}

function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const deadline = new Date(iso).getTime();
  const msLeft = deadline - Date.now();
  if (msLeft <= 0) return 'holding period has passed';
  const hours = Math.floor(msLeft / 3_600_000);
  if (hours >= 1) return `${hours}h left to confirm`;
  const minutes = Math.max(1, Math.round(msLeft / 60_000));
  return `${minutes}m left to confirm`;
}

const ListingDetails: React.FC = () => {
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from || '/browse';

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [showReserveDialog, setShowReserveDialog] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [reservationConfirmed, setReservationConfirmed] = useState(false);

  const [archiving, setArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    const { data, error } = await listingService.getDetail(id);

    if (error || !data) {
      setDetail(null);
      setLoadError(error?.message ?? 'Listing not found.');
      setLoading(false);
      return;
    }

    setDetail(data);
    setSelectedImageIndex(0);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  // Saved state (OPTIONAL favorites module — degrades to "not saved").
  useEffect(() => {
    let active = true;
    if (!id || !isAuthenticated) {
      setIsSaved(false);
      return;
    }
    (async () => {
      const saved = await favoriteService.isFavorite(id);
      if (active) setIsSaved(saved);
    })();
    return () => {
      active = false;
    };
  }, [id, isAuthenticated]);

  // -----------------------------------------------------------------
  // Loading / not-found states (reuses the existing not-found styling)
  // -----------------------------------------------------------------
  if (loading) {
    return (
      <div className="listing-not-found">
        <div className="not-found-content">
          <Loader2 size={48} className="not-found-icon" />
          <h1>Loading listing…</h1>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="listing-not-found">
        <div className="not-found-content">
          <Package size={64} className="not-found-icon" />
          <h1>Listing not found</h1>
          <p>{loadError ?? "Sorry, we couldn't find the listing you're looking for."}</p>
          <Button onClick={() => navigate(backTo)} className="back-to-browse-btn">
            Back to Browse
          </Button>
        </div>
      </div>
    );
  }

  const listing = detail.listing;
  const images = detail.images;
  const galleryUrls =
    images.length > 0 ? images.map((img) => listingImageUrl(img.storage_path)) : [IMAGE_PLACEHOLDER];
  const activeIndex = Math.min(selectedImageIndex, galleryUrls.length - 1);

  const isArchived = listing.status !== 'active';
  const isSeller = listing.viewer_is_seller;
  const viewerStatus = listing.viewer_reservation_status as ReservationStatus | null;
  const viewerHasActiveReservation =
    viewerStatus === 'Pending' || viewerStatus === 'Confirmed';
  const reservedBySomeoneElse = listing.is_reserved && !viewerHasActiveReservation;

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    const next = !isSaved;
    setIsSaved(next);
    const { error } = await favoriteService.toggleFavorite(listing.id, isSaved);
    if (error) setIsSaved(!next);
  };

  const handleReserve = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setReserveError(null);
    setReservationConfirmed(false);
    setShowReserveDialog(true);
  };

  const handleConfirmReservation = async () => {
    setReserving(true);
    setReserveError(null);

    const { data, error } = await reservationService.reserveListing(listing.id);

    setReserving(false);

    if (error || !data) {
      setReserveError(error?.message ?? 'Could not place the reservation.');
      return;
    }

    // The database is the source of truth — re-read the listing so the page
    // reflects the row that was actually created.
    setReservationConfirmed(true);
    await loadDetail();
  };

  const handleCancelReservation = async () => {
    if (!listing.viewer_reservation_id) return;
    setActionError(null);
    const { error } = await reservationService.cancelReservation(listing.viewer_reservation_id);
    if (error) {
      setActionError(error.message);
      return;
    }
    await loadDetail();
  };

  const handleArchive = async () => {
    setArchiving(true);
    setActionError(null);
    const { error } = await listingService.archiveListing(listing.id);
    setArchiving(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    await loadDetail();
  };

  const handleUnarchive = async () => {
    setArchiving(true);
    setActionError(null);
    const { error } = await listingService.unarchiveListing(listing.id);
    setArchiving(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    await loadDetail();
  };

  const deadlineText = formatDeadline(listing.reservation_expires_at);

  return (
    <div className="listing-details-page">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-container">
        <Link to={backTo} className="breadcrumb-link">
          <ArrowLeft size={18} />
          <span>Back to Browse</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="listing-content">
        {/* Left Column - Images */}
        <div className="listing-images">
          <div className="main-image-container">
            <img src={galleryUrls[activeIndex]} alt={listing.title} className="main-image" />
            {listing.is_reserved ? <span className="listing-tag">Reserved</span> : null}
            {isArchived ? <span className="listing-tag">Archived</span> : null}
          </div>

          {/* Thumbnail Gallery — one entry per real listing_images row */}
          {galleryUrls.length > 1 ? (
            <div className="thumbnail-gallery">
              {galleryUrls.map((img, index) => (
                <button
                  key={images[index]?.id ?? index}
                  className={`thumbnail ${activeIndex === index ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={img} alt={`${listing.title} view ${index + 1}`} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Right Column - Details */}
        <div className="listing-info">
          {/* Condition Badge */}
          <div className="listing-header">
            <span className={`condition-pill ${getConditionClass(listing.condition)}`}>
              {listing.condition}
            </span>
          </div>

          {/* Title */}
          <h1 className="listing-title">{listing.title}</h1>

          {/* Price */}
          <div className="listing-price">{formatPeso(listing.price)}</div>

          {/* Location */}
          <div className="listing-location">
            <MapPin size={18} className="location-icon" />
            <div className="location-text">
              <span className="location-name">{listing.city}</span>
              {listing.barangay ? (
                <span className="location-proximity">{listing.barangay}</span>
              ) : null}
            </div>
          </div>

          {/* Reservation status (FR-005 / FR-007) */}
          {isArchived ? (
            <div className="listing-status-note" role="status">
              This listing has been archived by the seller and is no longer available.
            </div>
          ) : viewerHasActiveReservation ? (
            <div className="listing-status-note listing-status-note--mine" role="status">
              Your reservation is <strong>{viewerStatus}</strong>
              {viewerStatus === 'Pending' && deadlineText ? ` — ${deadlineText}` : ''}.
            </div>
          ) : listing.is_reserved ? (
            <div className="listing-status-note" role="status">
              Reserved by another buyer
              {listing.reservation_status === 'Pending' && deadlineText ? ` — ${deadlineText}` : ''}.
            </div>
          ) : null}

          <div className="divider"></div>

          {/* Seller Information */}
          <div className="seller-section">
            <h3 className="section-title">Sold by</h3>
            <div className="seller-card">
              <div className="seller-avatar">{getInitials(listing.seller_full_name)}</div>
              <div className="seller-details">
                <div className="seller-name">{listing.seller_full_name}</div>
                <div className="seller-meta">
                  <span className="seller-listings">
                    {listing.seller_active_listings}{' '}
                    {listing.seller_active_listings === 1 ? 'active listing' : 'active listings'}
                  </span>
                </div>
                <div className="seller-location">{listing.city}</div>
              </div>
            </div>
            {/*
              Kept from the original UI as a placeholder — it was already a
              no-op (onClick={() => {}}) before Phase 2. A dedicated seller
              profile page is out of this phase's scope, so its behavior is
              unchanged rather than invented.
            */}
            <Button variant="outline" className="view-seller-btn" onClick={() => {}}>
              View Seller
            </Button>
          </div>

          <div className="divider"></div>

          {/* Description */}
          <div className="description-section">
            <h3 className="section-title">About this item</h3>
            <p className="description-text">{listing.description}</p>
          </div>

          <div className="divider"></div>

          {/* Action Buttons */}
          {actionError ? (
            <div className="listing-status-note listing-status-note--error" role="alert">
              {actionError}
            </div>
          ) : null}

          {isSeller ? (
            <div className="action-buttons">
              <Button
                variant="outline"
                className="save-btn"
                onClick={() => navigate(`/edit-listing/${listing.id}`)}
              >
                <Pencil size={18} />
                Edit Listing
              </Button>
              {isArchived ? (
                <Button className="reserve-btn" onClick={handleUnarchive} disabled={archiving}>
                  {archiving ? 'Working…' : 'Restore Listing'}
                </Button>
              ) : (
                <Button className="reserve-btn" onClick={handleArchive} disabled={archiving}>
                  <Archive size={18} />
                  {archiving ? 'Working…' : 'Archive Listing'}
                </Button>
              )}
            </div>
          ) : (
            <div className="action-buttons">
              <Button
                variant="outline"
                className={`save-btn ${isSaved ? 'saved' : ''}`}
                onClick={handleToggleSave}
              >
                <Heart
                  size={20}
                  fill={isSaved ? '#ec4899' : 'none'}
                  color={isSaved ? '#ec4899' : 'currentColor'}
                />
                {isSaved ? 'Saved' : 'Save Item'}
              </Button>

              {viewerHasActiveReservation ? (
                <Button
                  variant="outline"
                  className="reserve-btn"
                  onClick={handleCancelReservation}
                >
                  Cancel Reservation
                </Button>
              ) : (
                <Button
                  className="reserve-btn"
                  onClick={handleReserve}
                  disabled={isArchived || reservedBySomeoneElse}
                >
                  {isArchived
                    ? 'Unavailable'
                    : reservedBySomeoneElse
                      ? 'Reserved'
                      : 'Reserve Item'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reserve Dialog */}
      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent>
          {!reservationConfirmed ? (
            <>
              <DialogHeader>
                <DialogTitle>Reserve this item?</DialogTitle>
                <DialogDescription>
                  You're about to reserve <strong>{listing.title}</strong> for{' '}
                  <strong>{formatPeso(listing.price)}</strong>. The seller has a limited
                  holding period to confirm before the reservation expires.
                </DialogDescription>
              </DialogHeader>

              {reserveError ? (
                <div className="listing-status-note listing-status-note--error" role="alert">
                  {reserveError}
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowReserveDialog(false)}
                  disabled={reserving}
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirmReservation} disabled={reserving}>
                  {reserving ? 'Reserving…' : 'Confirm Reservation'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="reservation-success">
              <div className="success-icon">✓</div>
              <DialogHeader>
                <DialogTitle>Reservation request sent</DialogTitle>
                <DialogDescription>
                  The seller can now confirm your reservation. You can track its status on
                  your profile.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setShowReserveDialog(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingDetails;