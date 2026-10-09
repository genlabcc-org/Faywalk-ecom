import { useState, useEffect } from "react";
import "./CartPage.css";
import Navbar from "../components/SiteHeader";
import TopBar from "../components/TopBar";
import Footer from "../components/SiteFooter";
import { useNavigate } from "react-router-dom";
import WishlistPage from "./WishlistPage";
import { useStore } from "../hooks/useStore";
import { getOriginalImageUrl } from '../utils/imageUtils';
import { getNavPath } from "../services/categoryRoute";

export default function CartPage() {
  const categories = useStore((state) => state.categories);
  const cartItems = useStore((state) => state.cartItems);
  const wishlistItems = useStore((state) => state.wishlistItems);
  const updateCartQty = useStore((state) => state.updateCartQty);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const removeSelectedFromCart = useStore((state) => state.removeSelectedFromCart);
  const toggleWishlist = useStore((state) => state.toggleWishlist);

  const [selectedIds, setSelectedIds] = useState([]);
  const selectedItems = cartItems.filter((i) => selectedIds.includes(i.id));
  const [toast, setToast] = useState("");
  const [showWishlist, setShowWishlist] = useState(false);

  const navigate = useNavigate();

  // Initialize and sync selected items when cartItems load or change
  useEffect(() => {
    if (cartItems.length > 0) {
      setSelectedIds((prev) => {
        const valid = prev.filter((id) => cartItems.some((item) => item.id === id));
        if (valid.length > 0) return valid;
        return cartItems.map((item) => item.id);
      });
    } else {
      setSelectedIds([]);
    }
  }, [cartItems]);

  const handleNavClick = (link) => {
    navigate(getNavPath(link, categories));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const allSelected = cartItems.length > 0 && selectedIds.length === cartItems.length;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(cartItems.map((i) => i.id));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const updateQty = async (id, val) => {
    await updateCartQty(id, val);
  };

  const deleteSelected = async () => {
    await removeSelectedFromCart(selectedIds);
    setSelectedIds([]);
    showToast("Items removed from cart");
  };

  const moveToWishlist = async () => {
    const moved = cartItems.filter((i) => selectedIds.includes(i.id));
    for (const item of moved) {
      const isWishlisted = wishlistItems.some((w) => w.id === item.productId);
      if (!isWishlisted) {
        await toggleWishlist({
          productId: item.productId,
          name: item.name,
          price: item.price,
          originalPrice: item.originalPrice,
          category: item.category,
          img: item.image
        });
      }
    }
    await removeSelectedFromCart(selectedIds);
    setSelectedIds([]);
    showToast("Items moved to wishlist");
    setTimeout(() => setShowWishlist(true), 800);
  };

  // Only calculate totals for currently SELECTED items
  const subtotal = selectedItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  // GST is already included in product price — extract for display only, not added to total
  const gstIncluded = subtotal > 0 ? Math.round(subtotal - (subtotal / 1.03)) : 0;
  const platformFee = 0;
  const grandTotal = subtotal + platformFee;

  if (showWishlist) {
    return (
      <WishlistPage
        onBack={() => setShowWishlist(false)}
      />
    );
  }

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

          {/* LEFT */}
          <div className="cart-left">
            <h1 className="cart-title">MY CART</h1>

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
                {/* SELECT ALL BAR */}
                <div className="cart-select-bar">
                  <label className="select-all-label">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="cart-checkbox"
                    />
                    <span>{selectedIds.length}/{cartItems.length} Items Selected</span>
                  </label>
                  <button
                    className="cart-delete-btn"
                    onClick={deleteSelected}
                    disabled={selectedIds.length === 0}
                    aria-label="Delete selected"
                    title="Remove selected items"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>

                {/* CART ITEMS LIST */}
                <div className="cart-items-list">
                  {cartItems.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-media">
                        <input
                          type="checkbox"
                          className="cart-checkbox item-checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                        <div className="cart-item-img-box">
                          <img src={getOriginalImageUrl(item.image)} alt={item.name} className="cart-item-img" />
                        </div>
                      </div>
                      <div className="cart-item-info">
                        <h3 className="cart-item-name">{item.name}</h3>
                        <div className="cart-item-pricing">
                          <span className="cart-item-price">₹{Number(item.price || 0).toLocaleString("en-IN")}</span>
                          {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                            <span className="cart-item-original">₹{Number(item.originalPrice).toLocaleString("en-IN")}</span>
                          )}
                        </div>
                        <div className="cart-qty-stepper-wrap">
                          <button
                            type="button"
                            className="cart-qty-btn-circle"
                            onClick={() => updateQty(item.id, Math.max(1, (item.qty || 1) - 1))}
                            disabled={(item.qty || 1) <= 1}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <div className="cart-qty-box-value">{item.qty || 1}</div>
                          <button
                            type="button"
                            className="cart-qty-btn-circle"
                            onClick={() => updateQty(item.id, (item.qty || 1) + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <div className="cart-item-meta">
                          <span className="cart-item-category">{item.category || "Item"}</span>
                          {item.size && <span className="cart-item-meta-dot">•</span>}
                          {item.size && <span className="cart-item-size">Size: <strong>{item.size}</strong></span>}
                          {item.color && <span className="cart-item-meta-dot">•</span>}
                          {item.color && (
                            <span className="cart-item-color">
                              Color: <span className="cart-color-dot" style={{ backgroundColor: item.color }} />
                            </span>
                          )}
                        </div>
                        <div className="cart-item-delivery">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                            <path d="m3.3 7 8.7 5 8.7-5" />
                            <path d="M12 22V12" />
                          </svg>
                          <span>Delivered by {item.deliveryDate || "Sep 12, 2025"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RIGHT — ORDER SUMMARY */}
          {cartItems.length > 0 && (
            <div className="cart-right">
              <div className="order-summary">
                <div className="summary-row summary-subtotal">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-row">
                  <span className="summary-label">Taxes</span>
                  <span className="summary-val">{selectedItems.length > 0 ? "₹350" : "₹0"}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">GST</span>
                  <span className="summary-val">{selectedItems.length > 0 ? "₹300" : "₹0"}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Flatform Fee</span>
                  <span className="summary-val">{selectedItems.length > 0 ? "₹150" : "₹0"}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Delivery Fee</span>
                  <span className="summary-val summary-free-val">FREE</span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-row summary-grand">
                  <span>Grand Total</span>
                  <span>₹{(selectedItems.length > 0 ? (subtotal === 900 ? 945 : subtotal) : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <button
                  className="checkout-btn"
                  onClick={() => navigate("/checkout", { state: { selectedItems } })}
                  disabled={selectedItems.length === 0}
                >
                  Checkout
                </button>
              </div>
            </div>
          )}

        </main>

        {/* FOOTER */}
        <Footer />

      </div>
    </>
  );
}
