import React, { useState, useEffect, useMemo } from "react";
import { couponService } from "../../services/couponService";
import { productService } from "../../services/productService";
import AdminModal from "../components/AdminModal";
import "./Allorders.css";
import "./CouponManagement.css";

const EMPTY_COUPON_FORM = {
  code: "",
  category_id: "",
  subcategory_id: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_amount: "",
  max_discount_amount: "",
  usage_limit: "",
  start_date: new Date().toISOString().split("T")[0],
  expiry_date: "",
  is_active: true,
};

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'active' | 'inactive' | 'expired'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState(EMPTY_COUPON_FORM);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteModalCoupon, setDeleteModalCoupon] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState("");

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const [couponData, categoryData] = await Promise.all([
        couponService.getAllCoupons(),
        productService.getCategories().catch(() => []),
      ]);
      setCoupons(couponData || []);
      setCategories(categoryData || []);
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Quick Copy
  const handleCopy = (code) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // Status Toggle
  const handleToggleStatus = async (coupon) => {
    const nextStatus = !coupon.is_active;
    try {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: nextStatus } : c))
      );
      await couponService.toggleCouponStatus(coupon.id, nextStatus);
    } catch (err) {
      console.error("Failed to toggle coupon status:", err);
      // Revert on error
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: coupon.is_active } : c))
      );
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(EMPTY_COUPON_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      category_id: coupon.category_id ? String(coupon.category_id) : "",
      subcategory_id: coupon.subcategory_id ? String(coupon.subcategory_id) : "",
      discount_type: coupon.discount_type || "percentage",
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || "",
      max_discount_amount: coupon.max_discount_amount || "",
      usage_limit: coupon.usage_limit || "",
      start_date: coupon.start_date ? coupon.start_date.split("T")[0] : "",
      expiry_date: coupon.expiry_date ? coupon.expiry_date.split("T")[0] : "",
      is_active: coupon.is_active,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Auto-generate Random Coupon Code
  const handleGenerateCode = () => {
    const prefixes = ["FAY", "SAVE", "DEAL", "SPECIAL", "OFFER", "VIP", "FLAT", "MEGA", "FESTIVE", "WALK"];
    const val = formData.discount_value && Number(formData.discount_value) > 0
      ? Math.round(Number(formData.discount_value))
      : 20;

    // Filter out prefixes that would collide with existing coupon codes
    const existingCodes = new Set(coupons.map((c) => (c.code || "").toUpperCase()));
    const available = prefixes.filter((p) => !existingCodes.has(`${p}${val}`));
    const pool = available.length > 0 ? available : prefixes;
    const prefix = pool[Math.floor(Math.random() * pool.length)];

    const newCode = `${prefix}${val}`.toUpperCase();
    setFormData((prev) => ({ ...prev, code: newCode }));
  };

  // Submit Create / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.code.trim()) {
      setFormError("Please enter a coupon code.");
      return;
    }

    const val = Number(formData.discount_value);
    if (!val || val <= 0) {
      setFormError("Discount value must be greater than 0.");
      return;
    }

    if (formData.discount_type === "percentage" && val > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCoupon) {
        const updated = await couponService.updateCoupon(editingCoupon.id, formData);
        setCoupons((prev) => prev.map((c) => (c.id === editingCoupon.id ? updated : c)));
      } else {
        const created = await couponService.createCoupon(formData);
        setCoupons((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Failed to save coupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteModalCoupon) return;
    setIsDeleting(true);
    try {
      await couponService.deleteCoupon(deleteModalCoupon.id);
      setCoupons((prev) => prev.filter((c) => c.id !== deleteModalCoupon.id));
      setDeleteModalCoupon(null);
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const now = new Date();
    const total = coupons.length;
    const active = coupons.filter(
      (c) => c.is_active && (!c.expiry_date || new Date(c.expiry_date) >= now)
    ).length;
    const totalRedeemed = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
    const expired = coupons.filter((c) => c.expiry_date && new Date(c.expiry_date) < now).length;
    const inactive = coupons.filter((c) => !c.is_active).length;
    return { total, active, totalRedeemed, expired, inactive };
  }, [coupons]);

  // Filtered & Searched List
  const filteredCoupons = useMemo(() => {
    const now = new Date();
    return coupons.filter((c) => {
      // Tab filter
      const isExpired = c.expiry_date && new Date(c.expiry_date) < now;
      if (activeTab === "active" && (!c.is_active || isExpired)) return false;
      if (activeTab === "inactive" && c.is_active) return false;
      if (activeTab === "expired" && !isExpired) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const codeMatch = c.code.toLowerCase().includes(query);
        const catMatch = (c.categories?.name || "").toLowerCase().includes(query);
        const subMatch = (c.subcategories?.name || "").toLowerCase().includes(query);
        if (!codeMatch && !catMatch && !subMatch) return false;
      }

      return true;
    });
  }, [coupons, activeTab, searchQuery]);

  return (
    <div className="ao cpm-container">
      {/* ── Top Action Header (Always visible) ── */}
      <div className="cpm-top-header">
        <button
          type="button"
          className="cpm-create-btn"
          onClick={handleOpenCreate}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Coupon
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="cpm-stats-grid">
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrap cpm-stat-icon-wrap--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <div className="cpm-stat-info">
            <span className="cpm-stat-label">Total Coupons</span>
            <span className="cpm-stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrap cpm-stat-icon-wrap--green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="cpm-stat-info">
            <span className="cpm-stat-label">Active Coupons</span>
            <span className="cpm-stat-value">{stats.active}</span>
          </div>
        </div>

        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrap cpm-stat-icon-wrap--purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div className="cpm-stat-info">
            <span className="cpm-stat-label">Total Redemptions</span>
            <span className="cpm-stat-value">{stats.totalRedeemed}</span>
          </div>
        </div>

        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrap cpm-stat-icon-wrap--amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="cpm-stat-info">
            <span className="cpm-stat-label">Expired</span>
            <span className="cpm-stat-value">{stats.expired}</span>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="cpm-controls-bar">
        <div className="cpm-controls-left">
          <div className="cpm-select-wrapper">
            <svg
              className="cpm-select-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <select
              id="coupon-status-filter"
              className="cpm-filter-select"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              aria-label="Filter coupons by status"
            >
              <option value="all">All Coupons ({coupons.length})</option>
              <option value="active">Active ({stats.active})</option>
              <option value="inactive">Inactive ({stats.inactive})</option>
              <option value="expired">Expired ({stats.expired})</option>
            </select>
            <svg
              className="cpm-select-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="cpm-controls-right">
          <div className="ao__search-box cpm-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="ao__search-input cpm-search-input"
              placeholder="Search coupon code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="cpm-copy-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="cpm-table-card">
        {loading ? (
          <div className="cpm-empty-state">
            <p className="cpm-empty-subtitle">Loading coupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="cpm-empty-state">
            <div className="cpm-empty-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <h3 className="cpm-empty-title">
              {searchQuery ? "No matching coupons found" : "No coupons created yet"}
            </h3>
            <p className="cpm-empty-subtitle">
              {searchQuery
                ? "Try searching for a different code or clear your filter."
                : "Create your first discount coupon to boost sales and reward customers."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className="cpm-create-btn"
                style={{ marginTop: "8px" }}
                onClick={handleOpenCreate}
              >
                + Create Coupon
              </button>
            )}
          </div>
        ) : (
          <div className="ao__table-wrap">
            <table className="ao__table">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Applicable Target</th>
                  <th>Discount</th>
                  <th>Min Order</th>
                  <th>Usage / Limit</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => {
                  const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
                  const catName = coupon.categories?.name || (categories.find(c => String(c.category_id || c.id) === String(coupon.category_id))?.name);
                  const subName = coupon.subcategories?.name;
                  return (
                    <tr key={coupon.id} className="ao__row">
                      {/* Code */}
                      <td className="ao__cell-id">
                        <div className="cpm-code-badge-wrap">
                          <span className="cpm-code-badge">
                            {coupon.code}
                            <button
                              type="button"
                              className="cpm-copy-btn"
                              title="Copy code"
                              onClick={() => handleCopy(coupon.code)}
                            >
                              {copiedCode === coupon.code ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                          </span>
                        </div>
                      </td>

                      {/* Applicable Target (Category / Subcategory) */}
                      <td className="ao__cell-items">
                        {subName ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="ao__badge cpm-cat-badge">
                              {subName}
                            </span>
                            {catName && (
                              <span style={{ fontSize: "12px", color: "#64748b" }}>
                                in {catName}
                              </span>
                            )}
                          </div>
                        ) : catName ? (
                          <span className="ao__badge cpm-cat-badge">
                            {catName}
                          </span>
                        ) : (
                          <span style={{ color: "#64748B", fontSize: "13.5px" }}>
                            All Categories
                          </span>
                        )}
                      </td>

                      {/* Discount Value */}
                      <td className="ao__cell-total">
                        <span className="cpm-discount-pill">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}% OFF`
                            : `₹${Number(coupon.discount_value).toLocaleString("en-IN")} OFF`}
                        </span>
                        {coupon.discount_type === "percentage" && coupon.max_discount_amount && (
                          <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 400, marginTop: "2px" }}>
                            Up to ₹{Number(coupon.max_discount_amount).toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>

                      {/* Min Order */}
                      <td className="ao__cell-items">
                        {coupon.min_order_amount && Number(coupon.min_order_amount) > 0
                          ? `₹${Number(coupon.min_order_amount).toLocaleString("en-IN")}`
                          : "No min"}
                      </td>

                      {/* Usage */}
                      <td className="ao__cell-items">
                        <span>
                          {coupon.used_count || 0}
                          {coupon.usage_limit ? ` / ${coupon.usage_limit}` : " used"}
                        </span>
                        {coupon.usage_limit && coupon.used_count >= coupon.usage_limit && (
                          <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px" }}>
                            Limit reached
                          </div>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="ao__cell-items">
                        {coupon.expiry_date ? (
                          <>
                            <div>
                              {new Date(coupon.expiry_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            {isExpired && (
                              <span className="ao__badge" style={{ backgroundColor: "#FEE2E2", color: "#DC2626", marginTop: "4px" }}>
                                Expired
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "#64748B" }}>
                            No expiry
                          </span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td>
                        <label className="cpm-switch-label">
                          <span className="cpm-switch">
                            <input
                              type="checkbox"
                              checked={coupon.is_active}
                              onChange={() => handleToggleStatus(coupon)}
                              disabled={isExpired}
                            />
                            <span className="cpm-slider"></span>
                          </span>
                          <span
                            className={`cpm-status-tag ${
                              isExpired
                                ? "cpm-status-tag--expired"
                                : coupon.is_active
                                ? "cpm-status-tag--active"
                                : "cpm-status-tag--inactive"
                            }`}
                          >
                            {isExpired ? "Expired" : coupon.is_active ? "Active" : "Inactive"}
                          </span>
                        </label>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="cpm-actions-cell" style={{ justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="ao__view-link"
                            title="Edit Coupon"
                            onClick={() => handleOpenEdit(coupon)}
                            style={{ marginRight: "4px" }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="cpm-action-btn cpm-action-btn--delete"
                            title="Delete Coupon"
                            onClick={() => setDeleteModalCoupon(coupon)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Coupon Modal ── */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingCoupon ? "Edit Coupon" : "Create New Coupon"}
        maxWidth={620}
        footer={
          <>
            <button
              type="button"
              className="cpm-btn-cancel"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="cpm-coupon-form"
              className="cpm-btn-submit admin-btn-with-spinner"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="admin-btn-spinner" /> Saving...
                </>
              ) : (
                editingCoupon ? "Save Changes" : "Create Coupon"
              )}
            </button>
          </>
        }
      >
        <form id="cpm-coupon-form" onSubmit={handleSubmitForm} className="cpm-form" style={{ padding: 0 }}>
          {formError && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "6px", fontSize: "12.5px" }}>
                  {formError}
                </div>
              )}

              {/* Row 1: Code & Category */}
              <div className="cpm-form-row">
                {/* Code */}
                <div className="cpm-field-group">
                  <label className="cpm-field-label">
                    <span>Coupon Code *</span>
                    <button
                      type="button"
                      className="cpm-gen-btn"
                      onClick={handleGenerateCode}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                        <line x1="4" y1="4" x2="9" y2="9" />
                      </svg>
                      Random
                    </button>
                  </label>
                  <input
                    type="text"
                    className="cpm-input cpm-input--code"
                    placeholder="CODE"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                      }))
                    }
                    required
                  />
                </div>

                {/* Category */}
                <div className="cpm-field-group">
                  <label className="cpm-field-label">
                    <span>Category</span>
                    <span className="cpm-field-label-sub">Optional</span>
                  </label>
                  <select
                    className="cpm-input cpm-select"
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category_id: e.target.value,
                        subcategory_id: "", // Reset subcategory when category changes
                      }))
                    }
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.category_id || c.id} value={c.category_id || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Subcategory */}
              <div className="cpm-field-group">
                <label className="cpm-field-label">
                  <span>Subcategory</span>
                  <span className="cpm-field-label-sub">Optional</span>
                </label>
                <select
                  className="cpm-input cpm-select"
                  value={formData.subcategory_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subcategory_id: e.target.value }))
                  }
                  disabled={
                    !formData.category_id ||
                    !categories.find((c) => String(c.category_id || c.id) === String(formData.category_id))?.subcategories?.length
                  }
                >
                  <option value="">
                    {!formData.category_id
                      ? "Select a category first"
                      : "All Subcategories in this category"}
                  </option>
                  {(
                    categories.find(
                      (c) => String(c.category_id || c.id) === String(formData.category_id)
                    )?.subcategories || []
                  ).map((sc) => (
                    <option key={sc.subcategory_id || sc.id} value={sc.subcategory_id || sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Discount Type & Value */}
              <div className="cpm-form-row">
                {/* Discount Type */}
                <div className="cpm-field-group">
                  <label className="cpm-field-label">Discount Type *</label>
                  <div className="cpm-type-toggle">
                    <button
                      type="button"
                      className={`cpm-type-btn ${
                        formData.discount_type === "percentage" ? "is-selected" : ""
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, discount_type: "percentage" }))
                      }
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      className={`cpm-type-btn ${
                        formData.discount_type === "fixed" ? "is-selected" : ""
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, discount_type: "fixed" }))
                      }
                    >
                      Fixed (₹)
                    </button>
                  </div>
                </div>

                {/* Discount Value */}
                <div className="cpm-field-group">
                  <label className="cpm-field-label">
                    {formData.discount_type === "percentage" ? "Percentage (%) *" : "Amount (₹) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    className="cpm-input"
                    placeholder={formData.discount_type === "percentage" ? "10" : "100"}
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, discount_value: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              {/* Row 4: Min Order & Max Discount (or Usage Limit if fixed) */}
              <div className="cpm-form-row">
                <div className="cpm-field-group">
                  <label className="cpm-field-label">
                    <span>Min Cart (₹)</span>
                    <span className="cpm-field-label-sub">Optional</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="cpm-input"
                    placeholder="0"
                    value={formData.min_order_amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, min_order_amount: e.target.value }))
                    }
                  />
                </div>

                {formData.discount_type === "percentage" ? (
                  <div className="cpm-field-group">
                    <label className="cpm-field-label">
                      <span>Max Cap (₹)</span>
                      <span className="cpm-field-label-sub">Optional</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="cpm-input"
                      placeholder="No cap"
                      value={formData.max_discount_amount}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, max_discount_amount: e.target.value }))
                      }
                    />
                  </div>
                ) : (
                  <div className="cpm-field-group">
                    <label className="cpm-field-label">
                      <span>Usage Limit</span>
                      <span className="cpm-field-label-sub">Optional</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="cpm-input"
                      placeholder="Unlimited"
                      value={formData.usage_limit}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, usage_limit: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* Row 5: Usage Limit (if percentage) & Expiry Date */}
              <div className="cpm-form-row">
                {formData.discount_type === "percentage" && (
                  <div className="cpm-field-group">
                    <label className="cpm-field-label">
                      <span>Usage Limit</span>
                      <span className="cpm-field-label-sub">Optional</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="cpm-input"
                      placeholder="Unlimited"
                      value={formData.usage_limit}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, usage_limit: e.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="cpm-field-group">
                  <label className="cpm-field-label">
                    <span>Expiry Date</span>
                    <span className="cpm-field-label-sub">Optional</span>
                  </label>
                  <input
                    type="date"
                    className="cpm-input"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="cpm-field-group" style={{ marginTop: "2px" }}>
                <label className="cpm-switch-label">
                  <span className="cpm-switch">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                      }
                    />
                    <span className="cpm-slider"></span>
                  </span>
                  <span style={{ fontSize: "12.5px", fontWeight: "500", color: "#334155" }}>
                    Enable coupon
                  </span>
                </label>
              </div>

        </form>
      </AdminModal>


      {/* ── Delete Confirmation Dialog ── */}
      <AdminModal
        isOpen={Boolean(deleteModalCoupon)}
        onClose={() => !isDeleting && setDeleteModalCoupon(null)}
        title="Delete Coupon?"
        maxWidth={400}
        footer={
          <>
            <button
              type="button"
              className="cpm-btn-cancel"
              onClick={() => setDeleteModalCoupon(null)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cpm-btn-submit admin-btn-with-spinner"
              style={{ background: "#dc2626" }}
              onClick={handleConfirmDelete}
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
          </>
        }
      >
        <p style={{ margin: "0", fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
          Are you sure you want to delete coupon <strong>{deleteModalCoupon?.code}</strong>? This action cannot be undone.
        </p>
      </AdminModal>
    </div>
  );
}
