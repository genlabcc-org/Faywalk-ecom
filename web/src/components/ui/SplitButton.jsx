import React from 'react';
import './SplitButton.css';

export default function SplitButton({
  text = 'Subscribe',
  children,
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  style = {},
  ariaLabel,
  icon,
  ...props
}) {
  const content = children || text;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`split-btn ${className}`}
      style={style}
      aria-label={ariaLabel || (typeof content === 'string' ? content : 'Button')}
      {...props}
    >
      <span className="split-btn-text">
        {content}
      </span>
      <span className="split-btn-icon" aria-hidden="true">
        {icon || (
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="split-btn-arrow"
          >
            <path
              d="M3.5 12.5L12.5 3.5M12.5 3.5H5.5M12.5 3.5V10.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
