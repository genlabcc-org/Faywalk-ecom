import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { productService } from "../../../services/productService";
import "./SubCategory.css";

const CheckerPlaceholder = () => (
  <div style={{
    width: "100%", height: "100%",
    backgroundImage: "repeating-conic-gradient(#d8d8d8 0% 25%, #e8e8e8 0% 50%)",
    backgroundSize: "16px 16px",
  }} />
);

const SubcategoryCard = ({ sub, productCount, onEdit, onDelete }) => (
  <div className="subcat-card">
    <div className="subcat-card-image-wrap">
      <div className="subcat-card-image">
        {sub.image_url
          ? <img src={sub.image_url} alt={sub.name} />
          : <CheckerPlaceholder />}
      </div>
    </div>
    <div className="subcat-card-body">
      <div className="subcat-card-name" title={sub.name}>{sub.name}</div>
      <div className="subcat-card-meta">{productCount} products</div>
    </div>
    <div className="subcat-card-actions">
      <button className="subcat-btn subcat-btn-edit" onClick={() => onEdit(sub)}>Edit</button>
      <button className="subcat-btn subcat-btn-delete" onClick={() => onDelete(sub)}>Delete</button>
    </div>
  </div>
);

const SubcategoryCards = ({ 
    parentCategory, 
    subcategories: propSubcategories, 
    products = [],
    onFetchSubcategories, 
    onDeleteSubcategory,
    onBack, 
    onAddSubcategory 
}) => {
  const navigate = useNavigate();
  const [localSubcategories, setLocalSubcategories] = useState(propSubcategories || []);
  const [loading, setLoading] = useState(!propSubcategories);
  const parentId = parentCategory?.category_id || parentCategory?.id;

  useEffect(() => {
    if (propSubcategories) {
      setLocalSubcategories(propSubcategories);
    }
  }, [propSubcategories]);

  useEffect(() => {
    if (!parentId) { 
        setLoading(false); 
        return; 
    }
    if (propSubcategories) {
        setLoading(false);
        return;
    }
    setLoading(true);
    if (onFetchSubcategories) {
      onFetchSubcategories(parentId).then((data) => {
        if (data) setLocalSubcategories(data);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [parentId, propSubcategories, onFetchSubcategories]);

  const list = localSubcategories || [];

  const productCountBySubcategory = React.useMemo(() => {
    const counts = {};
    products.forEach((p) => {
        if (p.subcategory_id){
          counts[p.subcategory_id] = (counts[p.subcategory_id] || 0) + 1;
        }
    });
    return counts;
  }, [products]);

  const handleEdit = (sub) =>{
    navigate(`/admin/subcategories/new?parentId=${parentId}&subcategoryId=${sub.subcategory_id}`)
  };

  const handleDelete = async (sub) => {
    const confirmed = window.confirm(`Delete "${sub.name}"?`);
    if (!confirmed) return;
    try {
      await productService.deleteSubcategory(sub.subcategory_id);
      setLocalSubcategories((prev) => prev.filter((s) => s.subcategory_id !== sub.subcategory_id));
      if (onDeleteSubcategory) {
        onDeleteSubcategory(sub.subcategory_id, parentId);
      }
    } catch (error) {
      alert("Failed to delete: " + error.message);
    }
  };

  return (
    <div className="subcat-page">
      <div className="subcat-topbar">
        <button className="subcat-back-btn" onClick={onBack} aria-label="Go back">←</button>
        <h1 className="subcat-title">
          {parentCategory?.name || "Category"} <span className="subcat-title-sub">Subcategories</span>
        </h1>
        <button className="subcat-add-btn" onClick={onAddSubcategory}>+ Add Subcategory</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          No subcategories yet. Click "+ Add Subcategory" to create one.
        </div>
      ) : (
        <div className="subcat-grid">
          {list.map((sub) => (
            <SubcategoryCard
              key={sub.subcategory_id}
              sub={sub}
              productCount={productCountBySubcategory[sub.subcategory_id] || 0} 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SubcategoryCards;