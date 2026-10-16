import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { shippingService, INDIAN_STATES } from "../../services/shippingService";
import "./Shipping.css";

const EMPTY_RATE_FORM = {
  state: "",
  fee: "",
  free_above: "",
  is_active: true,
};

export default function Shipping() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { message, type }

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'active' | 'inactive'

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [formData, setFormData] = useState(EMPTY_RATE_FORM);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalRate, setDeleteModalRate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all rates from the database and keep Default Rate as pinned first entry
  const fetchRates = async () => {
    setLoading(true);
    try {
      const data = await shippingService.getAllRates();
      const allRows = data || [];
      
      const defRow = allRows.find((r) => r.state === "__default__");
      const defaultItem = defRow
        ? {
            id: defRow.id,
            state: "__default__",
            fee: defRow.fee ?? 0,
            free_above: defRow.free_above,
            is_active: defRow.is_active !== false,
            isDefault: true,
          }
        : {
            id: "__default__",
            state: "__default__",
            fee: 0,
            free_above: 999,
            is_active: true,
            isDefault: true,
          };

      const stateRows = allRows
        .filter((r) => r.state !== "__default__")
        .map((r) => ({ ...r, isDefault: false }));

      setRates([defaultItem, ...stateRows]);
    } catch (err) {
      console.error("Failed to load shipping rates:", err);
      showToast("Failed to fetch shipping rates: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Toggle active status for any rate (default or state)
  const handleToggleStateActive = async (rate) => {
    try {
      const nextActive = !rate.is_active;
      // Optimistic update
      setRates((prev) =>
        prev.map((r) => (r.state === rate.state ? { ...r, is_active: nextActive } : r))
      );

      if (rate.state === "__default__") {
        await shippingService.upsertRate({
          state: "__default__",
          fee: rate.fee,
          free_above: rate.free_above,
          is_active: nextActive,
        });
        showToast(`Default shipping rate ${nextActive ? "activated" : "deactivated"}`);
      } else {
        await shippingService.toggleActive(rate.id, nextActive);
        showToast(`Updated "${rate.state}" status to ${nextActive ? "Active" : "Inactive"}`);
      }
    } catch (err) {
      console.error("Failed to toggle rate status:", err);
      showToast("Failed to toggle status: " + err.message, "error");
      fetchRates();
    }
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingRate(null);
    setFormData(EMPTY_RATE_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (rate) => {
    setEditingRate(rate);
    setFormData({
      state: rate.state,
      fee: String(rate.fee ?? 0),
      free_above: rate.free_above != null ? String(rate.free_above) : "",
      is_active: rate.is_active !== false,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Handle Form Submit (Add State Rate or Edit Rate)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const isDefault = editingRate?.state === "__default__";
    const stateName = isDefault ? "__default__" : formData.state.trim();

    if (!isDefault && !stateName) {
      setFormError("Please select or enter an Indian state name.");
      return;
    }

    // Check duplicate state name when creating new
    if (!editingRate) {
      const exists = rates.some(
        (r) => !r.isDefault && r.state.toLowerCase() === stateName.toLowerCase()
      );
      if (exists) {
        setFormError(`A shipping rule for "${stateName}" already exists. Please edit it instead.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isDefault) {
        await shippingService.upsertRate({
          state: "__default__",
          fee: formData.fee,
          free_above: formData.free_above,
          is_active: formData.is_active,
        });
        showToast("Default shipping rate updated successfully!");
      } else if (editingRate) {
        await shippingService.updateRate(editingRate.id, formData);
        showToast(`Shipping rate for "${stateName}" updated!`);
      } else {
        await shippingService.upsertRate(formData);
        showToast(`New shipping rate for "${stateName}" added!`);
      }
      setIsModalOpen(false);
      await fetchRates();
    } catch (err) {
      console.error("Failed to save shipping rate:", err);
      setFormError(err.message || "Failed to save rate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete (Only for state overrides)
  const handleConfirmDelete = async () => {
    if (!deleteModalRate) return;
    setIsDeleting(true);
    try {
      await shippingService.deleteRate(deleteModalRate.id);
      showToast(`Shipping rate for "${deleteModalRate.state}" deleted successfully!`);
      setDeleteModalRate(null);
      await fetchRates();
    } catch (err) {
      console.error("Failed to delete shipping rate:", err);
      showToast("Failed to delete rate: " + err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered rates list
  const filteredRates = useMemo(() => {
    return rates.filter((r) => {
      // Tab filter
      if (activeTab === "active" && !r.is_active) return false;
      if (activeTab === "inactive" && r.is_active) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const displayName = (r.isDefault || r.state === "__default__")
          ? "default all india pan-india baseline"
          : r.state.toLowerCase();
        const matchesState = displayName.includes(q);
        const matchesFee = String(r.fee).includes(q);
        if (!matchesState && !matchesFee) return false;
      }

      return true;
    });
  }, [rates, activeTab, searchQuery]);

  // States already configured
  const configuredStatesMap = useMemo(() => {
    const map = new Set();
    rates.filter((r) => !r.isDefault && r.state !== "__default__").forEach((r) => map.add(r.state.toLowerCase()));
    return map;
  }, [rates]);

  return (
    <div className="sh">
      {/* Toast Notification */}
      {toast && (
        <div className={`sh__toast sh__toast--${toast.type}`}>
          <div className="sh__toast-icon">
            {toast.type === "error" ? "✕" : "✓"}
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="sh__page-header">
        <div className="sh__header-left">
          <h1 className="sh__page-title">Shipping & Delivery Rates</h1>
          <p className="sh__page-subtitle">
            Manage delivery fees and free shipping thresholds for All India and specific states.
          </p>
        </div>
        <div className="sh__header-actions">
          <button className="sh__btn-primary" onClick={handleOpenCreateModal}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add State Rate
          </button>
        </div>
      </div>

      {/* UNIFIED RATES CARD & TABLE */}
      <div className="sh__card">
        {/* Filter & Search Bar */}
        <div className="sh__toolbar">
          <div className="sh__search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by state or fee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="sh__search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="sh__tabs">
            <button
              type="button"
              className={`sh__tab ${activeTab === "all" ? "sh__tab--active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All ({rates.length})
            </button>
            <button
              type="button"
              className={`sh__tab ${activeTab === "active" ? "sh__tab--active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              Active ({rates.filter((r) => r.is_active).length})
            </button>
            <button
              type="button"
              className={`sh__tab ${activeTab === "inactive" ? "sh__tab--active" : ""}`}
              onClick={() => setActiveTab("inactive")}
            >
              Inactive ({rates.filter((r) => !r.is_active).length})
            </button>
          </div>
        </div>

        {/* Rates Table */}
        {loading ? (
          <div className="sh__loading-state">
            <div className="sh__spinner" />
            <p>Loading shipping rates from database...</p>
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="sh__empty-state">
            <div className="sh__empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 className="sh__empty-title">
              {searchQuery ? "No matching shipping rates found" : "No shipping rates configured yet"}
            </h3>
            <p className="sh__empty-desc">
              {searchQuery
                ? `No results matching "${searchQuery}". Clear your search or add a new rate.`
                : "You can add custom delivery rates for Indian states anytime."}
            </p>
            <button className="sh__btn-primary" onClick={handleOpenCreateModal}>
              + Add State Rate
            </button>
          </div>
        ) : (
          <div className="sh__table-wrap">
            <table className="sh__table">
              <thead>
                <tr>
                  <th>Region / Scope</th>
                  <th>Delivery Fee</th>
                  <th>Free Shipping Above</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.map((r) => {
                  const isDef = r.isDefault || r.state === "__default__";
                  return (
                    <tr key={r.id || r.state} className={isDef ? "sh__row--default" : ""}>
                      <td>
                        <div className="sh__state-cell">
                          {isDef ? (
                            <div className="sh__default-cell-content">
                              <div className="sh__default-title-row">
                                <span className="sh__state-name">Default Rate (All India)</span>
                                <span className="sh__badge-default">Base Rate</span>
                              </div>
                              <span className="sh__state-desc">Fallback applied to all states with no custom rate</span>
                            </div>
                          ) : (
                            <span className="sh__state-name">{r.state}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="sh__fee-pill">
                          {Number(r.fee) === 0 ? "Free (₹0)" : `₹${Number(r.fee).toLocaleString("en-IN")}`}
                        </span>
                      </td>
                      <td>
                        {r.free_above != null && r.free_above !== "" ? (
                          <span className="sh__free-pill">
                            Orders &ge; ₹{Number(r.free_above).toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="sh__text-muted">None (Always charged)</span>
                        )}
                      </td>
                      <td>
                        <div className="sh__status-toggle-wrap">
                          <label className="sh__toggle sh__toggle--sm">
                            <input
                              type="checkbox"
                              checked={r.is_active}
                              onChange={() => handleToggleStateActive(r)}
                            />
                            <span className="sh__toggle-track">
                              <span className="sh__toggle-thumb" />
                            </span>
                          </label>
                          <span className={`sh__badge ${r.is_active ? "sh__badge--active" : "sh__badge--inactive"}`}>
                            {r.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="sh__actions">
                          <button
                            type="button"
                            className="sh__action-btn sh__action-btn--edit"
                            title="Edit Rate"
                            onClick={() => handleOpenEditModal(r)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          {!isDef && (
                            <button
                              type="button"
                              className="sh__action-btn sh__action-btn--delete"
                              title="Delete Rate"
                              onClick={() => setDeleteModalRate(r)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete
                            </button>
                          )}
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

      {/* MODAL: Add / Edit Rate (Mounted to document.body in dead center) */}
      {isModalOpen && typeof document !== "undefined" && createPortal(
        <div className="sh__modal-backdrop" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="sh__modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sh__modal-header">
              <h2 className="sh__modal-title">
                {editingRate
                  ? editingRate.state === "__default__"
                    ? "Edit Default Shipping Rate"
                    : `Edit Rate: ${editingRate.state}`
                  : "Add State Shipping Rate"}
              </h2>
              <button
                type="button"
                className="sh__modal-close"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="sh__modal-body">
                {formError && (
                  <div className="sh__alert sh__alert--error">
                    <span>{formError}</span>
                  </div>
                )}

                {/* State Name Field */}
                <div className="sh__form-group">
                  <label className="sh__form-label">
                    State / Region <span className="sh__required">*</span>
                  </label>
                  {editingRate ? (
                    <>
                      <input
                        type="text"
                        className="sh__input sh__input--full"
                        value={editingRate.state === "__default__" ? "Default Rate (All India Baseline)" : formData.state}
                        disabled
                      />
                      {editingRate.state === "__default__" && (
                        <span className="sh__field-hint">
                          This base rule is applied to orders across India when no state override matches.
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <select
                        className="sh__input sh__input--full"
                        value={formData.state}
                        onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                        required
                      >
                        <option value="">Select an Indian State...</option>
                        {INDIAN_STATES.map((st) => {
                          const isConfigured = configuredStatesMap.has(st.toLowerCase());
                          return (
                            <option
                              key={st}
                              value={st}
                              disabled={isConfigured}
                            >
                              {st} {isConfigured ? "(Already added)" : ""}
                            </option>
                          );
                        })}
                        <option value="__custom__">+ Enter Custom State / Region...</option>
                      </select>

                      {formData.state === "__custom__" && (
                        <input
                          type="text"
                          className="sh__input sh__input--full"
                          placeholder="Type state or region name..."
                          style={{ marginTop: "8px" }}
                          onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                          autoFocus
                          required
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Delivery Fee & Free Delivery Threshold in a 2-column layout */}
                <div className="sh__form-row-2">
                  <div className="sh__form-group">
                    <label className="sh__form-label">
                      Delivery Fee (₹) <span className="sh__required">*</span>
                    </label>
                    <div className="sh__input-group sh__input-group--full">
                      <span className="sh__currency">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="sh__input sh__input--full"
                        placeholder="0"
                        value={formData.fee}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fee: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="sh__form-group">
                    <label className="sh__form-label">
                      Free Above (₹) <span className="sh__optional">(Optional)</span>
                    </label>
                    <div className="sh__input-group sh__input-group--full">
                      <span className="sh__currency">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="sh__input sh__input--full"
                        placeholder="e.g. 999"
                        value={formData.free_above}
                        onChange={(e) => setFormData((prev) => ({ ...prev, free_above: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="sh__modal-toggle-row">
                  <div>
                    <span className="sh__field-label">Enable Rule</span>
                    <span className="sh__field-desc">Apply this rate on storefront checkout</span>
                  </div>
                  <label className="sh__toggle">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span className="sh__toggle-track">
                      <span className="sh__toggle-thumb" />
                    </span>
                  </label>
                </div>
              </div>

              <div className="sh__modal-footer">
                <button
                  type="button"
                  className="sh__btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="sh__btn-save admin-btn-with-spinner" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="admin-btn-spinner" /> Saving...
                    </>
                  ) : (
                    editingRate
                      ? editingRate.state === "__default__"
                        ? "Save Default Rate"
                        : "Update Rate"
                      : "Save State Rate"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalRate && typeof document !== "undefined" && createPortal(
        <div className="sh__modal-backdrop" onClick={() => !isDeleting && setDeleteModalRate(null)}>
          <div className="sh__modal-dialog sh__modal-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="sh__modal-header">
              <h2 className="sh__modal-title">Delete Shipping Rate</h2>
              <button
                className="sh__modal-close"
                onClick={() => !isDeleting && setDeleteModalRate(null)}
              >
                ✕
              </button>
            </div>
            <div className="sh__modal-body">
              <p style={{ margin: "0 0 12px", color: "#374151", fontSize: "14px", lineHeight: "1.5" }}>
                Are you sure you want to delete the shipping rate rule for{" "}
                <strong>"{deleteModalRate.state}"</strong>?
              </p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
                Once deleted, orders from {deleteModalRate.state} will fallback to the All India default baseline rate.
              </p>
            </div>
            <div className="sh__modal-footer">
              <button
                type="button"
                className="sh__btn-cancel"
                onClick={() => setDeleteModalRate(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sh__btn-danger admin-btn-with-spinner"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="admin-btn-spinner" /> Deleting...
                  </>
                ) : (
                  "Delete Rule"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}