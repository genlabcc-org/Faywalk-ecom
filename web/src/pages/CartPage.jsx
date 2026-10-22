import { useState, useEffect, useRef } from "react";
import "./CartPage.css";
import Navbar from "../components/SiteHeader";
import TopBar from "../components/TopBar";
import Footer from "../components/SiteFooter";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { getOriginalImageUrl } from '../utils/imageUtils';
import { getNavPath } from "../services/categoryRoute";
import { getColorName } from '../utils/colorUtils';
import { shippingService } from "../services/shippingService";

/** Strip currency symbols & commas so "₹1,299" → 1299 */
const parsePrice = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[₹,\s]/g, ''));
  return isNaN(n) ? 0 : n;
};

export default function CartPage() {
  const categories = useStore((state) => state.categories);
  const cartItems = useStore((state) => state.cartItems);
  const updateCartQty = useStore((state) => state.updateCartQty);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const refreshCart = useStore((state) => state.refreshCart);

  const [shippingRates, setShippingRates] = useState([]);
  const [toast, setToast] = useState("");

  const navigate = useNavigate();

  // Refresh cart on mount so item stock and prices are fresh from DB
  useEffect(() => {
    if (refreshCart) {
      refreshCart();
    }
  }, [refreshCart]);

  // Load active shipping rates for accurate delivery fee calculation
  useEffect(() => {
    shippingService.getRates()
      .then((r) => setShippingRates(r || []))
      .catch((err) => console.warn("Failed to load shipping rates in cart:", err));
  }, []);

  // Auto-clamp any cart item whose qty exceeds currently available stock on initial load
  const hasClampedRef = useRef(false);
  useEffect(() => {
    if (cartItems.length > 0 && !hasClampedRef.current) {
      hasClampedRef.current = true;
      cartItems.forEach((item) => {
        const s = item.stock != null && !isNaN(parseInt(item.stock, 10)) ? parseInt(item.stock, 10) : null;
        if (s != null && s > 0 && (item.qty || 1) > s) {
          updateCartQty(item.id, s);
        }
      });
    }
  }, [cartItems, updateCartQty]);

  const handleNavClick = (link) => {
    navigate(getNavPath(link, categories));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const updateQty = (id, val) => {
    const item = cartItems.find((i) => i.id === id);
    const maxStock = item && item.stock != null && !isNaN(parseInt(item.stock, 10)) ? parseInt(item.stock, 10) : null;
    const clampedVal = maxStock != null && maxStock > 0 ? Math.min(Math.max(1, val), maxStock) : Math.max(1, val);
    updateCartQty(id, clampedVal);
  };

  // Calculate totals strictly for all cart items
  const subtotal = cartItems.reduce(
    (sum, i) => sum + parsePrice(i.price) * (Number(i.qty) || 1),
    0
  );

  // Delivery Fee calculation based on active shipping rates in DB
  const deliveryFee = cartItems.length > 0
    ? shippingService.calcFee(shippingRates, null, subtotal)
    : 0;

  // Check if free delivery threshold is configured (e.g. Free above ₹500)
  const defaultRate = shippingRates.find((r) => r.state === '__default__');
  const freeAbove = defaultRate?.free_above != null ? Number(defaultRate.free_above) : null;
  const neededForFree = freeAbove && subtotal > 0 && subtotal < freeAbove ? (freeAbove - subtotal) : 0;

  // GST is already included in product price — extract for display only, not added to total
  const gstIncluded = subtotal > 0 ? Math.round(subtotal - (subtotal / 1.03)) : 0;
  const grandTotal = subtotal + deliveryFee;

  return (
    <>
      <TopBar />
      <Navbar activeLink="" onLinkClick={handleNavClick} />
      <div className="cart-page-wrapper">

        {/* TOAST */}
        {toast && (
          <div className="cart-toast">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {toast}
          </div>
        )}

        <main className="cart-main">
          <h1 className="cart-title">MY CART</h1>

          <div className="cart-content-layout">
            {/* LEFT */}
            <div className="cart-left">
              {cartItems.length === 0 ? (
              <div className="cart-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <p>Your cart is empty</p>
                <button className="cart-empty-shop-btn" onClick={() => navigate('/')}>
                  Start Shopping
                </button>
              </div>
            ) : (
              <>
                {/* CART ITEMS LIST */}
                <div className="cart-items-list">
                  {cartItems.map((item) => {
                    const priceNum = parsePrice(item.price);
                    const origNum = parsePrice(item.originalPrice);
                    const hasStock = item.stock != null && !isNaN(parseInt(item.stock, 10));
                    const stockCount = hasStock ? Math.max(0, parseInt(item.stock, 10)) : null;
                    const isOutOfStock = stockCount !== null && stockCount === 0;
                    const currentQty = Math.max(1, item.qty || 1);
                    const isMaxStockReached = stockCount !== null && currentQty >= stockCount;

                    return (
                      <div key={item.id} className={`cart-item ${isOutOfStock ? 'cart-item-out-of-stock' : ''}`}>
                        <div className="cart-item-media">
                          <div className="cart-item-img-box">
                            <img src={getOriginalImageUrl(item.image)} alt={item.name} className="cart-item-img" />
                            {isOutOfStock && (
                              <div className="cart-item-img-out-overlay">
                                <span>Out of Stock</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="cart-item-info">
                          <h3 className="cart-item-name">{item.name}</h3>
                          <div className="cart-item-pricing">
                            <span className="cart-item-price">₹{priceNum.toLocaleString("en-IN")}</span>
                            {origNum > priceNum && (
                              <span className="cart-item-original">₹{origNum.toLocaleString("en-IN")}</span>
                            )}
                          </div>
                          <div className="cart-qty-stepper-wrap">
                            <button
                              type="button"
                              className="cart-qty-btn-circle"
                              onClick={() => updateQty(item.id, Math.max(1, currentQty - 1))}
                              disabled={currentQty <= 1 || isOutOfStock}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <div className="cart-qty-box-value">{isOutOfStock ? 0 : currentQty}</div>
                            <button
                              type="button"
                              className="cart-qty-btn-circle"
                              onClick={() => {
                                if (!isMaxStockReached && !isOutOfStock) {
                                  updateQty(item.id, currentQty + 1);
                                }
                              }}
                              disabled={isMaxStockReached || isOutOfStock}
                              aria-label="Increase quantity"
                              title={isMaxStockReached ? `Maximum available stock (${stockCount}) reached` : "Increase quantity"}
                            >
                              +
                            </button>
                            {isMaxStockReached && !isOutOfStock && (
                              <span className="cart-stock-max-hint">(Max available)</span>
                            )}
                          </div>

                          {/* Stock status indicator badge */}
                          {isOutOfStock ? (
                            <div className="cart-stock-alert cart-stock-alert--out">
                              Out of stock
                            </div>
                          ) : stockCount !== null && stockCount <= 5 ? (
                            <div className="cart-stock-alert cart-stock-alert--low">
                              Only {stockCount} left in stock
                            </div>
                          ) : null}

                          <div className="cart-item-meta">
                            <span className="cart-item-category">{item.category || "Item"}</span>
                            {item.size && <span className="cart-item-meta-dot">•</span>}
                            {item.size && <span className="cart-item-size">Size: <strong>{item.size}</strong></span>}
                            {item.color && <span className="cart-item-meta-dot">•</span>}
                            {item.color && (
                              <span className="cart-item-color">
                                Color: <span className="cart-color-dot" style={{ backgroundColor: item.color }} /> <strong>{getColorName(item.color)}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="cart-item-remove-btn"
                          onClick={() => {
                            removeFromCart(item.id);
                            showToast("Item removed from cart");
                          }}
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* RIGHT — ORDER SUMMARY */}
          {cartItems.length > 0 && (
            <div className="cart-right">
              <div className="order-summary">
                <div className="summary-details-list">
                  <div className="summary-row summary-subtotal">
                    <span className="summary-label">Subtotal</span>
                    <span className="summary-val">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="summary-row summary-gst-row">
                    <span className="summary-label">GST (3% Included)</span>
                    <span className="summary-val">₹{gstIncluded.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="summary-row summary-delivery-row">
                    <span className="summary-label">Delivery Fee</span>
                    <span className="summary-val">
                      {deliveryFee === 0 ? (
                        <span className="summary-free-val">FREE</span>
                      ) : (
                        `₹${deliveryFee.toFixed(2)}`
                      )}
                    </span>
                  </div>
                </div>

                {neededForFree > 0 && (
                  <div className="cart-free-shipping-hint">
                    Add ₹{neededForFree} more for <strong>FREE Delivery</strong>
                  </div>
                )}

                <div className="summary-divider"></div>

                <div className="summary-row summary-grand">
                  <span className="grand-total-label">Grand Total</span>
                  <div className="grand-total-amount-wrap">
                    <span className="currency-label">INR</span>
                    <span className="grand-total-val">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {cartItems.some(i => i.stock !== undefined && i.stock !== null && i.stock <= 0) && (
                  <div className="cart-checkout-stock-warning">
                    Please remove out-of-stock items to proceed.
                  </div>
                )}
                <button
                  className="checkout-btn"
                  onClick={() => {
                    if (cartItems.some(i => i.stock !== undefined && i.stock !== null && i.stock <= 0)) {
                      showToast("Please remove out-of-stock items to proceed");
                      return;
                    }
                    try {
                      sessionStorage.setItem("faywalk_checkout_selected_items", JSON.stringify(cartItems));
                      localStorage.setItem("faywalk_checkout_selected_items", JSON.stringify(cartItems));
                      sessionStorage.removeItem("faywalk_checkout_product");
                      localStorage.removeItem("faywalk_checkout_product");
                    } catch (e) {
                      console.warn("Could not save checkout items to storage", e);
                    }
                    navigate("/checkout", { state: { selectedItems: cartItems } });
                  }}
                  disabled={cartItems.length === 0 || cartItems.some(i => i.stock !== undefined && i.stock !== null && i.stock <= 0)}
                >
                  Checkout
                </button>
              </div>
            </div>
          )}

          </div>
        </main>

        {/* FOOTER */}
        <Footer />

      </div>
    </>
  );
}
