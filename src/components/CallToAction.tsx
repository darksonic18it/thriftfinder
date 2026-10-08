import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, ListChecks, CalendarCheck } from 'lucide-react';
import './CallToAction.css';

/**
 * Landing "How it works" + community + final CTA.
 *
 * Editorial redesign to match FeaturedCategories / FeaturedProducts /
 * CirculationCTA: hairline index rows, uppercase kickers, tight display
 * type, scroll-triggered stagger reveal. No generic badge cards.
 *
 * UI ONLY — copy and navigation targets (/browse, /create-listing) unchanged.
 */

const STEPS = [
  {
    index: '01',
    title: 'Find an item',
    description: 'Browse secondhand listings from sellers near you.',
    Icon: Search,
  },
  {
    index: '02',
    title: 'Choose what you like',
    description: 'Check the item name, condition, price, and location.',
    Icon: ListChecks,
  },
  {
    index: '03',
    title: 'Reserve & arrange pickup',
    description: 'Use the listing page to reserve and arrange the next step.',
    Icon: CalendarCheck,
  },
] as const;

const CallToAction: React.FC = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`cta-section${inView ? ' cta-in' : ''}`}
      aria-label="How ThriftFinder works"
    >
      <div className="cta-container">
        {/* How it works — editorial index */}
        <div className="how-it-works">
          <header
            className="cta-header cta-reveal"
            style={{ '--cta-i': 0 } as React.CSSProperties}
          >
            <div className="cta-header__text">
              <p className="cta-kicker">03 — How it works</p>
              <h2 className="cta-title">How it works</h2>
              <p className="cta-subtitle">
                A simple way to find something you&rsquo;ll use, and sell what you don&rsquo;t need.
              </p>
            </div>
            <p className="cta-count" aria-hidden="true">
              01 / 02 / 03
            </p>
          </header>

          <ol className="steps">
            {STEPS.map((step, i) => (
              <li key={step.index}>
                <article
                  className="step-row cta-reveal"
                  style={{ '--cta-i': i + 1 } as React.CSSProperties}
                >
                  <span className="step-row__fill" aria-hidden="true" />
                  <span className="step-index" aria-hidden="true">
                    {step.index}
                  </span>
                  <span className="step-main">
                    <span className="step-heading">
                      <step.Icon size={20} className="step-glyph" aria-hidden="true" />
                      <span className="step-title">{step.title}</span>
                    </span>
                    <span className="step-description">{step.description}</span>
                  </span>
                  <ArrowUpRight size={20} className="step-arrow" aria-hidden="true" />
                </article>
              </li>
            ))}
          </ol>
        </div>

        {/* Community — editorial note, not a card */}
        <div
          className="community cta-reveal"
          style={{ '--cta-i': 4 } as React.CSSProperties}
        >
          <p className="community-label">Why secondhand</p>
          <p className="community-title">Give pre-loved items a second life.</p>
          <p className="community-copy">
            Keep useful items in the community, discover better deals, and make secondhand
            shopping easier.
          </p>
        </div>

        {/* Final CTA — big type + plain actions */}
        <div
          className="final-cta cta-reveal"
          style={{ '--cta-i': 5 } as React.CSSProperties}
        >
          <h2 className="final-title">Ready to find your next great find?</h2>
          <p className="final-description">
            Browse what&rsquo;s available near you — or list your own pre-loved items to help
            someone else find theirs.
          </p>
          <div className="cta-actions">
            <button
              type="button"
              className="cta-link cta-link--primary"
              onClick={() => navigate('/browse')}
            >
              <span>Browse items</span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="cta-link"
              onClick={() => navigate('/create-listing')}
            >
              <span>Sell an item</span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;

