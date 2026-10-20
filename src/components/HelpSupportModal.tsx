import type { LucideIcon } from 'lucide-react'
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Eye,
    Lock,
    MapPin,
    MessageSquare,
    Search,
    ShieldCheck,
    Users,
    Wallet,
    X,
} from 'lucide-react'
import React, { useId, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'

import './HelpSupportModal.css'

/* ==========================================================================
   GUI ONLY
   --------------------------------------------------------------------------
   The Help Center and Safety tips are plain content. The Contact form checks
   its fields and shows a success screen, but nothing is sent anywhere yet.
   Search for TODO(backend) to find where to add the real submit.
   Set SHOW_PREVIEW_NOTICE to false to hide the small "not sent yet" note.
   ========================================================================== */

const SHOW_PREVIEW_NOTICE = true
const MESSAGE_MAX = 1000

type TabId = 'faq' | 'safety' | 'contact'
type FaqCategory = 'buying' | 'selling' | 'messages' | 'nearby' | 'safety' | 'account'

interface Faq {
  id: string
  category: FaqCategory
  question: string
  answer: string
  link?: { label: string; to: string }
}

const CATEGORY_LABELS: Record<FaqCategory, string> = {
  buying: 'Buying & reserving',
  selling: 'Selling',
  messages: 'Messages',
  nearby: 'Items Near Me',
  safety: 'Safety & reports',
  account: 'Account',
}

const FAQS: Faq[] = [
  {
    id: 'how-reserve',
    category: 'buying',
    question: 'How does reserving an item work?',
    answer:
      'Open a listing and tap the Reserve button. The item is held for you while the seller confirms. A reservation goes from Pending to Confirmed, then Completed once the exchange is done, or Cancelled if either side backs out. Reservations that aren’t confirmed in time may expire automatically, which releases the item for other buyers.',
  },
  {
    id: 'payment',
    category: 'buying',
    question: 'Does ThriftFinder handle payment or delivery?',
    answer:
      'No. ThriftFinder connects buyers and sellers, but it isn’t part of the payment or the handover. Agree on the meeting place, handover, and payment method directly with the other person. There are currently no fees for listing, browsing, or reserving items.',
    link: { label: 'Read the Terms', to: '/terms' },
  },
  {
    id: 'cancel',
    category: 'buying',
    question: 'Can I cancel a reservation?',
    answer:
      'Yes. Either the buyer or the seller can cancel a pending or confirmed reservation. Please only reserve items you plan to pick up. Making repeated reservations without completing the exchange counts as misuse of the reservation system.',
  },
  {
    id: 'own-listing',
    category: 'buying',
    question: 'Why can’t I reserve my own listing?',
    answer: 'Reservations are for buyers, so you can’t reserve an item you are selling.',
  },
  {
    id: 'reserved-by-other',
    category: 'buying',
    question: 'Why does a listing say it’s reserved?',
    answer:
      'Another buyer is holding it. If that reservation is cancelled or expires, the item becomes available again. Save it to your Favorites so you can find it quickly later.',
  },
  {
    id: 'saved',
    category: 'buying',
    question: 'Where are my saved items?',
    answer: 'Tap the heart icon in the top bar, or choose Favorites in your profile menu.',
    link: { label: 'Open Favorites', to: '/saved-items' },
  },
  {
    id: 'post',
    category: 'selling',
    question: 'How do I post a listing?',
    answer:
      'Tap the + icon in the top bar. Add photos, a title, a price in pesos, a category, and a condition (Like New, Excellent, Good, or Fair). Describe the item honestly, including any flaws.',
    link: { label: 'Create a listing', to: '/create-listing' },
  },
  {
    id: 'photos',
    category: 'selling',
    question: 'How many photos can I add?',
    answer:
      'As many as you need. There is no fixed limit, so show every angle and any damage. Photos must be of the actual item you are selling, not stock images.',
  },
  {
    id: 'edit-listing',
    category: 'selling',
    question: 'How do I edit or remove my listing?',
    answer: 'Open your profile menu, choose My Listings, then pick the listing you want to change.',
    link: { label: 'Open My Listings', to: '/my-listings' },
  },
  {
    id: 'got-reserved',
    category: 'selling',
    question: 'Someone reserved my item. What now?',
    answer:
      'You’ll get a notification. Confirm or decline the reservation promptly, then use Messages to arrange the meet-up with the buyer.',
  },
  {
    id: 'reviews',
    category: 'selling',
    question: 'How do ratings and reviews work?',
    answer:
      'After a reservation, a buyer can rate the seller from 1 to 5 stars and leave a comment. Ratings show on the seller’s profile. Each person can review a reservation once.',
  },
  {
    id: 'msg-how',
    category: 'messages',
    question: 'How do I message a seller or buyer?',
    answer:
      'Open a listing and use its message button. Every conversation is tied to one listing and one other person. Choose Messages in your profile menu to see all of your conversations.',
  },
  {
    id: 'msg-delete',
    category: 'messages',
    question: 'Can I delete a message I sent?',
    answer:
      'Yes. Open the ⋯ menu on a message and choose whether to delete it just for you or for everyone in the conversation.',
  },
  {
    id: 'nearby-how',
    category: 'nearby',
    question: 'How does Items Near Me work?',
    answer:
      'On Browse, choose Use my location or Choose barangay manually, then pick a radius. You’ll see listings whose sellers saved an approximate area within that distance.',
    link: { label: 'Go to Browse', to: '/dashboard' },
  },
  {
    id: 'nearby-privacy',
    category: 'nearby',
    question: 'Can buyers see my exact address?',
    answer:
      'No. Locations are rounded so they only point to your general area, and distances are shown as rough estimates. Your exact address is never shown.',
  },
  {
    id: 'nearby-empty',
    category: 'nearby',
    question: 'Why don’t I see any nearby items?',
    answer:
      'Try a bigger radius or a different barangay. Only listings whose sellers saved a location can appear in nearby results.',
  },
  {
    id: 'nearby-gps',
    category: 'nearby',
    question: 'Why is “Use my location” slow or blocked?',
    answer:
      'Your browser has to ask for permission, and some desktops can’t get a location quickly. If it times out or is blocked, use Choose barangay manually instead.',
  },
  {
    id: 'report',
    category: 'safety',
    question: 'How do I report a listing or user?',
    answer:
      'Open the listing and tap the flag icon. Pick a reason (for example scam or fraud, counterfeit item, misleading information, or harassment) and add any details. If something feels unsafe, stop messaging that person.',
  },
  {
    id: 'red-flags',
    category: 'safety',
    question: 'What should I watch out for?',
    answer:
      'Be careful with requests to pay in advance, deals that seem too good to be true, people who refuse to meet in person, and anyone who asks you to move the chat off ThriftFinder.',
  },
  {
    id: 'prohibited',
    category: 'safety',
    question: 'What can’t I sell on ThriftFinder?',
    answer:
      'Stolen, counterfeit, hazardous, or illegal items, and anything prohibited under Philippine law.',
    link: { label: 'See prohibited conduct', to: '/terms' },
  },
  {
    id: 'change-password',
    category: 'account',
    question: 'How do I change my password?',
    answer: 'Open Settings from your profile menu and go to the Account tab.',
  },
  {
    id: 'notifications',
    category: 'account',
    question: 'How do I change which notifications I get?',
    answer: 'Open Settings from your profile menu and go to the Notifications tab.',
  },
  {
    id: 'theme',
    category: 'account',
    question: 'How do I switch between light and dark mode?',
    answer: 'Use the sun/moon switch in the top bar, or open Settings and go to Appearance.',
  },
  {
    id: 'delete-account',
    category: 'account',
    question: 'How do I delete my account?',
    answer: 'Open Settings, go to Account, and scroll to Delete account.',
  },
]

const SAFETY_TIPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MapPin,
    title: 'Meet in a public place',
    body: 'Choose a busy, well-lit spot like a mall, plaza, or school gate. Avoid meeting at your home or at a stranger’s place.',
  },
  {
    icon: Eye,
    title: 'Inspect before you pay',
    body: 'Check that the item matches the photos and description, test electronics, and look for any flaws the seller mentioned.',
  },
  {
    icon: Users,
    title: 'Bring a friend',
    body: 'Tell someone where you’re going, or bring a friend, especially for higher-priced items.',
  },
  {
    icon: MessageSquare,
    title: 'Keep chats on ThriftFinder',
    body: 'Messages here stay tied to the listing, which makes it easier to report a problem later.',
  },
  {
    icon: Wallet,
    title: 'Be careful with advance payments',
    body: 'ThriftFinder doesn’t process payments. Avoid sending money by bank, e-wallet, or load before you’ve seen the item.',
  },
  {
    icon: Lock,
    title: 'Protect your details',
    body: 'Never share passwords or one-time codes, and don’t post your exact home address in chats or on a listing.',
  },
]

const CONTACT_TOPICS = [
  'Account or login',
  'A problem with a listing',
  'A problem with a reservation',
  'Report a user or listing',
  'Something isn’t working',
  'Feedback or suggestion',
  'Other',
]

/* ==========================================================================
   Contact form
   ========================================================================== */

interface ContactFormProps {
  email: string
  onBackToHelp: () => void
}

const ContactForm: React.FC<ContactFormProps> = ({ email, onBackToHelp }) => {
  const baseId = useId()
  const [topic, setTopic] = useState(CONTACT_TOPICS[0])
  const [listing, setListing] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [replyToEmail, setReplyToEmail] = useState(true)
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({})
  const [sent, setSent] = useState(false)

  const submit = () => {
    const next: { subject?: string; message?: string } = {}
    if (subject.trim().length < 4) next.subject = 'Add a short subject (at least 4 characters).'
    if (message.trim().length < 15) {
      next.message = 'Tell us a bit more (at least 15 characters) so we can help.'
    }
    setErrors(next)
    if (next.subject || next.message) return

    // TODO(backend): send { topic, listing, subject, message, replyToEmail } to your
    // support inbox / table, then show the success screen.
    setSent(true)
  }

  const reset = () => {
    setTopic(CONTACT_TOPICS[0])
    setListing('')
    setSubject('')
    setMessage('')
    setReplyToEmail(true)
    setErrors({})
    setSent(false)
  }

  if (sent) {
    return (
      <div className="tfh-success" role="status">
        <span className="tfh-success__icon" aria-hidden="true">
          <CheckCircle2 size={30} />
        </span>
        <h3>Message sent</h3>
        <p>
          Thanks for reaching out about “{topic.toLowerCase()}”.
          {replyToEmail && email ? ` We’ll reply to ${email}.` : ' Check back here for updates.'}
        </p>
        <div className="tfh-success__actions">
          <Button type="button" variant="outline" onClick={reset}>
            Send another message
          </Button>
          <Button type="button" onClick={onBackToHelp}>
            Back to Help Center
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="tfh-form">
      <p className="tfh-lead">
        Can’t find an answer? Tell us what happened and we’ll look into it. For urgent safety
        concerns, stop messaging the other person and report their listing from its page.
      </p>

      <div className="tfh-field">
        <label htmlFor={`${baseId}-topic`}>What do you need help with?</label>
        <select
          id={`${baseId}-topic`}
          className="tfh-select"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        >
          {CONTACT_TOPICS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="tfh-field">
        <label htmlFor={`${baseId}-listing`}>
          Related listing <span className="tfh-optional">(optional)</span>
        </label>
        <input
          id={`${baseId}-listing`}
          className="tfh-input"
          type="text"
          value={listing}
          onChange={(event) => setListing(event.target.value)}
          placeholder="Paste the listing link or its title"
          maxLength={200}
        />
      </div>

      <div className="tfh-field">
        <label htmlFor={`${baseId}-subject`}>Subject</label>
        <input
          id={`${baseId}-subject`}
          className="tfh-input"
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Short summary of the problem"
          maxLength={120}
          aria-invalid={errors.subject ? true : undefined}
          aria-describedby={errors.subject ? `${baseId}-subject-error` : undefined}
        />
        {errors.subject ? (
          <p className="tfh-error" id={`${baseId}-subject-error`} role="alert">
            {errors.subject}
          </p>
        ) : null}
      </div>

      <div className="tfh-field">
        <label htmlFor={`${baseId}-message`}>Message</label>
        <textarea
          id={`${baseId}-message`}
          className="tfh-input tfh-textarea"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What happened? Include dates, names, or steps if you can."
          maxLength={MESSAGE_MAX}
          rows={5}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${baseId}-message-error` : undefined}
        />
        <div className="tfh-field__foot">
          {errors.message ? (
            <p className="tfh-error" id={`${baseId}-message-error`} role="alert">
              {errors.message}
            </p>
          ) : (
            <span />
          )}
          <span className="tfh-counter">
            {message.length}/{MESSAGE_MAX}
          </span>
        </div>
      </div>

      <label className="tfh-check">
        <input
          type="checkbox"
          checked={replyToEmail}
          onChange={(event) => setReplyToEmail(event.target.checked)}
        />
        <span>
          Reply to my account email{email ? <> (<strong>{email}</strong>)</> : null}
        </span>
      </label>

      <div className="tfh-form__actions">
        <Button type="button" onClick={submit}>
          Send message
        </Button>
      </div>
    </div>
  )
}

/* ==========================================================================
   Modal
   ========================================================================== */

interface HelpSupportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'faq', label: 'Help Center' },
  { id: 'safety', label: 'Safety tips' },
  { id: 'contact', label: 'Contact us' },
]

const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ open, onOpenChange }) => {
  const { displayEmail } = useAuth()
  const [tab, setTab] = useState<TabId>('faq')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FaqCategory | 'all'>('all')

  const normalized = query.trim().toLowerCase()
  const visibleFaqs = FAQS.filter((faq) => {
    if (category !== 'all' && faq.category !== category) return false
    if (!normalized) return true
    return (
      faq.question.toLowerCase().includes(normalized) ||
      faq.answer.toLowerCase().includes(normalized)
    )
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTab('faq')
      setQuery('')
      setCategory('all')
    }
    onOpenChange(next)
  }

  const closeModal = () => handleOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="tfh-modal">
        <div className="tfh-shell">
          <header className="tfh-header">
            <div>
              <DialogTitle className="tfh-title">Help &amp; Support</DialogTitle>
              <DialogDescription className="tfh-subtitle">
                Answers about reserving, selling, and staying safe on ThriftFinder.
              </DialogDescription>
            </div>

            <label className="tfh-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={query}
                placeholder="Search for help, like “reservation” or “nearby”"
                aria-label="Search the Help Center"
                onChange={(event) => {
                  setQuery(event.target.value)
                  setTab('faq')
                }}
              />
              {query ? (
                <button
                  type="button"
                  className="tfh-search__clear"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <div className="tfh-tabs" role="tablist" aria-label="Help sections">
              {TAB_LABELS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tfh-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`tfh-panel-${id}`}
                  className={`tfh-tab${tab === id ? ' is-active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div
            className="tfh-body"
            role="tabpanel"
            id={`tfh-panel-${tab}`}
            aria-labelledby={`tfh-tab-${tab}`}
            tabIndex={0}
          >
            {tab === 'faq' ? (
              <>
                <div className="tfh-chips" role="group" aria-label="Filter by topic">
                  <button
                    type="button"
                    className={`tfh-chip${category === 'all' ? ' is-active' : ''}`}
                    aria-pressed={category === 'all'}
                    onClick={() => setCategory('all')}
                  >
                    All topics
                  </button>
                  {(Object.keys(CATEGORY_LABELS) as FaqCategory[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`tfh-chip${category === key ? ' is-active' : ''}`}
                      aria-pressed={category === key}
                      onClick={() => setCategory(key)}
                    >
                      {CATEGORY_LABELS[key]}
                    </button>
                  ))}
                </div>

                {visibleFaqs.length === 0 ? (
                  <div className="tfh-empty">
                    <p className="tfh-empty__title">No answers match “{query.trim()}”</p>
                    <p className="tfh-empty__hint">
                      Try different words, or send us a message and we’ll help.
                    </p>
                    <Button type="button" variant="outline" onClick={() => setTab('contact')}>
                      Contact us
                    </Button>
                  </div>
                ) : (
                  <ul className="tfh-faqs">
                    {visibleFaqs.map((faq) => (
                      <li key={faq.id}>
                        <details className="tfh-faq">
                          <summary>
                            <span>{faq.question}</span>
                            <ChevronDown size={18} aria-hidden="true" />
                          </summary>
                          <div className="tfh-faq__answer">
                            <p>{faq.answer}</p>
                            {faq.link ? (
                              <Link to={faq.link.to} onClick={closeModal}>
                                {faq.link.label}
                              </Link>
                            ) : null}
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : null}

            {tab === 'safety' ? (
              <>
                <p className="tfh-lead">
                  ThriftFinder helps you find and reserve secondhand items, but meeting and paying
                  happen between you and the other person. A few habits keep every exchange safe.
                </p>

                <div className="tfh-tips">
                  {SAFETY_TIPS.map(({ icon: Icon, title, body }) => (
                    <article className="tfh-tip" key={title}>
                      <span className="tfh-tip__icon" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <div>
                        <h3>{title}</h3>
                        <p>{body}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="tfh-callout">
                  <AlertTriangle size={20} aria-hidden="true" />
                  <div>
                    <h3>Something doesn’t feel right?</h3>
                    <p>
                      Stop the conversation and report the listing using the flag icon on its page.
                      You can also tell us about it from the Contact tab.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setTab('contact')}>
                      <ShieldCheck size={14} aria-hidden="true" />
                      Contact us
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {tab === 'contact' ? (
              <ContactForm email={displayEmail} onBackToHelp={() => setTab('faq')} />
            ) : null}
          </div>

          <footer className="tfh-footer">
            <nav className="tfh-footer__links" aria-label="Legal">
              <Link to="/terms" onClick={closeModal}>
                Terms of Service
              </Link>
              <Link to="/privacy" onClick={closeModal}>
                Privacy Policy
              </Link>
            </nav>
            {SHOW_PREVIEW_NOTICE ? (
              <span className="tfh-preview">Preview: messages aren’t sent to the team yet.</span>
            ) : null}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HelpSupportModal