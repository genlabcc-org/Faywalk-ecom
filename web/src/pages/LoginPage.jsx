import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { authService } from "../services/authService";
import "./LoginPage.css";
import Toast from "../components/Toast";
import SEO from "../components/SEO";
import loginImg from "../assets/sign/welcome.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [toast, setToast] = useState({ message: "", type: "" });
  const navigate = useNavigate();

  const showToast = (message, type = "info") => {
    setToast({ message: "", type: "" });
    setTimeout(() => setToast({ message, type }), 10);
  };

  const handleGoogleLogin = async () => {
    if (loading || googleLoading) return;
    setGoogleLoading(true);
    try {
      await authService.signInWithGoogleFirebase();
      showToast("Google login successful!", "success");
      setTimeout(() => navigate("/"), 1000);
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
    if (loading || googleLoading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast("Please enter your email.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      const msg = "Please enter a valid email";
      setErrorMsg(msg);
      showToast(msg, "error");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const existingUser = await authService.checkUserExists(trimmedEmail);
      if (!existingUser) {
        const msg = "No user found with this email. Please sign up first.";
        setErrorMsg(msg);
        showToast(msg, "error");
        setLoading(false);
        return;
      }

      // Send OTP only if user exists
      await authService.signInWithOtp(trimmedEmail, {
        shouldCreateUser: false,
      });

      // User exists → OTP sent → redirect to verify
      showToast("OTP sent to email!", "success");
      setTimeout(() => navigate("/account/otp-verify", { state: { email: trimmedEmail } }), 1200);
    } catch (error) {
      const rawMsg = error?.message || "";
      const isInvalidEmail = /unable to validate email|invalid format|invalid email|valid email/i.test(rawMsg);
      const isUserNotFound = /signups not allowed|user not found|not found/i.test(rawMsg);
      const msg = isInvalidEmail
        ? "Please enter a valid email"
        : isUserNotFound
          ? "No user found with this email. Please sign up first."
          : (rawMsg || "Failed to send OTP. Please try again.");
      setErrorMsg(msg);
      showToast(msg, "error");
      setLoading(false);
      return;
    }
  };

  return (
    <div className="jewelry-page">
      <SEO
        title="Sign In | FAYWALK"
        description="Sign in to your FAYWALK account to track orders and manage your profile."
        robots="noindex, follow"
      />
      <div className="jewelry-left">
        <img
          src={loginImg}
          alt="login Image"
        />
      </div>

      {/* RIGHT — login form */}
      <div className="jewelry-right">
        <Link to="/">
          <div className="jewelry-logo">
            <img src="/logo.png" alt="Faywalk Logo" style={{ borderRadius: 0, height: 42, width: 135 }} />
          </div>
        </Link>
        <div className="jewelry-form-wrapper">

          <h2 className="jewelry-title">Login</h2>

          {/* ── EMAIL LOGIN FORM ── */}
          <label className="jewelry-label" htmlFor="email">
            Enter Email
          </label>
          <input
            id="email"
            type="email"
            className={`jewelry-input${errorMsg ? " jewelry-input-error" : ""}`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMsg) setErrorMsg("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                handleSendOTP();
              }
            }}
            placeholder="Enter your email"
            maxLength={64}
            disabled={loading || googleLoading}
          />
          {errorMsg && (
            <p className="jewelry-error-text">
              {errorMsg}{" "}
              {errorMsg.includes("sign up") && (
                <Link to="/account/signup" state={{ email: email.trim() }} className="jewelry-error-link">
                  Sign Up
                </Link>
              )}
            </p>
          )}

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
            <Link to="/account/signup" state={{ email: email.trim() }}>Sign Up</Link>
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
