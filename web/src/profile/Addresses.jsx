import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../services/orderService";
import { useStore } from "../hooks/useStore";
import ProfileLayout from "./ProfileLayout";
import "./Addresses.css";


import { INDIAN_STATES } from "../services/shippingService";

export default function Addresses() {
  const navigate = useNavigate();

  const user = useStore((s) => s.user);
  const sessionLoading = useStore((s) => s.sessionLoading);

  const addresses = useStore((s) => s.addresses);
  const loadingAddresses = useStore((s) => s.loadingAddresses);
  const fetchAddresses = useStore((s) => s.fetchAddresses);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    flat: "",
    area: "",
    city: "",
    pinCode: "",
    state: "",
    isDefault: false,
  });

  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", type: "" });
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message: "", type: "" });
    setTimeout(() => setToast({ message, type }), 10);
    setTimeout(() => setToast({ message: "", type: "" }), 4000);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ── Load user + addresses on mount ──
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      navigate("/account/login");
      return;
    }
    fetchAddresses(user.id);
  }, [user, sessionLoading]);

  // Pre-fill user email/name when available if form is empty
  useEffect(() => {
    if (user && !form.email && !form.name && !editingAddressId) {
      setForm((prev) => ({
        ...prev,
        email: user.email || "",
        name: user.user_metadata?.name || "",
        mobile: user.user_metadata?.phone || "",
      }));
    }
  }, [user]);

  const handleOpenAddForm = () => {
    setEditingAddressId(null);
    setErrors({});
    setForm({
      name: user?.user_metadata?.name || "",
      email: user?.email || "",
      mobile: user?.user_metadata?.phone || "",
      flat: "",
      area: "",
      city: "",
      pinCode: "",
      state: "",
      isDefault: addresses.length === 0,
    });
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus();
    }, 100);
  };

  const handleEditClick = (addr) => {
    setEditingAddressId(addr.address_id);
    setErrors({});
    setForm({
      name: addr.full_name || "",
      email: user?.email || "",
      mobile: addr.phone_number || "",
      flat: addr.address_line1 || "",
      area: addr.address_line2 || "",
      city: addr.city || "",
      pinCode: addr.postal_code || "",
      state: addr.state || "",
      isDefault: Boolean(addr.is_default),
    });
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus();
    }, 100);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAddressId(null);
    setErrors({});
    setForm({
      name: user?.user_metadata?.name || "",
      email: user?.email || "",
      mobile: user?.user_metadata?.phone || "",
      flat: "",
      area: "",
      city: "",
      pinCode: "",
      state: "",
      isDefault: false,
    });
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) {
      errs.name = "Full name is required";
    }

    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = "Please enter a valid email address";
    }

    const cleanPhone = String(form.mobile || "").trim();
    if (!cleanPhone) {
      errs.mobile = "Mobile number is required";
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.mobile = "Must be a 10-digit Indian mobile starting with 9, 8, 7, or 6";
    }

    if (!form.flat.trim()) {
      errs.flat = "House / Flat number and street are required";
    }

    if (!form.city.trim()) {
      errs.city = "City is required";
    }

    const cleanPin = String(form.pinCode || "").trim();
    if (!cleanPin) {
      errs.pinCode = "PIN code is required";
    } else if (!/^\d{6}$/.test(cleanPin)) {
      errs.pinCode = "PIN code must be exactly 6 digits";
    }

    if (!form.state || !form.state.trim()) {
      errs.state = "Please select a state";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Please fix the errors below", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (form.isDefault) {
        await orderService.resetAddressDefaults(user.id);
      }

      if (editingAddressId) {
        await orderService.updateAddress(editingAddressId, {
          full_name: form.name.trim(),
          phone_number: form.mobile.trim(),
          address_line1: form.flat.trim(),
          address_line2: form.area.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postal_code: form.pinCode.trim(),
          is_default: form.isDefault,
        });
        showToast("Address updated successfully!", "success");
      } else {
        await orderService.createAddress({
          user_id: user.id,
          full_name: form.name.trim(),
          phone_number: form.mobile.trim(),
          address_line1: form.flat.trim(),
          address_line2: form.area.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postal_code: form.pinCode.trim(),
          is_default: form.isDefault,
        });
        showToast("New address added successfully!", "success");
      }

      await fetchAddresses(user.id, { force: true });
      setShowForm(false);
      setEditingAddressId(null);
      setErrors({});
      setForm({
        name: "",
        email: user?.email || "",
        mobile: "",
        flat: "",
        area: "",
        city: "",
        pinCode: "",
        state: "",
        isDefault: false,
      });
    } catch (err) {
      showToast("Failed to save address: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      await orderService.deleteAddress(id, user.id);
      await fetchAddresses(user.id, { force: true });
      showToast("Address deleted successfully", "info");
      if (editingAddressId === id) {
        handleCancelForm();
      }
    } catch (err) {
      showToast("Failed to delete address: " + err.message, "error");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await orderService.setAddressDefault(id, user.id);
      await fetchAddresses(user.id, { force: true });
      showToast("Default address updated", "success");
    } catch (err) {
      showToast("Failed to update default address: " + err.message, "error");
    }
  };

  return (
    <ProfileLayout>
      {/* ── TOAST NOTIFICATION ── */}
      {toast.message && (
        <div className={`addr-toast addr-toast--${toast.type}`}>
          <span>{toast.message}</span>
          <button
            type="button"
            className="addr-toast-close"
            onClick={() => setToast({ message: "", type: "" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── SAVED ADDRESSES HEADER ── */}
      <div className="addr-header-row">
        <h2 className="addr-section-title">Saved Addresses</h2>
        <button
          type="button"
          className="addr-top-add-btn"
          onClick={() => {
            if (showForm && !editingAddressId) {
              handleCancelForm();
            } else {
              handleOpenAddForm();
            }
          }}
        >
          {showForm && !editingAddressId ? "Cancel" : "Add"}
        </button>
      </div>

      {/* ── SAVED ADDRESSES GRID ── */}
      {addresses.length === 0 ? (
        <div className="addr-empty-state">
          <p className="addr-empty-text">
            No addresses saved yet. Click "Add" to save your delivery address.
          </p>
          {!showForm && (
            <button
              type="button"
              className="addr-empty-add-btn"
              onClick={handleOpenAddForm}
            >
              + Add Address
            </button>
          )}
        </div>
      ) : (
        <div className="addr-saved-grid">
          {addresses.map((addr) => (
            <div
              key={addr.address_id}
              className={`addr-saved-card${addr.is_default ? " addr-saved-card--default" : ""}`}
            >
              <div className="addr-saved-card-top">
                <button
                  type="button"
                  className={`addr-custom-checkbox${addr.is_default ? " addr-custom-checkbox--checked" : ""}`}
                  onClick={() => handleSetDefault(addr.address_id)}
                  title={addr.is_default ? "Default address" : "Set as default"}
                  aria-label={addr.is_default ? "Default address" : "Set as default"}
                >
                  {addr.is_default && (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <div className="addr-saved-info">
                  <div className="addr-saved-header-row">
                    <span className="addr-saved-name">{addr.full_name}</span>
                    <div className="addr-saved-badges">
                      {addr.address_type && (
                        <span className="addr-badge addr-badge--type">
                          {addr.address_type.toUpperCase()}
                        </span>
                      )}
                      {addr.is_default && (
                        <span className="addr-badge addr-badge--default">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="addr-saved-addr">
                    <div className="addr-line">{addr.address_line1}</div>
                    {addr.address_line2 && (
                      <div className="addr-line addr-line--sub">{addr.address_line2}</div>
                    )}
                    <div className="addr-line addr-line--city-state">
                      {[addr.city, addr.state].filter(Boolean).join(", ")}
                      {addr.postal_code ? ` - ${addr.postal_code}` : ""}
                    </div>
                    {addr.country && (
                      <div className="addr-line addr-line--country">{addr.country}</div>
                    )}
                  </div>

                  {addr.phone_number && (
                    <div className="addr-saved-phone">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span><strong>Mobile:</strong> {addr.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="addr-saved-actions">
                <button
                  type="button"
                  className="addr-edit-btn"
                  onClick={() => handleEditClick(addr)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                <button
                  type="button"
                  className="addr-delete-btn"
                  onClick={() => handleDelete(addr.address_id)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ADD / EDIT ADDRESS FORM CARD ── */}
      {showForm && (
        <div className="addr-form-card" ref={formRef}>
          <div className="addr-form-header">
            <h3 className="addr-form-title">
              {editingAddressId ? "Edit address" : "Add a new address"}
            </h3>
            <button
              type="button"
              className="addr-form-close-btn"
              onClick={handleCancelForm}
              aria-label="Close form"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="addr-field">
              <label className="addr-label">Name *</label>
              <input
                ref={nameInputRef}
                className={`addr-input ${errors.name ? "addr-input--error" : ""}`}
                placeholder="Enter full name"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
              {errors.name && <span className="addr-error-msg">{errors.name}</span>}
            </div>

            <div className="addr-field">
              <label className="addr-label">Email Address</label>
              <input
                className={`addr-input ${errors.email ? "addr-input--error" : ""}`}
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
              />
              {errors.email && <span className="addr-error-msg">{errors.email}</span>}
            </div>

            <div className="addr-field">
              <label className="addr-label">Mobile Number *</label>
              <input
                className={`addr-input ${errors.mobile ? "addr-input--error" : ""}`}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number (e.g. 9876543210)"
                value={form.mobile}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleFormChange("mobile", cleaned);
                }}
              />
              {errors.mobile && <span className="addr-error-msg">{errors.mobile}</span>}
            </div>

            <div className="addr-field">
              <label className="addr-label">
                Flat, House no., Building, Company, Apartment *
              </label>
              <input
                className={`addr-input ${errors.flat ? "addr-input--error" : ""}`}
                placeholder="House / Flat no., building name, street"
                value={form.flat}
                onChange={(e) => handleFormChange("flat", e.target.value)}
              />
              {errors.flat && <span className="addr-error-msg">{errors.flat}</span>}
            </div>

            <div className="addr-field">
              <label className="addr-label">
                Area, Colony, Street, Sector, Village (Optional)
              </label>
              <input
                className="addr-input"
                placeholder="Area, landmark, colony"
                value={form.area}
                onChange={(e) => handleFormChange("area", e.target.value)}
              />
            </div>

            <div className="addr-field">
              <label className="addr-label">City *</label>
              <input
                className={`addr-input ${errors.city ? "addr-input--error" : ""}`}
                placeholder="City / District"
                value={form.city}
                onChange={(e) => handleFormChange("city", e.target.value)}
              />
              {errors.city && <span className="addr-error-msg">{errors.city}</span>}
            </div>

            <div className="addr-field">
              <label className="addr-label">Pin Code *</label>
              <input
                className={`addr-input ${errors.pinCode ? "addr-input--error" : ""}`}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit PIN code"
                value={form.pinCode}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                  handleFormChange("pinCode", cleaned);
                }}
              />
              {errors.pinCode && <span className="addr-error-msg">{errors.pinCode}</span>}
            </div>

            <div className="addr-field">
              <label className="addr-label">State *</label>
              <div className="addr-select-wrap">
                <select
                  className={`addr-select ${errors.state ? "addr-input--error" : ""}`}
                  value={form.state}
                  onChange={(e) => handleFormChange("state", e.target.value)}
                >
                  <option value="" disabled>
                    Select state
                  </option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <svg
                  className="addr-select-chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {errors.state && <span className="addr-error-msg">{errors.state}</span>}
            </div>

            <div
              className="addr-checkbox-row"
              onClick={() => handleFormChange("isDefault", !form.isDefault)}
            >
              <button
                type="button"
                className={`addr-custom-checkbox${form.isDefault ? " addr-custom-checkbox--checked" : ""}`}
                aria-label="Use as my default address"
              >
                {form.isDefault && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <span className="addr-check-label">
                Use as my default address
              </span>
            </div>

            <div className="addr-form-actions">
              <button
                type="submit"
                className="addr-add-btn"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingAddressId
                    ? "Update Address"
                    : "Add New Address"}
              </button>
              <button
                type="button"
                className="addr-cancel-btn"
                onClick={handleCancelForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </ProfileLayout>
  );
}
