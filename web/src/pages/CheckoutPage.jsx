import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from "../services/authService";
import { orderService } from "../services/orderService";
import { emailService } from "../services/emailService";
import { useStore } from "../hooks/useStore";
import { supabase } from "../lib/supabase";
import { icarryService } from "../services/icarryService";
import { shippingService, normState } from "../services/shippingService";
import "./CheckoutPage.css";
import Navbar from "../components/SiteHeader";
import TopBar from "../components/TopBar";
import Footer from "../components/SiteFooter";
import Toast from "../components/Toast";
import UpiIcon from "../assets/upi.svg";
import VisaIcon from "../assets/visa.svg";
import MastercardIcon from "../assets/mastercard.svg";
import PaymentMorePopup from "../components/PaymentMorePopup";
import { getOriginalImageUrl } from '../utils/imageUtils';
import { getNavPath } from "../services/categoryRoute";

// Helper to dynamically load the Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const parsePrice = (priceVal) => {
  if (typeof priceVal === 'number') return priceVal;
  return parseFloat(String(priceVal).replace(/[₹,\s]/g, "")) || 0;
};

const indianStates = [
  "Tamil Nadu", "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Telangana", "Tripura", "Uttar Pradesh", "West Bengal",
  "Delhi", "Jammu & Kashmir",
  "Arunachal Pradesh", "Jharkhand", "Uttarakhand", "Puducherry",
  "Chandigarh", "Ladakh", "Andaman & Nicobar Islands", "Lakshadweep",
];

// Fallback pincode validation regex helper
const isValidPincodeRegex = (pin) => /^\d{6}$/.test(String(pin || '').trim());

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  flat: "",
  area: "",
  city: "",
  pinCode: "",
  state: "Tamil Nadu",
  isDefault: false,
};

export default function CheckoutPage() {
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", type: "" });
  const [userId, setUserId] = useState(null);

  // Layout states
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pincodeServiceable, setPincodeServiceable] = useState(null);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [rates, setRates] = useState([]);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [pinState, setPinState] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const isCODAvailable = false;

  const categories = useStore((state) => state.categories);

  const handleNavClick = (link) => {
    navigate(getNavPath(link, categories));
  };

  // fetch addresses from Supabase
  const fetchAddresses = async (userEmail) => {
    try {
      const user = await authService.getUser();
      if (!user) return;

      const data = await orderService.getAddresses(user.id);
      if (data && data.length > 0) {
        setAddresses(data);
        const addr = data[0];
        setSelectedId(addr.address_id);

        const parts = (addr.full_name || "").split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";
        setForm({
          firstName,
          lastName,
          email: userEmail || "",
          mobile: addr.phone_number || "",
          flat: addr.address_line1 || "",
          area: addr.address_line2 || "",
          city: addr.city || "",
          pinCode: addr.postal_code || "",
          state: addr.state || "Tamil Nadu",
          isDefault: addr.is_default || false,
        });
      }
    } catch (err) {
      console.error("Error loading addresses:", err);
    }
  };

  // fetch userId and addresses on mount
  useEffect(() => {
    authService.getSession().then((session) => {
      if (session) {
        setUserId(session.user.id);
        const emailVal = session.user.email || "";
        setForm(f => ({ ...f, email: emailVal }));
        fetchAddresses(emailVal);
      }
    });
  }, []);

  // If selectedId is null and user has addresses, pick the first address by default
  useEffect(() => {
    if (selectedId === null && addresses.length > 0 && !isAddingNewAddress) {
      const firstAddr = addresses[0];
      setSelectedId(firstAddr.address_id);
      const parts = (firstAddr.full_name || "").split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      setForm(f => ({
        ...f,
        firstName: f.firstName || firstName,
        lastName: f.lastName || lastName,
        mobile: f.mobile || firstAddr.phone_number || "",
        flat: f.flat || firstAddr.address_line1 || "",
        area: f.area || firstAddr.address_line2 || "",
        city: f.city || firstAddr.city || "",
        pinCode: f.pinCode || firstAddr.postal_code || "",
        state: f.state || firstAddr.state || "Tamil Nadu",
      }));
    }
  }, [addresses, selectedId, isAddingNewAddress]);

  const validate = () => {
    const e = {};
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      e.email = "Valid email is required";
    }

    const hasSelectedAddress = selectedId && !isAddingNewAddress && addresses.some(a => a.address_id === selectedId);

    if (!hasSelectedAddress) {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile.replace(/\D/g, ""))) {
        e.mobile = "Valid 10-digit phone is required";
      }
      if (!form.flat.trim()) e.flat = "Address is required";
      if (!form.pinCode.trim() || !isValidPincodeRegex(form.pinCode)) {
        e.pinCode = "Valid 6-digit PIN required";
      } else if (pincodeServiceable === false) {
        e.pinCode = "Pincode not serviceable for delivery";
      } else if (pinStateError) {
        e.pinCode = pinStateError;
      }
    }
    return e;
  };

  const showToast = (message, type = "success") => {
    setToast({ message: "", type: "" });
    setTimeout(() => setToast({ message, type }), 10);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const handleSelectAddressCard = (addr) => {
    setSelectedId(addr.address_id);
    setIsAddingNewAddress(false);
    const parts = (addr.full_name || "").split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    setForm({
      firstName,
      lastName,
      email: form.email || "",
      mobile: addr.phone_number || "",
      flat: addr.address_line1 || "",
      area: addr.address_line2 || "",
      city: addr.city || "",
      pinCode: addr.postal_code || "",
      state: addr.state || "Tamil Nadu",
      isDefault: addr.is_default || false,
    });
    setErrors({});
  };

  // Debounced iCarry pincode serviceability check
  useEffect(() => {
    const pin = (form.pinCode || "").trim();
    if (!isValidPincodeRegex(pin)) {
      setPincodeServiceable(null);
      setPincodeChecking(false);
      return;
    }

    let active = true;
    setPincodeChecking(true);

    const timer = setTimeout(async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Pincode check timed out")), 5000)
        );
        const res = await Promise.race([
          icarryService.checkPincode(pin),
          timeoutPromise
        ]);

        if (!active) return;

        if (res && res.success === 1 && Array.isArray(res.msg) && res.msg.length > 0) {
          const hasService = res.msg.some(
            (m) => m.prepaid === 'Y' || m.prepaid === 'U' || !m.prepaid
          );
          if (hasService) {
            setPincodeServiceable(true);
            setErrors((prev) => ({ ...prev, pinCode: undefined }));
          } else {
            setPincodeServiceable(false);
            setErrors((prev) => ({
              ...prev,
              pinCode: "Pincode not serviceable for delivery",
            }));
          }
        } else if (res && (res.success === 0 || (Array.isArray(res.msg) && res.msg.length === 0))) {
          setPincodeServiceable(false);
          setErrors((prev) => ({
            ...prev,
            pinCode: "Pincode not serviceable for delivery",
          }));
        } else {
          setPincodeServiceable(isValidPincodeRegex(pin));
        }
      } catch (err) {
        console.warn("iCarry pincode check failed or timed out, failing open to regex:", err);
        if (active) {
          setPincodeServiceable(isValidPincodeRegex(pin));
        }
      } finally {
        if (active) {
          setPincodeChecking(false);
        }
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.pinCode]);

  // Load shipping rates once
  useEffect(() => {
    shippingService.getRates()
      .then((r) => { setRates(r); setRatesLoaded(true); })
      .catch((err) => console.error("Failed to load shipping rates:", err));
  }, []);

  // Look up which state the pincode belongs to
  useEffect(() => {
    const pin = (form.pinCode || "").trim();
    if (!isValidPincodeRegex(pin)) { setPinState(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const info = await shippingService.lookupPincode(pin);
      if (cancelled) return;
      setPinState(info?.state || null);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.pinCode]);

  const pinStateError =
    pinState && form.state && normState(pinState) !== normState(form.state)
      ? `PIN ${form.pinCode} belongs to ${pinState}, not ${form.state}`
      : "";

  const handleApplyDiscount = () => {
    const code = discountInput.trim().toUpperCase();
    if (code === "WELCOME10") {
      setAppliedDiscount({ code, pct: 10 });
      showToast("Discount code WELCOME10 applied! 10% Off", "success");
    } else if (code === "FESTIVE20") {
      setAppliedDiscount({ code, pct: 20 });
      showToast("Discount code FESTIVE20 applied! 20% Off", "success");
    } else if (code === "") {
      showToast("Please enter a discount code.", "warning");
    } else {
      showToast("Invalid discount code.", "error");
    }
  };

  // Compute checkout items and totals
  const checkoutProduct = location.state?.product;
  const selectedCartItems = location.state?.selectedItems;
  const cartItems = useStore((state) => state.cartItems);
  const checkoutItems = checkoutProduct
    ? [checkoutProduct]
    : (selectedCartItems && selectedCartItems.length > 0 ? selectedCartItems : cartItems);

  const subtotal = checkoutProduct
    ? (parsePrice(checkoutProduct.price) * (checkoutProduct.qty || 1))
    : checkoutItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);

  const discountAmount = appliedDiscount
    ? Math.round((subtotal * appliedDiscount.pct) / 100)
    : 0;

  const isAddressServiceable =
    isValidPincodeRegex(form.pinCode) && pincodeServiceable !== false && !pinStateError;
  const shippingFee = isAddressServiceable
    ? shippingService.calcFee(rates, form.state, subtotal - discountAmount)
    : 0;

  const gstIncluded = subtotal > 0 ? Math.round(subtotal - (subtotal / 1.03)) : 0;
  const platformFee = 0;
  const grandTotal = subtotal - discountAmount + shippingFee + platformFee;

  const totalQuantity = checkoutItems.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const primaryItem = checkoutItems[0] || null;
  const primaryItemPrice = primaryItem ? parsePrice(primaryItem.price) : 0;

  const handleCheckoutSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!ratesLoaded) {
      showToast("Loading shipping rates, please wait a moment...", "warning");
      return;
    }

    if (pincodeChecking) {
      showToast("Verifying delivery pincode, please wait a moment...", "warning");
      return;
    }

    const eErrors = validate();
    if (Object.keys(eErrors).length > 0) {
      setErrors(eErrors);
      const firstErrMsg = Object.values(eErrors)[0] || "Please fill all required shipping information.";
      showToast(firstErrMsg, "error");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const session = await authService.getSession();
      const currentUserId = session?.user?.id || userId;
      if (!currentUserId) {
        showToast("You must be logged in to place an order.", "error");
        setIsProcessingPayment(false);
        return;
      }
      let activeAddrId = selectedId;
      const fullName = `${form.firstName} ${form.lastName}`.trim();

      if (!selectedId || isAddingNewAddress) {
        const inserted = await orderService.createAddress({
          user_id: currentUserId,
          full_name: fullName,
          phone_number: form.mobile,
          address_line1: form.flat,
          address_line2: form.area,
          city: form.city,
          state: form.state,
          postal_code: form.pinCode,
          is_default: form.isDefault,
        });

        const newAddr = Array.isArray(inserted) ? inserted[0] : inserted;
        if (newAddr && newAddr.address_id) {
          setAddresses((prev) => [...prev, newAddr]);
          activeAddrId = newAddr.address_id;
          setSelectedId(newAddr.address_id);
          setIsAddingNewAddress(false);
        }
      } else {
        const selectedAddressObj = addresses.find(a => a.address_id === selectedId);
        const isModified = selectedAddressObj && (
          selectedAddressObj.full_name !== fullName ||
          selectedAddressObj.phone_number !== form.mobile ||
          selectedAddressObj.address_line1 !== form.flat ||
          selectedAddressObj.address_line2 !== form.area ||
          selectedAddressObj.city !== form.city ||
          selectedAddressObj.state !== form.state ||
          selectedAddressObj.postal_code !== form.pinCode
        );

        if (isModified) {
          await orderService.updateAddress(selectedId, {
            full_name: fullName,
            phone_number: form.mobile,
            address_line1: form.flat,
            address_line2: form.area,
            city: form.city,
            state: form.state,
            postal_code: form.pinCode,
            is_default: form.isDefault,
          });

          setAddresses((prev) =>
            prev.map((a) =>
              a.address_id === selectedId
                ? {
                  ...a,
                  full_name: fullName,
                  phone_number: form.mobile,
                  address_line1: form.flat,
                  address_line2: form.area,
                  city: form.city,
                  state: form.state,
                  postal_code: form.pinCode,
                }
                : a
            )
          );
        }
      }

      await proceedToPlaceOrder(activeAddrId);

    } catch (err) {
      showToast("Failed to process shipping details: " + err.message, "error");
      setIsProcessingPayment(false);
    }
  };

  const proceedToPlaceOrder = async (addressId) => {
    if (checkoutItems.length === 0) {
      showToast("No items to checkout.", "error");
      setIsProcessingPayment(false);
      return;
    }

    try {
      const session = await authService.getSession();
      const token = session?.access_token;
      if (!token) {
        showToast("You must be logged in to place an order.", "error");
        setIsProcessingPayment(false);
        return;
      }

      if (paymentMethod === "COD") {
        const mainItem = checkoutItems[0];

        const { data, error } = await supabase
          .from("orders")
          .insert({
            user_id: userId,
            address_id: addressId ? Number(addressId) : null,
            item_name: checkoutItems.length > 1
              ? `${mainItem.name} + ${checkoutItems.length - 1} other(s)`
              : mainItem.name,
            quantity: checkoutItems.reduce((sum, item) => sum + (item.qty || 1), 0),
            total_price: grandTotal,
            payment: "COD",
            type: "Regular",
            status: "Order Placed",
          })
          .select()
          .single();

        if (error) throw error;

        const generatedOrderId = data.id;

        const orderItemsToInsert = checkoutItems.map(item => ({
          order_id: generatedOrderId,
          product_id: item.productId || item.id || null,
          product_name: item.name,
          quantity: item.qty || 1,
          price: parsePrice(item.price),
          size: item.size || null,
          color: item.color || null,
          image_url: item.img || item.image || (item.images && item.images[0]) || null,
          sku: item.sku || item.sku_id || 'N/A',
          category: item.category || item.category_name || item.categories?.name || 'N/A',
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItemsToInsert);

        if (itemsError) throw itemsError;

        emailService.sendOrderNotificationEmail({
          orderId: generatedOrderId,
          customerName: `${form.firstName} ${form.lastName}`.trim(),
          customerEmail: session?.user?.email || form.email || "N/A",
          customerPhone: form.mobile || "N/A",
          paymentMethod: "Cash on Delivery (COD)",
          address: {
            name: `${form.firstName} ${form.lastName}`.trim(),
            mobile: form.mobile,
            flat: form.flat,
            area: form.area,
            city: form.city,
            state: form.state,
            pincode: form.pinCode,
          },
          items: orderItemsToInsert,
          totalPrice: grandTotal,
          subtotal: subtotal,
          discount: discountAmount,
          shippingFee: shippingFee,
        });

        if (!checkoutProduct) {
          const removeFromCart = useStore.getState().removeFromCart;
          for (const item of checkoutItems) {
            await removeFromCart(item.id);
          }
        }

        showToast("Order placed successfully via Cash on Delivery!", "success");
        setTimeout(() => {
          navigate("/profile/orders");
        }, 2000);
      } else {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          showToast("Failed to load Razorpay SDK. Please check your connection.", "error");
          setIsProcessingPayment(false);
          return;
        }

        const paymentItems = checkoutItems.map(item => ({
          productId: item.productId || item.id || null,
          price: parsePrice(item.price),
          quantity: item.qty || 1,
          size: item.size || null,
          color: item.color || null,
        }));

        const { data: orderData, error: invokeError } = await supabase.functions.invoke('razorpay', {
          body: {
            action: "create_order",
            items: paymentItems,
            addressId: addressId ? Number(addressId) : null,
            discountCode: appliedDiscount?.code || null,
            discountPct: appliedDiscount?.pct || 0,
            shippingFee: shippingFee || 0,
          }
        });

        if (invokeError || !orderData) {
          throw new Error(invokeError?.message || "Failed to initiate Razorpay order.");
        }

        const { data: profile } = await supabase
          .from("users")
          .select("name, phone")
          .eq("id", userId)
          .single();

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Faywalk",
          description: `Order for ${orderData.productName || 'Purchase'}`,
          order_id: orderData.orderId,
          handler: async function (response) {
            try {
              setIsProcessingPayment(true);
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay', {
                body: {
                  action: "verify_payment",
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  items: paymentItems,
                  addressId: addressId ? Number(addressId) : null,
                  discountCode: appliedDiscount?.code || null,
                  discountPct: appliedDiscount?.pct || 0,
                  shippingFee: shippingFee || 0,
                }
              });

              if (verifyError) {
                let errMsg = verifyError.message;
                if (verifyError.context && typeof verifyError.context.json === 'function') {
                  try {
                    const errJson = await verifyError.context.json();
                    if (errJson?.error) errMsg = errJson.error;
                  } catch (_) { }
                }
                throw new Error(errMsg || "Payment verification failed.");
              }

              if (!checkoutProduct) {
                const removeFromCart = useStore.getState().removeFromCart;
                for (const item of checkoutItems) {
                  await removeFromCart(item.id);
                }
              }

              showToast("Payment successful! Order placed.", "success");

              emailService.sendOrderNotificationEmail({
                orderId: verifyData?.order?.id || response.razorpay_order_id,
                customerName: profile?.name || `${form.firstName} ${form.lastName}`.trim(),
                customerEmail: session?.user?.email || form.email || "N/A",
                customerPhone: profile?.phone || form.mobile || "N/A",
                paymentMethod: "Razorpay (Online Payment)",
                address: {
                  name: profile?.name || `${form.firstName} ${form.lastName}`.trim(),
                  mobile: form.mobile,
                  flat: form.flat,
                  area: form.area,
                  city: form.city,
                  state: form.state,
                  pincode: form.pinCode,
                },
                items: checkoutItems.map(item => ({
                  product_name: item.name,
                  quantity: item.qty || 1,
                  price: parsePrice(item.price),
                  size: item.size || null,
                  color: item.color || null,
                  sku: item.sku || item.sku_id || 'N/A',
                  category: item.category || item.category_name || item.categories?.name || 'N/A',
                })),
                totalPrice: grandTotal,
                subtotal: subtotal,
                discount: discountAmount,
                shippingFee: shippingFee,
              });

              setTimeout(() => {
                navigate("/profile/orders");
              }, 2000);
            } catch (err) {
              showToast(err.message, "error");
              setIsProcessingPayment(false);
            }
          },
          prefill: {
            name: profile?.name || session?.user?.email?.split("@")[0] || "",
            email: session?.user?.email || "",
            contact: profile?.phone || "",
          },
          theme: {
            color: "#092c85",
          },
          modal: {
            ondismiss: function () {
              setIsProcessingPayment(false);
              showToast("Payment cancelled by user.", "warning");
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      showToast(err.message, "error");
      setIsProcessingPayment(false);
    }
  };

  return (
    <>
      <TopBar />
      <Navbar onLinkClick={handleNavClick} />
      <div className="checkout-page-container">

        {/* TOAST */}
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "" })}
        />

        <div className="checkout-main-wrap">
          {/* Main Title */}
          <h1 className="checkout-page-heading">CHECKOUT</h1>

          <div className="checkout-layout-grid">

            {/* LEFT COLUMN: Main Form & Sections */}
            <div className="checkout-content-col">

              {/* TOP: Product Details Box */}
              {primaryItem && (
                <div className="checkout-product-preview-card">
                  <div className="checkout-product-thumb-wrap">
                    <img
                      src={getOriginalImageUrl(primaryItem.img || primaryItem.image || (primaryItem.images && primaryItem.images[0]) || "")}
                      alt={primaryItem.name || "Product"}
                      className="checkout-product-thumb-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80";
                      }}
                    />
                  </div>
                  <div className="checkout-product-info">
                    <h2 className="checkout-product-title">{primaryItem.name}</h2>
                    <p className="checkout-product-desc">
                      {primaryItem.description || primaryItem.short_description || `${primaryItem.name} - Premium Quality Fabric & Fit`}
                    </p>
                    <div className="checkout-product-price-tag">
                      Rs. {primaryItemPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleCheckoutSubmit} className="checkout-form-container">

                {/* 1. Contact Section */}
                <div className="checkout-section-block">
                  <h2 className="checkout-block-title">Contact</h2>
                  <div className="checkout-input-wrap">
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={handleChange}
                      className={`checkout-styled-input ${errors.email ? "error" : ""}`}
                      required
                    />
                    {errors.email && <span className="checkout-err-msg">{errors.email}</span>}
                  </div>
                </div>

                {/* 2. Choose Delivery Address Section */}
                <div className="checkout-section-block">
                  <h2 className="checkout-block-title">Choose Delivery Address</h2>

                  {addresses.length > 0 && (
                    <div className="checkout-address-cards-list">
                      {addresses.map((addr) => {
                        const isSelected = selectedId === addr.address_id && !isAddingNewAddress;
                        return (
                          <div
                            key={addr.address_id}
                            className={`checkout-address-card ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleSelectAddressCard(addr)}
                          >
                            <div className="checkout-address-card-checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="checkout-address-hidden-cb"
                              />
                              <div className={`checkout-styled-checkbox-box ${isSelected ? 'active' : ''}`}>
                                {isSelected && (
                                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                    <path d="M1.5 4.5L4 7L9.5 1.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="checkout-address-card-info">
                              <div className="checkout-address-card-name">{addr.full_name}</div>
                              <div className="checkout-address-card-text">
                                {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}{addr.city ? `, ${addr.city}` : ''} -{addr.postal_code}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New Address Toggle button if addresses exist */}
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      className="checkout-add-address-trigger"
                      onClick={() => {
                        setIsAddingNewAddress(prev => !prev);
                        if (!isAddingNewAddress) {
                          setSelectedId(null);
                          setForm({
                            ...emptyForm,
                            email: form.email,
                          });
                          setErrors({});
                        }
                      }}
                    >
                      <span className="plus-sign">{isAddingNewAddress ? "✕" : "+"}</span>
                      <span>{isAddingNewAddress ? "Cancel New Address" : "Add New Address"}</span>
                    </button>
                  )}

                  {/* New Address Input Form (Visible when Add New Address is clicked OR when no saved addresses exist) */}
                  {(isAddingNewAddress || addresses.length === 0) && (
                    <div className="checkout-new-address-form-box">
                      <div className="checkout-fields-row">
                        <div className="checkout-input-wrap flex-1">
                          <input
                            type="text"
                            name="firstName"
                            placeholder="First name"
                            value={form.firstName}
                            onChange={handleChange}
                            className={`checkout-styled-input ${errors.firstName ? "error" : ""}`}
                          />
                          {errors.firstName && <span className="checkout-err-msg">{errors.firstName}</span>}
                        </div>
                        <div className="checkout-input-wrap flex-1">
                          <input
                            type="text"
                            name="lastName"
                            placeholder="Last name"
                            value={form.lastName}
                            onChange={handleChange}
                            className={`checkout-styled-input ${errors.lastName ? "error" : ""}`}
                          />
                          {errors.lastName && <span className="checkout-err-msg">{errors.lastName}</span>}
                        </div>
                      </div>

                      <div className="checkout-input-wrap">
                        <input
                          type="text"
                          name="flat"
                          placeholder="Address (House/Flat No, Building)"
                          value={form.flat}
                          onChange={handleChange}
                          className={`checkout-styled-input ${errors.flat ? "error" : ""}`}
                        />
                        {errors.flat && <span className="checkout-err-msg">{errors.flat}</span>}
                      </div>

                      <div className="checkout-input-wrap">
                        <input
                          type="text"
                          name="area"
                          placeholder="Area, Street, Sector (optional)"
                          value={form.area}
                          onChange={handleChange}
                          className="checkout-styled-input"
                        />
                      </div>

                      <div className="checkout-fields-row tertiary">
                        <div className="checkout-input-wrap city-field">
                          <input
                            type="text"
                            name="city"
                            placeholder="City"
                            value={form.city}
                            onChange={handleChange}
                            className="checkout-styled-input"
                          />
                        </div>
                        <div className="checkout-input-wrap state-field">
                          <select
                            name="state"
                            value={form.state}
                            onChange={handleChange}
                            className="checkout-styled-input checkout-select-input"
                          >
                            {indianStates.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="checkout-input-wrap pin-field">
                          <input
                            type="text"
                            name="pinCode"
                            placeholder="PIN code"
                            value={form.pinCode}
                            onChange={handleChange}
                            maxLength={6}
                            className={`checkout-styled-input ${errors.pinCode || pinStateError ? "error" : ""}`}
                          />
                          {pincodeChecking && (
                            <span className="checkout-pin-checking-text">Checking PIN...</span>
                          )}
                          {(errors.pinCode || pinStateError) && (
                            <span className="checkout-err-msg">{errors.pinCode || pinStateError}</span>
                          )}
                        </div>
                      </div>

                      <div className="checkout-input-wrap">
                        <input
                          type="tel"
                          name="mobile"
                          placeholder="Phone number"
                          value={form.mobile}
                          onChange={handleChange}
                          className={`checkout-styled-input ${errors.mobile ? "error" : ""}`}
                        />
                        {errors.mobile && <span className="checkout-err-msg">{errors.mobile}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Shipping Method Section */}
                <div className="checkout-section-block">
                  <h2 className="checkout-block-title">Shipping method</h2>
                  <div className="checkout-shipping-display-box">
                    {isAddressServiceable ? (
                      <div className="checkout-shipping-ready-row">
                        <span className="shipping-type-text">Standard Shipping</span>
                        <span className="shipping-cost-text">{shippingFee > 0 ? `₹${shippingFee.toFixed(2)}` : "FREE"}</span>
                      </div>
                    ) : (
                      <span className="checkout-shipping-placeholder-text">
                        Enter your shipping address to view available shipping methods.
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Payment Section */}
                <div className="checkout-section-block">
                  <h2 className="checkout-block-title">Payment</h2>
                  <p className="checkout-block-subtitle">All transactions are secure and encrypted.</p>

                  <div className="checkout-payment-box-group">
                    {/* Option 1: Razorpay */}
                    <div className={`checkout-payment-option-row ${paymentMethod === 'RAZORPAY' ? 'is-active' : ''}`}>
                      <label className="checkout-payment-option-header" onClick={() => setPaymentMethod('RAZORPAY')}>
                        <div className="checkout-radio-label-left">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'RAZORPAY'}
                            onChange={() => setPaymentMethod('RAZORPAY')}
                            className="checkout-native-radio"
                          />
                          <span className="checkout-payment-label-text">
                            Razorpay Secure (UPI, Cards, Int'l Cards, Wallets)
                          </span>
                        </div>
                        <div className="checkout-payment-icons-row">
                          <img src={UpiIcon} alt="UPI" className="payment-badge-img" />
                          <img src={VisaIcon} alt="Visa" className="payment-badge-img" />
                          <img src={MastercardIcon} alt="Mastercard" className="payment-badge-img" />
                          <PaymentMorePopup count="+18" />
                        </div>
                      </label>

                      {paymentMethod === 'RAZORPAY' && (
                        <div className="checkout-payment-redirect-content">
                          <div className="payment-card-icon-box">
                            <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
                              <rect x="1" y="1" width="46" height="34" rx="4" stroke="#444" strokeWidth="2" fill="none" />
                              <line x1="1" y1="11" x2="47" y2="11" stroke="#444" strokeWidth="2" />
                            </svg>
                          </div>
                          <p className="payment-redirect-notice-text">
                            You'll be redirected to Razorpay Secure (UPI, Cards, Int'l Cards, Wallets) to complete your purchase.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Option 2: Cash on Delivery */}
                    <div className={`checkout-payment-option-row ${paymentMethod === 'COD' ? 'is-active' : ''}`}>
                      <label
                        className={`checkout-payment-option-header ${!isCODAvailable ? 'is-disabled' : ''}`}
                        onClick={() => isCODAvailable && setPaymentMethod('COD')}
                      >
                        <div className="checkout-radio-label-left">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'COD'}
                            onChange={() => isCODAvailable && setPaymentMethod('COD')}
                            disabled={!isCODAvailable}
                            className="checkout-native-radio"
                          />
                          <span className="checkout-payment-label-text">Cash on Delivery (COD)</span>
                        </div>
                        {!isCODAvailable && (
                          <span className="checkout-badge-unavailable">CURRENTLY NOT AVAILABLE</span>
                        )}
                      </label>
                      {paymentMethod === 'COD' && (
                        <div className="checkout-payment-redirect-content">
                          <p className="payment-redirect-notice-text">Pay with cash upon delivery.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pay Now Button */}
                <div className="checkout-action-wrap">
                  <button
                    type="submit"
                    className="checkout-primary-pay-btn"
                    disabled={isProcessingPayment || !ratesLoaded}
                  >
                    {isProcessingPayment ? "Processing..." : (paymentMethod === "COD" ? "Place order" : "Pay now")}
                  </button>
                </div>

              </form>
            </div>

            {/* RIGHT COLUMN: Billing Summary Box */}
            <div className="checkout-sidebar-col">
              <div className="checkout-billing-summary-panel">
                <h3 className="checkout-billing-title">Billing</h3>

                <div className="checkout-billing-details-list">
                  <div className="checkout-billing-line">
                    <span className="billing-key">Price:</span>
                    <span className="billing-val">₹{primaryItemPrice.toFixed(2)}</span>
                  </div>

                  <div className="checkout-billing-line">
                    <span className="billing-key">Quantity:</span>
                    <span className="billing-val">{totalQuantity}</span>
                  </div>

                  <div className="checkout-billing-line">
                    <span className="billing-key">Subtotal</span>
                    <span className="billing-val">₹{subtotal.toFixed(2)}</span>
                  </div>

                  {appliedDiscount && (
                    <div className="checkout-billing-line discount-highlight">
                      <span className="billing-key">Discount ({appliedDiscount.code})</span>
                      <span className="billing-val">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="checkout-billing-line gst-line">
                    <span className="billing-key">GST (3% Incl.)</span>
                    <span className="billing-val">₹{gstIncluded}</span>
                  </div>

                  <div className="checkout-billing-line">
                    <span className="billing-key">Shipping</span>
                    <span className="billing-val shipping-status-text">
                      {isAddressServiceable
                        ? (shippingFee === 0 ? "Free" : `₹${shippingFee.toFixed(2)}`)
                        : "Enter shipping address"}
                    </span>
                  </div>
                </div>

                {/* Discount Code Input */}
                <div className="checkout-inline-discount-wrap">
                  <input
                    type="text"
                    placeholder="Discount code"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="checkout-styled-input checkout-discount-input"
                  />
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    className="checkout-discount-apply-btn"
                  >
                    Apply
                  </button>
                </div>

                <div className="checkout-billing-divider-line" />

                <div className="checkout-billing-grand-total">
                  <span className="grand-total-label">Total</span>
                  <div className="grand-total-amount-wrap">
                    <span className="currency-label">INR</span>
                    <span className="grand-total-val">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
