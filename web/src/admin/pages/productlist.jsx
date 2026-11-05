import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import "./productlist.css";
import searchEmpty from "../../assets/admin/search.png";
import editIcon from "../../assets/admin/Edit.png";
import trashIcon from "../../assets/admin/Trash.png";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { getColorName } from "../../utils/colorUtils";

const normalizeSearchText = (val) =>
  val == null ? "" : String(val).toLowerCase().trim();

const stripSearchSymbols = (val) =>
  normalizeSearchText(val).replace(/[\s\-_./'"#]+/g, "");

const doesVariantMatchQuery = (v, rawQuery) => {
  if (!v) return false;
  const q = normalizeSearchText(rawQuery);
  if (!q) return false;
  const qCompact = stripSearchSymbols(q);

  const colorRaw = v.color != null ? String(v.color) : "";
  const colorName = colorRaw ? getColorName(colorRaw) : "";

  const fields = [
    v.sku,
    v.variant_id,
    v.id,
    v.sku_id,
    v.barcode,
    colorRaw,
    colorName,
    v.size,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);

  return fields.some(
    (field) =>
      field.includes(q) ||
      (qCompact && stripSearchSymbols(field).includes(qCompact))
  );
};

const getFinalPrice = (product) => {
  return parseFloat(product.price) || 0;
};

const getCategoryStyle = (category) => {

  const styles = {
    Rings: { background: "#f0e6ff", color: "#7c3aed" },
    Earrings: { background: "#fce7f3", color: "#be185d" },
    Bangles: { background: "#dcfce7", color: "#15803d" },
    Necklaces: { background: "#fff7ed", color: "#c2410c" },
    Bracelets: { background: "#e0f2fe", color: "#0369a1" },
    Anklets: { background: "#FFF0D9", color: "#FF6A1C" },
  };
  return styles[category] || { background: "#f0e6ff", color: "#7c3aed" };
};

const getProductColors = (product) => {
  if (!product) return [];
  if (product.has_variants && product.variants?.length > 0) {
    return [...new Set(product.variants.map((v) => v.color).filter(Boolean))];
  }
  if (Array.isArray(product.colors)) {
    return product.colors.filter(Boolean);
  }
  if (typeof product.colors === "string") {
    const trimmed = product.colors.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        // fallback to split
      }
    }
    return product.colors.split(",").map((c) => c.trim()).filter(Boolean);
  }
  return [];
};

/* ── Mobile card view for very small screens ── */
const MobileProductCard = ({ product, onEdit, onDelete, expandedRows, toggleExpand, searchQuery = "" }) => {
  const isExpanded = expandedRows.includes(product.id);
  const hasVariants = product.has_variants && product.variants?.length > 0;
  const colors = getProductColors(product);

  return (
    <div className="pl-mobile-card">
      <div className="pl-mobile-card__top">
        <img
          src={product.images?.[0] || product.image || product.variants?.[0]?.images?.[0] || searchEmpty}
          alt={product.name}
          className="pl-mobile-card__img"
          onError={(e) => { e.target.src = searchEmpty; }}
        />
        <div className="pl-mobile-card__info">
          <span className="pl-mobile-card__name">{product.name}</span>
          <span className="pl-mobile-card__sku">SKU: {product.sku}</span>
          {colors.length > 0 && (
            <div className="pl-color-dots">
              {colors.map((c) => (
                <span key={c} className="pl-color-dot" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          )}
        </div>
        <div className="pl-mobile-card__actions">
          <button className="pl-action-btn" aria-label="Edit" onClick={() => onEdit(product)}>
            <img src={editIcon} alt="Edit" className="pl-action-icon" />
          </button>
          <button
            type="button"
            className="pl-action-btn pl-action-btn--delete"
            aria-label="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product.id ?? product.product_id);
            }}
          >
            <img src={trashIcon} alt="Delete" className="pl-action-icon pl-action-icon--delete" />
          </button>
        </div>
      </div>
      <div className="pl-mobile-card__meta">
        <span className="pl-category-badge" style={getCategoryStyle(product.category)}>{product.category}</span>

        {product.subcategory && (
          <span className="pl-subcategory-badge">{product.subcategory}</span>
        )}
        <span className="pl-stock-low">{product.stock} left</span>
        <span className={`pl-status-badge ${product.status === "Visible" ? "pl-status-visible" : product.status === "Draft" ? "pl-status-draft" : ""}`}>{product.status}</span>
        <span className="pl-mobile-card__price">{"Rs." + getFinalPrice(product).toLocaleString()}</span>
      </div>
      {hasVariants && (
        <>
          <button className="pl-variant-toggle pl-variant-toggle--mobile" onClick={() => toggleExpand(product.id)}>
            {product.variants.length} variants {isExpanded ? "▲" : "▼"}
          </button>

          {isExpanded && (
            <div className="pl-mobile-variant-list">
              {product.variants.map(v => {
                const isVariantMatch = doesVariantMatchQuery(v, searchQuery);
                return (
                  <div
                    key={v.variant_id || `${v.color}-${v.size}-${v.sku}`}
                    className="pl-mobile-variant-row"
                    style={isVariantMatch ? { background: "#fef9c3", borderRadius: "6px", padding: "6px" } : undefined}
                  >
                    <img
                      src={v.images?.[0] || searchEmpty}
                      alt={`${product.name} ${v.color || ''} ${v.size || ''}`}
                      className="pl-variant-img"
                      onError={(e) => { e.target.src = searchEmpty; }}
                    />
                    <div className="pl-mobile-variant-details">
                      <span>
                        {v.color ? (
                          <>
                            <span className="pl-color-dot" style={{ backgroundColor: v.color }} /> {v.color} {v.size ? `• ${v.size}` : ''}
                          </>
                        ) : (
                          v.size ? <span>{v.size}</span> : <span>—</span>
                        )}
                      </span>
                      <span className="pl-mobile-variant-sku" style={isVariantMatch ? { color: "#b45309", fontWeight: "700" } : undefined}>
                        SKU: {v.sku || "—"}
                      </span>
                    </div>
                    <div className="pl-mobile-variant-price">
                      <span>₹{Number(v.price).toLocaleString()}</span>
                      <span className="pl-mobile-variant-stock">{v.stock} left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ProductList = ({ onAddProduct, onEditProduct, onDeleteProduct, products = [], categories = [], subcategoriesCache = {}, loading = false, onBack }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSubIdParam = searchParams.get("subcategoryId") || "";
  const urlSubParam = searchParams.get("subcategory") || searchParams.get("sub") || "";
  const urlCatIdParam = searchParams.get("categoryId") || "";
  const urlCatParam = searchParams.get("category") || "";

  const [visibleCount, setVisibleCount] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const observerTarget = useRef(null);

  const [selectedCategory, setSelectedCategory] = useState(() => urlCatParam.trim() || "All");
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => urlCatIdParam.trim() || "");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedStock, setSelectedStock] = useState("All");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [selectedSubcategory, setSelectedSubcategory] = useState(() => urlSubParam.trim() || "All");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(() => urlSubIdParam.trim() || "");
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [priceOpen, setPriceOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);

  // Map subcategory IDs <-> names from categories, subcategoriesCache & products
  const subcategoryLookup = useMemo(() => {
    const idToName = new Map();
    const nameToIds = new Map();
    const catAndNameToIds = new Map();
    const idToParentName = new Map();
    const idToParentId = new Map();

    const registerSub = (sIdRaw, sNameRaw, catNameRaw, catIdRaw) => {
      if (sIdRaw == null || !sNameRaw) return;
      const sId = String(sIdRaw).trim();
      const sName = String(sNameRaw).trim();
      if (!sId || !sName) return;

      idToName.set(sId, sName);
      if (catNameRaw) idToParentName.set(sId, String(catNameRaw).trim());
      if (catIdRaw != null && String(catIdRaw) !== "") idToParentId.set(sId, String(catIdRaw).trim());

      const low = sName.toLowerCase();
      if (!nameToIds.has(low)) nameToIds.set(low, []);
      if (!nameToIds.get(low).includes(sId)) nameToIds.get(low).push(sId);

      if (catNameRaw) {
        const key = `${String(catNameRaw).trim().toLowerCase()}::${low}`;
        if (!catAndNameToIds.has(key)) catAndNameToIds.set(key, []);
        if (!catAndNameToIds.get(key).includes(sId)) catAndNameToIds.get(key).push(sId);
      }
    };

    (categories || []).forEach((c) => {
      const catName = typeof c === "string" ? c : c?.name || c?.title || "";
      const catId = typeof c === "object" ? (c?.category_id ?? c?.id) : null;
      (c?.subcategories || []).forEach((s) => {
        registerSub(s?.subcategory_id ?? s?.id, s?.name, catName, catId ?? s?.parent_id ?? s?.category_id);
      });
    });

    Object.entries(subcategoriesCache || {}).forEach(([parentIdKey, subList]) => {
      const parentCat = (categories || []).find(
        (c) => String(c?.category_id ?? c?.id) === String(parentIdKey)
      );
      const catName = parentCat?.name || parentCat?.title || "";
      (subList || []).forEach((s) => {
        registerSub(s?.subcategory_id ?? s?.id, s?.name, catName, parentIdKey);
      });
    });

    (products || []).forEach((p) => {
      if (p.subcategory_id != null && (p.subcategory || p.subcategories?.name)) {
        registerSub(
          p.subcategory_id,
          p.subcategory || p.subcategories?.name,
          p.category || p.categories?.name,
          p.category_id
        );
      }
    });

    return { idToName, nameToIds, catAndNameToIds, idToParentName, idToParentId };
  }, [categories, subcategoriesCache, products]);

  // Sync URL ?subcategoryId= / ?subcategory= / ?categoryId= / ?category= parameters into filter state
  useEffect(() => {
    const rawCatId = urlCatIdParam.trim();
    const rawCat = urlCatParam.trim();
    const rawSubId = urlSubIdParam.trim();
    const rawSub = urlSubParam.trim();

    if (!rawCatId && !rawCat && !rawSubId && !rawSub) {
      setSelectedCategory("All");
      setSelectedCategoryId("");
      setSelectedSubcategory("All");
      setSelectedSubcategoryId("");
      return;
    }

    if (rawCatId || rawCat) {
      const matchedCat = (categories || []).find(
        (c) =>
          (rawCatId && String(c.category_id ?? c.id) === rawCatId) ||
          (rawCat && String(c.category_id ?? c.id) === rawCat) ||
          (rawCat && String(c.name || "").trim().toLowerCase() === rawCat.toLowerCase())
      );
      if (matchedCat?.name) {
        setSelectedCategory(matchedCat.name);
        setSelectedCategoryId(String(matchedCat.category_id ?? matchedCat.id ?? rawCatId));
      } else if (rawCat) {
        setSelectedCategory(rawCat);
        if (rawCatId) setSelectedCategoryId(rawCatId);
      } else if (rawCatId) {
        setSelectedCategoryId(rawCatId);
      }
    }

    if (rawSubId || rawSub) {
      const candidateId = rawSubId || (subcategoryLookup.idToName.has(rawSub) ? rawSub : "");
      const resolvedName =
        (candidateId && subcategoryLookup.idToName.get(candidateId)) ||
        subcategoryLookup.idToName.get(rawSub) ||
        rawSub ||
        rawSubId;

      setSelectedSubcategory(resolvedName);
      setSelectedSubcategoryId(candidateId);

      if (!rawCat && !rawCatId && candidateId) {
        const parentCatName = subcategoryLookup.idToParentName.get(candidateId);
        const parentCatId = subcategoryLookup.idToParentId.get(candidateId);
        if (parentCatName) setSelectedCategory(parentCatName);
        if (parentCatId) setSelectedCategoryId(parentCatId);
      }
    } else {
      setSelectedSubcategory("All");
      setSelectedSubcategoryId("");
    }
  }, [urlCatIdParam, urlCatParam, urlSubIdParam, urlSubParam, subcategoryLookup, categories]);

  const SORTS = [
    { label: "Default Sort", value: "default" },
    { label: "Price: Low to High", value: "price-asc" },
    { label: "Price: High to Low", value: "price-desc" },
    { label: "Name: A to Z", value: "name-asc" },
    { label: "Name: Z to A", value: "name-desc" },
    { label: "Stock: Low to High", value: "stock-asc" },
    { label: "Stock: High to Low", value: "stock-desc" },
  ];

  const CATEGORIES = useMemo(() => {
    const fromProps = categories.map((c) => (typeof c === "string" ? c : c?.name || c?.title)).filter(Boolean);
    const fromProducts = products.map((p) => p.category).filter(Boolean);
    const unique = Array.from(new Set([...fromProps, ...fromProducts]));
    return ["All", ...unique];
  }, [categories, products]);

  const STATUSES = ["All", "Visible", "Draft"];
  const STOCKS = ["All", "In Stock", "Low Stock", "Out of Stock"];

  const SUBCATEGORIES = useMemo(() => {
    const selCatLow = String(selectedCategory || "").trim().toLowerCase();
    const relevantProducts =
      selectedCategory === "All"
        ? products
        : products.filter((p) => String(p.category || "").trim().toLowerCase() === selCatLow);
    const fromProds = relevantProducts
      .map(
        (p) =>
          p.subcategory ||
          p.subcategories?.name ||
          (p.subcategory_id != null ? subcategoryLookup.idToName.get(String(p.subcategory_id)) : null)
      )
      .filter(Boolean);
    const fromCats = (categories || [])
      .filter(
        (c) =>
          selectedCategory === "All" ||
          String(c?.name || c?.title || "").trim().toLowerCase() === selCatLow
      )
      .flatMap((c) => {
        const catId = String(c?.category_id ?? c?.id ?? "");
        const cachedSubs = catId && subcategoriesCache?.[catId] ? subcategoriesCache[catId] : [];
        return [...(c?.subcategories || []), ...cachedSubs].map((s) => s?.name);
      })
      .filter(Boolean);
    return ["All", ...Array.from(new Set([...fromCats, ...fromProds]))];
  }, [products, categories, subcategoriesCache, selectedCategory, subcategoryLookup]);

  const toggleExpand = (id) => {
    setExpandedRows((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Detect mobile card breakpoint
  const [isMobileCard, setIsMobileCard] = useState(window.innerWidth <= 540);
  React.useEffect(() => {
    const handler = () => setIsMobileCard(window.innerWidth <= 540);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const q = normalizeSearchText(searchQuery);
      const qCompact = stripSearchSymbols(q);
      const qTokens = q ? q.split(/\s+/).filter(Boolean) : [];

      const resolvedProdSubName = String(
        p.subcategory ||
        p.subcategories?.name ||
        (p.subcategory_id != null ? subcategoryLookup.idToName.get(String(p.subcategory_id)) : "") ||
        ""
      ).trim();

      const productColors = getProductColors(p);
      const productColorNames = productColors.map((c) => getColorName(c)).filter(Boolean);
      const variantsList = Array.isArray(p.variants)
        ? p.variants
        : Array.isArray(p.product_variants)
        ? p.product_variants
        : [];

      const searchableFields = [
        p.name,
        p.title,
        p.sku,
        p.id,
        p.product_id,
        p.category,
        p.categories?.name,
        resolvedProdSubName,
        p.material,
        p.fabric,
        p.description,
        p.status,
        ...productColors,
        ...productColorNames,
        ...(Array.isArray(p.sizes) ? p.sizes : [p.sizes]),
      ]
        .map(normalizeSearchText)
        .filter(Boolean);

      const combinedProductText = searchableFields.join(" ");
      const combinedProductCompact = stripSearchSymbols(combinedProductText);

      const matchVariant = variantsList.some((v) => doesVariantMatchQuery(v, q));

      const matchDirect =
        !q ||
        searchableFields.some(
          (field) =>
            field.includes(q) ||
            (qCompact && stripSearchSymbols(field).includes(qCompact))
        ) ||
        (qCompact && combinedProductCompact.includes(qCompact)) ||
        (qTokens.length > 1 &&
          qTokens.every(
            (token) =>
              combinedProductText.includes(token) ||
              variantsList.some((v) => doesVariantMatchQuery(v, token))
          ));

      const matchSearch = !q || matchDirect || matchVariant;

      const isCatFiltered = selectedCategory !== "All" || Boolean(selectedCategoryId);
      const pCatNameLow = String(p.category || p.categories?.name || "").trim().toLowerCase();
      const selCatLow = String(selectedCategory || "").trim().toLowerCase();
      const matchedCatObj = (categories || []).find(
        (c) =>
          (selectedCategoryId && String(c.category_id ?? c.id) === String(selectedCategoryId)) ||
          (selectedCategory !== "All" && String(c.name || "").trim().toLowerCase() === selCatLow)
      );
      const targetCatId =
        selectedCategoryId ||
        (matchedCatObj ? String(matchedCatObj.category_id ?? matchedCatObj.id) : "");

      const matchCategory =
        !isCatFiltered ||
        (selectedCategory !== "All" && pCatNameLow && pCatNameLow === selCatLow) ||
        Boolean(targetCatId && p.category_id != null && String(p.category_id) === String(targetCatId));

      const isSubFiltered = selectedSubcategory !== "All" || Boolean(selectedSubcategoryId);
      const pSubNameLow = resolvedProdSubName.toLowerCase();
      const targetSubLow =
        selectedSubcategory !== "All" ? String(selectedSubcategory || "").trim().toLowerCase() : "";
      const scopedSubIds =
        selectedCategory !== "All" && targetSubLow
          ? subcategoryLookup.catAndNameToIds.get(`${selCatLow}::${targetSubLow}`) ||
            subcategoryLookup.nameToIds.get(targetSubLow) ||
            []
          : targetSubLow
          ? subcategoryLookup.nameToIds.get(targetSubLow) || []
          : [];
      const pSubIdStr =
        p.subcategory_id != null && String(p.subcategory_id) !== ""
          ? String(p.subcategory_id)
          : "";

      let matchSubcategory = true;
      if (isSubFiltered) {
        if (selectedSubcategoryId) {
          if (pSubIdStr) {
            matchSubcategory = pSubIdStr === String(selectedSubcategoryId);
          } else {
            matchSubcategory = Boolean(targetSubLow && pSubNameLow && pSubNameLow === targetSubLow);
          }
        } else {
          matchSubcategory =
            Boolean(targetSubLow && pSubNameLow && pSubNameLow === targetSubLow) ||
            Boolean(
              pSubIdStr &&
                (pSubIdStr === String(selectedSubcategory).trim() || scopedSubIds.includes(pSubIdStr))
            );
        }
      }

      const matchStatus = selectedStatus === "All" || p.status === selectedStatus;
      const matchStock = selectedStock === "All" ||
        (selectedStock === "In Stock" && p.stock > 5) ||
        (selectedStock === "Low Stock" && p.stock > 0 && p.stock <= 5) ||
        (selectedStock === "Out of Stock" && p.stock === 0);

      const pPrice = Number(p.price) || 0;
      const matchPriceFrom = !priceFrom || isNaN(Number(priceFrom)) || pPrice >= Number(priceFrom);
      const matchPriceTo = !priceTo || isNaN(Number(priceTo)) || pPrice <= Number(priceTo);

      return matchSearch && matchCategory && matchSubcategory && matchStatus && matchStock && matchPriceFrom && matchPriceTo;
    });

    if (selectedSort === "price-asc") result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    if (selectedSort === "price-desc") result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    if (selectedSort === "name-asc") result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (selectedSort === "name-desc") result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    if (selectedSort === "stock-asc") result.sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
    if (selectedSort === "stock-desc") result.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));

    return result;
  }, [
    products,
    categories,
    searchQuery,
    selectedCategory,
    selectedCategoryId,
    selectedSubcategory,
    selectedSubcategoryId,
    selectedStatus,
    selectedStock,
    priceFrom,
    priceTo,
    selectedSort,
    subcategoryLookup,
  ]);

  // Auto-expand variant rows when search matches a variant SKU / ID / color / size
  useEffect(() => {
    const q = normalizeSearchText(searchQuery);
    if (!q) return;

    const matchingIds = products
      .filter((p) => {
        const variantsList = Array.isArray(p.variants)
          ? p.variants
          : Array.isArray(p.product_variants)
          ? p.product_variants
          : [];
        if (!p.has_variants || variantsList.length === 0) return false;
        return variantsList.some((v) => doesVariantMatchQuery(v, q));
      })
      .map((p) => p.id);

    if (matchingIds.length > 0) {
      setExpandedRows((prev) => Array.from(new Set([...prev, ...matchingIds])));
    }
  }, [searchQuery, products]);

  // Reset visibleCount to 10 whenever filters or search criteria change
  useEffect(() => {
    setVisibleCount(10);
  }, [searchQuery, selectedCategory, selectedSubcategory, selectedStatus, selectedStock, priceFrom, priceTo, selectedSort]);

  const totalItems = filteredProducts.length;
  const currentProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      if (prev < filteredProducts.length) {
        return Math.min(prev + 10, filteredProducts.length);
      }
      return prev;
    });
  }, [filteredProducts.length]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0,
      }
    );

    observer.observe(target);

    // Also listen to scroll on container (.db__main) or window for responsive loading
    const scrollParent = target.closest(".db__main") || window;
    const handleScroll = () => {
      if (scrollParent === window) {
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400) {
          loadMore();
        }
      } else {
        if (scrollParent.scrollTop + scrollParent.clientHeight >= scrollParent.scrollHeight - 400) {
          loadMore();
        }
      }
    };

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollParent.removeEventListener("scroll", handleScroll);
    };
  }, [loadMore]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") { setSearchQuery(searchInput); setVisibleCount(10); }
    if (e.key === "Escape") { setSearchInput(""); setSearchQuery(""); setVisibleCount(10); }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    setSearchQuery(val);
    setVisibleCount(10);
  };

  const handleEdit = (product) => { if (onEditProduct) onEditProduct(product); };

  const requestDelete = (id) => {
    setPendingDeleteId(id);
  };

  const pendingProduct = useMemo(() => {
    if (pendingDeleteId === null) return null;
    return products.find((p) => (p.id ?? p.product_id) === pendingDeleteId) || null;
  }, [pendingDeleteId, products]);

  useEffect(() => {
    if (pendingDeleteId === null) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting) {
        setPendingDeleteId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingDeleteId, isDeleting]);

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    if (!id) {
      setPendingDeleteId(null);
      return;
    }
    try {
      setIsDeleting(true);
      if (onDeleteProduct) {
        await onDeleteProduct(id);
      }
    } catch (err) {
      console.error("Error deleting product:", err);
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };



  return (
    <div className="product-list">

      {/* Header */}
      <div className="pl-header">
        <div className="pl-title">
          <h1>
            {selectedSubcategory !== "All" && selectedCategory !== "All"
              ? `${selectedCategory} — ${selectedSubcategory}`
              : selectedSubcategory !== "All"
              ? selectedSubcategory
              : selectedCategory !== "All"
              ? selectedCategory
              : "All products"}
          </h1>
          <span className="pl-count">
            {filteredProducts.length} {filteredProducts.length === 1 ? "Item" : "Items"}
          </span>
          {(selectedCategory !== "All" || selectedSubcategory !== "All") && (
            <button
              type="button"
              className="pl-clear-filter-btn"
              onClick={() => {
                setSelectedCategory("All");
                setSelectedCategoryId("");
                setSelectedSubcategory("All");
                setSelectedSubcategoryId("");
                setVisibleCount(10);
                setSearchParams({}, { replace: true });
              }}
            >
              Show All ({products.length})
            </button>
          )}
        </div>

      </div>

      {/* Filters + Search */}
      <div className="pl-filters">
        <div className="pl-filter-group">
          {/* Category Dropdown */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setCategoryOpen(o => !o); setStatusOpen(false); setStockOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              <span>{selectedCategory === "All" ? "All categories" : selectedCategory}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {categoryOpen && (
              <div className="pl-dropdown-menu">
                {CATEGORIES.map(c => (
                  <div key={c} className={`pl-dropdown-item ${selectedCategory === c ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(c);
                      const matchedCat = (categories || []).find(
                        (cat) => String(cat?.name || cat?.title || "").trim().toLowerCase() === String(c).trim().toLowerCase()
                      );
                      setSelectedCategoryId(c === "All" ? "" : String(matchedCat?.category_id ?? matchedCat?.id ?? ""));
                      setCategoryOpen(false);
                      setVisibleCount(10);
                      setSelectedSubcategory("All");
                      setSelectedSubcategoryId("");
                      const next = new URLSearchParams(searchParams);
                      next.delete("subcategory");
                      next.delete("subcategoryId");
                      next.delete("sub");
                      if (c === "All") {
                        next.delete("category");
                        next.delete("categoryId");
                      } else {
                        next.set("category", c);
                        if (matchedCat?.category_id ?? matchedCat?.id) {
                          next.set("categoryId", String(matchedCat.category_id ?? matchedCat.id));
                        }
                      }
                      setSearchParams(next, { replace: true });
                    }}>
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subcategory Dropdown — new */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setSubcategoryOpen(o => !o); setCategoryOpen(false); setStatusOpen(false); setStockOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h12M3 18h6" />
              </svg>
              <span>{selectedSubcategory === "All" ? "All subcategories" : selectedSubcategory}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {subcategoryOpen && (
              <div className="pl-dropdown-menu">
                {SUBCATEGORIES.map(s => (
                  <div key={s} className={`pl-dropdown-item ${selectedSubcategory === s ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedSubcategory(s);
                      setSelectedSubcategoryId("");
                      setSubcategoryOpen(false);
                      setVisibleCount(10);
                      const next = new URLSearchParams(searchParams);
                      next.delete("subcategoryId");
                      next.delete("sub");
                      if (s === "All") {
                        next.delete("subcategory");
                      } else {
                        next.set("subcategory", s);
                      }
                      setSearchParams(next, { replace: true });
                    }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setStatusOpen(o => !o); setCategoryOpen(false); setSubcategoryOpen(false); setStockOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span>{selectedStatus === "All" ? "All Status" : selectedStatus}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {statusOpen && (
              <div className="pl-dropdown-menu">
                {STATUSES.map(s => (
                  <div key={s} className={`pl-dropdown-item ${selectedStatus === s ? 'active' : ''}`}
                    onClick={() => { setSelectedStatus(s); setStatusOpen(false); setVisibleCount(10); }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Dropdown (From - To) */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setPriceOpen(o => !o); setCategoryOpen(false); setSubcategoryOpen(false); setStatusOpen(false); setStockOpen(false); setSortOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>{priceFrom || priceTo ? `₹${priceFrom || 0} – ₹${priceTo || '∞'}` : "Price: All"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {priceOpen && (
              <div className="pl-dropdown-menu pl-price-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                <div className="pl-price-filter-popover">
                  <div className="pl-price-inputs-row">
                    <div className="pl-price-input-col">
                      <label className="pl-price-label">From (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={priceFrom}
                        onChange={(e) => { setPriceFrom(e.target.value); setVisibleCount(10); }}
                        className="pl-price-input"
                      />
                    </div>
                    <div className="pl-price-input-col">
                      <label className="pl-price-label">To (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={priceTo}
                        onChange={(e) => { setPriceTo(e.target.value); setVisibleCount(10); }}
                        className="pl-price-input"
                      />
                    </div>
                  </div>
                  {(priceFrom || priceTo) && (
                    <button
                      type="button"
                      className="pl-price-clear-btn"
                      onClick={() => { setPriceFrom(""); setPriceTo(""); setVisibleCount(10); }}
                    >
                      Clear Price
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="pl-dropdown-wrap" style={{ position: 'relative' }}>
            <div className="pl-dropdown" onClick={() => { setSortOpen(o => !o); setCategoryOpen(false); setSubcategoryOpen(false); setStatusOpen(false); setStockOpen(false); setPriceOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M7 12h10M10 18h4" />
              </svg>
              <span>{SORTS.find(s => s.value === selectedSort)?.label || "Sort"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {sortOpen && (
              <div className="pl-dropdown-menu">
                {SORTS.map(s => (
                  <div key={s.value} className={`pl-dropdown-item ${selectedSort === s.value ? 'active' : ''}`}
                    onClick={() => { setSelectedSort(s.value); setSortOpen(false); setVisibleCount(10); }}>
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>


        <div className="pl-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
          {searchInput && (
            <button
              className="pl-search-clear"
              onClick={() => { setSearchInput(""); setSearchQuery(""); setVisibleCount(10); }}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {searchQuery && (
        <p className="pl-search-label">
          Results for <strong>"{searchQuery}"</strong> — {totalItems} product{totalItems !== 1 ? "s" : ""} found
        </p>
      )}

      {/* ── Mobile card list (≤540px) ── */}
      {isMobileCard ? (
        <div className="pl-mobile-list">
          {currentProducts.length === 0 ? (
            <div className="pl-table-wrapper">
              <div className="pl-empty-state" style={{ padding: "60px 20px" }}>
                <div className="pl-empty-content">
                  <img src={searchEmpty} alt="No results" className="pl-empty-img" />
                  <p className="pl-empty-title">No results found</p>
                  <span className="pl-empty-subtitle">
                    {searchQuery
                      ? `No products match "${searchQuery}". Try a different name or SKU.`
                      : "No products yet. Click Add product to get started."}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            currentProducts.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={requestDelete}
                expandedRows={expandedRows}
                toggleExpand={toggleExpand}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      ) : (
        /* ── Desktop / tablet table ── */
        <div className="ao__table-wrap pl-table-wrapper">
          <table className="ao__table pl-table">
            <thead>
              <tr>
                <th className="pl-product-col">Product</th>
                <th className="pl-category-col">Category</th>
                <th className="pl-subcategory-col">Subcategory</th>
                <th className="pl-price-col">Price</th>
                <th className="pl-stock-col">Stock</th>
                <th className="pl-status-col">Status</th>
                <th className="pl-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: "20px" }}>
                    <SkeletonTable rows={5} cols={7} />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="pl-empty-state">
                    <div className="pl-empty-content">
                      <img src={searchEmpty} alt="No results" className="pl-empty-img" />
                      <p className="pl-empty-title">No results found</p>
                      <span className="pl-empty-subtitle">
                        {searchQuery
                          ? `No products match "${searchQuery}". Try a different name or SKU.`
                          : "No products yet. Click Add product to get started."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr key={product.id} className="ao__row">
                      <td className="pl-product-col">
                        <div className="pl-product-info">
                          <img
                            src={product.images?.[0] || product.image || product.variants?.[0]?.images?.[0] || searchEmpty}
                            alt={product.name}
                            className="pl-product-img"
                            onError={(e) => { e.target.src = searchEmpty; }}
                          />
                          <div className="pl-product-details">
                            <span className="pl-product-name">{product.name}</span>
                            {product.has_variants && product.variants?.length > 0 && (
                              <button
                                className="pl-variant-toggle"
                                onClick={() => toggleExpand(product.id)}
                              >
                                {product.variants.length} variants {expandedRows.includes(product.id) ? "▲" : "▼"}
                              </button>
                            )}

                            <span className="pl-product-sku">SKU: {product.sku}</span>
                            {getProductColors(product).length > 0 && (
                              <div className="pl-color-dots">
                                {getProductColors(product).map((c) => (
                                  <span key={c} className="pl-color-dot" style={{ backgroundColor: c }} title={c} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="pl-category-col">
                        <span className="pl-category-badge" style={getCategoryStyle(product.category)}>
                          {product.category}
                        </span>
                      </td>
                      <td className="pl-subcategory-col">
                        {(product.subcategory || (product.subcategory_id != null ? subcategoryLookup.idToName.get(String(product.subcategory_id)) : null)) ? (
                          <span className="pl-subcategory-badge">
                            {product.subcategory || subcategoryLookup.idToName.get(String(product.subcategory_id))}
                          </span>
                        ) : (
                          <span className="pl-subcategory-none">—</span>
                        )}
                      </td>
                      <td className="pl-price-col">
                        {product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price) && (
                          <span className="pl-price-compare">
                            Rs.{parseFloat(product.compare_price).toLocaleString()}
                          </span>
                        )}
                        <span className="pl-price-final">
                          Rs.{getFinalPrice(product).toLocaleString()}
                        </span>
                      </td>
                      <td className="pl-stock-col">
                        <span className="pl-stock-low">{product.stock} left</span>
                      </td>
                      <td className="pl-status-col">
                        <span className={
                          "pl-status-badge " +
                          (product.status === "Visible" ? "pl-status-visible" :
                            product.status === "Draft" ? "pl-status-draft" : "")
                        }>
                          {product.status}
                        </span>
                      </td>
                      <td className="pl-actions-col">
                        <button className="pl-action-btn" aria-label="Edit" onClick={() => handleEdit(product)}>
                          <img src={editIcon} alt="Edit" className="pl-action-icon" />
                        </button>
                        <button
                          type="button"
                          className="pl-action-btn pl-action-btn--delete"
                          aria-label="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(product.id ?? product.product_id);
                          }}
                        >
                          <img src={trashIcon} alt="Delete" className="pl-action-icon pl-action-icon--delete" />
                        </button>
                      </td>
                    </tr>

                    {product.has_variants && expandedRows.includes(product.id) && (
                      <tr className="pl-variant-subrow">
                        <td colSpan='7'>
                          <table className="pl-variant-table">
                            <thead>
                              <tr>
                                <th>Image</th>
                                <th>Color</th>
                                <th>Size</th>
                                <th>SKU</th>
                                <th>Price</th>
                                <th>Stock</th>
                              </tr>
                            </thead>
                            <tbody>
                              {product.variants.map(v => {
                                const isVariantMatch = doesVariantMatchQuery(v, searchQuery);
                                return (
                                  <tr
                                    key={v.variant_id || `${v.color}-${v.size}-${v.sku}`}
                                    style={isVariantMatch ? { background: "#fef9c3" } : undefined}
                                  >
                                    <td>
                                      <img
                                        src={v.images?.[0] || searchEmpty}
                                        alt={`${product.name} ${v.color || ''} ${v.size || ''}`}
                                        className="pl-variant-img"
                                        onError={(e) => { e.target.src = searchEmpty; }}
                                      />
                                    </td>
                                    <td>
                                      {v.color ? (
                                        <>
                                          <span className="pl-color-dot" style={{ backgroundColor: v.color }} /> {v.color}
                                        </>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td>{v.size || '—'}</td>
                                    <td>
                                      <span style={isVariantMatch ? { color: "#b45309", fontWeight: "700" } : undefined}>
                                        {v.sku || "—"}
                                      </span>
                                    </td>
                                    <td>₹{Number(v.price).toLocaleString()}</td>
                                    <td>{v.stock}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Infinite Scroll Footer / Sentinel */}
      <div className="pl-scroll-footer" ref={observerTarget}>
        <span className="pl-showing">
          {totalItems === 0
            ? "Showing 0 products"
            : visibleCount >= totalItems
            ? `Showing all ${totalItems} products`
            : `Showing ${Math.min(visibleCount, totalItems)} of ${totalItems} products`}
        </span>
        {visibleCount < totalItems && (
          <div className="pl-loading-more">
            <span className="admin-btn-spinner admin-btn-spinner--dark" />
            <span>Loading more products...</span>
          </div>
        )}
      </div>
      {pendingDeleteId !== null && typeof document !== "undefined" && createPortal(
        <div
          className="pl-confirm-overlay"
          onClick={() => !isDeleting && setPendingDeleteId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pl-confirm-dialog-title"
        >
          <div className="pl-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pl-confirm-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 id="pl-confirm-dialog-title" className="pl-confirm-title">Delete Product</h3>
            <p className="pl-confirm-text">
              Are you sure you want to delete {pendingProduct?.name ? <strong>"{pendingProduct.name}"</strong> : "this product"}? This action cannot be undone.
            </p>
            <div className="pl-confirm-actions">
              <button
                type="button"
                className="pl-confirm-cancel"
                onClick={() => setPendingDeleteId(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pl-confirm-ok admin-btn-with-spinner"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="admin-btn-spinner" /> Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProductList;