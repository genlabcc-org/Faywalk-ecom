import React, { useState, useRef, useEffect } from "react";
import { productService } from "../../services/productService";
import "./addcategory.css";

const EMPTY_FORM = {
  name: "",
  slug: "",
  sort_order: "",
  description: "",
};

// ── Image Upload ──────────────────────────────────────────────
const uploadCategoryImage = async (file, categoryName) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${categoryName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${fileExt}`;
  const filePath = `categories/${fileName}`;

  try {
    await productService.uploadCategoryImage(filePath, file);
    const publicUrl = productService.getCategoryImagePublicUrl(filePath);
    return { url: publicUrl, path: filePath };
  } catch (error) {
    console.error("Upload error:", error);
    return { error };
  }
};

// ── Compress Image ────────────────────────────────────────────
const compressImage = async (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

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

export default function AddCategory({ onBack, onPublish, onSaveDraft, initialData }) {
  const isEditing = !!initialData;

  const [form, setForm] = useState(() =>
    initialData
      ? {
        name: initialData.name || "",
        slug: initialData.slug || "",
        sort_order: initialData.sort_order?.toString() || "",
        description: initialData.description || "",
      }
      : EMPTY_FORM
  );

  const [imageUrl, setImageUrl] = useState(initialData?.image_url || null);
  const [rawFile, setRawFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [materialOptions, setMaterialOptions] = useState([]);
  const [stoneOptions, setStoneOptions] = useState([]);
  const [materialInput, setMaterialInput] = useState("");
  const [stoneInput, setStoneInput] = useState("");

  const fileRef = useRef();

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        slug: initialData.slug || "",
        sort_order: initialData.sort_order?.toString() || "",
        description: initialData.description || "",
      });
      setImageUrl(initialData.image_url || null);
      setRawFile(null);
      setIsActive(initialData.is_active ?? true);
      setMaterialOptions([]);
      setStoneOptions([]);
      setMaterialInput("");
      setStoneInput("");
    } else {
      setForm(EMPTY_FORM);
      setImageUrl(null);
      setRawFile(null);
      setIsActive(true);
      setMaterialOptions([]);
      setStoneOptions([]);
      setMaterialInput("");
      setStoneInput("");
    }
  }, [initialData]);

  const handleAddMaterial = () => {
    const nextValue = materialInput.trim();
    if (nextValue && !materialOptions.includes(nextValue)) {
      setMaterialOptions((prev) => [...prev, nextValue]);
      setMaterialInput("");
    }
  };

  const handleAddStone = () => {
    const nextValue = stoneInput.trim();
    if (nextValue && !stoneOptions.includes(nextValue)) {
      setStoneOptions((prev) => [...prev, nextValue]);
      setStoneInput("");
    }
  };

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const updated = { ...f, [k]: value };
      // Auto-generate slug from name while typing (add mode only)
      if (k === "name" && !isEditing) {
        updated.slug = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      return updated;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    setImageUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setRawFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const removeImage = () => {
    setImageUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setRawFile(null);
  };

  // ── Upload Image ────────────────────────────────────────────
  const uploadImage = async () => {
    if (!rawFile) return { url: imageUrl, error: null };

    setUploading(true);
    const compressed = await compressImage(rawFile);
    const { url, error } = await uploadCategoryImage(compressed, form.name || "category");

    setUploading(false);
    return { url, error };
  };

  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // ── Save Category ───────────────────────────────────────────
  const saveCategory = async (status) => {
    setSaving(true);
    const { url: uploadedUrl, error: uploadError } = await uploadImage();
    if (uploadError) {
      setSaving(false);
      alert("Failed to upload image: " + uploadError.message);
      return { error: uploadError };
    }

    const categoryData = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      sort_order: parseInt(form.sort_order) || initialData?.sort_order || 0,
      description: form.description,
      image_url: uploadedUrl,
      is_active: isActive,
    };

    try {
      if (isEditing) {
        const catId = initialData.category_id || initialData.id;
        const data = await productService.updateCategory(catId, categoryData);
        setSaving(false);
        return { data: data[0], error: null };
      } else {
        const data = await productService.insertCategory(categoryData);
        setSaving(false);
        return { data: data[0], error: null };
      }
    } catch (error) {
      setSaving(false);
      alert((isEditing ? "Update failed: " : "Insert failed: ") + error.message);
      return { error };
    }
  };

  const handlePublish = async () => {
    if (!form.name.trim()) {
      alert("Category name is required.");
      return;
    }
    const result = await saveCategory("active");
    if (!result.error) {
      setToastMessage(isEditing ? "Category Updated Successfully!" : "Category Created Successfully!");
      setShowToast(true);
      setTimeout(() => {
        if (onPublish) onPublish(result.data);
      }, 1200);
    }
  };

  const handleDraft = async () => {
    if (!form.name.trim()) {
      alert("Category name is required.");
      return;
    }
    const result = await saveCategory("draft");
    if (!result.error) {
      setToastMessage("Category Draft Saved Successfully!");
      setShowToast(true);
      setTimeout(() => {
        if (onSaveDraft) onSaveDraft(result.data);
      }, 1200);
    }
  };

  return (
    <div className="ap-page">
      {/* ── Header ── */}
      <div className="ap-header">
        <h1>{isEditing ? "Edit Category" : "Add Category"}</h1>
      </div>

      {/* ── Name & Details ── */}
      <div className="ap-card">
        <div className="ap-card-title">Category Details</div>

        <div className="ap-field">
          <label>Category Name</label>
          <input
            placeholder="e.g. Men, Women, Innerwear, Loungewear"
            value={form.name}
            onChange={set("name")}
          />
        </div>




      </div>

      {/* ── Category Image ── */}
      <div className="ap-card">
        <div className="ap-card-title">Category Image</div>

        <div
          className={`ap-drop-zone ${uploading ? "uploading" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          <div className="ap-drop-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? "Uploading..." : "Click or drop image"}
          </div>
          <div className="ap-drop-hint">SVG, PNG or WEBP • Max 2 MB</div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {imageUrl && (
          <div className="ap-thumbs" style={{ marginTop: 10 }}>
            <div className="ap-thumb-wrapper">
              <img src={imageUrl} className="ap-thumb" alt="Category" />
              <button
                className="ap-thumb-del"
                onClick={(e) => { e.stopPropagation(); removeImage(); }}
                title="Remove image"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Visibility ── */}
      <div className="ap-card">
        <div className="ap-card-title">Visibility</div>
        <div className="ap-toggle-row">
          <div>
            <div className="ap-toggle-label">Active</div>
            <div className="ap-toggle-sub">Category visible on store</div>
          </div>
          <label className="ap-toggle">
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => setIsActive((v) => !v)}
            />
            <span className="ap-slider" />
          </label>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="ap-footer">
        <button type="button" className="ap-btn-draft admin-btn-with-spinner" onClick={handleDraft} disabled={saving || uploading}>
          {saving ? (
            <>
              <span className="admin-btn-spinner admin-btn-spinner--dark" /> Saving...
            </>
          ) : (
            "Save Draft"
          )}
        </button>
        <button type="button" className="ap-btn-publish admin-btn-with-spinner" onClick={handlePublish} disabled={saving || uploading}>
          {saving || uploading ? (
            <>
              <span className="admin-btn-spinner" />
              {saving ? "Saving..." : "Uploading..."}
            </>
          ) : (
            isEditing ? "Update Category" : "Publish Category"
          )}
        </button>
      </div>

      {showToast && (
        <div style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          background: "#111827",
          color: "#fff",
          padding: "14px 24px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          zIndex: 9999,
          animation: "dropdown-fade 0.2s ease"
        }}>
          <span style={{ background: "#10B981", borderRadius: "50%", padding: "4px", display: "flex" }}>
            <svg width="14" height="14" viewBox="0 0 12 10" fill="none">
              <path d="M1 5L4.2 8.2L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={{ fontSize: "14px", fontWeight: "600" }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}