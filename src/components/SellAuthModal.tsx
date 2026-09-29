import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, ShoppingBag, UserPlus } from 'lucide-react'

import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { useAuthGate } from '../context/AuthGateContext'
import './SellAuthModal.css'

/**
 * Shown whenever a signed-out user tries to sell an item (from the landing
 * page, navbar, or anywhere outside the authenticated dashboard). Rendered
 * once near the app root; its visibility is controlled by AuthGateContext.
 */
const SellAuthModal: React.FC = () => {
  const { isSellGateOpen, closeSellGate } = useAuthGate()
  const navigate = useNavigate()

  const goTo = (path: string) => {
    closeSellGate()
    navigate(path)
  }

  return (
    <Dialog
      open={isSellGateOpen}
      onOpenChange={(open) => {
        if (!open) closeSellGate()
      }}
    >
      <DialogContent className="sell-auth-modal">
        <div className="sell-auth-icon" aria-hidden="true">
          <ShoppingBag size={26} />
        </div>

        <DialogHeader className="sell-auth-header">
          <DialogTitle className="sell-auth-title">Sign in to sell an item</DialogTitle>
          <DialogDescription className="sell-auth-description">
            You'll need a ThriftFinder account to list something for sale. Log in if you
            already have one, or sign up it only takes a minute.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sell-auth-footer">
          <Button type="button" variant="outline" onClick={() => goTo('/login')}>
            <LogIn size={16} aria-hidden="true" />
            Log In
          </Button>
          <Button
            type="button"
            className="sell-auth-primary-btn"
            onClick={() => goTo('/signup')}
          >
            <UserPlus size={16} aria-hidden="true" />
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SellAuthModal