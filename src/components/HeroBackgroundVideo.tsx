import React, { useEffect, useRef, useState } from 'react';
import './HeroBackgroundVideo.css';

// Files live in /public/videos so Vite serves them as-is.
// BASE_URL keeps this working if the site is ever deployed under a sub-path.
const BASE = import.meta.env.BASE_URL;
const SRC = {
  mp4: `${BASE}videos/hero-loop.mp4`,
  webm: `${BASE}videos/hero-loop.webm`,
  poster: `${BASE}videos/hero-poster.jpg`,
};

/** Skip the motion for people who asked for less of it, or are saving data. */
function shouldSkipVideo(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/**
 * Full-bleed looping video for the Hero background.
 *
 * - The poster image paints first (fast, and it is also the fallback when
 *   autoplay is blocked, e.g. iOS Low Power Mode), then the video fades in.
 * - Pauses while the hero is scrolled off-screen to save CPU and battery.
 * - A theme-aware scrim keeps the headline readable in light and dark mode.
 */
const HeroBackgroundVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [skip] = useState(shouldSkipVideo);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React sets `muted` as a property, not an attribute; some browsers only
    // allow autoplay when it is set before play() is called.
    video.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            /* autoplay blocked: the poster stays visible */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(video);

    return () => observer.disconnect();
  }, [skip]);

  return (
    <div className="hero-video" aria-hidden="true">
      <img
        className="hero-video__poster"
        src={SRC.poster}
        alt=""
        decoding="async"
        fetchPriority="high"
      />

      {!skip ? (
        <video
          ref={videoRef}
          className={`hero-video__media${playing ? ' is-playing' : ''}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={SRC.poster}
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
        >
          {/* MP4 first: plays everywhere. WebM is a smaller fallback. */}
          <source src={SRC.mp4} type="video/mp4" />
          <source src={SRC.webm} type="video/webm" />
        </video>
      ) : null}

      <div className="hero-video__scrim" />
    </div>
  );
};

export default HeroBackgroundVideo;