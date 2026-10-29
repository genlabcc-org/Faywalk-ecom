import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { productService } from '../services/productService';
import { SkeletonProductCard } from './ui/Skeleton';
import './BestSellers.css';

export default function BestSellers({ onProductClick }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const checkScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 4;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow);
    setCanScrollRight(overflow);
  };

  useEffect(() => {
    checkScroll();
    const el = sliderRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    const timer = setTimeout(checkScroll, 250);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [products, loading]);

  const handleSlide = (direction) => {
    const el = sliderRef.current;
    if (!el) return;
    const card = el.querySelector('.best-seller-card') || el.firstElementChild;
    const scrollAmount = card ? (card.offsetWidth + 20) : el.clientWidth * 0.75;

    if (direction === 'right') {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    } else {
      if (el.scrollLeft <= 10) {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Auto-slide on desktop (width > 768px)
  useEffect(() => {
    if (loading || !hasOverflow || isPaused) return;

    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
      handleSlide('right');
    }, 3500);

    return () => clearInterval(interval);
  }, [loading, hasOverflow, isPaused]);

  useEffect(() => {
    let isMounted = true;

    const fetchBestSellers = async () => {
      try {
        const { data: newArrivalsData } = await supabase
          .from('products')
          .select('product_id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(6);

        const newArrivalIds = (newArrivalsData || []).map((p) => p.product_id).filter(Boolean);

        let query = supabase
          .from('products')
          .select(`
            product_id,
            name,
            price,
            compare_price,
            discount_price,
            images,
            image_url,
            has_variants,
            is_featured,
            product_variants(price, compare_price, stock, images),
            categories(name, slug)
          `)
          .eq('is_active', true);

        if (newArrivalIds.length > 0) {
          query = query.not('product_id', 'in', `(${newArrivalIds.join(',')})`);
        }

        let { data: distinctData, error: bsError } = await query
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(6);

        if (bsError) {
          console.error('Error fetching best sellers:', bsError);
        }

        let finalProducts = distinctData || [];

        if (finalProducts.length === 0 && newArrivalIds.length > 0) {
          const { data: fallbackData } = await supabase
            .from('products')
            .select(`
              product_id,
              name,
              price,
              compare_price,
              discount_price,
              images,
              image_url,
              has_variants,
              is_featured,
              product_variants(price, compare_price, stock, images),
              categories(name, slug)
            `)
            .eq('is_active', true)
            .order('name', { ascending: true })
            .limit(6);

          finalProducts = fallbackData || [];
        }

        const mapped = finalProducts.map((p) => {
          const variants = p.product_variants || [];
          const hasVariants = !!p.has_variants && variants.length > 0;

          const validVariantPrices = variants
            .map((v) => Number(v.price))
            .filter((n) => !isNaN(n) && n > 0);

          const sellingPrice = hasVariants && validVariantPrices.length > 0
            ? Math.min(...validVariantPrices)
            : (Number(p.price) || 0);

          const matchingVariant = hasVariants
            ? variants.find((v) => Number(v.price) === sellingPrice && Number(v.compare_price) > 0)
            : null;

          const variantMaxCompare = hasVariants
            ? Math.max(...variants.map((v) => Number(v.compare_price) || 0), 0)
            : 0;

          const mrp = Number(matchingVariant?.compare_price) ||
            variantMaxCompare ||
            Number(p.compare_price) ||
            0;

          const hasDiscount = mrp > sellingPrice && sellingPrice > 0;
          const discountPercent = hasDiscount
            ? Math.round(((mrp - sellingPrice) / mrp) * 100)
            : 0;

          const firstVariantImage = hasVariants
            ? variants.find((v) => v.images?.length > 0)?.images?.[0]
            : null;

          const img =
            firstVariantImage ||
            (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image_url || ''));

          const categoryName = p.categories?.name || '';

          return {
            id: p.product_id,
            productId: p.product_id,
            name: p.name,
            img,
            category: categoryName,
            categorySlug: p.categories?.slug || '',
            price: sellingPrice ? `₹${sellingPrice.toLocaleString('en-IN')}` : '',
            rawPrice: sellingPrice,
            rawMrp: mrp,
            discountPercent,
            has_variants: hasVariants,
          };
        });

        if (isMounted) {
          setProducts(mapped.slice(0, 6));
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load best sellers:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchBestSellers();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="best-sellers-section">
      <div className="best-sellers-header-row">
        <div className="best-sellers-header-left">
          <h2 className="best-sellers-title">BEST SELLERS</h2>
          <p className="best-sellers-subtitle">Check what's popular in our stock</p>
        </div>
      </div>

      {loading ? (
        <div className="best-sellers-slider-wrap">
          <div className="best-sellers-grid best-sellers-slider" ref={sliderRef}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="best-seller-skeleton-item">
                <SkeletonProductCard />
              </div>
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="best-sellers-empty">
          <p>No products available currently. Check back soon!</p>
        </div>
      ) : (
        <div
          className="best-sellers-slider-wrap"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {canScrollLeft && hasOverflow && (
            <button
              type="button"
              className="best-sellers-nav-btn best-sellers-nav-prev"
              onClick={() => handleSlide('left')}
              aria-label="Previous products"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          <div
            className={`best-sellers-grid best-sellers-slider ${hasOverflow ? 'has-overflow' : 'is-centered'} ${products.length === 1 ? 'single-item' : ''}`}
            ref={sliderRef}
          >
            {products.map((product) => (
              <article
                key={product.id}
                className="best-seller-card"
                onClick={() => onProductClick && onProductClick(product)}
              >
                <div className="best-seller-img-box">
                  {product.discountPercent > 0 && (
                    <span className="best-seller-discount-badge">
                      {product.discountPercent}% OFF
                    </span>
                  )}
                  <img
                    src={productService.getResizedImageUrl(product.img, 'card')}
                    alt={product.name}
                    className="best-seller-img"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = product.img || '/src/assets/cart/bangle1.webp';
                    }}
                  />
                </div>

                <div className="best-seller-info">
                  <h3 className="best-seller-name">{product.name}</h3>
                  <div className="best-seller-price-row">
                    <span className="best-seller-price">{product.price}</span>
                    {product.rawMrp > product.rawPrice && (
                      <span className="best-seller-mrp-cut">
                        ₹{product.rawMrp.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {canScrollRight && hasOverflow && (
            <button
              type="button"
              className="best-sellers-nav-btn best-sellers-nav-next"
              onClick={() => handleSlide('right')}
              aria-label="Next products"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
