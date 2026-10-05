import React, { useState, useEffect, useRef } from "react";
import "./Banneredit.css";

const BannerEdit = ({ banner, onBack, onSave, onDelete }) => {
  const [form, setForm] = useState({
    title: "",
    tagline: "",
    linkUrl: "",
    displayOrder: "",
    target: "",
    startDate: "",
    endDate: "",
    active: true,
  });

  const [currentImage, setCurrentImage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageDeleteConfirm, setShowImageDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (banner) {
      setForm({
        title: banner.title || "",
        tagline: banner.tagline || "",
        linkUrl: banner.linkUrl || "",
        displayOrder: banner.displayOrder ?? "",
        target: banner.target || "",
        startDate: banner.startDate || "",
        endDate: banner.endDate || "",
        active: banner.status === "Active",
      });
      setCurrentImage(banner.image || null);
    }
  }, [banner]);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleToggle = () =>
    setForm((prev) => ({ ...prev, active: !prev.active }));

  // ── Upload ──────────────────────────────────────────────────────────
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCurrentImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  // ── Image delete ────────────────────────────────────────────────────
  const handleImageDeleteConfirm = () => {
    setCurrentImage(null);
    setShowImageDeleteConfirm(false);
  };

  // ── Banner delete ───────────────────────────────────────────────────
  const handleSave = () => {
    if (onSave)
      onSave({
        ...banner,
        ...form,
        image: currentImage,
        status: form.active ? "Active" : "Inactive",
      });
  };

  const handleDeleteConfirm = () => {
    if (onDelete) onDelete(banner.id);
    setShowDeleteConfirm(false);
  };

  const statusConfig = {
    Active: { className: "be__badge--active", label: "Active" },
    Scheduled: { className: "be__badge--scheduled", label: "Scheduled" },
    Inactive: { className: "be__badge--inactive", label: "Inactive" },
  };
  const cfg = statusConfig[banner?.status] || statusConfig.Inactive;

  return (
    <div className="be">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="be__header">
        <button className="be__back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="be__title">Edit Banner</h1>
      </div>

      {/* Breadcrumb / meta bar */}
      <div className="be__meta-bar">
        <span className="be__meta-dot" />
        <span className="be__meta-text">
          Editing &nbsp;·&nbsp; {banner?.title || "Untitled"} &nbsp;·&nbsp; Position {banner?.displayOrder ?? 1} &nbsp;·&nbsp; {banner?.status || "Active"} &nbsp;·&nbsp; Last updated {banner?.uploadedDate || "1 May 2026"}
        </span>
      </div>

      <div className="be__body">
        {/* Banner Title */}
        <div className="be__field">
          <label className="be__label">Banner Title (Internal Reference)</label>
          <input
            className="be__input"
            placeholder="Input your text"
            value={form.title}
            onChange={handleChange("title")}
          />
        </div>

        {/* Banner Tagline */}
        <div className="be__field">
          <label className="be__label">Banner tagline (optional)</label>
          <input
            className="be__input"
            placeholder="Input your text"
            value={form.tagline}
            onChange={handleChange("tagline")}
          />
        </div>

        {/* Link URL */}
        <div className="be__field">
          <label className="be__label">Link URL</label>
          <input
            className="be__input"
            placeholder="Input your text"
            value={form.linkUrl}
            onChange={handleChange("linkUrl")}
          />
        </div>

        {/* Display Order + Target */}
        <div className="be__row">
          <div className="be__field be__field--half">
            <label className="be__label">Display Order</label>
            <input
              className="be__input"
              placeholder="Input your text"
              value={form.displayOrder}
              onChange={handleChange("displayOrder")}
            />
            <div className="be__hint">Lower number = appears first in carousel</div>
          </div>
          <div className="be__field be__field--half">
            <label className="be__label">Target</label>
            <div className="be__select-wrap">
              <select
                className="be__select"
                value={form.target}
                onChange={handleChange("target")}
              >
                <option value="">Input your text</option>
                <option value="_self">Same Tab (_self)</option>
                <option value="_blank">New Tab (_blank)</option>
              </select>
              <svg className="be__select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        {/* Banner Preview Card */}
        <div className="be__preview-card">
          <div className="be__preview-image">
            {currentImage ? (
              <img src={currentImage} alt={form.title || "Banner"} />
            ) : (
              <div className="be__preview-image-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
          </div>
          <div className="be__preview-info">
            <div className="be__preview-title-row">
              <span className="be__preview-name">{form.title || "Untitled Banner"}</span>
              <span className={`be__badge ${cfg.className}`}>{cfg.label}</span>
            </div>
            {form.linkUrl && (
              <div className="be__preview-meta">Link: {form.linkUrl}</div>
            )}
            <div className="be__preview-meta">
              Uploaded: {banner?.uploadedDate || "—"} &nbsp;·&nbsp; {banner?.dimensions || "1200×400px"}
            </div>
            {(form.startDate || form.endDate) && (
              <div className="be__preview-meta">
                Validity: {form.startDate || "—"} – {form.endDate || "—"}
              </div>
            )}
            <div className="be__preview-actions">
              <button
                className="be__img-btn be__img-btn--upload"
                onClick={handleUploadClick}
              >
                Upload
              </button>
              {currentImage && (
                <button
                  className="be__img-btn be__img-btn--delete"
                  onClick={() => setShowImageDeleteConfirm(true)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Validity & Scheduling */}
        <div className="be__section-title">Validity &amp; scheduling</div>
        <div className="be__row">
          <div className="be__field be__field--half">
            <label className="be__label">Start Date</label>
            <div className="be__date-wrap">
              <input
                className="be__input"
                placeholder="Input your text"
                value={form.startDate}
                onChange={handleChange("startDate")}
              />
              <svg className="be__date-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="be__field be__field--half">
            <label className="be__label">End Date</label>
            <div className="be__date-wrap">
              <input
                className="be__input"
                placeholder="Input your text"
                value={form.endDate}
                onChange={handleChange("endDate")}
              />
              <svg className="be__date-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
        </div>

        {/* Visibility Options */}
        <div className="be__section-title">Visibility Options</div>
        <div className="be__visibility-card">
          <div className="be__visibility-text">
            <div className="be__visibility-label">
              Active — show on home page carousel
            </div>
            <div className="be__visibility-sub">Currently live on storefront</div>
          </div>
          <button
            className={`be__toggle ${form.active ? "be__toggle--on" : ""}`}
            onClick={handleToggle}
            aria-label="Toggle active"
          >
            <span className="be__toggle-knob" />
          </button>
        </div>

        {/* Performance */}
        <div className="be__section-title">Performance</div>
        <div className="be__perf-grid">
          <div className="be__perf-card">
            <div className="be__perf-label">Impressions</div>
            <div className="be__perf-value">{banner?.impressions != null ? banner.impressions.toLocaleString() : "0"}</div>
          </div>
          <div className="be__perf-card">
            <div className="be__perf-label">Clicks</div>
            <div className="be__perf-value">{banner?.clicks != null ? banner.clicks : "0"}</div>
          </div>
          <div className="be__perf-card">
            <div className="be__perf-label">CTR</div>
            <div className="be__perf-value be__perf-value--ctr">{banner?.ctr != null ? banner.ctr : "0 %"}</div>
          </div>
          <div className="be__perf-card">
            <div className="be__perf-label">Days Live</div>
            <div className="be__perf-value">{banner?.daysLive != null ? banner.daysLive : "0"}</div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="be__footer">
        <button
          className="be__footer-btn be__footer-btn--delete"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete Banner
        </button>
        <button className="be__footer-btn be__footer-btn--save" onClick={handleSave}>
          Save Changes
        </button>
      </div>

      {/* Banner Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="be__modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="be__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="be__modal-title">Delete Banner?</h3>
            <p className="be__modal-text">This action cannot be undone. The banner will be permanently removed.</p>
            <div className="be__modal-actions">
              <button className="be__modal-btn be__modal-btn--cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="be__modal-btn be__modal-btn--delete" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Delete Confirm Modal */}
      {showImageDeleteConfirm && (
        <div className="be__modal-overlay" onClick={() => setShowImageDeleteConfirm(false)}>
          <div className="be__modal" onClick={(e) => e.stopPropagation()}>
            <div className="be__modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <h3 className="be__modal-title">Remove Image?</h3>
            <p className="be__modal-text">The banner image will be removed. You can upload a new one anytime.</p>
            <div className="be__modal-actions">
              <button className="be__modal-btn be__modal-btn--cancel" onClick={() => setShowImageDeleteConfirm(false)}>Cancel</button>
              <button className="be__modal-btn be__modal-btn--delete" onClick={handleImageDeleteConfirm}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerEdit;