import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ListOrdered,
  Loader2,
  MapPin,
  PackageOpen,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';

import { Button } from '../components/ui/button';
import { listingService, type MyListingRow } from '../services/listingService';
import { asCondition, formatPeso, listingImageUrl } from '../lib/listingMappers';
import type { ListingCondition } from '../types/database';

// Reuses the condition pills + product card tokens ProductCard already owns.
import '../components/ProductCard.css';
import './MyListings.css';

type StatusTab = 'active' | 'archived';

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'archived', label: 'Archived' },
];

/** Same condition → class mapping ProductCard uses, so the pills match. */
const CONDITION_CLASS: Record<ListingCondition, string> = {
  'Like New': 'condition-like-new',
  Excellent: 'condition-excellent',
  Good: 'condition-good',
  Fair: 'condition-fair',
};

/** "Barangay, City" — the same join browseRowToProduct() performs. */
function listingLocation(listing: MyListingRow): string {
  const parts = [listing.barangay, listing.city].filter(
    (part) => !!part && part.trim().length > 0
  );
  return parts.join(', ') || listing.city;
}

interface MyListingCardProps {
  listing: MyListingRow;
  busy: boolean;
  featuredBusyId: string | null;
  onOpen: (listing: MyListingRow) => void;
  onEdit: (listing: MyListingRow) => void;
  onToggleStatus: (listing: MyListingRow) => void;
  onDelete: (listing: MyListingRow) => void;
  onToggleFeatured: (listing: MyListingRow) => void;
}

/**
 * Owner-facing card.
 *
 * Deliberately separate from ProductCard: that card is built around the
 * buyer's favorite heart and a whole-card navigation, while this one needs
 * management actions — so ProductCard is reused visually (tokens, condition
 * pills) but left untouched.
 */
const MyListingCard: React.FC<MyListingCardProps> = ({
  listing,
  busy,
  featuredBusyId,
  onOpen,
  onEdit,
  onToggleStatus,
  onDelete,
  onToggleFeatured,
}) => {
  const isActive = listing.status === 'active';
  const condition = asCondition(listing.condition);
  const featuredBusy = featuredBusyId === listing.id;

  return (
    <article className="my-listings-card">
      <button
        type="button"
        className="my-listings-card__media"
        onClick={() => onOpen(listing)}
        aria-label={`View listing: ${listing.title}`}
      >
        <img
          src={listingImageUrl(listing.cover_image_path)}
          alt=""
          className="my-listings-card__image"
          loading="lazy"
        />

        <span
          className={`my-listings-card__status ${
            isActive ? 'my-listings-card__status--active' : ''
          }`}
        >
          {isActive ? 'Active' : 'Archived'}
        </span>
      </button>

      <div className="my-listings-card__body">
        <div className="my-listings-card__meta-top">
          <span className={`condition-pill ${CONDITION_CLASS[condition]}`}>
            {condition}
          </span>
        </div>

        <h3 className="my-listings-card__title">
          <button
            type="button"
            className="my-listings-card__title-btn"
            onClick={() => onOpen(listing)}
          >
            {listing.title}
          </button>
        </h3>

        <div className="my-listings-card__price">{formatPeso(listing.price)}</div>

        <div className="my-listings-card__location">
          <MapPin size={13} aria-hidden="true" />
          <span>{listingLocation(listing)}</span>
        </div>

        <div className="my-listings-card__actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(listing)}
            disabled={busy}
          >
            <Pencil aria-hidden="true" />
            Edit
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleStatus(listing)}
            disabled={busy}
          >
            {isActive ? (
              <Archive aria-hidden="true" />
            ) : (
              <ArchiveRestore aria-hidden="true" />
            )}
            {isActive ? 'Archive' : 'Restore'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleFeatured(listing)}
            disabled={busy || featuredBusy || !isActive}
            aria-pressed={listing.is_featured}
            title={
              !isActive
                ? 'Only active listings can be featured'
                : listing.is_featured
                  ? 'Remove from Featured Finds'
                  : 'Show in Featured Finds (max 3)'
            }
          >
            <Star aria-hidden="true" />
            {featuredBusy ? 'Working…' : listing.is_featured ? 'Featured' : 'Feature'}
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDelete(listing)}
            disabled={busy}
            aria-label={`Delete ${listing.title}`}
            title="Delete listing permanently"
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
};

/**
 * My Listings (FR-002) — the signed-in seller's own listings.
 *
 * Ownership never comes from the URL: `listingService.getMyListings()`
 * resolves the user from the Supabase session and filters
 * `listings.seller_id = <auth user>`, so this route cannot be pointed at
 * another user's rows by changing the query string.
 */
const MyListings: React.FC = () => {
  const navigate = useNavigate();

  const [activeListings, setActiveListings] = useState<MyListingRow[]>([]);
  const [archivedListings, setArchivedListings] = useState<MyListingRow[]>([]);

  const [tab, setTab] = useState<StatusTab>('active');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [featuredBusyId, setFeaturedBusyId] = useState<string | null>(null);

  const loadMyListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Each query is filtered server-side by status AND by the signed-in
    // seller, so nothing is fetched and then filtered in the browser.
    const [activeResult, archivedResult] = await Promise.all([
      listingService.getMyListings({ status: 'active' }),
      listingService.getMyListings({ status: 'archived' }),
    ]);

    const failed = activeResult.error ?? archivedResult.error;

    if (failed) {
      setActiveListings([]);
      setArchivedListings([]);
      setError(failed.message);
      setLoading(false);
      return;
    }

    setActiveListings(activeResult.data ?? []);
    setArchivedListings(archivedResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMyListings();
  }, [loadMyListings]);

  const listings = tab === 'active' ? activeListings : archivedListings;
  const hasAnyListings = activeListings.length > 0 || archivedListings.length > 0;

  const handleOpen = (listing: MyListingRow) => {
    // `from` keeps the listing detail's own back button pointing here.
    navigate(`/listing/${listing.id}`, { state: { from: '/my-listings' } });
  };

  const handleEdit = (listing: MyListingRow) => {
    navigate(`/edit-listing/${listing.id}`);
  };

  const handleToggleStatus = async (listing: MyListingRow) => {
    const isActive = listing.status === 'active';

    setBusyId(listing.id);
    setActionError(null);
    setNotice(null);

    const { error: toggleError } = isActive
      ? await listingService.archiveListing(listing.id)
      : await listingService.unarchiveListing(listing.id);

    if (toggleError) {
      setBusyId(null);
      setActionError(toggleError.message);
      return;
    }

    await loadMyListings();
    setBusyId(null);
    setNotice(
      isActive
        ? 'Listing archived. You can restore it from the Archived tab anytime.'
        : 'Listing restored — it is visible to buyers again.'
    );
  };

  const handleToggleFeatured = async (listing: MyListingRow) => {
    if (listing.status !== 'active') return;
    setFeaturedBusyId(listing.id);
    setActionError(null);
    setNotice(null);

    const { error } = await listingService.setFeatured(listing.id, !listing.is_featured);

    if (error) {
      setFeaturedBusyId(null);
      setActionError(error.message);
      return;
    }

    await loadMyListings();
    setFeaturedBusyId(null);
    setNotice(
      listing.is_featured
        ? 'Listing removed from Featured Finds.'
        : 'Listing pinned to Featured Finds on your public profile.'
    );
  };

  /**
   * Same safety flow the profile page already uses: check the listing for
   * reservation history, confirm with the user, then delete through the
   * existing service (which removes the Storage objects first).
   */
  const handleDelete = async (listing: MyListingRow) => {
    setBusyId(listing.id);
    setActionError(null);
    setNotice(null);

    try {
      const infoResult = await listingService.getDeleteInfo(listing.id);

      if (infoResult.error) {
        setActionError(infoResult.error.message);
        return;
      }

      if (!infoResult.data) {
        setActionError('Could not verify the listing.');
        return;
      }

      const { hasReservations } = infoResult.data;

      const confirmed = hasReservations
        ? window.confirm(
            `⚠️ This listing has existing reservation history.\n\n` +
              `Deleting "${listing.title}" will permanently delete the listing, ` +
              `all of its photos, and the associated reservation records.\n\n` +
              `This action cannot be undone.\n\n` +
              `Do you want to permanently delete this listing?`
          )
        : window.confirm(
            `Delete "${listing.title}" permanently?\n\n` +
              `This will permanently delete the listing and all of its photos. ` +
              `This action cannot be undone.`
          );

      if (!confirmed) return;

      const { error: deleteError } = await listingService.hardDeleteListing(
        listing.id
      );

      if (deleteError) {
        setActionError(deleteError.message);
        return;
      }

      await loadMyListings();
      setNotice('Listing deleted permanently.');
    } finally {
      setBusyId(null);
    }
  };

  const selectedLabel = tab === 'active' ? 'Active Listings' : 'Archived Listings';

  return (
    <div className="my-listings-page">
      <header className="my-listings-header">
        <div className="my-listings-header-container">
          <div className="my-listings-header-left">
            <div className="my-listings-header-icon" aria-hidden="true">
              <ListOrdered size={20} />
            </div>

            <div className="my-listings-header-text">
              <h1>My Listings</h1>
              <p>Manage the items you've listed on ThriftFinder.</p>
            </div>
          </div>

          <div className="my-listings-header-action">
            {/* Text-only action — deliberately not a filled Button. */}
            <button
              type="button"
              className="my-listings-create-action"
              onClick={() => navigate('/create-listing')}
            >
              <Plus size={16} aria-hidden="true" />
              Create Listing
            </button>
          </div>
        </div>
      </header>

      <main className="my-listings-content">
        <div className="my-listings-container">
          {actionError ? (
            <div
              className="my-listings-inline my-listings-inline--danger"
              role="alert"
            >
              {actionError}
            </div>
          ) : null}

          {notice ? (
            <div className="my-listings-inline" role="status">
              {notice}
            </div>
          ) : null}

          {loading ? (
            <div className="my-listings-state" role="status" aria-live="polite">
              <Loader2 size={28} className="my-listings-state-spinner" />
              <p>Loading your listings…</p>
            </div>
          ) : error ? (
            <div className="my-listings-state" role="alert">
              <AlertCircle size={28} />
              <p>{error}</p>

              <Button
                type="button"
                variant="outline"
                onClick={() => void loadMyListings()}
              >
                Try again
              </Button>
            </div>
          ) : !hasAnyListings ? (
            <div className="my-listings-state">
              <PackageOpen size={32} />
              <h2>You haven't listed anything yet</h2>
              <p>Start selling your first item on ThriftFinder.</p>
            </div>
          ) : (
            <>
              <div className="my-listings-tabs" aria-label="Listing status">
                {STATUS_TABS.map((statusTab) => {
                  const count =
                    statusTab.id === 'active'
                      ? activeListings.length
                      : archivedListings.length;

                  return (
                    <button
                      key={statusTab.id}
                      type="button"
                      className={`my-listings-tab ${
                        tab === statusTab.id ? 'is-active' : ''
                      }`}
                      onClick={() => setTab(statusTab.id)}
                      aria-pressed={tab === statusTab.id}
                    >
                      {statusTab.label}
                      <span className="my-listings-tab__count">{count}</span>
                    </button>
                  );
                })}
              </div>

              <section aria-label={selectedLabel}>
                <h2 className="my-listings-section-title">{selectedLabel}</h2>

                {listings.length === 0 ? (
                  <p className="my-listings-empty-note">
                    {tab === 'active'
                      ? 'You have no active listings right now.'
                      : 'You have no archived listings.'}
                  </p>
                ) : (
                  <div className="my-listings-grid">
                    {listings.map((listing) => (
                      <MyListingCard
                        key={listing.id}
                        listing={listing}
                        busy={busyId === listing.id}
                        featuredBusyId={featuredBusyId}
                        onOpen={handleOpen}
                        onEdit={handleEdit}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDelete}
                        onToggleFeatured={handleToggleFeatured}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyListings;
