import React, { useState, useEffect, useMemo } from "react";
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

  // Default Pan-India Rate State
  const [defaultRate, setDefaultRate] = useState({
    id: null,
    fee: "0",
    free_above: "999",
    is_active: true,
  });
  const [savingDefault, setSavingDefault] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'active' | 'inactive'

  // Modal State for State-Specific Overrides
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

  // Fetch all rates from the database
  const fetchRates = async () => {
    setLoading(true);
    try {
      const data = await shippingService.getAllRates();
      const allRows = data || [];
      
      // Separate __default__ rate from state overrides
      const defRow = allRows.find((r) => r.state === "__default__");
      if (defRow) {
        setDefaultRate({
          id: defRow.id,
          fee: String(defRow.fee ?? 0),
          free_above: defRow.free_above != null ? String(defRow.free_above) : "",
          is_active: defRow.is_active !== false,
        });
      } else {
        setDefaultRate({
          id: null,
          fee: "0",
          free_above: "",
          is_active: true,
        });
      }

      // State overrides (exclude __default__)
      const stateRows = allRows.filter((r) => r.state !== "__default__");
      setRates(stateRows);
    } catch (err) {
      console.error("Failed to load shipping rates:", err);
      showToast("Failed to fetch shipping rates from database: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Save Default Pan-India Base Rate
  const handleSaveDefaultRate = async (e) => {
    e.preventDefault();
    setSavingDefault(true);
    try {
      await shippingService.upsertRate({
        state: "__default__",
        fee: defaultRate.fee,
        free_above: defaultRate.free_above,
        is_active: defaultRate.is_active,
      });
      showToast("Pan-India standard shipping rate saved successfully!");
      await fetchRates();
    } catch (err) {
      console.error("Failed to save default shipping rate:", err);
      showToast("Failed to save default rate: " + err.message, "error");
    } finally {
      setSavingDefault(false);
    }
  };

  // Toggle active status for state override
  const handleToggleStateActive = async (rate) => {
    try {
      const nextActive = !rate.is_active;
      // Optimistic update
      setRates((prev) =>
        prev.map((r) => (r.id === rate.id ? { ...r, is_active: nextActive } : r))
      );
      await shippingService.toggleActive(rate.id, nextActive);
      showToast(`Updated "${rate.state}" status to ${nextActive ? "Active" : "Inactive"}`);
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

  // Handle Form Submit (Add or Edit state override)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const stateName = formData.state.trim();
    if (!stateName) {
      setFormError("Please select or enter an Indian state name.");
      return;
    }

    if (stateName.toLowerCase() === "__default__") {
      setFormError("Use the Pan-India section above to configure the default rate.");
      return;
    }

    // Check duplicate state name when creating new
    if (!editingRate) {
      const exists = rates.some(
        (r) => r.state.toLowerCase() === stateName.toLowerCase()
      );
      if (exists) {
        setFormError(`A shipping rule for "${stateName}" already exists. Please edit it instead.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingRate) {
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

  // Handle Delete
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

  // Filtered state overrides
  const filteredRates = useMemo(() => {
    return rates.filter((r) => {
      // Tab filter
      if (activeTab === "active" && !r.is_active) return false;
      if (activeTab === "inactive" && r.is_active) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesState = r.state.toLowerCase().includes(q);
        const matchesFee = String(r.fee).includes(q);
        if (!matchesState && !matchesFee) return false;
      }

      return true;
    });
  }, [rates, activeTab, searchQuery]);

  // States already configured
  const configuredStatesMap = useMemo(() => {
    const map = new Set();
    rates.forEach((r) => map.add(r.state.toLowerCase()));
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
            Configure Pan-India default charges, free delivery thresholds, and state-specific overrides.
          </p>
        </div>
        <div className="sh__header-actions">
          <button className="sh__btn-refresh" onClick={fetchRates} disabled={loading} title="Reload rates">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <button className="sh__btn-primary" onClick={handleOpenCreateModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add State Rate
          </button>
        </div>
      </div>

      {/* Overview Metric Stats */}
      <div className="sh__metrics-grid">
        <div className="sh__metric-card">
          <div className="sh__metric-icon sh__metric-icon--base">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div className="sh__metric-body">
            <span className="sh__metric-label">Pan-India Standard Fee</span>
            <span className="sh__metric-val">₹{defaultRate.fee || 0}</span>
            <span className="sh__metric-sub">
              {defaultRate.free_above ? `Free above ₹${defaultRate.free_above}` : "No free threshold"}
            </span>
          </div>
        </div>

        <div className="sh__metric-card">
          <div className="sh__metric-icon sh__metric-icon--overrides">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="sh__metric-body">
            <span className="sh__metric-label">State-Specific Overrides</span>
            <span className="sh__metric-val">{rates.length}</span>
            <span className="sh__metric-sub">
              {rates.filter((r) => r.is_active).length} currently active
            </span>
          </div>
        </div>

        <div className="sh__metric-card">
          <div className="sh__metric-icon sh__metric-icon--active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="sh__metric-body">
            <span className="sh__metric-label">Rule Status</span>
            <span className="sh__metric-val">{defaultRate.is_active ? "Active" : "Disabled"}</span>
            <span className="sh__metric-sub">Live in checkout & API</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Pan-India Standard Base Rate */}
      <div className="sh__card">
        <div className="sh__card-head">
          <div>
            <div className="sh__card-section-title">Pan-India Baseline Shipping Rate</div>
            <p className="sh__card-section-desc">
              This default rule applies automatically across all of India unless a custom state rule overrides it below.
            </p>
          </div>
          <span className={`sh__badge ${defaultRate.is_active ? "sh__badge--active" : "sh__badge--inactive"}`}>
            {defaultRate.is_active ? "Active" : "Disabled"}
          </span>
        </div>

        <div className="sh__divider" />

        <form onSubmit={handleSaveDefaultRate} className="sh__default-form">
          <div className="sh__field-row">
            <div className="sh__field-info">
              <span className="sh__field-label">Standard Delivery Charge</span>
              <span className="sh__field-desc">Default shipping fee charged for all checkout orders</span>
            </div>
            <div className="sh__input-group">
              <span className="sh__currency">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                className="sh__input"
                placeholder="0"
                value={defaultRate.fee}
                onChange={(e) => setDefaultRate((prev) => ({ ...prev, fee: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="sh__divider" />

          <div className="sh__field-row">
            <div className="sh__field-info">
              <span className="sh__field-label">Free Delivery Threshold</span>
              <span className="sh__field-desc">Cart subtotal amount above which shipping fee becomes ₹0 (leave blank for none)</span>
            </div>
            <div className="sh__input-group">
              <span className="sh__currency">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                className="sh__input"
                placeholder="e.g. 999"
                value={defaultRate.free_above}
                onChange={(e) => setDefaultRate((prev) => ({ ...prev, free_above: e.target.value }))}
              />
            </div>
          </div>

          <div className="sh__divider" />

          <div className="sh__toggle-row">
            <div className="sh__field-info">
              <span className="sh__field-label">Enable Default Delivery Fee</span>
              <span className="sh__field-desc">When disabled, customers default to free shipping unless a state override matches</span>
            </div>
            <label className="sh__toggle">
              <input
                type="checkbox"
                checked={defaultRate.is_active}
                onChange={(e) => setDefaultRate((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              <span className="sh__toggle-track">
                <span className="sh__toggle-thumb" />
              </span>
            </label>
          </div>

          <div className="sh__divider" />

          <div className="sh__default-footer">
            <span className="sh__tip-text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Saves to <code>shipping_rates</code> as standard <code>__default__</code> fallback rule.
            </span>
            <button type="submit" className="sh__btn-save admin-btn-with-spinner" disabled={savingDefault}>
              {savingDefault ? (
                <>
                  <span className="admin-btn-spinner" /> Saving...
                </>
              ) : (
                "Save Default Rate"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: State-Specific Overrides Table */}
      <div className="sh__card">
        <div className="sh__card-head">
          <div>
            <div className="sh__card-section-title">State-Specific Delivery Overrides</div>
            <p className="sh__card-section-desc">
              Override rates for specific states (e.g. local free delivery in Tamil Nadu, or higher rates for remote regions).
            </p>
          </div>
          <button className="sh__btn-secondary" onClick={handleOpenCreateModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add State Rate
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="sh__toolbar">
          <div className="sh__search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by state name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="sh__search-clear" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>

          <div className="sh__tabs">
            <button
              className={`sh__tab ${activeTab === "all" ? "sh__tab--active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All ({rates.length})
            </button>
            <button
              className={`sh__tab ${activeTab === "active" ? "sh__tab--active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              Active ({rates.filter((r) => r.is_active).length})
            </button>
            <button
              className={`sh__tab ${activeTab === "inactive" ? "sh__tab--active" : ""}`}
              onClick={() => setActiveTab("inactive")}
            >
              Inactive ({rates.filter((r) => !r.is_active).length})
            </button>
          </div>
        </div>

        {/* Table / Empty State */}
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
              {searchQuery ? "No matching state rates found" : "No state overrides configured yet"}
            </h3>
            <p className="sh__empty-desc">
              {searchQuery
                ? `No results matching "${searchQuery}". Clear your search or add a new rate.`
                : "All states currently use the Pan-India Baseline rate. You can create custom rates for specific states anytime."}
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
                  <th>State / Territory</th>
                  <th>Delivery Fee</th>
                  <th>Free Shipping Above</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="sh__state-cell">
                        <span className="sh__state-name">{r.state}</span>
                      </div>
                    </td>
                    <td>
                      <span className="sh__fee-pill">
                        {Number(r.fee) === 0 ? "Free (₹0)" : `₹${Number(r.fee).toLocaleString("en-IN")}`}
                      </span>
                    </td>
                    <td>
                      {r.free_above != null ? (
                        <span className="sh__free-pill">
                          Orders &ge; ₹{Number(r.free_above).toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="sh__text-muted">None</span>
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
                          className="sh__action-btn sh__action-btn--edit"
                          title="Edit Rate"
                          onClick={() => handleOpenEditModal(r)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          className="sh__action-btn sh__action-btn--delete"
                          title="Delete Rate"
                          onClick={() => setDeleteModalRate(r)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit State Rate */}
      {isModalOpen && (
        <div className="sh__modal-backdrop" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="sh__modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sh__modal-header">
              <h2 className="sh__modal-title">
                {editingRate ? `Edit Rate for ${editingRate.state}` : "Add State Shipping Rate"}
              </h2>
              <button
                className="sh__modal-close"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
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
                    State / Territory <span className="sh__required">*</span>
                  </label>
                  {editingRate ? (
                    <input
                      type="text"
                      className="sh__input sh__input--full"
                      value={formData.state}
                      disabled
                    />
                  ) : (
                    <>
                      <select
                        className="sh__input sh__input--full"
                        value={formData.state}
                        onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                        required
                      >
                        <option value="">-- Select an Indian State / UT --</option>
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
                        <option value="__custom__">+ Enter Custom Name...</option>
                      </select>

                      {formData.state === "__custom__" && (
                        <input
                          type="text"
                          className="sh__input sh__input--full"
                          placeholder="Type state name..."
                          style={{ marginTop: "8px" }}
                          onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                          autoFocus
                          required
                        />
                      )}
                    </>
                  )}
                  <span className="sh__field-desc">
                    Rate will be matched against the customer's delivery address at checkout.
                  </span>
                </div>

                {/* Shipping Fee */}
                <div className="sh__form-group">
                  <label className="sh__form-label">
                    Shipping Fee (₹) <span className="sh__required">*</span>
                  </label>
                  <div className="sh__input-group sh__input-group--full">
                    <span className="sh__currency">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="sh__input sh__input--full"
                      placeholder="0 (e.g. 40 for standard delivery)"
                      value={formData.fee}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fee: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Free Above */}
                <div className="sh__form-group">
                  <label className="sh__form-label">
                    Free Delivery Threshold (₹) <span className="sh__optional">(Optional)</span>
                  </label>
                  <div className="sh__input-group sh__input-group--full">
                    <span className="sh__currency">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="sh__input sh__input--full"
                      placeholder="Leave blank for no free shipping threshold"
                      value={formData.free_above}
                      onChange={(e) => setFormData((prev) => ({ ...prev, free_above: e.target.value }))}
                    />
                  </div>
                  <span className="sh__field-desc">
                    If cart subtotal is &ge; this value, shipping fee will automatically be ₹0.
                  </span>
                </div>

                {/* Active Toggle */}
                <div className="sh__toggle-row" style={{ padding: "8px 0" }}>
                  <div className="sh__field-info">
                    <span className="sh__field-label">Rule Active</span>
                    <span className="sh__field-desc">Toggle whether this state rate is immediately live</span>
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
                    editingRate ? "Update Rate" : "Save State Rate"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalRate && (
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
                Once deleted, orders from {deleteModalRate.state} will fallback to the Pan-India baseline rate.
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
        </div>
      )}
    </div>
  );
}