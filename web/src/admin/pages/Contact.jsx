import React, { useState } from "react";
import "./Contact.css";

const Contact = () => {
  const [business, setBusiness] = useState({
    businessName: "",
    gstNumber: "",
    supportEmail: "",
    supportPhone: "",
    businessAddress: "",
    city: "",
    gstState: "",
    pinCode: "",
    country: "",
  });

  const [social, setSocial] = useState({
    instagram: "",
    facebook: "",
    whatsapp: "",
    youtube: "",
  });

  const handleBusinessChange = (e) => {
    setBusiness((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSocialChange = (e) => {
    setSocial((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="contact">
      <div className="contact__header">
        <h1 className="contact__title">Settings</h1>
        <p className="contact__subtitle">Contact</p>
      </div>

      {/* Business Info Card */}
      <div className="contact__card">
        <div className="contact__grid contact__grid--2col">
          <div className="contact__field">
            <label className="contact__label">Business name (legal)</label>
            <input
              type="text"
              name="businessName"
              className="contact__input"
              placeholder="Input your text"
              value={business.businessName}
              onChange={handleBusinessChange}
            />
          </div>

          <div className="contact__field">
            <label className="contact__label">GST number</label>
            <div className="contact__select-wrapper">
              <select
                name="gstNumber"
                className="contact__select"
                value={business.gstNumber}
                onChange={handleBusinessChange}
              >
                <option value="">Input your text</option>
              </select>
            </div>
          </div>

          <div className="contact__field">
            <label className="contact__label">Support email</label>
            <div className="contact__select-wrapper">
              <select
                name="supportEmail"
                className="contact__select"
                value={business.supportEmail}
                onChange={handleBusinessChange}
              >
                <option value="">Input your text</option>
              </select>
            </div>
          </div>

          <div className="contact__field">
            <label className="contact__label">Support phone</label>
            <div className="contact__select-wrapper">
              <select
                name="supportPhone"
                className="contact__select"
                value={business.supportPhone}
                onChange={handleBusinessChange}
              >
                <option value="">Input your text</option>
              </select>
            </div>
          </div>
        </div>

        <div className="contact__field contact__field--full">
          <label className="contact__label">Business address</label>
          <textarea
            name="businessAddress"
            className="contact__textarea"
            placeholder="Enter Descriptive"
            value={business.businessAddress}
            onChange={handleBusinessChange}
          />
        </div>

        <div className="contact__grid contact__grid--2col">
          <div className="contact__field">
            <label className="contact__label">City</label>
            <input
              type="text"
              name="city"
              className="contact__input"
              placeholder="Input your text"
              value={business.city}
              onChange={handleBusinessChange}
            />
          </div>

          <div className="contact__field">
            <label className="contact__label">GST number</label>
            <div className="contact__select-wrapper">
              <select
                name="gstState"
                className="contact__select"
                value={business.gstState}
                onChange={handleBusinessChange}
              >
                <option value="">Input your text</option>
              </select>
            </div>
          </div>

          <div className="contact__field">
            <label className="contact__label">PIN code</label>
            <input
              type="text"
              name="pinCode"
              className="contact__input"
              placeholder="Input your text"
              value={business.pinCode}
              onChange={handleBusinessChange}
            />
          </div>

          <div className="contact__field">
            <label className="contact__label">Country</label>
            <div className="contact__select-wrapper">
              <select
                name="country"
                className="contact__select"
                value={business.country}
                onChange={handleBusinessChange}
              >
                <option value="">Input your text</option>
              </select>
            </div>
          </div>
        </div>

        <div className="contact__actions">
          <button className="contact__save-btn">Save Changes</button>
        </div>
      </div>

      {/* Social Links Card */}
      <div className="contact__card">
        <h2 className="contact__section-title">Social Links</h2>

        <div className="contact__grid contact__grid--2col">
          <div className="contact__field">
            <label className="contact__label">Instagram</label>
            <input
              type="text"
              name="instagram"
              className="contact__input"
              placeholder="Input your text"
              value={social.instagram}
              onChange={handleSocialChange}
            />
          </div>

          <div className="contact__field">
            <label className="contact__label">Facebook</label>
            <input
              type="text"
              name="facebook"
              className="contact__input"
              placeholder="Input your text"
              value={social.facebook}
              onChange={handleSocialChange}
            />
          </div>

          <div className="contact__field">
            <label className="contact__label">WhatsApp business</label>
            <input
              type="text"
              name="whatsapp"
              className="contact__input"
              placeholder="Input your text"
              value={social.whatsapp}
              onChange={handleSocialChange}
            />
          </div>

          <div className="contact__field">
            <label className="contact__label">YouTube (optional)</label>
            <input
              type="text"
              name="youtube"
              className="contact__input"
              placeholder="Input your text"
              value={social.youtube}
              onChange={handleSocialChange}
            />
          </div>
        </div>

        <div className="contact__actions">
          <button className="contact__save-btn">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default Contact;