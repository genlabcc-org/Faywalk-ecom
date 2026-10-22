import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { productService } from '../services/productService';
import { SkeletonProductCard } from './ui/Skeleton';
import './NewArrivals.css';

export default function NewArrivals({ onProductClick }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchNewArrivals = async () => {
      try {
        const { data, error } = await supabase
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
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) {
          console.error('Error fetching new arrivals:', error);
          if (isMounted) {
            setProducts([]);
            setLoading(false);
          }
          return;
        }

        const mapped = (data || []).map((p) => {
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
        console.error('Failed to load new arrivals:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchNewArrivals();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="new-arrivals-section">
      <div className="new-arrivals-header-row">
        <div className="new-arrivals-header-left">
          <h2 className="new-arrivals-title">NEW ARRIVALS</h2>
          <p className="new-arrivals-subtitle">Check what's new in our stock</p>
        </div>
      </div>

      {loading ? (
        <div className="new-arrivals-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="new-arrivals-empty">
          <p>No new products found. Check back soon!</p>
        </div>
      ) : (
        <div className="new-arrivals-grid">
          {products.map((product) => (
            <article
              key={product.id}
              className="new-arrival-card"
              onClick={() => onProductClick && onProductClick(product)}
            >
              <div className="new-arrival-img-box">
                {product.discountPercent > 0 && (
                  <span className="new-arrival-discount-badge">
                    {product.discountPercent}% OFF
                  </span>
                )}
                <img
                  src={productService.getResizedImageUrl(product.img, 'card')}
                  alt={product.name}
                  className="new-arrival-img"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = product.img || '/src/assets/cart/bangle1.webp';
                  }}
                />
              </div>

              <div className="new-arrival-info">
                <h3 className="new-arrival-name">{product.name}</h3>
                <div className="new-arrival-price-row">
                  <span className="new-arrival-price">{product.price}</span>
                  {product.rawMrp > product.rawPrice && (
                    <span className="new-arrival-mrp-cut">
                      ₹{product.rawMrp.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
