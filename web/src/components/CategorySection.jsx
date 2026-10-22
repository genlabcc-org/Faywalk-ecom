import { useState, useEffect, useMemo } from "react";
import { productService } from "../services/productService";
import { supabase } from "../lib/supabase";
import { SkeletonCategories } from "./ui/Skeleton";
import "./CategorySection.css";

const getCategoryDisplayName = (name = "") => {
  const trimmed = (name || "").trim().toLowerCase();
  if (trimmed === "male") return "Men";
  if (trimmed === "female") return "Women";
  return name;
};

export default function CategorySection({
  onCategoryClick,
  onSubcategoryClick,
  title = "CHOOSE BY CATEGORY",
  subtitle = "See what you like",
}) {
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [prodImgMap, setProdImgMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [catsData, prodsRes] = await Promise.all([
          productService.getCategories(),
          supabase
            .from("products")
            .select("subcategory_id, image_url, images")
            .eq("is_active", true),
        ]);

        if (!isMounted) return;

        // Map subcategory_id to the first available product image
        const imgMap = {};
        if (prodsRes?.data) {
          prodsRes.data.forEach((p) => {
            if (p.subcategory_id && !imgMap[p.subcategory_id]) {
              const img = p.image_url || p.images?.[0];
              if (img) imgMap[p.subcategory_id] = img;
            }
          });
        }
        setProdImgMap(imgMap);

        const activeCats = (catsData || []).filter((cat) => cat.is_active);
        setCategories(activeCats);

        if (activeCats.length > 0) {
          // Default to Men / Male if available, else first active category
          const defaultCat =
            activeCats.find(
              (c) =>
                (c.name || "").toLowerCase() === "male" ||
                (c.name || "").toLowerCase() === "men"
            ) || activeCats[0];
          setActiveCategoryId(defaultCat.category_id);
        }
      } catch (err) {
        console.error("Failed to load category data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.category_id === activeCategoryId) || null;
  }, [categories, activeCategoryId]);

  const activeSubcategories = useMemo(() => {
    if (!activeCategory) return [];
    const subs = (activeCategory.subcategories || []).filter(
      (s) => s.is_active !== false
    );
    return subs.map((s) => ({
      ...s,
      displayImage:
        s.image_url ||
        prodImgMap[s.subcategory_id] ||
        activeCategory.image_url,
    }));
  }, [activeCategory, prodImgMap]);

  const handleSubClick = (sub) => {
    if (!activeCategory) return;
    if (onSubcategoryClick) {
      onSubcategoryClick(activeCategory.name, sub.name);
    } else if (onCategoryClick) {
      onCategoryClick(activeCategory.name, sub.name);
    }
  };

  if (loading) {
    return (
      <section className="category-section">
        <div className="category-header">
          <h2 className="category-title">{title}</h2>
          {subtitle && <p className="category-subtitle">{subtitle}</p>}
        </div>
        <div className="category-grid">
          <SkeletonCategories count={4} />
        </div>
      </section>
    );
  }

  const displayName = activeCategory
    ? getCategoryDisplayName(activeCategory.name)
    : "";

  return (
    <section className="category-section">
      <div className="category-header">
        <h2 className="category-title">{title}</h2>
        {subtitle && <p className="category-subtitle">{subtitle}</p>}

        {categories.length > 1 && (
          <div className="category-tabs" role="tablist" aria-label="Category tabs">
            {categories.map((cat) => {
              const isActive = cat.category_id === activeCategoryId;
              return (
                <button
                  key={cat.category_id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`category-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => setActiveCategoryId(cat.category_id)}
                >
                  {getCategoryDisplayName(cat.name)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeSubcategories.length === 0 ? (
        <div className="category-empty-wrap">
          <p className="category-empty-text">
            No subcategories available for {displayName}.
          </p>
          {activeCategory && onCategoryClick && (
            <button
              type="button"
              className="category-view-all-link"
              onClick={() => onCategoryClick(activeCategory.name)}
            >
              Browse all {displayName} products &rarr;
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="category-grid">
            {activeSubcategories.map((sub) => (
              <div
                key={sub.subcategory_id || sub.name}
                className="category-card"
                onClick={() => handleSubClick(sub)}
              >
                <div className="category-img-container">
                  <img
                    src={sub.displayImage}
                    alt={sub.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      if (
                        activeCategory?.image_url &&
                        e.currentTarget.src !== activeCategory.image_url
                      ) {
                        e.currentTarget.src = activeCategory.image_url;
                      }
                    }}
                  />
                </div>
                <h3 className="category-name">{sub.name}</h3>
              </div>
            ))}
          </div>

          {activeCategory && onCategoryClick && (
            <div className="category-view-all-wrap">
              <button
                type="button"
                className="category-view-all-link"
                onClick={() => onCategoryClick(activeCategory.name)}
              >
                View All {displayName} Products &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}