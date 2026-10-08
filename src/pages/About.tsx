import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Compass,
  Heart,
  Leaf,
  ListChecks,
  Recycle,
  Search,
  ShoppingBag,
  Store,
  Target,
  Users,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import './About.css';
import './AboutFounders.css';

/**
 * About page — editorial redesign.
 * Same language as landing: kickers, uppercase display type, hairline
 * index rows, staggered blur+rise scroll reveal + subtle hero parallax.
 * UI ONLY — all copy, team photos, and social links unchanged.
 */

const PROBLEMS = [
  {
    index: '01',
    title: 'Hard to find quality thrift items',
    text: 'Searching through physical thrift stores can be time-consuming and unpredictable. You never know what you\u2019ll find, and great items disappear quickly.',
    Icon: Search,
  },
  {
    index: '02',
    title: 'Buyers need better discovery',
    text: 'Thrift enthusiasts want an easier way to browse what\u2019s available, filter by category, and connect with sellers directly.',
    Icon: ShoppingBag,
  },
  {
    index: '03',
    title: 'Sellers lack a simple platform',
    text: 'People with quality pre-loved items often don\u2019t have a convenient way to list and sell them to the right audience.',
    Icon: Store,
  },
] as const;

const STEPS = [
  {
    index: '01',
    title: 'Discover',
    text: 'Browse through thousands of verified secondhand items across categories like clothing, shoes, accessories, electronics, and collectibles.',
    Icon: Compass,
  },
  {
    index: '02',
    title: 'Connect',
    text: 'Find something you love? View detailed product information, seller profiles, and location to make an informed decision.',
    Icon: ListChecks,
  },
  {
    index: '03',
    title: 'Sell',
    text: 'Have items to sell? List your pre-loved treasures with photos, descriptions, and pricing so others can discover them.',
    Icon: CalendarCheck,
  },
] as const;

const AUDIENCE = [
  {
    label: 'Buyers',
    title: 'Treasure hunters welcome.',
    text: 'Thrift enthusiasts, vintage lovers, and bargain hunters looking for unique, affordable, and sustainable finds.',
    Icon: ShoppingBag,
  },
  {
    label: 'Sellers',
    title: 'Your closet is a storefront.',
    text: 'Anyone with quality pre-loved items they no longer use — from clothes to electronics — looking for an easy way to sell.',
    Icon: Store,
  },
  {
    label: 'Thrift enthusiasts',
    title: 'Circular by conviction.',
    text: 'People passionate about sustainable living, reducing waste, and giving items a second life in the circular economy.',
    Icon: Heart,
  },
] as const;

/**
 * Temporary Unsplash photo — swap for your real founders photo later
 * (any ~3:2 image works; it is cropped with object-fit: cover).
 */
const FOUNDERS_PHOTO =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop';

/** Temporary reference copy — swap names/bios/links any time. */
const FOUNDERS = [
  {
    name: 'Oliver Muñoz',
    role: 'CO-FOUNDER AND VISUAL DESIGN DIRECTOR',
    bio: [
      'With over a decade of experience in digital, creative and design agencies across the United States, Australia and Mexico, Oli has worked with companies leading their industry sectors around the globe, leading and unifying teams around creative vision.',
      "Oli's design philosophy centres on purpose. If design doesn't solve a problem for users, it isn't doing its most important job: balancing functionality and aesthetics.",
    ],
    linkedin: 'https://www.linkedin.com/',
    instagram: 'https://www.instagram.com/',
  },
  {
    name: 'Alejandro Mejias',
    role: 'CO-FOUNDER AND EXPERIENCE DESIGN DIRECTOR',
    bio: [
      'Alejandro has worked in the Australian digital space for many years, helping well-established local and global companies design products from discovery to production. A creatively curious mind and knack for business make him a designer who sees the big picture while paying attention to detail.',
      'Ale sees design as not simply an aesthetic pursuit but a tool to solve problems.',
    ],
    linkedin: 'https://www.linkedin.com/',
    instagram: 'https://www.instagram.com/',
  },
] as const;

const VALUES = [
  {
    title: 'Keep things in circulation',
    text: 'Every listing is one less thing made new. We keep useful items moving between people, not into landfills.',
    Icon: Recycle,
  },
  {
    title: 'Made for the community',
    text: 'Buyers and sellers around you — real people, real pickups, real second chances for great pieces.',
    Icon: Users,
  },
  {
    title: 'Secondhand first',
    text: 'Choosing pre-loved saves money and reduces waste. Small choices, compounded across a community.',
    Icon: Leaf,
  },
] as const;

const useRevealGroup = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('about-in');
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('about-in');
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
};

const About: React.FC = () => {
  const heroRef = useRef<HTMLElement>(null);
  const [heroIn, setHeroIn] = useState(false);
  const introRef = useRevealGroup();
  const problemRef = useRevealGroup();
  const stepsRef = useRevealGroup();
  const audienceRef = useRevealGroup();
  const visionRef = useRevealGroup();
  const teamRef = useRevealGroup();

  // Hero animates in on mount (above the fold — no scroll needed).
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHeroIn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Subtle hero parallax — same pattern as CirculationCTA.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const delta = (rect.top + rect.height / 2 - vh / 2) / vh;
      const clamped = Math.max(-0.6, Math.min(0.6, delta));
      el.style.setProperty('--about-p', clamped.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="about-page">
      {/* Hero */}
      <section
        className={`about-hero${heroIn ? ' about-hero--in' : ''}`}
        ref={heroRef}
        aria-label="About ThriftFinder"
      >
        <div className="about-hero-container">
          <p
            className="about-reveal about-hero-kicker"
            style={{ '--about-i': 0 } as React.CSSProperties}
          >
            About — ThriftFinder
          </p>
          <h1 className="about-hero-title">
            <span
              className="about-line about-reveal"
              style={{ '--about-i': 1 } as React.CSSProperties}
            >
              <span className="about-line__inner">Secondhand,</span>
            </span>
            <span
              className="about-line about-reveal"
              style={{ '--about-i': 2 } as React.CSSProperties}
            >
              <span className="about-line__inner">
                made <span className="about-blue">simple.</span>
              </span>
            </span>
          </h1>
          <p
            className="about-hero-subtitle about-reveal"
            style={{ '--about-i': 3 } as React.CSSProperties}
          >
            Making secondhand shopping easier, more accessible, and more sustainable for everyone.
          </p>
          <div
            className="about-hero-meta about-reveal"
            style={{ '--about-i': 4 } as React.CSSProperties}
          >
            <span>Est. for thrifters</span>
            <span aria-hidden="true">/</span>
            <span>Buy · Sell · Circulate</span>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="about-content">
        <div className="about-container">
          {/* What is ThriftFinder */}
          <div className="about-section about-block" ref={introRef}>
            <header
              className="about-reveal about-head"
              style={{ '--about-i': 0 } as React.CSSProperties}
            >
              <p className="about-kicker">01 — What it is</p>
              <h2 className="about-head__title">What is ThriftFinder?</h2>
            </header>
            <p
              className="about-reveal about-lede"
              style={{ '--about-i': 1 } as React.CSSProperties}
            >
              ThriftFinder is a modern marketplace platform that connects buyers and sellers of
              pre-loved, secondhand, and vintage items. We believe great finds shouldn&rsquo;t stay
              hidden in closets or hard-to-reach thrift stores. Our platform makes it simple to
              discover unique treasures and give your unused items a second chance to shine.
            </p>
          </div>

          {/* The problem we solve */}
          <div className="about-section about-block" ref={problemRef}>
            <header
              className="about-reveal about-head about-head--split"
              style={{ '--about-i': 0 } as React.CSSProperties}
            >
              <div>
                <p className="about-kicker">02 — The problem</p>
                <h2 className="about-head__title">The problem we solve</h2>
              </div>
              <p className="about-count" aria-hidden="true">
                01 / 02 / 03
              </p>
            </header>
            <ol className="about-index">
              {PROBLEMS.map((item, i) => (
                <li key={item.index}>
                  <article
                    className="about-reveal about-row"
                    style={{ '--about-i': i + 1 } as React.CSSProperties}
                  >
                    <span className="about-row__fill" aria-hidden="true" />
                    <span className="about-row__index" aria-hidden="true">
                      {item.index}
                    </span>
                    <span className="about-row__main">
                      <span className="about-row__heading">
                        <item.Icon size={20} className="about-row__glyph" aria-hidden="true" />
                        <span className="about-row__title">{item.title}</span>
                      </span>
                      <span className="about-row__text">{item.text}</span>
                    </span>
                    <ArrowUpRight size={20} className="about-row__arrow" aria-hidden="true" />
                  </article>
                </li>
              ))}
            </ol>
          </div>

          {/* How it works */}
          <div className="about-section about-block" ref={stepsRef}>
            <header
              className="about-reveal about-head about-head--split"
              style={{ '--about-i': 0 } as React.CSSProperties}
            >
              <div>
                <p className="about-kicker">03 — How it works</p>
                <h2 className="about-head__title">How ThriftFinder works</h2>
              </div>
              <p className="about-count" aria-hidden="true">
                Discover / Connect / Sell
              </p>
            </header>
            <ol className="about-index">
              {STEPS.map((item, i) => (
                <li key={item.index}>
                  <article
                    className="about-reveal about-row"
                    style={{ '--about-i': i + 1 } as React.CSSProperties}
                  >
                    <span className="about-row__fill" aria-hidden="true" />
                    <span className="about-row__index" aria-hidden="true">
                      {item.index}
                    </span>
                    <span className="about-row__main">
                      <span className="about-row__heading">
                        <item.Icon size={20} className="about-row__glyph" aria-hidden="true" />
                        <span className="about-row__title">{item.title}</span>
                      </span>
                      <span className="about-row__text">{item.text}</span>
                    </span>
                    <ArrowUpRight size={20} className="about-row__arrow" aria-hidden="true" />
                  </article>
                </li>
              ))}
            </ol>
          </div>

          {/* Who it's for */}
          <div className="about-section about-block" ref={audienceRef}>
            <header
              className="about-reveal about-head"
              style={{ '--about-i': 0 } as React.CSSProperties}
            >
              <p className="about-kicker">04 — Who it&rsquo;s for</p>
              <h2 className="about-head__title">Who is ThriftFinder for?</h2>
            </header>
            <div className="about-duo about-duo--trio">
              {AUDIENCE.map((item, i) => (
                <article
                  key={item.label}
                  className="about-reveal about-duo__item"
                  style={{ '--about-i': i + 1 } as React.CSSProperties}
                >
                  <p className="about-duo__label">
                    <item.Icon size={16} aria-hidden="true" /> {item.label}
                  </p>
                  <p className="about-duo__title">{item.title}</p>
                  <p className="about-duo__text">{item.text}</p>
                </article>
              ))}
            </div>
          </div>

          {/* Our Vision */}
          <div className="about-section about-block" ref={visionRef}>
            <header
              className="about-reveal about-head"
              style={{ '--about-i': 0 } as React.CSSProperties}
            >
              <p className="about-kicker">05 — Our vision</p>
              <h2 className="about-head__title">Our vision</h2>
            </header>
            <p
              className="about-reveal about-lede"
              style={{ '--about-i': 1 } as React.CSSProperties}
            >
              ThriftFinder aims to make secondhand shopping the first choice, not the last resort.
              We envision a future where reuse is celebrated, where every pre-loved item finds a new
              home, and where buying secondhand is as easy and enjoyable as buying new. By connecting
              conscious buyers and sellers, we&rsquo;re building a community that values
              sustainability, affordability, and the joy of discovering hidden gems.
            </p>
            <div
              className="about-reveal about-creed"
              style={{ '--about-i': 2 } as React.CSSProperties}
            >
              <p className="about-creed__label">
                <Target size={16} aria-hidden="true" /> Why it matters
              </p>
              <p className="about-creed__title">Keep good things in circulation.</p>
              <p className="about-creed__text">
                Every listing is one less thing made new — good for wallets, closets, and the planet.
              </p>
            </div>
            <ul className="about-values">
              {VALUES.map((value, i) => (
                <li
                  key={value.title}
                  className="about-reveal about-values__item"
                  style={{ '--about-i': i + 3 } as React.CSSProperties}
                >
                  <value.Icon size={20} className="about-values__glyph" aria-hidden="true" />
                  <p className="about-values__title">{value.title}</p>
                  <p className="about-values__text">{value.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Meet the Founders — full-bleed dark section, reference layout */}
      <section className="about-founders" ref={teamRef} aria-label="Meet the founders">
        {/* Giant word: cropped by the viewport on both sides */}
        <h2
          className="about-reveal founders-giant"
          style={{ '--about-i': 0 } as React.CSSProperties}
        >
          DEVELOPERS
        </h2>

        <div className="founders">
          <div className="founders-hero">
            <figure
              className="about-reveal founders-photo-wrap"
              style={{ '--about-i': 1 } as React.CSSProperties}
            >
              <img
                src={FOUNDERS_PHOTO}
                alt="ThriftFinder founders sitting side by side"
                className="founders-photo"
                loading="lazy"
                draggable={false}
              />
            </figure>

            <div
              className="about-reveal founders-intro"
              style={{ '--about-i': 2 } as React.CSSProperties}
            >
              <p className="founders-eyebrow">
                <span className="founders-eyebrow__ring" aria-hidden="true" />
                <span className="founders-eyebrow__text">Meet The Developers</span>
              </p>
              <p className="founders-tagline">Bisaya roots, Uncommon minds</p>
            </div>
          </div>

          <div className="founders-grid">
            {FOUNDERS.map((member, i) => (
              <article
                key={member.name}
                className="about-reveal founders-card"
                style={{ '--about-i': i + 3 } as React.CSSProperties}
              >
                <p className="founders-name-row">
                  <ArrowRight
                    size={24}
                    strokeWidth={1}
                    className="founders-arrow"
                    aria-hidden="true"
                  />
                  <span className="founders-name">{member.name}</span>
                </p>
                <p className="founders-role">{member.role}</p>
                {member.bio.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="founders-bio">
                    {paragraph}
                  </p>
                ))}
                <div className="founders-links">
                  <a
                    className="founders-pill"
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                  >
                    LIN
                  </a>
                  <a
                    className="founders-pill"
                    href={member.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on Instagram`}
                  >
                    IG
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;