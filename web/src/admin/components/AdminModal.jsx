import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "./AdminModal.css";

const AdminModal = ({
  isOpen = true,
  onClose,
  title,
  children,
  footer,
  maxWidth = 480,
  showClose = true,
  className = "",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className="admin-modal__backdrop"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`admin-modal__card ${className}`}
        style={{ maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="admin-modal__header">
            <h3 className="admin-modal__title">{title}</h3>
            {showClose && (
              <button
                type="button"
                className="admin-modal__close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="admin-modal__body">
          {children}
        </div>
        {footer && (
          <div className="admin-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default AdminModal;
