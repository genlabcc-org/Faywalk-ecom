import React, { useState, useEffect } from "react";
import { topbarService } from "../../services/topbarService";
import { useStore } from "../../hooks/useStore";
import "./TopBarSettings.css";

const PRESETS = [
  "Diwali Sale - Everything Is Off By 50%",
  "Free Express Shipping on all prepaid orders!",
  "Flat 20% OFF on your first purchase — Use code FIRST20",
  "Mega Clearance Sale: Up to 70% Off on Selected Styles",
  "Festival Special Offers Live Now — Limited Time Only!",
];

export default function TopBarSettings() {
  const storeTopbarData = useStore((s) => s.topbarData);
  const setTopBarData = useStore((s) => s.setTopBarData);

  const [topbarId, setTopbarId] = useState(null);
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load existing TopBar data from DB
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await topbarService.getTopBar();
        if (isMounted) {
          if (data) {
            setTopbarId(data.id || null);
            setText(data.text || "");
            setIsActive(data.is_active !== false);
            setTopBarData(data);
          } else {
            // Default initial state
            setText("Diwali Sale - Everything Is Off By 50%");
            setIsActive(true);
          }
        }
      } catch (err) {
        console.error("Failed to load topbar:", err);
        if (isMounted) {
          setErrorMessage("Failed to load topbar settings from database.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [setTopBarData]);

  const handleApplyPreset = (presetText) => {
    setText(presetText);
  };

  const handleReset = () => {
    if (storeTopbarData) {
      setText(storeTopbarData.text || "");
      setIsActive(storeTopbarData.is_active !== false);
    }
    setErrorMessage("");
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!text.trim() && isActive) {
      setErrorMessage("Announcement text cannot be empty when TopBar is enabled.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const payload = {
        id: topbarId,
        text: text.trim(),
        link_url: "/products",
        is_active: isActive,
      };

      const result = await topbarService.saveTopBar(payload);

      if (result) {
        setTopbarId(result.id);
        setTopBarData(result);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving topbar:", err);
      setErrorMessage(err.message || "Failed to save TopBar text in database.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tbs-container">
      {/* Page Header */}
      <div className="tbs-header">
        <div>
          <h1 className="tbs-title">TopBar Announcement</h1>
          <p className="tbs-subtitle">
            Configure the announcement text and visibility. Clicking the topbar banner redirects customers directly to the All Products page.
          </p>
        </div>

        <div className="tbs-header-status">
          <span
            className={`tbs-status-badge ${
              isActive ? "tbs-status-badge--active" : "tbs-status-badge--inactive"
            }`}
          >
            <span className="tbs-status-dot" />
            {isActive ? "Currently Live" : "Hidden from Store"}
          </span>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="tbs-preview-card">
        <div className="tbs-preview-header">
          <div className="tbs-preview-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Live Storefront Preview
          </div>
          <span className="tbs-preview-tag">
            Redirects to: <strong>/products</strong>
          </span>
        </div>

        <div className={`tbs-live-bar ${!isActive ? "tbs-live-bar--disabled" : ""}`}>
          <div className="tbs-live-bar-content">
            <span className="tbs-live-bar-text">
              {text.trim() || "(Empty announcement text)"}
            </span>
          </div>
        </div>

        {!isActive && (
          <div className="tbs-preview-overlay-notice">
            ⚠️ TopBar is currently turned off and will not appear on customer-facing pages.
          </div>
        )}
      </div>

      {/* Form Settings Card */}
      <div className="tbs-form-card">
        {loading ? (
          <div className="tbs-loading-state">
            <div className="tbs-spinner" />
            <p>Loading TopBar settings from database...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="tbs-form">
            {/* Active Toggle */}
            <div className="tbs-toggle-section">
              <div className="tbs-toggle-info">
                <label className="tbs-toggle-label" htmlFor="tbs-active-toggle">
                  Enable TopBar Banner
                </label>
                <p className="tbs-toggle-help">
                  Turn this switch on to display the banner on the storefront. Turn off to hide it completely.
                </p>
              </div>
              <label className="tbs-switch" htmlFor="tbs-active-toggle">
                <input
                  id="tbs-active-toggle"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="tbs-slider" />
              </label>
            </div>

            <hr className="tbs-divider" />

            {/* Announcement Text Input */}
            <div className="tbs-field">
              <div className="tbs-field-header">
                <label className="tbs-label" htmlFor="tbs-text-input">
                  Announcement Text <span className="tbs-required">*</span>
                </label>
                <span className="tbs-counter">{text.length} characters</span>
              </div>
              <input
                id="tbs-text-input"
                type="text"
                className="tbs-input"
                placeholder="e.g. Diwali Sale - Everything Is Off By 50%"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
                required={isActive}
              />
              <p className="tbs-hint">
                Keep the message clear and concise. Clicking this banner on any store page will redirect customers directly to <strong>/products</strong> (All Products).
              </p>
            </div>

            {/* Preset Suggestions */}
            <div className="tbs-presets">
              <span className="tbs-presets-title">Quick Presets:</span>
              <div className="tbs-preset-chips">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="tbs-preset-chip"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Messages */}
            {errorMessage && (
              <div className="tbs-alert tbs-alert--error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="tbs-alert tbs-alert--success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>TopBar settings saved successfully to the database! Storefront updated.</span>
              </div>
            )}

            {/* Actions */}
            <div className="tbs-actions">
              <button
                type="button"
                className="tbs-btn tbs-btn--secondary"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </button>
              <button
                type="submit"
                className={`tbs-btn tbs-btn--primary admin-btn-with-spinner ${saving ? "tbs-btn--loading" : ""}`}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="admin-btn-spinner" /> Saving to Database...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
