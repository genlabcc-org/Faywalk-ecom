import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { orderService } from "../../services/orderService";

import { icarryService } from "../../services/icarryService";
import { razorpayService } from "../../services/razorpayService";
import { useStore } from "../../hooks/useStore";
import Toast from "../../components/Toast";
import ThermalInvoice from "../components/ThermalInvoice";
import { getColorName } from "../../utils/colorUtils";
import "./Orderdetails.css";

const STATUS_CONFIG = {
  "Order Placed": { bg: "#E0F2FE", color: "#0284C7", border: "#BAE6FD", dot: "#0284C7" },
  Delivered: { bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0", dot: "#22C55E" },
  Shipped: { bg: "#DBEAFE", color: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6" },
  Pending: { bg: "#FEF9C3", color: "#A16207", border: "#FEF08A", dot: "#EAB308" },
  "Pending Booking": { bg: "#FEF9C3", color: "#A16207", border: "#FEF08A", dot: "#EAB308" },
  Cancelled: { bg: "#F1F5F9", color: "#64748B", border: "#E2E8F0", dot: "#94A3B8" },
  Returned: { bg: "#FFE4E6", color: "#BE123C", border: "#FECDD3", dot: "#F43F5E" },
  Confirmed: { bg: "#EDE9FE", color: "#6D28D9", border: "#DDD6FE", dot: "#8B5CF6" },
  Booked: { bg: "#EDE9FE", color: "#6D28D9", border: "#DDD6FE", dot: "#8B5CF6" },
  "Refund Completed": { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0", dot: "#10B981" }
};

/* ── SVG Icons (No Emojis) ── */
const IconSync = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const IconEye = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconPrinter = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>
);

const IconTag = ({ size = 13, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const IconCalendar = ({ size = 13, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconPin = ({ size = 13, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconPhone = ({ size = 13, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconAlertTriangle = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconCross = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = ({ size = 13, className = "", color, stroke, style, strokeWidth = 2.5, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "currentColor"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ ...style, color: stroke || color || style?.color }}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconExternalLink = ({ size = 12, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconPackage = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.29 7 12 12 20.71 7" />
    <line x1="12" y1="22" x2="12" y2="12" />
  </svg>
);

const StatusBadge = ({ status }) => {
  const normStatus = Object.keys(STATUS_CONFIG).find(
    k => k.toLowerCase() === (status || "").toLowerCase()
  );
  const cfg = STATUS_CONFIG[normStatus] || STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span
      className="od__status-badge"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: 'none'
      }}
    >
      <span className="od__status-dot" style={{ backgroundColor: cfg.dot }} />
      {status}
    </span>
  );
};

const parseAddressData = (raw) => {
  if (!raw) return null;
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return { address_line1: raw };
    }
  }
  if (Array.isArray(parsed)) {
    parsed = parsed[0] || null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
};

const isValidAddress = (addr) => {
  if (!addr || typeof addr !== "object") return false;
  return Boolean(
    addr.address_line1 ||
    addr.address_line ||
    addr.line1 ||
    addr.address ||
    addr.flat ||
    addr.street ||
    addr.city ||
    addr.state ||
    addr.postal_code ||
    addr.pincode ||
    addr.phone_number ||
    addr.phone
  );
};

const getExistingOrderAddress = (orderObj) => {
  if (!orderObj) return null;
  const candidates = [
    parseAddressData(orderObj.addresses),
    parseAddressData(orderObj.shipping_address),
    parseAddressData(orderObj.address),
    parseAddressData(orderObj.delivery_address),
    parseAddressData(orderObj.shipping_details),
    parseAddressData(orderObj.destination),
    parseAddressData(orderObj.customer?.address),
    parseAddressData(orderObj.customer_address),
  ];
  for (const c of candidates) {
    if (isValidAddress(c)) return c;
  }
  if (
    orderObj.address_line1 ||
    orderObj.address_line ||
    orderObj.city ||
    orderObj.state ||
    orderObj.postal_code ||
    orderObj.pincode
  ) {
    return {
      full_name: orderObj.full_name || orderObj.customer_name || orderObj.customer?.name,
      phone_number: orderObj.phone_number || orderObj.phone || orderObj.customer_phone || orderObj.customer?.phone,
      address_line1: orderObj.address_line1 || orderObj.address_line,
      address_line2: orderObj.address_line2,
      city: orderObj.city,
      state: orderObj.state,
      postal_code: orderObj.postal_code || orderObj.pincode,
      country: orderObj.country || "India",
    };
  }
  return null;
};

const OrderDetails = ({ order, onBack }) => {
  const [currentOrder, setCurrentOrder] = useState(order || null);
  const o = currentOrder || order || {
    id: "ORD-UNKNOWN",
    customer: { name: "Unknown Customer", email: "N/A", phone: "N/A" },
    order_date: new Date().toISOString(),
    item_name: "N/A",
    quantity: 1,
    total_price: 0,
    status: "Order Placed",
    payment: "COD"
  };
  const [adminNote, setAdminNote] = useState(order?.admin_notes || "");
  const [address, setAddress] = useState(() => getExistingOrderAddress(order));
  const [addressLoading, setAddressLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });

  const [invoicePrinted, setInvoicePrinted] = useState(order?.invoice_printed || false);
  const [printing, setPrinting] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [retryingBooking, setRetryingBooking] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(false);
  const [cancellingShipment, setCancellingShipment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const invoiceRef = useRef(null);

  const setSelectedProduct = useStore(state => state.setSelectedProduct);
  const setSelectedAdminOrder = useStore(state => state.setSelectedAdminOrder);
  const navigate = useNavigate();

  useEffect(() => {
    if (order) {
      setCurrentOrder(order);
      if (order.admin_notes !== undefined) {
        setAdminNote(order.admin_notes || "");
      }
      if (order.invoice_printed !== undefined) {
        setInvoicePrinted(order.invoice_printed);
      }
    }
  }, [order]);

  // Realtime subscription for this order in admin
  useEffect(() => {
    const orderId = order?.id;
    if (!orderId) return;

    const channel = supabase
      .channel(`admin-order-detail-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          if (payload?.new) {
            setCurrentOrder((prev) => ({
              ...(prev || {}),
              ...payload.new
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  useEffect(() => {
    const orderId = order?.id || currentOrder?.id;
    if (!orderId || orderId === "ORD-UNKNOWN") return;

    const loadFreshOrderStatus = async () => {
      try {
        const { data: dbOrder } = await supabase
          .from("orders")
          .select("invoice_printed")
          .eq("id", orderId)
          .maybeSingle();
        if (dbOrder && (dbOrder.invoice_printed === true || dbOrder.invoice_printed === "true" || dbOrder.invoice_printed === 1)) {
          setInvoicePrinted(true);
          setCurrentOrder((prev) => ({ ...(prev || {}), invoice_printed: true }));
        }
      } catch (err) {
        console.warn("Could not check fresh order invoice_printed:", err);
      }
    };
    loadFreshOrderStatus();
  }, [order?.id, currentOrder?.id]);

  const [productImagesMap, setProductImagesMap] = useState({});

  useEffect(() => {
    let isMounted = true;
    const loadMissingProductImages = async () => {
      try {
        const items = o?.order_items || [];
        const needsLookup = items.some(it => !it.image_url || it.image_url.includes('bangle1')) || !items.length;
        if (!needsLookup) return;

        const { data: prods } = await supabase
          .from("products")
          .select("product_id, name, image_url, images, sku");

        if (isMounted && prods && prods.length > 0) {
          const map = {};
          prods.forEach(p => {
            const validImg = p.image_url || p.images?.[0] || null;
            if (p.product_id) map[String(p.product_id)] = validImg;
            if (p.name) map[p.name.trim().toLowerCase()] = validImg;
          });
          setProductImagesMap(map);
        }
      } catch (err) {
        console.warn("Notice loading product images map in Orderdetails:", err);
      }
    };

    loadMissingProductImages();
    return () => { isMounted = false; };
  }, [o?.id, o?.order_items]);

  const handleItemClick = async (item) => {
    if (!item.product_id) return;
    const { data: product, error } = await supabase
      .from("products")
      .select("product_id, name, description, price, compare_price, image_url, images, sizes, stock, sku, categories(name)")
      .eq("product_id", item.product_id)
      .single();
    if (error || !product) return;

    setSelectedProduct({
      ...product,
      id: product.product_id,
      productId: product.product_id,
      img: product.image_url || product.images?.[0] || "/src/assets/cart/bangle1.webp",
      desc: product.description,
      originalPrice: product.compare_price || Math.round(product.price * 1.3),
      sizes: product.sizes || [],
      stock: product.stock > 0 ? "in-stock" : "out-of-stock",
      category: product.categories?.name || "Bangles",
    });
    const pid = item.product_id || item.productId || item.id;
    navigate(pid ? `/product/${pid}` : "/product");
  };

  const showToast = (message, type = "info") => {
    setToast({ message: "", type: "" });
    setTimeout(() => setToast({ message, type }), 10);
  };

  useEffect(() => {
    setAdminNote(o.admin_notes || "");
  }, [o.admin_notes]);


  useEffect(() => {
    const existing = getExistingOrderAddress(o) || getExistingOrderAddress(order) || getExistingOrderAddress(currentOrder);
    if (isValidAddress(existing)) {
      setAddress(existing);
      return;
    }

    let isMounted = true;
    const fetchAddress = async () => {
      try {
        setAddressLoading(true);

        const targetAddressId = o?.address_id || order?.address_id || currentOrder?.address_id;
        const targetUserId = o?.user_id || order?.user_id || currentOrder?.user_id;

        // Tier 1: Try fetching by address_id if order has one
        if (targetAddressId) {
          const addrById = await orderService.getAddressById(targetAddressId);
          if (isMounted && isValidAddress(addrById)) {
            setAddress(addrById);
            setAddressLoading(false);
            return;
          }
        }

        // Tier 2: Try fetching by user_id
        if (targetUserId) {
          const userAddrs = await orderService.getAddresses(targetUserId);
          if (isMounted && userAddrs && userAddrs.length > 0) {
            const matched = (targetAddressId && userAddrs.find(a => String(a.address_id) === String(targetAddressId) || String(a.id) === String(targetAddressId)))
              || userAddrs.find(a => a.is_default)
              || userAddrs[0];
            if (isValidAddress(matched)) {
              setAddress(matched);
              setAddressLoading(false);
              return;
            }
          }

          // Fallback: Check users table
          try {
            const { data: userRec } = await supabase
              .from("users")
              .select("phone, name")
              .eq("id", targetUserId)
              .maybeSingle();
            if (isMounted && userRec) {
              setAddress((prev) => ({
                ...prev,
                full_name: prev?.full_name || userRec.name,
                phone_number: prev?.phone_number || userRec.phone,
              }));
            }
          } catch (uErr) {
            console.warn("Could not query user record:", uErr);
          }
        }

        if (isMounted && isValidAddress(o?.customer?.address)) {
          setAddress(parseAddressData(o.customer.address));
        }
      } catch (err) {
        console.error("Error fetching shipping address in Orderdetails:", err);
      } finally {
        if (isMounted) {
          setAddressLoading(false);
        }
      }
    };

    fetchAddress();

    return () => {
      isMounted = false;
    };
  }, [o?.id, o?.address_id, o?.user_id, o?.addresses, o?.shipping_address, o?.address, order, currentOrder]);

  const handleSaveNote = async () => {
    if (!o?.id) return;
    try {
      setSavingNote(true);
      await orderService.updateOrderNote(o.id, adminNote);
      showToast("Note saved successfully!", "success");
    } catch (err) {
      showToast("Failed to save note: " + err.message, "error");
    } finally {
      setSavingNote(false);
    }
  };

  const handlePrintInvoice = async () => {
    if (printing) return;
    try {
      setPrinting(true);
      // Immediately set printed state optimistically so green icon displays
      setInvoicePrinted(true);
      setCurrentOrder((prev) => ({ ...(prev || {}), invoice_printed: true }));
      await new Promise((res) => setTimeout(res, 250));
      window.print();
      // Mark as printed in Supabase
      if (o?.id) {
        await orderService.markInvoicePrinted(o.id);
      }
      showToast("Invoice printed successfully!", "success");
    } catch (err) {
      console.warn("Notice updating invoice printed in DB:", err);
      setInvoicePrinted(true);
    } finally {
      setTimeout(() => setPrinting(false), 1000);
    }
  };

  const fetchFreshOrder = async () => {
    if (!o?.id) return;
    try {
      const { data: refreshedOrder, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", o.id)
        .maybeSingle();
      if (!error && refreshedOrder) {
        const { data: items } = await supabase
          .from("order_items")
          .select("*, products(product_id, name, image_url, images, sku)")
          .eq("order_id", o.id);
        const enrichedItems = (items || []).map((it) => {
          const p = it.products;
          const img = it.image_url || p?.image_url || p?.images?.[0] || null;
          const skuVal = (it.sku && it.sku !== 'N/A') ? it.sku : (p?.sku || it.sku || null);
          return {
            ...it,
            image_url: img,
            sku: skuVal,
          };
        });
        const fullOrder = { ...refreshedOrder, order_items: enrichedItems };
        setCurrentOrder(fullOrder);
        if (setSelectedAdminOrder) setSelectedAdminOrder(fullOrder);
        return fullOrder;
      }
    } catch (err) {
      console.error("Error refetching order:", err);
    }
  };

  const handleRetryBooking = async () => {
    if (!o?.id) return;
    try {
      setRetryingBooking(true);
      const res = await icarryService.retryBooking(o.id);
      if (res && res.error) {
        showToast("Retry booking failed: " + res.error, "error");
      } else {
        showToast("Shipment booking retried successfully!", "success");
        await fetchFreshOrder();
      }
    } catch (err) {
      showToast("Failed to retry booking: " + err.message, "error");
    } finally {
      setRetryingBooking(false);
    }
  };

  const handlePrintLabel = async () => {
    if (!o?.id) return;
    // Open blank tab synchronously within user click event context to avoid browser popup blockers
    const win = window.open("", "_blank");
    try {
      setLoadingLabel(true);
      const res = await icarryService.label(o.id);
      const labelUrl =
        res?.shipment_label?.[0]?.url ||
        res?.shipment_label?.url ||
        res?.url;
      if (labelUrl) {
        if (win) {
          win.location.href = labelUrl;
        } else {
          window.location.href = labelUrl;
        }
      } else {
        if (win) win.close();
        showToast("No shipping label URL returned from carrier.", "warning");
      }
    } catch (err) {
      if (win) win.close();
      showToast("Failed to fetch shipping label: " + err.message, "error");
    } finally {
      setLoadingLabel(false);
    }
  };

  const executeCancelShipment = async () => {
    if (!o?.id) return;

    const isCod =
      (o?.payment || "").toString().toUpperCase() === "COD" ||
      (o?.payment_method || "").toString().toUpperCase() === "COD";

    const isOnline = !isCod && Boolean(
      o?.razorpay_payment_id ||
      o?.payment_id ||
      (o?.payment || "").toString().toUpperCase() === "PAID" ||
      (o?.payment || "").toString().toLowerCase().includes("razorpay") ||
      (o?.payment_method || "").toString().toLowerCase().includes("razorpay") ||
      (o?.payment_status || "").toString().toLowerCase() === "paid" ||
      !isCod
    );

    try {
      setCancellingShipment(true);

      // 1. If courier shipment was booked with iCarry, cancel with iCarry
      // Only attempt if there is an actual shipment/waybill ID — delivery_status alone is not enough
      const hasActualShipmentId = Boolean(
        o.shipment_id ||
        o.waybill ||
        o.tracking_number ||
        o.icarry_shipment_id ||
        o.icarry_order_id
      );

      if (hasActualShipmentId) {
        try {
          const res = await icarryService.cancel(o.id);
          if (res && res.skipped) {
            console.log("iCarry: No active shipment to cancel — skipping courier cancel.");
          } else if (res && res.error) {
            console.warn("iCarry shipment cancellation notice:", res.error);
          }
        } catch (shipErr) {
          console.warn("Could not cancel iCarry shipment:", shipErr);
        }
      }

      // 2. If online payment, process Razorpay refund
      if (isOnline) {
        try {
          const extraNotes = {};
          if (o.item_name) extraNotes.product_name = String(o.item_name).slice(0, 255);
          if (o.total_price) extraNotes.total_price = `₹${o.total_price}`;
          if (displayFullName) extraNotes.customer_name = String(displayFullName).slice(0, 255);
          if (resolvedAddress?.phone_number || resolvedAddress?.phone) {
            extraNotes.customer_phone = String(resolvedAddress.phone_number || resolvedAddress.phone).slice(0, 40);
          }

          const refundRes = await razorpayService.refundOrder(o.id, "Admin cancellation & refund", extraNotes);
          setCurrentOrder((prev) => ({
            ...prev,
            status: "Refund Completed",
            delivery_status: "Cancelled",
            payment_status: "refunded",
          }));
          showToast(
            `Order cancelled & refunded successfully.${refundRes?.refundId ? ` (Refund ID: ${refundRes.refundId})` : ""}`,
            "success"
          );
        } catch (refundErr) {
          console.error("Razorpay refund error:", refundErr);
          // If no payment ID on record, still allow cancellation
          if (refundErr?.message && refundErr.message.includes("does not have a Razorpay payment ID")) {
            await supabase
              .from("orders")
              .update({ status: "Cancelled", delivery_status: "Cancelled" })
              .eq("id", o.id);
            setCurrentOrder((prev) => ({
              ...prev,
              status: "Cancelled",
              delivery_status: "Cancelled",
            }));
            showToast("Order cancelled (No Razorpay payment ID found on record to refund).", "warning");
          } else {
            showToast("Refund failed: " + refundErr.message, "error");
            return;
          }
        }
      } else {
        // Standard cancellation for COD
        await supabase
          .from("orders")
          .update({
            status: "Cancelled",
            delivery_status: "Cancelled",
            payment_status: "cancelled",
          })
          .eq("id", o.id);
        setCurrentOrder((prev) => ({
          ...prev,
          status: "Cancelled",
          delivery_status: "Cancelled",
          payment_status: "cancelled",
        }));
        showToast("Shipment and order cancelled successfully.", "success");
      }
    } catch (err) {
      showToast("Failed to cancel: " + err.message, "error");
    } finally {
      // Refetch the order row on success/failure either way, so the panel always reflects true DB state
      await fetchFreshOrder();
      setCancellingShipment(false);
      setShowCancelModal(false);
    }
  };

  const ICARRY_STATUS_MAP = {
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

  const handleRefreshTracking = async (silentParam = false) => {
    if (!o?.id) return;
    const silent = silentParam === true;
    try {
      if (!silent) setTrackingLoading(true);
      const res = await icarryService.track(o.id);
      if (res && res.error) {
        if (!silent) showToast("iCarry tracking: " + res.error, "info");
      } else {
        const rawStatus =
          res?.shipment_status ||
          res?.current_status ||
          res?.delivery_status ||
          res?.status ||
          res?.tracking_status ||
          res?.status_code ||
          res?.data?.status;

        let mappedStatus = rawStatus;
        if (rawStatus !== null && rawStatus !== undefined && !isNaN(Number(rawStatus)) && Number(rawStatus) in ICARRY_STATUS_MAP) {
          mappedStatus = ICARRY_STATUS_MAP[Number(rawStatus)];
        }

        const updates = {};
        if (mappedStatus) {
          updates.delivery_status = String(mappedStatus);
          updates.icarry_status = String(mappedStatus);

          const sLower = String(mappedStatus).toLowerCase();
          if (sLower.includes("cancel") || sLower === "voided" || sLower === "7" || sLower === "16") {
            updates.status = "Cancelled";
            updates.delivery_status = "Cancelled";
          } else if (sLower === "delivered" || sLower === "21") {
            updates.status = "Delivered";
            updates.delivery_status = "Delivered";
            updates.delivered_at = new Date().toISOString();
          } else if (sLower === "shipped" || sLower === "3" || sLower === "in transit" || sLower === "out for delivery") {
            if (o.status !== "Delivered") {
              updates.status = "Shipped";
            }
          }
        }

        if (res?.courier_name && !o.courier_name) {
          updates.courier_name = res.courier_name;
        }
        if (res?.tracking_url && !o.tracking_url) {
          updates.tracking_url = res.tracking_url;
        }

        if (Object.keys(updates).length > 0) {
          try {
            await supabase
              .from("orders")
              .update(updates)
              .eq("id", o.id);
          } catch (dbErr) {
            console.warn("Could not save tracking status in DB:", dbErr);
          }
        }

        await fetchFreshOrder();
        if (!silent) {
          showToast(mappedStatus ? `iCarry status synced: ${mappedStatus}` : "iCarry shipment status synced successfully!", "success");
        }
      }
    } catch (err) {
      if (!silent) console.error("iCarry tracking error:", err);
      else console.warn("iCarry auto-tracking skipped (silent):", err?.message || err);
      await fetchFreshOrder();
      if (!silent) {
        showToast("iCarry sync: " + (err.message || "Failed contacting iCarry"), "warning");
      }
    } finally {
      if (!silent) setTrackingLoading(false);
    }
  };

  useEffect(() => {
    const hasWaybillOrShipment = Boolean(
      o?.waybill ||
      o?.shipment_id ||
      o?.icarry_awb ||
      o?.icarry_shipment_id ||
      o?.tracking_number
    );
    if (o?.id && hasWaybillOrShipment && o.delivery_status !== "Cancelled") {
      handleRefreshTracking(true);
    }
  }, [o?.id]);

  const orderItems = (o.order_items && o.order_items.length > 0) ? o.order_items : [{
    product_name: o.item_name || "Product",
    quantity: o.quantity || 1,
    price: o.total_price || 0,
    size: null,
    color: null,
    image_url: o.image_url || o.image || o.img || null,
    sku: o.sku || null,
    product_id: o.product_id || null
  }];

  const uniqueProducts = orderItems.length;
  const totalCount = orderItems.reduce((sum, item) => sum + (Number(item.quantity || item.qty || 1)), 0);

  // Real items subtotal calculated from individual line items
  const calculatedItemsSubtotal = orderItems.reduce(
    (sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || item.qty || 1)),
    0
  );

  const grandTotal = Number(o.total_price || 0);

  // Stored shipping / delivery fee on the order
  const storedShippingFee =
    o.shipping_fee !== undefined && o.shipping_fee !== null ? Number(o.shipping_fee) :
      o.shippingFee !== undefined && o.shippingFee !== null ? Number(o.shippingFee) :
        o.delivery_charge !== undefined && o.delivery_charge !== null ? Number(o.delivery_charge) :
          o.shipping_charge !== undefined && o.shipping_charge !== null ? Number(o.shipping_charge) :
            null;

  // Actual delivery fee
  const deliveryFee = storedShippingFee !== null && !isNaN(storedShippingFee)
    ? storedShippingFee
    : (grandTotal > calculatedItemsSubtotal && calculatedItemsSubtotal > 0
      ? grandTotal - calculatedItemsSubtotal
      : 0);

  // Items Subtotal: if items had valid prices use that, otherwise grandTotal - deliveryFee
  const itemsSubtotal = calculatedItemsSubtotal > 0 && calculatedItemsSubtotal !== grandTotal
    ? calculatedItemsSubtotal
    : (deliveryFee > 0 ? Math.max(0, grandTotal - deliveryFee) : grandTotal);

  // Dynamic order timeline based strictly on database status (only completed in green, real-time sync)
  const getTimelineSteps = () => {
    const rawStatus = (o?.status || "Pending").trim();
    const s = rawStatus.toLowerCase();
    const d = (o?.delivery_status || "").trim().toLowerCase();

    const orderPlacedDate = o.order_date
      ? new Date(o.order_date).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
      : "Recently placed";

    const isCod = (o.payment || "").toString().toUpperCase() !== "PAID" &&
      !o.payment_id &&
      !o.razorpay_payment_id;

    const isCancelled =
      s.includes("cancel") ||
      d.includes("cancel") ||
      d === "voided";

    if (s === "refund completed") {
      return [
        {
          label: "Order placed",
          date: orderPlacedDate,
          done: true,
          isCancelled: false
        },
        {
          label: "Order cancelled",
          date: "Order Cancelled",
          done: true,
          isCancelled: true
        },
        {
          label: "Refund completed",
          date: "Refund Processed to Source",
          done: true,
          isCancelled: false
        }
      ];
    }

    if (isCancelled) {
      const steps = [
        {
          label: "Order placed",
          date: orderPlacedDate,
          done: true,
          isCancelled: false
        },
        {
          label: "Order cancelled",
          date: "Order Cancelled",
          done: true,
          isCancelled: true
        }
      ];

      if (!isCod) {
        steps.push({
          label: "Refund",
          date: "3-5 business days",
          done: false,
          isCancelled: false
        });
      }

      return steps;
    }

    const isPlacedDone = true;
    const isConfirmedDone = [
      "confirmed", "processing", "packed", "shipped", "delivered", "returned"
    ].includes(s) || !!o.waybill || ["booked", "pending pickup", "shipped", "in transit", "out for delivery", "delivered"].some(x => d.includes(x));

    const isShippedDone = [
      "shipped", "delivered", "returned"
    ].includes(s) || ["shipped", "in transit", "out for delivery", "delivered"].some(x => d.includes(x));

    const isOutForDeliveryDone = d.includes("out for delivery") || d === "delivered" || s === "delivered";
    const isNdr = d.startsWith("ndr");
    const isDeliveredDone = ["delivered", "returned"].includes(s) || d === "delivered";

    const carrierInfo = o.courier_name || o.delivery_provider || "iCarry";

    const steps = [
      {
        label: "Order placed",
        date: orderPlacedDate,
        done: isPlacedDone,
        isCancelled: false
      },
      {
        label: "Order confirmed",
        date: isConfirmedDone
          ? (o.waybill ? `AWB: ${o.waybill}` : "Confirmed")
          : "Pending confirmation",
        done: isConfirmedDone,
        isCancelled: false
      },
      {
        label: "Shipped",
        date: isShippedDone
          ? `${carrierInfo}${o.waybill ? ` (${o.waybill})` : ""}`
          : (o.waybill || d === "booked" || d === "pending pickup"
            ? `Packed for ${carrierInfo}`
            : ""),
        done: isShippedDone,
        isCancelled: false
      },
      {
        label: "Out for delivery",
        date: isOutForDeliveryDone
          ? "Out for Delivery"
          : (isShippedDone ? `In transit with ${carrierInfo}` : ""),
        done: isOutForDeliveryDone,
        isCancelled: false
      }
    ];

    if (isNdr) {
      steps.push({
        label: "Delivery exception",
        date: o.delivery_status || "NDR",
        done: false,
        isWarning: true,
        isCancelled: false
      });
    }

    steps.push({
      label: "Delivered",
      date: isDeliveredDone
        ? (s === "returned" ? "Delivered to Customer" : "Delivered safely")
        : (o.estimated_delivery_date
          ? `Est: ${new Date(o.estimated_delivery_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
          : ""),
      done: isDeliveredDone,
      isCancelled: false
    });

    if (s === "returned" || d.includes("rto") || d === "returned") {
      steps.push({
        label: "Returned",
        date: "Returned to Origin",
        done: true,
        isCancelled: false
      });
    }

    return steps;
  };

  const isOrderCancelled =
    (o?.status || "").toLowerCase().includes("cancel") ||
    (o?.status || "").toLowerCase().includes("refund") ||
    (o?.delivery_status || "").toLowerCase().includes("cancel") ||
    (o?.delivery_status || "").toLowerCase() === "voided";

  const isDelivered =
    (o?.status || "").toLowerCase() === "delivered" ||
    (o?.delivery_status || "").toLowerCase() === "delivered";

  const isCodOrder =
    (o?.payment || "").toString().toUpperCase() === "COD" ||
    (o?.payment_method || "").toString().toUpperCase() === "COD";

  const hasOnlinePayment = !isCodOrder && Boolean(
    o?.razorpay_payment_id ||
    o?.payment_id ||
    (o?.payment || "").toString().toUpperCase() === "PAID" ||
    (o?.payment || "").toString().toLowerCase().includes("razorpay") ||
    (o?.payment_method || "").toString().toLowerCase().includes("razorpay") ||
    (o?.payment_status || "").toString().toLowerCase() === "paid" ||
    !isCodOrder
  );

  const timelineSteps = getTimelineSteps();

  const orderShortId = o.order_number || (o.id ? (String(o.id).length > 8 ? String(o.id).slice(-8).toUpperCase() : o.id) : "N/A");

  const resolvedAddress = parseAddressData(address) || getExistingOrderAddress(o);

  const displayFullName =
    resolvedAddress?.full_name ||
    resolvedAddress?.name ||
    resolvedAddress?.customer_name ||
    resolvedAddress?.recipient_name ||
    resolvedAddress?.receiver_name ||
    o.customer_name ||
    o.customer?.name ||
    "Customer";

  const displayLine1 =
    resolvedAddress?.address_line1 ||
    resolvedAddress?.address_line ||
    resolvedAddress?.line1 ||
    resolvedAddress?.flat ||
    resolvedAddress?.street ||
    resolvedAddress?.street_address ||
    resolvedAddress?.address ||
    o.address_line1 ||
    o.address_line ||
    "";

  const displayLine2 =
    resolvedAddress?.address_line2 ||
    resolvedAddress?.line2 ||
    resolvedAddress?.area ||
    resolvedAddress?.landmark ||
    o.address_line2 ||
    o.area ||
    "";

  const displayCity =
    resolvedAddress?.city ||
    resolvedAddress?.town ||
    resolvedAddress?.district ||
    o.city ||
    "";

  const displayState =
    resolvedAddress?.state ||
    resolvedAddress?.province ||
    resolvedAddress?.region ||
    o.state ||
    "";

  const displayPin =
    resolvedAddress?.postal_code ||
    resolvedAddress?.pincode ||
    resolvedAddress?.pinCode ||
    resolvedAddress?.zip ||
    resolvedAddress?.zipcode ||
    resolvedAddress?.postalCode ||
    o.postal_code ||
    o.pincode ||
    "";

  const displayCityStatePin = (() => {
    const loc = [displayCity, displayState].filter(Boolean).join(", ");
    if (loc && displayPin) return `${loc} — ${displayPin}`;
    if (loc) return loc;
    if (displayPin) return `PIN: ${displayPin}`;
    return "";
  })();

  const displayCountry =
    resolvedAddress?.country ||
    o.country ||
    "India";

  const displayPhone =
    resolvedAddress?.phone_number ||
    resolvedAddress?.phone ||
    resolvedAddress?.mobile ||
    resolvedAddress?.contact ||
    o.customer_phone ||
    o.phone ||
    o.phone_number ||
    o.customer?.phone ||
    "";

  const hasAddressInfo = Boolean(
    displayLine1 ||
    displayLine2 ||
    displayCity ||
    displayState ||
    displayPin ||
    (resolvedAddress && typeof resolvedAddress === "string" && resolvedAddress.trim().length > 0) ||
    (resolvedAddress && typeof resolvedAddress === "object" && Object.keys(resolvedAddress).length > 0)
  );

  const isInvoicePrinted = Boolean(
    invoicePrinted ||
    o?.invoice_printed === true ||
    o?.invoice_printed === "true" ||
    o?.invoice_printed === 1 ||
    order?.invoice_printed === true ||
    order?.invoice_printed === "true" ||
    order?.invoice_printed === 1 ||
    currentOrder?.invoice_printed === true ||
    currentOrder?.invoice_printed === "true" ||
    currentOrder?.invoice_printed === 1
  );

  return (
    <div className="od">
      {/* Header */}
      <div className="od__header">
        <div className="od__header-main">
          <div className="od__title-block">
            <div className="od__title">Order #{orderShortId}</div>
            <StatusBadge status={isOrderCancelled ? "Cancelled" : (o.delivery_status || o.status)} />
          </div>

          <div className="od__header-actions">
            <button
              className="od__btn-secondary"
              onClick={() => setShowInvoiceModal(true)}
            >
              <IconEye /> Preview Invoice
            </button>
            <button
              onClick={handlePrintInvoice}
              disabled={printing}
              className="od__btn-primary admin-btn-with-spinner"
            >
              {printing ? (
                <>
                  <span className="admin-btn-spinner" /> Printing...
                </>
              ) : isInvoicePrinted ? (
                <>
                  <IconCheck
                    size={16}
                    color="#22c55e"
                    stroke="#22c55e"
                    strokeWidth={3}
                    className="od__icon-printed-green"
                    style={{ color: '#22c55e', stroke: '#22c55e' }}
                  />
                  <span>Print Again (Printed)</span>
                </>
              ) : (
                <>
                  <IconPrinter />
                  <span>Print Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
        <p className="od__date-placed">
          <IconCalendar /> Placed on {o.order_date ? new Date(o.order_date).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
        </p>
      </div>

      {/* Top two-column: Customer + Shipping */}
      <div className="od__top-grid">
        {/* Customer Details */}
        <div className="od__card">
          <div className="od__card-title">Customer Details</div>
          <div className="od__info-grid">
            <span className="od__info-label">Customer Name</span>
            <span className="od__info-value">{o.customer?.name || "Unknown Customer"}</span>
            <span className="od__info-label">Phone</span>
            <span className="od__info-value">{o.customer?.phone || "N/A"}</span>
            <span className="od__info-label">Email</span>
            <span className="od__info-value od__info-value--wrap">{o.customer?.email || "N/A"}</span>
            <span className="od__info-label">Customer Since</span>
            <span className="od__info-value">
              {o.customer?.created_at ? new Date(o.customer.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
            </span>
            <span className="od__info-label">Total Products</span>
            <span className="od__info-value">{uniqueProducts} ({totalCount} {totalCount === 1 ? "item" : "items"})</span>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="od__card">
          <div className="od__card-title">
            <span>Shipping Address</span>
            <span className="od__address-badge"><IconPin /> Destination</span>
          </div>
          {addressLoading ? (
            <div className="skeleton-shimmer" style={{ width: '100%', height: '80px', borderRadius: '8px' }} />
          ) : hasAddressInfo ? (
            <>
              <div className="od__address-name">{displayFullName}</div>
              <div className="od__address-lines">
                {displayLine1 && <div>{displayLine1}</div>}
                {displayLine2 && <div>{displayLine2}</div>}
                {displayCityStatePin && <div>{displayCityStatePin}</div>}
                <div>{displayCountry}</div>
                {displayPhone && (
                  <div className="od__address-phone">
                    <IconPhone /> Phone: {displayPhone}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: '#888', fontSize: '13.5px', fontStyle: 'italic', padding: '12px 0' }}>
              No shipping address provided or found.
            </div>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="od__card od__card--section">
        <div className="od__card-title">
          <span>Ordered Items ({totalCount})</span>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>
            {uniqueProducts} unique {uniqueProducts === 1 ? 'product' : 'products'}
          </span>
        </div>
        <div className="od__items-list">
          {orderItems.map((item, idx) => {
            const rawImage =
              item.image_url ||
              item.image ||
              item.img ||
              item.products?.image_url ||
              item.products?.images?.[0] ||
              (item.product_id ? productImagesMap[String(item.product_id)] : null) ||
              (item.product_name ? productImagesMap[item.product_name.trim().toLowerCase()] : null) ||
              null;
            const image = (rawImage && typeof rawImage === 'string' && !rawImage.includes('bangle1'))
              ? rawImage
              : null;
            const isClickable = !!item.product_id;
            const resolvedSku =
              item.sku && item.sku !== 'N/A' && item.sku !== 'undefined' ? item.sku : null;

            return (
              <div
                key={idx}
                className={`od__item-row ${isClickable ? 'od__item-row--clickable' : ''}`}
                onClick={() => isClickable && handleItemClick(item)}
              >
                <div className="od__item-img">
                  {image ? (
                    <img
                      src={image}
                      alt={item.product_name || "Product"}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.od__item-fallback-icon');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : null}
                  <div
                    className="od__item-fallback-icon"
                    style={{
                      display: image ? 'none' : 'flex',
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      color: '#94a3b8'
                    }}
                  >
                    <IconPackage size={22} />
                  </div>
                </div>
                <div className="od__item-info">
                  <div className="od__item-name" style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{item.product_name}</span>
                    {resolvedSku ? (
                      <span
                        className="od__item-sku-tag"
                      >
                        SKU: {resolvedSku}
                      </span>
                    ) : (
                      <span
                        className="od__item-sku-tag"
                      >
                        SKU: N/A
                      </span>
                    )}
                    {isClickable && (
                      <span className="od__view-link" style={{ fontSize: '11px', color: '#8b0030', fontWeight: 'normal', flexShrink: 0 }}>
                        (View Product)
                      </span>
                    )}
                  </div>
                  <div className="od__item-sku" style={{ color: '#888', fontSize: '12.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>Order Ref: #{o.id?.slice(-8) || o.id}</span>
                    <span>·</span>
                    <span>Qty: {item.quantity || 1}</span>
                    {item.size && (
                      <>
                        <span>·</span>
                        <span>Size: {item.size}</span>
                      </>
                    )}
                    {item.color && (
                      <>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Color:
                          <span
                            style={{
                              display: 'inline-block',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: item.color,
                              border: '1px solid rgba(0,0,0,0.15)',
                              flexShrink: 0
                            }}
                          />
                          <span>{getColorName(item.color)}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="od__item-price" style={{ fontWeight: '600' }}>
                  ₹{Number(item.price || 0).toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="od__summary-card">
          <div className="od__summary-row">
            <span>Items Subtotal ({totalCount} {totalCount === 1 ? 'item' : 'items'})</span>
            <span style={{ fontWeight: '600', color: '#0f172a' }}>
              ₹{itemsSubtotal.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="od__summary-row">
            <span>Shipping & Delivery</span>
            {deliveryFee > 0 ? (
              <span style={{ fontWeight: '600', color: '#0f172a' }}>
                ₹{deliveryFee.toLocaleString('en-IN')}
              </span>
            ) : (
              <span style={{ color: '#16a34a', fontWeight: '600' }}>Free</span>
            )}
          </div>
          <div className="od__summary-row od__summary-row--total">
            <span>Total Amount</span>
            <span className="od__summary-total-val">
              ₹{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Payment + Update Status */}
      <div className="od__mid-grid">
        {/* Payment Details */}
        <div className="od__card">
          <div className="od__card-title">
            <span>Payment Details</span>
            <span
              style={{
                fontSize: '11.5px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: (o.payment || '').toUpperCase() === 'PAID' || o.payment_id || o.razorpay_payment_id ? '#dcfce7' : '#fef3c7',
                color: (o.payment || '').toUpperCase() === 'PAID' || o.payment_id || o.razorpay_payment_id ? '#15803d' : '#b45309',
                border: 'none'
              }}
            >
              {(o.payment || '').toUpperCase() === 'PAID' || o.payment_id || o.razorpay_payment_id ? (
                <>
                  <IconCheck size={11} /> PAID
                </>
              ) : (
                'PENDING'
              )}
            </span>
          </div>
          <div className="od__info-grid">
            <span className="od__info-label">Payment Method</span>
            <span className="od__info-value">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: (o.payment || '').toLowerCase().includes('razorpay') || o.payment_id ? '#eff6ff' : '#f8fafc',
                  color: (o.payment || '').toLowerCase().includes('razorpay') || o.payment_id ? '#1d4ed8' : '#334155',
                  border: 'none'
                }}
              >
                {o.payment || "Online Payment"}
              </span>
            </span>
            <span className="od__info-label">Total Amount</span>
            <span className="od__info-value" style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
              ₹{Number(o.total_price || 0).toLocaleString('en-IN')}
            </span>
            {(o.razorpay_payment_id || o.payment_id) && (
              <>
                <span className="od__info-label">Payment ID</span>
                <span className="od__info-value od__info-value--wrap" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                  {o.razorpay_payment_id || o.payment_id}
                </span>
              </>
            )}
            {(o.razorpay_order_id) && (
              <>
                <span className="od__info-label">Order Ref</span>
                <span className="od__info-value od__info-value--wrap" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                  {o.razorpay_order_id}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Logistics & Delivery */}
        <div className="od__card">
          <div className="od__card-title">Logistics & Delivery</div>
          <div className="od__info-grid">
            <span className="od__info-label">Carrier</span>
            <span className="od__info-value">{o.icarry_courier_name || o.courier_name || o.delivery_provider || "iCarry"}</span>
            <span className="od__info-label">iCarry Status</span>
            <span
              className="od__info-value"
              style={{
                fontWeight: '600',
                color:
                  (o.icarry_status || o.delivery_status) === 'Booked' || (o.icarry_status || o.delivery_status) === 'Delivered'
                    ? '#16a34a'
                    : (o.icarry_status || o.delivery_status) === 'Booking Failed' || (o.icarry_status || o.delivery_status) === 'Cancelled'
                      ? '#dc2626'
                      : (o.icarry_status || o.delivery_status)?.toUpperCase()?.startsWith('NDR')
                        ? '#ea580c'
                        : '#d97706'
              }}
            >
              {o.icarry_status || o.delivery_status || (o.waybill || o.icarry_awb ? "Booked" : "Pending Booking")}
            </span>
            {o.waybill && (
              <>
                <span className="od__info-label">AWB / Waybill</span>
                <span className="od__info-value">
                  {o.tracking_url ? (
                    <a
                      href={o.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#8b0030', textDecoration: 'underline', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {o.waybill} <IconExternalLink />
                    </a>
                  ) : (
                    <span>{o.waybill}</span>
                  )}
                </span>
              </>
            )}
            {o.tracking_url && (
              <>
                <span className="od__info-label">Tracking</span>
                <span className="od__info-value">
                  <a
                    href={o.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#C42049', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Track Package <IconExternalLink />
                  </a>
                </span>
              </>
            )}
            {o.shipment_id && (
              <>
                <span className="od__info-label">Shipment ID</span>
                <span className="od__info-value">{o.shipment_id}</span>
              </>
            )}
            {(o.delivery_status === 'Booking Failed' || o.shipment_error) && (
              <>
                <span className="od__info-label" style={{ color: '#dc2626', fontWeight: '600' }}>Shipment Error</span>
                <span className="od__info-value" style={{ color: '#dc2626', wordBreak: 'break-word', fontSize: '12.5px', background: '#fef2f2', padding: '6px 10px', borderRadius: '4px', border: 'none' }}>
                  {o.shipment_error || "Carrier booking failed. Please check address details and retry booking."}
                </span>
              </>
            )}
            {o.estimated_delivery_date && (
              <>
                <span className="od__info-label">Est. Delivery</span>
                <span className="od__info-value">
                  {new Date(o.estimated_delivery_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </>
            )}
          </div>

          {o.delivery_status?.toUpperCase()?.startsWith('NDR') && (
            <div style={{ marginTop: '12px', padding: '9px 12px', background: '#fffbeb', border: 'none', borderRadius: '6px', color: '#92400e', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconAlertTriangle size={15} />
              <span><strong>Delivery Exception (NDR):</strong> The carrier reported: <em>{o.delivery_status}</em>. Please review or coordinate with the customer.</span>
            </div>
          )}

          {o.delivery_status === 'Cancelled' && (
            <div style={{ marginTop: '12px', padding: '9px 12px', background: '#fef2f2', border: 'none', borderRadius: '6px', color: '#b91c1c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCross size={15} />
              <span><strong>Shipment Cancelled:</strong> The shipping order has been cancelled with the carrier.</span>
            </div>
          )}

          {/* Shipment Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
            {(!o.waybill && !o.icarry_awb && o.delivery_status !== 'Cancelled' && o.status !== 'Cancelled') && (
              <button
                onClick={handleRetryBooking}
                disabled={retryingBooking}
                className="od__btn-blue admin-btn-with-spinner"
              >
                {retryingBooking ? (
                  <>
                    <span className="admin-btn-spinner" /> Retrying Booking...
                  </>
                ) : (
                  <>
                    <IconSync size={13} /> {(o.delivery_status === 'Booking Failed' || o.shipment_error) ? 'Retry Booking' : 'Book with iCarry'}
                  </>
                )}
              </button>
            )}

            {o.waybill && o.delivery_status !== 'Cancelled' && (
              <button
                onClick={handlePrintLabel}
                disabled={loadingLabel}
                className="od__btn-blue admin-btn-with-spinner"
              >
                {loadingLabel ? (
                  <>
                    <span className="admin-btn-spinner" /> Loading Label...
                  </>
                ) : (
                  <>
                    <IconTag size={13} /> Print Label
                  </>
                )}
              </button>
            )}

            {(o.waybill || o.shipment_id || o.icarry_awb || o.icarry_shipment_id) && (
              <button
                type="button"
                onClick={() => handleRefreshTracking(false)}
                disabled={trackingLoading}
                className="od__btn-blue admin-btn-with-spinner"
                title="Check live delivery tracking update directly from iCarry"
              >
                {trackingLoading ? (
                  <>
                    <span className="admin-btn-spinner" /> Syncing iCarry...
                  </>
                ) : (
                  <>
                    <IconSync size={13} /> Sync iCarry
                  </>
                )}
              </button>
            )}

            {!isDelivered && !isOrderCancelled && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={cancellingShipment}
                className="od__btn-red admin-btn-with-spinner"
                title={hasOnlinePayment ? "Cancel order & refund customer via Razorpay" : "Cancel shipment & order"}
              >
                {cancellingShipment ? (
                  <>
                    <span className="admin-btn-spinner" /> {hasOnlinePayment ? "Cancelling & Refunding..." : "Cancelling..."}
                  </>
                ) : (
                  <>
                    <IconCross size={13} /> {hasOnlinePayment ? "Cancel and Refund" : "Cancel Shipment"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order Timeline */}
      <div className="od__card od__card--section">
        <div className="od__card-title">Order Timeline</div>
        <div className="od__timeline">
          {timelineSteps.map((step, i) => {
            const isDone = step.done;
            const isCancelled = step.isCancelled;
            const isWarning = step.isWarning;
            const nextStep = timelineSteps[i + 1];
            const isConnectorDone = isDone && nextStep?.done && !nextStep?.isCancelled;
            const isConnectorCancelled = isDone && nextStep?.isCancelled;

            return (
              <div key={i} className={`od__tl-step ${isCancelled ? "od__tl-step--cancelled" : ""}`}>
                {i < timelineSteps.length - 1 && (
                  <div
                    className={`od__tl-line ${isConnectorDone ? "od__tl-line--done" : ""} ${isConnectorCancelled ? "od__tl-line--cancelled" : ""}`}
                  />
                )}
                <div
                  className={`od__tl-circle ${isCancelled ? "od__tl-circle--cancelled" : isDone ? "od__tl-circle--done" : ""} ${isWarning ? "od__tl-circle--warning" : ""}`}
                >
                  {isCancelled ? (
                    <IconCross size={14} />
                  ) : isWarning ? (
                    <IconAlertTriangle size={14} />
                  ) : isDone ? (
                    <IconCheck size={14} />
                  ) : (
                    <span className="od__tl-num">{String(i + 1).padStart(2, "0")}</span>
                  )}
                </div>
                <div
                  className="od__tl-label"
                  style={{
                    color: isCancelled ? "#dc2626" : isWarning ? "#b45309" : undefined,
                    fontWeight: isCancelled ? "700" : undefined
                  }}
                >
                  {step.label}
                </div>
                <div
                  className="od__tl-date"
                  style={{
                    color: isCancelled ? "#ef4444" : isWarning ? "#b45309" : undefined,
                    fontWeight: isCancelled ? "600" : undefined
                  }}
                >
                  {step.date}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Notes */}
      {/* <div className="od__card od__card--section">
        <div className="od__card-title">Admin Notes</div>
        <textarea
          className="od__admin-notes"
          placeholder="Add a private note about this order (not visible to customer)..."
          value={adminNote}
          onChange={e => setAdminNote(e.target.value)}
          rows={5}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            onClick={handleSaveNote}
            disabled={savingNote}
            className="admin-btn-with-spinner"
            style={{
              backgroundColor: 'var(--admin-primary, #002277)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 20px',
              cursor: savingNote ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              opacity: savingNote ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {savingNote ? (
              <>
                <span className="admin-btn-spinner" /> Saving...
              </>
            ) : (
              'Save Note'
            )}
          </button>
        </div>
      </div> */}


      {/* Invoice Preview Modal — Teleported to document.body for full-screen centering */}
      {showInvoiceModal && typeof document !== "undefined" && createPortal(
        <div className="inv__modal-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="inv__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inv__modal-header">
              <div>
                <h3 className="inv__modal-title">Invoice Preview (4" × 6")</h3>
                <p className="inv__modal-subtitle">
                  Order #{String(o.id).slice(-8).toUpperCase()} · 100 × 150 mm
                </p>
              </div>
              <button
                className="inv__modal-close"
                onClick={() => setShowInvoiceModal(false)}
                aria-label="Close invoice preview"
              >
                <IconCross size={16} />
              </button>
            </div>

            <div className="inv__modal-body">
              <ThermalInvoice order={o} address={resolvedAddress || address} isPreview={true} />
            </div>

            <div className="inv__modal-footer">
              <button
                className="inv__modal-close-btn"
                onClick={() => setShowInvoiceModal(false)}
              >
                Close
              </button>
              <button
                className="inv__modal-print-btn"
                onClick={() => {
                  handlePrintInvoice();
                }}
                disabled={printing}
              >
                {printing ? (
                  <>
                    <span className="admin-btn-spinner" /> Printing...
                  </>
                ) : isInvoicePrinted ? (
                  <>
                    <IconCheck
                      size={16}
                      color="#22c55e"
                      stroke="#22c55e"
                      strokeWidth={3}
                      className="od__icon-printed-green"
                      style={{ color: '#22c55e', stroke: '#22c55e' }}
                    />
                    <span>Print Again (Printed)</span>
                  </>
                ) : (
                  <>
                    <IconPrinter size={14} />
                    <span>Print Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Thermal Invoice container for print — teleported to document.body */}
      {typeof document !== "undefined" && createPortal(
        <div className="thermal-print-area">
          <ThermalInvoice ref={invoiceRef} order={o} address={resolvedAddress || address} />
        </div>,
        document.body
      )}

      {/* Centered Minimal Cancellation & Refund Modal */}
      {showCancelModal && typeof document !== "undefined" && createPortal(
        <div
          className="admin-cancel-modal-overlay"
          onClick={() => !cancellingShipment && setShowCancelModal(false)}
        >
          <div
            className="admin-cancel-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-cancel-modal-header">
              <div className="admin-cancel-modal-title-wrap">
                <span className="admin-cancel-modal-icon-badge">
                  <IconAlertTriangle size={18} />
                </span>
                <div>
                  <h3 className="admin-cancel-modal-title">
                    {hasOnlinePayment ? "Cancel Order & Refund" : "Cancel Shipment"}
                  </h3>
                  <p className="admin-cancel-modal-subtitle">
                    Order #{String(o.id || o.order_id || "").slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="admin-cancel-modal-close-btn"
                onClick={() => !cancellingShipment && setShowCancelModal(false)}
                disabled={cancellingShipment}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="admin-cancel-modal-body">
              <p className="admin-cancel-modal-msg">
                {hasOnlinePayment
                  ? "Are you sure you want to cancel this order and process a full refund to the customer?"
                  : "Are you sure you want to cancel this order and its active shipment with iCarry?"}
              </p>

              <div className="admin-cancel-modal-bullets">
                {hasOnlinePayment ? (
                  <>
                    <div className="admin-cancel-bullet-item">
                      <span className="admin-cancel-bullet-dot">•</span>
                      <span>The full payment of <strong>₹{o.total_price || 0}</strong> will be refunded to customer's original payment method via Razorpay.</span>
                    </div>
                    <div className="admin-cancel-bullet-item">
                      <span className="admin-cancel-bullet-dot">•</span>
                      <span>Any active courier booking with iCarry will also be cancelled.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="admin-cancel-bullet-item">
                      <span className="admin-cancel-bullet-dot">•</span>
                      <span>The shipment with iCarry courier will be cancelled.</span>
                    </div>
                    <div className="admin-cancel-bullet-item">
                      <span className="admin-cancel-bullet-dot">•</span>
                      <span>Order and delivery status will be marked as Cancelled.</span>
                    </div>
                  </>
                )}
              </div>

              <p className="admin-cancel-modal-warning-text">
                This action is permanent and cannot be undone.
              </p>
            </div>

            <div className="admin-cancel-modal-footer">
              <button
                type="button"
                className="admin-cancel-btn-cancel"
                onClick={() => setShowCancelModal(false)}
                disabled={cancellingShipment}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="admin-cancel-btn-confirm"
                onClick={executeCancelShipment}
                disabled={cancellingShipment}
              >
                {cancellingShipment ? (
                  <>
                    <span className="admin-btn-spinner" /> Processing...
                  </>
                ) : (
                  hasOnlinePayment ? "Confirm & Refund" : "Confirm Cancel"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />
    </div>
  );
};

export default OrderDetails;