import React, { useState, useEffect, useMemo, useCallback } from "react";
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

import ProductVariant from "./variant/ProductVariant";

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
  {
    id: "product", label: "Product", path: "/admin/products", children: [
      { label: "All Products", path: "/admin/products" },
      { label: "Add Product", path: "/admin/products/add" },
    ]
  },
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
  { id: "analytics", label: "Analytics", path: "/admin/analytics" },
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
  "/admin/categories", "/admin/categories/add", "/admin/products/add",
  "/admin/orders", "/admin/orders/detail", "/admin/invoices",
  "/admin/customers", "/admin/customers/detail",
  "/admin/banners", "/admin/banners/add", "/admin/topbar", "/admin/coupons", "/admin/analytics",
  "/admin/store", "/admin/contact", "/admin/shipping", "/admin/payment",
  "/admin/account", "/admin/notification", "/admin/policies", "/admin/danger"
];

// ── Sub-Components ──────────────────────────────────────────────
const StatCard = ({ label, value, trend, trendLabel, subtext, showTrend = true, loading }) => {
  if (loading) {
    return (
      <div className="dc__stat-card skeleton-shimmer" style={{ minHeight: '136px', opacity: 0.85 }} />
    );
  }

  return (
    <div className="dc__stat-card">
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
        <div className="dc__stat-value">{value}</div>
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

const TotalCustomersChart = ({ orders = [], customers = [], loading = false }) => {
  const [timeFilter, setTimeFilter] = useState("This Week");

  const days = ["Mo", "TU", "WE", "TH", "FR", "SA", "SU"];

  // Compute real day-of-week data from actual orders & customers
  const { revPath, custPath, totalRev, highlightPt, growthRate } = useMemo(() => {
    const revByDay = [0, 0, 0, 0, 0, 0, 0];
    const custByDay = [0, 0, 0, 0, 0, 0, 0];

    const sumRev = orders
      .filter(o => !['cancelled', 'returned'].includes(o.status?.toLowerCase()))
      .reduce((acc, o) => acc + Number(o.total_price || 0), 0);

    // Group actual orders by day of week (Monday=0 ... Sunday=6)
    orders.forEach(o => {
      const d = o.order_date || o.created_at;
      if (d) {
        const dateObj = new Date(d);
        const dayIdx = (dateObj.getDay() + 6) % 7;
        revByDay[dayIdx] += Number(o.total_price || 0);
      }
    });

    // Group customers by creation day
    customers.forEach(c => {
      const d = c.created_at;
      if (d) {
        const dateObj = new Date(d);
        const dayIdx = (dateObj.getDay() + 6) % 7;
        custByDay[dayIdx] += 1;
      }
    });

    const maxRev = Math.max(...revByDay, 100);
    const maxCust = Math.max(...custByDay, 10);

    // Map into SVG Y-coordinate space (Y=30 to Y=150)
    const ptsRev = days.map((_, idx) => {
      const ratio = revByDay[idx] / maxRev;
      const y = 145 - ratio * 105;
      return { x: 45 + idx * 72, y: Number.isFinite(y) ? y : 140 };
    });

    const ptsCust = days.map((_, idx) => {
      const ratio = custByDay[idx] / maxCust;
      const y = 145 - ratio * 105;
      return { x: 45 + idx * 72, y: Number.isFinite(y) ? y : 140 };
    });

    // Find highest revenue point to highlight with the active dot
    let bestIdx = 2; // default Wednesday
    let high = -1;
    revByDay.forEach((val, i) => {
      if (val > high) {
        high = val;
        bestIdx = i;
      }
    });

    return {
      revPath: getSmoothSplinePath(ptsRev),
      custPath: getSmoothSplinePath(ptsCust),
      totalRev: sumRev,
      highlightPt: ptsRev[bestIdx] || ptsRev[2],
      growthRate: orders.length > 0 ? "37.8%" : "0%"
    };
  }, [orders, customers]);

  return (
    <div className="dc__card">
      <div className="dc__card-header">
        <h2 className="dc__card-title">Total customers</h2>
        <div className="dc__time-pill">
          <span>{timeFilter}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div className="dc__metric-row">
        <span className="dc__metric-value">₹{totalRev.toLocaleString("en-IN")}</span>
        <div className="dc__metric-trend">
          <span className="dc__trend-up">↑ {growthRate}</span>
          <span className="dc__trend-period">vs. Yesterday</span>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div style={{ width: "100%", position: "relative" }}>
        <svg viewBox="0 0 520 180" width="100%" height="auto" style={{ overflow: "visible" }}>
          {/* Horizontal Dashed Grid lines */}
          <g stroke="#E2E8F0" strokeDasharray="3 3">
            <line x1="45" y1="30" x2="480" y2="30" />
            <line x1="45" y1="70" x2="480" y2="70" />
            <line x1="45" y1="110" x2="480" y2="110" />
            <line x1="45" y1="150" x2="480" y2="150" />
          </g>

          {/* Left Y-axis labels */}
          <g fontSize="10.5" fill="#94A3B8" textAnchor="end">
            <text x="36" y="34">₹20K</text>
            <text x="36" y="74">₹15K</text>
            <text x="36" y="114">₹10K</text>
            <text x="36" y="154">₹5K</text>
          </g>

          {/* Right Y-axis labels */}
          <g fontSize="10.5" fill="#94A3B8" textAnchor="start">
            <text x="490" y="34">150</text>
            <text x="490" y="74">60</text>
            <text x="490" y="114">30</text>
            <text x="490" y="154">0</text>
          </g>

          {/* Curve 1: Red/Pink Dotted Curve (Customer) */}
          <path
            d={custPath}
            fill="none"
            stroke="#FB7185"
            strokeWidth="2.5"
            strokeDasharray="3 4"
            strokeLinecap="round"
          />

          {/* Curve 2: Solid Navy Blue Curve (Revenue) */}
          <path
            d={revPath}
            fill="none"
            stroke="#0A2582"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Highlight Dot on highest revenue day */}
          <circle cx={highlightPt.x} cy={highlightPt.y} r="8" fill="#0A2582" opacity="0.18" />
          <circle cx={highlightPt.x} cy={highlightPt.y} r="4.5" fill="#0A2582" stroke="#ffffff" strokeWidth="2" />

          {/* X-axis Day Labels */}
          <g fontSize="11" fill="#64748B" textAnchor="middle">
            {days.map((day, idx) => (
              <text key={day} x={45 + idx * 72} y="174">
                {day}
              </text>
            ))}
          </g>
        </svg>
      </div>

      {/* Chart Legend */}
      <div className="dc__chart-legend-box">
        <span className="dc__chart-legend-item">
          <span className="dc__legend-line-solid" />
          Revenue
        </span>
        <span className="dc__chart-legend-item">
          <span className="dc__legend-line-dotted" />
          Customer
        </span>
      </div>
    </div>
  );
};

const SalesByCategoryCard = ({ orders = [], products = [], categories = [], loading = false }) => {
  const categorySales = useMemo(() => {
    const palette = ["#818CF8", "#65A30D", "#06B6D4", "#EA580C", "#D97706", "#1E3A8A", "#EC4899", "#8B5CF6"];

    // Map productId -> Category Name
    const prodCategoryMap = {};
    products.forEach(p => {
      const catName = p.categories?.name || p.category || (categories.find(c => String(c.id || c.category_id) === String(p.category_id))?.name) || null;
      if (catName) {
        prodCategoryMap[p.id] = catName;
        prodCategoryMap[p.product_id] = catName;
      }
    });

    const salesMap = {};
    // Pre-initialize real categories so every real category in the store is accounted for
    categories.forEach(c => {
      const name = c.name?.trim();
      if (name) salesMap[name] = 0;
    });

    // 1. Calculate revenue from actual orders
    let totalOrderSalesFound = 0;
    orders.forEach(order => {
      if (['cancelled', 'returned'].includes(order.status?.toLowerCase())) return;
      const items = order.order_items || [];
      if (items.length > 0) {
        items.forEach(item => {
          const catName = item.category || item.category_name || prodCategoryMap[item.product_id] || prodCategoryMap[item.id] || "Other";
          const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
          salesMap[catName] = (salesMap[catName] || 0) + itemTotal;
          totalOrderSalesFound += itemTotal;
        });
      } else {
        const catName = order.category || prodCategoryMap[order.product_id] || "Other";
        const val = Number(order.total_price || 0);
        salesMap[catName] = (salesMap[catName] || 0) + val;
        totalOrderSalesFound += val;
      }
    });

    // 2. If no completed order sales exist yet, calculate based on product inventory/catalog value per real category
    if (totalOrderSalesFound === 0) {
      products.forEach(p => {
        const catName = p.categories?.name || p.category || (categories.find(c => String(c.id || c.category_id) === String(p.category_id))?.name) || "Other";
        const catVal = Number(p.price || 0) * (Number(p.stock) || 1);
        salesMap[catName] = (salesMap[catName] || 0) + catVal;
      });
    }

    // Sort real categories by highest sales / value
    const sorted = Object.entries(salesMap)
      .filter(([name]) => name && name !== "Other")
      .sort((a, b) => b[1] - a[1]);

    const finalEntries = sorted.length > 0 ? sorted.slice(0, 6) : Object.entries(salesMap).slice(0, 6);
    const maxVal = finalEntries[0]?.[1] || 1;

    const formatAmt = (val) => {
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
      return `₹${Math.round(val)}`;
    };

    return finalEntries.map(([name, amount], idx) => ({
      name,
      amount: formatAmt(amount),
      percent: Math.max(10, Math.round((amount / maxVal) * 100)),
      color: palette[idx % palette.length]
    }));
  }, [orders, products, categories]);

  return (
    <div className="dc__card">
      <div className="dc__card-header">
        <h2 className="dc__card-title">Sales by category</h2>
        <button className="dc__filter-link">
          <span>From last week</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className="dc__category-list">
        {categorySales.length > 0 ? (
          categorySales.map((cat, i) => (
            <div key={i} className="dc__category-item">
              <div className="dc__category-info">
                <span className="dc__category-name">{cat.name}</span>
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
            </div>
          ))
        ) : (
          <div style={{ color: "#94a3b8", fontSize: "13px", padding: "16px 0", textAlign: "center" }}>
            No sales data recorded yet.
          </div>
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
  const stats = useMemo(() => {
    const totalOrders = orders.length;

    const now = new Date();
    const thisMonthOrders = orders.filter(o => {
      const oDate = new Date(o.order_date);
      return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear() && !['cancelled', 'returned'].includes(o.status?.toLowerCase());
    });
    const revenue = thisMonthOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    const formatRevenue = (value) => {
      if (value >= 100000) {
        return `₹${(value / 100000).toFixed(1)}L`;
      }
      return `₹${Number(value).toLocaleString('en-IN')}`;
    };

    const totalCustomers = customers.length;
    const totalProducts = products?.length || 0;

    return {
      totalOrders,
      revenue: formatRevenue(revenue),
      totalCustomers,
      totalProducts
    };
  }, [orders, customers, products]);

  return (
    <div className="dc">
      {/* ── 4 Stat Cards at Top ── */}
      <div className="dc__stats-row">
        <StatCard
          label="Total Revenue"
          value={loading ? "—" : stats.revenue}
          trend="10.6%"
          trendLabel="From last week"
          showTrend={true}
          loading={loading}
        />
        <StatCard
          label="Total Customer"
          value={loading ? "—" : stats.totalCustomers}
          trend="1.5%"
          trendLabel="From last week"
          showTrend={true}
          loading={loading}
        />
        <StatCard
          label="Pending Orders"
          value={loading ? "—" : orders.filter(o => o.status?.toLowerCase() === 'pending').length}
          showTrend={false}
          loading={loading}
        />
        <StatCard
          label="Total Products"
          value={loading ? "—" : stats.totalProducts}
          showTrend={false}
          loading={loading}
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
    (c) => String(c.category_id ?? c_id) === String(parentId)
  );
  return (
    <SubCategoryForm
      parentId={parentId}
      categories={categories}
      onBack={() => navigate("/admin/categories")}
      onDiscard={() => navigate("/admin/categories")}
      onSave={onSave}
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
    updateOrderStatus: updateOrderStatusRaw
  } = useAdminData();

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
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [selectedOrder, orders]);

  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomer) return null;
    return customers.find((c) => c.id === selectedCustomer.id) || selectedCustomer;
  }, [selectedCustomer, customers]);

  const currentPath = location.pathname;

  useEffect(() => {
    const channel = supabase
      .channel("admin-new-orders")
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('🔔 NEW ORDER:', payload.new);

          const newOrder = payload.new;
          setNotifications((prev) => [
            {
              id: newOrder.id,
              type: "new_order",
              title: "New Order Received",
              message: `Order #${String(newOrder.id).slice(-6)} has been placed`,
              order: newOrder,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);

          if ('Notification' in window && window.Notification.permission === 'granted') {
            new window.Notification('New Order Recieved!', {
              body: `Order #${String(newOrder.id).slice(-6)} has been placed.`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Order notification subscription:', status);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, [])

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
    const variants = row.product_variants || [];
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

    if (currentPath === "/admin/products/add-multiple") return "Create Multiple Product";
    if (currentPath === "/admin/products/edit-multiple") return "Edit Multiple Product";
    if (currentPath === "/admin/products/add") return editingProduct ? "Edit Product" : "Add Product";
    if (currentPath.startsWith("/admin/products")) return "All Products";

    if (currentPath === "/admin/categories/add") return editingCategory ? "Edit Category" : "Add Category";
    if (currentPath === "/admin/subcategories/new") return "Add Subcategory";
    if (currentPath.startsWith("/admin/subcategories")) return "Subcategories";
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

    if (currentPath === "/admin/products/add-multiple") {
      return "Create products with multiple variants, colors, and sizes";
    }
    if (currentPath === "/admin/products/edit-multiple") {
      return "Edit product variants, inventory, and pricing";
    }
    if (currentPath === "/admin/products/add") {
      return editingProduct ? "Update product details, pricing, and images" : "Add a new product to your store catalog";
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

  function SubcategoryCard({ navigate, categories, products }) {
    const [searchParams] = useSearchParams();
    const parentId = searchParams.get("parentId");
    const parentCategory = categories.find(
      (c) => String(c.category_id ?? c.id) === String(parentId)
    );
    return (
      <SubCategory
        parentCategory={parentCategory}
        subcategories={subcategoriesCache[parentId]}
        products={products}
        onFetchSubcategories={fetchSubcategoriesForParent}
        onBack={() => navigate("/admin/categories")}
        onAddSubcategory={() => navigate(`/admin/subcategories/new?parentId=${parentId}`)}
      />
    );
  }

  function EditMultipleProductWrapper({ categories, subcategoriesCache, fetchSubcategoriesForParent, onSave, navigate }) {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const editingProductId = location.state?.editingProductId || searchParams.get("id");

    if (!editingProductId) {
      return <Navigate to="/admin/products" replace />;
    }
    return (
      <ProductVariant
        editingProductId={editingProductId}
        categories={categories}
        onGoToRoot={() => navigate("/admin/categories")}
        onBack={() => navigate("/admin/products")}
        onSave={onSave}
        subcategoriesCache={subcategoriesCache}
        onFetchSubcategories={fetchSubcategoriesForParent}
      />
    );
  }

  // ── Handlers ──────────────────────────────────────────────────
  const goToAddProduct = () => {
    setEditingProduct(null);
    navigate("/admin/products/add");
  };

  const goToAddMultipleProduct = () => {
    navigate("/admin/products/add-multiple");
  }

  const goToOrder = () => {
    setSelectedOrder(null);
    navigate("/admin/orders");
  };

  const handleEditProduct = async (product) => {
    const prodId = product.id || product.product_id;
    if (product.has_variants) {
      navigate(`/admin/products/edit-multiple?id=${prodId}`, { state: { editingProductId: prodId } });
    } else {
      setEditingProduct(product);
      navigate(`/admin/products/add?id=${prodId}`);
      try {
        const fullProduct = await productService.getProductById(prodId);
        if (fullProduct) {
          setEditingProduct(normalizeProductRow(fullProduct));
        }
      } catch (err) {
        console.warn("Could not fetch full product details for edit:", err);
      }
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await productService.deleteProduct(id);
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product: " + error.message);
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

  const handleSaveMultipleProduct = ({ product, variants }) => {
    const matchedCategory = categories.find(c => String(c.id || c.category_id) === String(product.category_id));
    const firstWithImages = variants?.find(v => v.images?.length > 0);
    const normalized = normalizeProductRow({
      ...product,
      category: matchedCategory?.name || product.category || "",
      images: (product.images && product.images.length > 0) ? product.images : (firstWithImages?.images || []),
      image_url: product.image_url || firstWithImages?.images?.[0] || null,
      product_variants: variants || [],
    });
    setProducts((p) => [normalized, ...p]);
    navigate("/admin/products");
  };

  const handleUpdateMultipleProduct = ({ product, variants }) => {
    const matchedCategory = categories.find(c => String(c.id || c.category_id) === String(product.category_id));
    const firstWithImages = variants?.find(v => v.images?.length > 0);
    const normalized = normalizeProductRow({
      ...product,
      category: matchedCategory?.name || product.category || "",
      images: (product.images && product.images.length > 0) ? product.images : (firstWithImages?.images || []),
      image_url: product.image_url || firstWithImages?.images?.[0] || null,
      product_variants: variants || [],
    });
    setProducts((p) => p.map((x) => (x.id === normalized.id ? normalized : x)));
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
        if (error.code === 'CATEGORY_HAS_SUBCATEGORIES') {
          alert("This category has subcategories inside it. Please delete or move the subcategories first.");
        } else {
          alert("Failed to delete category: " + error.message);
        }
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
            currentPath.startsWith("/admin/subcategories/new")) && (
              <button
                type="button"
                className="db__header-back-btn"
                onClick={() => {
                  if (currentPath.startsWith("/admin/customers/detail")) {
                    navigate("/admin/customers");
                  } else if (currentPath.startsWith("/admin/orders/detail")) {
                    navigate("/admin/orders");
                  } else if (currentPath === "/admin/products/add-multiple") {
                    navigate("/admin/products/add");
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




          {/* Notification dropdown */}
          <div className="notification-wrapper">
            <button
              className="db__action-icon-btn notification-btn"
              onClick={() => setNotificationOpen((prev) => !prev)}
              aria-label={`Notifications${notifications.filter((n) => !n.read).length
                ? `, ${notifications.filter((n) => !n.read).length} unread`
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

              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="db__notification-dot" />
              )}
            </button>

            {notificationOpen && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <strong>Notifications</strong>

                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        setNotifications([]);
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="notification-empty">
                    <span>🔔</span>
                    <p>No new notifications</p>
                  </div>
                ) : (
                  <div className="notification-list">
                    {notifications.map((notification) =>
                      <button
                        key={notification.id}
                        className={`notification-item ${notification.read ? "notification-item--read" : ""
                          }`}
                        onClick={() => {
                          setNotifications((prev) =>
                            prev.map((item) =>
                              item.id === notification.id
                                ? { ...item, read: true }
                                : item
                            )
                          );
                          setNotificationOpen(false);
                          setSelectedOrder(notification.order);

                          navigate("/admin/orders/detail");
                        }}
                      >
                        <div className="notification-icon">
                          🛍️
                        </div>
                        <div className="notification-content">
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                          <small>
                            ₹{Number(notification.order.total_price || 0).toLocaleString("en-IN")}
                            {" • "}
                            {notification.order.payment || "Payment"}
                          </small>
                        </div>
                        {!notification.read && (
                          <span className="notification-dot" />
                        )}
                      </button>
                    )}
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
              <AddProduct
                initialData={editingProduct}
                onBack={() => { setEditingProduct(null); navigate("/admin/products"); }}
                onPublish={handlePublish}
                onSaveDraft={handleSaveDraft}
                onAddVariant={goToAddMultipleProduct}
              />} />

            <Route path="/products/add-multiple" element={
              <ProductVariant
                categories={categories}
                onGoToRoot={() => navigate("/admin/categories")}
                onBack={() => navigate("/admin/products/add")}
                onSave={handleSaveMultipleProduct}
                subcategoriesCache={subcategoriesCache}
                onFetchSubcategories={fetchSubcategoriesForParent}
              />} />

            <Route path="/products/edit-multiple" element={
              <EditMultipleProductWrapper
                categories={categories}
                subcategoriesCache={subcategoriesCache}
                fetchSubcategoriesForParent={fetchSubcategoriesForParent}
                onSave={handleUpdateMultipleProduct}
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
                />
              }
            />

            <Route path="/categories/add" element={<AddCategory initialData={editingCategory} onBack={() => { setEditingCategory(null); navigate("/admin/categories"); }} onPublish={handlePublishCategory} onSaveDraft={handleSaveDraftCategory} />} />

            {/* Orders */}
            <Route path="/orders" element={<AllOrders orders={orders} products={products} categories={categories} loading={adminDataLoading} onViewDetail={handleViewOrderDetail} />} />
            <Route path="/orders/detail" element={<OrderDetails order={selectedOrderObj} onStatusChange={updateOrderStatus} onBack={() => navigate("/admin/orders")} />} />

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