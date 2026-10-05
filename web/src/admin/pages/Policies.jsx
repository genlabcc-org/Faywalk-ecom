import React, { useState } from "react";
import "./Policies.css";

const policies = [
  {
    key: "return",
    label: "Return & refund policy",
    placeholder: "Enter your return and refund policy details...",
  },
  {
    key: "shipping",
    label: "Shipping policy",
    placeholder: "Enter your shipping policy details...",
  },
  {
    key: "privacy",
    label: "Privacy policy",
    placeholder: "Enter your privacy policy details...",
  },
];

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Policies = () => {
  const [values, setValues]   = useState({ return: "", shipping: "", privacy: "" });
  const [saved, setSaved]     = useState({});
  const [loading, setLoading] = useState({});

  const handleSave = (key) => {
    setLoading((p) => ({ ...p, [key]: true }));
    setTimeout(() => {
      setLoading((p) => ({ ...p, [key]: false }));
      setSaved((p) => ({ ...p, [key]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2200);
    }, 800);
  };

  return (
    <div className="pol">
      <div className="pol__header">
        <h1 className="pol__title">Settings</h1>
        <p className="pol__subtitle">Policies</p>
      </div>

      <div className="pol__body">
        <div className="pol__card">
          {policies.map((p, index) => (
            <div
              key={p.key}
              className={`pol__section${index < policies.length - 1 ? " pol__section--divider" : ""}`}
            >
              <div className="pol__card-label">{p.label}</div>

              <textarea
                className="pol__textarea"
                placeholder={p.placeholder}
                value={values[p.key]}
                rows={5}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                }
              />

              <div className="pol__card-footer">
                <button
                  className={[
                    "pol__save-btn",
                    saved[p.key]   ? "pol__save-btn--saved"   : "",
                    loading[p.key] ? "pol__save-btn--loading" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSave(p.key)}
                  disabled={loading[p.key]}
                >
                  {loading[p.key] ? (
                    <span className="pol__spinner" />
                  ) : saved[p.key] ? (
                    <>
                      <CheckIcon />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save Policy</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Policies;