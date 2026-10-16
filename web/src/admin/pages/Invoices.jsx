import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import ThermalInvoice from "../components/ThermalInvoice";
import { orderService } from "../../services/orderService";
import "./Invoices.css";

/* ── Status & Payment Style Mappings (identical to Allorders) ── */
const STATUS_STYLE = {
  "Order Placed": { bg: "#E0F2FE", color: "#0284C7" },
  Pending: { bg: "#FCE7F3", color: "#DB2777" },
  Shipped: { bg: "#FEF3C7", color: "#D97706" },
  Delivered: { bg: "#DCFCE7", color: "#16A34A" },
  Confirmed: { bg: "#E0F2FE", color: "#0284C7" },
  Return: { bg: "#FEE2E2", color: "#EF4444" },
  Returned: { bg: "#FEE2E2", color: "#EF4444" },
  Cancelled: { bg: "#FEE2E2", color: "#DC2626" },
};

const PAYMENT_STYLE = {
  Paid: { bg: "#F0FDF4", color: "#16A34A" },
  COD: { bg: "#FFF4E5", color: "#D97706" },
};

const PRINT_STATUSES = ["All Invoices", "Pending to Print", "Printed"];
const ORDER_STATUSES = [
  "All Status",
  "Order Placed",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
];
const PAYMENT_OPTIONS = ["All Payment", "Paid", "COD"];
const PER_PAGE = 8;

/* ── Icons ── */
const ChevronDownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PrinterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const EmptyBoxIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
    </path>
  </svg>
);

/* ── Skeleton row ── */
const SkeletonRow = () => (
  <tr className="inv__skeleton-row">
    <td><div className="inv__skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 85 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 110 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 140 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 75 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 65 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 55, borderRadius: 20 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 80, borderRadius: 20 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 85, borderRadius: 20 }} /></td>
    <td><div className="inv__skeleton" style={{ width: 100 }} /></td>
  </tr>
);

/* ── Dropdown Component ── */
const FilterDropdown = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div className="inv__dd" ref={dropdownRef}>
      <button className="inv__dd-btn" type="button" onClick={() => setOpen((o) => !o)}>
        <span>{value}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="inv__dd-menu">
          {options.map((opt) => (
            <div
              key={opt}
              className={`inv__dd-item${value === opt ? " inv__dd-item--active" : ""}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Customer Name Helper ── */
const getCustomerDisplayName = (order) => {
  const raw =
    order?.shipping_address?.full_name ||
    order?.shipping_address?.name ||
    order?.customer?.name;
  if (!raw) return "—";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    lower === "unknown customer" ||
    lower === "no name set" ||
    lower === "unknown" ||
    (order?.customer?.email &&
      lower === order.customer.email.split("@")[0].toLowerCase())
  ) {
    return "—";
  }
  return trimmed;
};

// Play audio chime on new orders
const playOrderChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.debug("Audio chime skipped:", e);
  }
};

/* ── Main Invoices Component ── */
const Invoices = ({ orders = [], loading = false }) => {
  const [localOrders, setLocalOrders] = useState(orders);
  const [printStatusFilter, setPrintStatusFilter] = useState("All Invoices");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All Status");
  const [paymentFilter, setPaymentFilter] = useState("All Payment");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);

  const [printBatch, setPrintBatch] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toast, setToast] = useState(null);
  const [autoPrint, setAutoPrint] = useState(() => {
    return localStorage.getItem("anika_auto_print") !== "false";
  });
  const [previewOrder, setPreviewOrder] = useState(null);
  const [previewAddress, setPreviewAddress] = useState(null);
  const [previewLoadingAddress, setPreviewLoadingAddress] = useState(false);
  const [printAddresses, setPrintAddresses] = useState({});

  const toastTimerRef = useRef(null);

  const showToast = (message, type = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Sync local orders when props change
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Realtime Supabase order subscription
  useEffect(() => {
    const channel = supabase
      .channel("invoices-realtime-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const newOrder = payload.new;
          if (!newOrder) return;

          const enrichedOrder = {
            ...newOrder,
            customer: {
              id: newOrder.user_id,
              name: newOrder.customer_name || "Customer",
              phone: newOrder.customer_phone || newOrder.phone || "",
            },
          };

          if (newOrder.user_id) {
            try {
              const { data: profile } = await supabase
                .from("users")
                .select("*")
                .eq("id", newOrder.user_id)
                .single();
              if (profile) {
                enrichedOrder.customer = {
                  id: newOrder.user_id,
                  name: profile.name || profile.full_name || enrichedOrder.customer.name,
                  phone: profile.phone || profile.phone_number || profile.mobile || enrichedOrder.customer.phone,
                  email: profile.email || "",
                };
              }
            } catch (e) {
              console.debug("Could not enrich profile for new order:", e);
            }
          }

          setLocalOrders((prev) => {
            if (prev.some((o) => o.id === enrichedOrder.id)) return prev;
            return [enrichedOrder, ...prev];
          });

          if (autoPrint && !enrichedOrder.invoice_printed) {
            playOrderChime();
            const orderShortId = String(enrichedOrder.id).slice(-8).toUpperCase();
            showToast(`🔔 New Order #${orderShortId} generated! Printing invoice...`, "info");
            setTimeout(() => {
              triggerPrintBatch([enrichedOrder]);
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoPrint]);

  // Open Preview Modal
  const handleOpenPreview = async (order) => {
    if (!order) return;
    const existingAddr = order.shipping_address || order.address || null;
    setPreviewOrder(order);
    setPreviewAddress(existingAddr);
    if (order.user_id) {
      try {
        setPreviewLoadingAddress(true);
        const addresses = await orderService.getAddresses(order.user_id);
        const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
        if (defaultAddr) {
          setPreviewAddress(defaultAddr);
        }
      } catch (e) {
        console.debug("Could not fetch address for preview:", e);
      } finally {
        setPreviewLoadingAddress(false);
      }
    }
  };

  // Toggle Auto-Print setting
  const handleToggleAutoPrint = () => {
    setAutoPrint((prev) => {
      const next = !prev;
      localStorage.setItem("anika_auto_print", String(next));
      showToast(
        next
          ? "🟢 Auto-Print turned ON — invoices will print immediately on new orders!"
          : "⚪ Auto-Print paused — use 'Print All Pending' to print manually.",
        next ? "success" : "info"
      );
      return next;
    });
  };

  // Manually toggle an invoice's printed status (Printed <-> Unprinted)
  const handleTogglePrintedStatus = async (order) => {
    if (!order || !order.id) return;
    const newStatus = !order.invoice_printed;
    const orderShortId = String(order.id).slice(-8).toUpperCase();
    try {
      await orderService.updateInvoicePrintedStatus(order.id, newStatus);
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, invoice_printed: newStatus } : o))
      );
      setPreviewOrder((prev) =>
        prev && prev.id === order.id ? { ...prev, invoice_printed: newStatus } : prev
      );
      showToast(
        newStatus
          ? `✅ Order #${orderShortId} marked as Printed!`
          : `↩️ Order #${orderShortId} marked as Unprinted!`,
        "success"
      );
    } catch (e) {
      console.error("Failed to update printed status:", e);
      showToast("Error updating printed status: " + e.message, "error");
    }
  };

  // Reusable batch print trigger
  const triggerPrintBatch = async (ordersToPrint) => {
    if (!ordersToPrint || ordersToPrint.length === 0 || isPrinting) return;
    try {
      setIsPrinting(true);

      const addrMap = { ...printAddresses };
      if (previewOrder && previewAddress) {
        addrMap[previewOrder.id] = previewAddress;
      }
      const missingAddrOrders = ordersToPrint.filter((ord) => !addrMap[ord.id] && ord.user_id);
      if (missingAddrOrders.length > 0) {
        await Promise.all(
          missingAddrOrders.map(async (ord) => {
            try {
              const addrs = await orderService.getAddresses(ord.user_id);
              addrMap[ord.id] = addrs.find((a) => a.is_default) || addrs[0] || null;
            } catch (e) {
              console.debug("Could not fetch address for print:", e);
            }
          })
        );
      }
      setPrintAddresses(addrMap);
      setPrintBatch(ordersToPrint);

      // Allow DOM to fully render thermal components
      await new Promise((res) => setTimeout(res, 500));
      window.print();

      const ids = ordersToPrint.map((o) => o.id);
      try {
        await orderService.markInvoicesBulkPrinted(ids);
        setLocalOrders((prev) =>
          prev.map((o) => (ids.includes(o.id) ? { ...o, invoice_printed: true } : o))
        );
        setPreviewOrder((prev) =>
          prev && ids.includes(prev.id) ? { ...prev, invoice_printed: true } : prev
        );
        showToast(
          `🖨️ Sent ${ids.length} invoice${ids.length > 1 ? "s" : ""} to thermal printer!`,
          "success"
        );
      } catch (err) {
        console.error("Failed marking bulk printed:", err);
      }
    } catch (err) {
      console.error("Print batch error:", err);
      showToast("Failed to print invoice: " + err.message, "error");
    } finally {
      setIsPrinting(false);
      setPrintBatch([]);
    }
  };

  // Print All Pending
  const handlePrintAllPending = () => {
    const unprinted = localOrders.filter((o) => !o.invoice_printed);
    if (unprinted.length === 0) {
      showToast("All orders are already printed!", "info");
      return;
    }
    triggerPrintBatch(unprinted);
  };

  // Print Selected
  const handlePrintSelected = () => {
    const selectedOrders = localOrders.filter((o) => selected.includes(o.id));
    if (selectedOrders.length === 0) return;
    triggerPrintBatch(selectedOrders);
  };

  /* ── Stats Calculations ── */
  const unprintedCount = localOrders.filter((o) => !o.invoice_printed).length;
  const printedCount = localOrders.filter((o) => o.invoice_printed).length;
  const totalRevenue = localOrders.reduce(
    (acc, o) => acc + Number(o.total_price || 0),
    0
  );

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    return localOrders.filter((order) => {
      // Print status filter
      if (printStatusFilter === "Pending to Print" && order.invoice_printed) return false;
      if (printStatusFilter === "Printed" && !order.invoice_printed) return false;

      // Order status filter
      if (orderStatusFilter !== "All Status") {
        if (orderStatusFilter.toLowerCase() === "returned") {
          const s = order.status?.toLowerCase();
          if (s !== "return" && s !== "returned") return false;
        } else if (order.status?.toLowerCase() !== orderStatusFilter.toLowerCase()) {
          return false;
        }
      }

      // Payment filter
      if (paymentFilter !== "All Payment") {
        if (order.payment?.toUpperCase() !== paymentFilter.toUpperCase()) return false;
      }

      // Search
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const orderIdStr = order.id ? String(order.id).toLowerCase() : "";
        const custName = getCustomerDisplayName(order).toLowerCase();
        const custPhone = order.customer?.phone ? String(order.customer.phone).toLowerCase() : "";
        const directPhone = order.phone ? String(order.phone).toLowerCase() : "";
        const itemName = (order.item_name || "").toLowerCase();

        const match =
          orderIdStr.includes(s) ||
          custName.includes(s) ||
          custPhone.includes(s) ||
          directPhone.includes(s) ||
          itemName.includes(s);

        if (!match) return false;
      }

      return true;
    });
  }, [localOrders, printStatusFilter, orderStatusFilter, paymentFilter, search]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const pageNums = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const p = safePage;
    if (p <= 3) return [1, 2, 3, "…", totalPages];
    if (p >= totalPages - 2) return [1, "…", totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", p, "…", totalPages];
  };

  /* ── Selection ── */
  const toggleRow = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allChecked =
    paginated.length > 0 && paginated.every((o) => selected.includes(o.id));

  const toggleAll = () => {
    setSelected(
      allChecked
        ? selected.filter((id) => !paginated.find((o) => o.id === id))
        : [...new Set([...selected, ...paginated.map((o) => o.id)])]
    );
  };

  const hasActiveFilters =
    printStatusFilter !== "All Invoices" ||
    orderStatusFilter !== "All Status" ||
    paymentFilter !== "All Payment" ||
    search !== "";

  const handleResetFilters = () => {
    setPrintStatusFilter("All Invoices");
    setOrderStatusFilter("All Status");
    setPaymentFilter("All Payment");
    setSearch("");
    setPage(1);
  };

  /* ── Render Table Rows ── */
  const renderTableRows = () => {
    if (loading) {
      return Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonRow key={i} />);
    }

    if (localOrders.length === 0) {
      return (
        <tr>
          <td colSpan={10} className="inv__empty">
            <div className="inv__empty-state">
              <div className="inv__empty-icon">
                <EmptyBoxIcon />
              </div>
              <p className="inv__empty-title">No invoices yet</p>
              <p className="inv__empty-desc">
                Orders and invoices will appear here once customers place orders.
              </p>
            </div>
          </td>
        </tr>
      );
    }

    if (paginated.length === 0) {
      return (
        <tr>
          <td colSpan={10} className="inv__empty">
            <div className="inv__empty-state">
              <p className="inv__empty-title">No invoices match your filters</p>
              <p className="inv__empty-desc">Try clearing or adjusting search and filters.</p>
            </div>
          </td>
        </tr>
      );
    }

    return paginated.map((order) => {
      const isPrinted = Boolean(order.invoice_printed);
      const isSel = selected.includes(order.id);
      const orderShortId = order.id
        ? "#" + String(order.id).slice(-6).toUpperCase()
        : "#—";

      const orderDate = order.order_date
        ? new Date(order.order_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

      const ss = STATUS_STYLE[order.status] || { bg: "#FFF4E5", color: "#D97706" };
      const ps = PAYMENT_STYLE[order.payment] || { bg: "#FFF4E5", color: "#D97706" };

      // Product items summary
      const items = order.order_items || [];
      const itemNames = items
        .map((i) => i.product_name || i.name || "Product")
        .filter(Boolean);
      const itemsSummary =
        itemNames.length > 0
          ? itemNames.length > 1
            ? `${itemNames[0]} +${itemNames.length - 1} more`
            : itemNames[0]
          : order.item_name || "—";

      return (
        <tr
          key={order.id}
          className={`inv__row${isSel ? " inv__row--selected" : ""}`}
        >
          <td className="inv__td-check">
            <input
              type="checkbox"
              className="inv__checkbox"
              checked={isSel}
              onChange={() => toggleRow(order.id)}
            />
          </td>

          <td className="inv__cell-id">
            <button
              type="button"
              className="inv__cell-id-link"
              onClick={() => handleOpenPreview(order)}
              title="Click to preview receipt"
            >
              {orderShortId}
            </button>
          </td>

          <td>
            <span className="inv__customer-name">
              {getCustomerDisplayName(order)}
            </span>
            {order.customer?.phone && (
              <span className="inv__customer-phone">{order.customer.phone}</span>
            )}
          </td>

          <td className="inv__cell-items" title={itemNames.join(", ") || itemsSummary}>
            {itemsSummary}
          </td>

          <td className="inv__cell-date">{orderDate}</td>

          <td className="inv__cell-total">
            ₹{Number(order.total_price || 0).toLocaleString("en-IN")}
          </td>

          <td>
            <span className="inv__badge" style={{ backgroundColor: ps.bg, color: ps.color }}>
              {order.payment || "COD"}
            </span>
          </td>

          <td>
            <span className="inv__badge" style={{ backgroundColor: ss.bg, color: ss.color }}>
              {order.status || "Pending"}
            </span>
          </td>

          <td>
            <button
              type="button"
              className={`inv__print-status-btn ${
                isPrinted
                  ? "inv__print-status-btn--printed"
                  : "inv__print-status-btn--unprinted"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePrintedStatus(order);
              }}
              title={isPrinted ? "Click to mark as Unprinted" : "Click to mark as Printed"}
            >
              {isPrinted ? "✓ Printed" : "○ Pending"}
            </button>
          </td>

          <td>
            <div className="inv__actions">
              <button
                type="button"
                className="inv__action-link"
                onClick={() => handleOpenPreview(order)}
              >
                Preview
              </button>
              <button
                type="button"
                className="inv__row-print-btn"
                onClick={() => triggerPrintBatch([order])}
                disabled={isPrinting}
                title="Print thermal receipt"
              >
                <PrinterIcon />
                <span>{isPrinted ? "Reprint" : "Print"}</span>
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  /* ── Render Mobile Cards (< 768px) ── */
  const renderMobileCards = () => {
    if (loading) {
      return (
        <div className="inv__cards-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="inv__card">
              <div className="inv__skeleton" style={{ width: 100, height: 18 }} />
              <div className="inv__skeleton" style={{ width: 140, height: 14, marginTop: 12 }} />
            </div>
          ))}
        </div>
      );
    }

    if (paginated.length === 0) {
      return (
        <div className="inv__empty">
          <p className="inv__empty-title">No invoices found</p>
          <p className="inv__empty-desc">Try clearing your filters or search.</p>
        </div>
      );
    }

    return (
      <>
        <div className="inv__mobile-select-bar">
          <label className="inv__mobile-select-label">
            <input
              type="checkbox"
              className="inv__checkbox"
              checked={allChecked}
              onChange={toggleAll}
              disabled={loading || paginated.length === 0}
            />
            <span>Select Page ({paginated.length})</span>
          </label>
          {selected.length > 0 && (
            <span className="inv__mobile-selected-badge">{selected.length} selected</span>
          )}
        </div>

        <div className="inv__cards-list">
          {paginated.map((order) => {
            const isPrinted = Boolean(order.invoice_printed);
            const isSel = selected.includes(order.id);
            const ss = STATUS_STYLE[order.status] || { bg: "#FFF4E5", color: "#D97706" };
            const ps = PAYMENT_STYLE[order.payment] || { bg: "#FFF4E5", color: "#D97706" };

            return (
              <div key={order.id} className={`inv__card${isSel ? " inv__card--selected" : ""}`}>
                <div className="inv__card-header">
                  <div className="inv__card-header-left">
                    <input
                      type="checkbox"
                      className="inv__checkbox"
                      checked={isSel}
                      onChange={() => toggleRow(order.id)}
                    />
                    <span className="inv__card-id">
                      #{order.id ? String(order.id).slice(-6).toUpperCase() : "—"}
                    </span>
                  </div>
                  <div className="inv__card-badges">
                    <button
                      type="button"
                      className={`inv__print-status-btn ${
                        isPrinted
                          ? "inv__print-status-btn--printed"
                          : "inv__print-status-btn--unprinted"
                      }`}
                      onClick={() => handleTogglePrintedStatus(order)}
                    >
                      {isPrinted ? "✓ Printed" : "○ Pending"}
                    </button>
                    <span className="inv__badge" style={{ backgroundColor: ss.bg, color: ss.color }}>
                      {order.status || "Pending"}
                    </span>
                  </div>
                </div>

                <div className="inv__card-body">
                  <span className="inv__card-customer-name">
                    {getCustomerDisplayName(order)}
                  </span>
                  <span className="inv__card-items-text">
                    {order.item_name || "Order items"}
                  </span>
                </div>

                <div className="inv__card-footer">
                  <div className="inv__card-footer-left">
                    <span className="inv__badge" style={{ backgroundColor: ps.bg, color: ps.color }}>
                      {order.payment || "COD"}
                    </span>
                    <span className="inv__card-total">
                      ₹{Number(order.total_price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="inv__actions">
                    <button
                      type="button"
                      className="inv__action-link"
                      onClick={() => handleOpenPreview(order)}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className="inv__row-print-btn"
                      onClick={() => triggerPrintBatch([order])}
                      disabled={isPrinting}
                    >
                      <PrinterIcon />
                      <span>{isPrinted ? "Reprint" : "Print"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="inv">
      {/* Toast Notification */}
      {toast && (
        <div className={`inv__toast inv__toast--${toast.type}`}>
          <span className="inv__toast-icon">
            {toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "🔔"}
          </span>
          <span className="inv__toast-msg">{toast.message}</span>
          <button className="inv__toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="inv__page-header">
        <div className="inv__page-title-block">
          <h1 className="inv__title">Invoices & Receipts</h1>
          <p className="inv__subtitle">
            {loading ? "Loading…" : `${filtered.length} Invoices Available`}
          </p>
        </div>

        <div className="inv__header-actions">
          {/* Auto-Print Toggle */}
          <button
            type="button"
            className={`inv__auto-toggle ${autoPrint ? "inv__auto-toggle--active" : ""}`}
            onClick={handleToggleAutoPrint}
            title={autoPrint ? "Click to pause auto-printing" : "Click to enable auto-printing"}
          >
            <span className={`inv__pulse-dot ${autoPrint ? "inv__pulse-dot--active" : ""}`} />
            Auto-Print: {autoPrint ? "ON" : "OFF"}
          </button>

          {/* Selected Batch Print */}
          {selected.length > 0 && (
            <button
              type="button"
              className="inv__batch-print-btn"
              onClick={handlePrintSelected}
              disabled={isPrinting}
            >
              <PrinterIcon />
              <span>Print Selected</span>
              <span className="inv__btn-badge">{selected.length}</span>
            </button>
          )}

          {/* Master Print All Pending */}
          <button
            type="button"
            className="inv__master-print-btn"
            onClick={handlePrintAllPending}
            disabled={unprintedCount === 0 || isPrinting}
          >
            {isPrinting ? (
              <>
                <SpinnerIcon />
                <span>Printing...</span>
              </>
            ) : (
              <>
                <PrinterIcon />
                <span>Print All Pending</span>
                {unprintedCount > 0 && (
                  <span className="inv__btn-badge">{unprintedCount}</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 4 Pastel Stat Cards (Matching All Orders Style) ── */}
      <div className="inv__kpi-cards">
        {/* Total Orders */}
        <div className="inv__kpi-card inv__kpi-card--green">
          <div className="inv__kpi-card-header">
            <span className="inv__kpi-card-title">Total Orders</span>
            <div className="inv__kpi-card-time">
              <span>All time</span>
              <ChevronDownIcon />
            </div>
          </div>
          <div className="inv__kpi-card-val">
            {loading ? "—" : localOrders.length.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Pending to Print */}
        <div className="inv__kpi-card inv__kpi-card--yellow">
          <div className="inv__kpi-card-header">
            <span className="inv__kpi-card-title">Pending to Print</span>
            <div className="inv__kpi-card-time">
              <span>Needs print</span>
              <ChevronDownIcon />
            </div>
          </div>
          <div className="inv__kpi-card-val">
            {loading ? "—" : unprintedCount.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Already Printed */}
        <div className="inv__kpi-card inv__kpi-card--purple">
          <div className="inv__kpi-card-header">
            <span className="inv__kpi-card-title">Already Printed</span>
            <div className="inv__kpi-card-time">
              <span>Completed</span>
              <ChevronDownIcon />
            </div>
          </div>
          <div className="inv__kpi-card-val">
            {loading ? "—" : printedCount.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Total Invoiced Value */}
        <div className="inv__kpi-card inv__kpi-card--blue">
          <div className="inv__kpi-card-header">
            <span className="inv__kpi-card-title">Total Invoiced</span>
            <div className="inv__kpi-card-time">
              <span>Revenue</span>
              <ChevronDownIcon />
            </div>
          </div>
          <div className="inv__kpi-card-val">
            {loading ? "—" : `₹${totalRevenue.toLocaleString("en-IN")}`}
          </div>
        </div>
      </div>

      {/* ── Quick Filter Pills Row (All / Pending / Printed) ── */}
      <div className="inv__status-row">
        {[
          {
            label: "All Invoices",
            filterVal: "All Invoices",
            val: localOrders.length,
            dot: "#0A2582",
            color: "#0A2582",
            bg: "#EFF6FF",
          },
          {
            label: "Pending to Print",
            filterVal: "Pending to Print",
            val: unprintedCount,
            dot: "#EAB308",
            color: "#CA8A04",
            bg: "#FEF9C3",
          },
          {
            label: "Printed Invoices",
            filterVal: "Printed",
            val: printedCount,
            dot: "#22C55E",
            color: "#16A34A",
            bg: "#DCFCE7",
          },
        ].map((item) => {
          const isActive = printStatusFilter === item.filterVal;
          return (
            <button
              key={item.label}
              type="button"
              className={`inv__status-pill${isActive ? " inv__status-pill--active" : ""}`}
              style={{
                backgroundColor: item.bg,
                color: item.color,
                outline: isActive ? `2px solid ${item.dot}` : "none",
              }}
              onClick={() => {
                setPrintStatusFilter(item.filterVal);
                setPage(1);
              }}
            >
              <span className="inv__status-dot" style={{ backgroundColor: item.dot }} />
              <span className="inv__status-name">{item.label}</span>
              <span className="inv__status-count">{loading ? "—" : item.val}</span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar (Filters & Search) ── */}
      <div className="inv__toolbar">
        <div className="inv__toolbar-left">
          <FilterDropdown
            value={printStatusFilter}
            options={PRINT_STATUSES}
            onChange={(v) => {
              setPrintStatusFilter(v);
              setPage(1);
            }}
          />

          <FilterDropdown
            value={orderStatusFilter}
            options={ORDER_STATUSES}
            onChange={(v) => {
              setOrderStatusFilter(v);
              setPage(1);
            }}
          />

          <FilterDropdown
            value={paymentFilter}
            options={PAYMENT_OPTIONS}
            onChange={(v) => {
              setPaymentFilter(v);
              setPage(1);
            }}
          />

          {hasActiveFilters && (
            <button
              type="button"
              className="inv__filter-btn inv__filter-btn--clear"
              onClick={handleResetFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="inv__toolbar-right">
          <div className="inv__search-box">
            <SearchIcon />
            <input
              type="text"
              className="inv__search-input"
              placeholder="Search by order ID, name, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Table (Desktop View >= 768px) ── */}
      <div className="inv__table-wrap inv__desktop-view">
        <table className="inv__table">
          <thead>
            <tr>
              <th className="inv__th-check">
                <input
                  type="checkbox"
                  className="inv__checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  disabled={loading || paginated.length === 0}
                />
              </th>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Order Status</th>
              <th>Print Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{renderTableRows()}</tbody>
        </table>
      </div>

      {/* ── Mobile View (< 768px) ── */}
      <div className="inv__cards-wrap inv__mobile-view">
        {renderMobileCards()}
      </div>

      {/* ── Footer & Pagination ── */}
      <div className="inv__footer">
        <span className="inv__showing">
          {loading ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <SpinnerIcon /> Loading invoices…
            </span>
          ) : filtered.length === 0 ? (
            "No invoices to show"
          ) : (
            `Showing ${(safePage - 1) * PER_PAGE + 1}–${Math.min(
              safePage * PER_PAGE,
              filtered.length
            )} of ${filtered.length} invoices`
          )}
        </span>

        {!loading && filtered.length > 0 && (
          <div className="inv__pagination">
            <button
              type="button"
              className="inv__pg-arrow"
              disabled={safePage === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </button>

            {pageNums().map((n, i) =>
              n === "…" ? (
                <span key={`e${i}`} className="inv__pg-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`inv__pg-num${safePage === n ? " inv__pg-num--active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              )
            )}

            <button
              type="button"
              className="inv__pg-arrow"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      {/* ── Invoice Preview Modal ── */}
      {previewOrder && (
        <div className="inv__modal-overlay" onClick={() => setPreviewOrder(null)}>
          <div className="inv__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inv__modal-header">
              <div>
                <h3 className="inv__modal-title">Thermal Invoice Preview</h3>
                <p className="inv__modal-subtitle">
                  Order #{String(previewOrder.id).slice(-8).toUpperCase()} · 100 × 150 mm (4" × 6")
                </p>
              </div>
              <button
                type="button"
                className="inv__modal-close"
                onClick={() => setPreviewOrder(null)}
                aria-label="Close invoice preview"
              >
                ✕
              </button>
            </div>

            <div className="inv__modal-body">
              {previewLoadingAddress && (
                <div className="inv__preview-loading">
                  <SpinnerIcon /> Fetching shipping address details...
                </div>
              )}
              <ThermalInvoice
                order={previewOrder}
                address={previewAddress}
                isPreview={true}
              />
            </div>

            <div className="inv__modal-footer">
              <button
                type="button"
                className="inv__modal-close-btn"
                onClick={() => setPreviewOrder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={`inv__modal-status-btn ${
                  previewOrder.invoice_printed
                    ? "inv__modal-status-btn--unmark"
                    : "inv__modal-status-btn--mark"
                }`}
                onClick={() => handleTogglePrintedStatus(previewOrder)}
              >
                {previewOrder.invoice_printed ? "↩️ Mark Unprinted" : "✓ Mark Printed"}
              </button>
              <button
                type="button"
                className="inv__modal-print-btn"
                onClick={() => triggerPrintBatch([previewOrder])}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <>
                    <SpinnerIcon /> Printing...
                  </>
                ) : (
                  <>
                    <PrinterIcon />
                    <span>{previewOrder.invoice_printed ? "Print Again" : "Print Invoice"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print area teleported to body for thermal receipts */}
      {printBatch &&
        printBatch.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="thermal-print-area">
            {printBatch.map((orderItem) => (
              <ThermalInvoice
                key={orderItem.id}
                order={orderItem}
                address={
                  printAddresses[orderItem.id] ||
                  (previewOrder?.id === orderItem.id ? previewAddress : null)
                }
              />
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default Invoices;
