import { CheckCircle2, MessageSquare } from 'lucide-react'
import React from 'react'

import './ChatBuyerModal.css'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

interface ChatBuyerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Display name of the buyer whose reservation was just confirmed. */
  buyerName: string
  listingTitle: string
  /** Opens the in-app conversation with the buyer. */
  onMessageBuyer?: () => void | Promise<void>
  /** True while the conversation is being opened. */
  busy?: boolean
  /** Error from opening the conversation, shown under the button. */
  error?: string | null
}

/**
 * Shown right after a seller confirms a reservation, prompting them to
 * reach out to the buyer to arrange the handover.
 *
 * The "Message buyer" button opens the in-app chat (conversations/messages
 * tables) because buyer contact_phone is intentionally private under RLS —
 * see profileService.ts. If no handler is passed it stays disabled.
 */
const ChatBuyerModal: React.FC<ChatBuyerModalProps> = ({
  open,
  onOpenChange,
  buyerName,
  listingTitle,
  onMessageBuyer,
  busy = false,
  error = null,
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
            disabled={!onMessageBuyer || busy}
            onClick={() => void onMessageBuyer?.()}
          >
            <MessageSquare size={16} aria-hidden="true" />
            {busy ? 'Opening…' : `Message ${buyerName}`}
          </Button>
          {error ? (
            <p className="chatbuyer-note" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChatBuyerModal