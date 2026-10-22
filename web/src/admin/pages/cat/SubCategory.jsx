import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { productService } from "../../../services/productService";
import "../categorylist.css";
import "./SubCategory.css";

// ─── Placeholder when subcategory has no image ────────────────────────────────
const PlaceholderImage = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
      color: "#94a3b8",
      gap: 6,
    }}
  >
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
    <span style={{ fontSize: 11, fontWeight: 500 }}>No Image</span>
  </div>
);

// ─── Single Subcategory Card (Matches Mockup) ──────────────────────────────────
const SubcategoryCard = ({
  sub,
  productCount,
  openDropdownId,
  setOpenDropdownId,
  onOpen,
  onEdit,
  onDelete,
}) => {
  const subId = sub.subcategory_id ?? sub.id;
  const isDropdownOpen = String(openDropdownId) === String(subId);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, setOpenDropdownId]);

  const thumbnail = sub.image_url || null;
  const hasAttrs = sub.waistband || sub.material || sub.description;

  return (
    <div className="cat-card">
      {/* ── Image ── */}
      <div
        className="cat-card-img-wrap"
        onClick={() => onOpen(sub)}
        title={`Open ${sub.name}`}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={sub.name}
            className="cat-card-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <PlaceholderImage />
        )}
      </div>

      {/* ── Body ── */}
      <div className="cat-card-body">
        {/* Top Info + 3-dots menu */}
        <div className="cat-card-head-row">
          <div className="cat-card-info" onClick={() => onOpen(sub)}>
            <h3 className="cat-card-title" title={sub.name}>
              {sub.name}
            </h3>
            <div className="cat-card-qty">Quantity : {productCount}</div>
          </div>

          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              className="cat-card-more-btn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdownId(isDropdownOpen ? null : subId);
              }}
              title="More actions"
              aria-label="More options"
            >
              ···
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="cat-dropdown">
                <button
                  type="button"
                  className="cat-dropdown-item"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onOpen(sub);
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="cat-dropdown-item"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onEdit(sub);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="cat-dropdown-item cat-dropdown-item--delete"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onDelete(sub);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Attributes: Only show real attributes if present */}
        {hasAttrs && (
          <div className="cat-card-attrs">
            {sub.waistband && (
              <div className="cat-attr-col">
                <div className="cat-attr-label">Waistband :</div>
                <div className="cat-attr-val">{sub.waistband}</div>
              </div>
            )}
            {sub.material && (
              <div className="cat-attr-col">
                <div className="cat-attr-label">Material :</div>
                <div className="cat-attr-val">{sub.material}</div>
              </div>
            )}
            {!sub.waistband && !sub.material && sub.description && (
              <div className="cat-attr-col" style={{ width: "100%" }}>
                <div className="cat-attr-label">Description :</div>
                <div className="cat-attr-val">{sub.description}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Subcategory Cards Page ──────────────────────────────────────────────
const SubcategoryCards = ({
  parentCategory,
  subcategories: propSubcategories,
  products = [],
  onFetchSubcategories,
  onDeleteSubcategory,
  onBack,
  onAddSubcategory,
}) => {
  const navigate = useNavigate();
  const [localSubcategories, setLocalSubcategories] = useState(
    propSubcategories || []
  );
  const [loading, setLoading] = useState(!propSubcategories);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [pendingDeleteSub, setPendingDeleteSub] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockedSub, setBlockedSub] = useState(null);
  const parentId = parentCategory?.category_id || parentCategory?.id;

  useEffect(() => {
    if (propSubcategories) {
      setLocalSubcategories(propSubcategories);
    }
  }, [propSubcategories]);

  useEffect(() => {
    if (!parentId) {
      setLoading(false);
      return;
    }
    if (propSubcategories) {
      setLoading(false);
      return;
    }
    setLoading(true);
    if (onFetchSubcategories) {
      onFetchSubcategories(parentId)
        .then((data) => {
          if (data) setLocalSubcategories(data);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [parentId, propSubcategories, onFetchSubcategories]);

  const list = localSubcategories || [];

  const productCountBySubcategory = React.useMemo(() => {
    const counts = {};
    (products || []).forEach((p) => {
      if (p.subcategory_id != null) {
        const idStr = String(p.subcategory_id);
        counts[idStr] = (counts[idStr] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const handleOpen = (sub) => {
    navigate(`/admin/products?subcategory=${sub.subcategory_id ?? sub.id}`);
  };

  const handleEdit = (sub) => {
    const sId = sub.subcategory_id ?? sub.id;
    navigate(
      `/admin/subcategories/new?parentId=${parentId}&subcategoryId=${sId}`
    );
  };

  const handleDelete = (sub) => {
    const sId = sub.subcategory_id ?? sub.id;
    const count = productCountBySubcategory[String(sId)] || 0;
    if (count > 0) {
      setBlockedSub({ ...sub, productCount: count });
      return;
    }
    setPendingDeleteSub(sub);
  };

  const confirmDeleteSub = async () => {
    if (!pendingDeleteSub) return;
    const sId = pendingDeleteSub.subcategory_id ?? pendingDeleteSub.id;
    try {
      setIsDeleting(true);
      await productService.deleteSubcategory(sId);
      setLocalSubcategories((prev) =>
        prev.filter((s) => (s.subcategory_id ?? s.id) !== sId)
      );
      if (onDeleteSubcategory) {
        onDeleteSubcategory(sId, parentId);
      }
    } catch (error) {
      console.error("Failed to delete subcategory:", error);
      alert(error.message || "Failed to delete subcategory. Please try again.");
    } finally {
      setIsDeleting(false);
      setPendingDeleteSub(null);
    }
  };

  return (
    <div className="cat-page">
      <div className="subcat-topbar">
        <h1 className="subcat-title">
          {parentCategory?.name || "Category"}{" "}
          <span className="subcat-title-sub">Subcategories</span>
        </h1>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>
          Loading subcategories…
        </div>
      ) : list.length === 0 ? (
        <div className="cat-empty">
          <div className="cat-empty-title">No subcategories yet</div>
          <div className="cat-empty-desc">
            Click Add Subcategory in the header to add items to {parentCategory?.name || "this category"}.
          </div>
        </div>
      ) : (
        <div className="cat-grid">
          {list.map((sub) => (
            <SubcategoryCard
              key={sub.subcategory_id}
              sub={sub}
              productCount={productCountBySubcategory[sub.subcategory_id] || 0}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
              onOpen={handleOpen}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Screen-Centered Minimal Delete Confirmation Modal ── */}
      {pendingDeleteSub && typeof document !== "undefined" && createPortal(
        <div
          className="cat-confirm-overlay"
          onClick={() => !isDeleting && setPendingDeleteSub(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="cat-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cat-confirm-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 className="cat-confirm-title">Delete Subcategory</h3>
            <p className="cat-confirm-text">
              Are you sure you want to delete <strong>"{pendingDeleteSub.name}"</strong>? This action cannot be undone.
            </p>
            <div className="cat-confirm-actions">
              <button
                type="button"
                className="cat-confirm-cancel"
                onClick={() => setPendingDeleteSub(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cat-confirm-ok"
                onClick={confirmDeleteSub}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Blocked Delete Modal (Screen-Centered via Portal) ── */}
      {blockedSub && typeof document !== "undefined" && createPortal(
        <div
          className="cat-confirm-overlay"
          onClick={() => setBlockedSub(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="cat-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cat-confirm-icon" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h3 className="cat-confirm-title">Can't delete "{blockedSub.name}"</h3>

            <p className="cat-confirm-text">
              This subcategory has <strong>{blockedSub.productCount}</strong> product{blockedSub.productCount > 1 ? "s" : ""} linked to it. Move or delete those products first, then try again.
            </p>

            <div className="cat-confirm-actions">
              <button
                type="button"
                className="cat-confirm-cancel"
                onClick={() => setBlockedSub(null)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SubcategoryCards;