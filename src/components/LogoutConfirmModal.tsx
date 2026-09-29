import React from 'react'
import { LogOut, X } from 'lucide-react'

import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import './LogoutConfirmModal.css'

interface LogoutConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** Asks the user to confirm before signing them out. */
const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="logout-confirm-modal">
        <div className="logout-confirm-icon" aria-hidden="true">
          <LogOut size={24} />
        </div>

        <DialogHeader className="logout-confirm-header">
          <DialogTitle className="logout-confirm-title">Log out?</DialogTitle>
          <DialogDescription className="logout-confirm-description">
            You'll be signed out of your ThriftFinder account on this device.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="logout-confirm-footer">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <X size={16} aria-hidden="true" />
            Cancel
          </Button>
          <Button type="button" className="logout-confirm-btn" onClick={onConfirm}>
            <LogOut size={16} aria-hidden="true" />
            Log Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LogoutConfirmModal