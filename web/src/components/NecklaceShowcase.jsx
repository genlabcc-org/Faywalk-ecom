// NecklaceShowcase.jsx
import React from 'react';
import './NecklaceShowcase.css';
import necklace1 from '../assets/Photo Frame 1.webp';
import necklace2 from '../assets/Photo Frame 2.webp';
import necklace3 from '../assets/Photo Frame.webp';
import necklace4 from '../assets/Photo Frame 4.webp';

// Features Icons
import IconQuality from '../assets/review/icons/iconquality.svg';
import IconPayment from '../assets/review/icons/iconpayment.svg';
import IconReturns from '../assets/review/icons/iconreturns.svg';
import IconMaterials from '../assets/review/icons/iconmaterials.svg';
import IconDelivery from '../assets/review/icons/icondelivery.svg';


// ── Feature data ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: IconQuality,
    title: 'Quality Assurance',
    desc: 'Every piece is carefully inspected and quality-checked before it reaches you.',
  },
  {
    icon: IconPayment,
    title: 'Secure Payments',
    desc: 'Shop with confidence, your transactions are fully encrypted and protected.',
  },
  {
    icon: IconReturns,
    title: 'Easy Returns',
    desc: "Received a damaged piece? Simply share your unboxing video and we'll resolve it.",
  },
  {
    icon: IconMaterials,
    title: 'Genuine Materials',
    desc: 'Crafted from premium alloys, crystals, and stones, beautiful pieces built to last.',
  },
  {
    icon: IconDelivery,
    title: 'Fast Delivery',
    desc: 'Get your favourite pieces delivered to your doorstep quickly.',
  },
];

// ── Gallery data ──────────────────────────────────────────────────────────────
const GALLERY = [
  {
    src: necklace4,
    alt: 'Gold temple necklace',
    className: 'gallery-item--left',
  },
  {
    src: necklace2,
    alt: 'Multicolour choker necklace',
    className: 'gallery-item--center-top',
  },
  {
    src: necklace3,
    alt: 'Kundan choker necklace',
    className: 'gallery-item--center-bottom',
  },
  {
    src: necklace1,
    alt: 'Long layered necklace set',
    className: 'gallery-item--right',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function NecklaceShowcase() {
  return (
    <main>
      {/* ── Feature strip ── */}
      <section aria-label="Why shop with us" className="features-strip">
        {FEATURES.map(({ icon, title, desc }) => (
          <div key={title} className="feature-card">
            <img src={icon} alt={title} className="feature-icon" />
            <p className="feature-title">{title}</p>
            <p className="feature-desc">{desc}</p>
          </div>
        ))}
      </section>

      {/* ── Showcase section ── */}
      <section aria-label="Necklace showcase" className="showcase-section">
        <header className="showcase-header">
          <h2 className="showcase-title">Wear Your Story Around Your Neck</h2>
          <p className="showcase-subtitle">
            From delicate chains to bold statement sets, Every Anika necklace is crafted to turn heads, spark conversations, and become a piece of you.
          </p>
        </header>

        <div className="gallery-grid">
          {GALLERY.map(({ src, alt, className }) => (
            <div key={src} className={`gallery-item ${className}`}>
              <img src={src} alt={alt} loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
