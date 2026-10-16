import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { productService } from "../../services/productService";
import { useStore } from "../../hooks/useStore";
import back from "../../assets/admin/back.png";
import "./addproduct.css";

const COLOR_SWATCHES = [
  "#EF4444", // red
  "#9B111E", // ruby red
  "#E75480", //Pink
  "#FFC0CB", //bady pink
  "#734F96", //lavender
  "#8B2FC9", // purple
  "#87CEEB", // sky blue
  "#4169E1", // royal blue
  "#040273", // deep blue
  "#429E9D", // mint blue
  "#05C3DD", // aqua blue
  "#008000", // green
  "#50C878", //emerald green
  "#98FF98", // mint green
  "#FFFF00", // yellow
  "#FFA500", // orange
  "#111827", // black
  "#FFFFFF", // white
  "#9CA3AF", // gray
  "#2DD4BF", // teal
];

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

export const isColorSelected = (colors = [], swatchHex = "") => {
  if (!Array.isArray(colors) || !swatchHex) return false;
  const target = swatchHex.toLowerCase().trim();
  return colors.some((c) => typeof c === "string" && c.toLowerCase().trim() === target);
};

const EMPTY_FORM = {
  name: "",
  description: "",
  sku: "",
  category_id: "",
  subcategory_id: "",
  price: "",
  compare_price: "",
  // discount_price: "",
  stock: "",
  stock_alert: "",
  material: "",
  weight: "",
  sizes: "",
  colors: [],
  care: "",
};

// ── Image Upload to Supabase Storage ──────────────────────────
const uploadProductImage = async (file, productName) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${productName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  try {
    await productService.uploadProductImage(filePath, file);
    const publicUrl = productService.getProductImagePublicUrl(filePath);
    return { url: publicUrl, path: filePath };
  } catch (error) {
    console.error("Upload error:", error);
    return { error };
  }
};

// ── Compress Image Before Upload ──────────────────────────────
const compressImage = async (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          resolve(
            new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: "image/webp",
            })
          );
        },
        "image/webp",
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
};

const generateSKU = () => `FAY-${Math.floor(100000 + Math.random() * 900000)}`;

export default function AddProduct({ onBack, onPublish, onSaveDraft, onAddVariant, initialData }) {
  const [searchParams] = useSearchParams();
  const urlProductId = searchParams.get("id");
  const [fetchedProduct, setFetchedProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  useEffect(() => {
    if (!initialData && urlProductId) {
      setLoadingProduct(true);
      productService.getProductById(urlProductId)
        .then((p) => {
          if (p) setFetchedProduct(p);
        })
        .catch((err) => {
          console.error("Failed to load product by URL id:", err);
        })
        .finally(() => {
          setLoadingProduct(false);
        });
    }
  }, [initialData, urlProductId]);

  const activeData = initialData || fetchedProduct;
  const isEditing = !!activeData || !!urlProductId;

  const [form, setForm] = useState(() =>
    initialData
      ? {
        name: initialData.name || "",
        description: initialData.description || "",
        sku: initialData.sku || generateSKU(),
        category_id: initialData.category_id || "",
        subcategory_id: initialData.subcategory_id || "",
        price: initialData.price || "",
        compare_price: initialData.compare_price || "",
        // discount_price: initialData.discount_price || "",
        stock: initialData.stock || "",
        stock_alert: initialData.stock_alert || "",
        material: initialData.material || "",
        weight: initialData.weight || "",
        sizes: Array.isArray(initialData.sizes) ? initialData.sizes.join(", ") : (initialData.sizes || ""),
        colors: parseColors(initialData.colors),
        care: initialData.care || "",
      }
      : {
        ...EMPTY_FORM,
        sku: generateSKU(),
      }
  );

  const [imageList, setImageList] = useState(() =>
    initialData?.images?.map((url, i) => ({
      id: `img-old-${i}-${url}`,
      url,
      file: null,
    })) || []
  );
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingAction, setSavingAction] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [errors, setErrors] = useState({});
  const sanitizeInteger = (value) => value.replace(/[^0-9]/g, "");
  const [sizeList, setSizeList] = useState([]);
  const [sizeInput, setSizeInput] = useState("");
  const [visibility, setVisibility] = useState([
    initialData?.is_active ?? false,
    initialData?.is_featured ?? false,
  ]);

  const fileRef = useRef();

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await productService.getCategories();
        setCategories(data || []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!form.category_id) {
        setSubcategories([]);
        return;
      }
      setLoadingSubcategories(true);
      try {
        const data = await productService.getSubCategories(parseInt(form.category_id));
        setSubcategories(data || []);
      } catch (err) {
        console.error("Failed to load subcategories:", err);
      } finally {
        setLoadingSubcategories(false);
      }
    };
    fetchSubcategories();
  }, [form.category_id]);

  const validatePricing = (priceVal, comparePriceVal) => {
    const price = parseFloat(priceVal);
    const comparePrice = parseFloat(comparePriceVal);

    if (!isNaN(price) && !isNaN(comparePrice) && comparePrice > 0 && price >= comparePrice) {
      return "Price must be lower than MRP (Compare-at Price)";
    }
    return null;
  };

  // Reset form when activeData changes
  useEffect(() => {
    if (activeData) {
      setForm({
        name: activeData.name || "",
        description: activeData.description || "",
        sku: activeData.sku || generateSKU(),
        category_id: activeData.category_id || "",
        subcategory_id: activeData.subcategory_id || "",
        price: activeData.price || "",
        compare_price: activeData.compare_price || "",
        // discount_price: activeData.discount_price || "",
        stock: activeData.stock || "",
        stock_alert: activeData.stock_alert || "",
        material: activeData.material || "",
        product_material: activeData.product_material || activeData.material || "",
        weight: activeData.weight || "",
        sizes: Array.isArray(activeData.sizes) ? activeData.sizes.join(", ") : (activeData.sizes || ""),
        colors: parseColors(activeData.colors),
        care: activeData.care || "",
      });

      if (Array.isArray(activeData.product_variants) && activeData.product_variants.length > 0) {
        setSizeList(
          activeData.product_variants.map((v, i) => ({
            id: v.variant_id ? `var-${v.variant_id}` : `size-${i}-${Date.now()}`,
            size: v.size || "",
            stock: v.stock !== undefined && v.stock !== null ? String(v.stock) : "",
            stock_alert: v.stock_alert !== undefined && v.stock_alert !== null ? String(v.stock_alert) : "",
          }))
        );
      } else if (activeData.sizes) {
        const raw = Array.isArray(activeData.sizes)
          ? activeData.sizes
          : typeof activeData.sizes === "string"
            ? activeData.sizes.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
        setSizeList(
          raw.map((s, i) => ({
            id: `size-${i}-${Date.now()}`,
            size: typeof s === "object" ? (s.size || "") : String(s),
            stock: typeof s === "object" ? String(s.stock ?? "") : (activeData.stock !== undefined && activeData.stock !== null ? String(activeData.stock) : ""),
            stock_alert: typeof s === "object" ? String(s.stock_alert ?? "") : (activeData.stock_alert !== undefined && activeData.stock_alert !== null ? String(activeData.stock_alert) : ""),
          }))
        );
      } else {
        setSizeList([]);
      }

      setImageList(
        activeData.images?.map((url, i) => ({
          id: `img-old-${i}-${url}`,
          url,
          file: null,
        })) || []
      );
      setVisibility([activeData.is_active ?? false, activeData.is_featured ?? false]);
    } else if (!urlProductId) {
      setForm({ ...EMPTY_FORM, sku: generateSKU() });
      setSizeList([]);
      setImageList([]);
      setVisibility([false, false]);
    }
  }, [activeData, urlProductId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const addFiles = (newFiles) => {
    const remaining = 6 - imageList.length;
    if (remaining <= 0) return;
    const filesArray = Array.from(newFiles).slice(0, remaining);
    const newItems = filesArray.map((f, i) => ({
      id: `img-new-${Date.now()}-${i}`,
      url: URL.createObjectURL(f),
      file: f,
    }));
    setImageList((prev) => [...prev, ...newItems].slice(0, 6));
  };

  const removeImage = (idx) => {
    setImageList((prev) => {
      const item = prev[idx];
      if (item?.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Drag & Drop to Reorder Thumbnails ─────────────────────────
  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropThumb = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    setImageList((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleVis = (i) =>
    setVisibility((v) => v.map((val, idx) => (idx === i ? !val : val)));

  const toggleColor = (hex) => {
    setForm((f) => {
      const currentColors = parseColors(f.colors);
      const target = hex.toLowerCase().trim();
      const exists = currentColors.some((c) => c.toLowerCase().trim() === target);
      return {
        ...f,
        colors: exists
          ? currentColors.filter((c) => c.toLowerCase().trim() !== target)
          : [...currentColors, hex],
      };
    });
  };

  const clearColors = () => {
    setForm((f) => ({
      ...f,
      colors: [],
    }));
  };

  // ── Dynamic Size Management ──────────────────────────────────
  const handleAddSize = () => {
    const trimmed = sizeInput.trim();
    setSizeList((prev) => [
      ...prev,
      {
        id: `size-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        size: trimmed,
        stock: "",
        stock_alert: "",
      },
    ]);
    setSizeInput("");
  };

  const handleRemoveSize = (id) => {
    setSizeList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateSize = (id, field, value) => {
    setSizeList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // ── Upload All Images to Supabase ────────────────────────────
  const uploadAllImages = async () => {
    if (imageList.length === 0) return { urls: [], error: null };

    setUploading(true);
    const finalUrls = [];

    for (const item of imageList) {
      if (item.file) {
        const { url, error } = await uploadProductImage(
          item.file,
          form.name || "product"
        );

        if (error) {
          setUploading(false);
          return { urls: [], error };
        }

        finalUrls.push(url);
      } else {
        finalUrls.push(item.url);
      }
    }

    setUploading(false);
    return { urls: finalUrls, error: null };
  };

  // ── Save Product to Database ─────────────────────────────────
  const saveProduct = async (status) => {
    setSubmitting(true);
    try {
      console.log("category_id:", form.category_id, "subcategory_id:", form.subcategory_id);
      const { urls, error: uploadError } = await uploadAllImages();
      if (uploadError) {
        alert("Failed to upload images: " + uploadError.message);
        return { error: uploadError };
      }

      const validSizes = sizeList.map((s) => s.size.trim()).filter(Boolean);
      const totalStockFromSizes = sizeList.reduce(
        (sum, item) => sum + (parseInt(item.stock) || 0),
        0
      );
      const hasSizeStock = sizeList.some(
        (item) => item.stock !== "" && !isNaN(parseInt(item.stock))
      );
      const firstAlert = sizeList.find(
        (item) => item.stock_alert !== "" && !isNaN(parseInt(item.stock_alert))
      )?.stock_alert;

      const productData = {
        name: form.name,
        description: form.description,
        sku: form.sku,
        category_id: parseInt(form.category_id) || null,
        subcategory_id: form.subcategory_id || null,
        price: parseFloat(form.price) || 0,
        compare_price: parseFloat(form.compare_price) || null,
        // discount_price: parseFloat(form.discount_price) || null,
        stock: hasSizeStock ? totalStockFromSizes : parseInt(form.stock) || 0,
        stock_alert: firstAlert !== undefined ? parseInt(firstAlert) : parseInt(form.stock_alert) || null,
        material: form.product_material || form.material || "",
        weight: parseFloat(form.weight) || null,
        sizes: validSizes.length > 0 ? validSizes : form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : null,
        colors: parseColors(form.colors),
        care: form.care,
        image_url: urls[0] || null,
        images: urls,
        is_active: visibility[0],
        is_featured: visibility[1],
      };

      if (isEditing) {
        // Update existing product
        const productId = activeData?.product_id || activeData?.id || urlProductId;
        const data = await productService.updateProduct(productId, productData);
        useStore.getState().invalidateProductDetails(productId);
        return { data: data[0], error: null };
      } else {
        // Insert new product
        const data = await productService.insertProduct(productData);
        return { data: data[0], error: null };
      }
    } catch (error) {
      alert((isEditing ? "Update failed: " : "Insert failed: ") + error.message);
      return { error };
    } finally {
      setSubmitting(false);
      setSavingAction(null);
    }
  };

  const handlePublish = async () => {
    if (submitting || uploading) return;
    if (!form.name.trim()) { alert("Product name is required."); return; }
    if (!form.price) { alert("Price is required."); return; }
    if (errors.price) { alert(errors.price); return; }
    setSavingAction("publish");
    const result = await saveProduct("Visible");
    if (!result.error && onPublish) onPublish(result.data);
  };

  const handleDraft = async () => {
    if (submitting || uploading) return;
    if (!form.name.trim()) { alert("Product name is required."); return; }
    if (errors.price) { alert(errors.price); return; }
    setSavingAction("draft");
    const result = await saveProduct("Draft");
    if (!result.error && onSaveDraft) onSaveDraft(result.data);
  };

  const handleCategoryChange = (e) => {
    const newCategoryId = e.target.value;
    setForm((f) => ({ ...f, category_id: newCategoryId, subcategory_id: "" }));
  };

  const handlePriceChange = (e) => {
    const value = sanitizeInteger(e.target.value);
    setForm((f) => {
      const updated = { ...f, price: value };
      const error = validatePricing(value, updated.compare_price);
      setErrors((prev) => ({ ...prev, price: error }));
      return updated;
    });
  };

  const handleComparePriceChange = (e) => {
    const value = sanitizeInteger(e.target.value);
    setForm((f) => {
      const updated = { ...f, compare_price: value };
      const error = validatePricing(updated.price, value);
      setErrors((prev) => ({ ...prev, price: error }));
      return updated;
    });
  };

  const handleAddVariant = () => {
    onAddVariant?.();
  };

  return (
    <div className="ap-page">
      {/* ── Header ── */}
      <div className="ap-header">
        <h1>{isEditing ? "Edit Product" : "Add Product"}</h1>
        {!isEditing && (
          <button
            type="button"
            className="btn-draft ap-header-variant-btn"
            onClick={handleAddVariant}
          >
            + Add Multiple Product
          </button>
        )}
      </div>

      {/* ── Name & Description ── */}
      <div className="card">
        <div className="card-title">Name &amp; description</div>
        <div className="field">
          <label>Product Name</label>
          <input
            placeholder="Input your text"
            value={form.name}
            onChange={set("name")}
          />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            placeholder=""
            value={form.description}
            onChange={set("description")}
          />
        </div>
        <div className="row-2">
          <div className="field">
            <label>SKU</label>
            <input
              placeholder="Auto Generated"
              value={form.sku}
              readOnly
            />
            <div className="auto-hint">Auto Generated</div>
          </div>
          <div className="field">
            <label>Category</label>
            <select
              value={form.category_id}
              onChange={set("category_id")}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Product Details ── */}
      <div className="card">
        <div className="card-title">Product Details</div>
        <div className="grid3-wrap">
          <div className="field">
            <label>Type <span className="scc-optional-tag">optional</span></label>
            {!form.category_id ? (
              <select disabled>
                <option>Select a category first</option>
              </select>
            ) : loadingSubcategories ? (
              <div className="auto-hint">Loading subcategories…</div>
            ) : subcategories.length > 0 ? (
              <select value={form.subcategory_id} onChange={set("subcategory_id")}>
                <option value="">No subcategory</option>
                {subcategories.map((sub) => (
                  <option key={sub.subcategory_id} value={sub.subcategory_id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="auto-hint">No subcategories — listed under category directly.</div>
            )}
          </div>
          <div className="field">
            <label>Product Material</label>
            <input
              type="text"
              placeholder="Enter Product Material"
              value={form.product_material || form.material || ""}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({ ...f, product_material: val, material: val }));
              }}
            />
          </div>
          <div className="field">
            <label>Weight</label>
            <input
              type="text"
              placeholder="Eg: 200g"
              value={form.weight}
              onChange={set("weight")}
            />
          </div>
        </div>

        <div className="field">
          <label>Colors</label>
          <div className="ap-color-grid">
            <button
              type="button"
              className={`ap-color-swatch ap-color-swatch--none${!(form.colors && form.colors.length) ? " ap-color-swatch--selected" : ""
                }`}
              onClick={clearColors}
              aria-label="No color (None)"
              title="No color (None)"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {COLOR_SWATCHES.map((c) => {
              const selected = isColorSelected(form.colors, c);
              const isWhite = c.toUpperCase() === "#FFFFFF";
              return (
                <button
                  key={c}
                  type="button"
                  className={`ap-color-swatch${selected ? " ap-color-swatch--selected" : ""}${isWhite ? " ap-color-swatch--white" : ""
                    }`}
                  style={{ backgroundColor: c }}
                  onClick={() => toggleColor(c)}
                  aria-label={`Toggle color ${c}`}
                  title={c}
                >
                  {selected && (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path
                        d="M1 5L4.2 8.2L11 1"
                        stroke={isWhite ? "#111827" : "#fff"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
            {/* Render any additional/custom colors already on the product */}
            {(parseColors(form.colors) || [])
              .filter((c) => !COLOR_SWATCHES.some((s) => s.toLowerCase() === c.toLowerCase()))
              .map((c) => (
                <button
                  key={c}
                  type="button"
                  className="ap-color-swatch ap-color-swatch--selected"
                  style={{ backgroundColor: c }}
                  onClick={() => toggleColor(c)}
                  aria-label={`Toggle color ${c}`}
                  title={c}
                >
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path
                      d="M1 5L4.2 8.2L11 1"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
          </div>
        </div>

        {/* ── Add Sizes row ── */}
        <div className="row-2 ap-size-add-row">
          <div className="field">
            <label>Size</label>
            <input
              type="text"
              placeholder="Enter size (Eg:38, 40, 50..etc)"
              value={sizeInput}
              onChange={(e) => setSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSize();
                }
              }}
            />
          </div>
          <div className="field ap-size-btn-field">
            <button
              type="button"
              className="ap-add-sizes-btn"
              onClick={handleAddSize}
            >
              Add Sizes +
            </button>
          </div>
        </div>

        {/* ── Dynamic Size Sections ── */}
        {sizeList.length > 0 && (
          <div className="ap-sizes-container">
            <div className="ap-sizes-header">
              <span className="ap-sizes-heading">Product Sizes</span>
              <span className="ap-sizes-badge">
                {sizeList.length} {sizeList.length === 1 ? "size section" : "size sections"}
              </span>
            </div>

            <div className="ap-sizes-list">
              {sizeList.map((item, index) => (
                <div key={item.id} className="ap-size-item-section">
                  <div className="ap-size-item-top">
                    <span className="ap-size-item-index">
                      Section #{index + 1} {item.size ? `• ${item.size}` : ""}
                    </span>
                    <button
                      type="button"
                      className="ap-size-item-del-top"
                      onClick={() => handleRemoveSize(item.id)}
                      title="Delete size section"
                      aria-label="Delete size section"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M12.5 4.5l-.6 8.4a1.5 1.5 0 0 1-1.5 1.4H5.6a1.5 1.5 0 0 1-1.5-1.4l-.6-8.4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>

                  <div className="ap-size-fields-grid">
                    <div className="field">
                      <label>Sizes</label>
                      <input
                        type="text"
                        placeholder="Eg: S, M, L"
                        value={item.size}
                        onChange={(e) => handleUpdateSize(item.id, "size", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Stock</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Eg: 10"
                        value={item.stock}
                        onChange={(e) => handleUpdateSize(item.id, "stock", sanitizeInteger(e.target.value))}
                      />
                    </div>
                    <div className="field">
                      <label>Low Stock Alert</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Eg: 2"
                        value={item.stock_alert}
                        onChange={(e) => handleUpdateSize(item.id, "stock_alert", sanitizeInteger(e.target.value))}
                      />
                    </div>
                    <div className="field ap-size-action-field">
                      <label>Action</label>
                      <button
                        type="button"
                        className="ap-size-del-btn"
                        onClick={() => handleRemoveSize(item.id)}
                        title="Delete size"
                        aria-label="Delete size"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M12.5 4.5l-.6 8.4a1.5 1.5 0 0 1-1.5 1.4H5.6a1.5 1.5 0 0 1-1.5-1.4l-.6-8.4"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Product Images ── */}
      <div className="card">
        <div className="card-title">Product Images</div>
        <div
          className={`drop-zone ${uploading ? "uploading" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="drop-btn">
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? "Uploading..." : "Click or drop image"}
          </div>
          <div className="drop-hint">
            SVG or WEBP • Max 2 MB each • Up to 5 Images
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="thumbs">
          {imageList.map((item, i) => (
            <div
              key={item.id || i}
              className={`thumb-wrapper ${draggedIndex === i ? "thumb-wrapper--dragging" : ""}`}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropThumb(e, i)}
              onDragEnd={handleDragEnd}
              title="Drag to reorder"
            >
              <img src={item.url} className="thumb" alt="" />
              {i === 0 && <span className="thumb-cover-badge">Cover</span>}
              <button
                type="button"
                className="thumb-del"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(i);
                }}
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
          {imageList.length === 0 && <div className="thumb-placeholder" />}
          {imageList.length < 6 && !uploading && (
            <div
              className="add-thumb"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              title="Add image"
            >
              +
            </div>
          )}
        </div>
        <div className="thumb-hint">
          First image will be used as cover thumbnail. Drag and drop any image to reorder.
        </div>
      </div>

      {/* ── Price & Stock ── */}
      <div className="card">
        <div className="card-title">Price &amp; Stock</div>

        <div className="row-2">
          <div className="field">
            <label>Price (₹)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Eg: 2000"
              value={form.price}
              onChange={handlePriceChange}
              className={errors.price ? "input-error" : ""}
            />
            {errors.price && <div className="field-warning">{errors.price}</div>}
          </div>
          <div className="field">
            <label>MRP Price (₹)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Eg: 2000"
              value={form.compare_price}
              onChange={handleComparePriceChange}
            />
          </div>
        </div>
      </div>


      {/* ── Visibility Options ── */}
      <div className="card">
        <div className="card-title">Visibility Options</div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Show On Store</div>
            <div className="toggle-sub">
              Product will be visible to customers
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={visibility[0]}
              onChange={() => toggleVis(0)}
            />
            <span className="slider" />
          </label>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="ap-footer">
        <button
          type="button"
          className="btn-draft"
          onClick={isEditing ? handleDraft : onBack}
          disabled={submitting || uploading}
        >
          {savingAction === "draft" ? (
            <span className="ap-btn-loading">
              <span className="ap-spinner" /> Saving Draft...
            </span>
          ) : isEditing ? (
            "Save as Draft"
          ) : (
            "Cancel"
          )}
        </button>
        <button
          type="button"
          className="btn-publish"
          onClick={handlePublish}
          disabled={submitting || uploading}
        >
          {savingAction === "publish" ? (
            <span className="ap-btn-loading">
              <span className="ap-spinner" /> {uploading ? "Uploading..." : isEditing ? "Updating..." : "Saving..."}
            </span>
          ) : uploading ? (
            "Uploading..."
          ) : isEditing ? (
            "Update Product"
          ) : (
            "Save"
          )}
        </button>
      </div>
    </div>
  );
}