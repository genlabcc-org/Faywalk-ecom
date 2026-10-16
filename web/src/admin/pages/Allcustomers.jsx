import React, { useState } from "react";
import AdminModal from "../components/AdminModal";
import "./Allcustomers.css";

const ROWS_PER_PAGE = 6;

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const formatOrdinalJoinedDate = (dateVal) => {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day}${suffix} ${month},${year}`;
};

/* ── Skeleton row ── */
const SkeletonCustomerRow = () => (
  <tr className="ac__row">
    <td className="ac__td-check"><div className="skeleton-shimmer" style={{ width: 18, height: 18, borderRadius: 4 }} /></td>
    <td className="ac__td-name">
      <div className="skeleton-shimmer" style={{ width: 120, height: 16, borderRadius: 4 }} />
    </td>
    <td className="ac__td-contact">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton-shimmer" style={{ width: 150, height: 13, borderRadius: 4 }} />
        <div className="skeleton-shimmer" style={{ width: 110, height: 13, borderRadius: 4 }} />
      </div>
    </td>
    <td className="ac__td-orders"><div className="skeleton-shimmer" style={{ width: 32, height: 16, borderRadius: 4 }} /></td>
    <td className="ac__td-spent"><div className="skeleton-shimmer" style={{ width: 70, height: 16, borderRadius: 4 }} /></td>
    <td className="ac__td-joined"><div className="skeleton-shimmer" style={{ width: 100, height: 16, borderRadius: 4 }} /></td>
    <td className="ac__td-action"><div className="skeleton-shimmer" style={{ width: 40, height: 18, borderRadius: 4 }} /></td>
  </tr>
);

/* ── Mobile Card ───────────────────────────────────────────────── */
const CustomerCard = ({ customer, selected, onToggle, onViewDetail, loading }) => {
  if (loading) {
    return (
      <div className="ac__mobile-card skeleton-shimmer" style={{ minHeight: 180, borderRadius: 12, marginBottom: 12 }} />
    );
  }

  return (
    <div className={`ac__mobile-card ${selected ? "ac__mobile-card--selected" : ""}`}>
      <div className="ac__mobile-top">
        <label className="ac__custom-checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(customer.id)}
          />
          <span className="ac__checkmark" />
        </label>
        <div className="ac__mobile-name">{customer.name || customer.email?.split("@")[0] || "Customer"}</div>
        <span className={`ac__mobile-badge ac__mobile-badge--${(customer.status || "Confirmed") === "Confirmed" ? "active" : "disabled"}`}>
          {customer.status || "Active"}
        </span>
      </div>

      <div className="ac__mobile-body">
        <div className="ac__mobile-row">
          <span className="ac__mobile-lbl">Contact</span>
          <div className="ac__mobile-val" style={{ textAlign: "right" }}>
            <div>{customer.email || "No email"}</div>
            <div style={{ color: "#64748B", fontSize: "12px", marginTop: "2px" }}>
              {customer.phone || customer.phone_number || customer.mobile || customer.phoneNumber || "—"}
            </div>
          </div>
        </div>
        <div className="ac__mobile-row">
          <span className="ac__mobile-lbl">Orders</span>
          <span className="ac__mobile-val font-semibold">{customer.orderCount ?? customer.orders ?? 0}</span>
        </div>
        <div className="ac__mobile-row">
          <span className="ac__mobile-lbl">Total Spent</span>
          <span className="ac__mobile-val font-semibold">₹{Number(customer.totalSpent ?? 0).toLocaleString("en-IN")}</span>
        </div>
        <div className="ac__mobile-row">
          <span className="ac__mobile-lbl">Joined</span>
          <span className="ac__mobile-val">{formatOrdinalJoinedDate(customer.joined || customer.created_at)}</span>
        </div>
      </div>

      <div className="ac__mobile-footer">
        <button className="ac__action-view" onClick={() => onViewDetail && onViewDetail(customer)}>
          View
        </button>
      </div>
    </div>
  );
};

/* ── Add Customer Modal ─────────────────────────────────────────── */
const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  orders: "",
  totalSpent: "",
  joined: "",
  status: "Confirmed",
};

const AddCustomerModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    return e;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      setIsSubmitting(true);
      await onAdd({
        id: Date.now(),
        name:       form.name.trim(),
        email:      form.email.trim(),
        phone:      form.phone.trim(),
        orders:     parseInt(form.orders, 10)     || 0,
        totalSpent: parseFloat(form.totalSpent)   || 0,
        joined:     form.joined.trim() || new Date().toISOString(),
        status:     form.status,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      isOpen={true}
      onClose={onClose}
      title="Add Customer"
      maxWidth={520}
      footer={
        <>
          <button className="ac__modal-cancel-btn" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button className="ac__modal-submit-btn admin-btn-with-spinner" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding Customer..." : "Add Customer"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="ac__modal-row">
          <div className="ac__field">
            <label className="ac__field-label">Full Name <span className="ac__required">*</span></label>
            <input
              className={`ac__field-input${errors.name ? " ac__field-input--error" : ""}`}
              placeholder="e.g. Ranganath"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
            {errors.name && <span className="ac__field-error">{errors.name}</span>}
          </div>
          <div className="ac__field">
            <label className="ac__field-label">Email <span className="ac__required">*</span></label>
            <input
              className={`ac__field-input${errors.email ? " ac__field-input--error" : ""}`}
              placeholder="e.g. priya.s@gmail.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
            {errors.email && <span className="ac__field-error">{errors.email}</span>}
          </div>
        </div>

        <div className="ac__modal-row">
          <div className="ac__field">
            <label className="ac__field-label">Phone <span className="ac__required">*</span></label>
            <input
              className={`ac__field-input${errors.phone ? " ac__field-input--error" : ""}`}
              placeholder="e.g. +91 98400 11111"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
            {errors.phone && <span className="ac__field-error">{errors.phone}</span>}
          </div>
          <div className="ac__field">
            <label className="ac__field-label">Status</label>
            <div className="ac__select-pill-wrapper" style={{ width: "100%" }}>
              <select
                className="ac__select-pill"
                style={{ width: "100%" }}
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Disabled">Disabled</option>
              </select>
              <ChevronDown />
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  );
};

/* ── Main Component ────────────────────────────────────────────── */
const AllCustomers = ({ customers = [], loading, onViewDetail }) => {
  const [selectedIds, setSelectedIds]   = useState([]);
  const [amountFilter, setAmountFilter] = useState("All Amounts");
  const [searchQuery, setSearchQuery]   = useState("");
  const [currentPage, setCurrentPage]   = useState(1);
  const [showModal, setShowModal]       = useState(false);
  const [localCustomers, setLocalCustomers] = useState([]);

  // Merge local added customers (if any) with database customers
  const allCustomers = [...customers, ...localCustomers];

  const handleAddCustomer = (newCustomer) => {
    setLocalCustomers((prev) => [...prev, newCustomer]);
  };

  /* Filtering */
  const filtered = allCustomers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || c.phone_number || c.mobile || "").includes(q);

    if (!matchSearch) return false;

    // Amount Filter (Total Spent)
    const spent = Number(c.totalSpent || 0);
    if (amountFilter === "High Spenders") {
      if (spent < 5000) return false;
    } else if (amountFilter === "1000-5000") {
      if (spent < 1000 || spent > 5000) return false;
    } else if (amountFilter === "Under-1000") {
      if (spent >= 1000 || spent <= 0) return false;
    } else if (amountFilter === "No-Orders") {
      if (spent > 0) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  /* Select logic */
  const allChecked = paginated.length > 0 && paginated.every((c) => selectedIds.includes(c.id));
  const toggleAll  = () => setSelectedIds(allChecked
    ? selectedIds.filter((id) => !paginated.find((c) => c.id === id))
    : [...new Set([...selectedIds, ...paginated.map((c) => c.id)])]);
  const toggleOne  = (id) => setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  /* Stats calculation */
  const totalCustomers = allCustomers.length;
  const now = new Date();
  const currentMonthYear = now.toLocaleDateString("en-US", { month: "short", year: "numeric" }); // e.g. "May 2026"
  
  const newThisMonth = allCustomers.filter((c) => {
    if (c.created_at) {
      const d = new Date(c.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return c.joined?.includes("2026");
  }).length;

  const activeAccounts = allCustomers.filter((c) => (c.status || "Confirmed") === "Confirmed").length;
  
  const totalOrdersCount = allCustomers.reduce((s, c) => s + (c.orderCount || c.orders || 0), 0);
  const totalSpentSum = allCustomers.reduce((s, c) => s + (Number(c.totalSpent) || 0), 0);
  const avgOrderValue = totalOrdersCount > 0
    ? Math.round(totalSpentSum / totalOrdersCount)
    : (totalCustomers > 0 ? Math.round(totalSpentSum / totalCustomers) : 0);

  /* Pagination numbers */
  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, "...", totalPages];
    if (safePage >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", safePage, "...", totalPages];
  };

  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: ROWS_PER_PAGE }).map((_, i) => <SkeletonCustomerRow key={i} />);
    }

    if (allCustomers.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="ac__empty-cell">
            <div className="ac__empty-state">
              <p className="ac__empty-title">No customers yet</p>
              <p className="ac__empty-sub">Registered customer accounts will appear here.</p>
            </div>
          </td>
        </tr>
      );
    }

    if (paginated.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="ac__empty-cell">
            <div className="ac__empty-state">
              <p className="ac__empty-title">No customers match filters</p>
              <p className="ac__empty-sub">Try adjusting your filters or search keywords.</p>
            </div>
          </td>
        </tr>
      );
    }

    return paginated.map((customer) => (
      <tr key={customer.id} className="ac__row">
        <td className="ac__td-check">
          <label className="ac__custom-checkbox">
            <input
              type="checkbox"
              checked={selectedIds.includes(customer.id)}
              onChange={() => toggleOne(customer.id)}
            />
            <span className="ac__checkmark" />
          </label>
        </td>
        <td className="ac__td-name">
          <span className="ac__customer-name">{customer.name || customer.email?.split("@")[0] || "Customer"}</span>
        </td>
        <td className="ac__td-contact">
          <div className="ac__contact-email">{customer.email || "No email"}</div>
          <div className="ac__contact-phone">
            {customer.phone || customer.phone_number || customer.mobile || customer.phoneNumber || "—"}
          </div>
        </td>
        <td className="ac__td-orders">
          <span className="ac__orders-count">{customer.orderCount ?? customer.orders ?? 0}</span>
        </td>
        <td className="ac__td-spent">
          <span className="ac__spent-amount">₹{Number(customer.totalSpent ?? 0).toLocaleString("en-IN")}</span>
        </td>
        <td className="ac__td-joined">
          <span className="ac__joined-date">{formatOrdinalJoinedDate(customer.joined || customer.created_at)}</span>
        </td>
        <td className="ac__td-action">
          <button className="ac__action-view" onClick={() => onViewDetail && onViewDetail(customer)}>
            View
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="ac">
      {/* ── Page Header ── */}
      <div className="ac__header-block">
        <h1 className="ac__page-title">All Customers</h1>
      </div>

      {/* ── 4 Stat Cards in Pastel Theme ── */}
      <div className="ac__stats-row">
        {/* Card 1: Total Customers (Pastel Mint Green) */}
        <div className="ac__stat-card ac__stat-card--green">
          <div className="ac__stat-label">Total Customers</div>
          <div className="ac__stat-value">{loading ? "—" : totalCustomers}</div>
          <div className="ac__stat-sub">All Time</div>
        </div>

        {/* Card 2: New this month (Pastel Butter Yellow) */}
        <div className="ac__stat-card ac__stat-card--yellow">
          <div className="ac__stat-label">New this month</div>
          <div className="ac__stat-value">{loading ? "—" : newThisMonth}</div>
          <div className="ac__stat-sub">{currentMonthYear}</div>
        </div>

        {/* Card 3: Active Accounts (Pastel Lilac Purple) */}
        <div className="ac__stat-card ac__stat-card--purple">
          <div className="ac__stat-label">Active Accounts</div>
          <div className="ac__stat-value">{loading ? "—" : activeAccounts}</div>
          <div className="ac__stat-sub">Enabled</div>
        </div>

        {/* Card 4: Avg. order value (Pastel Sky Blue) */}
        <div className="ac__stat-card ac__stat-card--blue">
          <div className="ac__stat-label">Avg. order value</div>
          <div className="ac__stat-value">₹{loading ? "—" : avgOrderValue.toLocaleString("en-IN")}</div>
          <div className="ac__stat-sub">Per customer</div>
        </div>
      </div>

      {/* ── Filter / Search Bar ── */}
      <div className="ac__toolbar-row">
        <div className="ac__toolbar-left">
          {/* Amount Filter Dropdown */}
          <div className="ac__select-pill-wrapper">
            <select
              className="ac__select-pill"
              value={amountFilter}
              onChange={(e) => { setAmountFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="All Amounts">All Amounts</option>
              <option value="High Spenders">High Spenders (₹5k+)</option>
              <option value="1000-5000">₹1,000 – ₹5,000</option>
              <option value="Under-1000">Under ₹1,000</option>
              <option value="No-Orders">No Orders (₹0)</option>
            </select>
            <ChevronDown />
          </div>
        </div>

        {/* Search Input on Right */}
        <div className="ac__toolbar-right">
          <div className="ac__search-box">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="ac__search-input"
              placeholder="Search name, email, contact..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* ── Table (Desktop & Tablet) ── */}
      <div className="ac__table-container">
        <table className="ac__table">
          <thead>
            <tr>
              <th className="ac__th-check">
                <label className="ac__custom-checkbox">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    disabled={loading || paginated.length === 0}
                  />
                  <span className="ac__checkmark" />
                </label>
              </th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Orders</th>
              <th>Total spent</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {renderTableBody()}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards (Phone View) ── */}
      <div className="ac__mobile-cards-list">
        {loading ? (
          Array.from({ length: ROWS_PER_PAGE }).map((_, i) => <CustomerCard key={i} loading={true} />)
        ) : (
          paginated.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              selected={selectedIds.includes(customer.id)}
              onToggle={toggleOne}
              onViewDetail={onViewDetail}
            />
          ))
        )}
      </div>

      {/* ── Pagination Footer ── */}
      {!loading && allCustomers.length > 0 && (
        <div className="ac__pagination-row">
          <span className="ac__showing-text">
            Showing {(safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} Customers
          </span>
          <div className="ac__pagination-controls">
            <button
              className="ac__page-arrow"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              aria-label="Previous page"
            >
              ‹
            </button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`ellip-${i}`} className="ac__page-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`ac__page-number${safePage === p ? " ac__page-number--active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="ac__page-arrow"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* ── Add Customer Modal ── */}
      {showModal && (
        <AddCustomerModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddCustomer}
        />
      )}
    </div>
  );
};

export default AllCustomers;