import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useAdmin } from "../hooks/useAdmin";
import { useStore } from "../hooks/useStore";
import { getUserInitials } from "../utils/avatarUtils";
import { getNavPath } from "../services/categoryRoute";
import LogoutModal from "./LogoutModal";
import "./SiteHeader.css";

// ── Static nav items always shown after DB categories ──
const STATIC_NAV_ITEMS = [
  { name: "All Products", hasDropdown: false, path: "/all-products" },
  { name: "New Arrivals", hasDropdown: false, path: "/#new-arrivals", isAnchor: true },
  { name: "Best Sellers", hasDropdown: false, path: "/#best-sellers", isAnchor: true },
  { name: "About", hasDropdown: false, path: "/#about", isAnchor: true },
  { name: "Contact Us", hasDropdown: false, path: "/contact" },
];

// ── Build nav items from DB categories ──
const buildCategoryNavItems = (categories = []) =>
  categories
    .filter((c) => c.is_active !== false)
    .map((c) => {
      const subs = (c.subcategories || [])
        .map((s) => ({
          name: s.name,
          slug: s.slug || (s.name ? s.name.toLowerCase().replace(/\s+/g, "-") : ""),
        }));

      return {
        name: c.name,
        slug: c.slug || (c.name ? c.name.toLowerCase().replace(/\s+/g, "-") : ""),
        hasDropdown: subs.length > 0,
        subcategories: subs,
        path: getNavPath(c.name, categories),
        fromDb: true,
      };
    });

// ─── Account / Login Dropdown Component ───
const LoginDropdown = () => {
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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

  const handleLogoutClick = () => {
    setOpen(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.signOut();
      setShowLogoutModal(false);
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const initials = getUserInitials(user?.user_metadata?.name || user?.email, "U");

  return (
    <>
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
                <button className="dropdown-logout" onClick={handleLogoutClick}>
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

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </>
  );
};

// ─── Desktop Nav Item Component ───
const DesktopNavItem = ({ item, onItemClick, onSubClick, isActive }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const subcategories = item.subcategories || [];
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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onItemClick(item);
    setOpen(false);
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
      onMouseEnter={() => hasDropdown && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
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
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
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
          {/* All [Category] shortcut */}
          <button
            type="button"
            className="nav-popup-item nav-popup-item--all"
            onClick={(e) => handleSubSelect(null, e)}
          >
            All {item.name}
          </button>
          {subcategories.map((sub) => (
            <button
              type="button"
              key={sub.slug || sub.name}
              className="nav-popup-item"
              onClick={(e) => handleSubSelect(sub, e)}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Mobile Nav Item Component ───
const MobileNavItem = ({ item, onItemClick, onSubClick }) => {
  const [expanded, setExpanded] = useState(false);

  const subcategories = item.subcategories || [];
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
          {/* All [Category] shortcut */}
          <button
            className="mobile-nav-subitem mobile-nav-subitem--all"
            onClick={() => { setExpanded(false); onSubClick(item, null); }}
          >
            All {item.name}
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub.slug || sub.name}
              className="mobile-nav-subitem"
              onClick={() => {
                setExpanded(false);
                onSubClick(item, sub);
              }}
            >
              {sub.name}
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

  const user = useStore((state) => state.user);
  const cartItems = useStore((state) => state.cartItems);
  const categories = useStore((state) => state.categories);
  const fetchCategories = useStore((state) => state.fetchCategories);
  const isAdmin = useStore((state) => state.isAdmin);

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef(null);
  const [headerBottom, setHeaderBottom] = useState(60);

  const updateHeaderHeight = useCallback(() => {
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      const actualHeight = headerRef.current.offsetHeight || 56;
      // When sticky/fixed at top, rect.bottom matches actualHeight.
      // At top of page (below topbar announcement), rect.bottom will be topbar + header.
      const calculatedBottom = rect.bottom >= actualHeight ? Math.round(rect.bottom) : actualHeight;
      setHeaderBottom(calculatedBottom);
    }
  }, []);

  useEffect(() => {
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    window.addEventListener("scroll", updateHeaderHeight, { passive: true });
    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
      window.removeEventListener("scroll", updateHeaderHeight);
    };
  }, [updateHeaderHeight, menuOpen, isScrolled]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchCategories(true);
  }, [fetchCategories]);

  const categoryNavItems = useMemo(
    () => buildCategoryNavItems(categories),
    [categories]
  );

  const navItems = useMemo(
    () => [...categoryNavItems, ...STATIC_NAV_ITEMS],
    [categoryNavItems]
  );

  const isItemActive = (item) => {
    if (!activeLink) return false;
    const a = activeLink.toLowerCase().trim();
    const n = item.name.toLowerCase().trim();
    if (a === n) return true;
    if (item.slug && a === item.slug.toLowerCase().trim()) return true;
    return false;
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      updateHeaderHeight();
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen, updateHeaderHeight]);

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
      const anchor = item.path.includes("#")
        ? item.path.split("#")[1]
        : item.name.toLowerCase().replace(/\s+/g, "-");
      const el = document.getElementById(anchor);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate(item.path);
      }
      return;
      
    }
    if (item.fromDb && onLinkClick) {
      onLinkClick(item.name);
      return;
    }
    navigate(item.path);
  };

  const handleSubClick = (item, sub) => {
    setMenuOpen(false);
    if (!sub) {
      navigate(item.path);
      return;
    }
    const subName = typeof sub === "object" ? (sub.name || sub.slug) : sub;
    const isAll = typeof subName === "string" ? subName.toLowerCase().startsWith("all ") : false;
    if (isAll) {
      navigate(item.path);
    } else {
      navigate(`${item.path}?sub=${encodeURIComponent(subName)}`);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/all-products?search=${encodeURIComponent(searchQuery.trim())}`);
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
      <header
        ref={headerRef}
        className={`header${isScrolled ? " header--scrolled" : ""}${menuOpen ? " header--menu-open" : ""}`}
      >
        <div className="header-container">
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
            {navItems.map((item) => (
              <DesktopNavItem
                key={item.name}
                item={item}
                onItemClick={handleItemClick}
                onSubClick={handleSubClick}
                isActive={isItemActive(item)}
              />
            ))}
          </nav>

          {/* Right: Actions (Search, Admin, Account on desktop; Cart & Hamburger on mobile) */}
          <div className="header-actions">
            {/* Search Icon Button (Mobile & Desktop) */}
            <button
              type="button"
              className="header-action-btn header-search-action-btn"
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

            {/* Admin Quick Button (Desktop only - mobile shown in sidebar only) */}
            {isAdmin && (
              <Link to="/admin" className="header-admin-pill desktop-only" title="Go to Admin Panel">
                Admin
              </Link>
            )}

            {/* User Account / Profile Dropdown (Mobile & Desktop) */}
            <div className="header-account-action-wrap">
              <LoginDropdown />
            </div>

            {/* Shopping Cart Button (Mobile & Desktop) */}
            <button
              type="button"
              className="header-action-btn header-cart-action-btn"
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

            {/* Mobile hamburger button (Rightmost on Mobile) */}
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
                placeholder="Search products, vest, shorts..."
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

      {/* ─── Backdrop Overlay when Mobile Menu Open ─── */}
      {menuOpen && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Mobile Drawer Menu (Sidebar) ─── */}
      <div
        className={`mobile-menu ${menuOpen ? "open" : ""}`}
        style={{
          top: `${headerBottom}px`,
          maxHeight: `calc(100dvh - ${headerBottom}px)`,
        }}
      >
        <nav className="mobile-nav-links">
          {navItems.map((item) => (
            <MobileNavItem
              key={item.name}
              item={item}
              onItemClick={handleItemClick}
              onSubClick={handleSubClick}
            />
          ))}
          {/* Admin button (Minimal sidebar style) */}
          {isAdmin && (
            <div className="mobile-sidebar-admin-box">
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="mobile-sidebar-admin-btn"
              >
                <div className="mobile-sidebar-admin-btn-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Admin Panel</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="admin-arrow-icon">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}