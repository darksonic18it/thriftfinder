import React from 'react'
import { CheckCircle2, MessageSquare } from 'lucide-react'

import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import './ChatBuyerModal.css'

interface ChatBuyerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Display name of the buyer whose reservation was just confirmed. */
  buyerName: string
  listingTitle: string
}

/**
 * Shown right after a seller confirms a reservation, prompting them to
 * reach out to the buyer to arrange the handover.
 *
 * NOTE: ThriftFinder has no in-app messaging yet (no `messages` table, and
 * buyer contact_phone is intentionally private under RLS — see
 * profileService.ts). The "Message buyer" button is left visible but
 * disabled, matching the same placeholder pattern already used on the
 * public profile page, rather than faking a chat that doesn't work.
 */
const ChatBuyerModal: React.FC<ChatBuyerModalProps> = ({
  open,
  onOpenChange,
  buyerName,
  listingTitle,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="chatbuyer-modal">
        <div className="chatbuyer-icon" aria-hidden="true">
          <CheckCircle2 size={28} />
        </div>

        <DialogHeader className="chatbuyer-header">
          <DialogTitle className="chatbuyer-title">Reservation confirmed</DialogTitle>
          <DialogDescription className="chatbuyer-description">
            <strong>{buyerName}</strong> has been notified for “{listingTitle}.” Reach out to
            arrange where and when to meet.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="chatbuyer-footer">
          <Button
            type="button"
            className="chatbuyer-primary-btn"
            disabled
            title="In-app messaging isn't available yet"
            aria-disabled="true"
          >
            <MessageSquare size={16} aria-hidden="true" />
            Message {buyerName}
          </Button>
          <p className="chatbuyer-note">Messaging isn't available yet — coordinate outside the app for now.</p>

          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChatBuyerModal