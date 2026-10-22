import React, { useState, useCallback, useMemo, useEffect, memo, lazy, Suspense } from 'react';
import { useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from '../lib/supabase';
import { productService } from "../services/productService";
import { getOriginalImageUrl } from '../utils/imageUtils';
import { getNavPath } from "../services/categoryRoute";
import { getColorName } from '../utils/colorUtils';

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

// Color mapping helper for clothing/innerwear colors
const COLOR_MAP = {
  'navy': '#001f3f',
  'navy blue': '#0A2582',
  'royal blue': '#4169E1',
  'sky blue': '#87CEEB',
  'light blue': '#add8e6',
  'deep blue': '#040273',
  'blue': '#0074D9',
  'black': '#111827',
  'white': '#FFFFFF',
  'grey': '#9CA3AF',
  'gray': '#9CA3AF',
  'dark grey': '#4B5563',
  'dark gray': '#4B5563',
  'light grey': '#D1D5DB',
  'light gray': '#D1D5DB',
  'melange': '#A0A0A0',
  'charcoal': '#374151',
  'skin': '#F3C59A',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
  'red': '#EF4444',
  'ruby red': '#9B111E',
  'maroon': '#800000',
  'wine': '#722F37',
  'pink': '#E75480',
  'baby pink': '#FFC0CB',
  'green': '#008000',
  'olive': '#808000',
  'olive green': '#556B2F',
  'mint green': '#98FF98',
  'emerald green': '#50C878',
  'teal': '#2DD4BF',
  'yellow': '#FFFF00',
  'orange': '#FFA500',
  'purple': '#8B2FC9',
  'lavender': '#734F96',
  'brown': '#8B4513'
};

export const getColorStyle = (c) => {
  if (!c) return '#9CA3AF';
  const lower = String(c).trim().toLowerCase();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  if (lower.startsWith('#') || lower.startsWith('rgb') || lower.startsWith('hsl')) return c;
  return lower;
};

export const parseColors = (rawColors) => {
  if (!rawColors) return [];
  let parsed = rawColors;
  if (typeof rawColors === "string") {
    const trimmed = rawColors.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = trimmed.slice(1, -1).split(",").map((s) => s.replace(/['"]/g, "").trim());
      }
    } else {
      parsed = trimmed.split(",").map((s) => s.trim());
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((c) => {
      if (!c) return "";
      if (typeof c === "string") return c.trim();
      if (typeof c === "object") return (c.hex || c.color || c.name || "").trim();
      return String(c).trim();
    })
    .filter(Boolean);
};

export const sortSizesAscending = (sizes) => {
  if (!Array.isArray(sizes)) return [];

  const letterRank = {
    'XXXS': 1, '3XS': 1,
    'XXS': 2, '2XS': 2,
    'XS': 3,
    'S': 4,
    'M': 5,
    'L': 6,
    'XL': 7,
    'XXL': 8, '2XL': 8,
    'XXXL': 9, '3XL': 9,
    '4XL': 10, 'XXXXL': 10,
    '5XL': 11, 'XXXXXL': 11,
    '6XL': 12,
    'FREE': 99, 'FS': 99, 'ONESIZE': 99, 'ONE SIZE': 99, 'FREE SIZE': 99, 'STANDARD': 99
  };

  return [...sizes].sort((a, b) => {
    const strA = String(a).trim();
    const strB = String(b).trim();
    const upperA = strA.toUpperCase();
    const upperB = strB.toUpperCase();

    // 1. Both recognized letter sizes (e.g. S, M, L)
    const rankA = letterRank[upperA];
    const rankB = letterRank[upperB];
    if (rankA !== undefined && rankB !== undefined) {
      return rankA - rankB;
    }

    // 2. Both purely numeric (e.g. "6", "7", "10", "11")
    const numA = Number(strA);
    const numB = Number(strB);
    if (!isNaN(numA) && !isNaN(numB) && strA !== '' && strB !== '') {
      return numA - numB;
    }

    // 3. Strings containing numbers (e.g. "UK 6", "UK 10", "US 9.5")
    const matchA = strA.match(/\d+(\.\d+)?/);
    const matchB = strB.match(/\d+(\.\d+)?/);
    if (matchA && matchB) {
      const valA = parseFloat(matchA[0]);
      const valB = parseFloat(matchB[0]);
      if (valA !== valB) {
        return valA - valB;
      }
    }

    // 4. One has number and one doesn't
    if (matchA && !matchB) return -1;
    if (!matchA && matchB) return 1;

    // 5. Natural alphanumeric comparison
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  });
};

// ═════════════════════════════════════════════════════════════════════════════
export default function ProductDetailsPage({ onBack = () => window.history.back() }) {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const cleanId = (val) => (val ? String(val).replace(/\/+$/, '').trim() : '');
  const rawId = routeId || searchParams.get("id") || searchParams.get("productId") || searchParams.get("product_id") || '';

  // Zustand Store
  const selectedProduct = useStore(state => state.selectedProduct);
  const setSelectedProduct = useStore(state => state.setSelectedProduct);
  const categories = useStore(state => state.categories);
  const addToCart = useStore(state => state.addToCart);
  const fetchProductsByCategory = useStore(state => state.fetchProductsByCategory);
  const productsCache = useStore(state => state.products);

  const activeProductId = cleanId(rawId) || cleanId(selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id);
  const productId = activeProductId;

  const [loadingProduct, setLoadingProduct] = useState(() => {
    if (activeProductId && (!selectedProduct || String(selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id) !== String(activeProductId))) {
      return true;
    }
    return false;
  });
  const [productNotFound, setProductNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedProductId = cleanId(selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id);

  // React States
  const [activeThumb, setActiveThumb] = useState(0);
  const [qty, setQty] = useState(1);
  const [productImages, setProductImages] = useState(() => {
    if (selectedProduct?.images && selectedProduct.images.length > 0) return selectedProduct.images;
    if (selectedProduct?.img || selectedProduct?.image_url) return [selectedProduct.img || selectedProduct.image_url];
    return [];
  });
  const [productPrices, setProductPrice] = useState(() => selectedProduct || null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");
  const [selectedSize, setSelectedSize] = useState("");
  const [size, setSize] = useState(() => {
    const rawSizes = selectedProduct?.sizes;
    if (rawSizes) {
      let list = [];
      if (Array.isArray(rawSizes)) {
        list = rawSizes.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof rawSizes === "string" && rawSizes.trim()) {
        try {
          const parsed = JSON.parse(rawSizes);
          if (Array.isArray(parsed)) list = parsed.map(s => String(s).trim()).filter(Boolean);
        } catch {
          list = rawSizes.split(",").map(s => s.trim()).filter(Boolean);
        }
      }
      return sortSizesAscending(list);
    }
    return [];
  });
  const [hasVariants, setHasVariants] = useState(() => {
    return Boolean(selectedProduct?.has_variants || selectedProduct?.product_variants?.length > 0);
  });
  const [variants, setVariants] = useState(() => {
    return selectedProduct?.product_variants || selectedProduct?.variants || [];
  });
  const [selectedColor, setSelectedColor] = useState(() => {
    const rawColors = selectedProduct?.colors;
    const parsed = parseColors(rawColors);
    if (parsed.length > 0) {
      if (!selectedProduct?.has_variants || parsed.length === 1) {
        return parsed[0];
      }
    }
    const varColors = (selectedProduct?.product_variants || selectedProduct?.variants || []).map((v) => v.color).filter(Boolean);
    if (varColors.length > 0 && (!selectedProduct?.has_variants || varColors.length === 1)) {
      return varColors[0];
    }
    return "";
  });

  // Sync / fetch product if accessed directly via URL or shared link
  useEffect(() => {
    if (!productId) {
      if (!selectedProduct) {
        setProductNotFound(true);
      }
      return;
    }

    // If navigated without ID in URL, update URL so the address bar reflects the product ID
    if (!routeId && !rawId && productId) {
      navigate(`/product/${productId}`, { replace: true });
    }

    const hasCachedInfo = selectedProductId && String(selectedProductId) === String(productId);
    if (hasCachedInfo) {
      setLoadingProduct(false);
      setProductNotFound(false);
    } else {
      setLoadingProduct(true);
      setProductNotFound(false);
    }

    let isMounted = true;

    productService.getProductById(productId)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          if (!hasCachedInfo) {
            setProductNotFound(true);
          }
          setLoadingProduct(false);
          return;
        }

        const baseImages = Array.isArray(data.images) && data.images.length > 0
          ? data.images
          : (data.image_url ? [data.image_url] : []);

        const parsedColorsList = parseColors(data.colors);

        const formatted = {
          ...data,
          id: data.product_id,
          productId: data.product_id,
          product_id: data.product_id,
          name: data.name,
          desc: data.description,
          description: data.description,
          price: data.price,
          compare_price: data.compare_price || data.price,
          original: `₹${data.compare_price || data.price}.00`,
          img: baseImages[0] || '',
          image: baseImages[0] || '',
          images: baseImages,
          image_url: data.image_url || baseImages[0] || '',
          category: data.categories?.name || 'Innerwear',
          type: data.subcategories?.name || '',
          subcategory: data.subcategories?.name || '',
          material: data.material || '',
          fabric: data.material || '',
          sku: data.sku || '',
          stock: data.stock,
          sizes: [],
          colors: parsedColorsList,
        };

        const varSizes = (data.product_variants || []).map(v => v.size).filter(Boolean);
        let baseSizes = [];
        if (data.sizes) {
          if (Array.isArray(data.sizes)) {
            baseSizes = data.sizes;
          } else if (typeof data.sizes === 'string' && data.sizes.trim()) {
            try {
              const jsonParsed = JSON.parse(data.sizes);
              if (Array.isArray(jsonParsed)) baseSizes = jsonParsed;
              else baseSizes = [data.sizes];
            } catch {
              baseSizes = data.sizes.split(',').map(s => s.trim()).filter(Boolean);
            }
          }
        }
        const realSizes = sortSizesAscending(Array.from(new Set([...baseSizes, ...varSizes].map(s => String(s).trim()).filter(Boolean))));
        formatted.sizes = realSizes;

        setProductImages(baseImages);
        setProductPrice({
          ...data,
          colors: parsedColorsList,
        });

        const rawVariants = data.product_variants || [];
        setVariants(rawVariants);
        setHasVariants(Boolean(data.has_variants || rawVariants.length > 0));

        const allColors = parsedColorsList.length > 0
          ? parsedColorsList
          : [...new Set(rawVariants.map((v) => v.color).filter(Boolean))];

        if (!data.has_variants || allColors.length === 1) {
          if (allColors[0]) {
            setSelectedColor(allColors[0]);
          }
        }

        setSize(realSizes);
        setSelectedSize(prev => (prev && realSizes.includes(prev)) ? prev : (realSizes.length === 1 ? realSizes[0] : ""));

        setSelectedProduct(formatted);
        setLoadingProduct(false);
      })
      .catch((err) => {
        console.error("Failed to load product by ID:", err);
        if (isMounted) {
          if (!hasCachedInfo) {
            setProductNotFound(true);
          }
          setLoadingProduct(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productId, routeId, rawId, selectedProductId, setSelectedProduct, navigate]);

  const cat = selectedProduct?.category || 'Briefs';

  const showToast = (message, type = "success") => {
    setToastMsg("");
    setToastType(type);
    setTimeout(() => setToastMsg(message), 10);
  };

  const activeSizeValue = selectedSize;

  // Strict match for variant based on selected size and selected color
  const matchedSizeVariant = useMemo(() => {
    if (!variants || variants.length === 0) return null;

    const normSize = String(activeSizeValue || "").trim().toLowerCase();
    const normColor = String(selectedColor || "").trim().toLowerCase();

    // 1. Both size and color match
    if (normSize && normColor) {
      const match = variants.find(
        (v) =>
          String(v.size || "").trim().toLowerCase() === normSize &&
          String(v.color || "").trim().toLowerCase() === normColor
      );
      if (match) return match;
    }

    // 2. Size match
    if (normSize) {
      const match = variants.find(
        (v) => String(v.size || "").trim().toLowerCase() === normSize
      );
      if (match) return match;
    }

    // 3. Color match
    if (normColor) {
      const match = variants.find(
        (v) => String(v.color || "").trim().toLowerCase() === normColor
      );
      if (match) return match;
    }

    return null;
  }, [variants, activeSizeValue, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (matchedSizeVariant) return matchedSizeVariant;
    if (!variants || variants.length === 0) return null;
    return (
      variants.find(
        (v) => (v.color || "") === (selectedColor || "") && v.images?.length > 0
      ) ||
      variants[0] ||
      null
    );
  }, [matchedSizeVariant, variants, selectedColor]);


  const rawPrice = hasVariants
    ? (matchedSizeVariant?.price ?? selectedVariant?.price ?? productPrices?.price ?? selectedProduct?.price ?? variants[0]?.price ?? null)
    : (matchedSizeVariant?.price ?? productPrices?.price ?? selectedProduct?.price ?? null);

  const rawCompare = hasVariants
    ? (matchedSizeVariant?.compare_price ?? selectedVariant?.compare_price ?? productPrices?.compare_price ?? selectedProduct?.compare_price ?? variants[0]?.compare_price ?? null)
    : (matchedSizeVariant?.compare_price ?? productPrices?.compare_price ?? selectedProduct?.compare_price ?? null);

  const displayImage = selectedProduct?.img || selectedProduct?.image || selectedProduct?.image_url || '';
  const displayName = selectedProduct?.name || '';

  const displaySku = matchedSizeVariant?.sku || selectedVariant?.sku || productPrices?.sku || selectedProduct?.sku || '';

  const stockCount = useMemo(() => {
    // If product has size variants and a size is selected, strictly return that size's stock
    if (variants && variants.length > 0 && selectedSize) {
      if (matchedSizeVariant) {
        return Math.max(0, parseInt(matchedSizeVariant.stock, 10) || 0);
      }
      return 0;
    }

    // If product has size variants but no size has been selected yet
    if (variants && variants.length > 0 && size.length > 0 && !selectedSize) {
      const totalVarStock = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
      return totalVarStock;
    }

    // Simple product without variants table
    const baseStock = productPrices?.stock ?? selectedProduct?.stock;
    if (baseStock != null && !isNaN(parseInt(baseStock, 10))) {
      return Math.max(0, parseInt(baseStock, 10));
    }

    return 0;
  }, [variants, selectedSize, matchedSizeVariant, size, productPrices, selectedProduct]);

  const cleanNum = (val) => {
    if (val == null) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const n = Number(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const payPrice = cleanNum(rawPrice) ?? 150;
  const strikePrice = cleanNum(rawCompare);
  const discountPercent =
    strikePrice != null && strikePrice > payPrice
      ? Math.round(((strikePrice - payPrice) / strikePrice) * 100)
      : 0;

  const canAddToCart = stockCount > 0;

  // Available colors: when a size is selected, ONLY show colors available for that size!
  const availableColors = useMemo(() => {
    if (hasVariants && selectedSize && variants?.length > 0) {
      const normSize = String(selectedSize).trim().toLowerCase();
      const colorsForSize = variants
        .filter((v) => String(v.size || "").trim().toLowerCase() === normSize && v.color)
        .map((v) => v.color)
        .filter(Boolean);
      return [...new Set(colorsForSize)];
    }

    const variantColors = (variants || []).map((v) => v.color).filter(Boolean);
    if (hasVariants && variantColors.length > 0) {
      return [...new Set(variantColors)];
    }

    const rawColors = productPrices?.colors || selectedProduct?.colors;
    const parsed = parseColors(rawColors);
    if (parsed.length > 0) return parsed;

    if (variantColors.length > 0) {
      return [...new Set(variantColors)];
    }
    return [];
  }, [hasVariants, variants, selectedSize, productPrices, selectedProduct]);

  // Auto-sync selectedColor when selectedSize changes or availableColors updates
  useEffect(() => {
    if (!hasVariants || !variants || variants.length === 0) return;

    if (availableColors.length > 0) {
      setSelectedColor((prev) => {
        if (prev && availableColors.includes(prev)) return prev;
        return availableColors[0];
      });
    } else {
      setSelectedColor("");
    }
  }, [selectedSize, availableColors, hasVariants, variants]);

  useEffect(() => {
    setActiveThumb(0);
  }, [selectedSize, selectedColor]);

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
      if (stockCount != null && next > stockCount) {
        return Math.max(1, stockCount);
      }
      return next;
    });
  }, [stockCount]);

  // Clamp quantity to selected size stock whenever size or stockCount updates
  useEffect(() => {
    if (selectedSize && stockCount != null && stockCount > 0) {
      if (qty > stockCount) {
        setQty(stockCount);
      } else if (qty < 1) {
        setQty(1);
      }
    }
  }, [selectedSize, stockCount]);

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
      const pid = product.product_id || product.productId || product.id;
      navigate(pid ? `/product/${pid}` : "/product");
    },
    [cat, setSelectedProduct, navigate]
  );

  const getShareUrl = useCallback(() => {
    const pid = cleanId(productId) || selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id;
    if (pid) {
      return `${window.location.origin}/product/${pid}`;
    }
    return window.location.href.split('?')[0].replace(/\/+$/, '');
  }, [productId, selectedProduct]);

  // Dynamically update document title, Open Graph, and Twitter Card meta tags for Instagram link previews
  useEffect(() => {
    if (!selectedProduct) return;

    const prodName = selectedProduct.name || displayName || 'Product';
    document.title = `${prodName} | FAYWALK`;

    const desc = selectedProduct.description || selectedProduct.desc || 'Discover premium innerwear and comfortable inner clothing on FAYWALK.';
    const cleanDesc = desc.replace(/<[^>]*>?/gm, '').slice(0, 200);
    const productImg = selectedProduct.img || selectedProduct.image_url || selectedProduct.images?.[0] || '';
    const fullImgUrl = productImg.startsWith('http') ? productImg : (productImg ? `${window.location.origin}${productImg}` : 'https://www.faywalk.com/logo.png');
    const shareUrl = getShareUrl();

    const setMetaTag = (attr, key, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaTag('property', 'og:title', `${prodName} - FAYWALK`);
    setMetaTag('property', 'og:description', cleanDesc);
    setMetaTag('property', 'og:image', fullImgUrl);
    setMetaTag('property', 'og:image:secure_url', fullImgUrl);
    setMetaTag('property', 'og:url', shareUrl);
    setMetaTag('property', 'og:type', 'product');
    setMetaTag('property', 'product:price:amount', String(payPrice || ''));
    setMetaTag('property', 'product:price:currency', 'INR');

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', `${prodName} - FAYWALK`);
    setMetaTag('name', 'twitter:description', cleanDesc);
    setMetaTag('name', 'twitter:image', fullImgUrl);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', shareUrl);

    return () => {
      document.title = 'FAYWALK | Premium Innerwear & Clothing';
    };
  }, [selectedProduct, displayName, payPrice, getShareUrl]);

  // Reliable clipboard copy supporting Instagram In-App Browser and iOS WebViews
  const copyToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fall back to execCommand for restricted in-app webviews
      }
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0.01';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (e) {
      return false;
    }
  };

  const handleShareProduct = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const shareUrl = getShareUrl();
    const shareTitle = displayName || 'FAYWALK';
    const shareText = `Check out ${displayName || 'this product'} on Faywalk!`;

    // 1. On mobile devices, trigger native OS share sheet synchronously on click
    // (allows direct 1-tap share to Instagram Stories, Chats, WhatsApp, etc.)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          // User dismissed the native share dialog
          return;
        }
        // Fall through to clipboard copy if native share threw an unexpected error
      }
    }

    // 2. Clipboard copy fallback (guaranteed to work in Instagram In-App Browser & desktop)
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      showToast('Product link copied! Share it on Instagram & more', 'success');
    } else {
      showToast('Link copied to clipboard', 'info');
    }
  };

  const validateOptionsSelection = useCallback(() => {
    const hasSizes = Array.isArray(size) && size.length > 0;
    // Only multi-variant products with multiple colors require manual color selection
    const requiresColorSelection = Boolean(selectedProduct?.has_variants && availableColors.length > 1);

    const missingSize = hasSizes && !selectedSize;
    const missingColor = requiresColorSelection && !selectedColor;

    if (missingSize && missingColor) {
      showToast("Please select size and color", "error");
      return false;
    }
    if (missingSize) {
      showToast("Please select a size", "error");
      return false;
    }
    if (missingColor) {
      showToast("Please select a color", "error");
      return false;
    }
    return true;
  }, [size, availableColors, selectedSize, selectedColor, selectedProduct]);

  const handleAddToCart = async () => {
    if (!validateOptionsSelection()) {
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/account/signup");
      return;
    }
    if (!canAddToCart) return;

    if (selectedProduct) {
      const sizeParam = selectedSize || null;
      const colorParam = selectedColor || availableColors[0] || null;
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
        stock: stockCount,
        stockCount: stockCount,
      };
      await addToCart(cartProductPayload, qty, sizeParam, colorParam);
      showToast(`Added "${displayName}" to cart!`);
    }
  };

  const handleBuyNow = useCallback(async () => {
    if (!validateOptionsSelection()) {
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/account/signup");
      return;
    }
    if (!canAddToCart) return;

    const sizeParam = selectedSize || null;
    const colorParam = selectedColor || availableColors[0] || null;

    const checkoutPayload = {
      productId: selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id,
      id: selectedProduct?.productId || selectedProduct?.id || selectedProduct?.product_id,
      name: displayName,
      price: payPrice,
      originalPrice: strikePrice,
      qty: qty,
      stock: stockCount,
      stockCount: stockCount,
      img: dynamicThumbs[0]?.img || selectedVariant?.images?.[0] || displayImage,
      category: cat,
      sku: displaySku || selectedProduct?.sku || selectedVariant?.sku || '',
      size: sizeParam,
      color: colorParam,
    };

    try {
      sessionStorage.setItem("faywalk_checkout_product", JSON.stringify(checkoutPayload));
      localStorage.setItem("faywalk_checkout_product", JSON.stringify(checkoutPayload));
      sessionStorage.removeItem("faywalk_checkout_selected_items");
      localStorage.removeItem("faywalk_checkout_selected_items");
    } catch (e) {
      console.warn("Could not save checkout item to storage", e);
    }

    navigate("/checkout", {
      state: {
        product: checkoutPayload
      }
    });
  }, [validateOptionsSelection, displayName, payPrice, strikePrice, qty, dynamicThumbs, selectedVariant, displayImage, cat, displaySku, selectedProduct, selectedSize, selectedColor, canAddToCart, navigate]);

  return (
    <div className="dp-page-root">
      <TopBar />
      {/* ── HEADER ── */}
      <SiteHeader activeLink="" onLinkClick={handleHeaderLinkClick} />

      {/* ── PRODUCT DETAIL MAIN CONTAINER ── */}
      {loadingProduct ? (
        <main className="dp-detail-main dp-state-container">
          <div className="dp-state-box">
            <div className="dp-loading-spinner" />
            <p className="dp-state-text">Loading product details...</p>
          </div>
        </main>
      ) : productNotFound ? (
        <main className="dp-detail-main dp-state-container">
          <div className="dp-state-box">
            <h2 className="dp-state-heading">Product Not Found</h2>
            <p className="dp-state-subtext">
              The product you are looking for is no longer available or the link may be incorrect.
            </p>
            <button
              type="button"
              className="dp-explore-btn"
              onClick={() => navigate('/all-products')}
            >
              Explore All Products
            </button>
          </div>
        </main>
      ) : (
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
            {/* Title & Share Row */}
            <div className="dp-title-share-row">
              <h1 className="dp-title">{displayName.toUpperCase()}</h1>
              <button
                type="button"
                className={`dp-share-btn ${copied ? 'copied' : ''}`}
                onClick={handleShareProduct}
                title={copied ? "Link Copied!" : "Share product link"}
                aria-label={copied ? "Link Copied!" : "Share product link"}
              >
                {copied ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                )}
              </button>
            </div>

            {/* Stock Status Badge */}
            <div className="dp-stock-status">
              {stockCount === 0 && selectedSize ? (
                <span className="dp-stock-out">Out of Stock ({selectedSize})</span>
              ) : stockCount === 0 ? (
                <span className="dp-stock-out">Out of Stock</span>
              ) : selectedSize ? (
                <span className="dp-stock-in">
                  In Stock ({stockCount} available)
                </span>
              ) : (
                <span className="dp-stock-in">In Stock</span>
              )}
            </div>

            {/* Short Description */}
            {(selectedProduct?.desc || selectedProduct?.description) && (
              <p className="dp-short-desc">
                {selectedProduct.desc || selectedProduct.description}
              </p>
            )}

          {/* Price & MRP */}
          <div className="dp-price-row">
            <span className="dp-price-text">Rs. {payPrice.toLocaleString('en-IN')}</span>
            {strikePrice != null && strikePrice > payPrice && (
              <>
                <span className="dp-price-mrp-cut">
                  <span className="dp-price-mrp-label">MRP</span> Rs. {strikePrice.toLocaleString('en-IN')}
                </span>
                {discountPercent > 0 && (
                  <span className="dp-price-discount-badge">{discountPercent}% OFF</span>
                )}
              </>
            )}
          </div>

          {/* Select Color */}
          {availableColors.length > 0 && (
            <div className="dp-option-section">
              <h4 className="dp-option-title">
                Select Color {selectedColor ? <span className="dp-selected-choice-badge">: {getColorName(selectedColor)}</span> : null}
              </h4>
              <div className="dp-color-swatches-row">
                {availableColors.map((c) => {
                  const bg = getColorStyle(c);
                  const isWhite = bg.toUpperCase() === '#FFFFFF' || String(c).toLowerCase() === 'white';
                  const colorLabel = getColorName(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`dp-swatch-ring-btn ${selectedColor === c ? 'active' : ''}`}
                      onClick={() => setSelectedColor(c)}
                      aria-label={`Select color ${colorLabel}`}
                      title={colorLabel}
                    >
                      <span
                        className={`dp-swatch-circle ${isWhite ? 'dp-swatch-circle--white' : ''}`}
                        style={{ backgroundColor: bg }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Select Size */}
          {size.length > 0 && (
            <div className="dp-option-section">
              <h4 className="dp-option-title">
                Select Size {selectedSize ? <span className="dp-selected-choice-badge">: {selectedSize}</span> : null}
              </h4>
              <div className="dp-size-buttons-row">
                {sortSizesAscending(size).map((s) => {
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`dp-size-pill-btn ${selectedSize === s ? 'active' : ''}`}
                      onClick={() => setSelectedSize(s)}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Select Quantity */}
          <div className="dp-option-section">
            <h4 className="dp-option-title">
              Select Quantity
              {selectedSize && stockCount > 0 && stockCount <= 5 ? (
                <span className="dp-stock-low-tag"> (Only {stockCount} left!)</span>
              ) : null}
            </h4>
            <div className="dp-qty-stepper-wrap">
              <button
                type="button"
                className="dp-qty-btn-circle"
                onClick={() => handleQtyChange(-1)}
                disabled={qty <= 1 || stockCount <= 0}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <div className="dp-qty-box-value">
                {stockCount === 0 && selectedSize ? 0 : qty}
              </div>
              <button
                type="button"
                className="dp-qty-btn-circle"
                onClick={() => handleQtyChange(1)}
                disabled={stockCount <= 0 || qty >= stockCount}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

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
            </div>
          </div>
        </div>
      </main>
      )}

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
