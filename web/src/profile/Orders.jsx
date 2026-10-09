import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { orderService } from "../services/orderService";
import { productService } from "../services/productService";
import { useStore } from "../hooks/useStore";
import ProfileLayout from "./ProfileLayout";
import "./Orders.css";
import ThermalInvoice from "../admin/components/ThermalInvoice";

const PAGE_SIZE = 5;

export default function Orders() {

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [productsMap, setProductsMap] = useState({});
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [invoiceAddress, setInvoiceAddress] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = useStore((s) => s.user);
  const sessionLoading = useStore((s) => s.sessionLoading);
  const rawOrders = useStore((s) => s.orders);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const setSelectedProduct = useStore((s) => s.setSelectedProduct);

  useEffect(() => {
    if (!rawOrders || rawOrders.length === 0) return;
    const productIds = new Set();
    rawOrders.forEach(o => (o.order_items || []).forEach(i => {
      if (i.product_id) productIds.add(i.product_id);
    }));
    if (productIds.size === 0) return;

    productService.getProductsByIds([...productIds]).then((data) => {
      const map = {};
      (data || []).forEach((p) => { map[p.name] = p; });
      setProductsMap(map);
    }).catch((err) => console.error("Error fetching Product:", err));
  }, [rawOrders]);

  const handleItemClick = (item) => {
    const product = productsMap[item.product_name];
    if (product) {
      const formattedProduct = {
        ...product,
        id: product.product_id || product.id,
        productId: product.product_id || product.id,
        img: product.image_url || (product.images && product.images[0]) || '/src/assets/cart/bangle1.webp',
        name: product.name,
        desc: product.description,
        price: product.price,
        originalPrice: product.compare_price || Math.round(product.price * 1.3),
        sizes: product.sizes || [],
        stock: product.stock > 0 ? 'in-stock' : 'out-of-stock',
        category: product.categories?.name || product.category || 'Bangles'
      };
      setSelectedProduct(formattedProduct);
      navigate("/product");
    }
  };

  const handleTrackOrder = (order, item) => {
    const fullOrder = rawOrders.find((o) => o.id === order.id) || order;
    navigate(`/profile/orders/track/${order.id}`, {
      state: { order: fullOrder, item }
    });
  };

  const handleViewInvoice = async (orderSummary) => {
    const fullOrder = rawOrders.find((o) => o.id === orderSummary.id) || orderSummary;
    setSelectedInvoiceOrder(fullOrder);
    setInvoiceAddress(null);
    if (user?.id) {
      try {
        const addresses = await orderService.getAddresses(user.id);
        const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
        setInvoiceAddress(defaultAddr || null);
      } catch (err) {
        console.debug("Could not fetch address for invoice:", err);
      }
    }
  };

  const handlePrintUserInvoice = () => {
    setPrintingInvoice(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintingInvoice(false), 1000);
    }, 250);
  };

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      navigate("/account/login");
      return;
    }
    fetchOrders(user.id);
  }, [user, sessionLoading]);

  const orders = useMemo(() => {
    return rawOrders.map((item) => ({
      id: item.id,
      date: new Date(item.order_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }),
      item: item.item_name,
      qty: item.quantity,
      price: "₹" + parseFloat(item.total_price).toLocaleString("en-IN"),
      status: item.status,
      order_items: item.order_items || [],
      deliveryProvider: item.delivery_provider,
      courierName: item.courier_name,
      courier_name: item.courier_name,
      waybill: item.waybill,
      shipmentId: item.shipment_id,
      shipment_id: item.shipment_id,
      deliveryStatus: item.delivery_status,
      delivery_status: item.delivery_status,
      trackingUrl: item.tracking_url,
      tracking_url: item.tracking_url,
      estimatedDeliveryDate: item.estimated_delivery_date
        ? new Date(item.estimated_delivery_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
        : null
    }));
  }, [rawOrders]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }
    try {
      setCancellingOrderId(orderId);
      await orderService.cancelOrder(orderId);
      if (user) {
        await fetchOrders(user.id, { force: true });
      }
    } catch (err) {
      alert("Failed to cancel order: " + err.message);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const visibleOrders = orders.slice(0, visibleCount);
  const hasMore = visibleCount < orders.length;

  return (
    <ProfileLayout>
      {/* ── ORDER HISTORY CARD ── */}
      <div className="ao-card">
        <div className="ao-card-header">
          <h2 className="ao-card-title">Order History</h2>
          <span className="ao-order-count">{orders.length} {orders.length === 1 ? 'Order' : 'Orders'}</span>
        </div>

        {orders.length === 0 ? (
          <div className="ao-empty-state">
            <div className="ao-empty-icon-wrap">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="ao-empty-title">No orders yet</p>
            <p className="ao-empty-desc">When you place an order, it will appear here.</p>
            <button className="ao-empty-btn" onClick={() => navigate("/")}>
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="ao-order-list">
            {visibleOrders.map((order, idx) => {
              const orderItems = order.order_items && order.order_items.length > 0
                ? order.order_items
                : [{
                  product_name: order.item,
                  quantity: order.qty || 1,
                  price: order.price,
                  size: null,
                  color: null,
                  image_url: null
                }];

              const totalItemCount = orderItems.reduce((acc, i) => acc + Number(i.quantity || i.qty || 1), 0);
              const itemsSummary = orderItems.map(i => {
                const q = Number(i.quantity || i.qty || 1);
                return `${i.product_name}${q > 1 ? ` (×${q})` : ''}`;
              }).join(', ');

              const isDelivered =
                (order.delivery_status || order.deliveryStatus || "").toLowerCase() === "delivered" ||
                (order.status || "").toLowerCase() === "delivered";
              const isCancelled =
                (order.delivery_status || order.deliveryStatus || "").toLowerCase().includes("cancel") ||
                (order.status || "").toLowerCase().includes("cancel");

              const displayStatus = isCancelled ? "Cancelled" : isDelivered ? "Delivered" : order.status;
              const statusClass = displayStatus.toLowerCase().replace(/\s+/g, '-');

              return (
                <div
                  key={order.id || idx}
                  className="ao-order-block"
                  onClick={() => handleTrackOrder(order, orderItems[0])}
                >
                  {/* Top Line: Name & Order ID (left) + Price (right) */}
                  <div className="ao-order-top">
                    <div className="ao-order-meta-wrap">
                      <span className="ao-order-id">Order #{order.id?.slice(-8) || order.id}</span>
                      <span className="ao-order-dot">·</span>
                      <span className="ao-order-date">{order.date}</span>
                      <span className="ao-order-dot">·</span>
                      <span className="ao-order-qty">{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}</span>
                    </div>
                    <div className="ao-order-price">
                      {order.price}
                    </div>
                  </div>

                  {/* Middle Line: Product Thumbnails & Product Names */}
                  <div className="ao-order-items-row">
                    <div className="ao-order-thumbs">
                      {orderItems.slice(0, 3).map((item, imgIdx) => {
                        const product = productsMap[item.product_name];
                        const image = item.image_url || product?.image_url || (product?.images && product.images[0]) || '/src/assets/cart/bangle1.webp';
                        return (
                          <div
                            key={imgIdx}
                            className="ao-order-thumb-wrap"
                            style={{
                              marginLeft: imgIdx > 0 ? '-14px' : '0',
                              zIndex: 3 - imgIdx,
                            }}
                          >
                            <img
                              src={image}
                              alt={item.product_name}
                              className="ao-order-thumb-img"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/src/assets/cart/bangle1.webp';
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="ao-order-summary">
                      {itemsSummary}
                    </div>
                  </div>

                  {/* Shipment Tracking Info (only shown if waybill is present) */}
                  {order.waybill && (() => {
                    const statusStr = (order.delivery_status || order.deliveryStatus || '').trim();
                    const waybillCancelled = statusStr.toLowerCase().includes('cancel');
                    const isNDR = statusStr.toUpperCase().startsWith('NDR');
                    const waybillDelivered = statusStr.toLowerCase() === 'delivered' || (order.status || '').toLowerCase() === 'delivered';

                    const barClass = waybillCancelled ? 'cancelled' : isNDR ? 'ndr' : waybillDelivered ? 'delivered' : 'active';

                    return (
                      <div
                        className={`ao-shipment-bar ao-shipment-bar--${barClass}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="ao-shipment-meta">
                          <span><strong>Courier:</strong> {order.courier_name || order.courierName || order.deliveryProvider || 'iCarry'}</span>
                          <span className="ao-shipment-dot">·</span>
                          <span><strong>AWB:</strong> {order.waybill}</span>
                          <span className="ao-shipment-dot">·</span>
                          <span>
                            <strong>Status:</strong>{' '}
                            <span className={`ao-shipment-badge ao-shipment-badge--${barClass}`}>
                              {waybillDelivered ? 'Delivered' : (statusStr || 'Booked')}
                            </span>
                          </span>
                        </div>
                        {(order.tracking_url || order.trackingUrl) && (
                          <a
                            href={order.tracking_url || order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ao-shipment-track-link"
                          >
                            Track Package ↗
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  {/* Bottom Line: Status Badge & Actions */}
                  <div className="ao-order-bottom">
                    <span className={`ao-status-badge ao-status-badge--${statusClass}`}>
                      {displayStatus}
                    </span>

                    <div className="ao-order-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="ao-invoice-btn"
                        onClick={() => handleViewInvoice(order)}
                        title="View and print invoice"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="ao-btn-icon"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <line x1="10" y1="9" x2="8" y2="9" />
                        </svg>
                        Invoice
                      </button>

                      {(order.status === "Pending" || order.status === "Confirmed") &&
                        !isDelivered &&
                        !isCancelled && (
                        <button
                          className="ao-cancel-btn"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrderId === order.id}
                        >
                          {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}

                      <button
                        className="ao-track-btn"
                        onClick={() => handleTrackOrder(order, orderItems[0])}
                      >
                        Track →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="ao-show-more-wrap">
            <button
              className="ao-show-more-btn"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Show More
            </button>
          </div>
        )}
      </div>

        {/* Invoice Modal for Customer */}
      {selectedInvoiceOrder && (
        <div className="inv__modal-overlay" onClick={() => setSelectedInvoiceOrder(null)}>
          <div className="inv__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inv__modal-header">
              <div>
                <h3 className="inv__modal-title">Order Receipt (4" × 6")</h3>
                <p className="inv__modal-subtitle">
                  Order #{String(selectedInvoiceOrder.id).slice(-8).toUpperCase()} · 100 × 150 mm
                </p>
              </div>
              <button
                className="inv__modal-close"
                onClick={() => setSelectedInvoiceOrder(null)}
                aria-label="Close invoice"
              >
                ✕
              </button>
            </div>

            <div className="inv__modal-body">
              <ThermalInvoice
                order={selectedInvoiceOrder}
                address={invoiceAddress}
                isPreview={true}
              />
            </div>

            <div className="inv__modal-footer">
              <button
                className="inv__modal-close-btn"
                onClick={() => setSelectedInvoiceOrder(null)}
              >
                Close
              </button>
              <button
                className="inv__modal-print-btn"
                onClick={handlePrintUserInvoice}
                disabled={printingInvoice}
              >
                {printingInvoice ? (
                  <>
                    <span className="inv__spin">⏳</span> Printing...
                  </>
                ) : (
                  <>
                    <span>🖨️</span> Print / Save Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print container for customer */}
      {selectedInvoiceOrder && (
        <div className="thermal-print-area">
          <ThermalInvoice order={selectedInvoiceOrder} address={invoiceAddress} />
        </div>
      )}
    </ProfileLayout>
  );
}
