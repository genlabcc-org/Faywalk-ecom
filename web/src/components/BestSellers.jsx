import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../hooks/useStore';
import { productService } from '../services/productService';
import { SkeletonProductCard } from './ui/Skeleton';
import './BestSellers.css';

export default function BestSellers({ onProductClick }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const cartItems = useStore((state) => state.cartItems);
  const addToCart = useStore((state) => state.addToCart);

  useEffect(() => {
    let isMounted = true;

    const fetchBestSellers = async () => {
      try {
        const { data: newArrivalsData } = await supabase
          .from('products')
          .select('product_id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(8);

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
          .limit(12);

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
            .limit(12);

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
          setProducts(mapped);
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

  const isProductInCart = (product) => {
    const pid = String(product.productId || product.id || product.product_id || '');
    return cartItems?.some(
      (item) => String(item.productId || item.product_id || item.id || '') === pid
    );
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    if (isProductInCart(product)) return;
    addToCart(product, 1);
  };

  return (
    <section className="best-sellers-section">
      <div className="best-sellers-header-row">
        <div className="best-sellers-header-left">
          <h2 className="best-sellers-title">BEST SELLERS</h2>
          <p className="best-sellers-subtitle">Check what's popular in our stock</p>
        </div>
      </div>

      {loading ? (
        <div className="best-sellers-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="best-sellers-empty">
          <p>No products available currently. Check back soon!</p>
        </div>
      ) : (
        <div className="best-sellers-grid">
          {products.map((product) => {
            const inCart = isProductInCart(product);
            return (
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
                  <button
                    type="button"
                    className={`best-seller-add-cart-btn ${inCart ? 'in-cart' : ''}`}
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={inCart}
                    title={inCart ? "Already in cart" : "Add to cart"}
                  >
                    {inCart ? (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Already in Cart</span>
                      </>
                    ) : (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="9" cy="21" r="1"></circle>
                          <circle cx="20" cy="21" r="1"></circle>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span>Add To Cart</span>
                      </>
                    )}
                  </button>
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
          );
        })}
        </div>
      )}
    </section>
  );
}
