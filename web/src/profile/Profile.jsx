import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { authService } from "../services/authService";
import { useStore } from "../hooks/useStore";
import { supabase } from "../lib/supabase";
import { getUserInitials } from "../utils/avatarUtils";
import "./Profile.css";
import Navbar from "../components/SiteHeader";
import Footer from "../components/SiteFooter";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (link) => {
    if (link === "Home") {
      navigate("/");
    } else {
      navigate(`/${link.toLowerCase()}`);
    }
  };

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
        const { data: profile, error } = await supabase
          .from("profiles")
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
      // 1. Save to profiles database table
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: tempDetails.name,
          phone: tempDetails.phone,
          email: user.email,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "id",
        }
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

  const tabs = ["Profile", "Orders", "Addresses", "Wishlists", "Account"];

  const handleTabClick = (tab) => {
    if (tab === "Orders") {
      navigate("/profile/orders");
    } else if (tab === "Addresses") {
      navigate("/profile/addresses");
    } else if (tab === "Wishlists") {
      navigate("/profile/wishlists");
    } else if (tab === "Account") {
      navigate("/profile/account");
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <>
      <Navbar onLinkClick={handleNavClick} />
      <div className="profile-root">
        <main className="profile-main">
          <h1 className="profile-title">Profile</h1>

          {/* User Info */}
          <div className="profile-user-info">
            <div className="profile-avatar">
              {getUserInitials(customerDetails.name || user?.user_metadata?.name || user?.email)}
            </div>
            <div className="profile-user-text">
              <span className="profile-user-name">{customerDetails.name}</span>
              <span className="profile-user-meta">
                {customerDetails.email} &nbsp;·&nbsp; Member since {customerDetails.customerSince}
              </span>
              <span className="profile-vip-badge">{customerDetails.totalOrders}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="profile-tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`profile-tab${activeTab === tab ? " profile-tab--active" : ""}`}
                onClick={() => handleTabClick(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

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
        </main>
      </div>
      <Footer />
    </>
  );
}
