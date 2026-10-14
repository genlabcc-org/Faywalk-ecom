import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "./LogoutModal.css";

export default function LogoutModal({ isOpen, onClose, onConfirm, loading = false }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="logout-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Minimal Icon Badge */}
        <div className="logout-modal-icon-wrap">
          <svg
            width="22"
            height="22"
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
        </div>

        <div className="logout-modal-content">
          <h3 id="logout-modal-title" className="logout-modal-title">
            Log Out
          </h3>
          <p className="logout-modal-subtitle">
            Are you sure you want to log out of your account?
          </p>
        </div>

        <div className="logout-modal-actions">
          <button
            type="button"
            className="logout-modal-btn logout-modal-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="logout-modal-btn logout-modal-btn-confirm admin-btn-with-spinner"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="admin-btn-spinner" /> Logging out...
              </>
            ) : (
              "Log Out"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
