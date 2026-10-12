import React from "react";
import "./ProductFilter.css";

export default function ProductFilter({
  sortBy = "featured",
  onSortChange,
  selectedGenders = [],
  onGenderToggle,
  selectedFabrics = [],
  onFabricToggle,
  selectedSizes = [],
  onSizeToggle,
  availableSizes = [],
  fabricCounts = {},
  onClearFilters,
  className = "",
}) {
  const hasActiveFilters =
    sortBy !== "featured" ||
    selectedGenders.length > 0 ||
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

      {/* Price Filter */}
      <div className="filter-group">
        <h3 className="filter-heading">Price</h3>
        <div className="filter-options">
          <label className="custom-filter-checkbox">
            <input
              type="checkbox"
              checked={sortBy === "price-low-high"}
              onChange={() => onSortChange("price-low-high")}
            />
            <span className="checkbox-box"></span>
            <span className="checkbox-text">Low to high</span>
          </label>
          <label className="custom-filter-checkbox">
            <input
              type="checkbox"
              checked={sortBy === "price-high-low"}
              onChange={() => onSortChange("price-high-low")}
            />
            <span className="checkbox-box"></span>
            <span className="checkbox-text">High to low</span>
          </label>
        </div>
      </div>

      {/* Category / Gender Filter */}
      <div className="filter-group">
        <h3 className="filter-heading">Category</h3>
        <div className="filter-options">
          <label className="custom-filter-checkbox">
            <input
              type="checkbox"
              checked={selectedGenders.includes("Male")}
              onChange={() => onGenderToggle("Male")}
            />
            <span className="checkbox-box"></span>
            <span className="checkbox-text">Male</span>
          </label>
          <label className="custom-filter-checkbox">
            <input
              type="checkbox"
              checked={selectedGenders.includes("Female")}
              onChange={() => onGenderToggle("Female")}
            />
            <span className="checkbox-box"></span>
            <span className="checkbox-text">Female</span>
          </label>
        </div>
      </div>

      {/* Fabric Filter */}
      <div className="filter-group">
        <h3 className="filter-heading">Fabric</h3>
        <div className="filter-options">
          <label className="custom-filter-checkbox">
            <input
              type="checkbox"
              checked={selectedFabrics.includes("Cotton")}
              onChange={() => onFabricToggle("Cotton")}
            />
            <span className="checkbox-box"></span>
            <span className="checkbox-text">
              Cotton{fabricCounts.Cotton != null ? ` (${fabricCounts.Cotton})` : ""}
            </span>
          </label>
        </div>
      </div>

      {/* Size Filter */}
      {availableSizes && availableSizes.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-heading">Size</h3>
          <div className="filter-options">
            {availableSizes.map((size) => (
              <label key={size} className="custom-filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(size)}
                  onChange={() => onSizeToggle(size)}
                />
                <span className="checkbox-box"></span>
                <span className="checkbox-text">{size}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
