import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate, Link } from 'react-router-dom'
import {
  Bell,
  Heart,
  LifeBuoy,
  LogOut,
  ListOrdered,
  MessageSquare,
  Search,
  Settings,
  SquarePlus,
  ShoppingBag,
  User,
} from 'lucide-react'

import { gsap } from 'gsap'

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
const PROFILE_NAME_CHIP_REVEAL_MS = 220
const DROPDOWN_CLOSE_DURATION_FALLBACK_MS = 120

const NAV_SCROLL_DELTA_PX = 10
const NAV_TOGGLE_COOLDOWN_MS = 140

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
  const [navHidden, setNavHidden] = useState(false)
  const navHiddenRef = useRef(navHidden)
  const profileMenuOpenRef = useRef(false)
  const profileNameRevealRef = useRef(false)
  const navigate = useNavigate()

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profileNameReveal, setProfileNameReveal] = useState(false)

  const prefersReducedMotionRef = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const nameChipRef = useRef<HTMLSpanElement | null>(null)

  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const closeByHandlerRef = useRef(false)

  const sequenceIdRef = useRef(0)
  const prevMenuOpenRef = useRef(false)

  useEffect(() => {
    prefersReducedMotionRef.current =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    navHiddenRef.current = navHidden
  }, [navHidden])

  useEffect(() => {
    profileMenuOpenRef.current = profileMenuOpen
    profileNameRevealRef.current = profileNameReveal

    if (profileMenuOpen || profileNameReveal) {
      navHiddenRef.current = false
      setNavHidden(false)
    }
  }, [profileMenuOpen, profileNameReveal])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (prefersReducedMotionRef.current) {
      setNavHidden(false)
      return
    }

    let lastScrollY = window.scrollY
    let lastToggleAt = 0
    let rafId: number | null = null

    const onScroll = () => {
      if (rafId !== null) return

      rafId = window.requestAnimationFrame(() => {
        rafId = null

        // If profile is open/revealing, keep navbar visible and don't interpret the scroll direction.
        if (profileMenuOpenRef.current || profileNameRevealRef.current) {
          lastScrollY = window.scrollY
          return
        }

        const currentY = window.scrollY
        const deltaY = currentY - lastScrollY
        lastScrollY = currentY

        if (Math.abs(deltaY) < NAV_SCROLL_DELTA_PX) return

        const now = Date.now()
        if (now - lastToggleAt < NAV_TOGGLE_COOLDOWN_MS) return

        // Scroll down → hide. Scroll up → reveal.
        if (deltaY > 0) {
          if (!navHiddenRef.current) {
            setNavHidden(true)
            lastToggleAt = now
          }
        } else {
          if (navHiddenRef.current) {
            setNavHidden(false)
            lastToggleAt = now
          }
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep this handler side-effect-only; the scroll hide/show effect
  // handles reduced-motion and profile gating.

  const getDropdownCloseDurationMs = () => {
    const raw = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue('--profile-dropdown-close-duration')
      .trim()

    const ms = parseFloat(raw)
    if (!Number.isFinite(ms) || ms <= 0) return DROPDOWN_CLOSE_DURATION_FALLBACK_MS

    return ms
  }

  const killChipTweens = () => {
    const el = nameChipRef.current
    if (!el) return
    gsap.killTweensOf(el)
  }

  const clearTimers = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const startChipIn = (seqId: number) => {
    const el = nameChipRef.current
    if (!el) {
      setProfileNameReveal(true)
      return
    }

    killChipTweens()

    // Keep CSS in a hidden state during the animation; GSAP provides the motion.
    gsap.set(el, {
      opacity: 0,
      scaleX: 0,
      x: 12,
      yPercent: -50,
      transformOrigin: '100% 50%',
    })

    gsap.to(el, {
      opacity: 1,
      scaleX: 1,
      x: 0,
      duration: PROFILE_NAME_CHIP_REVEAL_MS / 1000,
      ease: 'power3.out',
      onComplete: () => {
        if (seqId !== sequenceIdRef.current) return
        setProfileNameReveal(true)
        // Let CSS own the final transform/opacity (prevents stale inline styles).
        gsap.set(el, { clearProps: 'transform,x,scaleX,opacity' } as unknown as Parameters<typeof gsap.set>[1])
      },
    })
  }

  const startChipOut = (seqId: number) => {
    const el = nameChipRef.current
    if (!el) {
      setProfileNameReveal(false)
      return
    }

    killChipTweens()

    gsap.to(el, {
      opacity: 0,
      scaleX: 0,
      x: 12,
      yPercent: -50,
      duration: PROFILE_NAME_CHIP_REVEAL_MS / 1000,
      ease: 'power3.in',
      onComplete: () => {
        if (seqId !== sequenceIdRef.current) return
        setProfileNameReveal(false)
        gsap.set(el, { clearProps: 'transform,x,scaleX,opacity' } as unknown as Parameters<typeof gsap.set>[1])
      },
    })
  }

  const handleProfileMenuOpenChange = (nextOpen: boolean) => {
    clearTimers()
    killChipTweens()

    // Increment to invalidate any pending timers or callbacks.
    sequenceIdRef.current += 1
    const seqId = sequenceIdRef.current

    if (prefersReducedMotionRef.current) {
      // Skip the two-phase choreography entirely.
      setProfileNameReveal(nextOpen)
      setProfileMenuOpen(nextOpen)
      closeByHandlerRef.current = !nextOpen
      return
    }

    if (nextOpen) {
      closeByHandlerRef.current = false

      // 1) Reveal the name chip first.
      // 2) Open the dropdown only after the chip finishes.
      setProfileMenuOpen(false)
      setProfileNameReveal(false)
      startChipIn(seqId)

      openTimerRef.current = window.setTimeout(() => {
        if (seqId !== sequenceIdRef.current) return
        setProfileMenuOpen(true)
        openTimerRef.current = null
      }, PROFILE_NAME_CHIP_REVEAL_MS)

      return
    }

    // Closing: dropdown closes first, then the chip slides back.
    closeByHandlerRef.current = true

    const dropdownWasOpen = profileMenuOpen
    setProfileMenuOpen(false)

    const startOut = () => {
      if (seqId !== sequenceIdRef.current) return
      startChipOut(seqId)
    }

    if (!dropdownWasOpen) {
      startOut()
      return
    }

    const closeMs = getDropdownCloseDurationMs()
    closeTimerRef.current = window.setTimeout(() => {
      startOut()
      closeTimerRef.current = null
    }, closeMs)
  }

  // Menu can also close via menu item clicks (we set state directly),
  // so we schedule the chip-out here when the dropdown transitions from open → closed.
  useEffect(() => {
    const prevOpen = prevMenuOpenRef.current
    prevMenuOpenRef.current = profileMenuOpen

    if (!prevOpen || profileMenuOpen) return

    // If this closure was initiated by Radix's onOpenChange handler,
    // that handler already scheduled the chip-out.
    if (closeByHandlerRef.current) {
      closeByHandlerRef.current = false
      return
    }

    if (prefersReducedMotionRef.current) {
      setProfileNameReveal(false)
      return
    }

    sequenceIdRef.current += 1
    const seqId = sequenceIdRef.current

    const closeMs = getDropdownCloseDurationMs()
    closeTimerRef.current = window.setTimeout(() => {
      if (seqId !== sequenceIdRef.current) return
      startChipOut(seqId)
      closeTimerRef.current = null
    }, closeMs)
  }, [profileMenuOpen])

  useEffect(() => {
    return () => {
      clearTimers()
      const el = nameChipRef.current
      if (el) gsap.killTweensOf(el)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const storedUser = useMemo(() => readStoredUser(), [])
  const displayName = storedUser?.name?.trim() || 'Juan D.'
  const displayEmail = storedUser?.email?.trim() || 'you@example.com'

  const handleLogout = () => {
    clearTimers()
    killChipTweens()

    try {
      window.localStorage.removeItem(USER_STORAGE_KEY)
    } catch {
      // ignore
    }

    setProfileMenuOpen(false)
    setProfileNameReveal(false)
    navigate('/login')
  }

  return (
    <header
      className={`app-navbar ${navHidden ? 'app-navbar--hidden' : ''}`}
      role="banner"
    >
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
            onOpenChange={handleProfileMenuOpenChange}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="app-navbar-profile-pill"
                data-open={profileMenuOpen ? 'true' : 'false'}
                data-reveal={profileNameReveal ? 'true' : 'false'}
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

                <span
                  ref={nameChipRef}
                  className="app-navbar-profile-name-chip"
                  aria-hidden="true"
                >
                  {displayName}
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
