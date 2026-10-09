import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useStore } from "../hooks/useStore";
import { supabase } from "../lib/supabase";
import "./Profile.css";
import ProfileLayout from "./ProfileLayout";

const ACTIVE_STATUSES = ["Pending", "Confirmed", "Shipped"];

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  const user = useStore((s) => s.user);
  const sessionLoading = useStore((s) => s.sessionLoading);
  const orders = useStore((s) => s.orders);
  const fetchOrders = useStore((s) => s.fetchOrders);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    email: "",
    customerSince: "",
    totalOrders: "0 orders",
  });
  const [tempDetails, setTempDetails] = useState({ ...customerDetails });

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      navigate("/account/login");
      return;
    }
    fetchOrders(user.id);
  }, [user, sessionLoading]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const joinedDate = new Date(user.created_at).toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        });
        const orderCountStr = `${orders.length} order${orders.length !== 1 ? "s" : ""}`;

        const details = {
          name: profile?.name || user.user_metadata?.name || "No name set",
          phone: profile?.phone || user.user_metadata?.phone || "No phone set",
          email: user.email,
          customerSince: joinedDate,
          totalOrders: orderCountStr,
        };

        setCustomerDetails(details);
        setTempDetails(details);
      } catch (err) {
        console.error("Error fetching profile from database:", err);
      }
    };

    fetchProfile();
  }, [user, orders]);

  const handleEdit = () => {
    setTempDetails({ ...customerDetails });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // 1. Save to users database table
      const { error: profileError } = await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            name: tempDetails.name,
            phone: tempDetails.phone,
            email: user.email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      // 2. Also save to metadata to keep it in sync
      await authService.updateUser({
        data: {
          name: tempDetails.name,
          phone: tempDetails.phone,
        },
      });

      const { session } = await authService.refreshSession();
      if (session?.user) {
        useStore.setState({ user: session.user });
      }

      setCustomerDetails({ ...tempDetails });
      setIsEditing(false);
    } catch (error) {
      alert("Failed to save profile: " + error.message);
    }
  };

  const handleCancel = () => {
    setTempDetails({ ...customerDetails });
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setTempDetails((prev) => ({ ...prev, [field]: value }));
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
    <ProfileLayout>
      {/* Customer Details Card */}
      <div className="profile-card">
        <div className="profile-card-header">
          <span className="profile-card-title">Customer details</span>
          <div className="profile-card-header-actions">
            {isEditing ? (
              <>
                <button className="profile-save-btn" onClick={handleSave}>Save</button>
                <button className="profile-cancel-btn" onClick={handleCancel}>Cancel</button>
              </>
            ) : (
              <button className="profile-edit-btn" onClick={handleEdit}>Edit</button>
            )}
          </div>
        </div>
        <div className="profile-card-body">
          <div className="profile-detail-row">
            <span className="profile-detail-label">Name</span>
            {isEditing ? (
              <input
                className="profile-detail-input"
                value={tempDetails.name}
                placeholder="Enter your name"
                onChange={(e) => handleChange("name", e.target.value)}
              />
            ) : (
              <span className="profile-detail-value">{customerDetails.name}</span>
            )}
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label">Phone</span>
            {isEditing ? (
              <input
                className="profile-detail-input"
                value={tempDetails.phone}
                placeholder="Enter your phone"
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            ) : (
              <span className="profile-detail-value">{customerDetails.phone}</span>
            )}
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label">Email</span>
            {/* email is read-only — comes from Supabase Auth */}
            <span className="profile-detail-value">{customerDetails.email}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label">Customer Since</span>
            <span className="profile-detail-value">{customerDetails.customerSince}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label">Total Orders</span>
            <span className="profile-detail-value">{customerDetails.totalOrders}</span>
          </div>
        </div>
      </div>

      {/* ── Account Actions (Sign Out & Delete Account) ── */}
      <div className="profile-actions-card">
        <div className="profile-action-group">
          <div className="profile-action-text">
            <span className="profile-action-title">Sign Out</span>
            <span className="profile-action-desc">
              Sign out of your Faywalk account on this device.
            </span>
          </div>
          <button className="profile-logout-btn" onClick={handleLogout}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>

        <div className="profile-action-divider" />

        <div className="profile-action-group">
          <div className="profile-action-text">
            <span className="profile-action-title profile-action-title--danger">
              Delete Account
            </span>
            <span className="profile-action-desc">
              Permanently delete your Faywalk account and all associated data.
            </span>
            {hasActiveOrders && (
              <span className="profile-action-warning">
                Account deletion is blocked while you have {activeOrders.length} active order(s).
              </span>
            )}
            {deleteError && !showDeleteModal && (
              <span className="profile-action-error">{deleteError}</span>
            )}
          </div>
          <button
            className="profile-delete-btn"
            onClick={handleDeleteRequest}
            disabled={hasActiveOrders}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Delete Account
          </button>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="profile-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h2>Confirm Account Deletion</h2>
            </div>
            <p className="profile-modal-desc">
              This will permanently delete your account, order history, addresses, and wishlist. This action <strong>cannot be reversed</strong>.
            </p>
            <p className="profile-modal-instruction">
              Type <strong>DELETE</strong> below to confirm:
            </p>
            <input
              className="profile-modal-input"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE here"
              autoFocus
            />
            {deleteError && (
              <p className="profile-modal-error">{deleteError}</p>
            )}
            <div className="profile-modal-actions">
              <button
                className="profile-modal-cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError("");
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </button>
              <button
                className="profile-modal-confirm"
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteConfirm !== "DELETE"}
              >
                {isDeleting ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
}
