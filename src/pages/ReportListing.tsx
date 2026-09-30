import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { listingService } from '../services/listingService'
import './Legalpage.css'
import './ReportListing.css'

/**
 * Report reasons — UI only. Mirrors the taxonomy a future admin/reporting
 * system would use; nothing here is sent or persisted yet.
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
   * UI ONLY — the submit button deliberately does not touch Supabase.
   *
   * A future `reportService.submitReport({ listingId: id, reason, details })`
   * call belongs right here, followed by the same local success state until
   * the backend/admin side exists.
   */
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!reason) {
      setError('Please select a reason for reporting this listing.')
      return
    }

    setError(null)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
              <Button type="submit">Submit Report</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ReportListing