import React, { useEffect, useRef, useState } from 'react';
import { FaWhatsapp, FaFacebook, FaInstagram } from 'react-icons/fa';
import { emailService } from '../services/emailService';
import './ContactUs.css';

const countryCallingCodes = [
  { country: 'India', code: '+91', iso: 'IN' },
  { country: 'United States', code: '+1', iso: 'US' },
  { country: 'United Kingdom', code: '+44', iso: 'GB' },
  { country: 'Canada', code: '+1', iso: 'CA' },
  { country: 'Australia', code: '+61', iso: 'AU' },
  { country: 'New Zealand', code: '+64', iso: 'NZ' },
  { country: 'United Arab Emirates', code: '+971', iso: 'AE' },
  { country: 'Saudi Arabia', code: '+966', iso: 'SA' },
  { country: 'Singapore', code: '+65', iso: 'SG' },
  { country: 'Malaysia', code: '+60', iso: 'MY' },
  { country: 'Indonesia', code: '+62', iso: 'ID' },
  { country: 'Japan', code: '+81', iso: 'JP' },
  { country: 'China', code: '+86', iso: 'CN' },
  { country: 'Hong Kong', code: '+852', iso: 'HK' },
  { country: 'Pakistan', code: '+92', iso: 'PK' },
  { country: 'Bangladesh', code: '+880', iso: 'BD' },
  { country: 'Sri Lanka', code: '+94', iso: 'LK' },
  { country: 'Nepal', code: '+977', iso: 'NP' },
  { country: 'Qatar', code: '+974', iso: 'QA' },
  { country: 'Kuwait', code: '+965', iso: 'KW' },
  { country: 'Oman', code: '+968', iso: 'OM' },
  { country: 'Bahrain', code: '+973', iso: 'BH' },
  { country: 'South Africa', code: '+27', iso: 'ZA' },
  { country: 'Nigeria', code: '+234', iso: 'NG' },
  { country: 'Kenya', code: '+254', iso: 'KE' },
  { country: 'Germany', code: '+49', iso: 'DE' },
  { country: 'France', code: '+33', iso: 'FR' },
  { country: 'Italy', code: '+39', iso: 'IT' },
  { country: 'Spain', code: '+34', iso: 'ES' },
  { country: 'Netherlands', code: '+31', iso: 'NL' },
  { country: 'Switzerland', code: '+41', iso: 'CH' },
  { country: 'Sweden', code: '+46', iso: 'SE' },
  { country: 'Norway', code: '+47', iso: 'NO' },
  { country: 'Denmark', code: '+45', iso: 'DK' },
  { country: 'Ireland', code: '+353', iso: 'IE' },
  { country: 'Portugal', code: '+351', iso: 'PT' },
  { country: 'Brazil', code: '+55', iso: 'BR' },
  { country: 'Mexico', code: '+52', iso: 'MX' },
  { country: 'Argentina', code: '+54', iso: 'AR' },
  { country: 'Turkey', code: '+90', iso: 'TR' },
  { country: 'Israel', code: '+972', iso: 'IL' },
  { country: 'Thailand', code: '+66', iso: 'TH' },
  { country: 'Philippines', code: '+63', iso: 'PH' },
  { country: 'Vietnam', code: '+84', iso: 'VN' },
  { country: 'South Korea', code: '+82', iso: 'KR' },
  { country: 'Russia', code: '+7', iso: 'RU' },
  { country: 'Egypt', code: '+20', iso: 'EG' },
  { country: 'Venezuela', code: '+58', iso: 'VE' },
];

const getCountryFlag = (iso) =>
  String.fromCodePoint(...iso.toUpperCase().split('').map((letter) => 127397 + letter.charCodeAt(0)));

const ContactUs = () => {
  const [phoneCountry, setPhoneCountry] = useState('India');
  const [isCountryListOpen, setIsCountryListOpen] = useState(false);
  const countrySelectorRef = useRef(null);
  const sortedCountries = [...countryCallingCodes].sort((a, b) => a.country.localeCompare(b.country));
  const phoneCountryCode = countryCallingCodes.find(({ country }) => country === phoneCountry).code;
  const selectedCountry = countryCallingCodes.find(({ country }) => country === phoneCountry);
  const maxPhoneDigits = phoneCountry === 'India'
    ? 10
    : 15 - phoneCountryCode.replace(/\D/g, '').length;
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!countrySelectorRef.current?.contains(event.target)) {
        setIsCountryListOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsCountryListOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'firstName' || name === 'lastName') {
      value = value.replace(/[^\p{L}\p{M} ]/gu, '').replace(/^\s+/, '').slice(0, 50);
    } else if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, maxPhoneDigits);
    } else if (name === 'email') {
      value = value.replace(/[^a-zA-Z0-9@.]/g, '');
      const firstAtIndex = value.indexOf('@');
      if (firstAtIndex >= 0) {
        value = value.slice(0, firstAtIndex + 1) + value.slice(firstAtIndex + 1).replace(/@/g, '');
      }
      value = value.slice(0, 254);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const res = await emailService.sendContactUsEmail({
        ...formData,
        phone: `${phoneCountryCode}${formData.phone}`,
      });
      if (res.success) {
        setStatus({
          type: 'success',
          message: 'Thank you! Your message has been sent successfully. We will get back to you soon.',
        });
        setPhoneCountry('India');
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
              maxLength={50}
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
              maxLength={50}
              required
            />
          </div>
        </div>

        <div className="contactus-row">
          <div className="contactus-field">
            <label htmlFor="cu-phone">Phone Number</label>
            <div
              className={`contactus-phone-input${isCountryListOpen ? ' contactus-phone-input--open' : ''}`}
              ref={countrySelectorRef}
            >
              <button
                type="button"
                className="contactus-country-toggle"
                aria-label={`Select country, current country ${selectedCountry.country} (${selectedCountry.code})`}
                aria-haspopup="listbox"
                aria-expanded={isCountryListOpen}
                onClick={() => setIsCountryListOpen((open) => !open)}
              >
                <span className="contactus-selected-country-code">{selectedCountry.code}</span>
                <span className="contactus-country-chevron" aria-hidden="true" />
              </button>
              {isCountryListOpen && (
                <div className="contactus-country-list" role="listbox" aria-label="Country calling codes">
                  {sortedCountries.map(({ country, code, iso }) => (
                    <button
                      type="button"
                      key={country}
                      className="contactus-country-option"
                      role="option"
                      aria-selected={phoneCountry === country}
                      onClick={() => {
                        setPhoneCountry(country);
                        setIsCountryListOpen(false);
                        const maxDigits = country === 'India'
                          ? 10
                          : 15 - code.replace(/\D/g, '').length;
                        setFormData((prev) => ({
                          ...prev,
                          phone: prev.phone.slice(0, maxDigits),
                        }));
                      }}
                    >
                      <span className="contactus-country-flag" aria-hidden="true">{getCountryFlag(iso)}</span>
                      <span className="contactus-country-name">{country}</span>
                      <span className="contactus-country-code">{code}</span>
                    </button>
                  ))}
                </div>
              )}
              <span className="contactus-phone-divider" aria-hidden="true" />
              <input
                id="cu-phone"
                name="phone"
                type="tel"
                placeholder="Your Phone Number"
                value={formData.phone}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={maxPhoneDigits}
                pattern={phoneCountry === 'India' ? '[0-9]{10}' : `[0-9]{4,${maxPhoneDigits}}`}
                required
              />
            </div>
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
              maxLength={254}
              pattern="[A-Za-z0-9]+([.][A-Za-z0-9]+)*@[A-Za-z0-9]+([.][A-Za-z0-9]+)+"
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
