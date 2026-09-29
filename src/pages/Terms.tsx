import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './LegalPage.css'

const LAST_UPDATED = 'September 29, 2026'

const SECTIONS = [
  { id: 'acceptance', label: '1. Acceptance of Terms' },
  { id: 'eligibility', label: '2. Eligibility & Accounts' },
  { id: 'listings', label: '3. Listings & Item Condition' },
  { id: 'reservations', label: '4. Reservations & Handover' },
  { id: 'conduct', label: '5. Prohibited Conduct' },
  { id: 'fees', label: '6. Fees' },
  { id: 'disputes', label: '7. Disputes Between Users' },
  { id: 'ip', label: '8. Intellectual Property' },
  { id: 'termination', label: '9. Suspension & Termination' },
  { id: 'liability', label: '10. Disclaimers & Liability' },
  { id: 'changes', label: '11. Changes to These Terms' },
  { id: 'law', label: '12. Governing Law' },
  { id: 'contact', label: '13. Contact' },
]

const Terms: React.FC = () => {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <h1 className="legal-hero-title">Terms and Conditions</h1>
        <p className="legal-hero-updated">Last updated: {LAST_UPDATED}</p>
      </section>

      <div className="legal-body">
        <Link to="/signup" className="legal-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to sign up
        </Link>

        <p className="legal-intro">
          These Terms and Conditions ("Terms") govern your access to and use of ThriftFinder,
          a web-based marketplace and reservation system for buying and selling secondhand items.
          By creating an account or using ThriftFinder, you agree to these Terms. If you do not
          agree, please do not use the platform.
        </p>

        <nav className="legal-toc" aria-label="Table of contents">
          <h2>On this page</h2>
          <ol>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="acceptance" className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            ThriftFinder is a platform that lets users list, browse, and reserve secondhand items
            for exchange between buyers and sellers. We connect users to each other; we are not a
            party to the sale itself and do not take ownership of any item listed on the platform.
          </p>
          <p>
            By using ThriftFinder, you agree to these Terms and to our{' '}
            <Link to="/privacy">Privacy Policy</Link>. We may update these Terms from time to
            time, as described in Section 11.
          </p>
        </section>

        <section id="eligibility" className="legal-section">
          <h2>2. Eligibility & Accounts</h2>
          <ul>
            <li>You must provide accurate, current information when creating an account.</li>
            <li>You are responsible for keeping your login credentials secure and for all activity under your account.</li>
            <li>One account per person. Accounts may not be sold, transferred, or shared.</li>
            <li>You must notify us promptly if you suspect unauthorized use of your account.</li>
          </ul>
        </section>

        <section id="listings" className="legal-section">
          <h2>3. Listings & Item Condition</h2>
          <p>As a seller, you agree that:</p>
          <ul>
            <li>Every listing must accurately describe the item, including its condition, defects, and any included accessories.</li>
            <li>Photos must be of the actual item being sold, not stock or placeholder images.</li>
            <li>You must have the legal right to sell the item.</li>
            <li>Listings for prohibited, counterfeit, unsafe, or illegal items are not allowed (see Section 5).</li>
          </ul>
          <p>
            ThriftFinder does not inspect items before they are listed and is not responsible for
            verifying the accuracy of a listing.
          </p>
        </section>

        <section id="reservations" className="legal-section">
          <h2>4. Reservations & Handover</h2>
          <p>
            When a buyer reserves a listing, the item is held for that buyer for a limited period
            while the seller confirms the reservation. Reservations that are not confirmed or
            acted on within that period may expire automatically, releasing the item for others
            to reserve.
          </p>
          <ul>
            <li>Sellers are expected to confirm or decline a reservation promptly.</li>
            <li>Buyers and sellers should arrange the item handover, meeting location, and payment method directly with each other.</li>
            <li>ThriftFinder does not process payments between users and is not a party to the payment or handover.</li>
            <li>Either party may cancel a pending or confirmed reservation, subject to fair-use limits described in Section 5.</li>
          </ul>
          <div className="legal-callout">
            <p>
              <strong>Meet safely.</strong> We recommend meeting in a public place for item
              handovers and inspecting an item before completing an exchange.
            </p>
          </div>
        </section>

        <section id="conduct" className="legal-section">
          <h2>5. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>List stolen, counterfeit, hazardous, or illegal items, or items prohibited under Philippine law.</li>
            <li>Make repeated reservations without intending to complete the exchange, or otherwise abuse the reservation system to hold items unfairly.</li>
            <li>Harass, threaten, or discriminate against another user.</li>
            <li>Circumvent, disable, or interfere with the platform's security features.</li>
            <li>Use another person's account or impersonate another individual.</li>
            <li>Scrape, copy, or reuse platform data outside of normal use of the service.</li>
          </ul>
        </section>

        <section id="fees" className="legal-section">
          <h2>6. Fees</h2>
          <p>
            ThriftFinder does not currently charge fees for listing, browsing, or reserving items.
            If this changes, we will provide advance notice through the platform before any fees
            take effect.
          </p>
        </section>

        <section id="disputes" className="legal-section">
          <h2>7. Disputes Between Users</h2>
          <p>
            ThriftFinder facilitates connections between buyers and sellers but is not responsible
            for resolving disputes about item condition, payment, or handover once both parties
            have agreed to a reservation. We encourage users to communicate directly and in good
            faith. We may, but are not obligated to, step in where a user's conduct appears to
            violate these Terms.
          </p>
        </section>

        <section id="ip" className="legal-section">
          <h2>8. Intellectual Property</h2>
          <p>
            The ThriftFinder name, logo, and platform design belong to ThriftFinder. Content you
            upload, such as listing photos and descriptions, remains yours, but by posting it you
            grant ThriftFinder a license to display it on the platform for the purpose of
            operating the marketplace.
          </p>
        </section>

        <section id="termination" className="legal-section">
          <h2>9. Suspension & Termination</h2>
          <p>
            We may suspend or terminate an account that violates these Terms, engages in fraud or
            abuse, or poses a risk to other users. You may stop using ThriftFinder and request
            account deletion at any time.
          </p>
        </section>

        <section id="liability" className="legal-section">
          <h2>10. Disclaimers & Liability</h2>
          <p>
            ThriftFinder is provided "as is." We do not guarantee the accuracy of listings, the
            conduct of other users, or that any exchange will be completed successfully. To the
            extent permitted by law, ThriftFinder is not liable for losses arising from
            transactions between users, including disputes over item condition, payment, or
            failed handovers.
          </p>
        </section>

        <section id="changes" className="legal-section">
          <h2>11. Changes to These Terms</h2>
          <p>
            We may update these Terms as the platform evolves. Material changes will be announced
            on the platform. Continuing to use ThriftFinder after changes take effect means you
            accept the updated Terms.
          </p>
        </section>

        <section id="law" className="legal-section">
          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Republic of the Philippines, without
            regard to conflict-of-law principles.
          </p>
        </section>

        <section id="contact" className="legal-section">
          <h2>13. Contact</h2>
          <p>
            Questions about these Terms can be sent through the Help & Support option in your
            account menu.
          </p>
        </section>

        <p className="legal-footer-note">
          This is a template provided for a student capstone project and is not legal advice.
          Before public release, have it reviewed against applicable Philippine consumer
          protection and e-commerce regulations.
        </p>
      </div>
    </div>
  )
}

export default Terms