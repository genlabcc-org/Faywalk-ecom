import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SplitButton from './ui/SplitButton';
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
            <p className="fw-brand-desc">Refined everyday essentials crafted for effortless elegance.</p>

            <div className="fw-brand-bottom fw-desktop-only">
              <p className="fw-copy">&copy; {new Date().getFullYear()} FAYWALK</p>
              <Link to="/privacy" className="fw-privacy-link">
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Column 2: SHOP */}
          <div className="fw-col fw-nav-col">
            <h4 className="fw-col-title">Shop</h4>
            <ul className="fw-link-list">
              <li><Link to="/all-products">All Products</Link></li>
              <li><Link to="/#new-arrivals">New Arrivals</Link></li>
              <li><Link to="/#best-sellers">Best Sellers</Link></li>
            </ul>
          </div>

          {/* Column 3: ABOUT */}
          <div className="fw-col fw-nav-col">
            <h4 className="fw-col-title">About</h4>
            <ul className="fw-link-list">
              <li><a href="/#about">About Us</a></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Column 4: FOLLOW */}
          <div className="fw-col fw-nav-col fw-follow-col">
            <h4 className="fw-col-title">Follow</h4>
            <ul className="fw-link-list">
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer">X / Twitter</a></li>
            </ul>
          </div>

          {/* Column 5: Newsletter */}
          <div className="fw-col fw-newsletter-col">
            <h4 className="fw-col-title">Newsletter</h4>
            <p className="fw-newsletter-desc">
              Subscribe to receive updates, exclusive launches & offers.
            </p>

            <form className="fw-subscribe-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                className="fw-subscribe-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <SplitButton
                type="submit"
                text={subscribed ? 'Subscribed!' : 'Subscribe'}
              />
            </form>
          </div>

        </div>

        {/* Mobile / Tablet Bottom Bar */}
        <div className="fw-mobile-bottom-bar">
          <p className="fw-copy">&copy; {new Date().getFullYear()} FAYWALK</p>
          <Link to="/privacy" className="fw-privacy-link">
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* Giant Bottom Watermark */}
      <div className="fw-giant-watermark" aria-hidden="true">
        FAYWALKVIBEE
      </div>
    </footer>
  );
};

export default SiteFooter;
