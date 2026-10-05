import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { authService } from "../services/authService";
import { orderService } from "../services/orderService";
import { getUserInitials } from "../utils/avatarUtils";
import "./AnikaAccount.css";
import Navbar from "../components/SiteHeader";
import Footer from "../components/SiteFooter";

const TABS = ["Profile", "Orders", "Addresses", "Wishlists", "Account"];
const ACTIVE_STATUSES = ["Pending", "Confirmed", "Shipped"];

export default function AnikaAccount() {
  const [activeTab] = useState("Account");
  const navigate = useNavigate();

  const user = useStore((s) => s.user);
  const orders = useStore((s) => s.orders);
  const fetchOrders = useStore((s) => s.fetchOrders);

  // const [user, setUser] = useState(null);
  // const [orders, setOrders] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const sessionLoading = useStore((s) => s.sessionLoading);

  useEffect(() =>{
    if (sessionLoading) return;
    if (!user) {
      navigate("/account/login");
      return;
    }
    fetchOrders(user.id);
  }, [user, sessionLoading]);

  const handleTabClick = (tab) => {
    if (tab === "Profile") navigate("/profile");
    else if (tab === "Orders") navigate("/profile/orders");
    else if (tab === "Addresses") navigate("/profile/addresses");
    else if (tab === "Wishlists") navigate("/profile/wishlists");
    else if (tab === "Account") return;
  };

  const handleNavClick = (link) => {
    if (link === "Home") navigate("/");
    else navigate(`/${link.toLowerCase()}`);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate("/");
    } catch (err) {
      alert("Failed to log out: " + err.message);
    }
  };

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const hasActiveOrders = activeOrders.length > 0;

  const handleDeleteRequest = () => {
    if (hasActiveOrders) {
      setDeleteError(
        `You have ${activeOrders.length} active order(s) that are not yet delivered or cancelled. Please wait for them to complete before deleting your account.`
      );
      return;
    }
    setDeleteError("");
    setDeleteConfirm("");
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      await authService.deleteAccount();
      navigate("/");
    } catch (err) {
      setDeleteError("Failed to delete account: " + err.message);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Navbar onLinkClick={handleNavClick} />
      <div className="acct-root">
        <h1 className="acct-profile-title">Profile</h1>

        {/* User info */}
        <div className="acct-user-section">
          <div className="acct-avatar">
            {getUserInitials(user?.user_metadata?.name || user?.email)}
          </div>
          <div className="acct-user-text">
            <span className="acct-user-name">{user?.user_metadata?.name || "User"}</span>
            <span className="acct-user-meta">
              {user?.email}&nbsp;·&nbsp;Member since{" "}
              {user
                ? new Date(user.created_at).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })
                : ""}
            </span>
          </div>
        </div>

        <hr className="acct-divider" />

        {/* Tabs */}
        <div className="acct-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`acct-tab${activeTab === tab ? " acct-tab--active" : ""}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Account content */}
        <div className="acct-section">

          {/* Session Info */}
          <div className="acct-card">
            <div className="acct-card-icon acct-card-icon--info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="acct-card-body">
              <h3 className="acct-card-title">Account Details</h3>
              <p className="acct-card-desc">Signed in as <strong>{user?.email}</strong></p>
              <div className="acct-info-rows">
                <div className="acct-info-row">
                  <span className="acct-info-label">Name</span>
                  <span className="acct-info-value">{user?.user_metadata?.name || "—"}</span>
                </div>
                <div className="acct-info-row">
                  <span className="acct-info-label">Email</span>
                  <span className="acct-info-value">{user?.email}</span>
                </div>
                <div className="acct-info-row">
                  <span className="acct-info-label">Phone</span>
                  <span className="acct-info-value">{user?.user_metadata?.phone || "—"}</span>
                </div>
                <div className="acct-info-row">
                  <span className="acct-info-label">Member since</span>
                  <span className="acct-info-value">
                    {user
                      ? new Date(user.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="acct-info-row">
                  <span className="acct-info-label">Total orders</span>
                  <span className="acct-info-value">{orders.length}</span>
                </div>
              </div>
              <button
                className="acct-edit-link"
                onClick={() => navigate("/profile")}
              >
                Edit Profile →
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <div className="acct-card">
            <div className="acct-card-icon acct-card-icon--neutral">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <div className="acct-card-body">
              <h3 className="acct-card-title">Sign Out</h3>
              <p className="acct-card-desc">
                Sign out of your Anika account on this device. Your cart and wishlist will be saved.
              </p>
              <button className="acct-logout-btn" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="acct-card acct-card--danger">
            <div className="acct-card-icon acct-card-icon--danger">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </div>
            <div className="acct-card-body">
              <h3 className="acct-card-title acct-card-title--danger">Delete Account</h3>
              <p className="acct-card-desc">
                Permanently delete your Anika account and all associated data — orders, addresses, and wishlist. 
                <strong> This action cannot be undone.</strong>
              </p>
              {hasActiveOrders && (
                <div className="acct-warning-banner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  You have {activeOrders.length} active order(s). Account deletion is blocked until all orders are delivered or cancelled.
                </div>
              )}
              {deleteError && !showDeleteModal && (
                <p className="acct-delete-error">{deleteError}</p>
              )}
              <button
                className="acct-delete-btn"
                onClick={handleDeleteRequest}
                disabled={hasActiveOrders}
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="acct-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="acct-modal" onClick={(e) => e.stopPropagation()}>
            <div className="acct-modal-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h2>Confirm Account Deletion</h2>
            </div>
            <p className="acct-modal-desc">
              This will permanently delete your account, all your orders history, saved addresses, and wishlist. 
              This action <strong>cannot be reversed</strong>.
            </p>
            <p className="acct-modal-instruction">
              Type <strong>DELETE</strong> below to confirm:
            </p>
            <input
              className="acct-modal-input"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE here"
              autoFocus
            />
            {deleteError && (
              <p className="acct-delete-error">{deleteError}</p>
            )}
            <div className="acct-modal-actions">
              <button
                className="acct-modal-cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError("");
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </button>
              <button
                className="acct-modal-confirm"
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteConfirm !== "DELETE"}
              >
                {isDeleting ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
