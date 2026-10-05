import React, { useState } from "react";
import "./Payment.css";

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    className={`pay__toggle${checked ? " pay__toggle--on" : ""}`}
    onClick={() => onChange(!checked)}
    aria-checked={checked}
    role="switch"
  >
    <span className="pay__toggle-thumb" />
  </button>
);

const Payment = () => {
  const [visibility, setVisibility] = useState({
    upi: false,
    card: false,
    netbanking: false,
    cod: false,
    emi: false,
  });

  const [productName, setProductName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [footerNote, setFooterNote] = useState("");

  const toggle = (key) =>
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="pay">
      <div className="pay__page-title-wrapper">
        <h1 className="pay__page-title">Settings</h1>
        <p className="pay__page-subtitle">Payment methods</p>
      </div>

      {/* Razorpay Configuration */}
      <div className="pay__card">
        <h2 className="pay__card-title">Razorpay configuration</h2>
        <div className="pay__config-grid">
          <div className="pay__config-row">
            <span className="pay__config-label">Integration status</span>
            <span className="pay__badge pay__badge--connected">Connected</span>
          </div>
          <div className="pay__config-row">
            <span className="pay__config-label">Merchant ID</span>
            <span className="pay__config-value">rzp_live_AJW9X4TK22</span>
          </div>
          <div className="pay__config-row">
            <span className="pay__config-label">Account name</span>
            <span className="pay__config-value">Anika Creations Pvt. Ltd.</span>
          </div>
          <div className="pay__config-row">
            <span className="pay__config-label">Settlement cycle</span>
            <span className="pay__config-value">T+2 business days</span>
          </div>
          <div className="pay__config-row">
            <span className="pay__config-label">Mode</span>
            <span className="pay__badge pay__badge--live">Live</span>
          </div>
        </div>
        <div className="pay__config-actions">
          <button className="pay__btn pay__btn--dark">Update API Keys</button>
          <button className="pay__btn pay__btn--dark">Test Connections</button>
        </div>
      </div>

      {/* Visibility Options */}
      <div className="pay__card">
        <h2 className="pay__card-title">Visibility Options</h2>
        <div className="pay__visibility-list">
          <div className="pay__visibility-item">
            <div className="pay__visibility-info">
              <span className="pay__visibility-name">UPI (GPay, PhonePe, Paytm)</span>
              <span className="pay__visibility-sub">Most popular — recommended to keep on</span>
            </div>
            <ToggleSwitch checked={visibility.upi} onChange={() => toggle("upi")} />
          </div>
          <div className="pay__visibility-item">
            <div className="pay__visibility-info">
              <span className="pay__visibility-name">Debit &amp; credit cards</span>
              <span className="pay__visibility-sub">Visa, Mastercard, Rupay</span>
            </div>
            <ToggleSwitch checked={visibility.card} onChange={() => toggle("card")} />
          </div>
          <div className="pay__visibility-item">
            <div className="pay__visibility-info">
              <span className="pay__visibility-name">Net banking</span>
              <span className="pay__visibility-sub">All major Indian banks supported via Razorpay</span>
            </div>
            <ToggleSwitch checked={visibility.netbanking} onChange={() => toggle("netbanking")} />
          </div>
          <div className="pay__visibility-item">
            <div className="pay__visibility-info">
              <span className="pay__visibility-name">Cash on delivery (COD)</span>
              <span className="pay__visibility-sub">Controlled from Shipping settings as well</span>
            </div>
            <ToggleSwitch checked={visibility.cod} onChange={() => toggle("cod")} />
          </div>
          <div className="pay__visibility-item">
            <div className="pay__visibility-info">
              <span className="pay__visibility-name">EMI / Buy now pay later</span>
              <span className="pay__visibility-sub">Via Razorpay — requires separate activation</span>
            </div>
            <ToggleSwitch checked={visibility.emi} onChange={() => toggle("emi")} />
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="pay__card">
        <h2 className="pay__card-title">Invoice Settings</h2>
        <div className="pay__invoice-grid">
          <div className="pay__field">
            <label className="pay__label">Product Name</label>
            <input
              type="text"
              className="pay__input"
              placeholder="Input your text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <span className="pay__hint">e.g. AJW-INV-0042</span>
          </div>
          <div className="pay__field">
            <label className="pay__label">Starting invoice number</label>
            <div className="pay__select-wrapper">
              <select
                className="pay__select"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              >
                <option value="">Input your text</option>
                <option value="1">0001</option>
                <option value="100">0100</option>
                <option value="1000">1000</option>
              </select>
              <svg className="pay__select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>
        <div className="pay__field pay__field--full">
          <label className="pay__label">Invoice footer note</label>
          <textarea
            className="pay__textarea"
            placeholder="Thank you for shopping with Anika Jewels. All sales are final unless damaged on delivery."
            value={footerNote}
            onChange={(e) => setFooterNote(e.target.value)}
            rows={3}
          />
        </div>
        <div className="pay__save-row">
          <button className="pay__btn pay__btn--save">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default Payment;