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
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS } from './ReportListingModal';
import './ReportListingModal.css';

export interface ReportSellerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerName: string;
}

/**
 * UI-ONLY seller report dialog for the public profile `...` menu.
 * Mirrors the existing listing-report taxonomy/copy; nothing is persisted
 * yet, matching ReportListingModal's UI-only contract.
 */
const ReportSellerModal: React.FC<ReportSellerModalProps> = ({
  open,
  onOpenChange,
  sellerName,
}) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setValidationError(null);
      setReportSubmitted(false);
      setReason('');
      setDetails('');
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setValidationError(null);
    onOpenChange(next);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason) {
      setValidationError('Please select a reason for reporting this seller.');
      return;
    }
    setValidationError(null);
    setReportSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="report-modal">
        {!reportSubmitted ? (
          <form className="report-modal-form" onSubmit={handleSubmit} noValidate>
            <DialogHeader className="report-modal-header">
              <DialogTitle>Report seller</DialogTitle>
              <DialogDescription>
                Help us understand what&apos;s wrong with{' '}
                <strong>{sellerName || 'this seller'}</strong>. Reports are reviewed by the
                ThriftFinder team, and the seller is not told who submitted it.
              </DialogDescription>
            </DialogHeader>
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
                      name="report-seller-reason"
                      value={r}
                      checked={isSelected}
                      onChange={() => {
                        setReason(r);
                        setValidationError(null);
                      }}
                    />
                    <span>{r}</span>
                  </label>
                );
              })}
            </fieldset>
            <div className="report-modal-field">
              <label className="report-modal-label" htmlFor="report-seller-details">
                Additional details
              </label>
              <textarea
                id="report-seller-details"
                className="report-modal-details"
                placeholder="Tell us more about the issue (optional)"
                maxLength={REPORT_DETAILS_MAX_LENGTH}
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
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
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportSellerModal;
