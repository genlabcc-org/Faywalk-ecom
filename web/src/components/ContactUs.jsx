import React, { useState } from 'react';
import { FaWhatsapp, FaFacebook, FaInstagram } from 'react-icons/fa';
import { emailService } from '../services/emailService';
import './ContactUs.css';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (status.type) {
      setStatus({ type: null, message: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setStatus({ type: null, message: '' });
    setIsSubmitting(true);

    try {
      const res = await emailService.sendContactUsEmail(formData);
      if (res.success) {
        setStatus({
          type: 'success',
          message: 'Thank you! Your message has been sent successfully. We will get back to you soon.',
        });
        setFormData({ firstName: '', lastName: '', phone: '', email: '', message: '' });
      } else {
        setStatus({
          type: 'error',
          message: res.error || 'Unable to send your message at this time. Please try again.',
        });
      }
    } catch (err) {
      console.error('Failed to submit contact form:', err);
      setStatus({
        type: 'error',
        message: 'Something went wrong while sending your message. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="contactus-section" id="contact" aria-label="Contact Us">
      {/* ── Heading ── */}
      <div className="contactus-heading-wrap">
        <h2 className="contactus-heading">Contact Us</h2>
        <p className="contactus-subtext">
          For More Information about working with Faywalk.
          <br />
          Please call us or complete the contact form below
        </p>
      </div>

      {/* ── Form ── */}
      <form className="contactus-form" onSubmit={handleSubmit} autoComplete="off">
        {status.type === 'success' && (
          <div className="contactus-alert contactus-alert--success" role="alert">
            <svg className="contactus-alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{status.message}</span>
          </div>
        )}

        {status.type === 'error' && (
          <div className="contactus-alert contactus-alert--error" role="alert">
            <svg className="contactus-alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{status.message}</span>
          </div>
        )}

        <div className="contactus-row">
          <div className="contactus-field">
            <label htmlFor="cu-firstName">First Name</label>
            <input
              id="cu-firstName"
              name="firstName"
              type="text"
              placeholder="Your First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="contactus-field">
            <label htmlFor="cu-lastName">Last Name</label>
            <input
              id="cu-lastName"
              name="lastName"
              type="text"
              placeholder="Your Last Name"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="contactus-row">
          <div className="contactus-field">
            <label htmlFor="cu-phone">Phone Number</label>
            <input
              id="cu-phone"
              name="phone"
              type="tel"
              placeholder="Your Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          <div className="contactus-field">
            <label htmlFor="cu-email">E-Mail Address</label>
            <input
              id="cu-email"
              name="email"
              type="email"
              placeholder="Your E-Mail Address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="contactus-field contactus-field--full">
          <label htmlFor="cu-message">Message</label>
          <textarea
            id="cu-message"
            name="message"
            rows="5"
            placeholder="Enter Your Message"
            value={formData.message}
            onChange={handleChange}
            required
          />
        </div>

        <div className="contactus-btn-wrap">
          <button
            type="submit"
            className={`contactus-submit-btn ${isSubmitting ? 'contactus-submit-btn--loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="contactus-btn-spinner-wrap">
                <span className="contactus-btn-spinner" />
                <span>Sending...</span>
              </span>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </form>

      {/* ── Map + Info ── */}
      <div className="contactus-bottom">
        <div className="contactus-map-wrap">
          <iframe
            title="Faywalk Location – Chettikulam, Palayamkottai"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3943.8!2d77.7595!3d8.7059!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b04125db4ccca1b%3A0x0!2zOMKwNDInMjEuMiJOIDc3wrA0NSczNS43IkU!5e0!3m2!1sen!2sin!4v1700000000000"
            width="100%"
            height="100%"
            style={{ border: 0, borderRadius: '14px' }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="contactus-info-card">
          <div className="contactus-info-block">
            <h4 className="contactus-info-label">Address</h4>
            <p className="contactus-info-value">
              Faywalk Vibe, A52 3RD Main Road, Maharajanagar,
              <br />
              Palayamkottai, Tirunelveli–627011
            </p>
          </div>

          <div className="contactus-info-block">
            <h4 className="contactus-info-label">Contact Number</h4>
            <p className="contactus-info-value">
              <a href="tel:+916379838682">+91 63798 38682</a>
            </p>
          </div>

          <div className="contactus-info-block">
            <h4 className="contactus-info-label">E-Mail</h4>
            <p className="contactus-info-value">
              <a href="mailto:faywalkvibee@gmail.com">faywalkvibee@gmail.com</a>
            </p>
          </div>

          <div className="contactus-info-block">
            <h4 className="contactus-info-label">Follow Us</h4>
            <div className="contactus-socials">
              <a
                href="https://wa.me/916379838682"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="contactus-social-icon"
              >
                <FaWhatsapp />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="contactus-social-icon"
              >
                <FaFacebook />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="contactus-social-icon"
              >
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
