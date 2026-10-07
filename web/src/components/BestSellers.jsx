import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../hooks/useStore';
import { productService } from '../services/productService';
import { SkeletonProductCard } from './ui/Skeleton';
import './BestSellers.css';

export default function BestSellers({ onProductClick }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Men');

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
            product_variants(price, compare_price, stock),
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
              product_variants(price, compare_price, stock),
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

          const sellingPrice = hasVariants
            ? Math.min(...variants.map((v) => Number(v.price) || Infinity).filter(isFinite))
            : (Number(p.price) || 0);

          const mrp = hasVariants
            ? Math.max(...variants.map((v) => Number(v.compare_price) || 0))
            : (Number(p.compare_price) || 0);

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

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  const filteredProducts = products.filter((p) => {
    if (!activeTab) return true;
    const target = activeTab.toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const hasGenderProducts = products.some((prod) =>
      (prod.category || '').toLowerCase().includes(target) ||
      (prod.name || '').toLowerCase().includes(target)
    );
    if (!hasGenderProducts) return true;
    return cat.includes(target) || name.includes(target);
  });

  return (
    <section className="best-sellers-section">
      <div className="best-sellers-header-row">
        <div className="best-sellers-header-left">
          <h2 className="best-sellers-title">BEST SELLERS</h2>
          <p className="best-sellers-subtitle">Check what's popular in our stock</p>
        </div>
        <div className="best-sellers-tabs">
          <button
            type="button"
            className={`best-sellers-tab-btn ${activeTab === 'Men' ? 'active' : ''}`}
            onClick={() => setActiveTab('Men')}
          >
            Men
          </button>
          <button
            type="button"
            className={`best-sellers-tab-btn ${activeTab === 'Women' ? 'active' : ''}`}
            onClick={() => setActiveTab('Women')}
          >
            Women
          </button>
        </div>
      </div>

      {loading ? (
        <div className="best-sellers-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="best-sellers-empty">
          <p>No products available currently. Check back soon!</p>
        </div>
      ) : (
        <div className="best-sellers-grid">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="best-seller-card"
              onClick={() => onProductClick && onProductClick(product)}
            >
              <div className="best-seller-img-box">
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
                  className="best-seller-add-cart-btn"
                  onClick={(e) => handleAddToCart(e, product)}
                  title="Add to cart"
                >
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
                </button>
              </div>

              <div className="best-seller-info">
                <h3 className="best-seller-name">{product.name}</h3>
                <span className="best-seller-price">{product.price}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
