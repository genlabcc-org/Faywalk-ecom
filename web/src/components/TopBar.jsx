import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import "./TopBar.css";

export default function TopBar({ text: defaultPropText }) {
  const topbarData = useStore((s) => s.topbarData);
  const fetchTopBar = useStore((s) => s.fetchTopBar);

  useEffect(() => {
    fetchTopBar();
  }, [fetchTopBar]);

  // If DB says inactive, don't display
  if (topbarData && topbarData.is_active === false) {
    return null;
  }

  const displayText = (topbarData?.text ?? defaultPropText ?? "").trim();
  if (!displayText) {
    return null;
  }

  const destination = topbarData?.link_url || "/products";

  return (
    <aside className="topbar" aria-label="Store announcement">
      <div className="topbar-content">
        <Link to={destination} className="topbar-link">
          <span className="topbar-text">{displayText}</span>
        </Link>
      </div>
    </aside>
  );
}
