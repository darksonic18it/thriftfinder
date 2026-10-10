import { MessageSquare } from 'lucide-react'
import React from 'react'

import { formatPeso } from '../lib/listingMappers'
import './MessageSellerModal.css'
import { Button } from './ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog'

export interface MessageSellerListingOption {
  id: string
  title: string
  price: number | string
}

interface MessageSellerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sellerName: string
  /** The seller's active listings. A chat is always about one item. */
  listings: MessageSellerListingOption[]
  /** Called with the chosen listing id. */
  onPick: (listingId: string) => void | Promise<void>
  /** Listing id currently being opened (disables the list while busy). */
  busyListingId?: string | null
  error?: string | null
}

/**
 * "Which item are you asking about?" — shown from a seller's public profile
 * when they have more than one active listing, because every conversation in
 * ThriftFinder is tied to one listing.
 */
const MessageSellerModal: React.FC<MessageSellerModalProps> = ({
  open,
  onOpenChange,
  sellerName,
  listings,
  onPick,
  busyListingId = null,
  error = null,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="msgseller-modal">
        <DialogHeader className="msgseller-header">
          <DialogTitle className="msgseller-title">Message {sellerName}</DialogTitle>
          <DialogDescription className="msgseller-description">
            Which item are you asking about?
          </DialogDescription>
        </DialogHeader>

        <ul className="msgseller-list">
          {listings.map((item) => (
            <li key={item.id}>
              <Button
                type="button"
                variant="outline"
                className="msgseller-item"
                disabled={busyListingId !== null}
                onClick={() => void onPick(item.id)}
              >
                <MessageSquare size={16} aria-hidden="true" />
                <span className="msgseller-item__title">
                  {busyListingId === item.id ? 'Opening…' : item.title}
                </span>
                <span className="msgseller-item__price">{formatPeso(item.price)}</span>
              </Button>
            </li>
          ))}
        </ul>

        {error ? (
          <p className="msgseller-error" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default MessageSellerModal