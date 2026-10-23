import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { topbarService } from "../../services/topbarService";
import { useStore } from "../../hooks/useStore";
import "./TopBarSettings.css";

export default function TopBarSettings() {
  const setTopBarData = useStore((s) => s.setTopBarData);

  const [topbars, setTopbars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { message, type }

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [editingId, setEditingId] = useState(null);
  const [formText, setFormText] = useState("");
  const [formLink, setFormLink] = useState("/products");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Modal State for Delete Confirmation
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Live Preview Cycle State
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPaused, setPreviewPaused] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load all TopBar announcements from DB
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await topbarService.getTopBars();
      setTopbars(data || []);
      setTopBarData(data || []);
    } catch (err) {
      console.error("Failed to load topbar announcements:", err);
      showToast("Failed to load topbar announcements from database.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter active announcements for preview
  const activeAnnouncements = useMemo(() => {
    return topbars.filter(
      (item) => item.is_active !== false && (item.text || "").trim().length > 0
    );
  }, [topbars]);

  // Adjust preview index if active list shrinks
  useEffect(() => {
    if (activeAnnouncements.length > 0 && previewIndex >= activeAnnouncements.length) {
      setPreviewIndex(0);
    }
  }, [activeAnnouncements.length, previewIndex]);

  // Auto-cycle preview every 3.5s if more than 1 active announcement
  useEffect(() => {
    if (activeAnnouncements.length <= 1 || previewPaused) return;

    const timer = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [activeAnnouncements.length, previewPaused]);

  // Toggle active status directly from table row
  const handleToggleActive = async (item) => {
    const nextActive = !item.is_active;
    // Optimistic update
    const updatedList = topbars.map((t) =>
      t.id === item.id ? { ...t, is_active: nextActive } : t
    );
    setTopbars(updatedList);
    setTopBarData(updatedList);

    try {
      await topbarService.toggleActive(item.id, nextActive);
      showToast(
        nextActive
          ? `Announcement is now Active on storefront`
          : `Announcement is now Inactive (hidden)`
      );
    } catch (err) {
      console.error("Failed to toggle topbar status:", err);
      // Revert on error
      const reverted = topbars.map((t) =>
        t.id === item.id ? { ...t, is_active: !nextActive } : t
      );
      setTopbars(reverted);
      setTopBarData(reverted);
      showToast("Failed to update status: " + err.message, "error");
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingId(null);
    setFormText("");
    setFormLink("/products");
    setFormActive(true);
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setModalMode("edit");
    setEditingId(item.id);
    setFormText(item.text || "");
    setFormLink(item.link_url || "/products");
    setFormActive(item.is_active !== false);
    setFormError("");
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveModal = async (e) => {
    e.preventDefault();
    const trimmedText = formText.trim();
    if (!trimmedText && formActive) {
      setFormError("Announcement text cannot be empty when TopBar is enabled.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        text: trimmedText,
        link_url: (formLink || "/products").trim(),
        is_active: formActive,
      };

      if (modalMode === "edit" && editingId) {
        const updated = await topbarService.updateTopBar(editingId, payload);
        const newList = topbars.map((t) => (t.id === editingId ? updated : t));
        setTopbars(newList);
        setTopBarData(newList);
        showToast("TopBar announcement updated successfully!");
      } else {
        const created = await topbarService.createTopBar(payload);
        const newList = [...topbars, created];
        setTopbars(newList);
        setTopBarData(newList);
        showToast("New TopBar announcement added successfully!");
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving topbar announcement:", err);
      setFormError(err.message || "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteItem) return;

    setDeleting(true);
    try {
      await topbarService.deleteTopBar(deleteItem.id);
      const remaining = topbars.filter((t) => t.id !== deleteItem.id);
      setTopbars(remaining);
      setTopBarData(remaining);
      setDeleteItem(null);
      showToast("TopBar announcement removed successfully!");
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      showToast("Failed to delete announcement: " + err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  // Current preview announcement
  const currentPreview = activeAnnouncements[previewIndex] || activeAnnouncements[0] || null;

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

      {/* Header with "+ Add Announcement" button */}
      <div className="tbs-header">
        <div>
          <h1 className="tbs-title">TopBar Content</h1>
          <p className="tbs-subtitle">
            Manage announcement messages displayed at the very top of your storefront. When 2 or more are active, they will automatically run/cycle every 3.5s.
          </p>
        </div>

        <button
          type="button"
          className="tbs-btn-primary"
          onClick={handleOpenAdd}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add TopBar Content
        </button>
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
        </div>

        {/* Live TopBar Mockup */}
        <div
          className={`tbs-live-bar ${activeAnnouncements.length === 0 ? "tbs-live-bar--disabled" : ""}`}
        >
          {activeAnnouncements.length > 1 ? (
            <div className="tbs-marquee-wrapper">
              <div className="tbs-marquee-track">
                {[
                  ...activeAnnouncements,
                  ...activeAnnouncements,
                  ...activeAnnouncements,
                  ...activeAnnouncements,
                ].map((item, idx) => (
                  <span key={idx} className="tbs-marquee-item">
                    <span className="tbs-live-bar-text">{item.text}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="tbs-live-bar-content">
              <span className="tbs-live-bar-text">
                {activeAnnouncements.length === 1
                  ? activeAnnouncements[0].text
                  : "(All TopBar content items are inactive. Bar is hidden from store.)"}
              </span>
            </div>
          )}
        </div>

        {activeAnnouncements.length === 0 && (
          <div className="tbs-preview-overlay-notice">
            All TopBar announcements are currently inactive. Enable at least one below to show on the storefront.
          </div>
        )}
      </div>

      {/* TABLE CARD */}
      <div className="tbs-table-card">
        <div className="tbs-table-header">
          <div>
            <h2 className="tbs-table-title">
              All TopBar Content ({topbars.length})
            </h2>
            <p className="tbs-table-desc">
              Add multiple announcements. If more than 1 is active, customers will see them continuously cycling on the store header.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="tbs-loading-state">
            <div className="tbs-spinner" />
            <p>Loading TopBar content...</p>
          </div>
        ) : topbars.length === 0 ? (
          <div className="tbs-empty-state">
            <div className="tbs-empty-icon">📢</div>
            <h3 className="tbs-empty-title">No TopBar Announcements Yet</h3>
            <p className="tbs-empty-desc">
              Create your first announcement to display special sales, discounts, or alerts at the top of your store.
            </p>
            <button
              type="button"
              className="tbs-btn-primary"
              onClick={handleOpenAdd}
            >
              + Add First Announcement
            </button>
          </div>
        ) : (
          <div className="tbs-table-wrap">
            <table className="tbs-table">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>#</th>
                  <th>Announcement Message</th>
                  <th>Destination Link</th>
                  <th style={{ width: "160px" }}>Status</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topbars.map((item, index) => {
                  const isActive = item.is_active !== false;
                  return (
                    <tr key={item.id}>
                      <td style={{ color: "#9ca3af", fontWeight: "600" }}>
                        {index + 1}
                      </td>
                      <td>
                        <div className="tbs-text-cell">
                          <span className="tbs-text-main">
                            {item.text || "(Empty announcement text)"}
                          </span>
                          <span className="tbs-text-sub">
                            {item.text?.length || 0} characters
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="tbs-link-pill">
                          {item.link_url || "/products"}
                        </span>
                      </td>
                      <td>
                        <div className="tbs-status-toggle-wrap">
                          <label className="tbs-toggle">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleToggleActive(item)}
                            />
                            <span className="tbs-toggle-track">
                              <span className="tbs-toggle-thumb" />
                            </span>
                          </label>
                          <span
                            className={`tbs-badge ${
                              isActive ? "tbs-badge--active" : "tbs-badge--inactive"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="tbs-actions-cell">
                          <button
                            type="button"
                            className="tbs-action-btn tbs-action-btn--edit"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Announcement"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>

                          <button
                            type="button"
                            className="tbs-action-btn tbs-action-btn--delete"
                            onClick={() => setDeleteItem(item)}
                            title="Delete Announcement"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL via createPortal */}
      {isModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="tbs-modal-backdrop"
          onClick={() => !saving && setIsModalOpen(false)}
        >
          <div
            className="tbs-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tbs-modal-header">
              <h2 className="tbs-modal-title">
                {modalMode === "edit" ? "Edit TopBar Content" : "Add TopBar Content"}
              </h2>
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
                    <span className="tbs-counter">{formText.length}/200</span>
                  </div>
                  <input
                    type="text"
                    className="tbs-input"
                    placeholder="e.g. Free delivery on all prepaid orders | Use code SAVE10"
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    maxLength={200}
                    required={formActive}
                    autoFocus
                  />
                  <span className="tbs-field-hint">
                    Short and punchy announcements work best on mobile & desktop.
                  </span>
                </div>

                {/* Destination Link */}
                <div className="tbs-form-group">
                  <label className="tbs-form-label">
                    Redirect Destination Link
                  </label>
                  <input
                    type="text"
                    className="tbs-input"
                    placeholder="/products or /products?category=earrings"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                  />
                  <span className="tbs-field-hint">
                    Where customers go when clicking this announcement (default is /products).
                  </span>
                </div>

                {/* Active Toggle Switch */}
                <div className="tbs-modal-toggle-row">
                  <div>
                    <span className="tbs-form-label">Show on Storefront</span>
                    <span className="tbs-field-hint">
                      Enable this announcement to appear in the storefront cycling topbar
                    </span>
                  </div>
                  <label className="tbs-toggle">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
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
                  ) : modalMode === "edit" ? (
                    "Update Content"
                  ) : (
                    "Add Content"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteItem && typeof document !== "undefined" && createPortal(
        <div
          className="tbs-modal-backdrop"
          onClick={() => !deleting && setDeleteItem(null)}
        >
          <div
            className="tbs-modal-dialog tbs-modal-dialog--delete"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tbs-modal-header">
              <h2 className="tbs-modal-title" style={{ color: "#b91c1c" }}>
                Delete Announcement
              </h2>
              <button
                type="button"
                className="tbs-modal-close"
                onClick={() => !deleting && setDeleteItem(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="tbs-modal-body">
              <p style={{ margin: "0 0 14px", color: "#374151", fontSize: "14px", lineHeight: "1.5" }}>
                Are you sure you want to delete this TopBar announcement? This action cannot be undone.
              </p>

              <div className="tbs-delete-snippet">
                <span className="tbs-delete-snippet-text">
                  "{deleteItem.text}"
                </span>
                <span className="tbs-delete-snippet-link">
                  Link: {deleteItem.link_url || "/products"}
                </span>
              </div>
            </div>

            <div className="tbs-modal-footer">
              <button
                type="button"
                className="tbs-btn-cancel"
                onClick={() => setDeleteItem(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tbs-btn-delete admin-btn-with-spinner"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="admin-btn-spinner" /> Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
