import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import './ReportListingModal.css';

/** UI ONLY reasons — mirrors taxonomy a future admin system would use. */
export const REPORT_REASONS = [
  'Scam or fraud',
  'Prohibited or illegal item',
  'Counterfeit or fake item',
  'Misleading or inaccurate information',
  'Inappropriate or offensive content',
  'Harassment or abusive behavior',
  'Item is already sold or unavailable',
  'Other',
] as const;

export const REPORT_DETAILS_MAX_LENGTH = 500;

interface ReportListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  details: string;
  onDetailsChange: (details: string) => void;
  listingTitle?: string;
}

/**
 * UI-ONLY report dialog for `/listing/:id`.
 * Uses shared Radix Dialog (backdrop, Escape, focus trap, scroll-lock).
 */
const ReportListingModal: React.FC<ReportListingModalProps> = ({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  details,
  onDetailsChange,
  listingTitle,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setValidationError(null);
      setReportSubmitted(false);
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setValidationError(null);
      if (reportSubmitted) {
        setReportSubmitted(false);
        onReasonChange('');
        onDetailsChange('');
      }
    }
    onOpenChange(next);
  };

  // UI ONLY — no Supabase here. Future
  // reportService.submitReport({ listingId, reason, details })
  // call belongs right below before showing success.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason) {
      setValidationError('Please select a reason for reporting this listing.');
      return;
    }
    setValidationError(null);
    setReportSubmitted(true);
  };

  const handleDone = () => {
    onReasonChange('');
    onDetailsChange('');
    setReportSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="report-modal">
        {!reportSubmitted ? (
          <form className="report-modal-form" onSubmit={handleSubmit} noValidate>
            <DialogHeader className="report-modal-header">
              <DialogTitle>Report listing</DialogTitle>
              <DialogDescription>
                Help us understand what&apos;s wrong with this listing.
              </DialogDescription>
            </DialogHeader>
            {listingTitle ? (
              <p className="report-modal-listing">
                Reporting: <strong>{listingTitle}</strong>
              </p>
            ) : null}
            <fieldset className="report-modal-reasons">
              <legend className="sr-only">Reason for reporting</legend>
              {REPORT_REASONS.map((r) => {
                const isSelected = reason === r;
                return (
                  <label
                    key={r}
                    className={`report-modal-reason${isSelected ? ' report-modal-reason--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={isSelected}
                      onChange={() => {
                        onReasonChange(r);
                        setValidationError(null);
                      }}
                    />
                    <span>{r}</span>
                  </label>
                );
              })}
            </fieldset>
            <div className="report-modal-field">
              <label className="report-modal-label" htmlFor="report-modal-details">
                Additional details
              </label>
              <textarea
                id="report-modal-details"
                className="report-modal-details"
                placeholder="Tell us more about the issue (optional)"
                maxLength={REPORT_DETAILS_MAX_LENGTH}
                rows={4}
                value={details}
                onChange={(e) => onDetailsChange(e.target.value)}
              />
              <span className="report-modal-counter">
                {details.length}/{REPORT_DETAILS_MAX_LENGTH}
              </span>
            </div>
            {validationError ? (
              <div className="report-modal-error" role="alert">
                {validationError}
              </div>
            ) : null}
            <DialogFooter className="report-modal-footer">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Report</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="report-modal-success" role="status">
            <CheckCircle2 size={48} aria-hidden="true" className="report-modal-success-icon" />
            <DialogHeader className="report-modal-header report-modal-header--center">
              <DialogTitle>Report submitted</DialogTitle>
              <DialogDescription className="report-modal-success-text">
                Thanks for helping keep ThriftFinder safe.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="report-modal-footer report-modal-footer--center">
              <Button type="button" onClick={handleDone}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportListingModal;

