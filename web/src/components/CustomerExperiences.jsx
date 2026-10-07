import React from 'react';
import { FaTwitter, FaFacebookF, FaInstagram, FaStar } from 'react-icons/fa';
import './CustomerExperiences.css';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'From Ashik',
    title: 'Loved the product!',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua quis nostrud exercitation ullamcoLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do',
    rating: '4.7',
    stars: 5,
  },
  {
    id: 2,
    name: 'Ilangovan',
    title: 'Loved the product!',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua quis nostrud exercitation ullamcoLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do',
    rating: '4.8',
    stars: 5,
  },
  {
    id: 3,
    name: 'From Sneha Patel',
    title: 'Super comfortable fit!',
    text: 'The fabric softness and breathable feel exceeded all expectations. Perfect for everyday wear, holding up amazingly even after multiple washes.',
    rating: '4.9',
    stars: 5,
  },
  {
    id: 4,
    name: 'From Vignesh',
    title: 'Outstanding quality!',
    text: 'Unmatched comfort and modern cut. The seams are smooth under clothing and the support is fantastic. Will definitely be ordering more soon.',
    rating: '4.7',
    stars: 5,
  },
  {
    id: 5,
    name: 'From Ananya Reddy',
    title: 'Pure everyday luxury',
    text: 'Loved the product! So lightweight and gentle on the skin. You barely feel it on, and the premium quality shows in every detail.',
    rating: '5.0',
    stars: 5,
  },
  {
    id: 6,
    name: 'From Rahul Verma',
    title: 'Loved the product!',
    text: 'Exceptional craftsmanship and sleek look. Delivered quickly in pristine packaging. Best apparel purchase I have made this season.',
    rating: '4.8',
    stars: 5,
  },
];

const RealExperience = () => {
  // Duplicate list to create a seamless infinite loop
  const loopItems = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="testimonials-section" aria-label="Customer Testimonials">
      <div className="testimonials-heading-container">
        <h2 className="testimonials-heading">CUSTOMER TESTIMONIALS</h2>
      </div>

      <div className="testimonials-scroll-container">
        <div className="testimonials-track">
          {loopItems.map((item, idx) => (
            <div className="testimonial-card" key={`${item.id}-${idx}`}>
              <div className="testimonial-header">
                <h3 className="testimonial-author">{item.name}</h3>
              </div>

              <div className="testimonial-quote-wrapper">
                <svg
                  className="testimonial-quote-icon"
                  width="36"
                  height="26"
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