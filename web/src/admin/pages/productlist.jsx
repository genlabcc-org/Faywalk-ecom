import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import "./productlist.css";
import searchEmpty from "../../assets/admin/search.png";
import editIcon from "../../assets/admin/Edit.png";
import trashIcon from "../../assets/admin/Trash.png";
import { SkeletonTable } from "../../components/ui/Skeleton";

const getFinalPrice = (product) => {
  return parseFloat(product.price) || 0;
};

const getCategoryStyle = (category) => {

  const styles = {
    Rings: { background: "#f0e6ff", color: "#7c3aed" },
    Earrings: { background: "#fce7f3", color: "#be185d" },
    Bangles: { background: "#dcfce7", color: "#15803d" },
    Necklaces: { background: "#fff7ed", color: "#c2410c" },
    Bracelets: { background: "#e0f2fe", color: "#0369a1" },
    Anklets: { background: "#FFF0D9", color: "#FF6A1C" },
  };
  return styles[category] || { background: "#f0e6ff", color: "#7c3aed" };
};

const getProductColors = (product) => {
  if (!product) return [];
  if (product.has_variants && product.variants?.length > 0) {
    return [...new Set(product.variants.map((v) => v.color).filter(Boolean))];
  }
  if (Array.isArray(product.colors)) {
    return product.colors.filter(Boolean);
  }
  if (typeof product.colors === "string") {
    const trimmed = product.colors.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        // fallback to split
      }
    }
    return product.colors.split(",").map((c) => c.trim()).filter(Boolean);
  }
  return [];
};

/* ── Mobile card view for very small screens ── */
const MobileProductCard = ({ product, onEdit, onDelete, expandedRows, toggleExpand, searchQuery = "" }) => {
  const isExpanded = expandedRows.includes(product.id);
  const hasVariants = product.has_variants && product.variants?.length > 0;
  const colors = getProductColors(product);

  return (
    <div className="pl-mobile-card">
      <div className="pl-mobile-card__top">
        <img
          src={product.images?.[0] || product.image || product.variants?.[0]?.images?.[0] || searchEmpty}
          alt={product.name}
          className="pl-mobile-card__img"
          onError={(e) => { e.target.src = searchEmpty; }}
        />
        <div className="pl-mobile-card__info">
          <span className="pl-mobile-card__name">{product.name}</span>
          <span className="pl-mobile-card__sku">SKU: {product.sku}</span>
          {colors.length > 0 && (
            <div className="pl-color-dots">
              {colors.map((c) => (
                <span key={c} className="pl-color-dot" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          )}
        </div>
        <div className="pl-mobile-card__actions">
          <button className="pl-action-btn" aria-label="Edit" onClick={() => onEdit(product)}>
            <img src={editIcon} alt="Edit" className="pl-action-icon" />
          </button>
          <button className="pl-action-btn pl-action-btn--delete" aria-label="Delete" onClick={() => onDelete(product.id)}>
            <img src={trashIcon} alt="Delete" className="pl-action-icon pl-action-icon--delete" />
          </button>
        </div>
      </div>
      <div className="pl-mobile-card__meta">
        <span className="pl-category-badge" style={getCategoryStyle(product.category)}>{product.category}</span>

        {product.subcategory && (
          <span className="pl-subcategory-badge">{product.subcategory}</span>
        )}
        <span className="pl-stock-low">{product.stock} left</span>
        <span className={`pl-status-badge ${product.status === "Visible" ? "pl-status-visible" : product.status === "Draft" ? "pl-status-draft" : ""}`}>{product.status}</span>
        <span className="pl-mobile-card__price">{"Rs." + getFinalPrice(product).toLocaleString()}</span>
      </div>
      {hasVariants && (
        <>
          <button className="pl-variant-toggle pl-variant-toggle--mobile" onClick={() => toggleExpand(product.id)}>
            {product.variants.length} variants {isExpanded ? "▲" : "▼"}
          </button>

          {isExpanded && (
            <div className="pl-mobile-variant-list">
              {product.variants.map(v => {
                const q = (searchQuery || "").toLowerCase().trim();
                const isVariantMatch = Boolean(
                  q && (
                    (v.sku && String(v.sku).toLowerCase().includes(q)) ||
                    (v.variant_id != null && String(v.variant_id).toLowerCase().includes(q)) ||
                    (v.id != null && String(v.id).toLowerCase().includes(q)) ||
                    (v.sku_id && String(v.sku_id).toLowerCase().includes(q))
                  )
                );
                return (
                  <div
                    key={v.variant_id || `${v.color}-${v.size}-${v.sku}`}
                    className="pl-mobile-variant-row"
                    style={isVariantMatch ? { background: "#fef9c3", borderRadius: "6px", padding: "6px" } : undefined}
                  >
                    <img
                      src={v.images?.[0] || searchEmpty}
                      alt={`${product.name} ${v.color || ''} ${v.size || ''}`}
                      className="pl-variant-img"
                      onError={(e) => { e.target.src = searchEmpty; }}
                    />
                    <div className="pl-mobile-variant-details">
                      <span>
                        {v.color ? (
                          <>
                            <span className="pl-color-dot" style={{ backgroundColor: v.color }} /> {v.color} {v.size ? `• ${v.size}` : ''}
                          </>
                        ) : (
                          v.size ? <span>{v.size}</span> : <span>—</span>
                        )}
                      </span>
                      <span className="pl-mobile-variant-sku" style={isVariantMatch ? { color: "#b45309", fontWeight: "700" } : undefined}>
                        SKU: {v.sku || "—"}
                      </span>
                    </div>
                    <div className="pl-mobile-variant-price">
                      <span>₹{Number(v.price).toLocaleString()}</span>
                      <span className="pl-mobile-variant-stock">{v.stock} left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ProductList = ({ onAddProduct, onEditProduct, onDeleteProduct, products = [], categories = [], loading = false, onBack }) => {
  const [visibleCount, setVisibleCount] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const observerTarget = useRef(null);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedStock, setSelectedStock] = useState("All");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [priceOpen, setPriceOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);

  const SORTS = [
    { label: "Default Sort", value: "default" },
    { label: "Price: Low to High", value: "price-asc" },
    { label: "Price: High to Low", value: "price-desc" },
    { label: "Name: A to Z", value: "name-asc" },
    { label: "Name: Z to A", value: "name-desc" },
    { label: "Stock: Low to High", value: "stock-asc" },
    { label: "Stock: High to Low", value: "stock-desc" },
  ];

  const CATEGORIES = useMemo(() => {
    const fromProps = categories.map((c) => (typeof c === "string" ? c : c?.name || c?.title)).filter(Boolean);
    const fromProducts = products.map((p) => p.category).filter(Boolean);
    const unique = Array.from(new Set([...fromProps, ...fromProducts]));
    return ["All", ...unique];
  }, [categories, products]);

  const STATUSES = ["All", "Visible", "Draft"];
  const STOCKS = ["All", "In Stock", "Low Stock", "Out of Stock"];

  const SUBCATEGORIES = useMemo(() => {
    const relevantProducts = selectedCategory === "All" ? products : products.filter((p) => p.category === selectedCategory);
    const subs = relevantProducts.map((p) => p.subcategory).filter(Boolean);
    return ["All", ...Array.from(new Set(subs))];
  }, [products, selectedCategory]);

  const toggleExpand = (id) => {
    setExpandedRows((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Detect mobile card breakpoint
  const [isMobileCard, setIsMobileCard] = useState(window.innerWidth <= 540);
  React.useEffect(() => {
    const handler = () => setIsMobileCard(window.innerWidth <= 540);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();

      const pName = p.name ? String(p.name).toLowerCase() : "";
      const pSku = p.sku ? String(p.sku).toLowerCase() : "";
      const pId = p.id != null ? String(p.id).toLowerCase() : "";
      const pProductId = p.product_id != null ? String(p.product_id).toLowerCase() : "";

      const matchVariant = Array.isArray(p.variants) && p.variants.some((v) => {
        if (!v) return false;
        const vSku = v.sku != null ? String(v.sku).toLowerCase() : "";
        const vVariantId = v.variant_id != null ? String(v.variant_id).toLowerCase() : "";
        const vId = v.id != null ? String(v.id).toLowerCase() : "";
        const vSkuId = v.sku_id != null ? String(v.sku_id).toLowerCase() : "";
        const vBarcode = v.barcode != null ? String(v.barcode).toLowerCase() : "";
        const vColor = v.color != null ? String(v.color).toLowerCase() : "";
        const vSize = v.size != null ? String(v.size).toLowerCase() : "";
        return (
          vSku.includes(q) ||
          vVariantId.includes(q) ||
          vId.includes(q) ||
          vSkuId.includes(q) ||
          vBarcode.includes(q) ||
          vColor.includes(q) ||
          vSize.includes(q)
        );
      });

      const matchSearch = !q ||
        pName.includes(q) ||
        pSku.includes(q) ||
        pId.includes(q) ||
        pProductId.includes(q) ||
        matchVariant;

      const matchCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchSubcategory = selectedSubcategory === "All" || p.subcategory === selectedSubcategory;
      const matchStatus = selectedStatus === "All" || p.status === selectedStatus;
      const matchStock = selectedStock === "All" ||
        (selectedStock === "In Stock" && p.stock > 5) ||
        (selectedStock === "Low Stock" && p.stock > 0 && p.stock <= 5) ||
        (selectedStock === "Out of Stock" && p.stock === 0);

      const pPrice = Number(p.price) || 0;
      const matchPriceFrom = !priceFrom || isNaN(Number(priceFrom)) || pPrice >= Number(priceFrom);
      const matchPriceTo = !priceTo || isNaN(Number(priceTo)) || pPrice <= Number(priceTo);

      return matchSearch && matchCategory && matchSubcategory && matchStatus && matchStock && matchPriceFrom && matchPriceTo;
    });

    if (selectedSort === "price-asc") result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (selectedSort === "price-desc") result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (selectedSort === "name-asc") result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (selectedSort === "name-desc") result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    if (selectedSort === "stock-asc") result.sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
    if (selectedSort === "stock-desc") result.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));

    return result;
  }, [products, searchQuery, selectedCategory, selectedSubcategory, selectedStatus, selectedStock, priceFrom, priceTo, selectedSort]);

  // Auto-expand variant rows when search matches a variant SKU / ID
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return;

    const matchingIds = products
      .filter((p) => {
        if (!p.has_variants || !Array.isArray(p.variants)) return false;
        return p.variants.some((v) => {
          if (!v) return false;
          const vSku = v.sku != null ? String(v.sku).toLowerCase() : "";
          const vVariantId = v.variant_id != null ? String(v.variant_id).toLowerCase() : "";
          const vId = v.id != null ? String(v.id).toLowerCase() : "";
          const vSkuId = v.sku_id != null ? String(v.sku_id).toLowerCase() : "";
          return vSku.includes(q) || vVariantId.includes(q) || vId.includes(q) || vSkuId.includes(q);
        });
      })
      .map((p) => p.id);

    if (matchingIds.length > 0) {
      setExpandedRows((prev) => Array.from(new Set([...prev, ...matchingIds])));
    }
  }, [searchQuery, products]);

  // Reset visibleCount to 10 whenever filters or search criteria change
  useEffect(() => {
    setVisibleCount(10);
  }, [searchQuery, selectedCategory, selectedSubcategory, selectedStatus, selectedStock, priceFrom, priceTo, selectedSort]);

  const totalItems = filteredProducts.length;
  const currentProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      if (prev < filteredProducts.length) {
        return Math.min(prev + 10, filteredProducts.length);
      }
      return prev;
    });
  }, [filteredProducts.length]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0,
      }
    );

    observer.observe(target);

    // Also listen to scroll on container (.db__main) or window for responsive loading
    const scrollParent = target.closest(".db__main") || window;
    const handleScroll = () => {
      if (scrollParent === window) {
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400) {
          loadMore();
        }
      } else {
        if (scrollParent.scrollTop + scrollParent.clientHeight >= scrollParent.scrollHeight - 400) {
          loadMore();
        }
      }
    };

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollParent.removeEventListener("scroll", handleScroll);
    };
  }, [loadMore]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") { setSearchQuery(searchInput); setVisibleCount(10); }
    if (e.key === "Escape") { setSearchInput(""); setSearchQuery(""); setVisibleCount(10); }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    setSearchQuery(val);
    setVisibleCount(10);
  };

  const handleEdit = (product) => { if (onEditProduct) onEditProduct(product); };

  const requestDelete = (id) => {
    setPendingDeleteId(id);
  };

  const pendingProduct = useMemo(() => {
    if (pendingDeleteId === null) return null;
    return products.find((p) => (p.id ?? p.product_id) === pendingDeleteId) || null;
  }, [pendingDeleteId, products]);

  useEffect(() => {
    if (pendingDeleteId === null) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting) {
        setPendingDeleteId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingDeleteId, isDeleting]);

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    if (onDeleteProduct) {
      try {
        setIsDeleting(true);
        await onDeleteProduct(id);
      } catch (err) {
        console.error("Error deleting product:", err);
      } finally {
        setIsDeleting(false);
        setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
        setPendingDeleteId(null);
      }
    } else {
      setPendingDeleteId(null);
    }
  };



  return (
    <div className="product-list">

      {/* Header */}
      <div className="pl-header">
        <div className="pl-title">
          <h1>All products</h1>
          <span className="pl-count">{products.length} Items</span>
        </div>

      </div>

      {/* Filters + Search */}
      <div className="pl-filters">
        <div className="pl-filter-group">
          {/* Category Dropdown */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setCategoryOpen(o => !o); setStatusOpen(false); setStockOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              <span>{selectedCategory === "All" ? "All categories" : selectedCategory}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {categoryOpen && (
              <div className="pl-dropdown-menu">
                {CATEGORIES.map(c => (
                  <div key={c} className={`pl-dropdown-item ${selectedCategory === c ? 'active' : ''}`}
                    onClick={() => { setSelectedCategory(c); setCategoryOpen(false); setCurrentPage(1); setSelectedSubcategory("All"); }}>
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subcategory Dropdown — new */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setSubcategoryOpen(o => !o); setCategoryOpen(false); setStatusOpen(false); setStockOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h12M3 18h6" />
              </svg>
              <span>{selectedSubcategory === "All" ? "All subcategories" : selectedSubcategory}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {subcategoryOpen && (
              <div className="pl-dropdown-menu">
                {SUBCATEGORIES.map(s => (
                  <div key={s} className={`pl-dropdown-item ${selectedSubcategory === s ? 'active' : ''}`}
                    onClick={() => { setSelectedSubcategory(s); setSubcategoryOpen(false); setCurrentPage(1); }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setStatusOpen(o => !o); setCategoryOpen(false); setSubcategoryOpen(false); setStockOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span>{selectedStatus === "All" ? "All Status" : selectedStatus}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {statusOpen && (
              <div className="pl-dropdown-menu">
                {STATUSES.map(s => (
                  <div key={s} className={`pl-dropdown-item ${selectedStatus === s ? 'active' : ''}`}
                    onClick={() => { setSelectedStatus(s); setStatusOpen(false); setCurrentPage(1); }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Dropdown (From - To) */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setPriceOpen(o => !o); setCategoryOpen(false); setSubcategoryOpen(false); setStatusOpen(false); setStockOpen(false); setSortOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>{priceFrom || priceTo ? `₹${priceFrom || 0} – ₹${priceTo || '∞'}` : "Price: All"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {priceOpen && (
              <div className="pl-dropdown-menu pl-price-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                <div className="pl-price-filter-popover">
                  <div className="pl-price-inputs-row">
                    <div className="pl-price-input-col">
                      <label className="pl-price-label">From (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={priceFrom}
                        onChange={(e) => { setPriceFrom(e.target.value); setCurrentPage(1); }}
                        className="pl-price-input"
                      />
                    </div>
                    <div className="pl-price-input-col">
                      <label className="pl-price-label">To (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={priceTo}
                        onChange={(e) => { setPriceTo(e.target.value); setCurrentPage(1); }}
                        className="pl-price-input"
                      />
                    </div>
                  </div>
                  {(priceFrom || priceTo) && (
                    <button
                      type="button"
                      className="pl-price-clear-btn"
                      onClick={() => { setPriceFrom(""); setPriceTo(""); setCurrentPage(1); }}
                    >
                      Clear Price
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setSortOpen(o => !o); setCategoryOpen(false); setSubcategoryOpen(false); setStatusOpen(false); setStockOpen(false); setPriceOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M7 12h10M10 18h4" />
              </svg>
              <span>{SORTS.find(s => s.value === selectedSort)?.label || "Sort"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {sortOpen && (
              <div className="pl-dropdown-menu">
                {SORTS.map(s => (
                  <div key={s.value} className={`pl-dropdown-item ${selectedSort === s.value ? 'active' : ''}`}
                    onClick={() => { setSelectedSort(s.value); setSortOpen(false); setCurrentPage(1); }}>
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>


        <div className="pl-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
          {searchInput && (
            <button
              className="pl-search-clear"
              onClick={() => { setSearchInput(""); setSearchQuery(""); setCurrentPage(1); }}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {searchQuery && (
        <p className="pl-search-label">
          Results for <strong>"{searchQuery}"</strong> — {totalItems} product{totalItems !== 1 ? "s" : ""} found
        </p>
      )}

      {/* ── Mobile card list (≤540px) ── */}
      {isMobileCard ? (
        <div className="pl-mobile-list">
          {currentProducts.length === 0 ? (
            <div className="pl-table-wrapper">
              <div className="pl-empty-state" style={{ padding: "60px 20px" }}>
                <div className="pl-empty-content">
                  <img src={searchEmpty} alt="No results" className="pl-empty-img" />
                  <p className="pl-empty-title">No results found</p>
                  <span className="pl-empty-subtitle">
                    {searchQuery
                      ? `No products match "${searchQuery}". Try a different name or SKU.`
                      : "No products yet. Click Add product to get started."}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            currentProducts.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={requestDelete}
                expandedRows={expandedRows}
                toggleExpand={toggleExpand}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      ) : (
        /* ── Desktop / tablet table ── */
        <div className="ao__table-wrap pl-table-wrapper">
          <table className="ao__table pl-table">
            <thead>
              <tr>
                <th className="pl-product-col">Product</th>
                <th className="pl-category-col">Category</th>
                <th className="pl-subcategory-col">Subcategory</th>
                <th className="pl-price-col">Price</th>
                <th className="pl-stock-col">Stock</th>
                <th className="pl-status-col">Status</th>
                <th className="pl-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: "20px" }}>
                    <SkeletonTable rows={5} cols={7} />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="pl-empty-state">
                    <div className="pl-empty-content">
                      <img src={searchEmpty} alt="No results" className="pl-empty-img" />
                      <p className="pl-empty-title">No results found</p>
                      <span className="pl-empty-subtitle">
                        {searchQuery
                          ? `No products match "${searchQuery}". Try a different name or SKU.`
                          : "No products yet. Click Add product to get started."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr key={product.id} className="ao__row">
                      <td className="pl-product-col">
                        <div className="pl-product-info">
                          <img
                            src={product.images?.[0] || product.image || product.variants?.[0]?.images?.[0] || searchEmpty}
                            alt={product.name}
                            className="pl-product-img"
                            onError={(e) => { e.target.src = searchEmpty; }}
                          />
                          <div className="pl-product-details">
                            <span className="pl-product-name">{product.name}</span>
                            {product.has_variants && product.variants?.length > 0 && (
                              <button
                                className="pl-variant-toggle"
                                onClick={() => toggleExpand(product.id)}
                              >
                                {product.variants.length} variants {expandedRows.includes(product.id) ? "▲" : "▼"}
                              </button>
                            )}

                            <span className="pl-product-sku">SKU: {product.sku}</span>
                            {getProductColors(product).length > 0 && (
                              <div className="pl-color-dots">
                                {getProductColors(product).map((c) => (
                                  <span key={c} className="pl-color-dot" style={{ backgroundColor: c }} title={c} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="pl-category-col">
                        <span className="pl-category-badge" style={getCategoryStyle(product.category)}>
                          {product.category}
                        </span>
                      </td>
                      <td className="pl-subcategory-col">
                        {product.subcategory ? (
                          <span className="pl-subcategory-badge">{product.subcategory}</span>
                        ) : (
                          <span className="pl-subcategory-none">—</span>
                        )}
                      </td>
                      <td className="pl-price-col">
                        {product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price) && (
                          <span className="pl-price-compare">
                            Rs.{parseFloat(product.compare_price).toLocaleString()}
                          </span>
                        )}
                        <span className="pl-price-final">
                          Rs.{getFinalPrice(product).toLocaleString()}
                        </span>
                      </td>
                      <td className="pl-stock-col">
                        <span className="pl-stock-low">{product.stock} left</span>
                      </td>
                      <td className="pl-status-col">
                        <span className={
                          "pl-status-badge " +
                          (product.status === "Visible" ? "pl-status-visible" :
                            product.status === "Draft" ? "pl-status-draft" : "")
                        }>
                          {product.status}
                        </span>
                      </td>
                      <td className="pl-actions-col">
                        <button className="pl-action-btn" aria-label="Edit" onClick={() => handleEdit(product)}>
                          <img src={editIcon} alt="Edit" className="pl-action-icon" />
                        </button>
                        <button
                          className="pl-action-btn pl-action-btn--delete"
                          aria-label="Delete"
                          onClick={() => requestDelete(product.id)}
                        >
                          <img src={trashIcon} alt="Delete" className="pl-action-icon pl-action-icon--delete" />
                        </button>
                      </td>
                    </tr>

                    {product.has_variants && expandedRows.includes(product.id) && (
                      <tr className="pl-variant-subrow">
                        <td colSpan='7'>
                          <table className="pl-variant-table">
                            <thead>
                              <tr>
                                <th>Image</th>
                                <th>Color</th>
                                <th>Size</th>
                                <th>SKU</th>
                                <th>Price</th>
                                <th>Stock</th>
                              </tr>
                            </thead>
                            <tbody>
                              {product.variants.map(v => {
                                const q = searchQuery.toLowerCase().trim();
                                const isVariantMatch = Boolean(
                                  q && (
                                    (v.sku && String(v.sku).toLowerCase().includes(q)) ||
                                    (v.variant_id != null && String(v.variant_id).toLowerCase().includes(q)) ||
                                    (v.id != null && String(v.id).toLowerCase().includes(q)) ||
                                    (v.sku_id && String(v.sku_id).toLowerCase().includes(q))
                                  )
                                );
                                return (
                                  <tr
                                    key={v.variant_id || `${v.color}-${v.size}-${v.sku}`}
                                    style={isVariantMatch ? { background: "#fef9c3" } : undefined}
                                  >
                                    <td>
                                      <img
                                        src={v.images?.[0] || searchEmpty}
                                        alt={`${product.name} ${v.color || ''} ${v.size || ''}`}
                                        className="pl-variant-img"
                                        onError={(e) => { e.target.src = searchEmpty; }}
                                      />
                                    </td>
                                    <td>
                                      {v.color ? (
                                        <>
                                          <span className="pl-color-dot" style={{ backgroundColor: v.color }} /> {v.color}
                                        </>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td>{v.size || '—'}</td>
                                    <td>
                                      <span style={isVariantMatch ? { color: "#b45309", fontWeight: "700" } : undefined}>
                                        {v.sku || "—"}
                                      </span>
                                    </td>
                                    <td>₹{Number(v.price).toLocaleString()}</td>
                                    <td>{v.stock}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Infinite Scroll Footer / Sentinel */}
      <div className="pl-scroll-footer" ref={observerTarget}>
        <span className="pl-showing">
          {totalItems === 0
            ? "Showing 0 products"
            : visibleCount >= totalItems
            ? `Showing all ${totalItems} products`
            : `Showing ${Math.min(visibleCount, totalItems)} of ${totalItems} products`}
        </span>
        {visibleCount < totalItems && (
          <div className="pl-loading-more">
            <span className="admin-btn-spinner admin-btn-spinner--dark" />
            <span>Loading more products...</span>
          </div>
        )}
      </div>
      {pendingDeleteId !== null && typeof document !== "undefined" && createPortal(
        <div
          className="pl-confirm-overlay"
          onClick={() => !isDeleting && setPendingDeleteId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pl-confirm-dialog-title"
        >
          <div className="pl-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pl-confirm-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 id="pl-confirm-dialog-title" className="pl-confirm-title">Delete Product</h3>
            <p className="pl-confirm-text">
              Are you sure you want to delete {pendingProduct?.name ? <strong>"{pendingProduct.name}"</strong> : "this product"}? This action cannot be undone.
            </p>
            <div className="pl-confirm-actions">
              <button
                type="button"
                className="pl-confirm-cancel"
                onClick={() => setPendingDeleteId(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pl-confirm-ok admin-btn-with-spinner"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="admin-btn-spinner" /> Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProductList;