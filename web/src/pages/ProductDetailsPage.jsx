import React, { useState, useCallback, useMemo, useEffect, memo, lazy, Suspense } from 'react';
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabase';
import { productService } from "../services/productService";
import { getOriginalImageUrl } from '../utils/imageUtils';
import { getNavPath } from "../services/categoryRoute";

import './ProductDetailsPage.css';
import SiteHeader from '../components/SiteHeader';
import TopBar from '../components/TopBar';
import Toast from '../components/Toast';
import { useStore } from '../hooks/useStore';

// Lazy load Footer
const SiteFooter = lazy(() => import('../components/SiteFooter'));

// ── Product Gallery Component (Vertical Thumbnails on Left + Main Image) ──
const ProductGallery = memo(({ activeThumb, setActiveThumb, displayImage, displayName, thumbs }) => {
  const currentIndex = activeThumb === -1 ? 0 : activeThumb;
  const safeIndex = Math.min(currentIndex, thumbs.length - 1);
  const currentImg = getOriginalImageUrl(activeThumb === -1 ? displayImage : thumbs[safeIndex]?.rawImg || displayImage);

  const [zoomOpen, setZoomOpen] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  const handleZoomImageClick = (e) => {
    if (!isZoomedIn) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      e.currentTarget.style.transformOrigin = `${x}% ${y}%`;
    }
    setIsZoomedIn(z => !z);
  };

  const closeZoom = () => {
    setZoomOpen(false);
    setIsZoomedIn(false);
  };

  return (
    <div className="dp-gallery-layout">
      {/* Vertical Thumbnails on Left (only when there is more than one image) */}
      {thumbs.length > 1 && (
        <div className="dp-thumbs-vertical-col">
          {thumbs.map((item, idx) => (
            <button
              key={item.id || idx}
              type="button"
              className={`dp-thumb-item-btn ${currentIndex === idx ? 'active' : ''}`}
              onClick={() => setActiveThumb(idx)}
              aria-label={`Thumbnail ${idx + 1}`}
            >
              <img src={item.img} alt={item.alt || displayName} className="dp-thumb-img" />
            </button>
          ))}
        </div>
      )}

      {/* Main Big Image */}
      <div className="dp-main-image-container">
        <div className="dp-main-image-inner" onClick={() => currentImg && setZoomOpen(true)}>
          {currentImg && (
            <img
              src={currentImg}
              alt={displayName}
              className="dp-main-img-display"
            />
          )}
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox */}
      {zoomOpen && currentImg && (
        <div className="dp-zoom-overlay" onClick={closeZoom}>
          <button className="dp-zoom-close-btn" onClick={closeZoom} aria-label="Close zoom">✕</button>
          <img
            src={currentImg}
            alt={displayName}
            className={`dp-zoom-lightbox-img ${isZoomedIn ? 'zoomed' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleZoomImageClick(e); }}
          />
          <p className="dp-zoom-hint">{isZoomedIn ? 'Click to zoom out' : 'Click image to zoom in'}</p>
        </div>
      )}
    </div>
  );
});

// ── Related Products Component ──
const RelatedProducts = memo(({ relatedItems, onProductClick }) => {
  if (!relatedItems || relatedItems.length === 0) return null;
  const visibleRelated = relatedItems.slice(0, 4);

  return (
    <section className="dp-related-section">
      <h2 className="dp-related-title">You May Also Like</h2>
      <div className="dp-related-grid">
        {visibleRelated.map(p => (
          <div
            key={p.id}
            className="dp-rel-card"
            onClick={() => onProductClick && onProductClick(p)}
          >
            <div className="dp-rel-img-wrapper">
              <img
                src={productService.getResizedImageUrl(p.img || p.image_url, 'card')}
                alt={p.name}
                className="dp-rel-img"
                loading="lazy"
              />
            </div>
            <div className="dp-rel-details">
              <h4 className="dp-rel-name">{p.name}</h4>
              <div className="dp-rel-price">₹{p.price}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
export default function ProductDetailsPage({ onBack = () => window.history.back() }) {
  const navigate = useNavigate();

  // Zustand Store
  const selectedProduct = useStore(state => state.selectedProduct);
  const setSelectedProduct = useStore(state => state.setSelectedProduct);
  const categories = useStore(state => state.categories);
  const addToCart = useStore(state => state.addToCart);
  const wishlistItems = useStore(state => state.wishlistItems);
  const fetchProductsByCategory = useStore(state => state.fetchProductsByCategory);
  const productsCache = useStore(state => state.products);
  const fetchProductDetails = useStore(state => state.fetchProductDetails);
  const productDetailsCache = useStore(state => state.productDetails);

  const cat = selectedProduct?.category || 'Briefs';

  // React States
  const [activeThumb, setActiveThumb] = useState(0);
  const [qty, setQty] = useState(1);
  const [productImages, setProductImages] = useState([]);
  const [productPrices, setProductPrice] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");
  const [selectedSize, setSelectedSize] = useState("80");
  const [size, setSize] = useState(["80", "85", "90", "95", "100"]);
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState([]);
  const [selectedColor, setSelectedColor] = useState("");

  const productId = selectedProduct?.productId || selectedProduct?.id;
  const cachedEntry = productId ? productDetailsCache[productId] : undefined;

  useEffect(() => {
    if (!productId) return;

    setSize(["80", "85", "90", "95", "100"]);
    setProductImages([]);
    setProductPrice(null);
    setVariants([]);
    setSelectedColor('');
    setSelectedSize('80');
    setQty(1);

    if (cachedEntry?.base) {
      setProductImages(cachedEntry.images || []);
      const baseData = cachedEntry.base;
      setHasVariants(!!baseData?.has_variants);
      if (baseData?.has_variants) {
        const variantRows = cachedEntry.variants || [];
        setVariants(variantRows);
        const sizes = [...new Set(variantRows.map(v => v.size).filter(Boolean))];
        const firstVariant = variantRows[0];
        if (sizes.length > 0) setSize(sizes);
        setSelectedSize(firstVariant?.size || '80');
        setSelectedColor(firstVariant?.color || '');
      } else {
        setProductPrice(baseData);
        if (baseData?.sizes?.length) {
          setSize(baseData.sizes);
          setSelectedSize(baseData.sizes[0] || '80');
        }
        const parsedColors = Array.isArray(baseData?.colors)
          ? baseData.colors
          : (typeof baseData?.colors === 'string' ? baseData.colors.split(',').map(s => s.trim()).filter(Boolean) : []);
        setSelectedColor(parsedColors[0] || '');
      }
      return;
    }

    fetchProductDetails(productId).then(details => {
      if (!details) return;
      setProductImages(details.images || []);
      const baseData = details.base;
      setHasVariants(!!baseData?.has_variants);
      if (baseData?.has_variants) {
        const variantRows = details.variants || [];
        setVariants(variantRows);
        const sizes = [...new Set(variantRows.map(v => v.size).filter(Boolean))];
        const firstVariant = variantRows[0];
        if (sizes.length > 0) setSize(sizes);
        setSelectedSize(firstVariant?.size || '80');
        setSelectedColor(firstVariant?.color || '');
      } else {
        setProductPrice(baseData);
        if (baseData?.sizes?.length) {
          setSize(baseData.sizes);
          setSelectedSize(baseData.sizes[0] || '80');
        }
        const parsedColors = Array.isArray(baseData?.colors)
          ? baseData.colors
          : (typeof baseData?.colors === 'string' ? baseData.colors.split(',').map(s => s.trim()).filter(Boolean) : []);
        setSelectedColor(parsedColors[0] || '');
      }
    });
  }, [selectedProduct, cat, cachedEntry]);

  const showToast = (message, type = "success") => {
    setToastMsg("");
    setToastType(type);
    setTimeout(() => setToastMsg(message), 10);
  };

  const activeSizeValue = selectedSize;

  const selectedVariant = useMemo(() => {
    if (!hasVariants || variants.length === 0) return null;
    return variants.find(
      v => (v.size || "") === (activeSizeValue || "") && (v.color || "") === (selectedColor || "")
    ) || null;
  }, [hasVariants, variants, activeSizeValue, selectedColor]);

  useEffect(() => {
    if (!hasVariants || variants.length === 0) return;

    const colorsForCurrentSize = [...new Set(
      variants.filter(v => !activeSizeValue || v.size === activeSizeValue).map(v => v.color).filter(Boolean)
    )];
    if (colorsForCurrentSize.length > 0 && !colorsForCurrentSize.includes(selectedColor)) {
      setSelectedColor(colorsForCurrentSize[0]);
    }
  }, [activeSizeValue, hasVariants, variants]);

  const rawPrice = hasVariants
    ? (selectedVariant?.price ?? null)
    : (productPrices?.price ?? selectedProduct?.price ?? null);

  const rawCompare = hasVariants
    ? (selectedVariant?.compare_price ?? null)
    : (productPrices?.compare_price ?? selectedProduct?.compare_price ?? null);

  const displayImage = selectedProduct?.img || selectedProduct?.image || selectedProduct?.image_url || '';
  const displayName = selectedProduct?.name || 'GREEN ROUND NECK FULL HAND T- SHIRT';

  const displaySku = hasVariants
    ? (selectedVariant?.sku || '')
    : (productPrices?.sku || selectedProduct?.sku || '');

  const stockCount = hasVariants
    ? (selectedVariant?.stock ?? 0)
    : (productPrices?.stock ?? selectedProduct?.stock ?? 10);

  const payPrice = rawPrice != null ? Number(rawPrice) : 150;
  const strikePrice = rawCompare != null ? Number(rawCompare) : Math.round(payPrice * 1.3);

  const canAddToCart = stockCount == null || stockCount > 0;

  const availableColors = useMemo(() => {
    if (hasVariants && variants.length > 0) {
      const colors = [...new Set(
        variants
          .filter(v => !activeSizeValue || v.size === activeSizeValue)
          .map(v => v.color)
          .filter(Boolean)
      )];
      if (colors.length > 0) return colors;
    }
    const rawColors = productPrices?.colors || selectedProduct?.colors;
    if (Array.isArray(rawColors) && rawColors.length > 0) return rawColors.filter(Boolean);
    if (typeof rawColors === 'string' && rawColors.trim()) {
      return rawColors.split(',').map(c => c.trim()).filter(Boolean);
    }
    return [];
  }, [hasVariants, variants, activeSizeValue, productPrices, selectedProduct]);

  useEffect(() => {
    if (!selectedColor && availableColors.length > 0) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors, selectedColor]);

  // Gallery Thumbnails
  const dynamicThumbs = useMemo(() => {
    let imgs = [];

    if (hasVariants) {
      if (selectedVariant?.images && selectedVariant.images.length > 0) {
        imgs = selectedVariant.images;
      } else {
        const anyVariantWithImages = variants.find(v => v.images?.length > 0);
        if (anyVariantWithImages) {
          imgs = anyVariantWithImages.images;
        }
      }
    }

    if (imgs.length === 0 && productImages.length > 0) {
      imgs = productImages;
    }

    if (imgs.length === 0 && displayImage) {
      imgs = [displayImage];
    }

    // Only the product's real images, each once
    imgs = [...new Set(imgs.filter(Boolean))];

    return imgs.map((img, i) => ({
      id: i + 1,
      img: productService.getResizedImageUrl(img, 'detail'),
      rawImg: getOriginalImageUrl(img),
      alt: `${displayName} view ${i + 1}`
    }));
  }, [productImages, displayImage, displayName, hasVariants, selectedVariant, variants]);

  useEffect(() => {
    fetchProductsByCategory(cat);
  }, [cat, fetchProductsByCategory]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveThumb(0);
    setQty(1);
  }, [selectedProduct]);

  const dynamicRelated = useMemo(() => {
    const dbProducts = productsCache[cat] || [];
    const currentId = selectedProduct?.productId || selectedProduct?.id;

    return dbProducts
      .filter((p) => p.id !== currentId && p.productId !== currentId)
      .map((p) => ({
        ...p,
        price: p.price || 150,
        category: p.category || cat,
      }));
  }, [cat, productsCache, selectedProduct]);

  const handleThumbClick = useCallback((i) => {
    setActiveThumb(i);
  }, []);

  const handleQtyChange = useCallback((delta) => {
    setQty(prev => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (stockCount != null && stockCount > 0 && next > stockCount) {
        return stockCount;
      }
      return next;
    });
  }, [stockCount]);

  const handleHeaderLinkClick = (link) => {
    if (link === "Home") {
      navigate("/");
    } else {
      navigate(getNavPath(link, categories));
    }
  };

  const handleRelatedProductClick = useCallback(
    (product) => {
      setSelectedProduct({
        ...product,
        category: product.category || cat,
      });
      navigate("/product");
    },
    [cat, setSelectedProduct, navigate]
  );

  const handleAddToCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/account/signup");
      return;
    }
    if (!canAddToCart) return;

    if (selectedProduct) {
      const sizeParam = selectedSize || null;
      const colorParam = selectedColor || null;
      const cartProductPayload = {
        ...selectedProduct,
        productId: selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id,
        id: selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id,
        name: displayName,
        price: payPrice,
        originalPrice: strikePrice,
        compare_price: strikePrice,
        image: dynamicThumbs[0]?.img || selectedVariant?.images?.[0] || displayImage,
        img: dynamicThumbs[0]?.img || selectedVariant?.images?.[0] || displayImage,
        category: cat,
      };
      await addToCart(cartProductPayload, qty, sizeParam, colorParam);
      showToast(`Added "${displayName}" to cart!`);
    }
  };

  const handleBuyNow = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/account/signup");
      return;
    }
    if (!canAddToCart) return;

    const sizeParam = selectedSize || null;
    const colorParam = selectedColor || null;

    navigate("/checkout", {
      state: {
        product: {
          productId: selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id,
          id: selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id,
          name: displayName,
          price: payPrice,
          originalPrice: strikePrice,
          qty: qty,
          img: dynamicThumbs[0]?.img || selectedVariant?.images?.[0] || displayImage,
          category: cat,
          sku: displaySku || selectedProduct?.sku || selectedVariant?.sku || '',
          size: sizeParam,
          color: colorParam,
        }
      }
    });
  }, [displayName, payPrice, strikePrice, qty, dynamicThumbs, selectedVariant, displayImage, cat, displaySku, selectedProduct, selectedSize, selectedColor, canAddToCart, navigate]);

  return (
    <div className="dp-page-root">
      <TopBar />
      {/* ── HEADER ── */}
      <SiteHeader activeLink="" onLinkClick={handleHeaderLinkClick} />

      {/* ── PRODUCT DETAIL MAIN CONTAINER ── */}
      <main className="dp-detail-main">
        {/* Left Column: Vertical Thumbs + Main Image */}
        <div className="dp-gallery-column">
          <ProductGallery
            activeThumb={activeThumb}
            setActiveThumb={handleThumbClick}
            displayImage={displayImage}
            displayName={displayName}
            thumbs={dynamicThumbs}
          />
        </div>

        {/* Right Column: Title, Price, Options, Actions, Specs */}
        <div className="dp-info-column">
          {/* Title */}
          <h1 className="dp-title">{displayName.toUpperCase()}</h1>

          {/* Stock Status Badge */}
          <div className="dp-stock-status">
            {stockCount === 0 ? (
              <span className="dp-stock-out">Out of Stock</span>
            ) : (
              <span className="dp-stock-in">In Stock</span>
            )}
          </div>

          {/* Short Description */}
          <p className="dp-short-desc">
            {selectedProduct?.desc || "Fitted coat in woven fabric with a lightly brushed finish. Notch lapels, a concealed fastening, welt front pockets and a detachable tie belt at the waist."}
          </p>

          {/* Price */}
          <div className="dp-price-row">
            <span className="dp-price-text">Rs. {payPrice}</span>
          </div>

          {/* Select Color */}
          {availableColors.length > 0 && (
            <div className="dp-option-section">
              <h4 className="dp-option-title">Select Color</h4>
              <div className="dp-color-swatches-row">
                {availableColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`dp-swatch-ring-btn ${selectedColor === c ? 'active' : ''}`}
                    onClick={() => setSelectedColor(c)}
                    aria-label={`Select color ${c}`}
                    title={c}
                  >
                    <span className="dp-swatch-circle" style={{ backgroundColor: c }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Select Quantity */}
          <div className="dp-option-section">
            <h4 className="dp-option-title">Select Quantity</h4>
            <div className="dp-qty-stepper-wrap">
              <button
                type="button"
                className="dp-qty-btn-circle"
                onClick={() => handleQtyChange(-1)}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <div className="dp-qty-box-value">{qty}</div>
              <button
                type="button"
                className="dp-qty-btn-circle"
                onClick={() => handleQtyChange(1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Select Size */}
          {size.length > 0 && (
            <div className="dp-option-section">
              <h4 className="dp-option-title">Select Size</h4>
              <div className="dp-size-buttons-row">
                {size.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`dp-size-pill-btn ${selectedSize === s ? 'active' : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="dp-action-buttons-group">
            <button
              type="button"
              className="dp-add-cart-btn"
              disabled={!canAddToCart}
              onClick={handleAddToCart}
            >
              {canAddToCart ? "ADD TO CART" : "OUT OF STOCK"}
            </button>

            <button
              type="button"
              className="dp-buy-now-btn"
              disabled={!canAddToCart}
              onClick={handleBuyNow}
            >
              Buy Now
            </button>

            <div className="dp-bulk-inquiry-row">
              <span>Want to buy in bulk? </span>
              <button
                type="button"
                className="dp-contact-link-btn"
                onClick={() => navigate('/contact')}
              >
                Contact Here
              </button>
            </div>
          </div>

          {/* Product Specifications Table/List */}
          <div className="dp-specs-section">
            <h3 className="dp-specs-heading">Product Specifications</h3>
            <div className="dp-specs-table">
              <div className="dp-specs-row">
                <span className="dp-specs-label">Product Type :</span>
                <span className="dp-specs-value">{selectedProduct?.type || selectedProduct?.subcategory || cat || "Brief"}</span>
              </div>
              <div className="dp-specs-row">
                <span className="dp-specs-label">Product Material :</span>
                <span className="dp-specs-value">{selectedProduct?.fabric || selectedProduct?.material || "Cotton"}</span>
              </div>
              <div className="dp-specs-row">
                <span className="dp-specs-label">Category :</span>
                <span className="dp-specs-value">{selectedProduct?.gender || selectedProduct?.category || "Male"}</span>
              </div>
              <div className="dp-specs-row">
                <span className="dp-specs-label">Pocket :</span>
                <span className="dp-specs-value">{selectedProduct?.pocket || "Without Pocket"}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── YOU MAY ALSO LIKE ── */}
      <RelatedProducts
        relatedItems={dynamicRelated}
        onProductClick={handleRelatedProductClick}
      />

      {/* ── FOOTER ── */}
      <Suspense fallback={<div style={{ height: 200 }} />}>
        <SiteFooter />
      </Suspense>

      {/* ── TOAST ── */}
      <Toast
        message={toastMsg}
        type={toastType}
        onClose={() => setToastMsg("")}
      />
    </div>
  );
}
