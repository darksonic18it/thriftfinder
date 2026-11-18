import { describeError, listingImageUrl } from '../lib/listingMappers'
import { supabase } from '../lib/supabaseClient'
import type { ServiceResult } from '../types/database'

export interface SearchSuggestion {
  id: string
  title: string
  category: string
  price: number
  imageUrl: string
}

interface SuggestionRow {
  id: string
  title: string
  category: string
  price: number | string
  cover_image_path: string | null
}

const SEARCH_TIMEOUT_MS = 8000
const RECENT_KEY = 'thriftfinder.recentSearches'
const RECENT_MAX = 5

export const searchService = {
  /**
   * Live suggestions from the search_listings_quick() database function.
   * Cancels cleanly (pass an AbortSignal) and gives up after 8 seconds.
   */
  async suggest(
    query: string,
    limit = 6,
    signal?: AbortSignal
  ): Promise<ServiceResult<SearchSuggestion[]>> {
    const term = query.trim()
    if (term.length < 2) return { data: [], error: null }

    const controller = new AbortController()
    const forwardAbort = () => controller.abort()
    signal?.addEventListener('abort', forwardAbort)

    let timedOut = false
    const timer = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, SEARCH_TIMEOUT_MS)

    try {
      const { data, error } = await supabase
        .rpc('search_listings_quick', { p_query: term, p_limit: limit })
        .abortSignal(controller.signal)

      if (error) {
        if (signal?.aborted) return { data: [], error: null } // stale request, ignore
        if (timedOut) {
          return { data: null, error: { message: 'Search timed out. Please try again.' } }
        }
        console.error('[searchService.suggest]', error)
        return { data: null, error: describeError(error, 'Search is unavailable right now.') }
      }

      const rows = (data ?? []) as SuggestionRow[]
      return {
        data: rows.map((row) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          price: Number(row.price) || 0,
          imageUrl: listingImageUrl(row.cover_image_path),
        })),
        error: null,
      }
    } catch (err) {
      if (signal?.aborted) return { data: [], error: null }
      if (timedOut) {
        return { data: null, error: { message: 'Search timed out. Please try again.' } }
      }
      console.error('[searchService.suggest]', err)
      return { data: null, error: { message: 'Search is unavailable right now.' } }
    } finally {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', forwardAbort)
    }
  },

  // Recent searches live only in this browser (a convenience, not account data).
  getRecent(): string[] {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX)
        : []
    } catch {
      return []
    }
  },

  saveRecent(term: string): void {
    const clean = term.trim().slice(0, 80)
    if (!clean) return
    try {
      const next = [
        clean,
        ...searchService.getRecent().filter((t) => t.toLowerCase() !== clean.toLowerCase()),
      ].slice(0, RECENT_MAX)
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable: ignore */
    }
  },

  clearRecent(): void {
    try {
      window.localStorage.removeItem(RECENT_KEY)
    } catch {
      /* ignore */
    }
  },
}