import React, { useEffect } from "react";
import "./ProductFilter.css";

export default function ProductFilter({
  sortBy = "featured",
  onSortChange,
  availableCategories = [],
  selectedCategories = [],
  onCategoryToggle,
  // backwards compatibility aliases
  selectedGenders = [],
  onGenderToggle,
  availableSubcategories = [],
  selectedSubcategories = [],
  onSubcategoryToggle,
  availableFabrics = [],
  selectedFabrics = [],
  onFabricToggle,
  fabricCounts = {},
  availableSizes = [],
  selectedSizes = [],
  onSizeToggle,
  onClearFilters,
  className = "",
  // Mobile drawer controls
  mobileOpen = false,
  onMobileClose,
  totalCount,
}) {
  // Normalize categories
  const activeCategories = selectedCategories.length > 0 ? selectedCategories : selectedGenders;
  const handleCategoryClick = onCategoryToggle || onGenderToggle;

  // Normalize category objects: [{ name, count, id }]
  const categoryItems = (availableCategories || []).map((cat) => {
    if (typeof cat === "string") return { id: cat, name: cat, count: null };
    return { id: cat.id || cat.category_id || cat.name, name: cat.name, count: cat.count };
  });

  // Normalize subcategory objects: [{ name, count, id }]
  const subcategoryItems = (availableSubcategories || []).map((sub) => {
    if (typeof sub === "string") return { id: sub, name: sub, count: null };
    return { id: sub.id || sub.subcategory_id || sub.name, name: sub.name, count: sub.count };
  });

  // Normalize fabric objects: [{ name, count }]
  const fabricItems = (availableFabrics || []).map((fab) => {
    if (typeof fab === "string") {
      return { name: fab, count: fabricCounts[fab] ?? null };
    }
    return { name: fab.name, count: fab.count ?? fabricCounts[fab.name] ?? null };
  });

  // Normalize size objects: [{ size, count }]
  const sizeItems = (availableSizes || []).map((s) => {
    if (typeof s === "object" && s !== null) {
      return { size: String(s.size || s.name || "").trim(), count: s.count };
    }
    return { size: String(s).trim(), count: null };
  }).filter((s) => s.size);

  const hasActiveFilters =
    sortBy !== "featured" ||
    activeCategories.length > 0 ||
    selectedSubcategories.length > 0 ||
    selectedFabrics.length > 0 ||
    selectedSizes.length > 0;

  const activeCount =
    (sortBy !== "featured" ? 1 : 0) +
    activeCategories.length +
    selectedSubcategories.length +
    selectedFabrics.length +
    selectedSizes.length;

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("filter-drawer-open");
    } else {
      document.body.classList.remove("filter-drawer-open");
    }
    return () => {
      document.body.classList.remove("filter-drawer-open");
    };
  }, [mobileOpen]);

  // Reusable Filter Sections
  const renderFilterSections = (isMobile = false) => (
    <>
      {/* Price Sort Filter */}
      <div className="filter-group">
        <h3 className="filter-heading">Sort By</h3>
        {isMobile ? (
          <div className="filter-sort-pills">
            <button
              type="button"
              className={`filter-sort-pill ${sortBy === "featured" ? "active" : ""}`}
              onClick={() => onSortChange && onSortChange("featured")}
            >
              Featured
            </button>
            <button
              type="button"
              className={`filter-sort-pill ${sortBy === "price-low-high" ? "active" : ""}`}
              onClick={() => onSortChange && onSortChange("price-low-high")}
            >
              Price: Low to High
            </button>
            <button
              type="button"
              className={`filter-sort-pill ${sortBy === "price-high-low" ? "active" : ""}`}
              onClick={() => onSortChange && onSortChange("price-high-low")}
            >
              Price: High to Low
            </button>
          </div>
        ) : (
          <div className="filter-options">
            <label className="custom-filter-checkbox">
              <input
                type="checkbox"
                checked={sortBy === "price-low-high"}
                onChange={() => onSortChange && onSortChange("price-low-high")}
              />
              <span className="checkbox-box"></span>
              <span className="checkbox-text">Price: Low to high</span>
            </label>
            <label className="custom-filter-checkbox">
              <input
                type="checkbox"
                checked={sortBy === "price-high-low"}
                onChange={() => onSortChange && onSortChange("price-high-low")}
              />
              <span className="checkbox-box"></span>
              <span className="checkbox-text">Price: High to low</span>
            </label>
          </div>
        )}
      </div>

      {/* Real Category Filter */}
      {categoryItems.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-heading">Category</h3>
          <div className="filter-options">
            {categoryItems.map((cat) => {
              const isChecked = activeCategories.some(
                (c) => String(c).toLowerCase() === String(cat.name).toLowerCase()
              );
              return (
                <label key={cat.id || cat.name} className="custom-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCategoryClick && handleCategoryClick(cat.name)}
                  />
                  <span className="checkbox-box"></span>
                  <span className="checkbox-text">
                    {cat.name}
                    {cat.count != null && (
                      <span className="filter-count"> ({cat.count})</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Real Subcategory Filter */}
      {subcategoryItems.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-heading">Subcategory</h3>
          <div className="filter-options">
            {subcategoryItems.map((sub) => {
              const isChecked = selectedSubcategories.some(
                (s) => String(s).toLowerCase() === String(sub.name).toLowerCase()
              );
              return (
                <label key={sub.id || sub.name} className="custom-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onSubcategoryToggle && onSubcategoryToggle(sub.name)}
                  />
                  <span className="checkbox-box"></span>
                  <span className="checkbox-text">
                    {sub.name}
                    {sub.count != null && (
                      <span className="filter-count"> ({sub.count})</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Real Fabric / Material Filter */}
      {fabricItems.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-heading">Fabric</h3>
          <div className="filter-options">
            {fabricItems.map((fab) => {
              const isChecked = selectedFabrics.some(
                (f) => String(f).toLowerCase() === String(fab.name).toLowerCase()
              );
              return (
                <label key={fab.name} className="custom-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onFabricToggle && onFabricToggle(fab.name)}
                  />
                  <span className="checkbox-box"></span>
                  <span className="checkbox-text">
                    {fab.name}
                    {fab.count != null && (
                      <span className="filter-count"> ({fab.count})</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Real Size Filter (Styled as clean visual chips) */}
      {sizeItems.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-heading">Size</h3>
          <div className="filter-size-grid">
            {sizeItems.map((item) => {
              const isChecked = selectedSizes.some(
                (s) => String(s).toLowerCase() === String(item.size).toLowerCase()
              );
              return (
                <button
                  type="button"
                  key={item.size}
                  className={`filter-size-chip ${isChecked ? "active" : ""}`}
                  onClick={() => onSizeToggle && onSizeToggle(item.size)}
                  aria-pressed={isChecked}
                >
                  <span className="size-chip-text">{item.size}</span>
                  {item.count != null && (
                    <span className="size-chip-count">{item.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ─── Desktop Left Sidebar ─── */}
      <aside
        className={`trending-sidebar product-filter-sidebar desktop-filter-sidebar ${className}`}
        aria-label="Product filters"
      >
        {/* Active Filter Clear Header */}
        {hasActiveFilters && onClearFilters && (
          <div className="product-filter-header">
            <span className="product-filter-badge">
              {activeCount} Filter{activeCount > 1 ? "s" : ""} Active
            </span>
            <button
              type="button"
              className="product-filter-clear-btn"
              onClick={onClearFilters}
            >
              Clear All
            </button>
          </div>
        )}

        {renderFilterSections(false)}
      </aside>

      {/* ─── Mobile Slide-Up Filter Drawer Modal ─── */}
      {mobileOpen && (
        <div
          className="mobile-filter-drawer-overlay"
          onClick={onMobileClose}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="mobile-filter-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="mobile-drawer-handle-bar">
              <div className="mobile-drawer-handle"></div>
            </div>

            {/* Drawer Header */}
            <div className="mobile-drawer-header">
              <div className="mobile-drawer-title-wrap">
                <h2 className="mobile-drawer-title">Filter & Sort</h2>
                {activeCount > 0 && (
                  <span className="mobile-drawer-active-count">
                    {activeCount} active
                  </span>
                )}
              </div>
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={onMobileClose}
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="mobile-drawer-body">
              {renderFilterSections(true)}
            </div>

            {/* Drawer Sticky Footer */}
            <div className="mobile-drawer-footer">
              {hasActiveFilters && onClearFilters && (
                <button
                  type="button"
                  className="mobile-drawer-clear-btn"
                  onClick={onClearFilters}
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                className="mobile-drawer-apply-btn"
                onClick={onMobileClose}
              >
                {typeof totalCount === "number"
                  ? `View ${totalCount} ${totalCount === 1 ? "Product" : "Products"}`
                  : "Apply Filters"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
