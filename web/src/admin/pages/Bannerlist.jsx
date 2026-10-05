import React, { useState, useEffect } from "react";
import "./Bannerlist.css";
import blankIcon from "../../assets/admin/blank.svg";
import { bannerService } from "../../services/bannerService";

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const BannerList = ({ banners: initialBanners = [], onAddBanner, onEditBanner, onDeleteBanner }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [bannerList, setBannerList] = useState(initialBanners);
  const [loading, setLoading] = useState(false);

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
      await bannerService.deleteBanner(deleteConfirm);
      setBannerList((prev) => prev.filter((b) => (b.id ?? b.banner_id) !== deleteConfirm));
      if (onDeleteBanner) onDeleteBanner(deleteConfirm);
    } catch (err) {
      console.error("Failed to delete banner:", err);
    } finally {
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
            const desc = banner.description || banner.tagline;

            return (
              <div key={banner.id} className="bl__card">
                <div className="bl__card-image">
                  {imgSrc ? (
                    <img src={imgSrc} alt={banner.title} />
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
                    <span className="bl__card-title">{banner.title || "Untitled Banner"}</span>
                    <span className="bl__badge bl__badge--active">Active</span>
                  </div>
                  {desc && (
                    <div className="bl__card-meta" style={{ color: "#475569", marginTop: "4px" }}>
                      {desc}
                    </div>
                  )}
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
          <h2 className="bl__preview-title">Home Page Carousel Preview</h2>
          <CarouselPreview banners={bannerList} />
          <p className="bl__preview-note">
            {bannerList.length} Banner{bannerList.length !== 1 ? "s" : ""} Live on Storefront
          </p>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm !== null && (
        <div className="bl__modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="bl__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="bl__modal-title">Delete Banner?</h3>
            <p className="bl__modal-text">This action will remove the banner from the home page.</p>
            <div className="bl__modal-actions">
              <button className="bl__modal-btn bl__modal-btn--cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="bl__modal-btn bl__modal-btn--delete" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Carousel Preview ──────────────────────────────────────────────────── */
const CarouselPreview = ({ banners }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const banner = banners[current];
  const imgSrc = banner?.image_url || banner?.image;
  const desc = banner?.description || banner?.tagline;

  return (
    <div className="bl__carousel" style={{ position: "relative", overflow: "hidden", borderRadius: "12px" }}>
      {imgSrc ? (
        <div style={{ position: "relative", width: "100%", height: "220px" }}>
          <img src={imgSrc} alt={banner.title} className="bl__carousel-img" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px" }}>
            <h3 style={{ color: "#fff", margin: "0 0 6px 0", fontSize: "20px", fontWeight: "700" }}>{banner.title}</h3>
            {desc && <p style={{ color: "rgba(255,255,255,0.85)", margin: 0, fontSize: "14px" }}>{desc}</p>}
          </div>
        </div>
      ) : (
        <div className="bl__carousel-placeholder">No image</div>
      )}
      {banners.length > 1 && (
        <div className="bl__carousel-dots">
          {banners.map((_, i) => (
            <button
              key={i}
              className={`bl__carousel-dot${i === current ? " bl__carousel-dot--active" : ""}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerList;