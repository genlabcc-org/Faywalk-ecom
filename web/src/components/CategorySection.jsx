import { useState, useEffect } from "react";
import { productService } from "../services/productService";
import { SkeletonCategories } from "./ui/Skeleton";
import "./CategorySection.css";

export default function CategorySection({
  onCategoryClick,
  title = "CHOOSE BY CATEGORY",
  subtitle = "See what you like",
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await productService.getCategories();
        setCategories(data.filter((cat) => cat.is_active));
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

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

  return (
    <section className="category-section">
      <div className="category-header">
        <h2 className="category-title">{title}</h2>
        {subtitle && <p className="category-subtitle">{subtitle}</p>}
      </div>
      <div className="category-grid">
        {categories.map((cat) => (
          <div
            key={cat.category_id}
            className="category-card"
            onClick={() => onCategoryClick && onCategoryClick(cat.name)}
          >
            <div className="category-img-container">
              <img src={cat.image_url} alt={cat.name} loading="lazy" decoding="async" />
            </div>
            <h3 className="category-name">{cat.name}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}