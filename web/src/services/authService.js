import { supabase } from '../lib/supabase';
import { auth, googleProvider } from '../lib/firebase';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';

export const authService = {
  /**
   * Signs in with Google using Firebase Auth and syncs session with database users table.
   * @returns {Promise<any>}
   */
  async signInWithGoogleFirebase() {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error("No email found for this Google account.");
    }

    const { data: syncData, error: syncError } = await supabase.functions.invoke("google-auth-sync", {
      body: {
        email: firebaseUser.email,
        name: firebaseUser.displayName || "",
        phone: firebaseUser.phoneNumber || "",
      },
    });

    if (syncError || !syncData?.success) {
      throw new Error(syncError?.message || syncData?.error || "Failed to sync Google user with database.");
    }

    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: syncData.hashed_token,
      type: syncData.verification_type,
    });

    if (verifyError) throw verifyError;
    return sessionData;
  },

  /**
   * Gets or initializes an invisible RecaptchaVerifier for phone authentication.
   * @param {string} containerId 
   * @returns {RecaptchaVerifier}
   */
  getRecaptchaVerifier(containerId = "recaptcha-container") {
    if (window.recaptchaVerifier) {
      return window.recaptchaVerifier;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (_) {}
          window.recaptchaVerifier = null;
        }
      }
    });
    return window.recaptchaVerifier;
  },

  /**
   * Sends SMS OTP to a phone number using Firebase Phone Auth.
   * @param {string} phoneNumber 
   * @param {string} containerId 
   * @returns {Promise<any>} confirmationResult
   */
  async sendPhoneOtpFirebase(phoneNumber, containerId = "recaptcha-container") {
    const appVerifier = this.getRecaptchaVerifier(containerId);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return confirmationResult;
    } catch (err) {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (_) {}
        window.recaptchaVerifier = null;
      }
      throw err;
    }
  },

  /**
   * Verifies the SMS OTP and establishes a session in Supabase & users table.
   * @param {any} confirmationResult 
   * @param {string} otpCode 
   * @returns {Promise<any>}
   */
  async verifyPhoneOtpFirebase(confirmationResult, otpCode) {
    const result = await confirmationResult.confirm(otpCode);
    const firebaseUser = result.user;
    if (!firebaseUser) {
      throw new Error("Phone verification failed.");
    }

    const { data: syncData, error: syncError } = await supabase.functions.invoke("google-auth-sync", {
      body: {
        phone: firebaseUser.phoneNumber || "",
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      },
    });

    if (syncError || !syncData?.success) {
      throw new Error(syncError?.message || syncData?.error || "Failed to sync user with database.");
    }

    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: syncData.hashed_token,
      type: syncData.verification_type,
    });

    if (verifyError) throw verifyError;
    return sessionData;
  },

  /**
   * Retrieves the current user session.
   * @returns {Promise<{ session: any }>}
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Retrieves the currently logged-in user.
   * @returns {Promise<{ user: any }>}
   */
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Sends a sign-in/verification OTP code to the provided email.
   * @param {string} email 
   * @param {object} [options]
   * @returns {Promise<void>}
   */
  async signInWithOtp(email, options = {}) {
    const { error } = await supabase.auth.signInWithOtp({ email, options });
    if (error) throw error;
  },

  /**
   * Verifies the OTP verification code and logs the user in.
   * @param {string} email 
   * @param {string} token 
   * @param {string} [type='email'] 
   * @returns {Promise<any>}
   */
  async verifyOtp(email, token, type = 'email') {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type
    });
    if (error) throw error;
    return data;
  },

  /**
   * Updates user profile attributes or credentials.
   * @param {object} attributes 
   * @returns {Promise<any>}
   */
  async updateUser(attributes) {
    const { data, error } = await supabase.auth.updateUser(attributes);
    if (error) throw error;
    return data;
  },

  /**
   * Refreshes the current authentication session.
   * @returns {Promise<any>}
   */
  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  },

  /**
   * Logs out the active user session.
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.warn("Firebase sign out warning:", e);
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Checks if a user profile exists in auth.users by email.
   * @param {string} email 
   * @returns {Promise<boolean>}
   */
  async checkUserExists(email) {
    const { data, error } = await supabase.rpc("check_user_exists", {
      email_to_check: email,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Checks if a user is registered as an admin from the users table.
   * Reads the 'role' or 'roles' column in a case-insensitive manner.
   * @param {string} userId 
   * @returns {Promise<{ role: string }>}
   */
  async checkAdminUser(userId) {
    if (!userId) return { role: "user" };
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.warn("checkAdminUser query error:", error.message);
        return { role: "user" };
      }
      const rawRole = (data?.role || data?.roles || "user").toString().trim().toLowerCase();
      return { role: rawRole };
    } catch (err) {
      console.error("checkAdminUser exception:", err);
      return { role: "user" };
    }
  },

  /**
   * Subscribes to changes in authentication state.
   * @param {function} callback 
   * @returns {{ unsubscribe: function }}
   */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },

  /**
   * Deletes the currently logged-in user account via public RPC.
   * @returns {Promise<void>}
   */
  async deleteAccount() {
    const { error } = await supabase.rpc("delete_own_user");
    if (error) throw error;
  }
};
