import React, { useCallback, useEffect, useState } from 'react';
import { reviewService } from '../services/reviewService';
import type { SellerReviewRow, SellerReviewSummary } from '../types/database';
import PeekRating from './PeekRating';
import './SellerReviews.css';

interface SellerReviewsListProps {
  sellerId: string;
  /** Signed-in user's id, so they can delete their own review. */
  currentUserId?: string | null;
  /** Bump this number to reload (e.g. right after posting a review). */
  refreshKey?: number;
  /** Called after one of the viewer's reviews was deleted. */
  onChanged?: () => void;
}

const PAGE_SIZE = 10;

function initialsOf(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Summary (average + 1-5 breakdown) and the public review list for one seller. */
const SellerReviewsList: React.FC<SellerReviewsListProps> = ({
  sellerId,
  currentUserId = null,
  refreshKey = 0,
  onChanged,
}) => {
  const [summary, setSummary] = useState<SellerReviewSummary | null>(null);
  const [reviews, setReviews] = useState<SellerReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [summaryResult, listResult] = await Promise.all([
      reviewService.getSellerSummary(sellerId),
      reviewService.getSellerReviews(sellerId, { limit: PAGE_SIZE, offset: 0 }),
    ]);

    if (summaryResult.error || listResult.error) {
      setFailed(true);
      setLoading(false);
      return;
    }

    setSummary(summaryResult.data);
    setReviews(listResult.data ?? []);
    setHasMore((listResult.data ?? []).length === PAGE_SIZE);
    setLoading(false);
  }, [sellerId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    const result = await reviewService.getSellerReviews(sellerId, {
      limit: PAGE_SIZE,
      offset: reviews.length,
    });
    setLoadingMore(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    const next = result.data ?? [];
    setReviews((prev) => [...prev, ...next]);
    setHasMore(next.length === PAGE_SIZE);
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Delete your review? This cannot be undone.')) return;
    setDeletingId(reviewId);
    setActionError(null);
    const result = await reviewService.deleteReview(reviewId);
    setDeletingId(null);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    await load();
    onChanged?.();
  };

  if (loading) return <p className="profile-empty-note">Loading reviews…</p>;
  if (failed) {
    return (
      <p className="profile-empty-note" role="alert">
        Could not load reviews.
      </p>
    );
  }

  const total = summary?.review_count ?? 0;
  if (total === 0) return <p className="profile-empty-note">No reviews yet.</p>;

  const breakdown = [
    { star: 5, count: summary?.count_5 ?? 0 },
    { star: 4, count: summary?.count_4 ?? 0 },
    { star: 3, count: summary?.count_3 ?? 0 },
    { star: 2, count: summary?.count_2 ?? 0 },
    { star: 1, count: summary?.count_1 ?? 0 },
  ];

  return (
    <div className="seller-reviews">
      <div className="seller-reviews__summary">
        <div className="seller-reviews__score">
          <span className="seller-reviews__average">
            {(summary?.average_rating ?? 0).toFixed(1)}
          </span>
          <PeekRating
            value={Math.round(summary?.average_rating ?? 0)}
            readOnly
            count={5}
            size={18}
            ariaLabel="Average rating"
          />
          <span className="seller-reviews__total">
            {total} {total === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        <ul className="seller-reviews__bars" aria-label="Rating breakdown">
          {breakdown.map((row) => (
            <li key={row.star} className="seller-reviews__bar-row">
              <span className="seller-reviews__bar-label">{row.star}★</span>
              <span className="seller-reviews__bar-track">
                <span
                  className="seller-reviews__bar-fill"
                  style={{ width: `${total > 0 ? (row.count / total) * 100 : 0}%` }}
                />
              </span>
              <span className="seller-reviews__bar-count">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="seller-reviews__list">
        {reviews.map((review) => {
          const mine = !!currentUserId && review.reviewer_id === currentUserId;
          return (
            <li key={review.id} className="seller-reviews__item">
              <span className="seller-reviews__avatar" aria-hidden="true">
                {initialsOf(review.reviewer_name)}
              </span>
              <div className="seller-reviews__body">
                <div className="seller-reviews__head">
                  <span className="seller-reviews__name">
                    {review.reviewer_name || 'ThriftFinder user'}
                    {mine ? ' (you)' : ''}
                  </span>
                  <span className="seller-reviews__date">
                    {new Date(review.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <PeekRating
                  value={review.rating}
                  readOnly
                  count={5}
                  size={14}
                  ariaLabel={`${review.rating} out of 5`}
                />
                {review.listing_title ? (
                  <span className="seller-reviews__listing">Item: {review.listing_title}</span>
                ) : null}
                {review.comment ? (
                  <p className="seller-reviews__comment">{review.comment}</p>
                ) : null}
                {mine ? (
                  <button
                    type="button"
                    className="seller-reviews__delete"
                    onClick={() => void handleDelete(review.id)}
                    disabled={deletingId === review.id}
                  >
                    {deletingId === review.id ? 'Deleting…' : 'Delete my review'}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {actionError ? (
        <p className="seller-rating__error" role="alert">
          {actionError}
        </p>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          className="seller-rating__btn seller-rating__btn--ghost"
          onClick={() => void loadMore()}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading…' : 'Show more reviews'}
        </button>
      ) : null}
    </div>
  );
};

export default SellerReviewsList;