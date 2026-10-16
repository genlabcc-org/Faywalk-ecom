import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./categorylist.css";

// ─── Placeholder when category has no image ──────────────────────────────────
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

// ─── Category Card Component (Matches Mockup) ──────────────────────────────────
const CategoryCard = ({
  cat,
  openDropdownId,
  setOpenDropdownId,
  onOpen,
  onEdit,
  onManageDiscounts,
  onDelete,
}) => {
  const isDropdownOpen = openDropdownId === (cat.category_id || cat.id);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
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

  const thumbnail = cat.categoryImage || cat.image_url || cat.images?.[0] || null;
  const quantityCount = cat.productCount ?? 0;
  const subCount = cat.subcategories?.length ?? 0;

  return (
    <div className="cat-card">
      {/* ── Image ── */}
      <div
        className="cat-card-img-wrap"
        onClick={() => onOpen(cat)}
        title={`Open ${cat.name}`}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={cat.name}
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
          <div className="cat-card-info" onClick={() => onOpen(cat)}>
            <h3 className="cat-card-title" title={cat.name}>
              {cat.name}
            </h3>
            <div className="cat-card-qty">Quantity : {quantityCount}</div>
          </div>

          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              className="cat-card-more-btn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdownId(
                  isDropdownOpen ? null : cat.category_id || cat.id
                );
              }}
              title="More actions"
              aria-label="More options"
            >
              ···
            </button>

            {/* Dropdown Menu (Matches Mockup) */}
            {isDropdownOpen && (
              <div className="cat-dropdown">
                <button
                  type="button"
                  className="cat-dropdown-item"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onOpen(cat);
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="cat-dropdown-item"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onEdit(cat);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="cat-dropdown-item"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onManageDiscounts(cat);
                  }}
                >
                  Manage Discounts
                </button>
                <button
                  type="button"
                  className="cat-dropdown-item cat-dropdown-item--delete"
                  onClick={() => {
                    setOpenDropdownId(null);
                    onDelete(cat);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Attributes: Subcategories and Description */}
        <div className="cat-card-attrs">
          <div className="cat-attr-col">
            <div className="cat-attr-label">Subcategories :</div>
            <div className="cat-attr-val">
              {subCount} {subCount === 1 ? "Item" : "Items"}
            </div>
          </div>
          <div className="cat-attr-col">
            <div className="cat-attr-label">Status :</div>
            <div className="cat-attr-val">
              {cat.is_active !== false ? "Active" : "Draft"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main CategoryList Page ───────────────────────────────────────────────────
const CategoryList = ({
  categories = [],
  setCategories,
  onAddCategory,
  onOpenSubcategory,
  onEditCategory,
  onDeleteCategory,
  products = [],
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [blockedCategory, setBlockedCategory] = useState(null);

  // Compute live product counts if products provided
  const categoriesWithLiveCount = React.useMemo(() => {
    return categories.map((c) => {
      const catId = c.category_id || c.id;
      const count =
        products && products.length > 0
          ? products.filter((p) => String(p.category_id) === String(catId)).length
          : c.productCount ?? 0;
      return {
        ...c,
        productCount: count,
      };
    });
  }, [categories, products]);

  // Filter categories by search input
  const filtered = React.useMemo(() => {
    if (!search.trim()) return categoriesWithLiveCount;
    const q = search.toLowerCase();
    return categoriesWithLiveCount.filter((c) =>
      (c.name || "").toLowerCase().includes(q)
    );
  }, [categoriesWithLiveCount, search]);

  // Action handlers
  const handleOpen = (cat) => {
    if (onOpenSubcategory) {
      onOpenSubcategory(cat);
    } else {
      const catId = cat.category_id || cat.id;
      navigate(`/admin/subcategories?parentId=${catId}`);
    }
  };

  const handleEdit = (cat) => {
    onEditCategory?.(cat);
  };

  const handleManageDiscounts = () => {
    navigate("/admin/coupons");
  };

  const handleDelete = (cat) => {
    const catId = cat.category_id || cat.id;
    if ((cat.productCount ?? 0) > 0) {
      setBlockedCategory(cat);
      return;
    }
    const confirmed = window.confirm(
      `Delete category "${cat.name}"? This cannot be undone.`
    );
    if (confirmed) {
      onDeleteCategory?.(catId);
    }
  };

  return (
    <div className="cat-page">
      {/* ── Top Bar ── */}
      <div className="cat-topbar">
        <div className="cat-topbar-left">
          <div className="cat-search-wrap">
            <svg
              className="cat-search-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="cat-search-input"
            />
          </div>
        </div>

        <button
          type="button"
          className="cat-add-btn"
          onClick={onAddCategory}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Category
        </button>
      </div>

      {/* ── Categories Grid ── */}
      {filtered.length === 0 ? (
        <div className="cat-empty">
          <div className="cat-empty-title">No categories found</div>
          <div className="cat-empty-desc">
            {categories.length === 0
              ? "Add your first category to get started."
              : "No categories match your search."}
          </div>
          {categories.length === 0 && (
            <button
              type="button"
              className="cat-add-btn"
              style={{ marginTop: 12 }}
              onClick={onAddCategory}
            >
              + Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="cat-grid">
          {filtered.map((cat) => (
            <CategoryCard
              key={cat.category_id || cat.id}
              cat={cat}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
              onOpen={handleOpen}
              onEdit={handleEdit}
              onManageDiscounts={handleManageDiscounts}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Blocked Delete Modal ── */}
      {blockedCategory && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setBlockedCategory(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "28px 26px",
              maxWidth: 380,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#fff0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#1c1c1e",
                marginBottom: 8,
              }}
            >
              Can't delete "{blockedCategory.name}"
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#666",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              This category still has{" "}
              <strong>{blockedCategory.productCount}</strong> product
              {blockedCategory.productCount > 1 ? "s" : ""} linked to it. Move
              or delete those products first, then try again.
            </div>
            <button
              onClick={() => setBlockedCategory(null)}
              style={{
                background: "#1c1c1e",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontSize: 13.5,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryList;