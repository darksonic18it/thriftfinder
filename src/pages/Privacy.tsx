import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './LegalPage.css'

const LAST_UPDATED = 'September 29, 2026'

const SECTIONS = [
  { id: 'overview', label: '1. Overview' },
  { id: 'collect', label: '2. Information We Collect' },
  { id: 'use', label: '3. How We Use Your Information' },
  { id: 'sharing', label: '4. How We Share Information' },
  { id: 'storage', label: '5. Storage & Security' },
  { id: 'retention', label: '6. Retention' },
  { id: 'rights', label: '7. Your Rights' },
  { id: 'cookies', label: '8. Cookies & Local Storage' },
  { id: 'children', label: '9. Children\u2019s Privacy' },
  { id: 'changes', label: '10. Changes to This Policy' },
  { id: 'contact', label: '11. Contact' },
]

const Privacy: React.FC = () => {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <h1 className="legal-hero-title">Privacy Policy</h1>
        <p className="legal-hero-updated">Last updated: {LAST_UPDATED}</p>
      </section>

      <div className="legal-body">
        <Link to="/signup" className="legal-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to sign up
        </Link>

        <p className="legal-intro">
          This Privacy Policy explains what information ThriftFinder collects, how it is used,
          and the choices you have. It applies to your use of the ThriftFinder website and
          account.
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

        <section id="overview" className="legal-section">
          <h2>1. Overview</h2>
          <p>
            ThriftFinder connects buyers and sellers of secondhand items. To do that, we need to
            collect a limited amount of information about you, such as your account details and
            the listings and reservations you create. We do not sell your personal information.
          </p>
        </section>

        <section id="collect" className="legal-section">
          <h2>2. Information We Collect</h2>
          <h3>Information you provide</h3>
          <ul>
            <li><strong>Account details:</strong> full name, email address, and password (stored securely by our authentication provider; we never see your plain-text password).</li>
            <li><strong>Profile information:</strong> optional contact number, avatar, and cover photo.</li>
            <li><strong>Listing content:</strong> item titles, descriptions, prices, categories, city, and photos you upload.</li>
            <li><strong>Reservation activity:</strong> which listings you reserve, confirm, complete, or cancel, and when.</li>
            <li><strong>Communications:</strong> anything you send us through Help & Support.</li>
          </ul>
          <h3>Information collected automatically</h3>
          <ul>
            <li>Basic device and browser information used to keep the platform secure and functioning correctly.</li>
            <li>Notification read/dismissed state, stored on your own device to remember which activity you've already seen.</li>
          </ul>
        </section>

        <section id="use" className="legal-section">
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To create and maintain your account, and let you sign in securely.</li>
            <li>To operate core features: listings, browsing, reservations, and the activity feed.</li>
            <li>To show other users the public information needed to complete a transaction, such as your display name on a listing or reservation.</li>
            <li>To detect and prevent fraud, abuse, or violations of our Terms and Conditions.</li>
            <li>To respond to support requests.</li>
          </ul>
        </section>

        <section id="sharing" className="legal-section">
          <h2>4. How We Share Information</h2>
          <p>We limit what is visible to other users and never share more than is needed:</p>
          <ul>
            <li><strong>Your phone number is private.</strong> It is never shown to other users unless you choose to share it directly, such as through your own listing description.</li>
            <li><strong>Your display name</strong> is shown on listings you post and on reservations you're part of, so the other party knows who they're dealing with.</li>
            <li><strong>Service providers:</strong> we use Supabase to host our database, authentication, and file storage. They process data on our behalf under their own security commitments.</li>
            <li><strong>Legal reasons:</strong> we may disclose information if required by law or to protect the safety of our users.</li>
          </ul>
          <p>We do not sell your personal information to advertisers or third parties.</p>
        </section>

        <section id="storage" className="legal-section">
          <h2>5. Storage & Security</h2>
          <p>
            Your data is stored in a Postgres database with row-level security rules that
            restrict each user to their own private data (such as your profile's contact number)
            and only expose what's needed for other users to complete a listing or reservation.
            No system is perfectly secure, but we take reasonable technical measures to protect
            your information.
          </p>
        </section>

        <section id="retention" className="legal-section">
          <h2>6. Retention</h2>
          <p>
            We keep your account and activity data for as long as your account is active. If you
            delete your account, we remove or anonymize your personal information, except where
            we're required to keep records for legal or fraud-prevention purposes.
          </p>
        </section>

        <section id="rights" className="legal-section">
          <h2>7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you.</li>
            <li>Correct inaccurate information, most of which you can edit directly from your profile.</li>
            <li>Request deletion of your account and associated personal data.</li>
            <li>Object to certain uses of your information.</li>
          </ul>
          <p>To exercise these rights, contact us through Help & Support in your account menu.</p>
        </section>

        <section id="cookies" className="legal-section">
          <h2>8. Cookies & Local Storage</h2>
          <p>
            ThriftFinder uses your browser's local storage to keep you signed in and to remember
            which notifications you've read or archived. This information stays on your own
            device and is not shared with other users or third parties.
          </p>
        </section>

        <section id="children" className="legal-section">
          <h2>9. Children's Privacy</h2>
          <p>
            ThriftFinder is not directed at children under 13, and we do not knowingly collect
            personal information from them. If you believe a child has created an account, please
            contact us so we can remove it.
          </p>
        </section>

        <section id="changes" className="legal-section">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy as ThriftFinder evolves. Material changes will be
            announced on the platform, and the "Last updated" date above will reflect the most
            recent revision.
          </p>
        </section>

        <section id="contact" className="legal-section">
          <h2>11. Contact</h2>
          <p>
            Questions about this Privacy Policy can be sent through the Help & Support option in
            your account menu.
          </p>
        </section>

        <p className="legal-footer-note">
          This is a template provided for a student capstone project and is not legal advice.
          Before public release, have it reviewed against the Philippines' Data Privacy Act of
          2012 (RA 10173) and its implementing rules.
        </p>
      </div>
    </div>
  )
}

export default Privacy