import { supabase } from '../lib/supabase';

export const authService = {
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
   * Checks if a user is registered as an admin.
   * @param {string} userId 
   * @returns {Promise<any>}
   */
  async checkAdminUser(userId) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
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
