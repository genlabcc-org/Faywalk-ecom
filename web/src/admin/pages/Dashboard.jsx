import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { productService } from "../../services/productService";
import { useAdminData } from "../../hooks/useAdminData";
import { Routes, Route, Link, useNavigate, useLocation, Navigate, useSearchParams } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import { getUserInitials } from "../../utils/avatarUtils";
import { authService } from "../../services/authService";
import LogoutModal from "../../components/LogoutModal";
import "./Dashboard.css";


import dashboardIcon from "../../assets/admin/Home.png";
import productIcon from "../../assets/admin/product.png";
import categoryIcon from "../../assets/admin/category.png";
import orderIcon from "../../assets/admin/order.png";
import customerIcon from "../../assets/admin/customer.png";
import bannerIcon from "../../assets/admin/banner.png";
import analyticsIcon from "../../assets/admin/analytics.png";
import settingsIcon from "../../assets/admin/settings.png";
import searchIcon from "../../assets/admin/search.png";
import dropdownIcon from "../../assets/admin/dropdown.png";

import AddProduct from "./addproduct";
import ProductList from "./productlist";

import AddCategory from "./addcategory";
import SubCategoryForm from "./cat/FormCategory";
import SubCategory from "./cat/SubCategory";



import CategoryList from "./categorylist";
import AllOrders from "./Allorders";
import OrderDetails from "./Orderdetails";
import AllCustomers from "./Allcustomers";
import CustomerDetails from "./Customerdetails";
import AddBanner from "./Addbanner";
import BannerList from "./Bannerlist";
import Analytics from "./Analytics";
import Shipping from "./Shipping";
import AdminAccount from "./Adminaccount";
import DangerZone from "./Dangerzone";
import Invoices from "./Invoices";
import TopBarSettings from "./TopBarSettings";
import CouponManagement from "./CouponManagement";

// ── Icons ───────────────────────────────────────────────────────
const StatIcon = ({ type }) => {
  const icons = {
    orders: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    revenue: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    customers: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    pending: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  };
  return icons[type] || null;
};

const ArrowUp = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>;
const ArrowDown = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>;
const ChevronDown = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
const ChevronUp = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>;

const HamburgerIcon = ({ open }) =>
  open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );

// ── Menu Config ─────────────────────────────────────────────────
const menuItems = [
  { id: "dashboard", label: "Dashboard", path: "/admin" },
  { id: "product", label: "Products", path: "/admin/products" },
  {
    id: "category", label: "Category", path: "/admin/categories", children: [
      { label: "All Categories", path: "/admin/categories" },
      { label: "Add Category", path: "/admin/categories/add" },
    ]
  },
  { id: "order", label: "Orders", path: "/admin/orders" },
  { id: "customer", label: "Customers", path: "/admin/customers" },
  { id: "coupons", label: "Coupons Management", path: "/admin/coupons" },
  {
    id: "banner", label: "Banner & Content", path: "/admin/banners", children: [
      { label: "All Banners", path: "/admin/banners" },
      { label: "Add Banner", path: "/admin/banners/add" },
    ]
  },
  // { id: "analytics", label: "Analytics", path: "/admin/analytics" },
  { id: "shipping", label: "Shipping", path: "/admin/shipping" },
  { id: "topbar", label: "TopBar Content", path: "/admin/topbar" },
  {
    id: "settings", label: "Settings", path: "/admin/account", children: [
      { label: "Admin Account", path: "/admin/account" },
      { label: "Danger Zone", path: "/admin/danger" },
    ]
  },
];

const sidebarIcons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  product: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  category: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  order: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  customer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  coupons: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  banner: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  shipping: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  topbar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="6" y1="6.5" x2="14" y2="6.5" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const HIDE_ADD_PRODUCT_PATHS = [
  "/admin/categories", "/admin/categories/add", "/admin/products/add", "/admin/products/add-multiple", "/admin/products/edit-multiple",
  "/admin/orders", "/admin/orders/detail", "/admin/invoices",
  "/admin/customers", "/admin/customers/detail",
  "/admin/banners", "/admin/banners/add", "/admin/topbar", "/admin/coupons", "/admin/analytics",
  "/admin/store", "/admin/contact", "/admin/shipping", "/admin/payment",
  "/admin/account", "/admin/notification", "/admin/policies", "/admin/danger"
];

// ── Sub-Components ──────────────────────────────────────────────
const StatCard = ({ label, value, trend, trendLabel, subtext, showTrend = true, loading, onClick }) => {
  if (loading) {
    return (
      <div className="dc__stat-card skeleton-shimmer" style={{ minHeight: '136px', opacity: 0.85 }} />
    );
  }

  return (
    <div className="dc__stat-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="dc__stat-header">
        <span className="dc__stat-label">{label}</span>
        <span className="dc__stat-arrow-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </span>
      </div>

      <div className="dc__stat-body">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="dc__stat-value">{value}</div>
          {subtext && <div className="dc__stat-subtext">{subtext}</div>}
        </div>
        {showTrend && trend && (
          <div className="dc__stat-trend-wrap">
            <div className="dc__stat-trend-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
              <span>{trend}</span>
            </div>
            <div className="dc__stat-sub-dropdown">
              <span>{trendLabel || "From last week"}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getSmoothSplinePath(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const isCancelledOrRefunded = (order) => {
  if (!order) return false;
  const s = String(order.status || "").toLowerCase().trim();
  const p = String(order.payment_status || "").toLowerCase().trim();
  const d = String(order.delivery_status || "").toLowerCase().trim();
  return (
    s.includes("cancel") ||
    s.includes("refund") ||
    s.includes("return") ||
    p === "refunded" ||
    p === "refund_initiated" ||
    p === "cancelled" ||
    d.includes("cancel") ||
    d.includes("return")
  );
};

const TotalCustomersChart = ({ orders = [], customers = [], loading = false }) => {
  const [timeFilter, setTimeFilter] = useState("This Week");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute real data based on timeFilter
  const chartData = useMemo(() => {
    const now = new Date();

    const getOrderDate = (item) => {
      const val = item?.order_date || item?.created_at;
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const getCancelDate = (item) => {
      const val = item?.updated_at || item?.order_date || item?.created_at;
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    let buckets = [];
    let periodTotalSale = 0;
    let periodNetRev = 0;
    let periodCancelledRev = 0;
    let prevPeriodTotalSale = 0;
    let prevPeriodNetRev = 0;
    let prevPeriodCancelledRev = 0;
    let periodCust = 0;
    let prevPeriodCust = 0;
    let periodLabel = "vs. Previous Period";

    if (timeFilter === "Today") {
      periodLabel = "vs. Yesterday";
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startYesterday = new Date(startToday);
      startYesterday.setDate(startYesterday.getDate() - 1);
      const endYesterday = new Date(endToday);
      endYesterday.setDate(endYesterday.getDate() - 1);

      const labels = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM", "11 PM"];
      const hourRanges = [4, 8, 12, 16, 20, 23, 24];
      buckets = labels.map((l) => ({
        label: l,
        rev: 0,
        totalSale: 0,
        cancelledRev: 0,
        cust: 0,
        orders: 0,
        cancelledOrders: 0,
      }));

      orders.forEach((o) => {
        const d = getOrderDate(o);
        if (!d) return;
        const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
        const price = isNaN(val) ? 0 : val;
        const isCancelled = isCancelledOrRefunded(o);

        if (d >= startToday && d <= endToday) {
          periodTotalSale += price;
          const h = d.getHours();
          const bIdx = hourRanges.findIndex((limit) => h < limit);
          const safeIdx = bIdx >= 0 ? bIdx : buckets.length - 1;
          buckets[safeIdx].totalSale += price;
          buckets[safeIdx].orders += 1;
          if (!isCancelled) {
            periodNetRev += price;
          }
        } else if (d >= startYesterday && d <= endYesterday) {
          prevPeriodTotalSale += price;
          if (!isCancelled) {
            prevPeriodNetRev += price;
          }
        }

        if (isCancelled) {
          const dc = getCancelDate(o) || d;
          if (dc >= startToday && dc <= endToday) {
            periodCancelledRev += price;
            const h = dc.getHours();
            const bIdx = hourRanges.findIndex((limit) => h < limit);
            const safeIdx = bIdx >= 0 ? bIdx : buckets.length - 1;
            buckets[safeIdx].cancelledRev += price;
            buckets[safeIdx].cancelledOrders += 1;
          } else if (dc >= startYesterday && dc <= endYesterday) {
            prevPeriodCancelledRev += price;
          }
        }
      });

      customers.forEach((c) => {
        const d = getOrderDate(c);
        if (!d) return;
        if (d >= startToday && d <= endToday) {
          periodCust += 1;
          const h = d.getHours();
          const bIdx = hourRanges.findIndex((limit) => h < limit);
          const safeIdx = bIdx >= 0 ? bIdx : buckets.length - 1;
          buckets[safeIdx].cust += 1;
        } else if (d >= startYesterday && d <= endYesterday) {
          prevPeriodCust += 1;
        }
      });
    } else if (timeFilter === "This Week") {
      periodLabel = "vs. Last Week";
      const currentDay = (now.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
      const startThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay, 0, 0, 0, 0);
      const endThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay + 6, 23, 59, 59, 999);
      const startLastWeek = new Date(startThisWeek);
      startLastWeek.setDate(startLastWeek.getDate() - 7);
      const endLastWeek = new Date(endThisWeek);
      endLastWeek.setDate(endLastWeek.getDate() - 7);

      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      buckets = labels.map((l) => ({
        label: l,
        rev: 0,
        totalSale: 0,
        cancelledRev: 0,
        cust: 0,
        orders: 0,
        cancelledOrders: 0,
      }));

      orders.forEach((o) => {
        const d = getOrderDate(o);
        if (!d) return;
        const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
        const price = isNaN(val) ? 0 : val;
        const isCancelled = isCancelledOrRefunded(o);

        if (d >= startThisWeek && d <= endThisWeek) {
          periodTotalSale += price;
          const dayIdx = (d.getDay() + 6) % 7;
          buckets[dayIdx].totalSale += price;
          buckets[dayIdx].orders += 1;
          if (!isCancelled) {
            periodNetRev += price;
          }
        } else if (d >= startLastWeek && d <= endLastWeek) {
          prevPeriodTotalSale += price;
          if (!isCancelled) {
            prevPeriodNetRev += price;
          }
        }

        if (isCancelled) {
          const dc = getCancelDate(o) || d;
          if (dc >= startThisWeek && dc <= endThisWeek) {
            periodCancelledRev += price;
            const dayIdx = (dc.getDay() + 6) % 7;
            buckets[dayIdx].cancelledRev += price;
            buckets[dayIdx].cancelledOrders += 1;
          } else if (dc >= startLastWeek && dc <= endLastWeek) {
            prevPeriodCancelledRev += price;
          }
        }
      });

      customers.forEach((c) => {
        const d = getOrderDate(c);
        if (!d) return;
        if (d >= startThisWeek && d <= endThisWeek) {
          periodCust += 1;
          const dayIdx = (d.getDay() + 6) % 7;
          buckets[dayIdx].cust += 1;
        } else if (d >= startLastWeek && d <= endLastWeek) {
          prevPeriodCust += 1;
        }
      });
    } else if (timeFilter === "Last 7 Days") {
      periodLabel = "vs. Prev 7 Days";
      const daysList = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
        const dayLabel = i === 0 ? "Today" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        daysList.push({ date: d, label: dayLabel });
      }

      buckets = daysList.map((d) => ({
        label: d.label,
        rev: 0,
        totalSale: 0,
        cancelledRev: 0,
        cust: 0,
        orders: 0,
        cancelledOrders: 0,
      }));

      const start7 = new Date(daysList[0].date);
      const end7 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startPrev7 = new Date(start7);
      startPrev7.setDate(startPrev7.getDate() - 7);
      const endPrev7 = new Date(start7);
      endPrev7.setMilliseconds(-1);

      orders.forEach((o) => {
        const d = getOrderDate(o);
        if (!d) return;
        const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
        const price = isNaN(val) ? 0 : val;
        const isCancelled = isCancelledOrRefunded(o);

        if (d >= start7 && d <= end7) {
          periodTotalSale += price;
          const diffDays = Math.floor((d.getTime() - start7.getTime()) / (1000 * 60 * 60 * 24));
          const idx = Math.min(Math.max(diffDays, 0), buckets.length - 1);
          buckets[idx].totalSale += price;
          buckets[idx].orders += 1;
          if (!isCancelled) {
            periodNetRev += price;
          }
        } else if (d >= startPrev7 && d <= endPrev7) {
          prevPeriodTotalSale += price;
          if (!isCancelled) {
            prevPeriodNetRev += price;
          }
        }

        if (isCancelled) {
          const dc = getCancelDate(o) || d;
          if (dc >= start7 && dc <= end7) {
            periodCancelledRev += price;
            const diffDays = Math.floor((dc.getTime() - start7.getTime()) / (1000 * 60 * 60 * 24));
            const idx = Math.min(Math.max(diffDays, 0), buckets.length - 1);
            buckets[idx].cancelledRev += price;
            buckets[idx].cancelledOrders += 1;
          } else if (dc >= startPrev7 && dc <= endPrev7) {
            prevPeriodCancelledRev += price;
          }
        }
      });

      customers.forEach((c) => {
        const d = getOrderDate(c);
        if (!d) return;
        if (d >= start7 && d <= end7) {
          periodCust += 1;
          const diffDays = Math.floor((d.getTime() - start7.getTime()) / (1000 * 60 * 60 * 24));
          const idx = Math.min(Math.max(diffDays, 0), buckets.length - 1);
          buckets[idx].cust += 1;
        } else if (d >= startPrev7 && d <= endPrev7) {
          prevPeriodCust += 1;
        }
      });
    } else if (timeFilter === "This Month") {
      periodLabel = "vs. Last Month";
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const labels = ["1-7", "8-14", "15-21", "22-28", "29+"];
      buckets = labels.map((l) => ({
        label: l,
        rev: 0,
        totalSale: 0,
        cancelledRev: 0,
        cust: 0,
        orders: 0,
        cancelledOrders: 0,
      }));

      orders.forEach((o) => {
        const d = getOrderDate(o);
        if (!d) return;
        const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
        const price = isNaN(val) ? 0 : val;
        const isCancelled = isCancelledOrRefunded(o);

        if (d >= startMonth && d <= endMonth) {
          periodTotalSale += price;
          const dayNum = d.getDate();
          const bIdx = Math.min(Math.floor((dayNum - 1) / 7), 4);
          buckets[bIdx].totalSale += price;
          buckets[bIdx].orders += 1;
          if (!isCancelled) {
            periodNetRev += price;
          }
        } else if (d >= startLastMonth && d <= endLastMonth) {
          prevPeriodTotalSale += price;
          if (!isCancelled) {
            prevPeriodNetRev += price;
          }
        }

        if (isCancelled) {
          const dc = getCancelDate(o) || d;
          if (dc >= startMonth && dc <= endMonth) {
            periodCancelledRev += price;
            const dayNum = dc.getDate();
            const bIdx = Math.min(Math.floor((dayNum - 1) / 7), 4);
            buckets[bIdx].cancelledRev += price;
            buckets[bIdx].cancelledOrders += 1;
          } else if (dc >= startLastMonth && dc <= endLastMonth) {
            prevPeriodCancelledRev += price;
          }
        }
      });

      customers.forEach((c) => {
        const d = getOrderDate(c);
        if (!d) return;
        if (d >= startMonth && d <= endMonth) {
          periodCust += 1;
          const dayNum = d.getDate();
          const bIdx = Math.min(Math.floor((dayNum - 1) / 7), 4);
          buckets[bIdx].cust += 1;
        } else if (d >= startLastMonth && d <= endLastMonth) {
          prevPeriodCust += 1;
        }
      });
    } else if (timeFilter === "This Year") {
      periodLabel = "vs. Last Year";
      const startYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const endYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      const startLastYear = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      const endLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

      const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      buckets = labels.map((l) => ({
        label: l,
        rev: 0,
        totalSale: 0,
        cancelledRev: 0,
        cust: 0,
        orders: 0,
        cancelledOrders: 0,
      }));

      orders.forEach((o) => {
        const d = getOrderDate(o);
        if (!d) return;
        const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
        const price = isNaN(val) ? 0 : val;
        const isCancelled = isCancelledOrRefunded(o);

        if (d >= startYear && d <= endYear) {
          periodTotalSale += price;
          const m = d.getMonth();
          buckets[m].totalSale += price;
          buckets[m].orders += 1;
          if (!isCancelled) {
            periodNetRev += price;
          }
        } else if (d >= startLastYear && d <= endLastYear) {
          prevPeriodTotalSale += price;
          if (!isCancelled) {
            prevPeriodNetRev += price;
          }
        }

        if (isCancelled) {
          const dc = getCancelDate(o) || d;
          if (dc >= startYear && dc <= endYear) {
            periodCancelledRev += price;
            const m = dc.getMonth();
            buckets[m].cancelledRev += price;
            buckets[m].cancelledOrders += 1;
          } else if (dc >= startLastYear && dc <= endLastYear) {
            prevPeriodCancelledRev += price;
          }
        }
      });

      customers.forEach((c) => {
        const d = getOrderDate(c);
        if (!d) return;
        if (d >= startYear && d <= endYear) {
          periodCust += 1;
          const m = d.getMonth();
          buckets[m].cust += 1;
        } else if (d >= startLastYear && d <= endLastYear) {
          prevPeriodCust += 1;
        }
      });
    } else {
      // "All Time"
      periodLabel = "All-Time Overview";
      const months = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          year: d.getFullYear(),
          month: d.getMonth(),
          label: d.toLocaleDateString("en-IN", { month: "short" })
        });
      }
      buckets = months.map((m) => ({
        label: m.label,
        rev: 0,
        totalSale: 0,
        cancelledRev: 0,
        cust: 0,
        orders: 0,
        cancelledOrders: 0,
      }));

      orders.forEach((o) => {
        const d = getOrderDate(o);
        if (!d) return;
        const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
        const price = isNaN(val) ? 0 : val;
        const isCancelled = isCancelledOrRefunded(o);

        periodTotalSale += price;
        const mIdx = months.findIndex((m) => m.year === d.getFullYear() && m.month === d.getMonth());
        if (mIdx >= 0) {
          buckets[mIdx].totalSale += price;
          buckets[mIdx].orders += 1;
        }
        if (!isCancelled) {
          periodNetRev += price;
        }

        if (isCancelled) {
          const dc = getCancelDate(o) || d;
          periodCancelledRev += price;
          const mdcIdx = months.findIndex((m) => m.year === dc.getFullYear() && m.month === dc.getMonth());
          if (mdcIdx >= 0) {
            buckets[mdcIdx].cancelledRev += price;
            buckets[mdcIdx].cancelledOrders += 1;
          }
        }
      });

      customers.forEach((c) => {
        const d = getOrderDate(c);
        if (!d) return;
        periodCust += 1;
        const mIdx = months.findIndex((m) => m.year === d.getFullYear() && m.month === d.getMonth());
        if (mIdx >= 0) {
          buckets[mIdx].cust += 1;
        }
      });
    }

    // Net Revenue: decreased if order is cancelled and refunded
    buckets.forEach((b) => {
      b.rev = Math.max(0, b.totalSale - b.cancelledRev);
    });

    const totalNetRev = Math.max(0, periodNetRev);
    const prevTotalNetRev = Math.max(0, prevPeriodNetRev);

    // Growth calculation based on net revenue
    let growthRate = "0%";
    let isGrowthPositive = true;
    if (prevTotalNetRev > 0) {
      const pct = ((totalNetRev - prevTotalNetRev) / prevTotalNetRev) * 100;
      isGrowthPositive = pct >= 0;
      growthRate = `${Math.abs(pct).toFixed(1)}%`;
    } else if (totalNetRev > 0) {
      growthRate = "100%";
      isGrowthPositive = true;
    }

    // Dynamic scale ceiling calculations covering max of Net Revenue and Cancelled/Refund amount
    const rawMaxRev = Math.max(
      ...buckets.map((b) => Math.max(b.rev, b.cancelledRev || 0, b.totalSale || 0)),
      0
    );
    const rawMaxCust = Math.max(...buckets.map((b) => b.cust), 0);

    const ceilRev = rawMaxRev <= 0
      ? 1000
      : rawMaxRev <= 2000
        ? Math.ceil(rawMaxRev / 500) * 500
        : rawMaxRev <= 10000
          ? Math.ceil(rawMaxRev / 2000) * 2000
          : Math.ceil(rawMaxRev / 5000) * 5000;

    const ceilCust = rawMaxCust <= 0
      ? 10
      : Math.max(Math.ceil(rawMaxCust * 1.25), 4);

    const padL = 50;
    const padR = 40;
    const padT = 30;
    const padB = 30;
    const chartW = 520 - padL - padR; // 430
    const chartH = 180 - padT - padB; // 120

    const ptsRev = buckets.map((b, idx) => {
      const ratio = ceilRev > 0 ? b.rev / ceilRev : 0;
      const x = padL + (idx / Math.max(buckets.length - 1, 1)) * chartW;
      const y = padT + chartH - ratio * chartH;
      return { x, y: Number.isFinite(y) ? y : padT + chartH, ...b };
    });

    const ptsCancelled = buckets.map((b, idx) => {
      const ratio = ceilRev > 0 ? b.cancelledRev / ceilRev : 0;
      const x = padL + (idx / Math.max(buckets.length - 1, 1)) * chartW;
      const y = padT + chartH - ratio * chartH;
      return { x, y: Number.isFinite(y) ? y : padT + chartH, ...b };
    });

    const ptsCust = buckets.map((b, idx) => {
      const ratio = ceilCust > 0 ? b.cust / ceilCust : 0;
      const x = padL + (idx / Math.max(buckets.length - 1, 1)) * chartW;
      const y = padT + chartH - ratio * chartH;
      return { x, y: Number.isFinite(y) ? y : padT + chartH, ...b };
    });

    let bestIdx = 0;
    let highVal = -1;
    buckets.forEach((b, idx) => {
      if (b.rev > highVal) {
        highVal = b.rev;
        bestIdx = idx;
      }
    });

    const highlightPt = ptsRev[bestIdx] || ptsRev[0];
    const revPath = getSmoothSplinePath(ptsRev);
    const cancelledPath = getSmoothSplinePath(ptsCancelled);
    const custPath = getSmoothSplinePath(ptsCust);

    const formatAxisCurrency = (val) => {
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
      return `₹${Math.round(val)}`;
    };

    return {
      buckets,
      ptsRev,
      ptsCancelled,
      ptsCust,
      revPath,
      cancelledPath,
      custPath,
      totalRev: totalNetRev,
      totalGrossRev: periodTotalSale,
      totalCancelledRev: periodCancelledRev,
      totalCust: periodCust,
      growthRate,
      isGrowthPositive,
      periodLabel,
      highlightPt,
      ceilRev,
      ceilCust,
      formatAxisCurrency,
      padL,
      padR,
      chartW,
    };
  }, [orders, customers, timeFilter]);

  const activePoint = hoveredIdx !== null ? chartData.ptsRev[hoveredIdx] : chartData.highlightPt;
  const activeCancelledPoint = hoveredIdx !== null ? chartData.ptsCancelled[hoveredIdx] : null;
  const activeCustPoint = hoveredIdx !== null ? chartData.ptsCust[hoveredIdx] : null;

  return (
    <div className="dc__card">
      <div className="dc__card-header">
        <h2 className="dc__card-title">Revenue & Customers</h2>

        {/* Real Working Time Filter Dropdown */}
        <div className="dc__time-filter-wrap" ref={dropdownRef}>
          <button
            type="button"
            className="dc__time-pill"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            <span>{timeFilter}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isDropdownOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="dc__time-dropdown-menu">
              {["Today", "This Week", "Last 7 Days", "This Month", "This Year", "All Time"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`dc__time-dropdown-item ${timeFilter === opt ? "dc__time-dropdown-item--active" : ""}`}
                  onClick={() => {
                    setTimeFilter(opt);
                    setIsDropdownOpen(false);
                    setHoveredIdx(null);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dc__metric-row">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className="dc__metric-value">₹{chartData.totalRev.toLocaleString("en-IN")}</span>
          <div className="dc__metric-sub-row">
            <span className="dc__totalsale-subtext">
              Total Sale: ₹{chartData.totalGrossRev.toLocaleString("en-IN")}
            </span>
            {chartData.totalCancelledRev > 0 && (
              <span className="dc__cancelled-subtext">
                Cancelled / Refunded: -₹{chartData.totalCancelledRev.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
        <div className="dc__metric-trend">
          <span className={chartData.isGrowthPositive ? "dc__trend-up" : "dc__trend-down"}>
            {chartData.isGrowthPositive ? "↑" : "↓"} {chartData.growthRate}
          </span>
          <span className="dc__trend-period">{chartData.periodLabel}</span>
        </div>
      </div>

      {/* Responsive SVG Chart with Real Dynamic Axes and Interactive Tooltip */}
      <div style={{ width: "100%", position: "relative" }}>
        {/* Floating Tooltip */}
        {hoveredIdx !== null && activePoint && (
          <div
            className="dc__chart-tooltip"
            style={{
              left: `${(activePoint.x / 520) * 100}%`,
              top: `${(Math.min(activePoint.y, activeCancelledPoint?.y || activePoint.y, activeCustPoint?.y || activePoint.y) / 180) * 100}%`,
            }}
          >
            <div className="dc__chart-tooltip-title">{activePoint.label}</div>
            <div className="dc__chart-tooltip-row">
              <span style={{ color: "#93c5fd" }}>● Net Revenue:</span>
              <strong>₹{activePoint.rev.toLocaleString("en-IN")}</strong>
            </div>
            <div className="dc__chart-tooltip-row">
              <span style={{ color: "#e2e8f0" }}>● Total Sale:</span>
              <strong>₹{(activePoint.totalSale || 0).toLocaleString("en-IN")}</strong>
            </div>
            <div className="dc__chart-tooltip-row">
              <span style={{ color: "#fca5a5" }}>● Cancelled & Refund:</span>
              <strong>₹{activePoint.cancelledRev.toLocaleString("en-IN")}</strong>
            </div>
            <div className="dc__chart-tooltip-row">
              <span style={{ color: "#c4b5fd" }}>● Customers:</span>
              <strong>+{activePoint.cust}</strong>
            </div>
            {(activePoint.orders > 0 || activePoint.cancelledOrders > 0) && (
              <div className="dc__chart-tooltip-footer">
                <span>Active: {activePoint.orders}</span>
                {activePoint.cancelledOrders > 0 && (
                  <span style={{ color: "#f87171" }}>Cancelled: {activePoint.cancelledOrders}</span>
                )}
              </div>
            )}
          </div>
        )}

        <svg viewBox="0 0 520 180" width="100%" height="auto" style={{ overflow: "visible" }}>
          {/* Horizontal Dashed Grid lines */}
          <g stroke="#E2E8F0" strokeDasharray="3 3">
            <line x1="50" y1="30" x2="480" y2="30" />
            <line x1="50" y1="70" x2="480" y2="70" />
            <line x1="50" y1="110" x2="480" y2="110" />
            <line x1="50" y1="150" x2="480" y2="150" />
          </g>

          {/* Dynamic Left Y-axis labels (Revenue & Refund Currency) */}
          <g fontSize="10" fill="#94A3B8" textAnchor="end">
            <text x="42" y="34">{chartData.formatAxisCurrency(chartData.ceilRev)}</text>
            <text x="42" y="74">{chartData.formatAxisCurrency(chartData.ceilRev * (2 / 3))}</text>
            <text x="42" y="114">{chartData.formatAxisCurrency(chartData.ceilRev * (1 / 3))}</text>
            <text x="42" y="154">₹0</text>
          </g>

          {/* Dynamic Right Y-axis labels (Customers) */}
          <g fontSize="10" fill="#94A3B8" textAnchor="start">
            <text x="488" y="34">{Math.round(chartData.ceilCust)}</text>
            <text x="488" y="74">{Math.round(chartData.ceilCust * (2 / 3))}</text>
            <text x="488" y="114">{Math.round(chartData.ceilCust * (1 / 3))}</text>
            <text x="488" y="154">0</text>
          </g>

          {/* Curve 1: Red/Crimson Dashed Curve (Cancelled & Refund) */}
          <path
            d={chartData.cancelledPath}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeDasharray="5 3"
            strokeLinecap="round"
          />

          {/* Curve 2: Violet/Purple Dotted Curve (Customer Registrations) */}
          <path
            d={chartData.custPath}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2.5"
            strokeDasharray="3 4"
            strokeLinecap="round"
          />

          {/* Curve 3: Solid Navy Blue Curve (Revenue) */}
          <path
            d={chartData.revPath}
            fill="none"
            stroke="#0A2582"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Highlight Dots on active/hovered points */}
          {activePoint && (
            <>
              <circle cx={activePoint.x} cy={activePoint.y} r="8" fill="#0A2582" opacity="0.18" />
              <circle cx={activePoint.x} cy={activePoint.y} r="4.5" fill="#0A2582" stroke="#ffffff" strokeWidth="2" />
            </>
          )}

          {activeCancelledPoint && (
            <>
              <circle cx={activeCancelledPoint.x} cy={activeCancelledPoint.y} r="7" fill="#EF4444" opacity="0.2" />
              <circle cx={activeCancelledPoint.x} cy={activeCancelledPoint.y} r="3.5" fill="#EF4444" stroke="#ffffff" strokeWidth="1.5" />
            </>
          )}

          {activeCustPoint && (
            <>
              <circle cx={activeCustPoint.x} cy={activeCustPoint.y} r="7" fill="#8B5CF6" opacity="0.2" />
              <circle cx={activeCustPoint.x} cy={activeCustPoint.y} r="3.5" fill="#8B5CF6" stroke="#ffffff" strokeWidth="1.5" />
            </>
          )}

          {/* X-axis Bucket Labels */}
          <g fontSize="11" fill="#64748B" textAnchor="middle">
            {chartData.ptsRev.map((pt, idx) => (
              <text key={idx} x={pt.x} y="172">
                {pt.label}
              </text>
            ))}
          </g>

          {/* Transparent Hover detection columns */}
          {chartData.ptsRev.map((pt, idx) => {
            const colWidth = chartData.chartW / Math.max(chartData.ptsRev.length, 1);
            return (
              <rect
                key={idx}
                x={pt.x - colWidth / 2}
                y="20"
                width={colWidth}
                height="140"
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
      </div>

      {/* Chart Legend with Live Counts */}
      <div className="dc__chart-legend-box">
        <span className="dc__chart-legend-item">
          <span className="dc__legend-line-solid" />
          Revenue ({chartData.formatAxisCurrency(chartData.totalRev)})
        </span>
        <span className="dc__chart-legend-item">
          <span className="dc__legend-line-dashed-red" />
          Cancelled & Refund ({chartData.formatAxisCurrency(chartData.totalCancelledRev)})
        </span>
        <span className="dc__chart-legend-item">
          <span className="dc__legend-line-dotted" />
          Customers (+{chartData.totalCust})
        </span>
      </div>
    </div>
  );
};

const SalesByCategoryCard = ({ orders = [], products = [], categories = [], loading = false }) => {
  const [viewMode, setViewMode] = useState("category"); // 'category' | 'subcategory'
  const [expandedCategories, setExpandedCategories] = useState({});

  const { categories: categorySales, subcategories: subcategorySales } = useMemo(() => {
    const palette = ["#0A2582", "#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777", "#0891B2"];

    // 1. Build lookup maps from products & categories
    const prodCatMap = {};
    const prodSubcatMap = {};

    // Map subcategoryId -> Subcategory Name and parent_id
    const subcatMapById = {};
    categories.forEach(c => {
      (c.subcategories || []).forEach(s => {
        const sId = s.subcategory_id || s.id;
        if (sId) {
          subcatMapById[sId] = s.name;
        }
      });
    });

    products.forEach(p => {
      const catName = p.categories?.name || p.category || (categories.find(c => String(c.id || c.category_id) === String(p.category_id))?.name) || "Other";
      const subcatName = p.subcategories?.name || p.subcategory || (p.subcategory_id && subcatMapById[p.subcategory_id]) || null;

      if (catName) {
        prodCatMap[p.id] = catName;
        prodCatMap[p.product_id] = catName;
      }
      if (subcatName) {
        prodSubcatMap[p.id] = subcatName;
        prodSubcatMap[p.product_id] = subcatName;
      }
    });

    // Structure: categoriesData[catName] = { amount: 0, subcategories: { [subcatName]: amount } }
    const categoriesData = {};
    categories.forEach(c => {
      const cName = c.name?.trim();
      if (!cName) return;
      categoriesData[cName] = {
        amount: 0,
        subcategories: {}
      };
      (c.subcategories || []).forEach(s => {
        const sName = s.name?.trim();
        if (sName) {
          categoriesData[cName].subcategories[sName] = 0;
        }
      });
    });

    // Helper to add sale
    const recordSale = (catName, subcatName, amount) => {
      if (!catName || catName === "Other") return;
      if (!categoriesData[catName]) {
        categoriesData[catName] = { amount: 0, subcategories: {} };
      }
      categoriesData[catName].amount += amount;

      const sub = subcatName?.trim() || "General";
      categoriesData[catName].subcategories[sub] = (categoriesData[catName].subcategories[sub] || 0) + amount;
    };

    // 2. Compute from actual orders
    let totalOrderSalesFound = 0;
    orders.forEach(order => {
      if (isCancelledOrRefunded(order)) return;
      const items = order.order_items || [];
      if (items.length > 0) {
        items.forEach(item => {
          const catName = item.category || item.category_name || prodCatMap[item.product_id] || prodCatMap[item.id] || "Other";
          const subcatName = item.subcategory || item.subcategory_name || prodSubcatMap[item.product_id] || prodSubcatMap[item.id] || null;
          const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
          recordSale(catName, subcatName, itemTotal);
          totalOrderSalesFound += itemTotal;
        });
      } else {
        const catName = order.category || prodCatMap[order.product_id] || "Other";
        const subcatName = prodSubcatMap[order.product_id] || null;
        const val = Number(order.total_price || 0);
        recordSale(catName, subcatName, val);
        totalOrderSalesFound += val;
      }
    });

    // 3. Fallback: catalog/inventory value if no completed order sales exist yet
    if (totalOrderSalesFound === 0) {
      products.forEach(p => {
        const catName = p.categories?.name || p.category || (categories.find(c => String(c.id || c.category_id) === String(p.category_id))?.name) || "Other";
        const subcatName = p.subcategories?.name || p.subcategory || (p.subcategory_id && subcatMapById[p.subcategory_id]) || null;
        const catVal = Number(p.price || 0) * (Number(p.stock) || 1);
        recordSale(catName, subcatName, catVal);
      });
    }

    const formatAmt = (val) => {
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
      return `₹${Math.round(val)}`;
    };

    // Format category list
    const sortedCategories = Object.entries(categoriesData)
      .filter(([name]) => name && name !== "Other")
      .sort((a, b) => b[1].amount - a[1].amount);

    const maxCatVal = sortedCategories[0]?.[1]?.amount || 1;

    const formattedCategories = sortedCategories.map(([name, data], idx) => {
      const subEntries = Object.entries(data.subcategories)
        .sort((a, b) => b[1] - a[1]);

      return {
        name,
        rawAmount: data.amount,
        amount: formatAmt(data.amount),
        percent: Math.max(10, Math.round((data.amount / maxCatVal) * 100)),
        color: palette[idx % palette.length],
        subcategories: subEntries.map(([sName, sAmt]) => ({
          name: sName,
          amount: formatAmt(sAmt),
          rawAmount: sAmt,
          percent: data.amount > 0 ? Math.round((sAmt / data.amount) * 100) : 0,
        }))
      };
    });

    // Format all subcategories flat list
    const allSubs = [];
    formattedCategories.forEach(cat => {
      cat.subcategories.forEach(sub => {
        allSubs.push({
          name: sub.name,
          parentCategory: cat.name,
          amount: sub.amount,
          rawAmount: sub.rawAmount,
          color: cat.color,
        });
      });
    });
    allSubs.sort((a, b) => b.rawAmount - a.rawAmount);
    const maxSubVal = allSubs[0]?.rawAmount || 1;
    const formattedSubcategories = allSubs.map(s => ({
      ...s,
      percent: Math.max(10, Math.round((s.rawAmount / maxSubVal) * 100)),
    }));

    return {
      categories: formattedCategories,
      subcategories: formattedSubcategories,
    };
  }, [orders, products, categories]);

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: prev[catName] === false ? true : false,
    }));
  };

  return (
    <div className="dc__card">
      <div className="dc__card-header">
        <div>
          <h2 className="dc__card-title">Sales by category</h2>
          <p className="dc__card-subtext">Category and subcategory breakdown</p>
        </div>
        <div className="dc__cat-view-tabs">
          <button
            type="button"
            className={`dc__cat-view-tab ${viewMode === "category" ? "dc__cat-view-tab--active" : ""}`}
            onClick={() => setViewMode("category")}
          >
            By Category
          </button>
          <button
            type="button"
            className={`dc__cat-view-tab ${viewMode === "subcategory" ? "dc__cat-view-tab--active" : ""}`}
            onClick={() => setViewMode("subcategory")}
          >
            By Subcategory
          </button>
        </div>
      </div>

      <div className="dc__category-list">
        {viewMode === "category" ? (
          categorySales.length > 0 ? (
            categorySales.map((cat, i) => {
              const isExpanded = expandedCategories[cat.name] !== false; // default expanded
              return (
                <div key={i} className="dc__category-item">
                  <div
                    className="dc__category-info dc__category-info--clickable"
                    onClick={() => toggleCategory(cat.name)}
                    title="Click to expand/collapse subcategories"
                  >
                    <div className="dc__cat-title-wrap">
                      <span className="dc__cat-chevron">{isExpanded ? "▾" : "▸"}</span>
                      <span className="dc__category-name">{cat.name}</span>
                      {cat.subcategories.length > 0 && (
                        <span className="dc__subcat-count-badge">
                          {cat.subcategories.length} {cat.subcategories.length === 1 ? "subcat" : "subcats"}
                        </span>
                      )}
                    </div>
                    <span className="dc__category-amount">{cat.amount}</span>
                  </div>

                  <div className="dc__category-track">
                    <div
                      className="dc__category-fill"
                      style={{
                        width: `${cat.percent}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>

                  {/* Subcategories list under this category */}
                  {isExpanded && cat.subcategories.length > 0 && (
                    <div className="dc__subcategories-nested">
                      {cat.subcategories.map((sub, sIdx) => (
                        <div key={sIdx} className="dc__subcat-row">
                          <div className="dc__subcat-info">
                            <span className="dc__subcat-bullet">↳</span>
                            <span className="dc__subcat-name">{sub.name}</span>
                            <span className="dc__subcat-share">({sub.percent}%)</span>
                          </div>
                          <span className="dc__subcat-amount">{sub.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="dc__empty-text">No category data recorded yet.</div>
          )
        ) : (
          subcategorySales.length > 0 ? (
            subcategorySales.map((sub, i) => (
              <div key={i} className="dc__category-item">
                <div className="dc__category-info">
                  <div className="dc__cat-title-wrap">
                    <span className="dc__category-name">{sub.name}</span>
                    <span className="dc__subcat-parent-tag">in {sub.parentCategory}</span>
                  </div>
                  <span className="dc__category-amount">{sub.amount}</span>
                </div>
                <div className="dc__category-track">
                  <div
                    className="dc__category-fill"
                    style={{
                      width: `${sub.percent}%`,
                      backgroundColor: sub.color
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="dc__empty-text">No subcategory data recorded yet.</div>
          )
        )}
      </div>
    </div>
  );
};

const PopularProductCard = ({ products = [], orders = [], loading = false }) => {
  const popularList = useMemo(() => {
    // Count real sales from order items
    const salesCount = {};
    orders.forEach(o => {
      if (['cancelled'].includes(o.status?.toLowerCase())) return;
      (o.order_items || []).forEach(item => {
        const id = item.product_id || item.id;
        if (id) {
          salesCount[id] = (salesCount[id] || 0) + Number(item.quantity || 1);
        }
      });
    });

    if (products && products.length > 0) {
      const sortedProds = [...products].sort((a, b) => {
        const aSales = salesCount[a.id] || Number(a.sales || 0);
        const bSales = salesCount[b.id] || Number(b.sales || 0);
        return bSales - aSales;
      });

      return sortedProds.slice(0, 6).map((p, idx) => {
        const count = salesCount[p.id] || (p.stock ? Math.max(1, 100 - Number(p.stock)) : 0);
        const skuVal = p.sku || `FAY-${String(p.id).slice(-6).toUpperCase()}`;
        return {
          id: p.id || String(idx),
          sku: skuVal,
          name: p.name || "Product",
          price: `₹${Number(p.price || 0).toLocaleString("en-IN")}`,
          sales: count,
          image: p.image || p.image_url || p.images?.[0] || "/src/assets/cart/bangle1.webp"
        };
      });
    }
    return [];
  }, [products, orders]);

  return (
    <div className="dc__card">
      <div className="dc__card-header" style={{ marginBottom: "14px" }}>
        <h2 className="dc__card-title">Popular Product</h2>
      </div>

      <div className="dc__popular-table-wrap">
        {popularList.length > 0 ? (
          <table className="dc__popular-table">
            <thead>
              <tr>
                <th style={{ width: "55%" }}>Product</th>
                <th style={{ width: "25%" }}>Price</th>
                <th style={{ width: "20%", textAlign: "left" }}>Sales</th>
              </tr>
            </thead>
            <tbody>
              {popularList.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="dc__product-col">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="dc__product-thumb"
                        onError={(e) => { e.currentTarget.src = "/src/assets/cart/bangle1.webp"; }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div className="dc__product-sku">{item.sku}</div>
                        <div className="dc__product-title" title={item.name}>{item.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="dc__product-price">{item.price}</span>
                  </td>
                  <td>
                    <span className="dc__product-sales">{item.sales}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: "#94a3b8", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>
            No products found in catalog.
          </div>
        )}
      </div>
    </div>
  );
};

const RecentOrdersCard = ({ orders = [], loading = false }) => {
  const navigate = useNavigate();

  const badgeStyles = {
    pending: { bg: "#FEF9C3", color: "#A16207" },
    "pending booking": { bg: "#FEF9C3", color: "#A16207" },
    booked: { bg: "#EDE9FE", color: "#6D28D9" },
    shipped: { bg: "#DBEAFE", color: "#1D4ED8" },
    "in transit": { bg: "#DBEAFE", color: "#1D4ED8" },
    delivered: { bg: "#DCFCE7", color: "#15803D" },
    confirmed: { bg: "#E0F2FE", color: "#0284C7" },
    cancelled: { bg: "#F1F5F9", color: "#64748B" },
    "booking failed": { bg: "#FEE2E2", color: "#B91C1C" },
    ndr: { bg: "#FFEDD5", color: "#C2410C" },
    return: { bg: "#FFE4E6", color: "#BE123C" },
    returned: { bg: "#FFE4E6", color: "#BE123C" },
  };

  const orderRows = useMemo(() => {
    return (orders || []).slice(0, 5).map((o, idx) => {
      const orderRef = o.order_number || (o.id ? String(o.id).slice(-6).toUpperCase() : `ORD-${idx + 1}`);
      const displayOrderId = String(orderRef).startsWith("#") ? orderRef : `#${orderRef}`;
      const status = o.delivery_status || o.status || "Pending Booking";
      const customer = o.shipping_address?.full_name || o.customer?.name || "Customer";
      const price = `₹${Number(o.total_price || 0).toLocaleString("en-IN")}`;
      const firstItem = o.order_items?.[0];
      const item = firstItem?.product_name || o.item_name || (o.order_items?.length ? `${o.order_items.length} items` : "Order Item");

      return {
        id: displayOrderId,
        status,
        customer,
        price,
        item,
        key: o.id || idx
      };
    });
  }, [orders]);

  return (
    <div className="dc__card">
      <div className="dc__card-header">
        <h2 className="dc__card-title">Recent orders</h2>
        <button onClick={() => navigate("/admin/orders")} className="dc__show-all-link">
          <span>Show All</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {orderRows.length > 0 ? (
          orderRows.map((ord) => {
            const badge = badgeStyles[String(ord.status).toLowerCase()] || { bg: "#FEF3C7", color: "#B45309" };
            return (
              <div key={ord.key} className="dc__order-row">
                <div className="dc__order-left">
                  <div className="dc__order-top-left">
                    <span className="dc__order-id-txt">{ord.id}</span>
                    <span
                      className="dc__order-badge"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {ord.status}
                    </span>
                  </div>
                  <span className="dc__order-customer-txt">{ord.customer}</span>
                </div>
                <div className="dc__order-right">
                  <span className="dc__order-amount-txt">{ord.price}</span>
                  <span className="dc__order-desc-txt">{ord.item}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ color: "#94a3b8", fontSize: "13px", padding: "16px 0", textAlign: "center" }}>
            No recent orders placed yet.
          </div>
        )}
      </div>
    </div>
  );
};

const AddNewProductCard = ({ categories = [] }) => {
  const navigate = useNavigate();

  const defaultCategories = [
    { name: "Men", image: "/src/assets/pro1.webp" },
    { name: "Women", image: "/src/assets/pro2.webp" },
  ];

  const catList = useMemo(() => {
    if (categories && categories.length >= 2) {
      return categories.slice(0, 2).map((c, i) => ({
        name: c.name || (i === 0 ? "Men" : "Women"),
        image: c.image_url || (i === 0 ? "/src/assets/pro1.webp" : "/src/assets/pro2.webp")
      }));
    }
    return defaultCategories;
  }, [categories]);

  return (
    <div className="dc__card">
      <div className="dc__card-header" style={{ marginBottom: "4px" }}>
        <h2 className="dc__card-title">Add New Product</h2>
        <button onClick={() => navigate("/admin/products/add")} className="dc__add-new-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Add New</span>
        </button>
      </div>

      <div className="dc__card-subtitle">Categories</div>

      <div className="dc__category-nav-list">
        {catList.map((cat, idx) => (
          <div
            key={idx}
            className="dc__category-nav-item"
            onClick={() => navigate(`/admin/products`)}
          >
            <div className="dc__category-nav-left">
              <img
                src={cat.image}
                alt={cat.name}
                className="dc__category-nav-img"
                onError={(e) => { e.currentTarget.src = "/src/assets/cart/bangle1.webp"; }}
              />
              <span className="dc__category-nav-title">{cat.name}</span>
            </div>
            <span className="dc__category-nav-arrow">›</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardHome = ({ orders = [], customers = [], products = [], categories = [], loading = false }) => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const totalOrders = orders.length;

    // Real all-time total revenue from non-cancelled/non-returned/non-refunded orders
    const validOrders = orders.filter((o) => !isCancelledOrRefunded(o));

    const revenue = validOrders.reduce((sum, o) => {
      const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const grossRevenue = orders.reduce((sum, o) => {
      const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const cancelledOrders = orders.filter((o) => isCancelledOrRefunded(o));
    const cancelledRevenue = cancelledOrders.reduce((sum, o) => {
      const val = Number(o.total_price ?? o.grandTotal ?? o.amount ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const totalCustomers = customers.length;
    const totalProducts = products?.length || 0;

    return {
      totalOrders,
      revenue: `₹${Math.round(revenue).toLocaleString("en-IN")}`,
      grossRevenue: `₹${Math.round(grossRevenue).toLocaleString("en-IN")}`,
      cancelledRevenue: Math.round(cancelledRevenue),
      totalCustomers,
      totalProducts,
    };
  }, [orders, customers, products]);

  return (
    <div className="dc">
      {/* ── 4 Stat Cards at Top ── */}
      <div className="dc__stats-row">
        <StatCard
          label="Total Revenue"
          value={loading ? "—" : stats.revenue}
          subtext={
            stats.cancelledRevenue > 0
              ? `Total Sales: ${stats.grossRevenue}`
              : undefined
          }
          showTrend={false}
          loading={loading}
          onClick={() => navigate("/admin/orders")}
        />
        <StatCard
          label="Total Customers"
          value={loading ? "—" : stats.totalCustomers.toLocaleString("en-IN")}
          showTrend={false}
          loading={loading}
          onClick={() => navigate("/admin/customers")}
        />
        <StatCard
          label="Total Orders"
          value={loading ? "—" : stats.totalOrders.toLocaleString("en-IN")}
          showTrend={false}
          loading={loading}
          onClick={() => navigate("/admin/orders")}
        />
        <StatCard
          label="Total Products"
          value={loading ? "—" : stats.totalProducts.toLocaleString("en-IN")}
          showTrend={false}
          loading={loading}
          onClick={() => navigate("/admin/products")}
        />
      </div>

      {/* ── Charts Top Grid ── */}
      <div className="dc__grid-top">
        <TotalCustomersChart orders={orders} customers={customers} loading={loading} />
        <SalesByCategoryCard orders={orders} products={products} categories={categories} loading={loading} />
      </div>

      {/* ── Tables Bottom Grid ── */}
      <div className="dc__grid-bottom">
        <PopularProductCard products={products} orders={orders} loading={loading} />
        <div className="dc__bottom-right-col">
          <RecentOrdersCard orders={orders} loading={loading} />
          <AddNewProductCard categories={categories} />
        </div>
      </div>
    </div>
  );
};


// Sub category Setup
function SubcategoryByParent({ onSave, navigate, categories }) {
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get("parentId");
  const parentCategory = categories.find(
    (c) => String(c.category_id ?? c.id) === String(parentId)
  );
  const handleBack = () => {
    if (parentId) {
      navigate(`/admin/subcategories?parentId=${parentId}`);
    } else {
      navigate("/admin/categories");
    }
  };
  return (
    <SubCategoryForm
      parentId={parentId}
      parentCategory={parentCategory}
      categories={categories}
      onBack={handleBack}
      onDiscard={handleBack}
      onSave={onSave}
    />
  );
}

function SubcategoryCard({
  navigate,
  categories,
  products,
  subcategoriesCache,
  fetchSubcategoriesForParent,
  onDeleteSubcategory,
}) {
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get("parentId");
  const parentCategory = categories.find(
    (c) => String(c.category_id ?? c.id) === String(parentId)
  );
  return (
    <SubCategory
      parentCategory={parentCategory}
      subcategories={subcategoriesCache?.[parentId]}
      products={products}
      onFetchSubcategories={fetchSubcategoriesForParent}
      onDeleteSubcategory={onDeleteSubcategory}
      onBack={() => navigate("/admin/categories")}
      onAddSubcategory={() => navigate(`/admin/subcategories/new?parentId=${parentId}`)}
    />
  );
}

function UnifiedProductFormWrapper({ categories, subcategoriesCache, fetchSubcategoriesForParent, onSave, navigate }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editingProductId = location.state?.editingProductId || searchParams.get("id");

  return (
    <AddProduct
      key={editingProductId || "new"}
      editingProductId={editingProductId || null}
      categories={categories}
      onGoToRoot={() => navigate("/admin/categories")}
      onBack={() => navigate("/admin/products")}
      onSave={onSave}
      subcategoriesCache={subcategoriesCache}
      onFetchSubcategories={fetchSubcategoriesForParent}
    />
  );
}

// ── Main Dashboard Layout ───────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenus, setOpenMenus] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.signOut();
      setShowLogoutModal(false);
      navigate("/");
    } catch (err) {
      console.error("Admin logout failed:", err);
      alert("Failed to log out: " + (err.message || err));
    } finally {
      setLoggingOut(false);
    }
  };

  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  const [categories, setCategories] = useState([]);
  const [subcategoriesCache, setSubcategoriesCache] = useState({});

  const [editingCategory, setEditingCategory] = useState(null);
  const selectedOrder = useStore((state) => state.selectedAdminOrder);
  const setSelectedOrder = useStore((state) => state.setSelectedAdminOrder);
  const selectedCustomer = useStore((state) => state.selectedAdminCustomer);
  const setSelectedCustomer = useStore((state) => state.setSelectedAdminCustomer);
  const currentUser = useStore((state) => state.user);
  const [banners, setBanners] = useState([]);
  const [editingBanner, setEditingBanner] = useState(null);

  const {
    orders,
    customers,
    loading: adminDataLoading,
    error: adminDataError,
    updateOrderStatus: updateOrderStatusRaw,
    updateOrderInvoicePrinted
  } = useAdminData();

  // Orders whose invoices are unprinted (excluding cancelled orders)
  const isInvoicePrinted = useCallback((order) => {
    if (!order) return false;
    return (
      order.invoice_printed === true ||
      order.invoice_printed === "true" ||
      order.invoice_printed === 1
    );
  }, []);

  const unprintedOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      if (o.status === "Cancelled" || o.delivery_status === "Cancelled") return false;
      return !isInvoicePrinted(o);
    });
  }, [orders, isInvoicePrinted]);

  const unprintedOrdersCount = unprintedOrders.length;

  const [liveToast, setLiveToast] = useState(null);
  const notificationRef = useRef(null);

  // Audio chime for live incoming order alert
  const playOrderChime = useCallback(() => {
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
  }, []);

  // Dismiss live toast after 8 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
    };
    if (notificationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationOpen]);

  const currentAdminProfile = useMemo(() => {
    if (!currentUser || !customers) return null;
    return customers.find((c) => c.id === currentUser.id);
  }, [currentUser, customers]);

  const adminName = currentAdminProfile?.name || currentUser?.user_metadata?.name || "Admin";

  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    try {
      await updateOrderStatusRaw(orderId, newStatus);
      setSelectedOrder((current) => {
        if (current && current.id === orderId) {
          return { ...current, status: newStatus };
        }
        return current;
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }, [updateOrderStatusRaw]);

  const selectedOrderObj = useMemo(() => {
    if (!selectedOrder) return null;
    const fromOrders = orders.find((o) => o.id === selectedOrder.id);
    return fromOrders ? { ...fromOrders, ...selectedOrder } : selectedOrder;
  }, [selectedOrder, orders]);

  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomer) return null;
    return customers.find((c) => c.id === selectedCustomer.id) || selectedCustomer;
  }, [selectedCustomer, customers]);

  const currentPath = location.pathname;

  // Realtime Supabase listener for newly placed orders
  useEffect(() => {
    const channel = supabase
      .channel("admin-live-orders-alert")
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new;
          if (!newOrder) return;
          console.log('🔔 NEW ORDER PLACED:', newOrder);

          playOrderChime();

          const shortId = String(newOrder.id).slice(-6).toUpperCase();
          const amount = Number(newOrder.total_price || 0).toLocaleString("en-IN");

          setLiveToast({
            id: newOrder.id,
            order: newOrder,
            message: `New Order #${shortId} placed! (₹${amount}) • Invoice pending print`,
          });

          if ('Notification' in window && window.Notification.permission === 'granted') {
            try {
              new window.Notification('New Order Placed!', {
                body: `Order #${shortId} (₹${amount}) received. Invoice pending print.`,
              });
            } catch (e) {
              console.debug("Native notification error:", e);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Order notification subscription:', status);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [playOrderChime]);

  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  // Auto-expand menu based on current path
  useEffect(() => {
    const expanded = {};
    menuItems.forEach(item => {
      if (item.children && (currentPath.startsWith(item.path) || item.children.some(child => currentPath === child.path || currentPath.startsWith(child.path)))) {
        expanded[item.id] = true;
      }
    });
    setOpenMenus(expanded);
  }, [currentPath]);

  // Reset editingProduct and drafts when navigating away from product edit/add
  useEffect(() => {
    if (!currentPath.startsWith("/admin/products/add") && !currentPath.startsWith("/admin/products/edit-multiple")) {
      setEditingProduct(null);
    }
  }, [currentPath]);

  // ── Fetch categories on mount ─────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await productService.getCategories();
        if (data) {
          setCategories(
            data.map((row) => ({
              ...row,
              id: row.category_id,
              categoryImage: row.image_url || null,
              status: row.is_active ? "Active" : "Draft",
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Normalize a raw Supabase product row into the shape productlist.jsx expects
  const normalizeProductRow = (row) => {
    const variants = row.product_variants || row.variants || [];
    const prices = variants.map(v => Number(v.price)).filter(n => !isNaN(n));
    const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

    const variantImages = variants.flatMap(v => v.images || []).filter(Boolean);
    const images = Array.isArray(row.images) && row.images.length > 0
      ? row.images
      : (row.image_url ? [row.image_url] : (variantImages.length > 0 ? variantImages : []));

    const priceDisplay = row.has_variants
      ? (prices.length
        ? (Math.min(...prices) === Math.max(...prices)
          ? `₹${Math.min(...prices).toLocaleString('en-IN')}`
          : `₹${Math.min(...prices).toLocaleString('en-IN')} – ₹${Math.max(...prices).toLocaleString('en-IN')}`)
        : "No variants")
      : `₹${Number(row.price || 0).toLocaleString('en-IN')}`;

    return {
      ...row,
      id: row.product_id ?? row.id,
      images,
      image: row.image_url || images[0] || null,
      category: row.categories?.name || row.category || "",
      subcategory: row.subcategories?.name || row.subcategory || null,
      status: row.is_active ? "Visible" : "Draft",
      price: row.has_variants ? (prices.length ? Math.min(...prices) : 0) : row.price,
      priceDisplay,
      stock: row.has_variants ? totalStock : row.stock,
      variants,
      variantCount: variants.length,
    };
  };

  // ── Fetch products on mount ─────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getProducts();
        if (data) {
          setProducts(data.map(normalizeProductRow));
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 768) setSidebarOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggle = (id) => setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));

  const isActive = (path) => {
    if (path === "/admin") {
      return currentPath === "/admin" || currentPath === "/admin/";
    }
    return currentPath === path || currentPath.startsWith(path + "/");
  };

  const showSearchNavbar = ["/admin/categories", "/admin/categories/add", "/admin/products/add", "/admin/orders", "/admin/orders/detail", "/admin/customers", "/admin/customers/detail", "/admin/banners"].some(p => currentPath.startsWith(p));
  const hideAddProduct = HIDE_ADD_PRODUCT_PATHS.includes(currentPath);

  const pageTitle = useMemo(() => {
    if (currentPath === "/admin" || currentPath === "/admin/") return "Dashboard";
    if (currentPath === "/admin/analytics") return "Analytics";

    if (currentPath === "/admin/products/add" || currentPath === "/admin/products/add-multiple" || currentPath === "/admin/products/edit-multiple") {
      const hasId = editingProduct || new URLSearchParams(location.search).get("id") || location.state?.editingProductId;
      return hasId ? "Edit Product" : "Add Product";
    }
    if (currentPath.startsWith("/admin/products")) return "All Products";

    if (currentPath === "/admin/categories/add") return editingCategory ? "Edit Category" : "Add Category";
    if (currentPath === "/admin/subcategories/new") {
      const isEdit = new URLSearchParams(location.search).get("subcategoryId");
      return isEdit ? "Edit Subcategory" : "Add Subcategory";
    }
    if (currentPath.startsWith("/admin/subcategories")) {
      const parentId = new URLSearchParams(location.search).get("parentId");
      const parentCat = categories.find((c) => String(c.category_id ?? c.id) === String(parentId));
      return parentCat ? `${parentCat.name} Subcategories` : "Subcategories";
    }
    if (currentPath.startsWith("/admin/categories")) return "All Categories";

    if (currentPath.startsWith("/admin/orders/detail")) return "Order Details";
    if (currentPath.startsWith("/admin/orders")) return "All Orders";
    if (currentPath.startsWith("/admin/invoices")) return "Invoices";

    if (currentPath.startsWith("/admin/customers/detail")) return "Customer Details";
    if (currentPath.startsWith("/admin/customers")) return "All Customers";

    if (currentPath === "/admin/banners/add") return editingBanner ? "Edit Banner" : "Add Banner";
    if (currentPath.startsWith("/admin/banners")) return "Banner & Content";

    if (currentPath.startsWith("/admin/coupons")) return "Coupon Management";
    if (currentPath.startsWith("/admin/topbar")) return "TopBar Announcement";
    if (currentPath.startsWith("/admin/shipping")) return "Shipping & Delivery";
    if (currentPath.startsWith("/admin/account")) return "Admin Account";
    if (currentPath.startsWith("/admin/danger")) return "Danger Zone";

    for (const item of menuItems) {
      if (item.path === currentPath) return item.label;
      if (item.children) {
        const found = item.children.find((c) => c.path === currentPath);
        if (found) return found.label;
      }
    }
    return "Dashboard";
  }, [currentPath, editingProduct, editingCategory, editingBanner]);

  const pageDescription = useMemo(() => {
    if (currentPath === "/admin" || currentPath === "/admin/") {
      return "Overview of sales, store performance, and real-time activity";
    }
    if (currentPath === "/admin/analytics") {
      return "Comprehensive reports, sales analytics, and customer insights";
    }

    if (currentPath === "/admin/products/add" || currentPath === "/admin/products/add-multiple" || currentPath === "/admin/products/edit-multiple") {
      const hasId = editingProduct || new URLSearchParams(location.search).get("id") || location.state?.editingProductId;
      return hasId ? "Update product details, variants, inventory, and pricing" : "Add a new product to your store catalog with variants, colors, and sizes";
    }
    if (currentPath.startsWith("/admin/products")) {
      return "Manage, search, and organize your store's product catalog";
    }

    if (currentPath === "/admin/categories/add") {
      return editingCategory ? "Update category details and banner" : "Create a new category for your products";
    }
    if (currentPath === "/admin/subcategories/new") {
      return "Create a new subcategory linked to a parent category";
    }
    if (currentPath.startsWith("/admin/subcategories")) {
      return "Manage and organize subcategories";
    }
    if (currentPath.startsWith("/admin/categories")) {
      return "Organize products into categories and collections";
    }

    if (currentPath.startsWith("/admin/orders/detail")) {
      return "View order items, customer information, and fulfillment status";
    }
    if (currentPath.startsWith("/admin/orders")) {
      return "Track, filter, and manage customer orders and shipments";
    }
    if (currentPath.startsWith("/admin/invoices")) {
      return "Generate, download, and print thermal invoices and receipts";
    }

    if (currentPath.startsWith("/admin/customers/detail")) {
      return "Customer account profile, purchase history, and saved addresses";
    }
    if (currentPath.startsWith("/admin/customers")) {
      return "View and manage registered customers and their activity";
    }

    if (currentPath === "/admin/banners/add") {
      return editingBanner ? "Edit banner image, display text, and link" : "Create a new promotional banner for the storefront";
    }
    if (currentPath.startsWith("/admin/banners")) {
      return "Manage promotional banners and homepage marketing content";
    }

    if (currentPath.startsWith("/admin/coupons")) {
      return "Create and manage discounts, promo codes, and vouchers";
    }
    if (currentPath.startsWith("/admin/topbar")) {
      return "Manage announcement bar text displayed at the top of the store";
    }
    if (currentPath.startsWith("/admin/shipping")) {
      return "Configure shipping zones, courier rates, and delivery timeframes";
    }
    if (currentPath.startsWith("/admin/account")) {
      return "Manage your admin profile, contact information, and security";
    }
    if (currentPath.startsWith("/admin/danger")) {
      return "Irreversible actions, system maintenance, and store reset controls";
    }

    return "Store administration and control center";
  }, [currentPath, editingProduct, editingCategory, editingBanner]);

  const fetchSubcategoriesForParent = useCallback(async (parentId, force = false) => {
    if (!force && subcategoriesCache[parentId]) {
      return subcategoriesCache[parentId];
    }
    const data = await productService.getSubCategories(parentId);
    setSubcategoriesCache((prev) => ({ ...prev, [parentId]: data }));
    return data;
  }, [subcategoriesCache]);


  // ── Handlers ──────────────────────────────────────────────────
  const goToAddProduct = () => {
    setEditingProduct(null);
    try {
      sessionStorage.removeItem("faywalk_variant_draft_new");
      sessionStorage.removeItem("faywalk_product_draft_new");
    } catch { }
    navigate("/admin/products/add");
  };

  const goToAddMultipleProduct = () => {
    goToAddProduct();
  };

  const goToOrder = () => {
    setSelectedOrder(null);
    navigate("/admin/orders");
  };

  const handleEditProduct = (product) => {
    const prodId = product.id || product.product_id;
    setEditingProduct(product);
    navigate(`/admin/products/add?id=${prodId}`, { state: { editingProductId: prodId } });
  };

  const handleDeleteProduct = async (id) => {
    try {
      await productService.deleteProduct(id);
      setProducts((p) => p.filter((x) => (x.id ?? x.product_id) !== id && x.product_id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  };

  const handlePublish = (data) => {
    const normalized = normalizeProductRow(data);
    setProducts((p) =>
      editingProduct
        ? p.map((x) => x.id === editingProduct.id ? normalized : x)
        : [normalized, ...p]
    );
    setEditingProduct(null);
    navigate("/admin/products");
  };

  const handleSaveDraft = (data) => {
    const normalized = normalizeProductRow(data);
    setProducts((p) =>
      editingProduct
        ? p.map((x) => x.id === editingProduct.id ? normalized : x)
        : [normalized, ...p]
    );
    setEditingProduct(null);
    navigate("/admin/products");
  };

  const goToAddCategory = () => {
    setEditingCategory(null);
    navigate("/admin/categories/add");
  };

  const handleOpenSubcategory = (cat) => {
    const parentId = cat.category_id || cat.id;

    if (!parentId) {
      console.error("Category ID missing:", cat);
      return;
    }
    navigate(`/admin/subcategories?parentId=${parentId}`);
    // navigate(`/admin/subcategories/new?parentId=${parentId}`);
  };

  const handleSubCategorySave = (data) => {
    setSubcategoriesCache((prev) => {
      const existingList = prev[data.parent_id] || [];
      const alreadyExists = existingList.some((s) => s.subcategory_id === data.subcategory_id);
      const updatedList = alreadyExists
        ? existingList.map((s) => (s.subcategory_id === data.subcategory_id ? data : s))
        : [data, ...existingList];

      return { ...prev, [data.parent_id]: updatedList };
    });
    navigate(`/admin/subcategories?parentId=${data.parent_id}`);
  };

  const handleSubCategoryUpdate = (data) => {
    setSubcategoriesCache((prev) => ({
      ...prev,
      [data.parent_id]: (prev[data.parent_id] || []).map((s) =>
        s.subcategory_id === data.subcategory_id ? data : s
      ),
    }));
    navigate(`/admin/subcategories?parentId=${data.parent_id}`);
  };

  const handleDeleteSubcategory = (subcategoryId, parentId) => {
    setSubcategoriesCache((prev) => ({
      ...prev,
      [parentId]: (prev[parentId] || []).filter(
        (s) => String(s.subcategory_id ?? s.id) !== String(subcategoryId)
      ),
    }));

    setCategories((prev) =>
      prev.map((c) => {
        if (String(c.category_id ?? c.id) === String(parentId)) {
          return {
            ...c,
            subcategories: (c.subcategories || []).filter(
              (s) => String(s.subcategory_id ?? s.id) !== String(subcategoryId)
            ),
          };
        }
        return c;
      })
    );

    useStore.getState().fetchCategories?.(true)?.catch(() => { });
  };

  const handleSaveProductUnified = ({ product, variants }) => {
    const matchedCategory = categories.find(c => String(c.id || c.category_id) === String(product.category_id));
    const firstWithImages = variants?.find(v => v.images?.length > 0);
    const normalized = normalizeProductRow({
      ...product,
      category: matchedCategory?.name || product.category || "",
      images: (product.images && product.images.length > 0) ? product.images : (firstWithImages?.images || []),
      image_url: product.image_url || firstWithImages?.images?.[0] || null,
      product_variants: variants || [],
    });
    setProducts((p) => {
      const exists = p.some((x) => x.id === normalized.id);
      return exists ? p.map((x) => (x.id === normalized.id ? normalized : x)) : [normalized, ...p];
    });
    setEditingProduct(null);
    navigate("/admin/products");
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    navigate("/admin/categories/add");
  };

  const handleDeleteCategory = async (id) => {
    const row = categories.find((x) => x.id === id);
    if (row) {
      try {
        await productService.deleteCategory(id);
        setCategories((p) => p.filter((x) => x.id !== id));
      } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
      }
    }
  };

  const normalizeCategoryRow = (data) => ({
    ...data,
    id: data.category_id ?? data.id,
    categoryImage: data.image_url || null,
    status: data.is_active ? "Active" : "Draft",
  });

  const handlePublishCategory = (data) => {
    const normalized = normalizeCategoryRow(data);
    setCategories((p) =>
      editingCategory
        ? p.map((x) => x.id === editingCategory.id ? normalized : x)
        : [normalized, ...p]
    );
    setEditingCategory(null);
    navigate("/admin/categories");
  };

  const handleSaveDraftCategory = (data) => {
    const normalized = normalizeCategoryRow(data);
    setCategories((p) =>
      editingCategory
        ? p.map((x) => x.id === editingCategory.id ? normalized : x)
        : [normalized, ...p]
    );
    setEditingCategory(null);
    navigate("/admin/categories");
  };

  const handleViewOrderDetail = (order) => {
    setSelectedOrder(order);
    navigate("/admin/orders/detail");
  };

  const handleViewCustomerDetail = (customer) => {
    setSelectedCustomer(customer);
    navigate("/admin/customers/detail");
  };

  const goToAddBanner = () => {
    setEditingBanner(null);
    navigate("/admin/banners/add", { state: { banner: null } });
  };

  const handleEditBanner = (banner) => {
    setEditingBanner(banner);
    navigate("/admin/banners/add", { state: { banner } });
  };

  const handleDeleteBanner = (id) => setBanners((p) => p.filter((x) => x.id !== id));

  const handlePublishBanner = (data) => {
    setEditingBanner(null);
    navigate("/admin/banners");
  };

  return (
    <div className="db">
      {/* Navbar */}
      <nav className="db__navbar">
        <div className="db__navbar-left">
          <button className="db__hamburger" aria-label={sidebarOpen ? "Close menu" : "Open menu"} onClick={() => setSidebarOpen((v) => !v)}>
            <HamburgerIcon open={sidebarOpen} />
          </button>
          {(currentPath.startsWith("/admin/customers/detail") ||
            currentPath.startsWith("/admin/orders/detail") ||
            currentPath.startsWith("/admin/products/add") ||
            currentPath.startsWith("/admin/products/edit-multiple") ||
            currentPath.startsWith("/admin/categories/add") ||
            currentPath.startsWith("/admin/subcategories") ||
            currentPath.startsWith("/admin/banners/add")) && (
              <button
                type="button"
                className="db__header-back-btn"
                onClick={() => {
                  if (currentPath.startsWith("/admin/customers/detail")) {
                    navigate("/admin/customers");
                  } else if (currentPath.startsWith("/admin/orders/detail")) {
                    navigate("/admin/orders");
                  } else if (currentPath === "/admin/products/add-multiple" || currentPath.startsWith("/admin/products/add") || currentPath.startsWith("/admin/products/edit-multiple")) {
                    setEditingProduct(null);
                    navigate("/admin/products");
                  } else if (currentPath.startsWith("/admin/categories/add")) {
                    setEditingCategory(null);
                    navigate("/admin/categories");
                  } else if (currentPath.startsWith("/admin/subcategories/new")) {
                    const params = new URLSearchParams(location.search);
                    const parentId = params.get("parentId");
                    if (parentId) {
                      navigate(`/admin/subcategories?parentId=${parentId}`);
                    } else {
                      navigate("/admin/categories");
                    }
                  } else if (currentPath.startsWith("/admin/subcategories")) {
                    navigate("/admin/categories");
                  } else if (currentPath.startsWith("/admin/banners/add")) {
                    setEditingBanner(null);
                    navigate("/admin/banners");
                  } else {
                    setEditingProduct(null);
                    navigate("/admin/products");
                  }
                }}
                title="Back"
                aria-label="Back"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
          <div className="db__header-title-block">
            <span className="db__breadcrumb-title">{pageTitle}</span>
            <span className="db__breadcrumb-desc">{pageDescription}</span>
          </div>
        </div>

        <div className="db__navbar-actions">
          {currentPath === "/admin/products" && (
            <div className="db__header-inline-actions">
              <button
                type="button"
                className="ap-header-variant-btn"
                onClick={goToAddProduct}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Product
              </button>
            </div>
          )}
          {currentPath === "/admin/categories" && (
            <div className="db__header-inline-actions">
              <button
                type="button"
                className="ap-header-variant-btn"
                onClick={goToAddCategory}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Category
              </button>
            </div>
          )}
          {currentPath.startsWith("/admin/subcategories") && currentPath !== "/admin/subcategories/new" && (
            <div className="db__header-inline-actions">
              <button
                type="button"
                className="ap-header-variant-btn"
                onClick={() => {
                  const parentId = new URLSearchParams(location.search).get("parentId");
                  if (parentId) {
                    navigate(`/admin/subcategories/new?parentId=${parentId}`);
                  } else {
                    navigate("/admin/subcategories/new");
                  }
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Subcategory
              </button>
            </div>
          )}
          {(currentPath === "/admin/products/add" || currentPath === "/admin/products/add-multiple" || currentPath === "/admin/products/edit-multiple") && (
            <div className="db__header-inline-actions">
              <button
                type="button"
                className="ap-header-clear-btn"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("faywalk:clear-product-form"));
                }}
                title="Clear all entered fields"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Clear All
              </button>
            </div>
          )}




          {/* Notification dropdown */}
          <div className="notification-wrapper" ref={notificationRef}>
            <button
              className="db__action-icon-btn notification-btn"
              onClick={() => setNotificationOpen((prev) => !prev)}
              aria-label={`Notifications${unprintedOrdersCount
                  ? `, ${unprintedOrdersCount} orders pending invoice print`
                  : ""
                }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>

              {unprintedOrdersCount > 0 && (
                <span className="notification-badge">
                  {unprintedOrdersCount > 99 ? "99+" : unprintedOrdersCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <strong>Pending Invoices ({unprintedOrdersCount})</strong>
                  {unprintedOrdersCount > 0 && (
                    <button
                      className="notification-view-all-btn"
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate("/admin/orders");
                      }}
                    >
                      View All Orders
                    </button>
                  )}
                </div>
                {unprintedOrdersCount === 0 ? (
                  <div className="notification-empty">
                    <span style={{ fontSize: "24px" }}>🎉</span>
                    <p style={{ margin: "8px 0 0", fontWeight: 600, color: "#1e293b" }}>All invoices printed</p>
                    <small style={{ color: "#94a3b8" }}>New order alerts will appear here</small>
                  </div>
                ) : (
                  <div className="notification-list">
                    {unprintedOrders.slice(0, 10).map((order) => {
                      const orderShortId = String(order.id).slice(-6).toUpperCase();
                      const dateStr = order.order_date || order.created_at;
                      const formattedTime = dateStr
                        ? new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                        : "Recent";
                      return (
                        <button
                          key={order.id}
                          className="notification-item"
                          onClick={() => {
                            setNotificationOpen(false);
                            setSelectedOrder(order);
                            navigate("/admin/orders/detail");
                          }}
                        >
                          <div className="notification-icon">
                            🛍️
                          </div>
                          <div className="notification-content">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                              <strong>Order #{orderShortId}</strong>
                              <span className="notification-unprinted-tag">Print Invoice</span>
                            </div>
                            <span>
                              {order.customer?.name || order.customer_name || "Customer"}
                            </span>
                            <small>
                              ₹{Number(order.total_price || 0).toLocaleString("en-IN")}
                              {" • "}
                              {order.payment || "Payment"}
                              {" • "}
                              {formattedTime}
                            </small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>



          {/* Profile */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <button className="db__profile-btn" aria-label="Admin Profile">
              <div className="db__profile-avatar-img">
                {getUserInitials(adminName, 'A')}
              </div>
            </button>
          </Link>
        </div>
      </nav>

      <div className="db__body">
        <div className={`db__sidebar-overlay${sidebarOpen ? " db__sidebar-overlay--visible" : ""}`} onClick={() => setSidebarOpen(false)} aria-hidden="true" />

        {/* Sidebar */}
        <aside className={`db__sidebar${sidebarOpen ? " db__sidebar--open" : ""}`}>
          <div className="db__sidebar-brand">
            <img src="/logo.png" alt="FAYWALK" className="db__brand-logo" style={{ borderRadius: 0 }} />
          </div>
          <nav className="db__sidenav">
            {menuItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isOpen = openMenus[item.id];
              const active = isActive(item.path) || (item.children && item.children.some((child) => isActive(child.path)));

              return (
                <div key={item.id} className="db__menu-group">
                  <button
                    className={`db__menu-item${active ? " db__menu-item--active" : ""}`}
                    onClick={() => {
                      if (hasChildren) {
                        toggle(item.id);
                      } else {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }
                    }}
                  >
                    <span className="db__menu-icon">{sidebarIcons[item.id]}</span>
                    <span className="db__menu-label">
                      {item.label}
                    </span>
                    {item.id === "order" && unprintedOrdersCount > 0 && (
                      <span
                        className="db__menu-badge"
                        title={`${unprintedOrdersCount} orders pending invoice print`}
                      >
                        {unprintedOrdersCount > 99 ? "99+" : unprintedOrdersCount}
                      </span>
                    )}
                    {hasChildren && <span className="db__chevron">{isOpen ? <ChevronUp /> : <ChevronDown />}</span>}
                  </button>

                  {hasChildren && isOpen && (
                    <div className="db__submenu">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`db__sub-item${currentPath === child.path ? " db__sub-item--active" : ""}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <img src={dropdownIcon} alt="" className="db__sub-item-icon" />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="db__sidebar-footer">
            <button
              type="button"
              className="db__logout-btn"
              onClick={() => {
                setSidebarOpen(false);
                setShowLogoutModal(true);
              }}
              title="Logout"
            >
              <span className="db__menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="db__menu-label">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content - React Router Routes */}
        <main className="db__main">
          <Routes>
            <Route path="/" element={<DashboardHome orders={orders} customers={customers} products={products} categories={categories} loading={adminDataLoading} />} />
            <Route path="/analytics" element={<Analytics orders={orders} customers={customers} products={products} loading={adminDataLoading} />} />

            {/* Products */}
            <Route path="/products" element={
              <ProductList
                products={products}
                categories={categories}
                onAddProduct={goToAddProduct}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
              />} />
            <Route path="/products/add" element={
              <UnifiedProductFormWrapper
                categories={categories}
                subcategoriesCache={subcategoriesCache}
                fetchSubcategoriesForParent={fetchSubcategoriesForParent}
                onSave={handleSaveProductUnified}
                navigate={navigate}
              />
            } />

            <Route path="/products/add-multiple" element={
              <Navigate to="/admin/products/add" replace />
            } />

            <Route path="/products/edit-multiple" element={
              <UnifiedProductFormWrapper
                categories={categories}
                subcategoriesCache={subcategoriesCache}
                fetchSubcategoriesForParent={fetchSubcategoriesForParent}
                onSave={handleSaveProductUnified}
                navigate={navigate}
              />
            } />

            {/* Categories */}
            <Route path="/categories" element={
              <CategoryList
                categories={categories}
                products={products}
                setCategories={setCategories}
                onAddCategory={goToAddCategory}
                // onAddSubcategory={handleAddSubcategory} 
                onOpenSubcategory={handleOpenSubcategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            }
            />

            <Route
              path="/subcategories/new"
              element={
                <SubcategoryByParent
                  navigate={navigate}
                  categories={categories}
                  onSave={handleSubCategorySave}
                />
              }
            />

            <Route
              path="/subcategories"
              element={
                <SubcategoryCard
                  navigate={navigate}
                  categories={categories}
                  products={products}
                  subcategoriesCache={subcategoriesCache}
                  fetchSubcategoriesForParent={fetchSubcategoriesForParent}
                  onDeleteSubcategory={handleDeleteSubcategory}
                />
              }
            />

            <Route path="/categories/add" element={<AddCategory initialData={editingCategory} onBack={() => { setEditingCategory(null); navigate("/admin/categories"); }} onPublish={handlePublishCategory} onSaveDraft={handleSaveDraftCategory} />} />

            {/* Orders */}
            <Route path="/orders" element={<AllOrders orders={orders} products={products} categories={categories} loading={adminDataLoading} onViewDetail={handleViewOrderDetail} onInvoicePrinted={updateOrderInvoicePrinted} />} />
            <Route path="/orders/detail" element={<OrderDetails order={selectedOrderObj} onStatusChange={updateOrderStatus} onInvoicePrinted={updateOrderInvoicePrinted} onBack={() => navigate("/admin/orders")} />} />

            {/* Invoices (redirects to unified Orders & Invoices page) */}
            <Route path="/invoices" element={<Navigate to="/admin/orders" replace />} />

            {/* Customers */}
            <Route path="/customers" element={<AllCustomers customers={customers} loading={adminDataLoading} onViewDetail={handleViewCustomerDetail} />} />
            <Route path="/customers/detail" element={<CustomerDetails customer={selectedCustomerObj} onBack={() => navigate("/admin/customers")} />} />

            {/* Banners */}
            <Route path="/banners" element={<BannerList banners={banners} onAddBanner={goToAddBanner} onEditBanner={handleEditBanner} onDeleteBanner={handleDeleteBanner} />} />
            <Route path="/banners/add" element={<AddBanner initialData={editingBanner} onBack={() => navigate("/admin/banners")} onPublish={handlePublishBanner} />} />

            {/* TopBar Announcement */}
            <Route path="/topbar" element={<TopBarSettings />} />

            {/* Coupons Management */}
            <Route path="/coupons" element={<CouponManagement />} />

            {/* Settings */}
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/account" element={<AdminAccount />} />
            <Route path="/danger" element={<DangerZone />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      {/* Floating Live Order Notification Alert */}
      {liveToast && (
        <div className="db__order-toast">
          <div className="db__order-toast-icon">🛍️</div>
          <div className="db__order-toast-content">
            <span className="db__order-toast-title">New Order Received!</span>
            <span className="db__order-toast-msg">{liveToast.message}</span>
          </div>
          <button
            className="db__order-toast-action"
            onClick={() => {
              setSelectedOrder(liveToast.order);
              setLiveToast(null);
              navigate("/admin/orders/detail");
            }}
          >
            Print Invoice
          </button>
          <button
            className="db__order-toast-close"
            onClick={() => setLiveToast(null)}
            aria-label="Close alert"
          >
            ×
          </button>
        </div>
      )}

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </div>
  );
};

export default Dashboard;