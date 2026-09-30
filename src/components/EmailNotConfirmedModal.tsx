import React from 'react';
import { MailWarning } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import './EmailNotConfirmedModal.css';

interface EmailNotConfirmedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  resending: boolean;
  resent: boolean;
  resendError: string | null;
  onResend: () => void;
}

/** Auth warning shown when login fails because the email is not confirmed. */
const EmailNotConfirmedModal: React.FC<EmailNotConfirmedModalProps> = ({
  open,
  onOpenChange,
  email,
  resending,
  resent,
  resendError,
  onResend,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="email-confirm-modal">
        <div className="email-confirm-icon" aria-hidden="true">
          <MailWarning size={26} />
        </div>
        <DialogHeader className="email-confirm-header">
          <DialogTitle className="email-confirm-title">
            Please confirm your email
          </DialogTitle>
          <DialogDescription className="email-confirm-description">
            {email ? (
              <>
                We sent a confirmation link to <strong>{email}</strong>. Please
                confirm your email before signing in.
              </>
            ) : (
              <>Please confirm your email before signing in.</>
            )}
          </DialogDescription>
        </DialogHeader>
        {resent ? (
          <div className="email-confirm-note" role="status">
            Confirmation email re-sent. Please check your inbox (and spam folder).
          </div>
        ) : null}
        {resendError ? (
          <div className="email-confirm-error" role="alert">
            {resendError}
          </div>
        ) : null}
        <DialogFooter className="email-confirm-footer">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Back to Log In
          </Button>
          <Button
            type="button"
            className="email-confirm-primary-btn"
            onClick={onResend}
            disabled={resending}
          >
            {resending ? 'Sending…' : resent ? 'Resend Again' : 'Resend Confirmation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailNotConfirmedModal;
