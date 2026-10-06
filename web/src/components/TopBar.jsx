import React from "react";
import "./TopBar.css";

export default function TopBar({ text = "Diwali Sale - Everything Is Off By 50%" }) {
  return (
    <div className="topbar">
      <div className="topbar-content">
        <span className="topbar-text">{text}</span>
      </div>
    </div>
  );
}
