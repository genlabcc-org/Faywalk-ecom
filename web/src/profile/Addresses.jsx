import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../services/orderService";
import { useStore } from "../hooks/useStore";
import ProfileLayout from "./ProfileLayout";
import "./Addresses.css";


const STATES = [
  "Gujarat",
  "Tamil Nadu",
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Telangana",
  "West Bengal",
  "Rajasthan",
  "Uttar Pradesh",
  "Kerala",
  "Andhra Pradesh",
  "Punjab",
  "Haryana",
];

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
    state: "Gujarat",
    isDefault: false,
  });

  const [editingAddressId, setEditingAddressId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  const handleScrollToAdd = () => {
    setEditingAddressId(null);
    setForm({
      name: user?.user_metadata?.name || "",
      email: user?.email || "",
      mobile: user?.user_metadata?.phone || "",
      flat: "",
      area: "",
      city: "",
      pinCode: "",
      state: "Gujarat",
      isDefault: addresses.length === 0,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 250);
  };

  const handleEditClick = (addr) => {
    setEditingAddressId(addr.address_id);
    setForm({
      name: addr.full_name || "",
      email: user?.email || "",
      mobile: addr.phone_number || "",
      flat: addr.address_line1 || "",
      area: addr.address_line2 || "",
      city: addr.city || "",
      pinCode: addr.postal_code || "",
      state: addr.state || "Gujarat",
      isDefault: Boolean(addr.is_default),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 250);
  };

  const handleCancelEdit = () => {
    setEditingAddressId(null);
    setForm({
      name: user?.user_metadata?.name || "",
      email: user?.email || "",
      mobile: user?.user_metadata?.phone || "",
      flat: "",
      area: "",
      city: "",
      pinCode: "",
      state: "Gujarat",
      isDefault: false,
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      alert("Please enter a name.");
      return;
    }
    if (!form.flat.trim() || !form.city.trim() || !form.pinCode.trim()) {
      alert("Please fill in address, city and pin code.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (form.isDefault) {
        await orderService.resetAddressDefaults(user.id);
      }

      if (editingAddressId) {
        await orderService.updateAddress(editingAddressId, {
          full_name: form.name,
          phone_number: form.mobile,
          address_line1: form.flat,
          address_line2: form.area,
          city: form.city,
          state: form.state,
          postal_code: form.pinCode,
          is_default: form.isDefault,
        });
      } else {
        await orderService.createAddress({
          user_id: user.id,
          full_name: form.name,
          phone_number: form.mobile,
          address_line1: form.flat,
          address_line2: form.area,
          city: form.city,
          state: form.state,
          postal_code: form.pinCode,
          is_default: form.isDefault,
        });
      }

      await fetchAddresses(user.id, { force: true });
      setEditingAddressId(null);
      setForm({
        name: "",
        email: user?.email || "",
        mobile: "",
        flat: "",
        area: "",
        city: "",
        pinCode: "",
        state: "Gujarat",
        isDefault: false,
      });
    } catch (err) {
      alert("Failed to save address: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      await orderService.deleteAddress(id, user.id);
      await fetchAddresses(user.id, { force: true });
      if (editingAddressId === id) {
        handleCancelEdit();
      }
    } catch (err) {
      alert("Failed to delete address: " + err.message);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await orderService.setAddressDefault(id, user.id);
      await fetchAddresses(user.id, { force: true });
    } catch (err) {
      alert("Failed to update default address: " + err.message);
    }
  };

  return (
    <ProfileLayout>
      {/* ── SAVED ADDRESSES HEADER ── */}
      <div className="addr-header-row">
        <h2 className="addr-section-title">Saved Addresses</h2>
        <button
          type="button"
          className="addr-top-add-btn"
          onClick={handleScrollToAdd}
        >
          Add
        </button>
      </div>

      {/* ── SAVED ADDRESSES GRID ── */}
      {addresses.length === 0 ? (
        <div className="addr-empty-state">
          No addresses saved yet. Click "Add" to save your delivery address.
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
                  <span className="addr-saved-name">{addr.full_name}</span>
                  <span className="addr-saved-addr">
                    {addr.address_line1}
                    {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                    <br />
                    {addr.city}, {addr.state} - {addr.postal_code}
                  </span>
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

      {/* ── ADD A NEW ADDRESS FORM CARD ── */}
      <div className="addr-form-card" ref={formRef}>
        <h3 className="addr-form-title">
          {editingAddressId ? "Edit address" : "Add a new address"}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="addr-field">
            <label className="addr-label">Name</label>
            <input
              ref={nameInputRef}
              className="addr-input"
              placeholder="Krishnil Bhojani"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
            />
          </div>

          <div className="addr-field">
            <label className="addr-label">Email Address</label>
            <input
              className="addr-input"
              type="email"
              placeholder="krishnil@omegaorion.com"
              value={form.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
            />
          </div>

          <div className="addr-field">
            <label className="addr-label">Mobile Number</label>
            <input
              className="addr-input"
              type="tel"
              placeholder="(+91) 8758211686"
              value={form.mobile}
              onChange={(e) => handleFormChange("mobile", e.target.value)}
            />
          </div>

          <div className="addr-field">
            <label className="addr-label">
              Flat, House no., Building, Company, Apartment
            </label>
            <input
              className="addr-input"
              placeholder="A-01 Sun Pharma Road, Ahmedabad, Gujarat-390023"
              value={form.flat}
              onChange={(e) => handleFormChange("flat", e.target.value)}
            />
          </div>

          <div className="addr-field">
            <label className="addr-label">
              Area, Colony, Street, Sector, Village
            </label>
            <input
              className="addr-input"
              placeholder="Sun Pharma Road"
              value={form.area}
              onChange={(e) => handleFormChange("area", e.target.value)}
            />
          </div>

          <div className="addr-field">
            <label className="addr-label">City</label>
            <input
              className="addr-input"
              placeholder="Ahmedabad"
              value={form.city}
              onChange={(e) => handleFormChange("city", e.target.value)}
            />
          </div>

          <div className="addr-field">
            <label className="addr-label">Pin Code</label>
            <input
              className="addr-input"
              placeholder="390021"
              value={form.pinCode}
              onChange={(e) => handleFormChange("pinCode", e.target.value)}
            />
          </div>

          <div className="addr-field">
            <label className="addr-label">State</label>
            <div className="addr-select-wrap">
              <select
                className="addr-select"
                value={form.state}
                onChange={(e) => handleFormChange("state", e.target.value)}
              >
                {STATES.map((s) => (
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
            {editingAddressId && (
              <button
                type="button"
                className="addr-cancel-btn"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </ProfileLayout>
  );
}
