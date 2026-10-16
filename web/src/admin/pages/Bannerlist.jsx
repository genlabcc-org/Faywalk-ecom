import React, { useState, useEffect } from "react";
import "./Bannerlist.css";
import blankIcon from "../../assets/admin/blank.svg";
import { bannerService } from "../../services/bannerService";
import AdminModal from "../components/AdminModal";

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const DesktopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const MobileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <line x1="12" y1="18" x2="12" y2="18.01" />
  </svg>
);

const PrevIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const NextIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const BannerList = ({ banners: initialBanners = [], onAddBanner, onEditBanner, onDeleteBanner }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bannerList, setBannerList] = useState(initialBanners);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop");

  // Load banners from Supabase on mount
  const loadBanners = async () => {
    try {
      setLoading(true);
      const data = await bannerService.getBanners();
      setBannerList(data);
    } catch (err) {
      console.error("Error loading banners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const totalBanners = bannerList.length;

  const handleDeleteClick = (id) => setDeleteConfirm(id);
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      setIsDeleting(true);
      await bannerService.deleteBanner(deleteConfirm);
      setBannerList((prev) => prev.filter((b) => (b.id ?? b.banner_id) !== deleteConfirm));
      if (onDeleteBanner) onDeleteBanner(deleteConfirm);
    } catch (err) {
      console.error("Failed to delete banner:", err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="bl">
      {/* Page Header */}
      <div className="bl__header">
        <h1 className="bl__title">Banner &amp; Content</h1>
        <button className="bl__add-btn" onClick={onAddBanner}>
          <PlusIcon /> Add Banner
        </button>
      </div>

      {/* Stats Row */}
      <div className="bl__stats">
        <div className="bl__stat-card">
          <div className="bl__stat-label">Total Banners</div>
          <div className="bl__stat-value">{totalBanners}</div>
          <div className="bl__stat-sub">Live on Home Page</div>
        </div>
      </div>

      {/* Banner List */}
      <div className="bl__list">
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Loading banners...</div>
        ) : bannerList.length === 0 ? (
          <div className="bl__empty">
            <img src={blankIcon} alt="No banners" className="bl__empty-icon" />
            <p>No banners yet. Click <strong>+ Add Banner</strong> to create one.</p>
          </div>
        ) : (
          bannerList.map((banner) => {
            const imgSrc = banner.image_url || banner.image;
            const mobileSrc = banner.mobile_url || banner.mobile_image_url;

            return (
              <div key={banner.id} className="bl__card">
                <div className="bl__card-image">
                  {imgSrc ? (
                    <img src={imgSrc} alt={banner.title || "Banner"} />
                  ) : (
                    <div className="bl__card-image-placeholder">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="bl__card-info">
                  <div className="bl__card-top">
                    <span className="bl__card-title">Banner #{banner.id ?? banner.banner_id}</span>
                    <span className="bl__badge bl__badge--active">Active</span>
                    {mobileSrc && (
                      <span className="bl__badge bl__badge--mobile">Mobile Ready</span>
                    )}
                  </div>
                  <div className="bl__card-meta" style={{ marginTop: "6px" }}>
                    Created: {banner.created_at ? new Date(banner.created_at).toLocaleDateString() : "—"}
                  </div>
                  <div className="bl__card-actions" style={{ marginTop: "12px" }}>
                    <button
                      className="bl__action-btn bl__action-btn--edit"
                      onClick={() => onEditBanner && onEditBanner(banner)}
                    >
                      Edit
                    </button>
                    <button
                      className="bl__action-btn bl__action-btn--delete"
                      onClick={() => handleDeleteClick(banner.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Carousel Preview */}
      {bannerList.length > 0 && (
        <div className="bl__preview-section">
          <div className="bl__preview-header">
            <div>
              <h2 className="bl__preview-title">Home Page Carousel Preview</h2>
              <div className="bl__preview-subtitle">
                Interactive preview of storefront hero banners
              </div>
            </div>
            <div className="bl__view-toggle" role="tablist" aria-label="Carousel preview viewport">
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === "desktop"}
                className={`bl__toggle-btn ${previewMode === "desktop" ? "bl__toggle-btn--active" : ""}`}
                onClick={() => setPreviewMode("desktop")}
              >
                <DesktopIcon />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === "mobile"}
                className={`bl__toggle-btn ${previewMode === "mobile" ? "bl__toggle-btn--active" : ""}`}
                onClick={() => setPreviewMode("mobile")}
              >
                <MobileIcon />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          <CarouselPreview banners={bannerList} previewMode={previewMode} />

          <p className="bl__preview-note">
            {bannerList.length} Banner{bannerList.length !== 1 ? "s" : ""} Live on Storefront &bull; {previewMode === "desktop" ? "Showing desktop layout" : "Showing mobile viewport"}
          </p>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <AdminModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Banner?"
        maxWidth={420}
        footer={
          <>
            <button className="bl__modal-btn bl__modal-btn--cancel" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>Cancel</button>
            <button className="bl__modal-btn bl__modal-btn--delete admin-btn-with-spinner" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <span className="admin-btn-spinner" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </>
        }
      >
        <p className="bl__modal-text" style={{ margin: 0, color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
          This action will remove the banner from the home page.
        </p>
      </AdminModal>
    </div>
  );
};

/* ── Carousel Preview (Exact Storefront Hero Styling) ──────────────────── */
const CarouselPreview = ({ banners, previewMode = "desktop" }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    if (current >= banners.length) {
      setCurrent(0);
    }
  }, [banners.length, current]);

  const banner = banners[current];
  const isMobile = previewMode === "mobile";

  const desktopImg = banner?.image_url || banner?.image;
  const mobileImg = banner?.mobile_url || banner?.mobile_image_url;
  const imgSrc = isMobile ? (mobileImg || desktopImg) : (desktopImg || mobileImg);

  return (
    <div className={`bl__preview-stage bl__preview-stage--${previewMode}`}>
      <div className={`bl__hero-preview bl__hero-preview--${previewMode}`}>
        {imgSrc ? (
          <div className="bl__hero-img-wrap">
            <img
              src={imgSrc}
              alt={banner?.title || "Storefront banner"}
              className="bl__hero-img"
            />
          </div>
        ) : (
          <div className="bl__carousel-placeholder">No image</div>
        )}

        {banners.length > 1 && (
          <>
            <button
              type="button"
              className="bl__carousel-arrow bl__carousel-arrow--prev"
              onClick={() => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)}
              aria-label="Previous banner"
            >
              <PrevIcon />
            </button>
            <button
              type="button"
              className="bl__carousel-arrow bl__carousel-arrow--next"
              onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
              aria-label="Next banner"
            >
              <NextIcon />
            </button>
            <div className="bl__hero-dots">
              {banners.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  className={`bl__hero-dot${i === current ? " bl__hero-dot--active" : ""}`}
                  onClick={() => setCurrent(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BannerList;