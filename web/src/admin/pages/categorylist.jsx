import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";


// const navigate = useNavigate();

// ─── Responsive hook ──────────────────────────────────────────────────────────
const useWindowWidth = () => {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
};

const slugify = (str) =>
  (str || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const CheckerPlaceholder = ({ size = "full" }) => (
  <div style={{
    width: "100%", height: "100%",
    backgroundImage: "repeating-conic-gradient(#d8d8d8 0% 25%, #e8e8e8 0% 50%)",
    backgroundSize: size === "small" ? "10px 10px" : "16px 16px",
  }} />
);

// ─── Empty State SVG ──────────────────────────────────────────────────────────
const NoResultsSVG = () => (
  <svg width="200" height="160" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="58" cy="55" r="38" fill="#F5F0E8" />
    <path d="M88 22 L89.2 25.5 L93 26.5 L89.2 27.5 L88 31 L86.8 27.5 L83 26.5 L86.8 25.5 Z" fill="#F5C842" opacity="0.7" />
    <path d="M26 40 L27 42.8 L30 43.5 L27 44.2 L26 47 L25 44.2 L22 43.5 L25 42.8 Z" fill="#F5C842" opacity="0.5" />
    <circle cx="82" cy="42" r="3" fill="#E8D9B0" opacity="0.8" />
    <circle cx="38" cy="28" r="2" fill="#E8D9B0" opacity="0.6" />
    <circle cx="90" cy="58" r="2.5" fill="#E8D9B0" opacity="0.5" />
    <circle cx="54" cy="51" r="22" fill="#FDF3C8" stroke="#E8C94A" strokeWidth="3.5" />
    <circle cx="54" cy="51" r="16" fill="#FEFAEC" />
    <circle cx="48" cy="45" r="5" fill="#fff" opacity="0.5" />
    <line x1="70" y1="67" x2="82" y2="79" stroke="#C8A830" strokeWidth="5.5" strokeLinecap="round" />
    <line x1="70" y1="67" x2="82" y2="79" stroke="#E8C94A" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ─── Grid Card ────────────────────────────────────────────────────────────────
const GridCard = ({ cat, onEdit, onDelete, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  // Check categoryImage first, then fall back to images array or legacy image field
  const thumbnail = cat.categoryImage || cat.images?.[0] || cat.image || null;
  return (
    <div
      onClick={() => onSelect(cat)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? "#f7f7f6" : "#fff",
        borderRadius: 14,
        border: isHovered ? "1px solid #d4d4d8" : "1px solid #e8e8e8",
        overflow: "hidden",
        cursor: "pointer",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
      }}>
      <div style={{ padding: "10px 10px 0 10px" }}>
        <div style={{
          width: "100%",
          aspectRatio: "4/3",
          overflow: "hidden",
          borderRadius: 8,
          border: "1px solid #ebebeb",
          background: "#fafafa",
        }}>
          {thumbnail
            ? <img
              src={thumbnail}
              alt={cat.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            : <CheckerPlaceholder />}
        </div>
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#1c1c1e",
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {cat.name}
        </div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
          {cat.productCount ?? 0} products · {cat.status || "Draft"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              background: "#eff6ff",
              color: "#3b82f6",
              border: "none",
              borderRadius: 6,
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#dbeafe"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cat);
            }}
          >Edit</button>
          <button
            style={{
              background: "#fff0f0",
              color: "#ef4444",
              border: "none",
              borderRadius: 6,
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              marginLeft: "auto",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff0f0"; }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(cat.category_id || cat.id);
            }}
          >Delete</button>
        </div>
      </div>
    </div>
  );
};

// ─── Mobile Card ──────────────────────────────────────────────────────────────
const MobileCard = ({ cat, selected, onSelect, onEdit, onDelete, onOpenSubcategory }) => {
  const [isHovered, setIsHovered] = useState(false);
  const thumbnail = cat.categoryImage || cat.images?.[0] || cat.image || null;
  return (
    <div
      onClick={() => onOpenSubcategory(cat)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 16px", borderBottom: "1px solid #f5f5f5",
        background: selected ? "#fafffe" : isHovered ? "#fbfbfa" : "#fff",
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: 2, flexShrink: 0, width: 15, height: 15, cursor: "pointer" }}
      />
      <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e5e5", flexShrink: 0 }}>
        {thumbnail
          ? <img src={thumbnail} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <CheckerPlaceholder size="small" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1c1e", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cat.name}
        </div>
        <div style={{ fontSize: 11.5, color: "#aaa", marginBottom: 6 }}>/{cat.slug || slugify(cat.name)}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {cat.parent && (
            <span style={{ fontSize: 11, background: "#ede9fe", color: "#7c3aed", borderRadius: 20, padding: "2px 10px", fontWeight: 500 }}>
              {cat.parent}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 20,
            background: cat.status === "Active" ? "rgba(16,185,129,0.12)" : "#e5e5e5",
            color: cat.status === "Active" ? "#10b981" : "#888",
            border: cat.status === "Active" ? "1px solid rgba(16,185,129,0.25)" : "1px solid #ddd",
          }}>{cat.status || "Draft"}</span>
          <span style={{ fontSize: 11, color: "#999" }}>{cat.productCount ?? 0} products</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button
          style={{ background: "#eff6ff", color: "#3b82f6", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(cat);
          }}
        >Edit</button>
        <button
          style={{ background: "#fff0f0", color: "#ef4444", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(cat.category_id || cat.id);
          }}
        >Del</button>
      </div>
    </div>
  );
};

// ─── Desktop List Row ──────────────────────────────────────────────────────────
const ListRow = ({ cat, selected, onSelect, onEdit, onDelete, onOpenSubcategory, cols }) => {
  const [isHovered, setIsHovered] = useState(false);
  const thumbnail = cat.categoryImage || cat.images?.[0] || cat.image || null;
  return (
    <div
      onClick={() => onOpenSubcategory && onOpenSubcategory(cat)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "grid", gridTemplateColumns: cols,
        padding: "14px 20px", borderBottom: "1px solid #f5f5f5",
        alignItems: "center", gap: 8,
        background: selected ? "#fafffe" : isHovered ? "#fafaf9" : "#fff",
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ color: "#ccc", cursor: "grab", fontSize: 16, userSelect: "none", textAlign: "center" }}
      >
        ⠿
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", justifyContent: "center" }}
      >
        <input type="checkbox" checked={selected} onChange={onSelect} style={{ width: 15, height: 15, cursor: "pointer" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e5e5", flexShrink: 0 }}>
          {thumbnail
            ? <img src={thumbnail} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <CheckerPlaceholder size="small" />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1c1c1e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</div>
          <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/{cat.slug || slugify(cat.name)}</div>
        </div>
      </div>
      <div>
        {cat.parent
          ? <span style={{ fontSize: 12, background: "#ede9fe", color: "#7c3aed", borderRadius: 20, padding: "3px 12px", fontWeight: 500 }}>{cat.parent}</span>
          : <span style={{ color: "#ccc", fontSize: 12 }}>—</span>}
      </div>
      <div style={{ fontSize: 13, color: "#555", display: "flex", justifyContent: "center" }}>{cat.productCount ?? 0}</div>
      <div>
        <span style={{
          fontSize: 12, fontWeight: 500, padding: "4px 14px", borderRadius: 20,
          background: cat.status === "Active" ? "rgba(16,185,129,0.12)" : "#e5e5e5",
          color: cat.status === "Active" ? "#10b981" : "#888",
          border: cat.status === "Active" ? "1px solid rgba(16,185,129,0.25)" : "1px solid #ddd",
        }}>{cat.status || "Draft"}</span>
      </div>
      <div>
        <span style={{
          fontSize: 12, fontWeight: 500, padding: "4px 14px", borderRadius: 20,
          background: cat.featured ? "rgba(99,102,241,0.08)" : "#e5e5e5",
          color: cat.featured ? "#6366f1" : "#888",
          border: cat.featured ? "1px solid rgba(99,102,241,0.2)" : "1px solid #ddd",
        }}>{cat.featured ? "Yes" : "No"}</span>
      </div>
    </div>
  );
};

// ─── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ current, total, itemsPerPage, onChange, compact = false }) => {
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  const buildPages = () => {
    if (compact) return null;
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push("...");
    for (let p = Math.max(2, current - 1); p <= Math.min(totalPages - 1, current + 1); p++) pages.push(p);
    if (current < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const arrowBtn = (disabled, onClick, children) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid #e0e0e0", borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        background: "#fff", color: disabled ? "#ccc" : "#555", flexShrink: 0,
      }}
    >{children}</button>
  );

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {arrowBtn(current === 1, () => onChange(current - 1),
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        )}
        <span style={{ fontSize: 13, color: "#555", whiteSpace: "nowrap" }}>{current} / {totalPages}</span>
        {arrowBtn(current === totalPages, () => onChange(current + 1),
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {arrowBtn(current === 1, () => { if (current > 1) onChange(current - 1); },
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      )}
      {buildPages().map((p, i) =>
        p === "..." ? (
          <span key={`dot-${i}`} style={{ fontSize: 13, color: "#aaa", width: 20, textAlign: "center" }}>…</span>
        ) : (
          <button key={p} onClick={() => onChange(p)} style={{
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            border: current === p ? "1.5px solid #1c1c1e" : "1px solid #e0e0e0",
            borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
            background: current === p ? "#1c1c1e" : "#fff",
            color: current === p ? "#fff" : "#555",
            fontWeight: current === p ? 600 : 400,
          }}>{p}</button>
        )
      )}
      {arrowBtn(current === totalPages, () => { if (current < totalPages) onChange(current + 1); },
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const CategoryList = ({
  categories = [],
  setCategories,
  onAddCategory,
  // onAddSubcategory,
  onOpenSubcategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const width = useWindowWidth();
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);

  const [blockedCategory, setBlockedCategory] = useState(null);

  const isXS = width <= 480;
  const isSM = width <= 640;
  const isMD = width <= 768;
  const isLG = width <= 1024;

  const ITEMS_PER_PAGE = 10;

  const filtered = categories.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const allSelected = paginated.length > 0 && paginated.every((c) => selectedIds.includes(c.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : paginated.map((c) => c.id));
  const toggleOne = (id) => setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );

  const handleDeleteClick = (id) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;

    if ((cat.productCount ?? 0) > 0) {
      setBlockedCategory(cat)
      return;
    }
    const confirmed = window.confirm(`Delete category "${cat.name}"? This cannot be undone.`);

    if (confirmed) onDeleteCategory(id);
  };

  const isEmpty = filtered.length === 0;

  const gridCols = isXS
    ? "repeat(2, 1fr)"
    : isSM
      ? "repeat(2, 1fr)"
      : isMD
        ? "repeat(2, 1fr)"
        : isLG
          ? "repeat(3, 1fr)"
          : "repeat(4, 1fr)";

  const tableCols = isLG
    ? "32px 40px 2fr 1fr 1fr 1fr"
    : "32px 40px 2.5fr 1fr 1fr 1fr 1fr";

  const tableHeaders = isLG
    ? ["Category", "Parent", "Products", "Status"]
    : ["Category", "Parent", "Products", "Status", "Featured"];

  const EmptyState = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, padding: 32, textAlign: "center" }}>
      <div style={{ marginBottom: 12 }}><NoResultsSVG /></div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#555", marginBottom: 6 }}>No categories found</div>
      <div style={{ fontSize: 13, color: "#999" }}>
        {categories.length === 0
          ? "Add your first category to get started."
          : "No categories match your search. Please try again."}
      </div>
    </div>
  );

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const Header = () => (
    <div style={{
      display: "flex",
      flexDirection: isSM ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isSM ? "flex-start" : "center",
      gap: isSM ? 12 : 0,
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{
          fontSize: isXS ? 22 : isMD ? 26 : 32,
          fontWeight: 800, color: "#1c1c1e", margin: 0, letterSpacing: "-0.5px",
        }}>
          All categories
        </h1>
        <span style={{ fontSize: 13, color: "#aaa", fontWeight: 400 }}>
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: isSM ? 10 : 16, width: isSM ? "100%" : "auto", justifyContent: isSM ? "space-between" : "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {["Grid", "List"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v.toLowerCase())}
              style={{
                border: "none", background: "transparent", cursor: "pointer",
                fontSize: 13, fontWeight: 500, fontFamily: "inherit", padding: 0, lineHeight: 1,
                color: view === v.toLowerCase() ? "#1c1c1e" : "#aaa",
                textDecoration: view === v.toLowerCase() ? "underline" : "none",
                textDecorationThickness: "2px", textUnderlineOffset: "4px",
              }}
            >{v}</button>
          ))}
        </div>
        <button
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#1c1c1e", color: "#fff", border: "none",
            borderRadius: 8, padding: isXS ? "0 12px" : "0 16px", height: 36,
            fontSize: isXS ? 12 : 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
          onClick={onAddCategory}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {isXS ? "Add" : "Add Category"}
        </button>
      </div>
    </div>
  );

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  const ListView = () => (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
      <div style={{
        display: "flex",
        flexDirection: isMD ? "column" : "row",
        alignItems: isMD ? "stretch" : "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: "1px solid #f0f0f0",
        gap: 10,
      }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: isMD ? 2 : 0 }}>
          {["All Category", "All Status", "All Types", "Filter"].map((label) => (
            <button key={label} style={{
              display: "flex", alignItems: "center", gap: 5, background: "#fff",
              border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", height: 34,
              fontSize: 12.5, color: "#555", cursor: "pointer", fontFamily: "inherit",
              fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {label}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ))}
        </div>

        <div style={{ position: "relative", flexShrink: 0, width: isMD ? "100%" : "auto" }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              height: 34, padding: "0 12px 0 32px", border: "1px solid #e0e0e0",
              borderRadius: 8, fontSize: 12.5, color: "#333", outline: "none",
              fontFamily: "inherit", background: "#fff",
              width: isMD ? "100%" : 220,
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {!isSM && (
        <div style={{ fontSize: 12, color: "#aaa", padding: "10px 16px", borderBottom: "1px solid #f0f0f0" }}>
          Drag the ⠿ handle on each row to reorder categories on the storefront.
        </div>
      )}

      {isMD ? (
        <>
          {!isEmpty && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 16px", borderBottom: "1px solid #f0f0f0",
              background: "#fafafa",
            }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 15, height: 15, cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: "#888" }}>Select all on this page</span>
              {selectedIds.length > 0 && (
                <span style={{ fontSize: 12, color: "#6366f1", marginLeft: "auto" }}>{selectedIds.length} selected</span>
              )}
            </div>
          )}

          {isEmpty
            ? EmptyState()
            : paginated.map((cat) => (
              <MobileCard
                key={cat.id}
                cat={cat}
                selected={selectedIds.includes(cat.id)}
                onSelect={() => toggleOne(cat.id)}
                onEdit={onEditCategory}
                onDelete={handleDeleteClick}
                onOpenSubcategory={onOpenSubcategory}
              />
            ))}
        </>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: tableCols,
            padding: "10px 20px",
            background: "#fafafa",
            borderBottom: "1px solid #f0f0f0",
            gap: 8, alignItems: "center",
          }}>
            <div />
            <div style={{ display: "flex", justifyContent: "center" }}>
              {isEmpty
                ? <input type="checkbox" disabled style={{ width: 15, height: 15 }} />
                : <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 15, height: 15, cursor: "pointer" }} />}
            </div>
            {tableHeaders.map((h) => (
              <div key={h} style={{
                fontSize: 11.5, fontWeight: 600, color: "#aaa",
                textTransform: "uppercase", letterSpacing: "0.4px",
                ...(h === "Products" && { textAlign: "center" }),
              }}>{h}</div>
            ))}
          </div>

          {isEmpty
            ? EmptyState()
            : paginated.map((cat) => (
              <ListRow
                key={cat.id}
                cat={cat}
                cols={tableCols}
                selected={selectedIds.includes(cat.id)}
                onSelect={() => toggleOne(cat.id)}
                onEdit={onEditCategory}
                onDelete={handleDeleteClick}
                onOpenSubcategory={onOpenSubcategory}
              />
            ))}
        </>
      )}

      {!isEmpty && (
        <div style={{
          display: "flex",
          flexDirection: isSM ? "column" : "row",
          alignItems: isSM ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: isSM ? 10 : 0,
          padding: "12px 16px",
          borderTop: "1px solid #f0f0f0",
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#666" }}>
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} categories
          </span>
          <Pagination
            current={page}
            total={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onChange={setPage}
            compact={isXS}
          />
        </div>
      )}
    </div>
  );

  // ── GRID VIEW ──────────────────────────────────────────────────────────────
  const GridView = () => (
    <>
      <div style={{ marginBottom: 12, marginTop: 8 }}>
        <input
          type="text"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            width: "100%", maxWidth: isSM ? "100%" : 320,
            height: 38, padding: "0 14px",
            border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 13,
            color: "#333", outline: "none", fontFamily: "inherit", background: "#fff",
            boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>{filtered.length} categories</div>

      {isEmpty
        ? EmptyState()
        : (
          <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: isXS ? 12 : 16 }}>
            {filtered.map((cat) => (
              <GridCard
                key={cat.id}
                cat={cat}
                onEdit={onEditCategory}
                onDelete={handleDeleteClick}
                onSelect={onOpenSubcategory}
              />
            ))}
          </div>
        )}
    </>
  );

  return (
    <div style={{
      padding: isXS ? "16px 12px" : isMD ? "20px 16px" : "24px 28px",
      background: "#f2f2f0",
      minHeight: "100vh",
    }}>
      {Header()}
      {view === "list" ? ListView() : GridView()}

      {blockedCategory && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16,
          }}
          onClick={() => setBlockedCategory(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 14, padding: "28px 26px",
              maxWidth: 380, width: "100%", textAlign: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 44, height: 44, borderRadius: "50%", background: "#fff0f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: "#1c1c1e", marginBottom: 8 }}>
              Can't delete "{blockedCategory.name}"
            </div>

            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>
              This category still has <strong>{blockedCategory.productCount}</strong> product
              {blockedCategory.productCount > 1 ? "s" : ""} linked to it. Move or delete those
              products first, then try again.
            </div>
            <button
              onClick={() => setBlockedCategory(null)}
              style={{
                background: "#1c1c1e", color: "#fff", border: "none",
                borderRadius: 8, padding: "10px 28px", fontSize: 13.5,
                fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryList;