import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteListingModalProps {
  open: boolean;
  listingTitle: string;
  hasReservations: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteListingModal: React.FC<DeleteListingModalProps> = ({
  open,
  listingTitle,
  hasReservations,
  busy = false,
  onCancel,
  onConfirm,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the safe option when opened and lock page scroll while open.
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Escape closes the modal (unless a delete is in progress).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="delete-modal__backdrop"
      onMouseDown={(event) => {
        // Only close when the backdrop itself is clicked, not the dialog.
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="delete-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
      >
        <div className="delete-modal__icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>

        <h2 id="delete-modal-title" className="delete-modal__title">
          Delete this listing?
        </h2>

        <div id="delete-modal-desc" className="delete-modal__body">
          <p>
            <strong className="delete-modal__listing-name">{listingTitle}</strong>{' '}
            will be permanently deleted along with all of its photos.
          </p>

          {hasReservations ? (
            <p className="delete-modal__warning">
              This listing has reservation history. Those reservation records
              will be permanently deleted too.
            </p>
          ) : null}

          <p>This action cannot be undone.</p>
        </div>

        <div className="delete-modal__actions">
          <button
            ref={cancelRef}
            type="button"
            className="profile-btn-outline"
            onClick={onCancel}
            disabled={busy}
          >
            <span>Cancel</span>
          </button>

          <button
            type="button"
            className="delete-modal__confirm"
            onClick={onConfirm}
            disabled={busy}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>{busy ? 'Deleting…' : 'Delete permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteListingModal;