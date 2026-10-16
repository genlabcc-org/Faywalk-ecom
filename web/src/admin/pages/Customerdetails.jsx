import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "../../services/orderService";
import { supabase } from "../../lib/supabase";
import { useStore } from "../../hooks/useStore";
import { getColorName } from "../../utils/colorUtils";
import AdminModal from "../components/AdminModal";
import "./Customerdetails.css";

const RingProductImage = () => (
  <div className="cd__product-img">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="6" fill="#fff3e0" />
      <ellipse cx="18" cy="20" rx="8" ry="4" stroke="#b45309" strokeWidth="1.5" fill="none" />
      <ellipse cx="18" cy="16" rx="5" ry="3" fill="#fbbf24" opacity="0.7" />
      <circle cx="18" cy="13" r="4" fill="#fbbf24" />
      <circle cx="18" cy="13" r="2" fill="#f59e0b" />
      <circle cx="16.5" cy="12" r="0.7" fill="#fff" opacity="0.8" />
    </svg>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    Pending:   { bg: "#fef3c7", color: "#b45309" },
    Delivered: { bg: "#f0fdf4", color: "#16a34a" },
    Cancelled: { bg: "#fef2f2", color: "#dc2626" },
    Blocked:   { bg: "#fef2f2", color: "#dc2626" },
    Confirmed: { bg: "#f5f3ff", color: "#7c3aed" },
    Shipped:   { bg: "#fef9c3", color: "#a16207" }
  };
  const s = map[status] || { bg: "#fef3c7", color: "#b45309" };
  return (
    <span className="cd__status-badge" style={{ background: s.bg, color: s.color, padding: "3px 12px", borderRadius: "16px" }}>
      {status || "Pending"}
    </span>
  );
};

const formatJoinedDateTime = (dateVal) => {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dateStr} at ${timeStr}`;
};

const CustomerDetails = ({ customer, onBack }) => {
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);


  const setSelectedProduct = useStore(state => state.setSelectedProduct);
  const navigate = useNavigate();

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

  const c = customer || {
    id: "UNKNOWN",
    name: "Unknown Customer",
    phone: "N/A",
    email: "N/A",
    created_at: new Date().toISOString(),
    orderCount: 0,
    totalSpent: 0
  };

  useEffect(() => {
    if (c.id && c.id !== "UNKNOWN") {
      const fetchAddresses = async () => {
        try {
          setAddressesLoading(true);
          const data = await orderService.getAddresses(c.id);
          setAddresses(data || []);
        } catch (err) {
          console.error("Error fetching customer addresses:", err);
        } finally {
          setAddressesLoading(false);
        }
      };

      const fetchOrders = async () => {
        try {
          setOrdersLoading(true);
          const data = await orderService.getOrders(c.id);
          setOrders(data || []);
        } catch (err) {
          console.error("Error fetching customer orders:", err);
        } finally {
          setOrdersLoading(false);
        }
      };

      fetchAddresses();
      fetchOrders();
    }
  }, [c.id]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders
      .filter(o => o.status?.toLowerCase() !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrder = orders[0]?.order_date 
      ? new Date(orders[0].order_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "N/A";

    return {
      totalOrders,
      totalSpent,
      avgOrderValue,
      lastOrder
    };
  }, [orders]);


  const customerPhone = useMemo(() => {
    if (c.phone && c.phone !== "N/A" && String(c.phone).trim() !== "") return c.phone;
    if (c.phone_number && c.phone_number !== "N/A" && String(c.phone_number).trim() !== "") return c.phone_number;
    if (c.mobile && c.mobile !== "N/A" && String(c.mobile).trim() !== "") return c.mobile;
    if (c.phoneNumber && c.phoneNumber !== "N/A" && String(c.phoneNumber).trim() !== "") return c.phoneNumber;

    const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
    if (defaultAddr && (defaultAddr.phone_number || defaultAddr.phone)) {
      return defaultAddr.phone_number || defaultAddr.phone;
    }

    if (orders && orders.length > 0) {
      for (const ord of orders) {
        if (ord.phone) return ord.phone;
        if (ord.phone_number) return ord.phone_number;
        if (ord.customer?.phone && ord.customer.phone !== "N/A") return ord.customer.phone;
        if (ord.shipping_address?.phone) return ord.shipping_address.phone;
        if (ord.shipping_address?.phone_number) return ord.shipping_address.phone_number;
      }
    }
    return "No phone set";
  }, [c, addresses, orders]);

  const handleConfirmDisable = async () => {
    try {
      setIsDisabling(true);
      if (c.id && c.id !== "UNKNOWN") {
        await supabase.from("users").update({ status: "Disabled" }).eq("id", c.id);
      }
      setShowDisableConfirm(false);
    } catch (err) {
      console.error("Error disabling user:", err);
      setShowDisableConfirm(false);
    } finally {
      setIsDisabling(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (c.id && c.id !== "UNKNOWN") {
        await supabase.from("users").delete().eq("id", c.id);
      }
      setShowDeleteConfirm(false);
      if (onBack) onBack();
    } catch (err) {
      console.error("Error deleting user:", err);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="cd">

      {/* ── Profile Info Grid ── */}
      <div className="cd__section cd__profile-grid">
        {/* Left Profile Info Card */}
        <div className="cd__card">
          <div className="cd__card-title">Profile Info</div>
          <div className="cd__info-rows">
            <div className="cd__info-row">
              <span className="cd__info-label">Full name</span>
              <span className="cd__info-value">{c.name || "Customer"}</span>
            </div>
            <div className="cd__info-row">
              <span className="cd__info-label">Phone</span>
              <span className="cd__info-value">{customerPhone}</span>
            </div>
            <div className="cd__info-row">
              <span className="cd__info-label">Email</span>
              <span className="cd__info-value cd__info-value--email">{c.email || "N/A"}</span>
            </div>
            <div className="cd__info-row">
              <span className="cd__info-label">Account created</span>
              <span className="cd__info-value">
                {c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
              </span>
            </div>
            <div className="cd__info-row">
              <span className="cd__info-label">Last login</span>
              <span className="cd__info-value">
                {stats.lastOrder !== "N/A" ? stats.lastOrder : (c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A")}
              </span>
            </div>
          </div>
        </div>

        {/* Right Profile Info Card */}
        <div className="cd__card">
          <div className="cd__card-title">Profile Info</div>
          <div className="cd__info-rows">
            <div className="cd__info-row">
              <span className="cd__info-label">Total orders</span>
              <span className="cd__info-value">
                {ordersLoading ? (
                  <span className="skeleton-shimmer" style={{ display: 'inline-block', width: '40px', height: '14px', borderRadius: '4px' }} />
                ) : (
                  `${stats.totalOrders} orders`
                )}
              </span>
            </div>
            <div className="cd__info-row">
              <span className="cd__info-label">Total spent</span>
              <span className="cd__info-value">
                {ordersLoading ? (
                  <span className="skeleton-shimmer" style={{ display: 'inline-block', width: '60px', height: '14px', borderRadius: '4px' }} />
                ) : (
                  `₹${stats.totalSpent.toLocaleString("en-IN")}`
                )}
              </span>
            </div>
            <div className="cd__info-row">
              <span className="cd__info-label">Last order</span>
              <span className="cd__info-value">
                {ordersLoading ? (
                  <span className="skeleton-shimmer" style={{ display: 'inline-block', width: '80px', height: '14px', borderRadius: '4px' }} />
                ) : (
                  stats.lastOrder
                )}
              </span>
            </div>
            <div className="cd__info-row">
              <span className="cd__info-label">Returns</span>
              <span className="cd__info-value">
                0
              </span>
            </div>
            <div className="cd__info-row">
              <span className="cd__info-label">Avg. order value</span>
              <span className="cd__info-value">
                {ordersLoading ? (
                  <span className="skeleton-shimmer" style={{ display: 'inline-block', width: '60px', height: '14px', borderRadius: '4px' }} />
                ) : (
                  `₹${Math.round(stats.avgOrderValue).toLocaleString("en-IN")}`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Saved Addresses ── */}
      <div className="cd__section">
        <div className="cd__section-title">Saved Addresses</div>
        {addressesLoading ? (
          <div className="cd__address-grid">
            <div className="cd__card skeleton-shimmer" style={{ height: '140px', opacity: 0.85 }} />
            <div className="cd__card skeleton-shimmer" style={{ height: '140px', opacity: 0.85 }} />
          </div>
        ) : addresses.length > 0 ? (
          <div className="cd__address-grid">
            {addresses.map((addr, i) => (
              <div key={i} className="cd__card">
                <div className="cd__address-card-title">
                  {addr.address_type 
                    ? (addr.is_default ? `${addr.address_type} (Default)` : addr.address_type) 
                    : (addr.is_default ? "Default Address" : `Address ${i + 1}`)}
                </div>
                <div className="cd__address-lines">
                  <div>{addr.full_name || c.name || "Customer"}</div>
                  {addr.address_line1 && <div>{addr.address_line1}</div>}
                  {addr.address_line2 && <div>{addr.address_line2}</div>}
                  {(addr.city || addr.state || addr.postal_code) && (
                    <div>
                      {[addr.city, addr.state].filter(Boolean).join(", ")}
                      {addr.postal_code ? ` — ${addr.postal_code}` : ""}
                    </div>
                  )}
                  {addr.country && <div>{addr.country}</div>}
                  {(addr.phone_number || addr.phone || customerPhone) && (
                    <div className="cd__address-phone">{addr.phone_number || addr.phone || customerPhone}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cd__card" style={{ color: 'var(--cd-text-muted)', fontStyle: 'italic', fontSize: '13.5px' }}>
            No saved addresses found for this customer.
          </div>
        )}
      </div>

      {/* ── Order History ── */}
      <div className="cd__section">
        <div className="cd__card" style={{ padding: '24px 26px' }}>
          <div className="cd__card-title" style={{ fontSize: '18px', fontWeight: '700', marginBottom: '22px' }}>
            Order History
          </div>

          {ordersLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton-shimmer" style={{ height: '64px', borderRadius: '8px' }} />
              <div className="skeleton-shimmer" style={{ height: '64px', borderRadius: '8px' }} />
              <div className="skeleton-shimmer" style={{ height: '64px', borderRadius: '8px' }} />
            </div>
          ) : (
            <div className="cd__order-history-list">
              {(() => {
                const allRows = orders.flatMap((order) => {
                  const orderItems = order.order_items && order.order_items.length > 0
                    ? order.order_items
                    : [{
                        product_id: order.product_id || null,
                        product_name: order.item_name || "Order Item",
                        quantity: order.quantity || 1,
                        price: order.total_price || 0,
                        sku: order.sku || null
                      }];

                  const orderRef = order.order_number || (order.id ? (String(order.id).length > 8 ? order.id.slice(-8).toUpperCase() : order.id) : "N/A");
                  const displayOrderId = String(orderRef).startsWith("#") ? orderRef : `#${orderRef}`;

                  return orderItems.map((item, idx) => {
                    const image = item.image_url || '/src/assets/cart/bangle1.webp';
                    const skuVal = item.sku || order.sku || (item.product_id ? (String(item.product_id).length > 8 ? item.product_id.slice(-8).toUpperCase() : item.product_id) : null);
                    const displaySku = skuVal ? (String(skuVal).startsWith("#") ? skuVal : `#${skuVal}`) : displayOrderId;

                    return {
                      order,
                      item,
                      key: `${order.id}-${idx}`,
                      image,
                      displayOrderId,
                      displaySku
                    };
                  });
                });

                if (allRows.length === 0) {
                  return (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '13.5px' }}>
                      No orders placed by this customer yet.
                    </div>
                  );
                }

                return allRows.map((row) => {
                  const isClickable = !!row.item.product_id;

                  return (
                    <div
                      key={row.key}
                      className={`cd__order-history-row ${isClickable ? 'is-clickable' : ''}`}
                      onClick={() => isClickable && handleItemClick(row.item)}
                    >
                      {/* Left: Product image + details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: '#f9fafb',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {row.image ? (
                            <img
                              src={row.image}
                              alt={row.item.product_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                            />
                          ) : (
                            <span style={{ fontSize: '24px' }}>🛍️</span>
                          )}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '14.5px',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '4px',
                              lineHeight: '1.3',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {row.item.product_name}
                          </div>
                          <div
                            style={{
                              fontSize: '12.5px',
                              color: '#374151',
                              marginBottom: '3px',
                              lineHeight: '1.25',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span>Order ID : {row.displayOrderId}</span>
                            <span>Qty :{row.item.quantity || 1}</span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#374151', lineHeight: '1.25' }}>
                            Product SKU : {row.displaySku}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price + Status Badge */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827', lineHeight: '1.2' }}>
                          ₹{Number(row.item.price || row.order.total_price || 0).toLocaleString('en-IN')}
                        </span>
                        <span
                          style={{
                            display: 'inline-block',
                            background: '#fef3c7',
                            color: '#d97706',
                            padding: '3px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          {row.order.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>



      {/* ── Account Controls ── */}
      <div className="cd__section">
        <div className="cd__section-title">Account Controls</div>
        <div className="cd__card cd__controls-card">
          <div className="cd__controls-warning">
            <span className="cd__warning-dot" />
            <div>
              <div className="cd__warning-title">Disabling this account will prevent the customer from logging in or placing new orders.</div>
              <div className="cd__warning-sub">Their catalog and history data will be preserved. You can re-enable at any time.</div>
            </div>
          </div>
          <div className="cd__controls-btns">
            <button className="cd__btn cd__btn--disable" onClick={() => setShowDisableConfirm(true)}>
              Disable Account
            </button>
            <button className="cd__btn cd__btn--delete" onClick={() => setShowDeleteConfirm(true)}>
              Delete Account Permanently
            </button>
          </div>
        </div>
      </div>

      {/* ── Disable Confirm Modal ── */}
      <AdminModal
        isOpen={showDisableConfirm}
        onClose={() => !isDisabling && setShowDisableConfirm(false)}
        title="Disable Account?"
        maxWidth={440}
        footer={
          <>
            <button className="cd__btn cd__btn--cancel" onClick={() => setShowDisableConfirm(false)} disabled={isDisabling}>Cancel</button>
            <button className="cd__btn cd__btn--disable admin-btn-with-spinner" onClick={handleConfirmDisable} disabled={isDisabling}>
              {isDisabling ? (
                <>
                  <span className="admin-btn-spinner" /> Disabling...
                </>
              ) : (
                "Disable"
              )}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.5 }}>
          This will prevent the customer from logging in or placing orders. You can re-enable at any time.
        </p>
      </AdminModal>

      {/* ── Delete Confirm Modal ── */}
      <AdminModal
        isOpen={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        title="Delete Account Permanently?"
        maxWidth={440}
        footer={
          <>
            <button className="cd__btn cd__btn--cancel" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</button>
            <button className="cd__btn cd__btn--delete admin-btn-with-spinner" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <span className="admin-btn-spinner" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.5 }}>
          This action cannot be undone. All customer data will be permanently removed.
        </p>
      </AdminModal>
    </div>
  );
};

export default CustomerDetails;