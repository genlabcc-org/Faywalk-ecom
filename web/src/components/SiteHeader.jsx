import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useAdmin } from "../hooks/useAdmin";
import { useStore } from "../hooks/useStore";
import { getUserInitials } from "../utils/avatarUtils";
import "./SiteHeader.css";

const NAV_ITEMS = [
  {
    name: "Male",
    hasDropdown: true,
    defaultSubs: [
      "All Men's",
      "Briefs",
      "Trunks",
      "Boxers",
      "Vests",
      "Thermals",
      "Loungewear"
    ],
    path: "/category/male",
  },
  {
    name: "Female",
    hasDropdown: true,
    defaultSubs: [
      "All Women's",
      "Bras",
      "Panties",
      "Camisoles & Slips",
      "Shapewear",
      "Sleepwear",
      "Thermals"
    ],
    path: "/category/female",
  },
  {
    name: "New arrivals",
    hasDropdown: false,
    path: "/category/new-arrivals",
  },
  {
    name: "Best Sellers",
    hasDropdown: false,
    path: "/category/best-sellers",
  },
  {
    name: "Trending Now",
    hasDropdown: false,
    path: "/category/trending-now",
  },
  {
    name: "About",
    hasDropdown: false,
    path: "/#about",
    isAnchor: true,
  },
  {
    name: "Contact Us",
    hasDropdown: false,
    path: "/contact",
  },
];

// Helper to get real subcategories from DB or fall back to defaults
const getSubcategories = (item, categories = []) => {
  if (!item.hasDropdown) return [];

  const matched = categories.find(
    (c) => c.name?.toLowerCase() === item.name.toLowerCase() ||
      c.slug?.toLowerCase() === item.name.toLowerCase()
  );

  const realSubs = (matched?.subcategories || [])
    .map((s) => (typeof s === "string" ? s : s.name))
    .filter(Boolean);

  if (realSubs.length > 0) {
    return [`All ${item.name}`, ...realSubs];
  }

  // Also check if any category has parent_id pointing to this category
  if (matched?.category_id || matched?.id) {
    const pId = matched.category_id || matched.id;
    const children = categories.filter((c) => c.parent_id === pId);
    if (children.length > 0) {
      return [`All ${item.name}`, ...children.map((c) => c.name)];
    }
  }

  return item.defaultSubs || [];
};

// ─── Account / Login Dropdown Component ───
const LoginDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const user = useStore((s) => s.user);
  const isAdmin = useStore((s) => s.isAdmin);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
    setOpen(false);
    navigate("/");
  };

  const initials = getUserInitials(user?.user_metadata?.name || user?.email, "U");

  return (
    <div className="login-wrapper" ref={ref}>
      <button
        type="button"
        className="header-action-btn"
        aria-label="Account"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {user ? (
          <div className="header-avatar-circle" title={user.user_metadata?.name || user.email}>
            {initials}
          </div>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </button>

      {open && (
        <div className="login-dropdown">
          {user ? (
            <>
              <div className="dropdown-user-header">
                <div className="dropdown-avatar-circle">{initials}</div>
                <div className="dropdown-user-info">
                  <p className="dropdown-name">{user.user_metadata?.name || "User"}</p>
                  <p className="dropdown-email">{user.email}</p>
                </div>
              </div>
              <hr />
              <Link to="/profile" onClick={() => setOpen(false)}>My Profile</Link>
              <Link to="/profile/orders" onClick={() => setOpen(false)}>My Orders</Link>
              {isAdmin && (
                <>
                  <hr />
                  <Link to="/admin" onClick={() => setOpen(false)} className="admin_link">
                    Admin Panel
                  </Link>
                </>
              )}
              <hr />
              <button className="dropdown-logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/account/login" onClick={() => setOpen(false)}>Login</Link>
              <hr />
              <Link to="/account/signup" onClick={() => setOpen(false)}>
                New Customer? <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Desktop Nav Item Component ───
const DesktopNavItem = ({ item, categories, onItemClick, onSubClick, isActive }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const subcategories = useMemo(
    () => getSubcategories(item, categories),
    [item, categories]
  );
  const hasDropdown = item.hasDropdown && subcategories.length > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleMainClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasDropdown) {
      onItemClick(item);
      return;
    }
    setOpen((prev) => !prev);
  };

  const handleSubSelect = (sub, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen(false);
    onSubClick(item, sub);
  };

  return (
    <div
      className="nav-item-wrapper"
      ref={ref}
    >
      <button
        type="button"
        className={`nav-link ${isActive ? "active" : ""} ${hasDropdown ? "has-dropdown" : ""}`}
        onClick={handleMainClick}
      >
        <span>{item.name}</span>
        {hasDropdown && (
          <svg
            className={`nav-caret-icon ${open ? "open" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            width="14"
            height="14"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {hasDropdown && open && (
        <div className="nav-popup">
          {subcategories.map((sub) => (
            <button
              type="button"
              key={sub}
              className="nav-popup-item"
              onClick={(e) => handleSubSelect(sub, e)}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Mobile Nav Item Component ───
const MobileNavItem = ({ item, categories, onItemClick, onSubClick }) => {
  const [expanded, setExpanded] = useState(false);

  const subcategories = useMemo(
    () => getSubcategories(item, categories),
    [item, categories]
  );
  const hasDropdown = item.hasDropdown && subcategories.length > 0;

  const handleMainClick = () => {
    if (!hasDropdown) {
      onItemClick(item);
      return;
    }
    setExpanded((e) => !e);
  };

  return (
    <div className="mobile-nav-item">
      <button
        className={`mobile-nav-link ${expanded ? "expanded" : ""}`}
        onClick={handleMainClick}
      >
        <span>{item.name}</span>
        {hasDropdown && (
          <svg
            className={`mobile-nav-caret-icon ${expanded ? "open" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            width="16"
            height="16"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {hasDropdown && expanded && (
        <div className="mobile-nav-submenu">
          {subcategories.map((sub) => (
            <button
              key={sub}
              className="mobile-nav-subitem"
              onClick={() => {
                setExpanded(false);
                onSubClick(item, sub);
              }}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main SiteHeader ───
export default function SiteHeader({ activeLink = "", onLinkClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const navigate = useNavigate();

  const cartItems = useStore((state) => state.cartItems);
  const categories = useStore((state) => state.categories);
  const fetchCategories = useStore((state) => state.fetchCategories);

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close search on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  // Focus search input when open
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleItemClick = (item) => {
    setMenuOpen(false);
    if (item.isAnchor) {
      const targetId = item.name.toLowerCase().includes("contact") ? "contact" : "about";
      const el = document.getElementById(targetId) || document.getElementById(`${targetId}-us`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate(item.path);
      }
      return;
    }
    navigate(item.path);
  };

  const handleSubClick = (item, sub) => {
    setMenuOpen(false);
    const isAll = sub.toLowerCase().startsWith("all ");
    if (isAll) {
      navigate(item.path);
    } else {
      navigate(`${item.path}?sub=${encodeURIComponent(sub)}`);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/all?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          {/* Mobile hamburger button */}
          <button
            type="button"
            className="burger-btn mobile-only"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <div className={`burger-icon ${menuOpen ? "open" : ""}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>

          {/* Left: Brand Logo */}
          <div
            className="header-logo"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            <img src="/logo.png" alt="FAY WALK" className="header-logo-img" />
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="desktop-nav">
            {NAV_ITEMS.map((item) => (
              <DesktopNavItem
                key={item.name}
                item={item}
                categories={categories}
                onItemClick={handleItemClick}
                onSubClick={handleSubClick}
                isActive={activeLink.toLowerCase() === item.name.toLowerCase()}
              />
            ))}
          </nav>

          {/* Right: Actions (Search, Account, Cart) */}
          <div className="header-actions">
            {/* Search Icon Button */}
            <button
              type="button"
              className="header-action-btn"
              aria-label="Search"
              onClick={(e) => {
                e.preventDefault();
                setSearchOpen(!searchOpen);
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* User Account / Profile Dropdown */}
            <LoginDropdown />

            {/* Shopping Cart Button */}
            <button
              type="button"
              className="header-action-btn"
              aria-label="Cart"
              onClick={(e) => {
                e.preventDefault();
                navigate("/cart");
              }}
              style={{ position: "relative" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="cart-badge-count">{cartCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* ─── Expandable Search Overlay Bar ─── */}
        {searchOpen && (
          <div className="header-search-bar" ref={searchContainerRef}>
            <div className="header-search-inner">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="header-search-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products, shoes, sandals, sneakers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="header-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="header-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                className="header-search-submit"
                onClick={handleSearchSubmit}
              >
                Search
              </button>
              <button
                type="button"
                className="header-search-close"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─── Mobile Drawer Menu ─── */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <nav className="mobile-nav-links">
          {NAV_ITEMS.map((item) => (
            <MobileNavItem
              key={item.name}
              item={item}
              categories={categories}
              onItemClick={handleItemClick}
              onSubClick={handleSubClick}
            />
          ))}
          <div className="mobile-extra-links">
            <Link to="/cart" onClick={() => setMenuOpen(false)} className="mobile-extra-link">
              Shopping Cart ({cartCount})
            </Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="mobile-extra-link">
              My Profile
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}