import React, { useCallback, useEffect, useState } from 'react';
import { reviewService } from '../services/reviewService';
import type { ReviewableReservation, SellerReviewSummary } from '../types/database';
import PeekRating from './PeekRating';
import './SellerReviews.css';

interface SellerRatingWidgetProps {
  sellerId: string;
  sellerName: string;
  /** Bump this number to make the widget reload (e.g. after a review is deleted). */
  refreshKey?: number;
  /** Called after a review was saved so the reviews list can reload too. */
  onSubmitted?: () => void;
}

const COMMENT_MAX = 500;
const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/**
 * The "Rate: <seller>" control on a seller's public profile (FR-011).
 *
 * - Buyer with a Completed, not-yet-reviewed reservation with this seller:
 *   interactive stars -> optional comment -> Submit.
 * - Everyone else: read-only average + count, with a short hint.
 */
const SellerRatingWidget: React.FC<SellerRatingWidgetProps> = ({
  sellerId,
  sellerName,
  refreshKey = 0,
  onSubmitted,
}) => {
  const [summary, setSummary] = useState<SellerReviewSummary | null>(null);
  const [reviewable, setReviewable] = useState<ReviewableReservation[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const load = useCallback(async () => {
    const [summaryResult, reviewableResult] = await Promise.all([
      reviewService.getSellerSummary(sellerId),
      reviewService.getReviewableReservations(sellerId),
    ]);
    setSummary(summaryResult.data);
    setReviewable(reviewableResult.data ?? []);
  }, [sellerId]);

  useEffect(() => {
    setRating(0);
    setComment('');
    setError(null);
    setJustSubmitted(false);
    void load();
  }, [load, refreshKey]);

  const target = reviewable[0] ?? null;
  const canRate = !!target;

  const handleSubmit = async () => {
    if (!target || rating < 1 || busy) return;
    setBusy(true);
    setError(null);

    const result = await reviewService.submitReview({
      reservationId: target.reservation_id,
      rating,
      comment,
    });

    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setRating(0);
    setComment('');
    setJustSubmitted(true);
    await load();
    onSubmitted?.();
  };

  const handleCancel = () => {
    setRating(0);
    setComment('');
    setError(null);
  };

  const count = summary?.review_count ?? 0;
  const average = summary?.average_rating ?? 0;

  return (
    <span className="profile-summary__peek-rating" aria-label="Seller rating">
      <span className="profile-summary__peek-label">
        {canRate
          ? `Rate: ${sellerName}`
          : count > 0
            ? `${sellerName}: ${average.toFixed(1)} (${count} ${count === 1 ? 'review' : 'reviews'})`
            : `${sellerName}: no reviews yet`}
      </span>

      <span
        className={`profile-summary__peek-stars${canRate ? '' : ' seller-rating__stars--readonly'}`}
      >
        <PeekRating
          value={canRate ? rating : Math.round(average)}
          onChange={canRate ? setRating : undefined}
          readOnly={!canRate}
          labels={STAR_LABELS}
          count={5}
          shape="star"
          size={28}
          allowClear={false}
          ariaLabel={`Rate ${sellerName}`}
        />
      </span>

      {canRate && rating === 0 ? (
        <span className="seller-rating__hint">
          For your reservation of “{target.listing_title}”
        </span>
      ) : null}

      {!canRate && !justSubmitted ? (
        <span className="seller-rating__hint">
          You can rate this seller after a completed reservation.
        </span>
      ) : null}

      {justSubmitted && !canRate ? (
        <span className="seller-rating__hint seller-rating__hint--success" role="status">
          Thanks, your review was posted.
        </span>
      ) : null}

      {canRate && rating > 0 ? (
        <span className="seller-rating__form">
          <textarea
            className="seller-rating__textarea"
            value={comment}
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder="Add a comment (optional)"
            onChange={(e) => setComment(e.target.value)}
            disabled={busy}
          />
          <span className="seller-rating__form-row">
            <span className="seller-rating__counter">
              {comment.length}/{COMMENT_MAX}
            </span>
            <button
              type="button"
              className="seller-rating__btn seller-rating__btn--ghost"
              onClick={handleCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="seller-rating__btn"
              onClick={() => void handleSubmit()}
              disabled={busy}
            >
              {busy ? 'Posting…' : 'Post review'}
            </button>
          </span>
        </span>
      ) : null}

      {error ? (
        <span className="seller-rating__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
};

export default SellerRatingWidget;