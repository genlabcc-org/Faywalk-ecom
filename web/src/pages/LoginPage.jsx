import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { authService } from "../services/authService";
import "./LoginPage.css";
import Toast from "../components/Toast";
import loginImg from "../assets/sign/welcome.png";

export default function LoginPage() {
  const [loginType, setLoginType] = useState("email"); // 'email' | 'phone'
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Phone auth states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneStep, setPhoneStep] = useState("input"); // 'input' | 'otp'
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [toast, setToast] = useState({ message: "", type: "" });
  const navigate = useNavigate();

  const showToast = (message, type = "info") => {
    setToast({ message: "", type: ""});
    setTimeout(() => setToast({ message, type}), 10);
  };

  const handleGoogleLogin = async () => {
    if (loading || googleLoading || phoneLoading) return;
    setGoogleLoading(true);
    try {
      await authService.signInWithGoogleFirebase();
      showToast("Google login successful!", "success");
      setTimeout(() => navigate("/profile"), 1000);
    } catch (error) {
      console.error("Google login error:", error);
      if (error?.code === "auth/popup-closed-by-user") {
        setGoogleLoading(false);
        return;
      }
      showToast(error.message || "Failed to sign in with Google.", "error");
      setGoogleLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (loading || googleLoading || phoneLoading) return;
    if (!email) {
      showToast("Please enter your email.", "error");
      return;
    }

    setLoading(true);

    try {
      // Step 1 — try to send OTP only if user exists
      await authService.signInWithOtp(email, {
        shouldCreateUser: false,
      });

      // Step 3 — user exists → OTP sent → redirect to verify
      showToast("OTP sent to email!", "success");
      setTimeout(() => navigate("/account/otp-verify", { state: { email } }), 1200);
    } catch (error) {
      // Step 2 — user doesn't exist → redirect to signup
      showToast("Email not found! Please sign up first.", "error");
      setTimeout(() => navigate("/account/signup"),  1500);
      setLoading(false);
      return;
    }
  };

  // ── PHONE AUTH HANDLERS (FIREBASE) ──
  const handleSendPhoneOTP = async () => {
    if (loading || googleLoading || phoneLoading) return;
    const cleanDigits = phoneNumber.replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 10) {
      showToast("Please enter a valid 10-digit phone number.", "error");
      return;
    }

    const fullPhone = phoneNumber.startsWith("+")
      ? phoneNumber.trim()
      : `+91${cleanDigits.slice(-10)}`;

    setPhoneLoading(true);

    try {
      const confirmation = await authService.sendPhoneOtpFirebase(fullPhone, "recaptcha-container");
      setConfirmationResult(confirmation);
      setPhoneStep("otp");
      showToast(`SMS OTP sent to ${fullPhone}`, "success");
    } catch (err) {
      console.error("Phone OTP send error:", err);
      showToast(err.message || "Failed to send SMS OTP. Please try again.", "error");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (loading || googleLoading || phoneLoading) return;
    if (!phoneOtp || phoneOtp.length < 6) {
      showToast("Please enter the 6-digit OTP code.", "error");
      return;
    }
    if (!confirmationResult) {
      showToast("Verification session expired. Please request OTP again.", "error");
      setPhoneStep("input");
      return;
    }

    setPhoneLoading(true);

    try {
      await authService.verifyPhoneOtpFirebase(confirmationResult, phoneOtp);
      showToast("Phone login successful!", "success");
      setTimeout(() => navigate("/profile"), 1000);
    } catch (err) {
      console.error("Phone OTP verify error:", err);
      showToast(err.message || "Invalid OTP code. Please check and retry.", "error");
      setPhoneLoading(false);
    }
  };

  return (
    <div className="jewelry-page">
      <div className="jewelry-left">
        <img
          src={loginImg}
          alt="login Image"
        />
      </div>

      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>

      {/* RIGHT — login form */}
      <div className="jewelry-right">
        <Link to="/">
          <div className="jewelry-logo">
            <img src="/logo.png" alt="Faywalk Logo" style={{ borderRadius: 0, height: 42, objectFit: "contain" }} />
          </div>
        </Link>
        <div className="jewelry-form-wrapper">

          <h2 className="jewelry-title">Login</h2>

          {/* Login Type Tabs */}
          <div className="jewelry-tabs">
            <button
              type="button"
              className={`jewelry-tab-btn ${loginType === "email" ? "active" : ""}`}
              onClick={() => {
                setLoginType("email");
                setPhoneStep("input");
              }}
              disabled={loading || phoneLoading || googleLoading}
            >
              Email
            </button>
            <button
              type="button"
              className={`jewelry-tab-btn ${loginType === "phone" ? "active" : ""}`}
              onClick={() => {
                setLoginType("phone");
              }}
              disabled={loading || phoneLoading || googleLoading}
            >
              Phone Number
            </button>
          </div>

          {/* ── EMAIL LOGIN FORM ── */}
          {loginType === "email" && (
            <>
              <label className="jewelry-label" htmlFor="email">
                Enter Email
              </label>
              <input
                id="email"
                type="email"
                className="jewelry-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    handleSendOTP();
                  }
                }}
                placeholder=""
                maxLength={32}
                disabled={loading || googleLoading}
              />

              <button
                type="button"
                className="jewelry-btn-otp"
                onClick={handleSendOTP}
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <span className="jewelry-btn-loading">
                    <span className="jewelry-spinner" />
                    Sending OTP...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </>
          )}

          {/* ── PHONE LOGIN FORM (FIREBASE) ── */}
          {loginType === "phone" && phoneStep === "input" && (
            <>
              <label className="jewelry-label" htmlFor="phone">
                Enter Mobile Number
              </label>
              <div className="jewelry-phone-group">
                <span className="jewelry-phone-prefix">+91</span>
                <input
                  id="phone"
                  type="tel"
                  className="jewelry-input jewelry-phone-input"
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhoneNumber(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !phoneLoading) {
                      handleSendPhoneOTP();
                    }
                  }}
                  placeholder="98765 43210"
                  maxLength={10}
                  disabled={phoneLoading || googleLoading}
                />
              </div>

              <button
                type="button"
                className="jewelry-btn-otp"
                onClick={handleSendPhoneOTP}
                disabled={phoneLoading || googleLoading}
              >
                {phoneLoading ? (
                  <span className="jewelry-btn-loading">
                    <span className="jewelry-spinner" />
                    Sending SMS OTP...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </>
          )}

          {/* ── PHONE OTP VERIFICATION STEP ── */}
          {loginType === "phone" && phoneStep === "otp" && (
            <>
              <label className="jewelry-label" htmlFor="phone-otp">
                Enter 6-Digit SMS Code
              </label>
              <p className="jewelry-phone-subtext">
                Sent to +91 {phoneNumber}
              </p>
              <input
                id="phone-otp"
                type="text"
                inputMode="numeric"
                className="jewelry-input"
                value={phoneOtp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPhoneOtp(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !phoneLoading) {
                    handleVerifyPhoneOTP();
                  }
                }}
                placeholder="123456"
                maxLength={6}
                disabled={phoneLoading || googleLoading}
                autoFocus
              />

              <div className="jewelry-phone-actions">
                <button
                  type="button"
                  className="jewelry-link-btn"
                  onClick={() => {
                    setPhoneStep("input");
                    setPhoneOtp("");
                  }}
                  disabled={phoneLoading}
                >
                  Change Number
                </button>
                <button
                  type="button"
                  className="jewelry-link-btn"
                  onClick={handleSendPhoneOTP}
                  disabled={phoneLoading}
                >
                  Resend SMS
                </button>
              </div>

              <button
                type="button"
                className="jewelry-btn-otp"
                onClick={handleVerifyPhoneOTP}
                disabled={phoneLoading || googleLoading}
              >
                {phoneLoading ? (
                  <span className="jewelry-btn-loading">
                    <span className="jewelry-spinner" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Login"
                )}
              </button>
            </>
          )}

          {/* Divider */}
          <div className="jewelry-divider">
            <span className="jewelry-divider-line" />
            <span className="jewelry-divider-text">or</span>
            <span className="jewelry-divider-line" />
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            className="jewelry-btn-google"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Signing in..." : "Sign in with Google"}
          </button>

          {/* Sign up link */}
          <p className="jewelry-signup-text">
            Don't have an account?{" "}
            <a href="/account/signup">Sign Up</a>
          </p>

        </div>
      </div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: ""})}
      />
    </div>
  );
}
