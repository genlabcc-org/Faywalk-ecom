import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { supabase } from "../lib/supabase";
import { getUserInitials } from "../utils/avatarUtils";
import Navbar from "../components/SiteHeader";
import Footer from "../components/SiteFooter";
import TopBar from "../components/TopBar";
import "./ProfileLayout.css";

const TABS = [
  { label: "Profile",   path: "/profile" },
  { label: "Orders",    path: "/profile/orders" },
  { label: "Addresses", path: "/profile/addresses" },
];

export default function ProfileLayout({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const user = useStore((s) => s.user);
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchDbProfile = async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("name")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.name) {
          setProfileName(data.name);
        }
      } catch (e) {
        console.error("Error fetching profile name:", e);
      }
    };
    fetchDbProfile();
  }, [user]);

  const handleNavClick = (link) => {
    if (link === "Home") navigate("/");
    else navigate(`/${link.toLowerCase()}`);
  };

  const displayName =
    profileName ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "";

  const isTabActive = (tabPath) => {
    if (tabPath === "/profile") {
      return pathname === "/profile" || pathname === "/profile/";
    }
    return pathname.startsWith(tabPath);
  };

  return (
    <>
      <TopBar />
      <Navbar onLinkClick={handleNavClick} />
      <div className="pl-root">
        <main className="pl-main">
          {/* ── Title ── */}
          <h1 className="pl-title">PROFILE</h1>

          {/* ── User Info ── */}
          <div className="pl-user-info">
            <div className="pl-avatar">
              {getUserInitials(displayName || user?.email)}
            </div>
            <div className="pl-user-text">
              <span className="pl-user-name">{displayName}</span>
              <span className="pl-user-meta">
                {user?.email}&nbsp;·&nbsp;Member since {memberSince}
              </span>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="pl-divider" />

          {/* ── Tabs ── */}
          <div className="pl-tabs">
            {TABS.map(({ label, path }) => (
              <button
                key={label}
                className={`pl-tab${isTabActive(path) ? " pl-tab--active" : ""}`}
                onClick={() => navigate(path)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Page Content ── */}
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
