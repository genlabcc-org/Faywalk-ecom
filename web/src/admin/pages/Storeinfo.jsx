import React, { useState, useRef } from "react";
import "./Storeinfo.css";

const CURRENCIES = ["USD – US Dollar", "INR – Indian Rupee", "EUR – Euro", "GBP – British Pound", "AED – UAE Dirham"];
const LANGUAGES  = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam"];
const TIMEZONES  = [
  "Asia/Kolkata (IST, UTC+5:30)",
  "America/New_York (EST, UTC−5)",
  "Europe/London (GMT, UTC+0)",
  "Asia/Dubai (GST, UTC+4)",
  "Asia/Singapore (SGT, UTC+8)",
];

const StoreInfo = () => {
  const fileInputRef = useRef(null);

  const [logo, setLogo]           = useState(null);
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline]     = useState("");
  const [storeUrl, setStoreUrl]   = useState("");
  const [currency, setCurrency]   = useState("");
  const [language, setLanguage]   = useState("");
  const [timezone, setTimezone]   = useState("");
  const [saved, setSaved]         = useState(false);
  const [errors, setErrors]       = useState({});

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const errs = {};
    if (!storeName.trim()) errs.storeName = "Store name is required.";
    if (storeUrl && !/^[a-z0-9-]+$/.test(storeUrl))
      errs.storeUrl = "Only lowercase letters, numbers, and hyphens.";
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="si">
      {/* Page header */}
      <div className="si__header">
        <h1 className="si__title">Settings</h1>
        <p className="si__sub">Store Info</p>
      </div>

      {/* ── Card 1: Logo ── */}
      <div className="si__card">
        <div className="si__logo-row">
          <div className="si__logo-preview">
            {logo
              ? <img src={logo} alt="Store logo" className="si__logo-img" />
              : <div className="si__logo-placeholder" />}
          </div>
          <div className="si__logo-meta">
            <p className="si__logo-label">Store Logo</p>
            <p className="si__logo-hint">PNG or SVG · Recommended 200×200px · Max 1MB</p>
            <div className="si__logo-actions">
              <button className="si__btn si__btn--upload" onClick={() => fileInputRef.current?.click()}>
                Upload
              </button>
              <button className="si__btn si__btn--remove" onClick={handleRemove} disabled={!logo}>
                Remove
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml"
              className="si__file-input"
              onChange={handleUpload}
            />
          </div>
        </div>
      </div>

      {/* ── Card 2: Form ── */}
      <div className="si__card si__card--form">
        <div className="si__form">
          {/* Store Name */}
          <div className="si__field si__field--full">
            <label className="si__label" htmlFor="si-name">Store Name</label>
            <input
              id="si-name"
              type="text"
              className={`si__input${errors.storeName ? " si__input--error" : ""}`}
              placeholder="Input your text"
              value={storeName}
              onChange={(e) => { setStoreName(e.target.value); setErrors((p) => ({ ...p, storeName: undefined })); }}
            />
            {errors.storeName && <span className="si__error">{errors.storeName}</span>}
          </div>

          {/* Store Tagline */}
          <div className="si__field si__field--full">
            <label className="si__label" htmlFor="si-tagline">Store tagline</label>
            <input
              id="si-tagline"
              type="text"
              className="si__input"
              placeholder="Input your text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          {/* Store URL + Currency */}
          <div className="si__row">
            <div className="si__field">
              <label className="si__label" htmlFor="si-url">Store URL / slug</label>
              <input
                id="si-url"
                type="text"
                className={`si__input${errors.storeUrl ? " si__input--error" : ""}`}
                placeholder="Input your text"
                value={storeUrl}
                onChange={(e) => { setStoreUrl(e.target.value); setErrors((p) => ({ ...p, storeUrl: undefined })); }}
              />
              {errors.storeUrl && <span className="si__error">{errors.storeUrl}</span>}
            </div>
            <div className="si__field">
              <label className="si__label" htmlFor="si-currency">Currency</label>
              <select id="si-currency" className="si__select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="">Input your text</option>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Language + Timezone */}
          <div className="si__row">
            <div className="si__field">
              <label className="si__label" htmlFor="si-lang">Language</label>
              <select id="si-lang" className="si__select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="">Input your text</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="si__field">
              <label className="si__label" htmlFor="si-tz">Timezone</label>
              <select id="si-tz" className="si__select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="">Input your text</option>
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="si__footer">
          <button
            className={`si__save-btn${saved ? " si__save-btn--saved" : ""}`}
            onClick={handleSave}
          >
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreInfo;