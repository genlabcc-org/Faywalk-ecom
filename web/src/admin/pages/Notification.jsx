import React, { useState } from "react";
import "./Notification.css";

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    className={`notif__toggle${checked ? " notif__toggle--on" : ""}`}
    onClick={() => onChange(!checked)}
    aria-checked={checked}
    role="switch"
  >
    <span className="notif__toggle-knob" />
  </button>
);

const adminAlerts = [
  { id: "new_order",        label: "New order placed",          desc: "Email + push notification on every new order" },
  { id: "low_stock",        label: "Low stock alert",           desc: "Notify when a product hits the low stock threshold" },
  { id: "return_request",   label: "New return request",        desc: "Alert when a customer submits a damage return" },
  { id: "payment_failure",  label: "Payment failure alert",     desc: "Notify if a Razorpay payment fails at checkout" },
  { id: "new_customer",     label: "New customer registration", desc: "Daily digest of new signups" },
];

const customerEmails = [
  { id: "order_confirm",   label: "Order confirmation email",     desc: "Email + push notification on every new order" },
  { id: "order_shipped",   label: "Order shipped notification",   desc: "Sent when admin updates status to Shipped" },
  { id: "order_delivered", label: "Order delivered confirmation", desc: "Sent when status is marked Delivered" },
  { id: "return_status",   label: "Return status update",         desc: "Notify customer when return is approved or rejected" },
  { id: "refund_confirm",  label: "Refund processed confirmation",desc: "Notify customer when refund is initiated" },
  { id: "abandoned_cart",  label: "Abandoned cart reminder",      desc: "Send a reminder email if cart is left for 24h" },
];

const Notification = () => {
  const initState = (items) =>
    Object.fromEntries(items.map((it) => [it.id, false]));

  const [adminState,    setAdminState]    = useState(initState(adminAlerts));
  const [customerState, setCustomerState] = useState(initState(customerEmails));
  const [saved,         setSaved]         = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="notif">
      <div className="notif__header">
        <h1 className="notif__title">Settings</h1>
        <p className="notif__subtitle">Notifications</p>
      </div>

      <div className="notif__body">
        {/* Admin Alerts */}
        <section className="notif__section">
          <h2 className="notif__section-title">Admin Alerts</h2>
          <div className="notif__list">
            {adminAlerts.map((item) => (
              <div key={item.id} className="notif__row">
                <div className="notif__row-info">
                  <span className="notif__row-label">{item.label}</span>
                  <span className="notif__row-desc">{item.desc}</span>
                </div>
                <Toggle
                  checked={adminState[item.id]}
                  onChange={(val) => setAdminState((p) => ({ ...p, [item.id]: val }))}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Customer Emails */}
        <section className="notif__section">
          <h2 className="notif__section-title">Customer emails (auto-sent)</h2>
          <div className="notif__list">
            {customerEmails.map((item) => (
              <div key={item.id} className="notif__row">
                <div className="notif__row-info">
                  <span className="notif__row-label">{item.label}</span>
                  <span className="notif__row-desc">{item.desc}</span>
                </div>
                <Toggle
                  checked={customerState[item.id]}
                  onChange={(val) => setCustomerState((p) => ({ ...p, [item.id]: val }))}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="notif__footer">
          <button
            className={`notif__save-btn${saved ? " notif__save-btn--saved" : ""}`}
            onClick={handleSave}
          >
            {saved ? "Saved!" : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;