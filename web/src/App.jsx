import React, { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import { useStore } from './hooks/useStore';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import OtpVerifyPage from "./pages/OtpVerifyPage";
import Profile from "./profile/Profile";
import Orders from "./profile/Orders";
import OrderTracking from "./profile/OrderTracking";
import Addresses from "./profile/Addresses";
import CheckoutPage from "./pages/CheckoutPage";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import ProductPage from "./pages/ProductPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";

import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

import AdminRoute from "./components/AdminRoute";
import Dashboard from "./admin/pages/Dashboard";

import { getNavPath } from "./services/categoryRoute";


// Scrolls to top on every route change, or scrolls to hash element if specified
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

// Custom Category / Products Page
function CategoryBySlug(){
  const { slug } = useParams();
  const categories = useStore(state => state.categories);
  const fetchCategories = useStore(state => state.fetchCategories);

  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchCategories().finally(() => setChecked(true));
  }, [fetchCategories]);

  const rawSlug = decodeURIComponent(slug || '');
  const normalizedSlug = rawSlug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  if (normalizedSlug === 'new-arrivals') {
    return <Navigate to="/#new-arrivals" replace />;
  }
  if (normalizedSlug === 'best-sellers') {
    return <Navigate to="/#best-sellers" replace />;
  }
  if (normalizedSlug === 'all' || normalizedSlug === 'all-products' || normalizedSlug === 'products') {
    return <ProductPage category="All Products" />;
  }

  const match = categories.find(
    c => c.slug === slug ||
         c.slug === normalizedSlug ||
         (c.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === normalizedSlug
  );

  if (!checked){
    return null;
  }

  if (match) {
    return <ProductPage category={match.name} />;
  }

  const defaultNames = {
    'rings': 'Rings',
    'toe-rings': 'Toe Rings',
    'earrings': 'Earrings',
    'bracelets': 'Bracelets',
    'bangles': 'Bangles',
    'necklaces': 'Necklaces',
    'anklets': 'Anklets',
    'hip-accessories': 'Hip Accessories',
  };

  if (defaultNames[normalizedSlug]) {
    return <ProductPage category={defaultNames[normalizedSlug]} />;
  }

  return <NotFoundPage />;
}

function App() {
  const initAuth = useStore(state => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />
        <Route
          path="/product/:id/*"
          element={<ProductDetailsPage />}
        />
        <Route
          path="/product/:id"
          element={<ProductDetailsPage />}
        />
        <Route
          path="/products/:id/*"
          element={<ProductDetailsPage />}
        />
        <Route
          path="/products/:id"
          element={<ProductDetailsPage />}
        />
        <Route
          path="/product"
          element={<ProductDetailsPage />}
        />
        <Route path="/all-products" element={<ProductPage category="All Products" />} />
        <Route path="/products" element={<ProductPage category="All Products" />} />
        <Route path="/category/all" element={<ProductPage category="All Products" />} />
        <Route path="/rings" element={<ProductPage category="Rings" />} />
        <Route path="/toe-rings" element={<ProductPage category="Toe Rings" />} />
        <Route path="/earrings" element={<ProductPage category="Earrings" />} />
        <Route path="/bracelets" element={<ProductPage category="Bracelets" />} />
        <Route path="/bangles" element={<ProductPage category="Bangles" />} />
        <Route path="/necklaces" element={<ProductPage category="Necklaces" />} />
        <Route path="/anklets" element={<ProductPage category="Anklets" />} />
        <Route path="/hip-accessories" element={<ProductPage category="Hip Accessories" />} />

        <Route path="/category/:slug" element={<CategoryBySlug />} />
        <Route path="/:slug" element={<CategoryBySlug />} />

        <Route path="/account/login" element={<LoginPage />} />
        <Route path="/account/signup" element={<SignupPage />} />
        <Route path="/account/otp-verify" element={<OtpVerifyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/otp-verify" element={<OtpVerifyPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment" element={<CartPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/orders" element={<Orders />} />
        <Route path="/profile/orders/track/:orderId" element={<OrderTracking />} />
        <Route path="/track-order/:orderId" element={<OrderTracking />} />
        <Route path="/profile/addresses" element={<Addresses />} />
        <Route path="/profile/account" element={<Navigate to="/profile" replace />} />

        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />

        <Route path="/cart" element={<CartPage />} />



        <Route path='/admin/*' element={
          <AdminRoute>
            <Dashboard />
          </AdminRoute>
        } />

        {/* Catch-all 404 Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
