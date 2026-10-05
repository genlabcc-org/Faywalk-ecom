import React from "react";
import ReactDOM from "react-dom";
import "./confirmdialogs.css";

const ConfirmDialog = ({
  title = "Are You Sure?",
  message,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  isLoading = false,
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  const content = (
    <div className="confirm-dialog-backdrop" onClick={isLoading ? undefined : onCancel}>
      <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-dialog-title">{title}</h2>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn-outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog-btn ${isDanger ? "confirm-dialog-btn-danger" : "confirm-dialog-btn-dark"}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (isDanger ? "Deleting..." : "Saving...") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default ConfirmDialog;