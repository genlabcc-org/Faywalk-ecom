import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import ThermalInvoice from "../components/ThermalInvoice";
import { orderService } from "../../services/orderService";
import { icarryService } from "../../services/icarryService";
import { productService } from "../../services/productService";
import "./Allorders.css";

/* ── Status & Payment Style Mappings ── */
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
  Razorpay: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  RAZORPAY: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  "Razorpay (Online Payment)": { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  Paid: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  PAID: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  Online: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  ONLINE: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  Prepaid: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  COD: { bg: "#FFF4E5", color: "#D97706", border: "#FED7AA" },
  cod: { bg: "#FFF4E5", color: "#D97706", border: "#FED7AA" },
};

const getPaymentBadge = (order) => {
  const raw =
    order?.payment_method ||
    order?.payment ||
    order?.payment_mode ||
    (order?.razorpay_payment_id ? "Razorpay" : "COD");

  const str = String(raw || "COD").trim();
  const upper = str.toUpperCase();

  if (
    upper.includes("RAZORPAY") ||
    upper === "PAID" ||
    upper === "ONLINE" ||
    upper === "PREPAID" ||
    order?.razorpay_payment_id
  ) {
    return {
      label: upper.includes("RAZORPAY") ? "Razorpay" : str,
      bg: "#EFF6FF",
      color: "#1D4ED8",
      border: "#BFDBFE",
    };
  }

  return {
    label: upper.includes("COD") ? "COD" : str,
    bg: "#FFF4E5",
    color: "#D97706",
    border: "#FED7AA",
  };
};

/* ── iCarry Status Code Mappings (iCarry API doc p.34) ── */
const ICARRY_CODE_MAP = {
  1: "Pending Pickup",
  2: "Processing",
  3: "Shipped",
  7: "Cancelled",
  12: "Damaged",
  14: "Lost",
  16: "Cancelled",
  21: "Delivered",
  22: "In Transit",
  23: "Returned to Origin",
  24: "Manifested",
  25: "Pickup Scheduled",
  26: "Out For Delivery",
  27: "Pending Return",
};

const getDeliveryStatusTag = (order) => {
  // Directly read the status saved in the database
  let raw =
    order?.delivery_status ||
    order?.status ||
    null;

  // Fallback if no delivery_status yet but waybill exists
  if (!raw) {
    if (order?.waybill || order?.shipment_id || order?.icarry_awb || order?.icarry_shipment_id) {
      raw = "Booked";
    } else if (order?.status?.toLowerCase() === "cancelled") {
      raw = "Cancelled";
    } else if (order?.status?.toLowerCase() === "delivered") {
      raw = "Delivered";
    } else if (order?.status?.toLowerCase() === "shipped") {
      raw = "Shipped";
    } else {
      raw = "Pending Booking";
    }
  }

  // If numeric status code, map to friendly label
  if (raw !== null && raw !== undefined && !isNaN(Number(raw)) && Number(raw) in ICARRY_CODE_MAP) {
    raw = ICARRY_CODE_MAP[Number(raw)];
  }

  const str = String(raw).trim();
  const lower = str.toLowerCase();

  // Delivered
  if (lower === "delivered" || lower === "21") {
    return {
      label: "Delivered",
      bg: "#DCFCE7",
      color: "#15803D",
      border: "#BBF7D0",
      dot: "#22C55E",
    };
  }

  // Shipped / In Transit / Out for Delivery / Dispatched
  if (
    lower === "shipped" ||
    lower.includes("transit") ||
    lower.includes("out for delivery") ||
    lower === "dispatched"
  ) {
    const label = lower.includes("out for delivery")
      ? "Out For Delivery"
      : lower.includes("transit")
        ? "In Transit"
        : "Shipped";
    return {
      label,
      bg: "#DBEAFE",
      color: "#1D4ED8",
      border: "#BFDBFE",
      dot: "#3B82F6",
    };
  }

  // Booked / Manifested / Pickup Scheduled / Pending Pickup / Processing / Label Generated
  if (
    lower === "booked" ||
    lower === "manifested" ||
    lower.includes("pickup") ||
    lower === "processing" ||
    lower.includes("shipping label") ||
    lower.includes("label generated")
  ) {
    return {
      label: "Booked",
      bg: "#EDE9FE",
      color: "#6D28D9",
      border: "#DDD6FE",
      dot: "#8B5CF6",
    };
  }

  // NDR / Delivery Exception
  if (lower.startsWith("ndr") || lower.includes("exception") || lower.includes("undelivered")) {
    return {
      label: str.length > 25 ? "NDR" : str,
      bg: "#FFEDD5",
      color: "#C2410C",
      border: "#FED7AA",
      dot: "#F97316",
    };
  }

  // Booking Failed
  if (lower === "booking failed" || lower.includes("fail")) {
    return {
      label: "Booking Failed",
      bg: "#FEE2E2",
      color: "#B91C1C",
      border: "#FECACA",
      dot: "#EF4444",
    };
  }

  // Cancelled / Voided / Lost / Damaged
  if (lower.includes("cancel") || lower === "voided" || lower === "lost" || lower === "damaged") {
    return {
      label: lower === "lost" ? "Lost" : lower === "damaged" ? "Damaged" : "Cancelled",
      bg: "#F1F5F9",
      color: "#64748B",
      border: "#E2E8F0",
      dot: "#94A3B8",
    };
  }

  // Returned / RTO
  if (lower.includes("return") || lower === "rto") {
    return {
      label: "Returned (RTO)",
      bg: "#FFE4E6",
      color: "#BE123C",
      border: "#FECDD3",
      dot: "#F43F5E",
    };
  }

  // Pending Booking / Booking in Progress
  if (lower === "pending booking" || lower === "pending" || lower === "booking in progress") {
    return {
      label: lower === "booking in progress" ? "Booking…" : "Pending Booking",
      bg: "#FEF9C3",
      color: "#A16207",
      border: "#FEF08A",
      dot: "#EAB308",
    };
  }

  // Confirmed / Order Placed
  if (lower === "confirmed" || lower === "order placed") {
    return {
      label: str,
      bg: "#E0F2FE",
      color: "#0284C7",
      border: "#BAE6FD",
      dot: "#0284C7",
    };
  }

  return {
    label: str,
    bg: "#F1F5F9",
    color: "#475569",
    border: "#CBD5E1",
    dot: "#64748B",
  };
};

const PRINT_STATUSES = ["All Invoices", "Pending to Print", "Printed"];
const STATUSES = [
  "All Status",
  "Pending Booking",
  "Booked",
  "Shipped",
  "Delivered",
  "Order Placed",
  "Confirmed",
  "Cancelled",
  "Returned",
];
const PAYMENT_OPTIONS = ["All Payment", "Razorpay", "COD"];
const PAGE_SIZE = 10;

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

const PrinterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const EmptyBoxIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const SpinnerIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
    </path>
  </svg>
);

const SyncIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const ClearIcon = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckCircleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const InfoIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

/* ── Skeleton row ── */
const SkeletonRow = () => (
  <tr className="ao__skeleton-row">
    <td><div className="ao__skeleton" style={{ width: 85 }} /></td>
    <td><div className="ao__skeleton" style={{ width: 110 }} /></td>
    <td><div className="ao__skeleton" style={{ width: 140 }} /></td>
    <td><div className="ao__skeleton" style={{ width: 75 }} /></td>
    <td><div className="ao__skeleton" style={{ width: 65 }} /></td>
    <td><div className="ao__skeleton" style={{ width: 55, borderRadius: 20 }} /></td>
    <td><div className="ao__skeleton" style={{ width: 75, borderRadius: 20 }} /></td>
    <td><div className="ao__skeleton" style={{ width: 85, borderRadius: 20 }} /></td>
    <td><div className="ao__skeleton" style={{ width: 120 }} /></td>
  </tr>
);

/* ── Dropdown ── */
const FilterDropdown = ({ label, value, options, onChange }) => {
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

  const isFiltered = value && !value.toLowerCase().startsWith("all");
  const shortVal = isFiltered ? value : "All";

  return (
    <div className={`ao__dd${open ? " ao__dd--open" : ""}`} ref={dropdownRef}>
      <button
        className={`ao__dd-btn${isFiltered ? " ao__dd-btn--selected" : ""}`}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={label ? `${label}: ${value}` : value}
      >
        {label && <span className="ao__dd-label">{label}:</span>}
        <span className="ao__dd-val">{shortVal}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="ao__dd-menu">
          {options.map((opt) => (
            <div
              key={opt}
              className={`ao__dd-item${value === opt ? " ao__dd-item--active" : ""}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <span>{opt}</span>
              {value === opt && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
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

/* ── Audio Chime for Live Orders ── */
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

/* ── Main Unified AllOrders Component ── */
const AllOrders = ({ orders = [], products = [], categories: categoriesProp = [], loading, error = null, onViewDetail }) => {
  const [localOrders, setLocalOrders] = useState(orders);
  const [category, setCategory] = useState("All Category");
  const [status, setStatus] = useState("All Status");
  const [printStatusFilter, setPrintStatusFilter] = useState("All Invoices");
  const [paymentFilter, setPaymentFilter] = useState("All Payment");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreDb, setHasMoreDb] = useState(true);
  const sentinelRef = useRef(null);
  const [dbCategories, setDbCategories] = useState([]);

  // Fetch real categories from database
  useEffect(() => {
    let isMounted = true;
    productService.getCategories()
      .then((data) => {
        if (isMounted && data && Array.isArray(data)) {
          const names = data.map((c) => c.name || c.category_name).filter(Boolean);
          setDbCategories(names);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch categories in Allorders:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Printing & Invoices state
  const [printBatch, setPrintBatch] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toast, setToast] = useState(null);
  const [autoPrint, setAutoPrint] = useState(() => {
    return localStorage.getItem("anika_auto_print") !== "false";
  });
  const [previewOrder, setPreviewOrder] = useState(null);
  const [previewAddress, setPreviewAddress] = useState(null);
  const [previewLoadingAddress, setPreviewLoadingAddress] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState(null);

  const toastTimerRef = useRef(null);

  const showToast = (message, type = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Keep localOrders synced with incoming props
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Realtime Supabase live order listener
  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime-listener")
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new;
          if (!updated) return;
          setLocalOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoPrint]);

  // Common sync tracking status for all active iCarry shipments
  const handleSyncAllTracking = async (silent = false) => {
    if (isSyncingAll) return;
    const trackable = localOrders.filter(
      (o) =>
        (o.waybill || o.shipment_id || o.icarry_awb || o.icarry_shipment_id) &&
        o.delivery_status !== "Cancelled" &&
        o.status !== "Cancelled" &&
        o.delivery_status !== "Delivered"
    );

    if (trackable.length === 0) {
      if (!silent) showToast("No active iCarry shipments found to sync.", "info");
      return;
    }

    try {
      setIsSyncingAll(true);
      if (!silent) showToast(`Syncing ${trackable.length} shipment(s) with iCarry...`, "info");
      let updatedCount = 0;
      const updatedMap = {};

      for (const order of trackable) {
        try {
          const res = await icarryService.track(order.id);
          const newStatus =
            res?.shipment_status ||
            res?.current_status ||
            res?.delivery_status ||
            res?.status ||
            res?.tracking_status;

          if (newStatus) {
            const updates = { delivery_status: String(newStatus) };
            const sLower = String(newStatus).toLowerCase();
            if (sLower.includes("cancel") || sLower === "voided" || sLower === "7" || sLower === "16") {
              updates.status = "Cancelled";
              updates.delivery_status = "Cancelled";
            } else if (sLower === "delivered" || sLower === "21") {
              updates.status = "Delivered";
              updates.delivery_status = "Delivered";
              updates.delivered_at = new Date().toISOString();
            } else if (sLower === "shipped" || sLower === "3") {
              updates.status = "Shipped";
              updates.delivery_status = "Shipped";
            }

            if (order.delivery_status !== updates.delivery_status || order.status !== updates.status) {
              await supabase.from("orders").update(updates).eq("id", order.id);
              updatedMap[order.id] = updates;
              updatedCount++;
            }
          }
        } catch (itemErr) {
          console.warn(`Could not sync tracking for order ${order.id}:`, itemErr);
        }
      }

      if (updatedCount > 0) {
        setLocalOrders((prev) =>
          prev.map((o) => (updatedMap[o.id] ? { ...o, ...updatedMap[o.id] } : o))
        );
        showToast(`Synced! Updated ${updatedCount} order status(es) from iCarry.`, "success");
      } else if (!silent) {
        showToast("iCarry tracking checked: All order statuses are up to date.", "success");
      }
    } catch (err) {
      console.error("iCarry bulk sync error:", err);
      if (!silent) showToast("iCarry sync failed: " + (err.message || "Network error"), "error");
    } finally {
      setIsSyncingAll(false);
    }
  };



  const handleRetryBooking = async (order) => {
    if (!order?.id) return;
    try {
      setRetryingOrderId(order.id);
      showToast(`Booking order #${String(order.id).slice(-8).toUpperCase()} with iCarry...`, "info");
      const res = await icarryService.retryBooking(order.id);
      if (res && res.error) {
        showToast("iCarry booking failed: " + res.error, "error");
      } else {
        showToast("Order booked successfully with iCarry!", "success");
        const { data: refreshed } = await supabase
          .from("orders")
          .select("*")
          .eq("id", order.id)
          .maybeSingle();
        if (refreshed) {
          setLocalOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, ...refreshed } : o))
          );
        }
      }
    } catch (err) {
      showToast("Failed to book order: " + err.message, "error");
    } finally {
      setRetryingOrderId(null);
    }
  };

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
    const orderShortId = String(order.id).slice(-6).toUpperCase();
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

  // Real Category options dynamically collected from database categories & product catalogue
  const categoryOptions = useMemo(() => {
    const set = new Set();

    // 1. From categories prop (from Dashboard)
    if (Array.isArray(categoriesProp)) {
      categoriesProp.forEach((c) => {
        const name = typeof c === "string" ? c : c?.name || c?.category_name;
        if (name && typeof name === "string" && name.trim()) set.add(name.trim());
      });
    }

    // 2. From database categories fetched directly
    if (Array.isArray(dbCategories)) {
      dbCategories.forEach((name) => {
        if (name && typeof name === "string" && name.trim()) set.add(name.trim());
      });
    }

    // 3. From products catalogue
    if (Array.isArray(products)) {
      products.forEach((p) => {
        const cat = p.category || p.categories?.name;
        if (cat && typeof cat === "string" && cat.trim()) set.add(cat.trim());
        const sub = p.subcategory || p.subcategories?.name;
        if (sub && typeof sub === "string" && sub.trim()) set.add(sub.trim());
      });
    }

    // 4. From localOrders items if present
    if (Array.isArray(localOrders)) {
      localOrders.forEach((o) => {
        if (o.category && typeof o.category === "string" && o.category.trim()) {
          set.add(o.category.trim());
        }
        if (Array.isArray(o.order_items)) {
          o.order_items.forEach((it) => {
            if (it.category && typeof it.category === "string" && it.category.trim()) {
              set.add(it.category.trim());
            }
          });
        }
      });
    }

    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["All Category", ...sorted];
  }, [categoriesProp, dbCategories, products, localOrders]);

  // Counts & stats
  const unprintedCount = localOrders.filter((o) => !o.invoice_printed).length;
  const printedCount = localOrders.filter((o) => o.invoice_printed).length;

  const razorpayCount = localOrders.filter((o) => {
    const pb = getPaymentBadge(o);
    return pb.color === "#1D4ED8" || pb.label.toLowerCase().includes("razorpay");
  }).length;

  const codCount = localOrders.filter((o) => {
    const pb = getPaymentBadge(o);
    return pb.label.toUpperCase().includes("COD");
  }).length;

  const statusCount = (s) => {
    const sLower = s.toLowerCase();
    if (sLower === "return" || sLower === "returned") {
      return localOrders.filter(
        (o) =>
          o.status?.toLowerCase() === "return" ||
          o.status?.toLowerCase() === "returned" ||
          o.delivery_status?.toLowerCase() === "returned" ||
          o.delivery_status?.toLowerCase() === "rto"
      ).length;
    }
    return localOrders.filter((o) => {
      const dt = getDeliveryStatusTag(o);
      const orderSt = (o.status || "").toLowerCase();
      const delSt = dt.label.toLowerCase();
      if (sLower === "shipped") {
        return orderSt === "shipped" || delSt === "shipped" || delSt.includes("transit");
      }
      if (sLower === "pending booking") {
        return delSt === "pending booking" || orderSt === "pending";
      }
      return orderSt === sLower || delSt === sLower;
    }).length;
  };
  const count = statusCount;

  const revenue = localOrders
    .filter((o) => !["cancelled", "returned"].includes(o.status?.toLowerCase()))
    .reduce((s, o) => s + Number(o.total_price || 0), 0);

  /* ── Filtered Orders ── */
  const filtered = useMemo(() => {
    return localOrders.filter((o) => {
      // Print status filter
      if (printStatusFilter === "Pending to Print" && o.invoice_printed) return false;
      if (printStatusFilter === "Printed" && !o.invoice_printed) return false;

      // Real Category filter
      if (category !== "All Category") {
        const target = category.toLowerCase().trim();
        let matchesCat = false;

        // 1. Direct check on order if present
        if (o.category && String(o.category).toLowerCase().trim() === target) {
          matchesCat = true;
        }

        // 2. Check order items
        if (!matchesCat) {
          const items = Array.isArray(o.order_items) && o.order_items.length > 0
            ? o.order_items
            : [{ product_name: o.item_name, product_id: o.product_id }];

          for (const it of items) {
            if (it.category && String(it.category).toLowerCase().trim() === target) {
              matchesCat = true;
              break;
            }

            const pid = it.product_id || it.id;
            if (pid) {
              const p = products.find(
                (prod) => String(prod.id) === String(pid) || String(prod.product_id) === String(pid)
              );
              if (p) {
                const pCat = String(p.category || p.categories?.name || "").toLowerCase().trim();
                const pSub = String(p.subcategory || p.subcategories?.name || "").toLowerCase().trim();
                if (pCat === target || pSub === target) {
                  matchesCat = true;
                  break;
                }
              }
            }

            const rawName = String(it.product_name || it.item_name || it.name || "").toLowerCase().trim();
            if (rawName) {
              const p = products.find((prod) => {
                const pName = (prod.name || "").toLowerCase().trim();
                return pName && (rawName === pName || rawName.includes(pName) || pName.includes(rawName));
              });
              if (p) {
                const pCat = String(p.category || p.categories?.name || "").toLowerCase().trim();
                const pSub = String(p.subcategory || p.subcategories?.name || "").toLowerCase().trim();
                if (pCat === target || pSub === target) {
                  matchesCat = true;
                  break;
                }
              }
            }
          }
        }

        // 3. Fallback check on whole order.item_name
        if (!matchesCat && o.item_name) {
          const oName = String(o.item_name).toLowerCase();
          const p = products.find((prod) => {
            const pName = (prod.name || "").toLowerCase().trim();
            return pName && oName.includes(pName);
          });
          if (p) {
            const pCat = String(p.category || p.categories?.name || "").toLowerCase().trim();
            const pSub = String(p.subcategory || p.subcategories?.name || "").toLowerCase().trim();
            if (pCat === target || pSub === target) {
              matchesCat = true;
            }
          }
        }

        if (!matchesCat) return false;
      }

      // Order & Delivery status filter
      if (status !== "All Status") {
        const dt = getDeliveryStatusTag(o);
        const orderSt = (o.status || "").toLowerCase();
        const delSt = dt.label.toLowerCase();
        const filterLower = status.toLowerCase();

        if (filterLower === "returned") {
          if (orderSt !== "return" && orderSt !== "returned" && delSt !== "returned" && delSt !== "rto") return false;
        } else if (filterLower === "shipped") {
          if (orderSt !== "shipped" && !delSt.includes("shipped") && !delSt.includes("transit")) return false;
        } else if (filterLower === "pending booking") {
          if (delSt !== "pending booking" && orderSt !== "pending") return false;
        } else {
          if (orderSt !== filterLower && delSt !== filterLower) {
            return false;
          }
        }
      }

      // Payment filter
      if (paymentFilter !== "All Payment") {
        const pb = getPaymentBadge(o);
        if (paymentFilter === "Razorpay") {
          if (!pb.label.toLowerCase().includes("razorpay") && pb.color !== "#1D4ED8") {
            return false;
          }
        } else if (paymentFilter === "COD") {
          if (!pb.label.toUpperCase().includes("COD")) {
            return false;
          }
        } else if (o.payment?.toUpperCase() !== paymentFilter.toUpperCase()) {
          return false;
        }
      }

      // Search
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const orderIdStr = o.id ? String(o.id).toLowerCase() : "";
        const custName = getCustomerDisplayName(o).toLowerCase();
        const custEmail = (o.customer?.email || "").toLowerCase();
        const custPhone = (o.customer?.phone || o.phone || "").toLowerCase();
        const itemName = (o.item_name || "").toLowerCase();

        const match =
          orderIdStr.includes(s) ||
          custName.includes(s) ||
          custEmail.includes(s) ||
          custPhone.includes(s) ||
          itemName.includes(s);

        if (!match) return false;
      }

      return true;
    });
  }, [localOrders, category, status, printStatusFilter, paymentFilter, search, products]);

  /* ── Infinite Scroll / Lazy Load (10 at a time) ── */
  const paginated = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  // Load next 10 orders from Supabase DB when user scrolls
  const loadMoreOrdersFromDb = useCallback(async () => {
    if (loadingMore || !hasMoreDb) return;
    setLoadingMore(true);
    try {
      const currentCount = localOrders.length;
      const { data: newOrders, error: fetchErr } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("order_date", { ascending: false })
        .range(currentCount, currentCount + PAGE_SIZE - 1);

      if (fetchErr) {
        console.warn("Error fetching next orders batch from DB:", fetchErr);
        setHasMoreDb(false);
        return;
      }

      if (!newOrders || newOrders.length === 0) {
        setHasMoreDb(false);
        return;
      }

      if (newOrders.length < PAGE_SIZE) {
        setHasMoreDb(false);
      }

      const enriched = await Promise.all(
        newOrders.map(async (order) => {
          const en = {
            ...order,
            customer: {
              id: order.user_id,
              name: order.customer_name || "Customer",
              phone: order.customer_phone || order.phone || "",
            },
          };
          if (order.user_id) {
            try {
              const { data: profile } = await supabase
                .from("users")
                .select("name, full_name, phone, phone_number, mobile, email")
                .eq("id", order.user_id)
                .maybeSingle();
              if (profile) {
                en.customer = {
                  id: order.user_id,
                  name: profile.name || profile.full_name || en.customer.name,
                  phone: profile.phone || profile.phone_number || profile.mobile || en.customer.phone,
                  email: profile.email || "",
                };
              }
            } catch (_) { }
          }
          return en;
        })
      );

      setLocalOrders((prev) => {
        const existingIds = new Set(prev.map((o) => o.id));
        const filteredNew = enriched.filter((o) => !existingIds.has(o.id));
        return [...prev, ...filteredNew];
      });

      setVisibleCount((prev) => prev + PAGE_SIZE);
    } catch (err) {
      console.warn("Failed to load more orders:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreDb, localOrders.length]);

  // Observer to trigger next 10 when user scrolls down
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (visibleCount < filtered.length) {
            // More already loaded in filtered array
            setVisibleCount((prev) => prev + PAGE_SIZE);
          } else if (hasMoreDb && !loadingMore && !loading) {
            // Load next 10 from database
            loadMoreOrdersFromDb();
          }
        }
      },
      { root: null, rootMargin: "300px", threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [visibleCount, filtered.length, hasMoreDb, loadingMore, loading, loadMoreOrdersFromDb]);

  /* ── Selection ── */
  const toggleRow = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allChecked = paginated.length > 0 && paginated.every((o) => selected.includes(o.id));

  const toggleAll = () =>
    setSelected(
      allChecked
        ? selected.filter((id) => !paginated.find((o) => o.id === id))
        : [...new Set([...selected, ...paginated.map((o) => o.id)])]
    );

  const hasActiveFilters =
    category !== "All Category" ||
    status !== "All Status" ||
    printStatusFilter !== "All Invoices" ||
    paymentFilter !== "All Payment" ||
    search !== "";

  const handleResetFilters = () => {
    setCategory("All Category");
    setStatus("All Status");
    setPrintStatusFilter("All Invoices");
    setPaymentFilter("All Payment");
    setSearch("");
    setVisibleCount(PAGE_SIZE);
  };

  /* ── Render Table Body ── */
  const renderBody = () => {
    if (loading) {
      return Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />);
    }

    if (error) {
      return (
        <tr>
          <td colSpan={9} className="ao__empty">
            <div className="ao__empty-state">
              <p className="ao__empty-title">Something went wrong</p>
              <p className="ao__empty-desc">{error}</p>
            </div>
          </td>
        </tr>
      );
    }

    if (localOrders.length === 0) {
      return (
        <tr>
          <td colSpan={9} className="ao__empty">
            <div className="ao__empty-state">
              <div className="ao__empty-icon">
                <EmptyBoxIcon />
              </div>
              <p className="ao__empty-title">No orders yet</p>
              <p className="ao__empty-desc">
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
          <td colSpan={9} className="ao__empty">
            <div className="ao__empty-state">
              <p className="ao__empty-title">No orders match your filters</p>
              <p className="ao__empty-desc">Try clearing or adjusting your search or filters.</p>
            </div>
          </td>
        </tr>
      );
    }

    return paginated.map((order) => {
      const isPrinted = Boolean(order.invoice_printed);
      const isSel = selected.includes(order.id);
      const ss = STATUS_STYLE[order.status] || { bg: "#FFF4E5", color: "#D97706" };
      const ps = PAYMENT_STYLE[order.payment] || { bg: "#FFF4E5", color: "#D97706" };
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
        <tr key={order.id} className="ao__row">
          <td className="ao__cell-id">
            <button
              type="button"
              className="ao__view-link"
              style={{ fontWeight: 700, textDecoration: "none", color: "#0F172A" }}
              onClick={() => onViewDetail?.(order)}
              title="Click to view full order details"
            >
              {orderShortId}
            </button>
          </td>

          <td className="ao__cell-customer">
            <span className="ao__customer-name">{getCustomerDisplayName(order)}</span>
            {order.customer?.phone && (
              <span style={{ fontSize: 12, color: "#64748B", display: "block" }}>
                {order.customer.phone}
              </span>
            )}
          </td>

          <td className="ao__cell-items" title={itemNames.join(", ") || itemsSummary}>
            {itemsSummary}
          </td>

          <td style={{ fontSize: 13, color: "#64748B", whiteSpace: "nowrap" }}>
            {orderDate}
          </td>

          <td className="ao__cell-total">
            ₹{Number(order.total_price || 0).toLocaleString("en-IN")}
          </td>

          <td>
            {(() => {
              const pb = getPaymentBadge(order);
              return (
                <span
                  className="ao__badge"
                  style={{
                    backgroundColor: pb.bg,
                    color: pb.color,
                    border: `1px solid ${pb.border}`,
                  }}
                >
                  {pb.label}
                </span>
              );
            })()}
          </td>

          <td>
            {(() => {
              const dt = getDeliveryStatusTag(order);
              const courier = order.icarry_courier_name || order.courier_name;
              const awb = order.icarry_awb || order.waybill;
              const trackingUrl = order.tracking_url;

              return (
                <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                  <span
                    className="ao__badge"
                    style={{
                      backgroundColor: dt.bg,
                      color: dt.color,
                      border: `1px solid ${dt.border}`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    title={`iCarry Status: ${dt.label}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: dt.dot,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {dt.label}
                  </span>

                  {awb ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        paddingLeft: 2,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#475569" }}>
                        {courier || "iCarry"}:
                      </span>
                      {trackingUrl ? (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: "#2563EB",
                            textDecoration: "underline",
                            fontFamily: "monospace",
                            fontWeight: 500,
                          }}
                          title="Track on courier portal"
                        >
                          {awb} ↗
                        </a>
                      ) : (
                        <span style={{ fontFamily: "monospace" }}>{awb}</span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "#94A3B8", paddingLeft: 2 }}>
                      iCarry: Not booked
                    </span>
                  )}
                </div>
              );
            })()}
          </td>

          <td>
            <button
              type="button"
              className={`ao__print-status-btn ${isPrinted ? "ao__print-status-btn--printed" : "ao__print-status-btn--unprinted"
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
            <div className="ao__actions">
              <button
                type="button"
                className="ao__view-link"
                onClick={() => onViewDetail?.(order)}
                title="View Order Details"
              >
                View
              </button>
              {(!order.waybill && !order.icarry_awb && order.status !== "Cancelled" && order.delivery_status !== "Cancelled") && (
                <button
                  type="button"
                  className="ao__view-link"
                  style={{
                    color: (order.delivery_status === "Booking Failed" || order.shipment_error) ? "#dc2626" : "#0284c7",
                    fontWeight: 600,
                  }}
                  onClick={() => handleRetryBooking(order)}
                  disabled={retryingOrderId === order.id}
                  title="Book shipment with iCarry"
                >
                  {retryingOrderId === order.id ? "Booking…" : (order.delivery_status === "Booking Failed" || order.shipment_error ? "Retry Booking" : "Book iCarry")}
                </button>
              )}
              <button
                type="button"
                className="ao__view-link"
                style={{ color: "var(--admin-primary, #002277)" }}
                onClick={() => handleOpenPreview(order)}
                title="Preview thermal receipt"
              >
                Receipt
              </button>
              <button
                type="button"
                className="ao__row-print-btn"
                onClick={() => triggerPrintBatch([order])}
                disabled={isPrinting}
                title="Print thermal invoice"
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
        <div className="ao__cards-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ao__card ao__card--skeleton">
              <div className="ao__skeleton" style={{ width: 90, height: 16 }} />
            </div>
          ))}
        </div>
      );
    }

    if (paginated.length === 0) {
      return (
        <div className="ao__empty-state ao__empty-state--sm">
          <p className="ao__empty-title">No orders match your filters</p>
          <p className="ao__empty-desc">Try clearing or adjusting search or filter criteria.</p>
        </div>
      );
    }

    return (
      <div className="ao__cards-list">
        {paginated.map((order) => {
          const isPrinted = Boolean(order.invoice_printed);
          const ss = STATUS_STYLE[order.status] || { bg: "#FFF4E5", color: "#D97706" };
          const ps = PAYMENT_STYLE[order.payment] || { bg: "#FFF4E5", color: "#D97706" };

          return (
            <div key={order.id} className="ao__card">
              <div className="ao__card-header">
                <div className="ao__card-header-left">
                  <span className="ao__card-id">
                    #{order.id ? String(order.id).slice(-6).toUpperCase() : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    className={`ao__print-status-btn ${isPrinted ? "ao__print-status-btn--printed" : "ao__print-status-btn--unprinted"
                      }`}
                    onClick={() => handleTogglePrintedStatus(order)}
                  >
                    {isPrinted ? "✓ Printed" : "○ Pending"}
                  </button>
                  {(() => {
                    const dt = getDeliveryStatusTag(order);
                    return (
                      <span
                        className="ao__badge"
                        style={{
                          backgroundColor: dt.bg,
                          color: dt.color,
                          border: `1px solid ${dt.border}`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: dt.dot,
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        {dt.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="ao__card-body">
                <div className="ao__card-customer">
                  <span className="ao__card-customer-name">
                    {getCustomerDisplayName(order)}
                  </span>
                </div>
                <div className="ao__card-items">
                  <span className="ao__card-items-text">
                    {order.item_name || "Order items"}
                  </span>
                </div>
              </div>

              <div className="ao__card-footer">
                <div className="ao__card-footer-left">
                  {(() => {
                    const pb = getPaymentBadge(order);
                    return (
                      <span
                        className="ao__badge"
                        style={{
                          backgroundColor: pb.bg,
                          color: pb.color,
                          border: `1px solid ${pb.border}`,
                        }}
                      >
                        {pb.label}
                      </span>
                    );
                  })()}
                  <span className="ao__card-total">
                    ₹{Number(order.total_price || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="ao__actions">
                  <button className="ao__view-btn" onClick={() => onViewDetail?.(order)}>
                    Details
                  </button>
                  {(!order.waybill && !order.icarry_awb && order.status !== "Cancelled" && order.delivery_status !== "Cancelled") && (
                    <button
                      className="ao__view-btn"
                      style={{
                        color: (order.delivery_status === "Booking Failed" || order.shipment_error) ? "#dc2626" : "#0284c7",
                        fontWeight: 600,
                      }}
                      onClick={() => handleRetryBooking(order)}
                      disabled={retryingOrderId === order.id}
                    >
                      {retryingOrderId === order.id ? "Booking…" : (order.delivery_status === "Booking Failed" || order.shipment_error ? "Retry Booking" : "Book iCarry")}
                    </button>
                  )}
                  <button
                    className="ao__row-print-btn"
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
    );
  };

  return (
    <div className="ao">
      {/* Toast Alert */}
      {toast && (
        <div className={`ao__toast ao__toast--${toast.type}`}>
          <span className="ao__toast-icon">
            {toast.type === "success" ? (
              <CheckCircleIcon size={15} />
            ) : toast.type === "error" ? (
              <AlertCircleIcon size={15} />
            ) : (
              <InfoIcon size={15} />
            )}
          </span>
          <span className="ao__toast-msg">{toast.message}</span>
          <button className="ao__toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="ao__page-header">
        <div className="ao__page-title-block">
          <h1 className="ao__title">All Orders &amp; Invoices</h1>
          <p className="ao__subtitle">
            {loading ? "Loading…" : `${filtered.length} Orders with Live Thermal Printing`}
          </p>
        </div>

        {/* Master Invoices & Thermal Printing Controls */}
        <div className="ao__header-actions">
          {/* Auto-Print Toggle */}
          <button
            type="button"
            className={`ao__auto-toggle ${autoPrint ? "ao__auto-toggle--active" : ""}`}
            onClick={handleToggleAutoPrint}
            title={autoPrint ? "Click to pause auto-printing" : "Click to enable auto-printing"}
          >
            <span className={`ao__pulse-dot ${autoPrint ? "ao__pulse-dot--active" : ""}`} />
            Auto-Print: {autoPrint ? "ON" : "OFF"}
          </button>

          {/* Selected Batch Print */}
          {selected.length > 0 && (
            <button
              type="button"
              className="ao__batch-print-btn"
              onClick={handlePrintSelected}
              disabled={isPrinting}
            >
              <PrinterIcon />
              <span>Print Selected</span>
              <span className="ao__btn-badge">{selected.length}</span>
            </button>
          )}

          {/* Master Print All Pending */}
          <button
            type="button"
            className="ao__master-print-btn"
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
                  <span className="ao__btn-badge">{unprintedCount}</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats Grid (Clean Neutral KPI Cards) ── */}
      <div className="ao__kpi-cards">
        {/* Total Orders */}
        <div className="ao__kpi-card">
          <div className="ao__kpi-card-header">
            <span className="ao__kpi-card-title">Total Orders</span>
            <div className="ao__kpi-card-time">
              <span>All time</span>
            </div>
          </div>
          <div className="ao__kpi-card-val">
            {loading ? "—" : localOrders.length.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Total Revenue */}
        <div className="ao__kpi-card">
          <div className="ao__kpi-card-header">
            <span className="ao__kpi-card-title">Total Revenue</span>
            <div className="ao__kpi-card-time">
              <span>Revenue</span>
            </div>
          </div>
          <div className="ao__kpi-card-val">
            {loading ? "—" : `₹${revenue.toLocaleString("en-IN")}`}
          </div>
        </div>

        {/* Pending to Print Invoices */}
        <div className="ao__kpi-card">
          <div className="ao__kpi-card-header">
            <span className="ao__kpi-card-title">Pending to Print</span>
            <div className="ao__kpi-card-time">
              <span>Needs print</span>
            </div>
          </div>
          <div className="ao__kpi-card-val">
            {loading ? "—" : unprintedCount.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Delivered Orders */}
        <div className="ao__kpi-card">
          <div className="ao__kpi-card-header">
            <span className="ao__kpi-card-title">Delivered Orders</span>
            <div className="ao__kpi-card-time">
              <span>Completed</span>
            </div>
          </div>
          <div className="ao__kpi-card-val">
            {loading ? "—" : count("Delivered")}
          </div>
        </div>
      </div>

      {/* ── Minimal Filter Toolbar ── */}
      <div className="ao__toolbar">
        <div className="ao__toolbar-left">
          <FilterDropdown
            label="Status"
            value={status}
            options={STATUSES}
            onChange={(v) => {
              setStatus(v);
              setVisibleCount(PAGE_SIZE);
            }}
          />

          <FilterDropdown
            label="Payment"
            value={paymentFilter}
            options={PAYMENT_OPTIONS}
            onChange={(v) => {
              setPaymentFilter(v);
              setVisibleCount(PAGE_SIZE);
            }}
          />

          <FilterDropdown
            label="Invoice"
            value={printStatusFilter}
            options={PRINT_STATUSES}
            onChange={(v) => {
              setPrintStatusFilter(v);
              setVisibleCount(PAGE_SIZE);
            }}
          />

          <FilterDropdown
            label="Category"
            value={category}
            options={categoryOptions}
            onChange={(v) => {
              setCategory(v);
              setVisibleCount(PAGE_SIZE);
            }}
          />

          {hasActiveFilters && (
            <button
              type="button"
              className="ao__filter-btn ao__filter-btn--clear"
              onClick={handleResetFilters}
              title="Clear all active filters"
            >
              <ClearIcon />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="ao__toolbar-right">
          <button
            type="button"
            className="ao__sync-btn"
            onClick={handleSyncAllTracking}
            disabled={isSyncingAll || loading}
            title="Sync all live order delivery statuses directly from iCarry"
          >
            {isSyncingAll ? (
              <>
                <SpinnerIcon />
                <span>Syncing iCarry...</span>
              </>
            ) : (
              <>
                <SyncIcon />
                <span>Sync iCarry</span>
              </>
            )}
          </button>

          <div className="ao__search-box">
            <SearchIcon />
            <input
              type="text"
              className="ao__search-input"
              placeholder="Search by order ID, customer, item..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Table (Desktop View >= 768px) ── */}
      <div className="ao__table-wrap ao__desktop-view">
        <table className="ao__table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Invoice</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{renderBody()}</tbody>
        </table>
      </div>

      {/* ── Mobile View (< 768px) ── */}
      <div className="ao__cards-wrap ao__mobile-view">
        {renderMobileCards()}
      </div>

      {/* ── Footer / Infinite Scroll Indicator ── */}
      <div className="ao__footer">
        <span className="ao__showing">
          {loading ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <SpinnerIcon /> Loading orders…
            </span>
          ) : filtered.length === 0 ? (
            "No orders to show"
          ) : (
            `Showing ${Math.min(visibleCount, filtered.length)} of ${filtered.length} orders`
          )}
        </span>

        {loadingMore && (
          <div className="ao__infinite-loader">
            <SpinnerIcon />
            <span>Loading next 10 orders…</span>
          </div>
        )}

        {!loading && !loadingMore && filtered.length > 0 && visibleCount >= filtered.length && (
          <span className="ao__all-loaded-text">All orders loaded</span>
        )}
      </div>

      {/* ── Infinite scroll trigger sentinel ── */}
      <div ref={sentinelRef} className="ao__infinite-sentinel" />

      {/* ── Invoice Preview Modal (Thermal 4x6) — Portal to document.body ── */}
      {previewOrder && typeof document !== "undefined" && createPortal(
        <div className="ao__modal-overlay" onClick={() => setPreviewOrder(null)}>
          <div className="ao__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ao__modal-header">
              <div>
                <h3 className="ao__modal-title">Thermal Receipt Preview</h3>
                <p className="ao__modal-subtitle">
                  Order #{String(previewOrder.id).slice(-8).toUpperCase()} · 100 × 150 mm (4" × 6")
                </p>
              </div>
              <button
                type="button"
                className="ao__modal-close"
                onClick={() => setPreviewOrder(null)}
                aria-label="Close invoice preview"
              >
                ✕
              </button>
            </div>

            <div className="ao__modal-body">
              {previewLoadingAddress && (
                <div className="ao__preview-loading">
                  <SpinnerIcon /> Fetching customer address details...
                </div>
              )}
              <ThermalInvoice
                order={previewOrder}
                address={previewAddress}
                isPreview={true}
              />
            </div>

            <div className="ao__modal-footer">
              <button
                type="button"
                className="ao__modal-close-btn"
                onClick={() => setPreviewOrder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={`ao__modal-status-btn ${previewOrder.invoice_printed
                  ? "ao__modal-status-btn--unmark"
                  : "ao__modal-status-btn--mark"
                  }`}
                onClick={() => handleTogglePrintedStatus(previewOrder)}
              >
                {previewOrder.invoice_printed ? "Mark Unprinted" : "Mark Printed"}
              </button>
              <button
                type="button"
                className="ao__modal-print-btn"
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
        </div>,
        document.body
      )}

      {/* ── Hidden Print Area for Physical Printer ── */}
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

export default AllOrders;