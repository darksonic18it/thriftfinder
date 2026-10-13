import React from 'react';
import { AlertTriangle, BadgeCheck, Loader2 } from 'lucide-react';

import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import './ListingConfirmModals.css';

interface MarkAsSoldModalProps {
  open: boolean;
  listingTitle: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Confirm marking a listing as sold. Supabase update runs only on confirm.
 * Reuses the shared Radix Dialog + Button primitives (backdrop, Escape,
 * focus trap and scroll-lock included).
 */
export const MarkAsSoldModal: React.FC<MarkAsSoldModalProps> = ({
  open,
  listingTitle,
  busy = false,
  onOpenChange,
  onConfirm,
}) => {
  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="listing-confirm-modal"
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="listing-confirm-icon listing-confirm-icon--primary" aria-hidden="true">
          <BadgeCheck size={24} />
        </div>

        <DialogHeader className="listing-confirm-header">
          <DialogTitle className="listing-confirm-title">Mark as sold?</DialogTitle>
          <DialogDescription className="listing-confirm-description">
            Marking <strong className="listing-confirm-name">{listingTitle}</strong> as sold
            will update its status. It will no longer be available to buyers, and any pending
            reservations will be cancelled with affected buyers notified. If a confirmed
            reservation exists, resolve it first.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="listing-confirm-footer">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={16} aria-hidden="true" className="listing-confirm-spinner" />
                Marking as sold…
              </>
            ) : (
              'Confirm Sale'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface DeleteListingConfirmModalProps {
  open: boolean;
  listingTitle: string;
  hasReservations: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Confirm permanent listing deletion. The hard delete runs only on confirm.
 * The confirm button uses the semantic destructive Button variant.
 */
export const DeleteListingConfirmModal: React.FC<DeleteListingConfirmModalProps> = ({
  open,
  listingTitle,
  hasReservations,
  busy = false,
  onOpenChange,
  onConfirm,
}) => {
  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="listing-confirm-modal"
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="listing-confirm-icon listing-confirm-icon--danger" aria-hidden="true">
          <AlertTriangle size={24} />
        </div>

        <DialogHeader className="listing-confirm-header">
          <DialogTitle className="listing-confirm-title">Delete this listing?</DialogTitle>
          <DialogDescription className="listing-confirm-description">
            <strong className="listing-confirm-name">{listingTitle}</strong> will be
            permanently deleted along with all of its photos. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {hasReservations ? (
          <p className="listing-confirm-warning" role="note">
            This listing has reservation history. Those reservation records will be permanently
            deleted too.
          </p>
        ) : null}

        <DialogFooter className="listing-confirm-footer">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={16} aria-hidden="true" className="listing-confirm-spinner" />
                Deleting…
              </>
            ) : (
              'Delete Listing'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
