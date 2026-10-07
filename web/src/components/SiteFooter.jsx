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

            <div className="fw-brand-bottom">
              <p className="fw-copy">&copy; {new Date().getFullYear()} FAYWALK</p>
              <Link to="/Privacy" className="fw-privacy-link">
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Column 2: SHOP */}
          <div className="fw-col">
            <h4 className="fw-col-title">Shop</h4>
            <ul className="fw-link-list">
              <li><Link to="/category/new-arrivals">New Arrivals</Link></li>
              <li><Link to="/category/male">Men</Link></li>
              <li><Link to="/category/female">Women</Link></li>
              <li><Link to="/category/best-sellers">Best Sellers</Link></li>
            </ul>
          </div>

          {/* Column 3: ABOUT */}
          <div className="fw-col">
            <h4 className="fw-col-title">About</h4>
            <ul className="fw-link-list">
              <li><a href="/#about">ABOUT</a></li>
              <li><Link to="/contact">CONTACT</Link></li>
              <li><Link to="/category/best-sellers">BLOG</Link></li>
              <li><Link to="/Privacy">404</Link></li>
            </ul>
          </div>

          {/* Column 4: FOLLOW */}
          <div className="fw-col">
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
      </div>

      {/* Giant Bottom Watermark */}
      <div className="fw-giant-watermark" aria-hidden="true">
        FAYWALKVIBEE
      </div>
    </footer>
  );
};

export default SiteFooter;
