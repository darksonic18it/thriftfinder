import { ArrowRight, Clock, Loader2, Search, X } from 'lucide-react'
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { formatPeso } from '../lib/listingMappers'
import { searchService, type SearchSuggestion } from '../services/searchService'
import { LISTING_CATEGORIES } from '../types/database'

import './SearchOverlay.css'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

const MIN_CHARS = 2
const DEBOUNCE_MS = 250

const SearchOverlay: React.FC<SearchOverlayProps> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listId = useId()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recent, setRecent] = useState<string[]>([])

  const term = query.trim()
  const canSuggest = term.length >= MIN_CHARS
  const totalRows = results.length + (term ? 1 : 0) // + "See all results" row

  // Reset, focus and lock page scroll whenever the overlay opens.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setResults([])
    setError(null)
    setActiveIndex(-1)
    setRecent(searchService.getRecent())

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0)

    return () => {
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusTimer)
    }
  }, [open])

  // Debounced live suggestions (stale requests are cancelled).
  useEffect(() => {
    if (!open) return

    if (!canSuggest) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)

    const timer = window.setTimeout(async () => {
      const { data, error: err } = await searchService.suggest(term, 6, controller.signal)
      if (controller.signal.aborted) return
      setLoading(false)
      if (err) {
        setResults([])
        setError(err.message)
        return
      }
      setError(null)
      setResults(data ?? [])
      setActiveIndex(-1)
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, term, canSuggest])

    const goToResults = useCallback(
    (value: string) => {
      const clean = value.trim()
      if (!clean) return
      searchService.saveRecent(clean)
      onClose()
      navigate(`/dashboard?search=${encodeURIComponent(clean)}`)
    },
    [navigate, onClose]
  )

  const goToListing = (item: SearchSuggestion) => {
    searchService.saveRecent(term)
    onClose()
    navigate(`/listing/${item.id}`, { state: { from: '/dashboard' } })
  }

  const goToCategory = (category: string) => {
    onClose()
    navigate(`/dashboard?category=${encodeURIComponent(category)}`)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (totalRows) setActiveIndex((i) => (i + 1) % totalRows)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (totalRows) setActiveIndex((i) => (i <= 0 ? totalRows - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < results.length) {
        goToListing(results[activeIndex])
      } else {
        goToResults(term)
      }
    }
  }

  if (!open) return null

  const seeAllIndex = results.length
  const showEmptyState = !term
  const showNoResults = canSuggest && !loading && !error && results.length === 0

  return createPortal(
    <div
      className="search-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="search-overlay__panel" role="dialog" aria-modal="true" aria-label="Search listings">
        <div className="search-overlay__bar">
          <Search size={20} aria-hidden="true" className="search-overlay__bar-icon" />
          <input
            ref={inputRef}
            className="search-overlay__input"
            type="text"
            role="combobox"
            aria-expanded={totalRows > 0}
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            placeholder="Search listings, categories..."
            value={query}
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          {loading && <Loader2 size={18} className="search-overlay__spinner" aria-label="Searching" />}
          <button type="button" className="search-overlay__close" onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        </div>

        <div className="search-overlay__body" id={listId} role="listbox">
          {showEmptyState && (
            <>
              {recent.length > 0 && (
                <section>
                  <div className="search-overlay__section-title">
                    <span>Recent searches</span>
                    <button
                      type="button"
                      className="search-overlay__link-btn"
                      onClick={() => {
                        searchService.clearRecent()
                        setRecent([])
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  {recent.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="search-overlay__row"
                      onClick={() => goToResults(item)}
                    >
                      <Clock size={16} aria-hidden="true" />
                      <span className="search-overlay__row-title">{item}</span>
                    </button>
                  ))}
                </section>
              )}

              <section>
                <div className="search-overlay__section-title">
                  <span>Browse by category</span>
                </div>
                <div className="search-overlay__chips">
                  {LISTING_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className="search-overlay__chip"
                      onClick={() => goToCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {term && !canSuggest && (
            <p className="search-overlay__hint">Type at least {MIN_CHARS} characters to see suggestions.</p>
          )}

          {error && (
            <p className="search-overlay__error" role="alert">
              {error}
            </p>
          )}

          {showNoResults && (
            <p className="search-overlay__hint">No quick matches for "{term}". Try the full search below.</p>
          )}

          {results.map((item, index) => (
            <button
              key={item.id}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={`search-overlay__row ${activeIndex === index ? 'search-overlay__row--active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => goToListing(item)}
            >
              <img className="search-overlay__thumb" src={item.imageUrl} alt="" loading="lazy" />
              <span className="search-overlay__meta">
                <span className="search-overlay__row-title">{item.title}</span>
                <span className="search-overlay__sub">{item.category}</span>
              </span>
              <span className="search-overlay__price">{formatPeso(item.price)}</span>
            </button>
          ))}

          {term && (
            <button
              id={`${listId}-${seeAllIndex}`}
              type="button"
              role="option"
              aria-selected={activeIndex === seeAllIndex}
              className={`search-overlay__row search-overlay__row--all ${
                activeIndex === seeAllIndex ? 'search-overlay__row--active' : ''
              }`}
              onMouseEnter={() => setActiveIndex(seeAllIndex)}
              onClick={() => goToResults(term)}
            >
              <Search size={16} aria-hidden="true" />
              <span className="search-overlay__row-title">See all results for "{term}"</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="search-overlay__footer" aria-hidden="true">
          <span>↑↓ navigate</span>
          <span>Enter select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SearchOverlay