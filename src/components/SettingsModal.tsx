import type { LucideIcon } from 'lucide-react'
import { Bell, Eye, EyeOff, Lock, MapPin, Moon, Palette, ShieldCheck, Sun, Trash2, User } from 'lucide-react'
import React, { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { clearBuyerLocation, getBuyerLocation } from '../lib/nearbyLocation'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'

import './SettingsModal.css'

/* ==========================================================================
   GUI ONLY
   --------------------------------------------------------------------------
   Nothing here is sent to a backend yet. Every control works and keeps its
   value while the page is open, but "Save changes" only updates local state.
   Search for TODO(backend) to find where real saving should be added.
   Set SHOW_PREVIEW_NOTICE to false to hide the small "not saved yet" note.
   ========================================================================== */

const SHOW_PREVIEW_NOTICE = true

type TabId = 'account' | 'notifications' | 'privacy' | 'location' | 'appearance'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Safety', icon: ShieldCheck },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

type NotificationKey =
  | 'messages'
  | 'reservationUpdates'
  | 'reservationRequests'
  | 'reviews'
  | 'savedItems'

interface Channel {
  inApp: boolean
  email: boolean
}

interface SettingsState {
  /** null = keep the name from the signed-in account. */
  displayName: string | null
  phone: string
  pauseAll: boolean
  notifications: Record<NotificationKey, Channel>
  showApproxArea: boolean
  sharePhone: boolean
  allowMessages: boolean
  defaultRadius: number
  locationMode: 'ask' | 'home'
  homeCity: string
  homeBarangay: string
}

const DEFAULT_SETTINGS: SettingsState = {
  displayName: null,
  phone: '',
  pauseAll: false,
  notifications: {
    messages: { inApp: true, email: false },
    reservationUpdates: { inApp: true, email: true },
    reservationRequests: { inApp: true, email: true },
    reviews: { inApp: true, email: false },
    savedItems: { inApp: true, email: false },
  },
  showApproxArea: true,
  sharePhone: false,
  allowMessages: true,
  defaultRadius: 5,
  locationMode: 'ask',
  homeCity: '',
  homeBarangay: '',
}

const NOTIFICATION_ROWS: { key: NotificationKey; title: string; description: string }[] = [
  {
    key: 'messages',
    title: 'New messages',
    description: 'When a buyer or seller messages you about a listing.',
  },
  {
    key: 'reservationUpdates',
    title: 'Reservation updates',
    description: 'When your reservation is confirmed, cancelled, or about to expire.',
  },
  {
    key: 'reservationRequests',
    title: 'Reservation requests',
    description: 'When someone reserves one of your listings.',
  },
  {
    key: 'reviews',
    title: 'New reviews',
    description: 'When a buyer leaves a rating on your seller profile.',
  },
  {
    key: 'savedItems',
    title: 'Saved items',
    description: 'When an item in your Favorites is reserved or sold.',
  },
]

const RADIUS_OPTIONS = [1, 5, 10, 20, 50]

/* ==========================================================================
   Small building blocks
   ========================================================================== */

const Toggle: React.FC<{
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}> = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className="tfs-switch"
    onClick={() => onChange(!checked)}
  >
    <span className="tfs-switch__thumb" aria-hidden="true" />
  </button>
)

const ToggleRow: React.FC<{
  title: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}> = ({ title, description, checked, onChange }) => (
  <div className="tfs-row">
    <div>
      <p className="tfs-row__title">{title}</p>
      <p className="tfs-row__desc">{description}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} label={title} />
  </div>
)

const TextField: React.FC<{
  label: string
  value: string
  onChange?: (value: string) => void
  hint?: string
  type?: string
  placeholder?: string
  readOnly?: boolean
  disabled?: boolean
  maxLength?: number
  autoComplete?: string
}> = ({
  label,
  value,
  onChange,
  hint,
  type = 'text',
  placeholder,
  readOnly,
  disabled,
  maxLength,
  autoComplete,
}) => {
  const id = useId()
  return (
    <div className="tfs-field">
      <label htmlFor={id}>{label}</label>
      <div className={`tfs-input${readOnly ? ' is-readonly' : ''}`}>
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete={autoComplete}
          onChange={(event) => onChange?.(event.target.value)}
        />
        {readOnly ? <Lock size={14} aria-hidden="true" /> : null}
      </div>
      {hint ? <p className="tfs-hint">{hint}</p> : null}
    </div>
  )
}

const SectionTitle: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="tfs-section-title">
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
)

/* ==========================================================================
   Account tab pieces
   ========================================================================== */

const PasswordCard: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setShow(false)
    setError(null)
  }

  const submit = () => {
    setDone(false)
    if (!current) {
      setError('Enter your current password.')
      return
    }
    if (next.length < 8) {
      setError('Your new password must be at least 8 characters.')
      return
    }
    if (next === current) {
      setError('Your new password must be different from the current one.')
      return
    }
    if (next !== confirm) {
      setError('The new passwords don’t match.')
      return
    }
    // TODO(backend): update the password (e.g. supabase.auth.updateUser).
    reset()
    setOpen(false)
    setDone(true)
  }

  return (
    <div className="tfs-card">
      <div className="tfs-card__head">
        <div>
          <p className="tfs-row__title">Password</p>
          <p className="tfs-row__desc">Use a strong password you don’t use on other sites.</p>
        </div>
        {!open ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDone(false)
              setOpen(true)
            }}
          >
            Change password
          </Button>
        ) : null}
      </div>

      {done ? (
        <p className="tfs-note tfs-note--success" role="status">
          Password updated.
        </p>
      ) : null}

      {open ? (
        <div className="tfs-card__body">
          <TextField
            label="Current password"
            type={show ? 'text' : 'password'}
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
          <TextField
            label="New password"
            type={show ? 'text' : 'password'}
            value={next}
            onChange={setNext}
            hint="At least 8 characters."
            autoComplete="new-password"
          />
          <TextField
            label="Confirm new password"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />

          <button type="button" className="tfs-link-btn" onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
            {show ? 'Hide passwords' : 'Show passwords'}
          </button>

          {error ? (
            <p className="tfs-note tfs-note--error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="tfs-card__actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                reset()
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submit}>
              Update password
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const DangerCard: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [requested, setRequested] = useState(false)

  return (
    <div className="tfs-card tfs-card--danger">
      <div className="tfs-card__head">
        <div>
          <p className="tfs-row__title">Delete account</p>
          <p className="tfs-row__desc">
            Permanently removes your profile, listings, saved items, and messages. This can’t be
            undone.
          </p>
        </div>
        {!open ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="tfs-danger-btn"
            onClick={() => {
              setRequested(false)
              setOpen(true)
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete account
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="tfs-card__body">
          <TextField
            label="Type DELETE to confirm"
            value={typed}
            onChange={setTyped}
            placeholder="DELETE"
            autoComplete="off"
          />
          <div className="tfs-card__actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTyped('')
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="tfs-danger-btn tfs-danger-btn--solid"
              disabled={typed !== 'DELETE'}
              onClick={() => {
                // TODO(backend): delete the account and sign the user out.
                setRequested(true)
                setTyped('')
                setOpen(false)
              }}
            >
              Permanently delete
            </Button>
          </div>
        </div>
      ) : null}

      {requested ? (
        <p className="tfs-note" role="status">
          Account deletion isn’t connected yet, so nothing was deleted.
        </p>
      ) : null}
    </div>
  )
}

/* ==========================================================================
   Modal
   ========================================================================== */

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const { displayName: authName, displayEmail: authEmail } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [tab, setTab] = useState<TabId>('account')
  const [saved, setSaved] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [draft, setDraft] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [justSaved, setJustSaved] = useState(false)
  const [, setLocationTick] = useState(0)
  const [locationCleared, setLocationCleared] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const update = (patch: Partial<SettingsState>) => {
    setJustSaved(false)
    setDraft((current) => ({ ...current, ...patch }))
  }

  const updateChannel = (key: NotificationKey, channel: keyof Channel, value: boolean) => {
    setJustSaved(false)
    setDraft((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: { ...current.notifications[key], [channel]: value },
      },
    }))
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Closing throws away anything that wasn't saved.
      setDraft(saved)
      setJustSaved(false)
      setLocationCleared(false)
    }
    onOpenChange(next)
  }

  const handleSave = () => {
    // TODO(backend): send `draft` to your API / Supabase, then store the result.
    setSaved(draft)
    setJustSaved(true)
  }

  const handleDiscard = () => {
    setDraft(saved)
    setJustSaved(false)
  }

  const goToProfile = () => {
    handleOpenChange(false)
    navigate('/profile')
  }

  const savedLocation = getBuyerLocation()
  const shownName = draft.displayName ?? authName
  const initial = (shownName || 'U').trim().charAt(0).toUpperCase()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="tfs-modal">
        <div className="tfs-shell">
          {/* ---------------------------- Sidebar ---------------------------- */}
          <aside className="tfs-side">
            <div className="tfs-side__head">
              <DialogTitle className="tfs-title">Settings</DialogTitle>
              <DialogDescription className="tfs-subtitle">
                Manage your ThriftFinder account.
              </DialogDescription>
            </div>

            <div className="tfs-tabs" role="tablist" aria-label="Settings sections" aria-orientation="vertical">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tfs-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`tfs-panel-${id}`}
                  className={`tfs-tab${tab === id ? ' is-active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* ----------------------------- Panels ---------------------------- */}
          <div className="tfs-main">
            <div
              className="tfs-panel"
              role="tabpanel"
              id={`tfs-panel-${tab}`}
              aria-labelledby={`tfs-tab-${tab}`}
              tabIndex={0}
            >
              {tab === 'account' ? (
                <>
                  <SectionTitle
                    title="Account"
                    description="Your name, contact details, and sign-in security."
                  />

                  <div className="tfs-profile">
                    <span className="tfs-profile__avatar" aria-hidden="true">
                      {initial}
                    </span>
                    <div>
                      <p className="tfs-profile__name">{shownName || 'ThriftFinder user'}</p>
                      <p className="tfs-profile__email">{authEmail}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={goToProfile}>
                      Edit profile
                    </Button>
                  </div>
                  <p className="tfs-hint tfs-hint--tight">
                    Photo, bio, and your location are edited on your profile page.
                  </p>

                  <div className="tfs-grid">
                    <TextField
                      label="Display name"
                      value={shownName}
                      onChange={(value) => update({ displayName: value })}
                      maxLength={60}
                      hint="Shown on your listings, messages, and reviews."
                      autoComplete="name"
                    />
                    <TextField
                      label="Email"
                      value={authEmail}
                      readOnly
                      hint="This is the email you sign in with."
                    />
                    <TextField
                      label="Contact number"
                      type="tel"
                      value={draft.phone}
                      onChange={(value) => update({ phone: value })}
                      placeholder="09XX XXX XXXX"
                      maxLength={20}
                      hint="Optional. Only shared if you turn on phone sharing in Privacy & Safety."
                      autoComplete="tel"
                    />
                  </div>

                  <PasswordCard />
                  <DangerCard />
                </>
              ) : null}

              {tab === 'notifications' ? (
                <>
                  <SectionTitle
                    title="Notifications"
                    description="Choose how ThriftFinder keeps you up to date."
                  />

                  <ToggleRow
                    title="Pause all notifications"
                    description="Mute everything below. Your messages and reservations still work."
                    checked={draft.pauseAll}
                    onChange={(value) => update({ pauseAll: value })}
                  />

                  <div className={`tfs-table${draft.pauseAll ? ' is-paused' : ''}`}>
                    <div className="tfs-table__head">
                      <span />
                      <span>In-app</span>
                      <span>Email</span>
                    </div>
                    {NOTIFICATION_ROWS.map(({ key, title, description }) => (
                      <div className="tfs-table__row" key={key}>
                        <div>
                          <p className="tfs-row__title">{title}</p>
                          <p className="tfs-row__desc">{description}</p>
                        </div>
                        <Toggle
                          label={`${title} in-app`}
                          checked={draft.notifications[key].inApp}
                          disabled={draft.pauseAll}
                          onChange={(value) => updateChannel(key, 'inApp', value)}
                        />
                        <Toggle
                          label={`${title} email`}
                          checked={draft.notifications[key].email}
                          disabled={draft.pauseAll}
                          onChange={(value) => updateChannel(key, 'email', value)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {tab === 'privacy' ? (
                <>
                  <SectionTitle
                    title="Privacy & Safety"
                    description="Control what other ThriftFinder users can see."
                  />

                  <ToggleRow
                    title="Show my approximate area on my listings"
                    description="Buyers see a barangay-level area so they can estimate distance. Your exact address is never shown."
                    checked={draft.showApproxArea}
                    onChange={(value) => update({ showApproxArea: value })}
                  />
                  <ToggleRow
                    title="Share my contact number after a reservation is confirmed"
                    description="Only the buyer or seller on that reservation can see it."
                    checked={draft.sharePhone}
                    onChange={(value) => update({ sharePhone: value })}
                  />
                  <ToggleRow
                    title="Allow messages about my listings"
                    description="Turn this off to stop new conversations from starting on your listings."
                    checked={draft.allowMessages}
                    onChange={(value) => update({ allowMessages: value })}
                  />

                  <div className="tfs-callout">
                    <ShieldCheck size={20} aria-hidden="true" />
                    <div>
                      <p className="tfs-row__title">Meet safely</p>
                      <p className="tfs-row__desc">
                        Meet in a public place and inspect the item before you pay. ThriftFinder
                        doesn’t process payments or handovers between users. You can report a
                        listing from its page using the flag icon.
                      </p>
                      <p className="tfs-callout__links">
                        <Link to="/terms" onClick={() => handleOpenChange(false)}>
                          Terms of Service
                        </Link>
                        <Link to="/privacy" onClick={() => handleOpenChange(false)}>
                          Privacy Policy
                        </Link>
                      </p>
                    </div>
                  </div>
                </>
              ) : null}

              {tab === 'location' ? (
                <>
                  <SectionTitle
                    title="Location"
                    description="Used for Items Near Me. We only ever show approximate distances."
                  />

                  <div className="tfs-card">
                    <div className="tfs-card__head">
                      <div>
                        <p className="tfs-row__title">Saved location for this session</p>
                        <p className="tfs-row__desc">
                          {savedLocation
                            ? `${savedLocation.label} (${savedLocation.source === 'gps' ? 'from your device' : 'barangay you chose'})`
                            : 'None. Browse will ask when you use Items Near Me.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!savedLocation}
                        onClick={() => {
                          clearBuyerLocation()
                          setLocationCleared(true)
                          setLocationTick((tick) => tick + 1)
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                    {locationCleared ? (
                      <p className="tfs-note tfs-note--success" role="status">
                        Saved location cleared.
                      </p>
                    ) : null}
                  </div>

                  <div className="tfs-field tfs-field--select">
                    <label htmlFor="tfs-radius">Default search radius</label>
                    <select
                      id="tfs-radius"
                      className="tfs-select"
                      value={draft.defaultRadius}
                      onChange={(event) => update({ defaultRadius: Number(event.target.value) })}
                    >
                      {RADIUS_OPTIONS.map((radius) => (
                        <option key={radius} value={radius}>
                          {radius} km
                        </option>
                      ))}
                    </select>
                  </div>

                  <fieldset className="tfs-radios">
                    <legend>When I use Items Near Me</legend>
                    <label className={`tfs-radio${draft.locationMode === 'ask' ? ' is-active' : ''}`}>
                      <input
                        type="radio"
                        name="tfs-location-mode"
                        checked={draft.locationMode === 'ask'}
                        onChange={() => update({ locationMode: 'ask' })}
                      />
                      <span>
                        <strong>Ask for my device location</strong>
                        <small>Your browser will ask permission each session.</small>
                      </span>
                    </label>
                    <label className={`tfs-radio${draft.locationMode === 'home' ? ' is-active' : ''}`}>
                      <input
                        type="radio"
                        name="tfs-location-mode"
                        checked={draft.locationMode === 'home'}
                        onChange={() => update({ locationMode: 'home' })}
                      />
                      <span>
                        <strong>Use my home barangay</strong>
                        <small>No GPS needed. Good for desktops without location.</small>
                      </span>
                    </label>
                  </fieldset>

                  <div className="tfs-grid">
                    <TextField
                      label="City or municipality"
                      value={draft.homeCity}
                      onChange={(value) => update({ homeCity: value })}
                      placeholder="e.g. Pagadian City"
                      disabled={draft.locationMode !== 'home'}
                      maxLength={80}
                    />
                    <TextField
                      label="Barangay"
                      value={draft.homeBarangay}
                      onChange={(value) => update({ homeBarangay: value })}
                      placeholder="e.g. Poblacion"
                      disabled={draft.locationMode !== 'home'}
                      maxLength={80}
                    />
                  </div>
                  <p className="tfs-hint">
                    Your barangay is only used to estimate distance. It is never shown as your exact
                    address.
                  </p>
                </>
              ) : null}

              {tab === 'appearance' ? (
                <>
                  <SectionTitle
                    title="Appearance"
                    description="Pick how ThriftFinder looks on this device."
                  />

                  <div className="tfs-themes" role="radiogroup" aria-label="Theme">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={theme === 'light'}
                      className={`tfs-theme${theme === 'light' ? ' is-active' : ''}`}
                      onClick={() => theme !== 'light' && toggleTheme()}
                    >
                      <span className="tfs-theme__preview tfs-theme__preview--light" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="tfs-theme__label">
                        <Sun size={16} aria-hidden="true" />
                        Light
                      </span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={theme === 'dark'}
                      className={`tfs-theme${theme === 'dark' ? ' is-active' : ''}`}
                      onClick={() => theme !== 'dark' && toggleTheme()}
                    >
                      <span className="tfs-theme__preview tfs-theme__preview--dark" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="tfs-theme__label">
                        <Moon size={16} aria-hidden="true" />
                        Dark
                      </span>
                    </button>
                  </div>
                  <p className="tfs-hint">
                    Theme changes apply right away and are remembered on this device. You can also use
                    the sun/moon switch in the top bar.
                  </p>
                </>
              ) : null}
            </div>

            {/* ----------------------------- Footer ---------------------------- */}
            <footer className="tfs-footer">
              <div className="tfs-footer__status" aria-live="polite">
                {justSaved ? (
                  <span className="tfs-status tfs-status--saved">All changes saved</span>
                ) : dirty ? (
                  <span className="tfs-status tfs-status--dirty">You have unsaved changes</span>
                ) : null}
                {SHOW_PREVIEW_NOTICE ? (
                  <span className="tfs-preview">Preview: settings aren’t stored on your account yet.</span>
                ) : null}
              </div>
              <div className="tfs-footer__actions">
                <Button type="button" variant="outline" disabled={!dirty} onClick={handleDiscard}>
                  Discard
                </Button>
                <Button type="button" disabled={!dirty} onClick={handleSave}>
                  Save changes
                </Button>
              </div>
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal