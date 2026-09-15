'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing">
      <div className="landing__glow landing__glow--one" />
      <div className="landing__glow landing__glow--two" />

      <nav className="landing__nav">
        <div className="landing__logo">
          <span className="landing__logo-mark">D</span>
          <span>DyslexiFit</span>
        </div>

        <div className="landing__status">
          <span className="landing__status-dot" />
          Neuro-adaptive reading
        </div>
      </nav>

      <section className="landing__hero">
        <div className="landing__eyebrow">READ WITHOUT THE FRICTION</div>

        <h1>
          Make words
          <br />
          <span>work for you.</span>
        </h1>

        <p className="landing__description">
          DyslexiFit adapts the way text appears as you read, helping reduce
          visual strain, keep your place, and make reading feel more natural.
        </p>

        {/* Integration point:
            Change "/reader" to whatever route contains your functional app. */}
        <Link href="/reader" className="landing__button">
          Try DyslexiFit
          <span>→</span>
        </Link>

        <p className="landing__hint">
          No hardware required · Just bring your text
        </p>
      </section>

      <section className="landing__preview">
        <div className="preview__top">
          <span>ADAPTIVE READING</span>
          <span className="preview__live">
            <span />
            LIVE
          </span>
        </div>

        <div className="preview__text">
          <p>
            <strong>Reading</strong> should feel natural, not exhausting.
          </p>
          <p>
            DyslexiFit <strong>adapts</strong> your reading experience in
            real time.
          </p>
        </div>

        <div className="preview__line">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>

      <div className="landing__orb landing__orb--f">F</div>
      <div className="landing__orb landing__orb--d">D</div>

      <div className="landing__bottom">
        <span>DESIGNED FOR BETTER READING</span>
        <span>SCROLL TO EXPLORE</span>
      </div>
    </main>
  );
}
