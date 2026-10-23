import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { supabase } from "../lib/supabase";
import "./TopBar.css";

export default function TopBar({ text: defaultPropText }) {
  const topbarData = useStore((s) => s.topbarData);
  const fetchTopBar = useStore((s) => s.fetchTopBar);

  useEffect(() => {
    fetchTopBar();
  }, [fetchTopBar]);

  // Real-time synchronization when admin adds/edits/toggles topbar
  useEffect(() => {
    const channel = supabase
      .channel("storefront-topbar-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "topbar" },
        () => {
          fetchTopBar(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTopBar]);

  // Extract all active announcements
  const activeAnnouncements = useMemo(() => {
    if (!topbarData) return [];
    const list = Array.isArray(topbarData) ? topbarData : [topbarData];
    return list.filter(
      (item) => item && item.is_active !== false && (item.text || "").trim().length > 0
    );
  }, [topbarData]);

  // If no active announcements from DB, fallback to prop text if provided
  if (activeAnnouncements.length === 0) {
    const fallbackText = (defaultPropText || "").trim();
    if (!fallbackText) return null;

    return (
      <aside className="topbar" aria-label="Store announcement">
        <div className="topbar-content">
          <Link to="/products" className="topbar-link">
            <span className="topbar-text">{fallbackText}</span>
          </Link>
        </div>
      </aside>
    );
  }

  // Handle single announcement (centered static)
  if (activeAnnouncements.length === 1) {
    const single = activeAnnouncements[0];
    const destination = (single.link_url || "/products").trim();
    const isExternal = destination.startsWith("http://") || destination.startsWith("https://");

    return (
      <aside className="topbar" aria-label="Store announcement">
        <div className="topbar-content">
          {isExternal ? (
            <a
              href={destination}
              target="_blank"
              rel="noopener noreferrer"
              className="topbar-link"
            >
              <span className="topbar-text">{single.text}</span>
            </a>
          ) : (
            <Link to={destination} className="topbar-link">
              <span className="topbar-text">{single.text}</span>
            </Link>
          )}
        </div>
      </aside>
    );
  }

  // Handle multiple announcements: Continuous infinite running ticker
  // We repeat the active items list multiple times to guarantee a seamless 0 to -50% loop on any screen resolution
  const repeatedItems = [
    ...activeAnnouncements,
    ...activeAnnouncements,
    ...activeAnnouncements,
    ...activeAnnouncements,
  ];

  return (
    <aside className="topbar topbar--marquee" aria-label="Store announcement">
      <div className="topbar-marquee-wrapper">
        <div className="topbar-marquee-track">
          {repeatedItems.map((item, index) => {
            const destination = (item.link_url || "/products").trim();
            const isExternal = destination.startsWith("http://") || destination.startsWith("https://");

            return (
              <span key={`${item.id || index}-${index}`} className="topbar-marquee-item">
                {isExternal ? (
                  <a
                    href={destination}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="topbar-link"
                  >
                    <span className="topbar-text">{item.text}</span>
                  </a>
                ) : (
                  <Link to={destination} className="topbar-link">
                    <span className="topbar-text">{item.text}</span>
                  </Link>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
