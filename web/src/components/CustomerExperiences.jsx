import React, { useState, useRef } from 'react';
import { FaTwitter, FaFacebookF, FaInstagram, FaStar } from 'react-icons/fa';
import './CustomerExperiences.css';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Ashik R.',
    title: 'Best everyday comfort!',
    text: 'The breathable cotton fabric is a game changer for daily wear. The waistband does not roll down or leave any marks even after a long workday. Truly impressed with Faywalk\'s quality!',
    rating: '4.9',
    stars: 5,
  },
  {
    id: 2,
    name: 'Ilangovan M.',
    title: 'Unbelievable softness & fit',
    text: 'Hands down the softest innerwear I have purchased online. The stitching is seamless, fits true to size, and holds its exact shape even after several machine washes.',
    rating: '4.8',
    stars: 5,
  },
  {
    id: 3,
    name: 'Sneha Patel',
    title: 'Super comfortable & lightweight',
    text: 'The fabric softness and breathable feel exceeded all expectations. It feels completely weightless under clothing and provides great all-day support with zero irritation.',
    rating: '4.9',
    stars: 5,
  },
  {
    id: 4,
    name: 'Vignesh K.',
    title: 'Outstanding fabric & durability',
    text: 'Smooth seams, premium stretch, and sweat-wicking comfort that works wonderfully even in humid weather. Prompt delivery and neat packaging too.',
    rating: '5.0',
    stars: 5,
  },
  {
    id: 5,
    name: 'Ananya Reddy',
    title: 'Pure everyday luxury',
    text: 'Gentle on sensitive skin and ultra-lightweight. You barely feel it on, and the premium quality shows in every single detail. Definitely my go-to brand now.',
    rating: '4.9',
    stars: 5,
  },
  {
    id: 6,
    name: 'Rahul Verma',
    title: 'Worth every rupee!',
    text: 'Replaced my old brand with Faywalk after trying my first order. The fit, comfort, and fabric longevity are miles ahead of other brands in this price range.',
    rating: '4.8',
    stars: 5,
  },
  {
    id: 7,
    name: 'Pooja Sharma',
    title: 'Breathable & perfectly tailored',
    text: 'Ordered the comfort collection and love how snug yet non-restrictive the fit is. The fabric stays soft and colors remain vibrant without fading.',
    rating: '5.0',
    stars: 5,
  },
  {
    id: 8,
    name: 'Karthik Sundaram',
    title: 'Exceptional quality & fast shipping',
    text: 'Ordered a combo pack and was blown away by the fabric hand-feel. Excellent elasticity, zero chafing, and quick delivery. Highly recommended!',
    rating: '4.9',
    stars: 5,
  },
];

const RealExperience = () => {
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimerRef = useRef(null);

  const handleTouchStart = () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    setIsPaused(true);
  };

  const handleTouchEnd = () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2000);
  };

  // Duplicate list to create a seamless infinite loop
  const loopItems = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="testimonials-section" aria-label="Customer Testimonials">
      <div className="testimonials-heading-container">
        <h2 className="testimonials-heading">CUSTOMER TESTIMONIALS</h2>
      </div>

      <div className="testimonials-scroll-container">
        <div
          className={`testimonials-track ${isPaused ? 'is-paused' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {loopItems.map((item, idx) => (
            <div className="testimonial-card" key={`${item.id}-${idx}`}>
              <div className="testimonial-header">
                <h3 className="testimonial-author">{item.name}</h3>
              </div>

              <div className="testimonial-quote-wrapper">
                <svg
                  className="testimonial-quote-icon"
                  viewBox="0 0 32 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M0 14.4C0 6.4 5.12 1.2 12.4 0L14 3.2C9.6 4.4 7.2 7.2 6.8 10.8H13.6V24H0V14.4ZM18.4 14.4C18.4 6.4 23.52 1.2 30.8 0L32.4 3.2C28 4.4 25.6 7.2 25.2 10.8H32V24H18.4V14.4Z"
                    fill="#2563EB"
                  />
                </svg>
              </div>

              <h4 className="testimonial-card-title">{item.title}</h4>

              <p className="testimonial-card-text">{item.text}</p>

              <div className="testimonial-card-footer">
                <div className="testimonial-socials">
                  <a
                    href="#twitter"
                    aria-label="Twitter"
                    className="testimonial-social-btn"
                    onClick={(e) => e.preventDefault()}
                  >
                    <FaTwitter />
                  </a>
                  <a
                    href="#facebook"
                    aria-label="Facebook"
                    className="testimonial-social-btn"
                    onClick={(e) => e.preventDefault()}
                  >
                    <FaFacebookF />
                  </a>
                  <a
                    href="#instagram"
                    aria-label="Instagram"
                    className="testimonial-social-btn"
                    onClick={(e) => e.preventDefault()}
                  >
                    <FaInstagram />
                  </a>
                </div>

                <div className="testimonial-rating">
                  <span className="rating-score">{item.rating}</span>
                  <div className="rating-stars">
                    {[...Array(item.stars)].map((_, sIdx) => (
                      <FaStar key={sIdx} className="star-icon" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RealExperience;