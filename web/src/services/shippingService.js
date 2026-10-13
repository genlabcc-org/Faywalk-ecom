import { supabase } from '../lib/supabase';

export const normState = (s) =>
  String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

export const shippingService = {
  /**
   * Retrieves active shipping rates for checkout calculations.
   */
  async getRates() {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('id, state, fee, free_above, is_active')
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },

  /**
   * Retrieves ALL shipping rates (including inactive and default) for admin management.
   */
  async getAllRates() {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('id, state, fee, free_above, is_active, created_at')
      .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Upsert a shipping rate by state name.
   */
  async upsertRate({ state, fee, free_above, is_active = true }) {
    const payload = {
      state: state.trim(),
      fee: Number(fee) || 0,
      free_above: free_above === "" || free_above === null || free_above === undefined ? null : Number(free_above),
      is_active: Boolean(is_active),
    };

    const { data, error } = await supabase
      .from('shipping_rates')
      .upsert(payload, { onConflict: 'state' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates an existing rate by ID.
   */
  async updateRate(id, { state, fee, free_above, is_active }) {
    const payload = {
      state: state.trim(),
      fee: Number(fee) || 0,
      free_above: free_above === "" || free_above === null || free_above === undefined ? null : Number(free_above),
      is_active: Boolean(is_active),
    };

    const { data, error } = await supabase
      .from('shipping_rates')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a shipping rate by ID.
   */
  async deleteRate(id) {
    const { error } = await supabase
      .from('shipping_rates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Toggles active state of a shipping rate.
   */
  async toggleActive(id, isActive) {
    const { data, error } = await supabase
      .from('shipping_rates')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Calculates delivery charge based on active shipping rates.
   */
  calcFee(rates, state, amount) {
    const row =
      rates.find(r => normState(r.state) === normState(state)) ||
      rates.find(r => r.state === '__default__');
    if (!row) return 0;
    if (row.free_above != null && amount >= Number(row.free_above)) return 0;
    return Number(row.fee) || 0;
  },

  /**
   * Pincode lookup helper for auto-detecting state and district.
   */
  async lookupPincode(pin) {
    if (!/^[1-9]\d{5}$/.test(pin)) return null;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = await res.json();
      const po = json?.[0]?.PostOffice?.[0];
      return json?.[0]?.Status === 'Success' && po
        ? { state: po.State, district: po.District }
        : null;
    } catch {
      return undefined;
    }
  },
};
