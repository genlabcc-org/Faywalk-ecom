import React, { useState, useEffect, useRef } from "react";
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
  const isDropdownOpen = openDropdownId === sub.subcategory_id;
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
                setOpenDropdownId(isDropdownOpen ? null : sub.subcategory_id);
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
    products.forEach((p) => {
      if (p.subcategory_id) {
        counts[p.subcategory_id] = (counts[p.subcategory_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const handleOpen = (sub) => {
    navigate(`/admin/products?subcategory=${sub.subcategory_id}`);
  };

  const handleEdit = (sub) => {
    navigate(
      `/admin/subcategories/new?parentId=${parentId}&subcategoryId=${sub.subcategory_id}`
    );
  };

  const handleDelete = async (sub) => {
    const confirmed = window.confirm(`Delete "${sub.name}"?`);
    if (!confirmed) return;
    try {
      await productService.deleteSubcategory(sub.subcategory_id);
      setLocalSubcategories((prev) =>
        prev.filter((s) => s.subcategory_id !== sub.subcategory_id)
      );
      if (onDeleteSubcategory) {
        onDeleteSubcategory(sub.subcategory_id, parentId);
      }
    } catch (error) {
      alert("Failed to delete: " + error.message);
    }
  };

  return (
    <div className="cat-page">
      <div className="subcat-topbar">
        <button
          className="db__header-back-btn"
          onClick={onBack}
          aria-label="Go back"
          title="Back to Categories"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="subcat-title">
          {parentCategory?.name || "Category"}{" "}
          <span className="subcat-title-sub">Subcategories</span>
        </h1>
        <button className="cat-add-btn" onClick={onAddSubcategory}>
          + Add Subcategory
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>
          Loading subcategories…
        </div>
      ) : list.length === 0 ? (
        <div className="cat-empty">
          <div className="cat-empty-title">No subcategories yet</div>
          <div className="cat-empty-desc">
            Click "+ Add Subcategory" to add items to {parentCategory?.name || "this category"}.
          </div>
          <button
            type="button"
            className="cat-add-btn"
            style={{ marginTop: 12 }}
            onClick={onAddSubcategory}
          >
            + Add Subcategory
          </button>
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
    </div>
  );
};

export default SubcategoryCards;