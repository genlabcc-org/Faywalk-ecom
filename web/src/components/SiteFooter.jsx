import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './SiteFooter.css';

const SiteFooter = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="faywalk-footer">
      <div className="fw-footer-container">
        <div className="fw-footer-grid">

          {/* Column 1: Brand Info */}
          <div className="fw-col fw-brand-col">
            <Link to="/" className="fw-logo-wrap" aria-label="Faywalk Home">
              <img src="/logo.png" alt="FAYWALK" className="fw-logo-img" />
            </Link>
            <p className="fw-mono-text fw-made-by">Made by FAYWALK</p>

            <div className="fw-brand-bottom">
              <p className="fw-mono-text fw-copy">&copy; 2026 FAYWALK</p>
              <Link to="/Privacy" className="fw-mono-text fw-privacy-link">
                Privacy Policy.
              </Link>
            </div>
          </div>

          {/* Column 2: SHOPS */}
          <div className="fw-col">
            <div className="fw-col-header">
              <span className="fw-col-title">SHOPS</span>
              <span className="fw-col-line" />
            </div>
            <ul className="fw-link-list">
              <li><Link to="/category/new-arrivals">NEW ARRIVAL</Link></li>
              <li><Link to="/category/male">MENS</Link></li>
              <li><Link to="/category/female">WOMENS</Link></li>
              <li><Link to="/category/trending-now">WINTER</Link></li>
            </ul>
          </div>

          {/* Column 3: BRAND */}
          <div className="fw-col">
            <div className="fw-col-header">
              <span className="fw-col-title">BRAND</span>
              <span className="fw-col-line" />
            </div>
            <ul className="fw-link-list">
              <li><a href="/#about">ABOUT</a></li>
              <li><Link to="/contact">CONTACT</Link></li>
              <li><Link to="/category/best-sellers">BLOG</Link></li>
              <li><Link to="/Privacy">404</Link></li>
            </ul>
          </div>

          {/* Column 4: FOLLOW US */}
          <div className="fw-col">
            <div className="fw-col-header">
              <span className="fw-col-title">FOLLOW US</span>
              <span className="fw-col-line" />
            </div>
            <ul className="fw-link-list">
              <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer">X/TWITTER</a></li>
              <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">FACEBOOK</a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">INSTAGRAM</a></li>
              <li><a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">TIKTOK</a></li>
            </ul>
          </div>

          {/* Column 5: DON'T MISS OUT! */}
          <div className="fw-col fw-newsletter-col">
            <h3 className="fw-newsletter-title">DON'T MISS OUT!</h3>
            <p className="fw-mono-text fw-newsletter-desc">
              Register for our newsletter and enjoy a 15% discount on your initial purchase!
            </p>

            <form className="fw-subscribe-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                className="fw-subscribe-input"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="fw-subscribe-btn" aria-label="Subscribe">
                <span className="fw-btn-main">
                  {subscribed ? 'Subscribed!' : 'Subscribe'}
                </span>
                <span className="fw-btn-icon" aria-hidden="true">&#x2197;</span>
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Giant Bottom Watermark */}
      <div className="fw-giant-watermark" aria-hidden="true">
        A LEGACY SINCE 1934
      </div>
    </footer>
  );
};

export default SiteFooter;
