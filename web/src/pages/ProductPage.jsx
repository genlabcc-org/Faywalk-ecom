import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import SiteHeader from "../components/SiteHeader";
import TopBar from "../components/TopBar";
  import SiteFooter from "../components/SiteFooter";
import Toast from "../components/Toast";
import { SkeletonProductCard } from "../components/ui/Skeleton";
import { productService } from "../services/productService";
import { getNavPath } from "../services/categoryRoute";
import ProductFilter from "../components/ProductFilter";
import "./ProductPage.css";

const DESKTOP_ITEMS_PER_PAGE = 9;
const MOBILE_ITEMS_PER_PAGE = 10;
const EMPTY_PRODUCTS = [];

// Loading Skeleton
const ProductSkeleton = () => <SkeletonProductCard />;

export default function ProductPage({ category = "Trending" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subcategoryParam = searchParams.get("sub") || "";
  const searchQueryParam = searchParams.get("search") || "";

  // Viewport detection
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const itemsPerPage = isMobile ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE;

  // Filter states
  const [sortBy, setSortBy] = useState("featured"); // "price-low-high", "price-high-low", "featured"
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState(() =>
    subcategoryParam.trim() ? [subcategoryParam.trim()] : []
  );
  const [selectedFabrics, setSelectedFabrics] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Zustand Store Hooks
  const products = useStore(state => state.products[category] || EMPTY_PRODUCTS);
  const loading = useStore(state => state.loadingProducts);
  const fetchProductsByCategory = useStore(state => state.fetchProductsByCategory);
  const addToCart = useStore(state => state.addToCart);
  const setSelectedProduct = useStore(state => state.setSelectedProduct);

  const allCategories = useStore(state => state.categories);
  const fetchCategories = useStore(state => state.fetchCategories);

  useEffect(() => {
    fetchProductsByCategory(category);
  }, [category, fetchProductsByCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Sync subcategory param from URL
  useEffect(() => {
    if (subcategoryParam.trim()) {
      setSelectedSubcategories([subcategoryParam.trim()]);
    }
  }, [subcategoryParam]);

  // Reset filters when category changes
  useEffect(() => {
    setSelectedCategories([]);
    setSelectedSubcategories(subcategoryParam.trim() ? [subcategoryParam.trim()] : []);
    setSelectedFabrics([]);
    setSelectedSizes([]);
    setSortBy("featured");
    setCurrentPage(1);
  }, [category, subcategoryParam]);

  const showToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleNavClick = (link) => {
    if (link === category) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(getNavPath(link, allCategories));
  };

  const handlePriceSortToggle = (type) => {
    setSortBy(prev => (prev === type ? "featured" : type));
    setCurrentPage(1);
  };

  const handleCategoryToggle = (catName) => {
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
    setCurrentPage(1);
  };

  const handleSubcategoryToggle = (subName) => {
    setSelectedSubcategories(prev =>
      prev.includes(subName) ? prev.filter(s => s !== subName) : [...prev, subName]
    );
    setCurrentPage(1);
  };

  const handleFabricToggle = (fabric) => {
    setSelectedFabrics(prev =>
      prev.includes(fabric) ? prev.filter(f => f !== fabric) : [...prev, fabric]
    );
    setCurrentPage(1);
  };

  const handleSizeToggle = (size) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedFabrics([]);
    setSelectedSizes([]);
    setSortBy("featured");
    setCurrentPage(1);
  };

  // Active filter chips list for mobile and quick dismissal
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (sortBy === "price-low-high") {
      chips.push({ label: "Price: Low to High", onRemove: () => handlePriceSortToggle("price-low-high") });
    } else if (sortBy === "price-high-low") {
      chips.push({ label: "Price: High to Low", onRemove: () => handlePriceSortToggle("price-high-low") });
    }
    selectedCategories.forEach(cat => {
      chips.push({ label: cat, onRemove: () => handleCategoryToggle(cat) });
    });
    selectedSubcategories.forEach(sub => {
      chips.push({ label: sub, onRemove: () => handleSubcategoryToggle(sub) });
    });
    selectedFabrics.forEach(fab => {
      chips.push({ label: fab, onRemove: () => handleFabricToggle(fab) });
    });
    selectedSizes.forEach(size => {
      chips.push({ label: `Size: ${size}`, onRemove: () => handleSizeToggle(size) });
    });
    return chips;
  }, [sortBy, selectedCategories, selectedSubcategories, selectedFabrics, selectedSizes]);

  // Dynamically compute real categories from Supabase with live counts
  const availableCategories = useMemo(() => {
    const active = (allCategories || []).filter(c => c.is_active !== false);
    if (active.length > 0) {
      return active.map(c => {
        const count = products.filter(p => {
          const pCat = String(p.category || "").toLowerCase();
          const cName = String(c.name || "").toLowerCase();
          return pCat === cName || String(p.category_id) === String(c.category_id);
        }).length;
        return {
          id: c.category_id || c.id,
          name: c.name,
          count
        };
      });
    }

    const catMap = new Map();
    products.forEach(p => {
      const name = p.category;
      if (name) catMap.set(name, (catMap.get(name) || 0) + 1);
    });
    return Array.from(catMap.entries()).map(([name, count]) => ({ id: name, name, count }));
  }, [allCategories, products]);

  // Dynamically compute real subcategories from Supabase with live counts
  const availableSubcategories = useMemo(() => {
    const isAll = !category || category.toLowerCase() === "all products" || category.toLowerCase() === "all" || category.toLowerCase() === "trending";
    let subList = [];
    if (!isAll) {
      const currentCat = (allCategories || []).find(c => (c.name || "").toLowerCase() === category.toLowerCase());
      subList = (currentCat?.subcategories || []).filter(s => s.is_active !== false);
    } else {
      (allCategories || []).forEach(c => {
        if (Array.isArray(c.subcategories)) {
          subList.push(...c.subcategories.filter(s => s.is_active !== false));
        }
      });
    }

    const subMap = new Map();
    subList.forEach(s => {
      if (s.name && !subMap.has(s.name.toLowerCase())) {
        subMap.set(s.name.toLowerCase(), {
          id: s.subcategory_id || s.name,
          name: s.name,
          count: 0
        });
      }
    });

    products.forEach(p => {
      if (p.subcategory) {
        const low = p.subcategory.toLowerCase();
        if (!subMap.has(low)) {
          subMap.set(low, {
            id: p.subcategory_id || p.subcategory,
            name: p.subcategory,
            count: 0
          });
        }
      }
    });

    subMap.forEach((entry, low) => {
      entry.count = products.filter(p => {
        const pSub = String(p.subcategory || "").toLowerCase();
        return pSub === low || String(p.subcategory_id) === String(entry.id);
      }).length;
    });

    return Array.from(subMap.values());
  }, [allCategories, category, products]);

  // Dynamically compute real fabrics/materials from Supabase with live counts
  const availableFabrics = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      const mat = (p.material || p.fabric || "").trim();
      if (mat) {
        const parts = mat.split(/[,/]+/).map(s => s.trim()).filter(Boolean);
        parts.forEach(part => {
          const formatted = part.charAt(0).toUpperCase() + part.slice(1);
          counts[formatted] = (counts[formatted] || 0) + 1;
        });
      }
    });

    const list = Object.entries(counts).map(([name, count]) => ({
      name,
      count
    }));

    if (list.length === 0 && products.length > 0) {
      return [{ name: "Cotton", count: products.length }];
    }

    return list;
  }, [products]);

  // Dynamically compute real sizes from product catalog with live counts
  const availableSizes = useMemo(() => {
    const sizeCounts = new Map();
    products.forEach(p => {
      const pSizes = Array.isArray(p.sizes) ? p.sizes : [];
      pSizes.forEach(s => {
        const str = String(s).trim();
        if (str) sizeCounts.set(str, (sizeCounts.get(str) || 0) + 1);
      });
    });

    if (sizeCounts.size > 0) {
      return Array.from(sizeCounts.entries()).map(([size, count]) => ({
        size,
        count
      })).sort((a, b) => {
        const numA = parseFloat(a.size);
        const numB = parseFloat(b.size);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.size.localeCompare(b.size);
      });
    }

    return [];
  }, [products]);

  // Real Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      // Search query filter
      if (searchQueryParam.trim()) {
        const q = searchQueryParam.trim().toLowerCase();
        const text = `${product.name || ""} ${product.desc || ""} ${product.subcategory || ""} ${product.category || ""} ${product.sku || ""}`.toLowerCase();
        const variantMatch = Array.isArray(product.product_variants) && product.product_variants.some(v => 
          (v.sku && String(v.sku).toLowerCase().includes(q)) ||
          (v.variant_id && String(v.variant_id).toLowerCase().includes(q))
        );
        if (!text.includes(q) && !variantMatch) return false;
      }

      // Real category filter
      if (selectedCategories.length > 0) {
        const pCat = String(product.category || "").toLowerCase();
        const matchesCategory = selectedCategories.some(cat => {
          const cLow = String(cat).toLowerCase();
          return pCat === cLow || String(product.category_id) === String(cat);
        });
        if (!matchesCategory) return false;
      }

      // Real subcategory filter
      if (selectedSubcategories.length > 0) {
        const pSub = String(product.subcategory || "").toLowerCase();
        const matchesSubcategory = selectedSubcategories.some(sub => {
          const sLow = String(sub).toLowerCase();
          return pSub === sLow || String(product.subcategory_id) === String(sub);
        });
        if (!matchesSubcategory) return false;
      } else if (subcategoryParam.trim()) {
        const targetSub = subcategoryParam.trim().toLowerCase();
        const pSub = String(product.subcategory || product.subcategory_id || "").trim().toLowerCase();
        if (pSub !== targetSub) return false;
      }

      // Real fabric filter
      if (selectedFabrics.length > 0) {
        const pMat = String(product.material || product.fabric || "Cotton").toLowerCase();
        const pName = String(product.name || "").toLowerCase();
        const pDesc = String(product.desc || "").toLowerCase();
        const matchesFabric = selectedFabrics.some(f => {
          const fLow = String(f).toLowerCase();
          return pMat.includes(fLow) || pName.includes(fLow) || pDesc.includes(fLow);
        });
        if (!matchesFabric) return false;
      }

      // Real size filter
      if (selectedSizes.length > 0) {
        const prodSizes = Array.isArray(product.sizes) ? product.sizes.map(s => String(s).toLowerCase().trim()) : [];
        const hasMatchingSize = selectedSizes.some(s =>
          prodSizes.includes(String(s).toLowerCase().trim())
        );
        if (!hasMatchingSize) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === "price-low-high") {
      result = [...result].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === "price-high-low") {
      result = [...result].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }

    return result;
  }, [products, subcategoryParam, searchQueryParam, selectedCategories, selectedSubcategories, selectedFabrics, selectedSizes, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handlePageChange = (direction) => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleProductCardClick = (product) => {
    const formattedProduct = {
      ...product,
      price: `₹${product.price}.00`,
      original: `₹${product.compare_price || product.price}.00`,
      category
    };
    setSelectedProduct(formattedProduct);
    const pid = product?.product_id || product?.productId || product?.id;
    navigate(pid ? `/product/${pid}` : "/product");
  };

  const handleAddToCartClick = async (e, product) => {
    e.stopPropagation();
    try {
      const defaultSize = (product.sizes && product.sizes.length > 0) ? product.sizes[0] : (selectedSizes[0] || null);
      await addToCart(product, 1, defaultSize);
      showToast(`Added ${product.name} to cart!`, "success");
    } catch (err) {
      showToast("Failed to add to cart", "error");
    }
  };

  // Generate pagination list
  const pageNumbers = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  return (
    <div className="trending-page-root">
      <TopBar />
      <SiteHeader activeLink={category} onLinkClick={handleNavClick} />

      <div className="trending-main-container">
        {/* ─── Left Sidebar Filters (Desktop) & Mobile Drawer (Mobile) ─── */}
        <ProductFilter
          sortBy={sortBy}
          onSortChange={handlePriceSortToggle}
          availableCategories={availableCategories}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          availableSubcategories={availableSubcategories}
          selectedSubcategories={selectedSubcategories}
          onSubcategoryToggle={handleSubcategoryToggle}
          availableFabrics={availableFabrics}
          selectedFabrics={selectedFabrics}
          onFabricToggle={handleFabricToggle}
          availableSizes={availableSizes}
          selectedSizes={selectedSizes}
          onSizeToggle={handleSizeToggle}
          onClearFilters={handleClearFilters}
          mobileOpen={mobileFilterOpen}
          onMobileClose={() => setMobileFilterOpen(false)}
          totalCount={filteredProducts.length}
        />

        {/* ─── Right Products Main Panel ─── */}
        <main className="trending-content-panel">
          {/* Header Banner */}
          <div className="trending-header-bar">
            <div className="trending-title-block">
              <h1 className="trending-headline">
                {searchQueryParam
                  ? `SEARCH: "${searchQueryParam.toUpperCase()}"`
                  : subcategoryParam
                  ? subcategoryParam.toUpperCase()
                  : (category ? category.toUpperCase() : "ALL PRODUCTS")}
              </h1>
              <p className="trending-subtitle">
                {searchQueryParam
                  ? `Showing results for "${searchQueryParam}"`
                  : category?.toLowerCase() === "all products" || category?.toLowerCase() === "all"
                  ? "Browse all products across our entire catalog"
                  : "Check what came new to the store"}
              </p>
            </div>
            <div className="trending-product-count desktop-only">
              {filteredProducts.length} Products
            </div>
          </div>

          {/* Mobile Filter Action Bar (Mobile Only) */}
          <div className="trending-mobile-filter-bar">
            <button
              type="button"
              className={`trending-mobile-filter-btn ${activeFilterChips.length > 0 ? "has-filters" : ""}`}
              onClick={() => setMobileFilterOpen(true)}
              aria-label="Open filter and sort drawer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <span>Filters & Sort</span>
              {activeFilterChips.length > 0 && (
                <span className="trending-mobile-filter-count-badge">
                  {activeFilterChips.length}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Chips Scrollable Row (Mobile Only) */}
          {activeFilterChips.length > 0 && (
            <div className="trending-mobile-chips-row">
              {activeFilterChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="trending-mobile-chip"
                  onClick={chip.onRemove}
                  title={`Remove ${chip.label}`}
                >
                  <span>{chip.label}</span>
                  <span className="chip-remove-x">✕</span>
                </button>
              ))}
              <button
                type="button"
                className="trending-mobile-clear-all"
                onClick={handleClearFilters}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Products Grid / Skeletons / Empty */}
          {loading ? (
            <div className="trending-products-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="trending-empty-state">
              <h3>No products found</h3>
              <p>No products match the selected filters.</p>
              <button
                type="button"
                className="trending-reset-btn"
                onClick={handleClearFilters}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="trending-products-grid">
                {currentItems.map(product => (
                  <article
                    key={product.id || product.product_id}
                    onClick={() => handleProductCardClick(product)}
                    className="trending-card"
                  >
                    <div className="trending-image-box">
                      <img
                        src={productService.getResizedImageUrl(product.img || product.image_url, 'card')}
                        alt={product.name}
                        className="trending-img"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleAddToCartClick(e, product)}
                        className="trending-cart-pill-btn"
                        aria-label="Add to cart"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          width="14"
                          height="14"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="cart-svg-icon"
                        >
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        <span>Add To Cart</span>
                      </button>
                    </div>

                    <div className="trending-details-box">
                      <h4 className="trending-product-name">{product.name}</h4>
                      <div className="trending-product-price">₹{product.price}</div>
                    </div>
                  </article>
                ))}
              </div>

              {/* ─── Pagination Bar ─── */}
              {totalPages > 1 && (
                <div className="trending-pagination-container">
                  <button
                    type="button"
                    onClick={() => handlePageChange("prev")}
                    disabled={currentPage === 1}
                    className="trending-page-nav-pill"
                  >
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2.2">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>Previous</span>
                  </button>

                  <div className="trending-page-numbers-group">
                    {pageNumbers.map(page => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`trending-page-number-btn ${currentPage === page ? "active" : ""}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange("next")}
                    disabled={currentPage === totalPages}
                    className="trending-page-nav-pill"
                  >
                    <span>Next</span>
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2.2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage("")} />
      <SiteFooter />
    </div>
  );
}
