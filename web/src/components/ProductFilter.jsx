import React from "react";
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

  return (
    <aside className={`trending-sidebar product-filter-sidebar ${className}`} aria-label="Product filters">
      {/* Active Filter Clear Header */}
      {hasActiveFilters && onClearFilters && (
        <div className="product-filter-header">
          <span className="product-filter-badge">Filters Active</span>
          <button
            type="button"
            className="product-filter-clear-btn"
            onClick={onClearFilters}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Price Sort Filter */}
      <div className="filter-group">
        <h3 className="filter-heading">Price</h3>
        <div className="filter-options">
          <label className="custom-filter-checkbox">
            <input
              type="checkbox"
              checked={sortBy === "price-low-high"}
              onChange={() => onSortChange && onSortChange("price-low-high")}
            />
            <span className="checkbox-box"></span>
            <span className="checkbox-text">Low to high</span>
          </label>
          <label className="custom-filter-checkbox">
            <input
              type="checkbox"
              checked={sortBy === "price-high-low"}
              onChange={() => onSortChange && onSortChange("price-high-low")}
            />
            <span className="checkbox-box"></span>
            <span className="checkbox-text">High to low</span>
          </label>
        </div>
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

      {/* Real Size Filter */}
      {sizeItems.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-heading">Size</h3>
          <div className="filter-options">
            {sizeItems.map((item) => {
              const isChecked = selectedSizes.some(
                (s) => String(s).toLowerCase() === String(item.size).toLowerCase()
              );
              return (
                <label key={item.size} className="custom-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onSizeToggle && onSizeToggle(item.size)}
                  />
                  <span className="checkbox-box"></span>
                  <span className="checkbox-text">
                    {item.size}
                    {item.count != null && (
                      <span className="filter-count"> ({item.count})</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
