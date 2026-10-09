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
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedFabrics, setSelectedFabrics] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Zustand Store Hooks
  const products = useStore(state => state.products[category] || EMPTY_PRODUCTS);
  const loading = useStore(state => state.loadingProducts);
  const fetchProductsByCategory = useStore(state => state.fetchProductsByCategory);
  const wishlistItems = useStore(state => state.wishlistItems);
  const toggleWishlist = useStore(state => state.toggleWishlist);
  const addToCart = useStore(state => state.addToCart);
  const setSelectedProduct = useStore(state => state.setSelectedProduct);

  const allCategories = useStore(state => state.categories);
  const fetchCategories = useStore(state => state.fetchCategories);
  const wishlistProductIds = useMemo(() => wishlistItems.map(w => w.id), [wishlistItems]);

  useEffect(() => {
    fetchProductsByCategory(category);
  }, [category, fetchProductsByCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Reset filters when category changes
  useEffect(() => {
    setSelectedGenders([]);
    setSelectedFabrics([]);
    setSelectedSizes([]);
    setSortBy("featured");
    setCurrentPage(1);
  }, [category]);

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

  const handleGenderToggle = (gender) => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
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

  // Compute available sizes & dynamic counts
  const availableSizes = useMemo(() => {
    const base = ["80", "85", "90", "95", "100"];
    const productSizes = [];
    products.forEach(p => {
      if (Array.isArray(p.sizes)) {
        p.sizes.forEach(s => {
          const str = String(s).trim();
          if (str && !productSizes.includes(str)) productSizes.push(str);
        });
      }
    });
    const combined = [...base];
    productSizes.forEach(s => {
      if (!combined.includes(s)) combined.push(s);
    });
    return combined;
  }, [products]);

  // Dynamic fabric counts
  const fabricCounts = useMemo(() => {
    let count = 0;
    products.forEach(p => {
      const text = `${p.name || ""} ${p.desc || ""} ${p.fabric || ""} ${p.material || ""}`.toLowerCase();
      if (text.includes("cotton") || products.length > 0) {
        count++;
      }
    });
    return {
      Cotton: count || products.length || 10
    };
  }, [products]);

  // Filter & sort logic
  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      // Subcategory filter if present in URL
      if (subcategoryParam.trim()) {
        const targetSub = subcategoryParam.trim().toLowerCase();
        const pSub = String(product.subcategory || product.subcategory_id || "").trim().toLowerCase();
        if (pSub !== targetSub) return false;
      }

      // Gender filter
      if (selectedGenders.length > 0) {
        const pGender = String(product.gender || product.category || "").toLowerCase();
        const pName = String(product.name || "").toLowerCase();
        const matchesGender = selectedGenders.some(g => {
          const gLow = g.toLowerCase();
          return pGender.includes(gLow) || pName.includes(gLow);
        });
        if (!matchesGender) return false;
      }

      // Fabric filter
      if (selectedFabrics.length > 0) {
        const text = `${product.name || ""} ${product.desc || ""} ${product.fabric || ""} ${product.material || ""}`.toLowerCase();
        const matchesFabric = selectedFabrics.some(f => text.includes(f.toLowerCase()));
        if (!matchesFabric) return false;
      }

      // Size filter
      if (selectedSizes.length > 0) {
        const hasMatchingSize = product.sizes?.some(size => selectedSizes.map(String).includes(String(size)));
        if (!hasMatchingSize && product.sizes && product.sizes.length > 0) return false;
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
  }, [products, subcategoryParam, selectedGenders, selectedFabrics, selectedSizes, sortBy]);

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
    navigate("/product");
  };

  const handleAddToCartClick = async (e, product) => {
    e.stopPropagation();
    try {
      const defaultSize = (product.sizes && product.sizes.length > 0) ? product.sizes[0] : (selectedSizes[0] || "80");
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
        {/* ─── Left Sidebar Filters ─── */}
        <aside className="trending-sidebar">
          {/* Price Filter */}
          <div className="filter-group">
            <h3 className="filter-heading">Price</h3>
            <div className="filter-options">
              <label className="custom-filter-checkbox">
                <input
                  type="checkbox"
                  checked={sortBy === "price-low-high"}
                  onChange={() => handlePriceSortToggle("price-low-high")}
                />
                <span className="checkbox-box"></span>
                <span className="checkbox-text">Low to high</span>
              </label>
              <label className="custom-filter-checkbox">
                <input
                  type="checkbox"
                  checked={sortBy === "price-high-low"}
                  onChange={() => handlePriceSortToggle("price-high-low")}
                />
                <span className="checkbox-box"></span>
                <span className="checkbox-text">High to low</span>
              </label>
            </div>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <h3 className="filter-heading">Category</h3>
            <div className="filter-options">
              <label className="custom-filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedGenders.includes("Male")}
                  onChange={() => handleGenderToggle("Male")}
                />
                <span className="checkbox-box"></span>
                <span className="checkbox-text">Male</span>
              </label>
              <label className="custom-filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedGenders.includes("Female")}
                  onChange={() => handleGenderToggle("Female")}
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
                  onChange={() => handleFabricToggle("Cotton")}
                />
                <span className="checkbox-box"></span>
                <span className="checkbox-text">Cotton({fabricCounts.Cotton})</span>
              </label>
            </div>
          </div>

          {/* Size Filter */}
          <div className="filter-group">
            <h3 className="filter-heading">Size</h3>
            <div className="filter-options">
              {availableSizes.map(size => (
                <label key={size} className="custom-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size)}
                    onChange={() => handleSizeToggle(size)}
                  />
                  <span className="checkbox-box"></span>
                  <span className="checkbox-text">{size}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ─── Right Products Main Panel ─── */}
        <main className="trending-content-panel">
          {/* Header Banner */}
          <div className="trending-header-bar">
            <div className="trending-title-block">
              <h1 className="trending-headline">
                {subcategoryParam ? subcategoryParam.toUpperCase() : (category ? category.toUpperCase() : "TRENDING NOW")}
              </h1>
              <p className="trending-subtitle">Check what came new to the store</p>
            </div>
            <div className="trending-product-count">
              {filteredProducts.length} Products
            </div>
          </div>

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
                onClick={() => {
                  setSelectedGenders([]);
                  setSelectedFabrics([]);
                  setSelectedSizes([]);
                  setSortBy("featured");
                }}
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
                          stroke="#1e3a8a"
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
