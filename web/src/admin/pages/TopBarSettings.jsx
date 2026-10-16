import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { topbarService } from "../../services/topbarService";
import { useStore } from "../../hooks/useStore";
import "./TopBarSettings.css";

export default function TopBarSettings() {
  const storeTopbarData = useStore((s) => s.topbarData);
  const setTopBarData = useStore((s) => s.setTopBarData);

  const [topbarId, setTopbarId] = useState(null);
  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("/products");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { message, type }

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [editLink, setEditLink] = useState("/products");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

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
            setLinkUrl(data.link_url || "/products");
            setIsActive(data.is_active !== false);
            setTopBarData(data);
          } else {
            setText("");
            setLinkUrl("/products");
            setIsActive(true);
          }
        }
      } catch (err) {
        console.error("Failed to load topbar:", err);
        if (isMounted) {
          showToast("Failed to load topbar settings from database.", "error");
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

  // Toggle active directly from list row
  const handleToggleActiveInList = async () => {
    const nextActive = !isActive;
    setIsActive(nextActive);
    try {
      const payload = {
        id: topbarId,
        text: text,
        link_url: linkUrl || "/products",
        is_active: nextActive,
      };
      const result = await topbarService.saveTopBar(payload);
      if (result) {
        setTopBarData(result);
      }
      showToast(
        nextActive
          ? "TopBar banner is now Active on storefront"
          : "TopBar banner is now Inactive (hidden from store)"
      );
    } catch (err) {
      console.error("Failed to toggle topbar status:", err);
      setIsActive(!nextActive); // revert
      showToast("Failed to update status: " + err.message, "error");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    setEditText(text);
    setEditLink(linkUrl || "/products");
    setEditActive(isActive);
    setFormError("");
    setIsModalOpen(true);
  };

  // Save from Modal
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!editText.trim() && editActive) {
      setFormError("Announcement text cannot be empty when TopBar is enabled.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const payload = {
        id: topbarId,
        text: editText.trim(),
        link_url: editLink.trim() || "/products",
        is_active: editActive,
      };

      const result = await topbarService.saveTopBar(payload);
      if (result) {
        setTopbarId(result.id);
        setText(result.text);
        setLinkUrl(result.link_url || "/products");
        setIsActive(result.is_active !== false);
        setTopBarData(result);
      }
      setIsModalOpen(false);
      showToast("TopBar announcement updated successfully!");
    } catch (err) {
      console.error("Error saving topbar:", err);
      setFormError(err.message || "Failed to save TopBar announcement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tbs-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`tbs-toast tbs-toast--${toast.type}`}>
          <div className="tbs-toast-icon">
            {toast.type === "error" ? "✕" : "✓"}
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header (No active badge here - active is in list only) */}
      <div className="tbs-header">
        <div>
          <h1 className="tbs-title">TopBar Content</h1>
          <p className="tbs-subtitle">
            Manage the announcement banner displayed at the very top of your storefront.
          </p>
        </div>
      </div>

      {/* Live Storefront Preview */}
      <div className="tbs-preview-card">
        <div className="tbs-preview-header">
          <div className="tbs-preview-title">
            <svg
              width="15"
              height="15"
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
            Links to: <strong>{linkUrl || "/products"}</strong>
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
            TopBar is currently turned off in the list below and will not appear on storefront.
          </div>
        )}
      </div>

      {/* UNIFIED LIST TABLE: Active status shows in list only */}
      <div className="tbs-table-card">
        <div className="tbs-table-header">
          <div>
            <h2 className="tbs-table-title">Announcement Message</h2>
            <p className="tbs-table-desc">
              Toggle visibility or edit the message shown across all store pages.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="tbs-loading-state">
            <div className="tbs-spinner" />
            <p>Loading TopBar announcement...</p>
          </div>
        ) : (
          <div className="tbs-table-wrap">
            <table className="tbs-table">
              <thead>
                <tr>
                  <th>Announcement Message</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="tbs-text-cell">
                      <span className="tbs-text-main">
                        {text.trim() || "(Empty announcement text)"}
                      </span>
                      <span className="tbs-text-sub">Store header announcement banner</span>
                    </div>
                  </td>
                  <td>
                    <span className="tbs-link-pill">
                      {linkUrl || "/products"}
                    </span>
                  </td>
                  <td>
                    <div className="tbs-status-toggle-wrap">
                      <label className="tbs-toggle">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={handleToggleActiveInList}
                        />
                        <span className="tbs-toggle-track">
                          <span className="tbs-toggle-thumb" />
                        </span>
                      </label>
                      <span className={`tbs-badge ${isActive ? "tbs-badge--active" : "tbs-badge--inactive"}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="tbs-actions-cell">
                      <button
                        type="button"
                        className="tbs-action-btn tbs-action-btn--edit"
                        onClick={handleOpenEdit}
                        title="Edit Announcement"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL: Centered in Screen via createPortal */}
      {isModalOpen && typeof document !== "undefined" && createPortal(
        <div className="tbs-modal-backdrop" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="tbs-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tbs-modal-header">
              <h2 className="tbs-modal-title">Edit TopBar Announcement</h2>
              <button
                type="button"
                className="tbs-modal-close"
                onClick={() => !saving && setIsModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="tbs-modal-body">
                {formError && (
                  <div className="tbs-alert tbs-alert--error">
                    <span>{formError}</span>
                  </div>
                )}

                {/* Announcement Text */}
                <div className="tbs-form-group">
                  <div className="tbs-field-top">
                    <label className="tbs-form-label">
                      Announcement Text <span className="tbs-required">*</span>
                    </label>
                    <span className="tbs-counter">{editText.length}/200</span>
                  </div>
                  <input
                    type="text"
                    className="tbs-input"
                    placeholder="Enter announcement message..."
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    maxLength={200}
                    required={editActive}
                    autoFocus
                  />
                </div>

                {/* Destination Link */}
                <div className="tbs-form-group">
                  <label className="tbs-form-label">
                    Redirect Destination Link
                  </label>
                  <input
                    type="text"
                    className="tbs-input"
                    placeholder="/products"
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                  />
                  <span className="tbs-field-hint">
                    Default is /products (redirects customer to All Products collection).
                  </span>
                </div>

                {/* Active Toggle Switch */}
                <div className="tbs-modal-toggle-row">
                  <div>
                    <span className="tbs-form-label">Show on Storefront</span>
                    <span className="tbs-field-hint">Display this banner at the top of store pages</span>
                  </div>
                  <label className="tbs-toggle">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    <span className="tbs-toggle-track">
                      <span className="tbs-toggle-thumb" />
                    </span>
                  </label>
                </div>
              </div>

              <div className="tbs-modal-footer">
                <button
                  type="button"
                  className="tbs-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tbs-btn-save admin-btn-with-spinner"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="admin-btn-spinner" /> Saving...
                    </>
                  ) : (
                    "Save Announcement"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
