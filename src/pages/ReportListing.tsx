import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { listingService } from '../services/listingService'
import { submitReport } from '../services/reportService'
import './LegalPage.css'
import './ReportListing.css'

/**
 * Report reasons shown to the user. The chosen text is saved as the report's
 * `reason`, and admins see it in the Reports tab of the admin dashboard.
 */
const REPORT_REASONS = [
  'Scam or fraud',
  'Prohibited or illegal item',
  'Counterfeit or fake item',
  'Misleading or inaccurate information',
  'Inappropriate or offensive content',
  'Harassment or abusive behavior',
  'Item is already sold or unavailable',
  'Other',
] as const

/** Keep the counter in sync with the textarea's maxLength. */
const REPORT_DETAILS_MAX_LENGTH = 500

const ReportListing: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  // Keep the same router state the listing page received (its `from` value),
  // so the navbar shell and the "back" target stay consistent.
  const listingPath = `/listing/${id}`
  const backTo = (location.state as { from?: string } | null)?.from || '/browse'

  const [listingTitle, setListingTitle] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Only used to show which listing is being reported. Failure is harmless.
  useEffect(() => {
    let active = true
    if (!id) return
    ;(async () => {
      const { data } = await listingService.getDetail(id)
      if (active && data) setListingTitle(data.listing.title)
    })()
    return () => {
      active = false
    }
  }, [id])

  const goBackToListing = () => navigate(listingPath, { state: location.state })

  /**
   * Saves the report to Supabase through reportService. The database enforces
   * the rules (signed in, verified email, not your own listing, one open
   * report per listing), and submitReport turns those failures into readable
   * messages that we show in the error box below.
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (!reason) {
      setError('Please select a reason for reporting this listing.')
      return
    }
    if (!id) {
      setError('This listing could not be found.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await submitReport({
        targetType: 'listing',
        targetId: id,
        reason,
        details,
      })
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="legal-page report-page">
      <section className="legal-hero">
        <h1 className="legal-hero-title">Report a Listing</h1>
        <p className="legal-hero-updated">
          Help us keep ThriftFinder safe for everyone.
        </p>
      </section>

      <div className="legal-body">
        <Link
          to={listingPath}
          state={location.state}
          className="legal-back-link"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to listing
        </Link>

        {submitted ? (
          <div className="report-success" role="status">
            <CheckCircle2 size={48} aria-hidden="true" className="report-success-icon" />
            <h2>Report submitted</h2>
            <p>
              Thanks for helping keep ThriftFinder safe. We take every report
              seriously and will review it against our{' '}
              <Link to="/terms#conduct">Terms and Conditions</Link>.
            </p>
            <div className="report-actions report-actions--center">
              <Button type="button" onClick={goBackToListing}>
                Back to listing
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(backTo)}>
                Keep browsing
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p className="legal-intro">
              Tell us what's wrong with this listing. Reports are reviewed by the
              ThriftFinder team, and the seller is not told who submitted it.
            </p>

            {listingTitle ? (
              <div className="report-listing-chip">
                <span className="report-listing-chip-label">Reporting</span>
                <span className="report-listing-chip-title">{listingTitle}</span>
              </div>
            ) : null}

            <section className="legal-section">
              <h2>1. Reason for reporting</h2>
              <fieldset className="report-reasons">
                <legend className="sr-only">Reason for reporting</legend>

                {REPORT_REASONS.map((r) => {
                  const isSelected = reason === r
                  return (
                    <label
                      key={r}
                      className={`report-reason ${isSelected ? 'report-reason--selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r}
                        checked={isSelected}
                        onChange={() => {
                          setReason(r)
                          setError(null)
                        }}
                      />
                      <span>{r}</span>
                    </label>
                  )
                })}
              </fieldset>
            </section>

            <section className="legal-section">
              <h2>2. Additional details</h2>
              <div className="report-details-field">
                <label className="report-details-label" htmlFor="report-details">
                  Tell us more about the issue (optional)
                </label>
                <textarea
                  id="report-details"
                  className="report-details"
                  placeholder="Describe what you noticed, e.g. what doesn't match the photos or description."
                  maxLength={REPORT_DETAILS_MAX_LENGTH}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
                <span className="report-counter">
                  {details.length}/{REPORT_DETAILS_MAX_LENGTH}
                </span>
              </div>
            </section>

            <div className="legal-callout">
              <p>
                <strong>Please report in good faith.</strong> Submitting false or
                abusive reports may itself violate our{' '}
                <Link to="/terms#conduct">Prohibited Conduct</Link> rules.
              </p>
            </div>

            {error ? (
              <div className="report-error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="report-actions">
              <Button type="button" variant="outline" onClick={goBackToListing}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ReportListing