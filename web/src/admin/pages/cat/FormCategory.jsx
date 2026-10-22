import React, { useEffect, useState } from "react";
import "./FormCategory.css";
import { useSearchParams, useNavigate } from "react-router-dom";
import { productService } from "../../../services/productService";
import { compressImage } from '../../../utils/imageCompression';
import { useStore } from "../../../hooks/useStore";


const ChangeRemoveActions = ({ onChange, onRemove }) => (
  <div className="scc-pill-row">
    <button type="button" className="scc-pill scc-pill-change" onClick={onChange}>
      Change
    </button>
    <button type="button" className="scc-pill scc-pill-remove" onClick={onRemove}>
      Remove
    </button>
  </div>
);

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
};

// Toast notification (matches "Sub Category Created Successfully" style)
const SuccessToast = ({ message, onClose }) => (
  <div className="scc-toast">
    <span className="scc-toast-check">
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
        <path
          d="M1 5L4.2 8.2L11 1"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <span className="scc-toast-message">{message}</span>
    <button
      type="button"
      className="scc-toast-close"
      onClick={onClose}
      aria-label="Dismiss notification"
    >
      &#10005;
    </button>
  </div>
);

const CreateSubCategory = ({ parentCategory, categories = [], onBack, onDiscard, onSave }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [showOnStore, setShowOnStore] = useState(true);
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get("parentId");
  const subcategoryId = searchParams.get("subcategoryId");
  const isEditMode = !!subcategoryId;
  const [currentParentId, setCurrentParentId] = useState(parentId || parentCategory?.id || null);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      const resolvedParentId = currentParentId || parentId;
      if (resolvedParentId) {
        navigate(`/admin/subcategories?parentId=${resolvedParentId}`);
      } else {
        navigate("/admin/categories");
      }
    }
  };

  const [coverImage, setCoverImage] = useState(null); // { file, url, dims }
  const [imageError, setImageError] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  //   const [previewImage, setPreviewImage] = useState(null);

  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = React.useRef(null);


  const coverInputRef = React.useRef(null);
  //   const previewInputRef = React.useRef(null);
  //   const parentId = searchParams.get("parentId");

  const matchedParent = categories.find(
    (c) => String(c.category_id ?? c.id) === String(parentId)
  );

  const [parentCategoryName, setParentCategoryName] = useState(
    matchedParent?.name || ""
  );

  useEffect(() => {
    if (matchedParent?.name && !parentCategoryName) {
      setParentCategoryName(matchedParent.name);
    }
  }, [matchedParent, parentCategoryName]);

  useEffect(() => {
    if (!subcategoryId) return;
    const loadExistingSubcategory = async () => {
      try {
        let existing = null;
        if (parentId) {
          const rows = await productService.getSubCategories(parentId);
          existing = rows.find((s) => String(s.subcategory_id) === String(subcategoryId));
        }
        if (!existing) {
          const allRows = await productService.getSubCategories();
          existing = allRows.find((s) => String(s.subcategory_id) === String(subcategoryId));
        }
        if (existing) {
          setName(existing.name || "");
          setShowOnStore(existing.is_active !== false);
          if (existing.image_url) {
            setCoverImage({ url: existing.image_url, name: "current-image", file: null });
          }
          if (existing.parent_id) {
            setCurrentParentId(existing.parent_id);
            if (!parentCategoryName) {
              const foundParent = categories.find(
                (c) => String(c.category_id ?? c.id) === String(existing.parent_id)
              );
              if (foundParent) {
                setParentCategoryName(foundParent.name);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading subcategory:", error);
      } finally {
        setLoadingExisting(false);
      }
    };
    loadExistingSubcategory();
  }, [subcategoryId, parentId, categories, parentCategoryName]);

  const handleFileSelect = (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(false);

    // Use a base64 data URL (via FileReader), not URL.createObjectURL.
    // Blob URLs only live for the current tab session — they break the
    // instant the page refreshes, even if saved into localStorage. A data
    // URL is just a string, so it serializes and survives a reload.
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        setter({
          file,
          url: dataUrl,
          name: file.name,
          width: img.width,
          height: img.height,
          size: formatBytes(file.size),
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };


  const dismissToast = () => {
    setShowToast(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveClick = async () => {
    if (!name.trim()) {
      alert("Please enter a subcategory name.");
      return;
    }

    const hasImage = !!(coverImage && (coverImage.file || coverImage.url));
    if (!hasImage) {
      setImageError(true);
      alert("Please upload a subcategory image. Subcategory cannot be saved without an image.");
      return;
    }
    setImageError(false);

    if (isSaving) return;

    setIsSaving(true);
    try {
      let imageUrl = coverImage?.url && !coverImage?.file ? coverImage.url : null;

      if (coverImage?.file) {
        const compressedFile = await compressImage(coverImage.file);
        const safeName = (compressedFile?.name || coverImage.file?.name || `subcat-${Date.now()}`).replace(/\s+/g, '-');
        const filePath = `subcategories/${Date.now()}-${safeName}`;
        await productService.uploadSubcategoryImage(filePath, compressedFile);
        imageUrl = productService.getSubcategoryImagePublicUrl(filePath);
      }

      const resolvedParentId = currentParentId || parentId || parentCategory?.id;

      const payload = {
        name: name.trim(),
        image_url: imageUrl,
        is_active: showOnStore,
      };

      if (resolvedParentId) {
        payload.parent_id = resolvedParentId;
      }

      const saved = isEditMode
        ? await productService.updateSubcategory(subcategoryId, payload)
        : await productService.createSubcategory(payload);

      try {
        await useStore.getState().fetchCategories(true);
      } catch (err) {
        console.warn("Failed to refresh categories store:", err);
      }

      setIsSaving(false);
      setShowToast(true);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowToast(false);
        toastTimerRef.current = null;
        onSave?.(saved);
      }, 1000);
    } catch (error) {
      console.error("Error saving subcategory:", error);
      setIsSaving(false);
      alert("Failed to save subcategory: " + error.message);
    }
  };

  return (
    <div className="dashboard-shell">
      {showToast && (
        <SuccessToast
          message={isEditMode ? "Sub Category Updated Successfully" : "Sub Category Created Successfully"}
          onClose={dismissToast}
        />
      )}

      <div className="dashboard-body">
        <main className="scc-page">
          <div className="scc-topbar">
            <div className="scc-topbar-left">
              <h1 className="scc-title">{isEditMode ? "Edit Sub Category" : "Create Sub Category"}</h1>
            </div>
          </div>

          <div className="scc-form-wrap">
            <div className="scc-card">
              {/* Sub Category Information */}
              <section className="scc-section">
                <h2 className="scc-card-title">Sub Category Information</h2>
                <div className="scc-divider" />

                <label className="scc-field-label" htmlFor="scc-name">
                  Sub Category Name
                </label>
                <input
                  id="scc-name"
                  type="text"
                  className="scc-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vests, Briefs, Boxers, Trunks"
                />

                <label className="scc-field-label" htmlFor="scc-parent-category">
                  Parent Category Name
                </label>

                <input
                  id="scc-parent-category"
                  type="text"
                  className="scc-input"
                  value={parentCategoryName}
                  onChange={(e) => setParentCategoryName(e.target.value)}
                  placeholder="e.g. Men, Women"
                  readOnly={!!matchedParent}
                  style={matchedParent ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : undefined}
                />
                {matchedParent && (
                  <div className="scc-optional-tag" style={{ marginTop: 4 }}>
                    Locked — creating a subcategory under "{matchedParent.name}"
                  </div>
                )}

              </section>

              {/* Sub Category Cover Image */}
              <section className="scc-section">
                <h2 className="scc-card-title">Sub Category Cover Image</h2>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFileSelect(e, setCoverImage)}
                />

                {coverImage ? (
                  <div className="scc-cover-filled">
                    <div className="scc-cover-image-wrap">
                      <img src={coverImage.url} alt="Sub category cover" />
                    </div>
                    <div className="scc-cover-meta">
                      <span className="scc-meta-filename">{coverImage.name}</span>
                      <span className="scc-meta-line">Uploaded just now</span>
                      <span className="scc-meta-line">
                        {coverImage.width}×{coverImage.height} · {coverImage.size}
                      </span>
                      <ChangeRemoveActions
                        onChange={() => coverInputRef.current?.click()}
                        onRemove={() => setCoverImage(null)}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`scc-dropzone ${imageError ? "scc-dropzone-error" : ""}`}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <button type="button" className="scc-dropzone-btn">
                      <span className="scc-dropzone-icon">&#8595;</span>
                      Click or drop image
                    </button>
                    <span className="scc-dropzone-hint">
                      JPG, PNG or WEBP &middot; Max 2 MB &middot; 16:9 Ratio
                    </span>
                    {imageError && (
                      <span style={{ color: "#ef4444", fontSize: "12.5px", marginTop: "4px", fontWeight: "600" }}>
                        Subcategory image is required
                      </span>
                    )}
                  </div>
                )}
              </section>

              {/* Visibility Options */}
              <section className="scc-section scc-visibility-section">
                <h2 className="scc-card-title">Visibility Options</h2>
                <div className="scc-visibility-row">
                  <div>
                    <div className="scc-visibility-title">Show On Store</div>
                    <div className="scc-visibility-subtitle">
                      Product will be visible to customers
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`scc-toggle ${showOnStore ? "scc-toggle-on" : ""}`}
                    onClick={() => setShowOnStore((v) => !v)}
                    aria-pressed={showOnStore}
                    aria-label="Toggle show on store"
                  >
                    <span className="scc-toggle-knob" />
                  </button>
                </div>
              </section>
            </div>

            <div className="scc-bottom-actions">
              <button
                type="button"
                className="scc-btn scc-btn-outline"
                onClick={onDiscard}
                disabled={isSaving}
              >
                Discard
              </button>
              <button
                type="button"
                className="scc-btn scc-btn-dark"
                onClick={handleSaveClick}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : isEditMode ? "Update Subcategory" : "Save Subcategory"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateSubCategory;