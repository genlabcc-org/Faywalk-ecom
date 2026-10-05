import React, { useState } from "react";
import "./Shipping.css";

const Toggle = ({ checked, onChange }) => (
  <label className="sh__toggle">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="sh__toggle-track">
      <span className="sh__toggle-thumb" />
    </span>
  </label>
);

const Shipping = () => {
  const [charges, setCharges] = useState({
    freeShippingAbove: "",
    standardCharge: "",
    expressCharge: "",
    estimatedDelivery: "",
  });

  const [visibility, setVisibility] = useState({
    panIndia: false,
    cod: false,
    international: false,
  });

  const handleChargeChange = (field, value) => {
    setCharges((prev) => ({ ...prev, [field]: value }));
  };

  const toggleVisibility = (field) => {
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="sh">
      <div className="sh__page-header">
        <h1 className="sh__page-title">Settings</h1>
        <p className="sh__page-subtitle">Shipping</p>
      </div>

      {/* Card 1 — Charges */}
      <div className="sh__card">
        <div className="sh__card-section-title">Visibility Options</div>

        <div className="sh__divider" />

        <div className="sh__field-row">
          <div className="sh__field-info">
            <span className="sh__field-label">Free shipping above</span>
            <span className="sh__field-desc">Orders above this amount get free delivery</span>
          </div>
          <div className="sh__input-group">
            <span className="sh__currency">₹</span>
            <input
              type="number"
              className="sh__input"
              value={charges.freeShippingAbove}
              onChange={(e) => handleChargeChange("freeShippingAbove", e.target.value)}
            />
          </div>
        </div>

        <div className="sh__divider" />

        <div className="sh__field-row">
          <div className="sh__field-info">
            <span className="sh__field-label">Standard shipping charge</span>
            <span className="sh__field-desc">Charged for orders below free shipping threshold</span>
          </div>
          <div className="sh__input-group">
            <span className="sh__currency">₹</span>
            <input
              type="number"
              className="sh__input"
              value={charges.standardCharge}
              onChange={(e) => handleChargeChange("standardCharge", e.target.value)}
            />
          </div>
        </div>

        <div className="sh__divider" />

        <div className="sh__field-row">
          <div className="sh__field-info">
            <span className="sh__field-label">Express shipping charge</span>
            <span className="sh__field-desc">Optional — shown as a faster delivery option</span>
          </div>
          <div className="sh__input-group">
            <span className="sh__currency">₹</span>
            <input
              type="number"
              className="sh__input"
              value={charges.expressCharge}
              onChange={(e) => handleChargeChange("expressCharge", e.target.value)}
            />
          </div>
        </div>

        <div className="sh__divider" />

        <div className="sh__field-row">
          <div className="sh__field-info">
            <span className="sh__field-label">Estimated delivery time</span>
            <span className="sh__field-desc">Shown on product and checkout pages</span>
          </div>
          <input
            type="text"
            className="sh__input sh__input--wide"
            // placeholder="e.g. 3–5 business days"
            value={charges.estimatedDelivery}
            onChange={(e) => handleChargeChange("estimatedDelivery", e.target.value)}
          />
        </div>

        <div className="sh__divider" />
      </div>

      {/* Settings label + Save Changes — between the two cards */}
      <div className="sh__save-row">
        <span className="sh__save-label">Settings</span>
        <button className="sh__save-btn">Save Changes</button>
      </div>

      {/* Card 2 — Visibility toggles */}
      <div className="sh__card">
        <div className="sh__card-section-title">Visibility Options</div>

        <div className="sh__divider" />

        <div className="sh__toggle-row">
          <div className="sh__field-info">
            <span className="sh__field-label">Pan-india delivery</span>
            <span className="sh__field-desc">Ship to all states and union territories</span>
          </div>
          <Toggle checked={visibility.panIndia} onChange={() => toggleVisibility("panIndia")} />
        </div>

        <div className="sh__divider" />

        <div className="sh__toggle-row">
          <div className="sh__field-info">
            <span className="sh__field-label">Cash on delivery (COD)</span>
            <span className="sh__field-desc">Allow customers to pay on delivery</span>
          </div>
          <Toggle checked={visibility.cod} onChange={() => toggleVisibility("cod")} />
        </div>

        <div className="sh__divider" />

        <div className="sh__toggle-row">
          <div className="sh__field-info">
            <span className="sh__field-label">International shipping</span>
            <span className="sh__field-desc">Not available yet — coming in Scope 2</span>
          </div>
          <Toggle checked={visibility.international} onChange={() => toggleVisibility("international")} />
        </div>
      </div>
    </div>
  );
};

export default Shipping;