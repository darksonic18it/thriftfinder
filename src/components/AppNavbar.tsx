import React, { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Bell,
  Heart,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  SquarePlus,
  ShoppingBag,
  User,
  ChevronDown,
  ListOrdered,
  LifeBuoy,
} from 'lucide-react'

import ThemeToggle from './ThemeToggle'
import './AppNavbar.css'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

type StoredUser = {
  name: string
  email: string
  isFirstLogin: boolean
}

const USER_STORAGE_KEY = 'thriftfinder_user'

function readStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredUser>

    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.name || typeof parsed.name !== 'string') return null
    if (!parsed.email || typeof parsed.email !== 'string') return null
    if (typeof parsed.isFirstLogin !== 'boolean') return null

    return {
      name: parsed.name,
      email: parsed.email,
      isFirstLogin: parsed.isFirstLogin,
    }
  } catch {
    return null
  }
}

const AppNavbar: React.FC = () => {
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const storedUser = useMemo(() => readStoredUser(), [])
  const displayName = storedUser?.name?.trim() || 'Juan D.'
  const displayEmail = storedUser?.email?.trim() || 'you@example.com'

  const handleLogout = () => {
    try {
      window.localStorage.removeItem(USER_STORAGE_KEY)
    } catch {
      // ignore
    }

    setProfileMenuOpen(false)
    navigate('/login')
  }

  return (
    <header className="app-navbar" role="banner">
      <div className="app-navbar-container">
        <div className="app-navbar-left">
          <Link to="/dashboard" className="app-navbar-logo" aria-label="ThriftFinder">
            <div className="logo-icon" aria-hidden="true">
              <ShoppingBag size={24} color="#ffffff" />
            </div>
            <span className="logo-text">
              Thrift<span className="logo-accent">Finder</span>
            </span>
          </Link>
        </div>

        <div className="app-navbar-center" aria-label="Primary navigation">
          <div className="app-navbar-icon-row">
            <button
              type="button"
              className="app-navbar-icon-btn"
              onClick={() => {}}
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            <button
              type="button"
              className="app-navbar-icon-btn"
              onClick={() => navigate('/create-listing')}
              aria-label="Create listing"
            >
              <SquarePlus size={20} />
            </button>

            <button
              type="button"
              className="app-navbar-icon-btn"
              onClick={() => {}}
              aria-label="Saved items"
            >
              <Heart size={20} />
            </button>

            <button
              type="button"
              className="app-navbar-icon-btn app-navbar-icon-btn--bell"
              onClick={() => {}}
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="app-navbar__notification-dot" aria-hidden="true" />
            </button>
          </div>

          <ThemeToggle />
        </div>

        <div className="app-navbar-right" aria-label="User profile">
          <DropdownMenu
            open={profileMenuOpen}
            onOpenChange={setProfileMenuOpen}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="app-navbar-profile-pill"
                data-open={profileMenuOpen ? 'true' : 'false'}
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.97)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = ''
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = ''
                }}
                onBlur={(e) => {
                  e.currentTarget.style.transform = ''
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.currentTarget.style.transform = 'scale(0.97)'
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.currentTarget.style.transform = ''
                  }
                }}
              >
                <div className="app-navbar-profile-avatar-ring" aria-hidden="true">
                  <div className="app-navbar-profile-avatar">
                    <User size={18} />
                  </div>
                </div>

                <span className="app-navbar-profile-meta" aria-hidden="true">
                  <span className="app-navbar-profile-name">{displayName}</span>
                  <ChevronDown
                    size={16}
                    className="app-navbar-profile-caret"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="app-navbar-profile-menu"
              align="end"
              sideOffset={8}
            >
              <div className="app-navbar-profile-menu-header" aria-label="Profile summary">
                <div className="app-navbar-profile-menu-avatar" aria-hidden="true">
                  <User size={16} />
                </div>

                <div className="app-navbar-profile-menu-meta">
                  <div className="app-navbar-profile-menu-name">{displayName}</div>
                  <div className="app-navbar-profile-menu-email">{displayEmail}</div>
                </div>
              </div>

              <DropdownMenuSeparator className="app-navbar-profile-menu-separator" />

              <DropdownMenuItem
                onSelect={() => {
                  setProfileMenuOpen(false)
                  navigate('/profile')
                }}
                className="app-navbar-profile-menu-item"
              >
                <User size={16} aria-hidden="true" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setProfileMenuOpen(false)
                  // Demo navigation placeholder.
                  navigate('/dashboard')
                }}
                className="app-navbar-profile-menu-item"
              >
                <ListOrdered size={16} aria-hidden="true" />
                My Listings
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setProfileMenuOpen(false)
                  // Demo placeholder.
                  navigate('/dashboard')
                }}
                className="app-navbar-profile-menu-item"
              >
                <Heart size={16} aria-hidden="true" />
                Favorites
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setProfileMenuOpen(false)
                  // Demo placeholder.
                  navigate('/dashboard')
                }}
                className="app-navbar-profile-menu-item"
              >
                <MessageSquare size={16} aria-hidden="true" />
                Messages
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setProfileMenuOpen(false)
                  // Demo placeholder.
                  navigate('/dashboard')
                }}
                className="app-navbar-profile-menu-item"
              >
                <Settings size={16} aria-hidden="true" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  setProfileMenuOpen(false)
                  // Demo placeholder.
                  navigate('/dashboard')
                }}
                className="app-navbar-profile-menu-item"
              >
                <LifeBuoy size={16} aria-hidden="true" />
                Help & Support
              </DropdownMenuItem>

              <DropdownMenuSeparator className="app-navbar-profile-menu-separator" />

              <DropdownMenuItem
                onSelect={() => {
                  handleLogout()
                }}
                className="app-navbar-profile-menu-item app-navbar-profile-menu-item--danger"
              >
                <LogOut size={16} aria-hidden="true" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default AppNavbar
