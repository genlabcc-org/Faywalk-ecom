import React, { useState, useEffect } from "react";
import { variantService } from "../../services/variantService";
import { useStore } from "../../hooks/useStore";
import { getColorName } from "../../utils/colorUtils";
import ConfirmDialog from "./dialogs/confirmdialogs";
import "./addproduct.css";

const COLOR_SWATCHES = [
  "#000000", // Black
  "#FFFFFF", // White
  "#000080", // Navy Blue
  "#0000FF", // Blue
  "#800000", // Maroon (merrun)
  "#EF4444", // Red
  "#9B111E", // Ruby Red
  "#E75480", // Pink
  "#FFC0CB", // Baby Pink
  "#734F96", // Lavender
  "#8B2FC9", // Purple
  "#4169E1", // Royal Blue
  "#87CEEB", // Sky Blue
  "#040273", // Deep Blue
  "#05C3DD", // Aqua Blue
  "#2DD4BF", // Teal
  "#008000", // Green
  "#50C878", // Emerald Green
  "#98FF98", // Mint Green
  "#FFFF00", // Yellow
  "#FFA500", // Orange
  "#78350F", // Brown
  "#9CA3AF", // Gray
  "#FFD700", // Gold
  "#C0C0C0", // Silver
];

const FieldError = ({ children }) => (
  <div className="cmp-error">
    <svg className="cmp-error-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="#DC2626" strokeWidth="1.3" />
      <line x1="7" y1="4" x2="7" y2="7.8" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="10" r="0.75" fill="#DC2626" />
    </svg>
    <span>{children}</span>
  </div>
);

const InfoHint = ({ children }) => (
  <div className="cmp-info-hint">
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="#9CA3AF" strokeWidth="1.3" />
      <line x1="7" y1="6.2" x2="7" y2="10" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="4" r="0.75" fill="#9CA3AF" />
    </svg>
    <span>{children}</span>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    className={`cmp-toggle ${checked ? "cmp-toggle--on" : ""}`}
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
  >
    <span className="cmp-toggle-knob" />
  </button>
);

let variantSeq = 0;
const generateVariantSKU = () => `FAY-${Math.floor(100000 + Math.random() * 900000)}`;

const calcDiscount = (mrp, sellingPrice) => {
  const m = parseFloat(mrp);
  const s = parseFloat(sellingPrice);
  if (!isNaN(m) && !isNaN(s) && m > 0 && s >= 0 && m > s) {
    return Math.round(((m - s) / m) * 100);
  }
  return 0;
};

// Normalizes size rows loaded from draft (handles old flat structures gracefully)
const normalizeDraftSizes = (draftSizes) => {
  if (!Array.isArray(draftSizes)) return [];
  return draftSizes.map((item) => {
    if (Array.isArray(item.colors)) {
      return item;
    }
    const color = item.color || null;
    return {
      id: item.id || `size-${Date.now()}-${variantSeq++}`,
      size: item.size || "",
      colors: color
        ? [
          {
            id: `cv-${Date.now()}-${variantSeq++}`,
            variant_id: item.variant_id,
            color,
            quantity: item.quantity || "",
            originalPrice: item.originalPrice || "",
            offerPrice: item.offerPrice || "",
            sku: item.sku || generateVariantSKU(),
            images: item.images || [],
            media: [],
          },
        ]
        : [],
      defaultVariant: {
        id: `def-${Date.now()}-${variantSeq++}`,
        variant_id: item.variant_id,
        color: null,
        quantity: item.quantity || "",
        originalPrice: item.originalPrice || "",
        offerPrice: item.offerPrice || "",
        sku: item.sku || generateVariantSKU(),
        images: item.images || [],
        media: [],
      },
    };
  });
};

const AddProduct = ({
  categories = [],
  categoryPath = [],
  onGoToRoot,
  onBreadcrumbClick,
  onBack,
  onSave,
  subcategoriesCache = {},
  onFetchSubcategories,
  editingProductId = null,
}) => {
  const isEditing = !!editingProductId;
  const [loading, setLoading] = useState(isEditing);
  const draftKey = `faywalk_variant_draft_${editingProductId || "new"}`;

  const getSavedDraft = () => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const initialDraft = !isEditing ? getSavedDraft() : null;

  const [title, setTitle] = useState(() => initialDraft?.title || "");
  const [description, setDescription] = useState(() => initialDraft?.description || "");
  const [sku, setSku] = useState(() => initialDraft?.sku || generateVariantSKU());
  const [material, setMaterial] = useState(() => initialDraft?.material || "");
  const [category, setCategory] = useState(() => initialDraft?.category || "");
  const [subCategory, setSubCategory] = useState(() => initialDraft?.subCategory || "");
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const subcategories = subcategoriesCache[category] || [];

  // ── Global stock & prices ──
  const [globalStock, setGlobalStock] = useState(() => initialDraft?.globalStock || "");
  const [globalOriginalPrice, setGlobalOriginalPrice] = useState(() => initialDraft?.globalOriginalPrice || "");
  const [globalOfferPrice, setGlobalOfferPrice] = useState(() => initialDraft?.globalOfferPrice || "");

  // Common colors (optional default template for all sizes)
  const [commonColors, setCommonColors] = useState(() => initialDraft?.commonColors || []);

  // ── Size rows: each has { id, size, colors: [ { id, color, quantity, ... } ], defaultVariant } ──
  const [sizeRows, setSizeRows] = useState(() => normalizeDraftSizes(initialDraft?.sizeRows));
  const [sizeInput, setSizeInput] = useState("");



  const [showOnStoreExplicit, setShowOnStoreExplicit] = useState(() => Boolean(initialDraft?.showOnStoreExplicit));
  const [showOnStore, setShowOnStore] = useState(() => {
    if (initialDraft && initialDraft.showOnStoreExplicit) {
      return Boolean(initialDraft.showOnStore);
    }
    return true;
  });
  const [featuredProduct, setFeaturedProduct] = useState(() => initialDraft?.featuredProduct ?? true);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletedVariantIds, setDeletedVariantIds] = useState([]);
  const [sizeToDelete, setSizeToDelete] = useState(null);

  // Persist draft in sessionStorage across page refreshes (strips File objects)
  useEffect(() => {
    if (saving || loading) return;
    try {
      const serializableSizes = sizeRows.map((s) => ({
        ...s,
        colors: (s.colors || []).map((cv) => ({
          ...cv,
          media: [],
        })),
        defaultVariant: s.defaultVariant
          ? { ...s.defaultVariant, media: [] }
          : s.defaultVariant,
      }));

      const draftData = {
        title,
        description,
        sku,
        material,
        category,
        subCategory,
        commonColors,
        globalStock,
        globalOriginalPrice,
        globalOfferPrice,
        sizeRows: serializableSizes,
        showOnStore,
        showOnStoreExplicit,
        featuredProduct,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch (e) {
      console.warn("Could not save variant draft:", e);
    }
  }, [
    title,
    description,
    sku,
    material,
    category,
    subCategory,
    commonColors,
    globalStock,
    globalOriginalPrice,
    globalOfferPrice,
    sizeRows,
    showOnStore,
    showOnStoreExplicit,
    featuredProduct,
    draftKey,
    saving,
    loading,
  ]);

  // Clear draft on unmount so leaving the page clears prefilled data
  useEffect(() => {
    return () => {
      try {
        sessionStorage.removeItem(draftKey);
      } catch { }
    };
  }, [draftKey]);

  // ── Load existing product + variants when editing ──
  useEffect(() => {
    if (!editingProductId) return;
    let isCurrent = true;

    const load = async () => {
      setLoading(true);
      try {
        const { product, variants: existingVariants } = await variantService.getProductWithVariants(editingProductId);
        if (!isCurrent) return;

        setTitle(product.name || "");
        setDescription(product.description || "");
        setSku(product.sku || generateVariantSKU());
        setMaterial(product.material || "");
        setCategory(product.category_id != null ? String(product.category_id) : "");
        setSubCategory(product.subcategory_id != null ? String(product.subcategory_id) : "");
        setShowOnStore(!!product.is_active);
        setFeaturedProduct(!!product.is_featured);

        if (existingVariants.length > 0) {
          // Group variants by size
          const sizeMap = new Map();
          existingVariants.forEach((v) => {
            const sizeKey = v.size || "Standard";
            if (!sizeMap.has(sizeKey)) {
              sizeMap.set(sizeKey, []);
            }
            sizeMap.get(sizeKey).push(v);
          });

          const restoredSizes = [];
          for (const [sizeName, varList] of sizeMap.entries()) {
            const colorVars = [];
            let defVar = null;

            varList.forEach((v) => {
              const item = {
                id: `cv-${v.variant_id}`,
                variant_id: v.variant_id,
                color: v.color || null,
                quantity: String(v.stock ?? "0"),
                originalPrice: String(v.compare_price ?? ""),
                offerPrice: String(v.price ?? ""),
                sku: v.sku || generateVariantSKU(),
                images: Array.isArray(v.images) ? v.images : (v.images ? [v.images] : []),
                media: [],
              };
              if (v.color) {
                colorVars.push(item);
              } else {
                defVar = item;
              }
            });

            restoredSizes.push({
              id: `size-${sizeName}-${Date.now()}-${variantSeq++}`,
              size: sizeName,
              colors: colorVars,
              defaultVariant: defVar || {
                id: `def-${Date.now()}-${variantSeq++}`,
                color: null,
                quantity: String(product.stock ?? "0"),
                originalPrice: String(product.compare_price ?? ""),
                offerPrice: String(product.price ?? ""),
                sku: generateVariantSKU(),
                images: [],
                media: [],
              },
            });
          }

          setSizeRows(restoredSizes);

          const distinctColors = [
            ...new Set(existingVariants.map((v) => v.color).filter(Boolean)),
          ];
          setCommonColors(distinctColors);
        } else {
          // Fallback for single product with no variants recorded in product_variants yet
          const prodImages = Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : (product.image_url ? [product.image_url] : []);
          setSizeRows([
            {
              id: `size-standard-${Date.now()}`,
              size: product.size || "Free Size",
              colors: [],
              defaultVariant: {
                id: `def-${Date.now()}`,
                color: null,
                quantity: String(product.stock ?? "0"),
                originalPrice: String(product.compare_price ?? ""),
                offerPrice: String(product.price ?? ""),
                sku: product.sku || generateVariantSKU(),
                images: prodImages,
                media: [],
              },
            },
          ]);
        }

        if (product.compare_price) setGlobalOriginalPrice(String(product.compare_price));
        if (product.price) setGlobalOfferPrice(String(product.price));
        if (product.stock != null) setGlobalStock(String(product.stock));

      } catch (err) {
        if (!isCurrent) return;
        console.error("Failed to load product for editing:", err);
        alert("Failed to load product: " + err.message);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isCurrent = false;
    };
  }, [editingProductId]);

  useEffect(() => {
    if (!category) return;
    if (subcategoriesCache[category]) return;

    const fetchSubcategories = async () => {
      setLoadingSubcategories(true);
      try {
        await onFetchSubcategories?.(category);
      } catch (err) {
        console.error("Failed to load subcategories:", err);
      } finally {
        setLoadingSubcategories(false);
      }
    };
    fetchSubcategories();
  }, [category, subcategoriesCache, onFetchSubcategories]);

  // ── Global Stock & Price Synchronizers ──
  const handleUpdateGlobalStock = (val) => {
    setGlobalStock(val);
    setSizeRows((prev) =>
      prev.map((s) => ({
        ...s,
        colors: (s.colors || []).map((cv) => ({ ...cv, quantity: val })),
        defaultVariant: s.defaultVariant
          ? { ...s.defaultVariant, quantity: val }
          : s.defaultVariant,
      }))
    );
    if (val !== "") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.globalStock;
        Object.keys(next).forEach((key) => {
          if (next[key]?.quantity) {
            const rowErr = { ...next[key] };
            delete rowErr.quantity;
            if (Object.keys(rowErr).length === 0) delete next[key];
            else next[key] = rowErr;
          }
        });
        return next;
      });
    }
  };

  const handleUpdateGlobalOffer = (val) => {
    setGlobalOfferPrice(val);
    setSizeRows((prev) =>
      prev.map((s) => ({
        ...s,
        colors: (s.colors || []).map((cv) => ({ ...cv, offerPrice: val })),
        defaultVariant: s.defaultVariant
          ? { ...s.defaultVariant, offerPrice: val }
          : s.defaultVariant,
      }))
    );
  };

  const handleUpdateGlobalOriginal = (val) => {
    setGlobalOriginalPrice(val);
    setSizeRows((prev) =>
      prev.map((s) => ({
        ...s,
        colors: (s.colors || []).map((cv) => ({ ...cv, originalPrice: val })),
        defaultVariant: s.defaultVariant
          ? { ...s.defaultVariant, originalPrice: val }
          : s.defaultVariant,
      }))
    );
  };

  // ── Common colors template ──
  const handleToggleCommonColor = (colorHex) => {
    const norm = (colorHex || "").toLowerCase().trim();
    const isSelected = commonColors.some((c) => (c || "").toLowerCase().trim() === norm);
    const nextCommon = isSelected
      ? commonColors.filter((c) => (c || "").toLowerCase().trim() !== norm)
      : [...commonColors, colorHex];

    setCommonColors(nextCommon);

    if (sizeRows.length > 0) {
      if (isSelected) {
        // Remove this color from all sizes
        setSizeRows((prev) =>
          prev.map((s) => ({
            ...s,
            colors: (s.colors || []).filter(
              (cv) => (cv.color || "").toLowerCase().trim() !== norm
            ),
          }))
        );
      } else {
        // Add this color to all sizes that don't already have it
        const cName = getColorName(colorHex) || "Color";
        const shortCode = cName.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
        const existingImgs = findExistingImagesForColor(colorHex, sizeRows);

        setSizeRows((prev) =>
          prev.map((s) => {
            const hasColor = (s.colors || []).some(
              (cv) => (cv.color || "").toLowerCase().trim() === norm
            );
            if (hasColor) return s;
            const newCv = {
              id: `cv-${Date.now()}-${variantSeq++}`,
              color: colorHex,
              quantity: s.defaultVariant?.quantity || globalStock || "",
              originalPrice: s.defaultVariant?.originalPrice || globalOriginalPrice || "",
              offerPrice: s.defaultVariant?.offerPrice || globalOfferPrice || "",
              sku: `${sku}-${s.size}-${shortCode}`,
              images: existingImgs.images,
              media: existingImgs.media,
            };
            return {
              ...s,
              colors: [...(s.colors || []), newCv],
            };
          })
        );
      }
    }
  };

  const handleApplyCommonColorsToAllSizes = () => {
    if (commonColors.length === 0) {
      alert("Please select at least one common color first.");
      return;
    }
    setSizeRows((prev) =>
      prev.map((s) => {
        const existingColorMap = new Map((s.colors || []).map((cv) => [(cv.color || "").toLowerCase().trim(), cv]));
        const updatedColors = commonColors.map((colorHex) => {
          const key = colorHex.toLowerCase().trim();
          if (existingColorMap.has(key)) {
            return existingColorMap.get(key);
          }
          const cName = getColorName(colorHex) || "Color";
          const shortCode = cName.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
          const existingImgs = findExistingImagesForColor(colorHex, prev);
          return {
            id: `cv-${Date.now()}-${variantSeq++}`,
            color: colorHex,
            quantity: s.defaultVariant?.quantity || globalStock || "",
            originalPrice: s.defaultVariant?.originalPrice || globalOriginalPrice || "",
            offerPrice: s.defaultVariant?.offerPrice || globalOfferPrice || "",
            sku: `${sku}-${s.size}-${shortCode}`,
            images: existingImgs.images,
            media: existingImgs.media,
          };
        });
        return {
          ...s,
          colors: updatedColors,
        };
      })
    );
  };

  // ── Helper: find any images already uploaded for a color across any sizes ──
  const findExistingImagesForColor = (colorHex, currentRows = sizeRows) => {
    if (!colorHex) return { images: [], media: [] };
    const norm = colorHex.toLowerCase().trim();
    for (const s of currentRows) {
      const match = (s.colors || []).find(
        (cv) => (cv.color || "").toLowerCase().trim() === norm
      );
      if (match && ((match.images && match.images.length > 0) || (match.media && match.media.length > 0))) {
        return {
          images: match.images ? [...match.images] : [],
          media: match.media ? [...match.media] : [],
        };
      }
    }
    return { images: [], media: [] };
  };

  // ── Helper: find existing images for default variant across any sizes ──
  const findExistingDefaultImages = (currentRows = sizeRows) => {
    for (const s of currentRows) {
      const def = s.defaultVariant;
      if (def && ((def.images && def.images.length > 0) || (def.media && def.media.length > 0))) {
        return {
          images: def.images ? [...def.images] : [],
          media: def.media ? [...def.media] : [],
        };
      }
    }
    return { images: [], media: [] };
  };

  // ── Size row management ──
  const handleAddSize = (specificSize) => {
    const trimmed = (typeof specificSize === "string" ? specificSize : sizeInput).trim();
    if (!trimmed) return;

    if (sizeRows.some((r) => r.size.toLowerCase() === trimmed.toLowerCase())) {
      if (typeof specificSize !== "string") {
        alert(`Size "${trimmed}" already exists.`);
      }
      return;
    }

    const initialColors = commonColors.map((colorHex) => {
      const cName = getColorName(colorHex) || "Color";
      const shortCode = cName.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
      const existingImgs = findExistingImagesForColor(colorHex, sizeRows);
      return {
        id: `cv-${Date.now()}-${variantSeq++}`,
        color: colorHex,
        quantity: globalStock || "",
        originalPrice: globalOriginalPrice || "",
        offerPrice: globalOfferPrice || "",
        sku: `${sku}-${trimmed}-${shortCode}`,
        images: existingImgs.images,
        media: existingImgs.media,
      };
    });

    const existingDefImgs = findExistingDefaultImages(sizeRows);

    const newSize = {
      id: `size-${Date.now()}-${variantSeq++}`,
      size: trimmed,
      colors: initialColors,
      defaultVariant: {
        id: `def-${Date.now()}-${variantSeq++}`,
        color: null,
        quantity: globalStock || "",
        originalPrice: globalOriginalPrice || "",
        offerPrice: globalOfferPrice || "",
        sku: `${sku}-${trimmed}`,
        images: existingDefImgs.images,
        media: existingDefImgs.media,
      },
    };

    setSizeRows((prev) => [...prev, newSize]);
    if (typeof specificSize !== "string") setSizeInput("");
    clearTopError("sizes");
  };

  // Toggle a color for a specific size
  const handleToggleColorForSize = (sizeId, colorHex) => {
    setSizeRows((prev) =>
      prev.map((s) => {
        if (s.id !== sizeId) return s;

        const currentColors = s.colors || [];
        const isPresent = currentColors.some(
          (cv) => (cv.color || "").toLowerCase().trim() === colorHex.toLowerCase().trim()
        );

        if (isPresent) {
          // Remove color
          const removed = currentColors.find(
            (cv) => (cv.color || "").toLowerCase().trim() === colorHex.toLowerCase().trim()
          );
          if (removed?.variant_id) {
            setDeletedVariantIds((ids) => [...ids, removed.variant_id]);
          }
          return {
            ...s,
            colors: currentColors.filter(
              (cv) => (cv.color || "").toLowerCase().trim() !== colorHex.toLowerCase().trim()
            ),
          };
        } else {
          // Add color - auto-inherit any images already uploaded for this color in other sizes!
          const cName = getColorName(colorHex) || "Color";
          const shortCode = cName.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
          const baseQty = s.defaultVariant?.quantity || globalStock || "";
          const baseOffer = s.defaultVariant?.offerPrice || globalOfferPrice || "";
          const baseOriginal = s.defaultVariant?.originalPrice || globalOriginalPrice || "";
          const existingImgs = findExistingImagesForColor(colorHex, prev);

          const newCv = {
            id: `cv-${Date.now()}-${variantSeq++}`,
            color: colorHex,
            quantity: baseQty,
            originalPrice: baseOriginal,
            offerPrice: baseOffer,
            sku: `${sku}-${s.size}-${shortCode}`,
            images: existingImgs.images,
            media: existingImgs.media,
          };
          return {
            ...s,
            colors: [...currentColors, newCv],
          };
        }
      })
    );
  };

  // Image upload for a color variant (auto-syncs across all sizes sharing this color, max 2 images per color)
  const handleColorImagesUpload = (sizeId, colorVariantId, fileList) => {
    if (!fileList || fileList.length === 0) return;

    // Find the target color of the variant being updated
    let targetCv = null;
    let targetColor = null;
    for (const s of sizeRows) {
      const match = (s.colors || []).find((cv) => cv.id === colorVariantId);
      if (match) {
        targetCv = match;
        targetColor = match.color;
        break;
      }
    }

    const currentCount = (targetCv?.images?.length || 0) + (targetCv?.media?.length || 0);
    const remaining = 2 - currentCount;
    if (remaining <= 0) {
      alert("Maximum 2 images allowed per color.");
      return;
    }

    const filesToAdd = Array.from(fileList).slice(0, remaining);
    if (fileList.length > remaining) {
      alert(`Maximum 2 images allowed per color. Only ${remaining} image(s) were added.`);
    }

    const newMedia = filesToAdd.map((file) => ({
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSizeRows((prev) =>
      prev.map((s) => ({
        ...s,
        colors: (s.colors || []).map((cv) => {
          const isMatch = targetColor
            ? (cv.color || "").toLowerCase().trim() === targetColor.toLowerCase().trim()
            : cv.id === colorVariantId;

          if (!isMatch) return cv;
          return {
            ...cv,
            media: [...(cv.media || []), ...newMedia].slice(0, 2 - (cv.images?.length || 0)),
          };
        }),
      }))
    );

    // Clear image errors for matching color variants
    setErrors((prev) => {
      const next = { ...prev };
      delete next.images;
      sizeRows.forEach((s) => {
        (s.colors || []).forEach((cv) => {
          const isMatch = targetColor
            ? (cv.color || "").toLowerCase().trim() === targetColor.toLowerCase().trim()
            : cv.id === colorVariantId;
          if (isMatch && next[cv.id]) {
            const varErr = { ...next[cv.id] };
            delete varErr.images;
            if (Object.keys(varErr).length === 0) delete next[cv.id];
            else next[cv.id] = varErr;
          }
        });
      });
      return next;
    });
  };

  // Remove image from a color variant (auto-syncs removal across all sizes sharing this color)
  const handleRemoveColorImage = (sizeId, colorVariantId, imageIndex, isExistingUrl = false) => {
    let targetColor = null;
    for (const s of sizeRows) {
      const match = (s.colors || []).find((cv) => cv.id === colorVariantId);
      if (match) {
        targetColor = match.color;
        break;
      }
    }

    setSizeRows((prev) =>
      prev.map((s) => ({
        ...s,
        colors: (s.colors || []).map((cv) => {
          const isMatch = targetColor
            ? (cv.color || "").toLowerCase().trim() === targetColor.toLowerCase().trim()
            : cv.id === colorVariantId;

          if (!isMatch) return cv;
          if (isExistingUrl) {
            return {
              ...cv,
              images: (cv.images || []).filter((_, idx) => idx !== imageIndex),
            };
          }
          return {
            ...cv,
            media: (cv.media || []).filter((_, idx) => idx !== imageIndex),
          };
        }),
      }))
    );
  };

  const updateColorVariantField = (sizeId, colorVariantId, field, value) => {
    setSizeRows((prev) =>
      prev.map((s) => {
        if (s.id !== sizeId) return s;
        return {
          ...s,
          colors: (s.colors || []).map((cv) => {
            if (cv.id !== colorVariantId) return cv;
            return { ...cv, [field]: value };
          }),
        };
      })
    );
    // Clear field error
    setErrors((prev) => {
      const rowErr = prev[colorVariantId];
      if (!rowErr || !rowErr[field]) return prev;
      const next = { ...rowErr };
      delete next[field];
      return { ...prev, [colorVariantId]: next };
    });
  };

  // Image & field updates for default variant (when no color is chosen, max 2 images, auto-syncs across sizes)
  const handleDefaultVariantImagesUpload = (sizeId, fileList) => {
    if (!fileList || fileList.length === 0) return;
    const currentSize = sizeRows.find((s) => s.id === sizeId);
    const def = currentSize?.defaultVariant || {};
    const currentCount = (def.images?.length || 0) + (def.media?.length || 0);
    const remaining = 2 - currentCount;
    if (remaining <= 0) {
      alert("Maximum 2 images allowed per size variant.");
      return;
    }

    const filesToAdd = Array.from(fileList).slice(0, remaining);
    if (fileList.length > remaining) {
      alert(`Maximum 2 images allowed. Only ${remaining} image(s) were added.`);
    }

    const newMedia = filesToAdd.map((file) => ({
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSizeRows((prev) =>
      prev.map((s) => {
        if (s.colors && s.colors.length > 0) return s;
        return {
          ...s,
          defaultVariant: {
            ...s.defaultVariant,
            media: [...(s.defaultVariant?.media || []), ...newMedia].slice(
              0,
              2 - (s.defaultVariant?.images?.length || 0)
            ),
          },
        };
      })
    );

    // Clear image error for default variants
    setErrors((prev) => {
      const next = { ...prev };
      delete next.images;
      sizeRows.forEach((r) => {
        const defId = r.defaultVariant?.id || r.id;
        if (next[defId]) {
          const varErr = { ...next[defId] };
          delete varErr.images;
          if (Object.keys(varErr).length === 0) delete next[defId];
          else next[defId] = varErr;
        }
      });
      return next;
    });
  };

  const handleRemoveDefaultVariantImage = (sizeId, imageIndex, isExistingUrl = false) => {
    setSizeRows((prev) =>
      prev.map((s) => {
        if (s.colors && s.colors.length > 0) return s;
        const def = s.defaultVariant || {};
        if (isExistingUrl) {
          return {
            ...s,
            defaultVariant: {
              ...def,
              images: (def.images || []).filter((_, idx) => idx !== imageIndex),
            },
          };
        }
        return {
          ...s,
          defaultVariant: {
            ...def,
            media: (def.media || []).filter((_, idx) => idx !== imageIndex),
          },
        };
      })
    );
  };

  const updateDefaultVariantField = (sizeId, field, value) => {
    const currentSize = sizeRows.find((s) => s.id === sizeId);
    const defId = currentSize?.defaultVariant?.id || sizeId;
    setSizeRows((prev) =>
      prev.map((s) => {
        if (s.id !== sizeId) return s;
        return {
          ...s,
          defaultVariant: {
            ...s.defaultVariant,
            [field]: value,
          },
        };
      })
    );
    // Clear field error
    setErrors((prev) => {
      const rowErr = prev[defId];
      if (!rowErr || !rowErr[field]) return prev;
      const next = { ...rowErr };
      delete next[field];
      return { ...prev, [defId]: next };
    });
  };

  const requestRemoveSize = (id) => {
    setSizeToDelete(id);
  };

  const confirmRemoveSize = () => {
    if (!sizeToDelete) return;
    const id = sizeToDelete;
    setSizeRows((prev) => {
      const removed = prev.find((r) => r.id === id);
      if (removed) {
        // Collect any variant IDs to delete from DB
        const idsToDelete = [];
        (removed.colors || []).forEach((cv) => {
          if (cv.variant_id) idsToDelete.push(cv.variant_id);
        });
        if (removed.defaultVariant?.variant_id) {
          idsToDelete.push(removed.defaultVariant.variant_id);
        }
        if (idsToDelete.length > 0) {
          setDeletedVariantIds((ids) => [...ids, ...idsToDelete]);
        }
      }
      return prev.filter((r) => r.id !== id);
    });
    setSizeToDelete(null);
  };



  const clearTopError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleClearAll = () => {
    if (!window.confirm("Are you sure you want to clear all entered fields?")) return;
    try {
      sessionStorage.removeItem(draftKey);
    } catch { }
    setTitle("");
    setDescription("");
    setSku(generateVariantSKU());
    setMaterial("");
    setCategory("");
    setSubCategory("");
    setCommonColors([]);
    setGlobalStock("");
    setGlobalOriginalPrice("");
    setGlobalOfferPrice("");
    setSizeRows([]);
    setSizeInput("");
    setShowOnStore(true);
    setFeaturedProduct(true);
    setErrors({});
  };

  useEffect(() => {
    let clearing = false;
    const handleClearEvent = () => {
      if (clearing) return;
      clearing = true;
      handleClearAll();
      setTimeout(() => {
        clearing = false;
      }, 500);
    };
    window.addEventListener("faywalk:clear-product-form", handleClearEvent);
    return () => {
      window.removeEventListener("faywalk:clear-product-form", handleClearEvent);
    };
  }, []);

  // ── Flatten all size & color variants into the format expected by variantService ──
  const buildFlatVariants = () => {
    if (sizeRows.length === 0) {
      return [
        {
          id: `def-single-${Date.now()}`,
          sizeDimension: "Free Size",
          color: commonColors.length === 1 ? commonColors[0] : null,
          stockQuantity: globalStock !== "" && globalStock != null ? globalStock : "",
          minStockAlert: "0",
          price: globalOriginalPrice || "",
          sellingPrice: globalOfferPrice || "",
          sku: sku || generateVariantSKU(),
          images: [],
          media: [],
        },
      ];
    }
    const variants = [];
    for (const s of sizeRows) {
      if (s.colors && s.colors.length > 0) {
        for (const cv of s.colors) {
          variants.push({
            id: cv.id,
            variant_id: cv.variant_id || undefined,
            sizeDimension: s.size,
            color: cv.color || null,
            stockQuantity: cv.quantity !== undefined && cv.quantity !== null ? cv.quantity : (globalStock || ""),
            minStockAlert: "0",
            price: cv.originalPrice || globalOriginalPrice || "",
            sellingPrice: cv.offerPrice || globalOfferPrice || "",
            sku: cv.sku || generateVariantSKU(),
            images: cv.images || [],
            media: cv.media || [],
          });
        }
      } else {
        const def = s.defaultVariant || {};
        variants.push({
          id: def.id || s.id,
          variant_id: def.variant_id || undefined,
          sizeDimension: s.size,
          color: null,
          stockQuantity: def.quantity !== undefined && def.quantity !== null ? def.quantity : (globalStock || ""),
          minStockAlert: "0",
          price: def.originalPrice || globalOriginalPrice || "",
          sellingPrice: def.offerPrice || globalOfferPrice || "",
          sku: def.sku || generateVariantSKU(),
          images: def.images || [],
          media: def.media || [],
        });
      }
    }
    return variants;
  };

  // ── Validation ──
  const validate = () => {
    const topErrors = {};
    if (!title.trim()) topErrors.title = ["Title Cannot Be Empty"];
    if (!description.trim()) topErrors.description = ["Description Cannot Be Empty"];
    if (!globalStock.trim()) topErrors.globalStock = ["Stock Cannot Be Empty"];
    if (sizeRows.length === 0) {
      topErrors.sizes = ["At least one size with a product image is required"];
    }

    const rowErrors = {};
    const flatVariants = buildFlatVariants();
    let hasAnyImage = false;

    flatVariants.forEach((v) => {
      const fieldErrors = {};
      const hasOffer = v.sellingPrice && !isNaN(parseFloat(v.sellingPrice));
      if (!hasOffer) {
        fieldErrors.offerPrice = ["Price required"];
      }

      if (v.price && v.sellingPrice) {
        const orig = parseFloat(v.price);
        const offer = parseFloat(v.sellingPrice);
        if (!isNaN(orig) && !isNaN(offer) && offer > orig) {
          fieldErrors.offerPrice = ["Must be ≤ Original"];
        }
      }

      const hasStock = v.stockQuantity !== "" && v.stockQuantity !== null && v.stockQuantity !== undefined && !isNaN(parseInt(v.stockQuantity, 10)) && parseInt(v.stockQuantity, 10) >= 0;
      if (!hasStock) {
        fieldErrors.quantity = ["Stock required"];
      }

      const imgCount = (v.images?.length || 0) + (v.media?.length || 0);
      if (imgCount === 0) {
        fieldErrors.images = ["Image is required"];
      } else {
        hasAnyImage = true;
      }

      if (Object.keys(fieldErrors).length) {
        rowErrors[v.id] = fieldErrors;
      }
    });

    if (!hasAnyImage && sizeRows.length > 0) {
      topErrors.images = ["At least one product image is required"];
    }

    setErrors({ ...topErrors, ...rowErrors });
    return Object.keys(topErrors).length === 0 && Object.keys(rowErrors).length === 0;
  };

  // ── Save ──
  const handleSave = async () => {
    if (!validate()) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector(".cmp-error, .cmp-input--error, .cmp-upload--error");
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    const variants = buildFlatVariants();

    const validPrices = variants.map((v) => parseFloat(v.sellingPrice)).filter((n) => !isNaN(n) && n >= 0);
    const validComparePrices = variants.map((v) => parseFloat(v.price)).filter((n) => !isNaN(n) && n >= 0);
    const basePrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const baseComparePrice = validComparePrices.length > 0 ? Math.max(...validComparePrices) : null;
    const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stockQuantity) || 0), 0);

    // Base cover image is automatically synced from the first variant with images in variantService.
    // Check if any variant already has an image as initial fallback
    const firstVariantWithImages = variants.find((v) => v.images && v.images.length > 0);
    const initialCoverUrl = firstVariantWithImages
      ? (typeof firstVariantWithImages.images[0] === "string"
        ? firstVariantWithImages.images[0]
        : firstVariantWithImages.images[0]?.url || null)
      : null;

    const productData = {
      name: title,
      description,
      sku: sku || undefined,
      material: material.trim() || null,
      category_id: parseInt(category) || null,
      subcategory_id: subCategory || null,
      is_active: showOnStore,
      is_featured: featuredProduct,
      price: basePrice,
      compare_price: baseComparePrice,
      stock: totalStock,
      image_url: initialCoverUrl,
      images: initialCoverUrl ? [initialCoverUrl] : [],
      has_variants: true,
    };

    setSaving(true);
    try {
      const result = isEditing
        ? await variantService.updateProductWithVariants(editingProductId, productData, variants, deletedVariantIds)
        : await variantService.createProductWithVariants({ ...productData, has_variants: true }, variants);
      if (isEditing) useStore.getState().invalidateProductDetails(editingProductId);
      try {
        sessionStorage.removeItem(draftKey);
      } catch { }
      onSave?.(result);
    } catch (err) {
      console.error("Failed to save variant product:", err);
      alert("Failed to save product: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="dashboard-content cmp-page"><p style={{ padding: 24 }}>Loading product…</p></main>;
  }

  return (
    <main className="ap-page cmp-page">
      {sizeToDelete && (
        <ConfirmDialog
          title="Delete Size?"
          message="Are you sure you want to delete this size and all its color variants?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDanger={true}
          onConfirm={confirmRemoveSize}
          onCancel={() => setSizeToDelete(null)}
        />
      )}

      {/* ── Product Details (Single unified card) ── */}
      <div className="card cmp-card">
        <div className="card-title">Product Details</div>
        <label className="cmp-field">
          <span className="cmp-label">Product Name</span>
          <input
            type="text"
            className={`cmp-input${errors.title ? " cmp-input--error" : ""}`}
            placeholder="e.g. Classic Cotton Ribbed Vest"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearTopError("title");
            }}
          />
          {errors.title?.map((msg) => (
            <FieldError key={msg}>{msg}</FieldError>
          ))}
        </label>

        <label className="cmp-field">
          <span className="cmp-label">Description</span>
          <textarea
            className={`cmp-textarea${errors.description ? " cmp-input--error" : ""}`}
            placeholder="Describe the fabric, breathability, fit, and care instructions..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearTopError("description");
            }}
          />
          {errors.description?.map((msg) => (
            <FieldError key={msg}>{msg}</FieldError>
          ))}
        </label>

        <div className="cmp-row">
          <label className="cmp-field">
            <span className="cmp-label">SKU</span>
            <input
              type="text"
              className="cmp-input"
              placeholder="Auto Generated"
              value={sku}
              readOnly
            />
            <span className="cmp-hint">Auto Generated</span>
          </label>

          <label className="cmp-field">
            <span className="cmp-label">Category</span>
            <select
              className="cmp-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubCategory("");
              }}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.category_id ?? c.name} value={c.category_id ?? c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="cmp-field">
            <span className="cmp-label">
              Subcategory <span className="scc-optional-tag">optional</span>
            </span>
            <select
              className="cmp-select"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              disabled={!category || loadingSubcategories || subcategories.length === 0}
            >
              <option value="">
                {loadingSubcategories ? "Loading…" : "Select Subcategory"}
              </option>
              {subcategories.map((sc) => (
                <option key={sc.subcategory_id} value={sc.subcategory_id}>
                  {sc.name}
                </option>
              ))}
            </select>
            {category && !loadingSubcategories && subcategories.length === 0 && (
              <InfoHint>No subcategories under this category</InfoHint>
            )}
          </label>

          <label className="cmp-field">
            <span className="cmp-label">
              Product Material <span className="scc-optional-tag">optional</span>
            </span>
            <input
              type="text"
              className="cmp-input"
              placeholder="e.g. 100% Combed Cotton, MicroModal, Cotton Spandex"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </label>
        </div>



        {/* ── Common Colors, Stock & Price ── */}
        <div className="cmp-section">
          <div className="cmp-section-title">Common Colors, Stock &amp; Price</div>

          {/* ── Common Colors Selector (Before Stock & Price) ── */}
          <div className="cmp-common-colors-block" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
              <span className="cmp-label" style={{ marginBottom: 0 }}>
                Common Colors <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>(Applies to all sizes)</span>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {sizeRows.length > 0 && commonColors.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyCommonColorsToAllSizes}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--admin-primary)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "2px 6px"
                    }}
                    title="Reset all sizes to match these common colors"
                  >
                    Apply to all sizes
                  </button>
                )}
                {commonColors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCommonColors([])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#EF4444",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      padding: "2px 6px"
                    }}
                  >
                    Clear colors
                  </button>
                )}
              </div>
            </div>

            <div className="cmp-color-grid">
              {COLOR_SWATCHES.map((c) => {
                const isSelected = commonColors.some(
                  (col) => (col || "").toLowerCase().trim() === c.toLowerCase().trim()
                );
                const isWhite = c.toUpperCase() === "#FFFFFF";
                const cName = getColorName(c) || c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`cmp-color-swatch${isSelected ? " cmp-color-swatch--selected" : ""}${isWhite ? " cmp-color-swatch--white" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => handleToggleCommonColor(c)}
                    aria-label={`Toggle common color ${cName}`}
                    title={`${cName}${isSelected ? " (Selected — click to remove)" : " (Click to select)"}`}
                  >
                    {isSelected && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path
                          d="M1 5L4.2 8.2L11 1"
                          stroke={isWhite ? "#111827" : "#fff"}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {commonColors.length > 0 && (
              <div className="cmp-color-selected-list" style={{ marginTop: "10px" }}>
                {commonColors.map((colorHex) => {
                  const cName = getColorName(colorHex) || colorHex;
                  return (
                    <span key={colorHex} className="cmp-color-selected-chip">
                      <span className="cmp-color-selected-dot" style={{ backgroundColor: colorHex }} />
                      <span className="cmp-color-selected-name">{cName}</span>
                      <button
                        type="button"
                        className="cmp-color-selected-del"
                        onClick={() => handleToggleCommonColor(colorHex)}
                        title={`Remove ${cName}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Common Stock & Price Fields ── */}
          <div className="cmp-row" style={{ paddingTop: "14px", borderTop: "1px dashed #e5e7eb" }}>
            <label className="cmp-field">
              <span className="cmp-label">
                Common Stock <span style={{ color: "#EF4444" }}>*</span>
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={`cmp-input${errors.globalStock ? " cmp-input--error" : ""}`}
                placeholder="0"
                value={globalStock}
                onChange={(e) => {
                  handleUpdateGlobalStock(e.target.value.replace(/[^0-9]/g, ""));
                  clearTopError("globalStock");
                }}
              />
              {errors.globalStock?.map((msg) => (
                <FieldError key={msg}>{msg}</FieldError>
              ))}
            </label>
            <label className="cmp-field">
              <span className="cmp-label">Common Offer Price (₹)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="cmp-input"
                placeholder="0"
                value={globalOfferPrice}
                onChange={(e) => handleUpdateGlobalOffer(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </label>
            <label className="cmp-field">
              <span className="cmp-label">
                Common Original Price (₹) <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                {calcDiscount(globalOriginalPrice, globalOfferPrice) > 0 && (
                  <span className="ap-discount-badge">
                    {calcDiscount(globalOriginalPrice, globalOfferPrice)}% OFF
                  </span>
                )}
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="cmp-input"
                placeholder="0"
                value={globalOriginalPrice}
                onChange={(e) => handleUpdateGlobalOriginal(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </label>
          </div>

          <InfoHint style={{ marginTop: "12px" }}>
            Set common colors, stock &amp; prices for all variants, or customize each size &amp; color individually below.
          </InfoHint>
        </div>

        {/* ── Sizes, Colors, Images & Pricing ── */}
        <div className="cmp-section">
          <div className="cmp-section-title">Product Sizes, Colors &amp; Pricing</div>

          {/* Add size input */}
          <div className="cmp-add-size-row">
            <input
              type="text"
              className="cmp-input cmp-add-size-input"
              placeholder="Enter size (e.g. S, M, L, XL, XXL or 75, 80, 85, 90)"
              value={sizeInput}
              onChange={(e) => setSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSize();
                }
              }}
            />
            <button type="button" className="cmp-add-size-btn" onClick={() => handleAddSize()}>
              Add Size
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="cmp-quick-sizes">
            <span className="cmp-quick-sizes-label">Quick Add:</span>
            {["Free Size", "S", "M", "L", "XL", "XXL", "70", "75", "80", "85", "90", "95", "100"].map((sz) => {
              const isAdded = sizeRows.some((r) => r.size.toLowerCase() === sz.toLowerCase());
              return (
                <button
                  key={sz}
                  type="button"
                  className={`cmp-quick-size-chip ${isAdded ? "is-added" : ""}`}
                  onClick={() => handleAddSize(sz)}
                  disabled={isAdded}
                  title={isAdded ? `Size ${sz} already added` : `Add size ${sz}`}
                >
                  {isAdded ? `✓ ${sz}` : sz}
                </button>
              );
            })}
          </div>

          {errors.sizes?.map((msg) => (
            <FieldError key={msg}>{msg}</FieldError>
          ))}
          {errors.images?.map((msg) => (
            <FieldError key={msg}>{msg}</FieldError>
          ))}

          {/* Minimal Size Groups */}
          {sizeRows.length > 0 && (
            <div className="cmp-size-groups">
              {sizeRows.map((sizeRow) => (
                <div key={sizeRow.id} className="cmp-size-group">
                  {/* Size Header with inline mini-swatches */}
                  <div className="cmp-size-group-header">
                    <div className="cmp-size-group-title">
                      <span className="cmp-size-pill">Size: {sizeRow.size}</span>
                      <span className="cmp-size-swatches-label">Colors:</span>
                      <div className="cmp-inline-swatches">
                        {COLOR_SWATCHES.map((c) => {
                          const isSelected = (sizeRow.colors || []).some(
                            (cv) => (cv.color || "").toLowerCase().trim() === c.toLowerCase().trim()
                          );
                          const isWhite = c.toUpperCase() === "#FFFFFF";
                          const cName = getColorName(c) || c;
                          return (
                            <button
                              key={c}
                              type="button"
                              className={`cmp-mini-swatch${isSelected ? " cmp-mini-swatch--selected" : ""}${isWhite ? " cmp-mini-swatch--white" : ""}`}
                              style={{ backgroundColor: c }}
                              onClick={() => handleToggleColorForSize(sizeRow.id, c)}
                              aria-label={`Toggle color ${cName} for size ${sizeRow.size}`}
                              title={`${cName}${isSelected ? " (Selected — click to remove)" : " (Click to select)"}`}
                            >
                              {isSelected && (
                                <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                                  <path
                                    d="M1 5L4.2 8.2L11 1"
                                    stroke={isWhite ? "#111827" : "#fff"}
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="cmp-size-remove-link"
                      onClick={() => requestRemoveSize(sizeRow.id)}
                      title={`Delete size ${sizeRow.size}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M12.5 4.5l-.6 8.4a1.5 1.5 0 0 1-1.5 1.4H5.6a1.5 1.5 0 0 1-1.5-1.4l-.6-8.4"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Delete Size
                    </button>
                  </div>

                  {/* Flat minimal table of variants for this size */}
                  <div className="cmp-flat-table-wrap">
                    <table className="cmp-flat-table">
                      <thead>
                        <tr>
                          <th style={{ width: "160px" }}>Color</th>
                          <th style={{ minWidth: "160px" }}>
                            Images (Max 2) <span style={{ color: "#EF4444" }}>*</span>{" "}
                            <span className="cmp-sync-badge">Shared by color</span>
                          </th>
                          <th style={{ width: "95px" }}>
                            Stock <span style={{ color: "#EF4444" }}>*</span>
                          </th>
                          <th style={{ width: "130px" }}>Offer (₹)</th>
                          <th style={{ width: "160px" }}>Original (₹)</th>
                          <th style={{ width: "36px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizeRow.colors && sizeRow.colors.length > 0 ? (
                          sizeRow.colors.map((cv) => {
                            const cName = getColorName(cv.color) || cv.color;
                            const discount = calcDiscount(
                              cv.originalPrice || globalOriginalPrice,
                              cv.offerPrice || globalOfferPrice
                            );
                            const cvErrors = errors[cv.id] || {};

                            return (
                              <tr key={cv.id}>
                                <td>
                                  <div className="cmp-table-color">
                                    <span className="cmp-table-color-dot" style={{ backgroundColor: cv.color }} />
                                    <div>
                                      <span className="cmp-table-color-name">{cName}</span>
                                      <span className="cmp-table-color-sku">{cv.sku}</span>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <div className="cmp-table-images">
                                    {cv.images?.map((url, imgIdx) => (
                                      <div key={`existing-${imgIdx}`} className="cmp-table-thumb">
                                        <img src={url} alt={`${cName} ${imgIdx}`} />
                                        <button
                                          type="button"
                                          className="cmp-table-thumb-del"
                                          onClick={() => handleRemoveColorImage(sizeRow.id, cv.id, imgIdx, true)}
                                          title="Remove image"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}

                                    {cv.media?.map((m, mIdx) => (
                                      <div key={m.id} className="cmp-table-thumb">
                                        <img src={m.preview} alt={`${cName} new ${mIdx}`} />
                                        <button
                                          type="button"
                                          className="cmp-table-thumb-del"
                                          onClick={() => handleRemoveColorImage(sizeRow.id, cv.id, mIdx, false)}
                                          title="Remove image"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}

                                    {((cv.images?.length || 0) + (cv.media?.length || 0)) < 2 && (
                                      <>
                                        <input
                                          id={`file-input-${sizeRow.id}-${cv.id}`}
                                          type="file"
                                          multiple
                                          accept="image/*"
                                          style={{ display: "none" }}
                                          onChange={(e) => {
                                            handleColorImagesUpload(sizeRow.id, cv.id, e.target.files);
                                            e.target.value = "";
                                          }}
                                        />
                                        <label
                                          htmlFor={`file-input-${sizeRow.id}-${cv.id}`}
                                          className={`cmp-table-upload-btn${cvErrors.images ? " cmp-upload--error" : ""}`}
                                          title="Upload images for this color (Max 2)"
                                        >
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                          </svg>
                                          <span>+ Image</span>
                                        </label>
                                      </>
                                    )}
                                  </div>
                                  {cvErrors.images?.map((msg) => (
                                    <FieldError key={msg}>{msg}</FieldError>
                                  ))}
                                </td>

                                <td>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={`cmp-table-input${cvErrors.quantity ? " cmp-input--error" : ""}`}
                                    style={{ textAlign: "center" }}
                                    placeholder="0"
                                    value={cv.quantity}
                                    onChange={(e) => updateColorVariantField(sizeRow.id, cv.id, "quantity", e.target.value.replace(/[^0-9]/g, ""))}
                                  />
                                  {cvErrors.quantity?.map((msg) => (
                                    <FieldError key={msg}>{msg}</FieldError>
                                  ))}
                                </td>

                                <td>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={`cmp-table-input${cvErrors.offerPrice ? " cmp-input--error" : ""}`}
                                    placeholder="0"
                                    value={cv.offerPrice}
                                    onChange={(e) => updateColorVariantField(sizeRow.id, cv.id, "offerPrice", e.target.value.replace(/[^0-9.]/g, ""))}
                                  />
                                  {cvErrors.offerPrice?.map((msg) => (
                                    <FieldError key={msg}>{msg}</FieldError>
                                  ))}
                                </td>

                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      className="cmp-table-input"
                                      placeholder="0"
                                      value={cv.originalPrice}
                                      onChange={(e) => updateColorVariantField(sizeRow.id, cv.id, "originalPrice", e.target.value.replace(/[^0-9.]/g, ""))}
                                    />
                                    {discount > 0 && (
                                      <span className="ap-discount-badge ap-discount-badge--small" style={{ whiteSpace: "nowrap" }}>
                                        {discount}%
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td>
                                  <button
                                    type="button"
                                    className="cmp-table-del-btn"
                                    onClick={() => handleToggleColorForSize(sizeRow.id, cv.color)}
                                    title="Remove this color variant"
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          /* Default row when no colors chosen yet */
                          (() => {
                            const defId = sizeRow.defaultVariant?.id || sizeRow.id;
                            const defErrors = errors[defId] || {};
                            return (
                              <tr key={defId}>
                                <td>
                                  <div className="cmp-table-color">
                                    <div>
                                      <span className="cmp-table-color-name" style={{ color: "#64748b" }}>Standard</span>
                                      <span className="cmp-table-color-sku">No color</span>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <div className="cmp-table-images">
                                    {sizeRow.defaultVariant?.images?.map((url, imgIdx) => (
                                      <div key={`existing-def-${imgIdx}`} className="cmp-table-thumb">
                                        <img src={url} alt={`Default ${imgIdx}`} />
                                        <button
                                          type="button"
                                          className="cmp-table-thumb-del"
                                          onClick={() => handleRemoveDefaultVariantImage(sizeRow.id, imgIdx, true)}
                                          title="Remove image"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}

                                    {sizeRow.defaultVariant?.media?.map((m, mIdx) => (
                                      <div key={m.id} className="cmp-table-thumb">
                                        <img src={m.preview} alt={`Default new ${mIdx}`} />
                                        <button
                                          type="button"
                                          className="cmp-table-thumb-del"
                                          onClick={() => handleRemoveDefaultVariantImage(sizeRow.id, mIdx, false)}
                                          title="Remove image"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}

                                    {((sizeRow.defaultVariant?.images?.length || 0) + (sizeRow.defaultVariant?.media?.length || 0)) < 2 && (
                                      <>
                                        <input
                                          id={`file-input-def-${sizeRow.id}`}
                                          type="file"
                                          multiple
                                          accept="image/*"
                                          style={{ display: "none" }}
                                          onChange={(e) => {
                                            handleDefaultVariantImagesUpload(sizeRow.id, e.target.files);
                                            e.target.value = "";
                                          }}
                                        />
                                        <label
                                          htmlFor={`file-input-def-${sizeRow.id}`}
                                          className={`cmp-table-upload-btn${defErrors.images ? " cmp-upload--error" : ""}`}
                                          title="Upload images for this size (Max 2)"
                                        >
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                          </svg>
                                          <span>+ Image</span>
                                        </label>
                                      </>
                                    )}
                                  </div>
                                  {defErrors.images?.map((msg) => (
                                    <FieldError key={msg}>{msg}</FieldError>
                                  ))}
                                </td>

                                <td>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={`cmp-table-input${defErrors.quantity ? " cmp-input--error" : ""}`}
                                    style={{ textAlign: "center" }}
                                    placeholder="0"
                                    value={sizeRow.defaultVariant?.quantity ?? ""}
                                    onChange={(e) => updateDefaultVariantField(sizeRow.id, "quantity", e.target.value.replace(/[^0-9]/g, ""))}
                                  />
                                  {defErrors.quantity?.map((msg) => (
                                    <FieldError key={msg}>{msg}</FieldError>
                                  ))}
                                </td>

                                <td>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={`cmp-table-input${defErrors.offerPrice ? " cmp-input--error" : ""}`}
                                    placeholder="0"
                                    value={sizeRow.defaultVariant?.offerPrice ?? ""}
                                    onChange={(e) => updateDefaultVariantField(sizeRow.id, "offerPrice", e.target.value.replace(/[^0-9.]/g, ""))}
                                  />
                                  {defErrors.offerPrice?.map((msg) => (
                                    <FieldError key={msg}>{msg}</FieldError>
                                  ))}
                                </td>

                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      className="cmp-table-input"
                                      placeholder="0"
                                      value={sizeRow.defaultVariant?.originalPrice ?? ""}
                                      onChange={(e) => updateDefaultVariantField(sizeRow.id, "originalPrice", e.target.value.replace(/[^0-9.]/g, ""))}
                                    />
                                    {calcDiscount(sizeRow.defaultVariant?.originalPrice || globalOriginalPrice, sizeRow.defaultVariant?.offerPrice || globalOfferPrice) > 0 && (
                                      <span className="ap-discount-badge ap-discount-badge--small" style={{ whiteSpace: "nowrap" }}>
                                        {calcDiscount(sizeRow.defaultVariant?.originalPrice || globalOriginalPrice, sizeRow.defaultVariant?.offerPrice || globalOfferPrice)}%
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td></td>
                              </tr>
                            );
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Visibility Options ── */}
        <div className="cmp-section cmp-visibility-section">
          <div className="cmp-visibility-row">
            <div>
              <div className="cmp-visibility-title">Show On Store</div>
              <div className="cmp-visibility-desc">
                Product will be visible to customers
              </div>
            </div>
            <Toggle
              checked={showOnStore}
              onChange={(nextVal) => {
                setShowOnStore(nextVal);
                setShowOnStoreExplicit(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="ap-footer">
        <button
          type="button"
          className="btn-draft"
          onClick={onBack}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-publish admin-btn-with-spinner"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="admin-btn-spinner" /> Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </main>
  );
};

export default AddProduct;