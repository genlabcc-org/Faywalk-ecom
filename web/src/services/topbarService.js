import { supabase } from '../lib/supabase';

export const topbarService = {
  /**
   * Fetches all topbar announcements from DB ordered by id ascending.
   * @returns {Promise<any[]>}
   */
  async getTopBars() {
    try {
      const { data, error } = await supabase
        .from('topbar')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.warn('Error fetching topbars:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Failed to get topbars:', err);
      return [];
    }
  },

  /**
   * Backward-compatible method: fetches all topbars as an array.
   * @returns {Promise<any[]>}
   */
  async getTopBar() {
    return this.getTopBars();
  },

  /**
   * Creates a new topbar announcement.
   * @param {{ text: string, is_active?: boolean, link_url?: string }} config
   * @returns {Promise<any>}
   */
  async createTopBar(config) {
    const payload = {
      text: (config.text || '').trim(),
      is_active: config.is_active !== false,
      link_url: config.link_url ? config.link_url.trim() : '/products',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('topbar')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates an existing topbar announcement by ID.
   * @param {number|string} id
   * @param {{ text: string, is_active?: boolean, link_url?: string }} config
   * @returns {Promise<any>}
   */
  async updateTopBar(id, config) {
    const payload = {
      text: (config.text || '').trim(),
      is_active: config.is_active !== false,
      link_url: config.link_url ? config.link_url.trim() : '/products',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('topbar')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Toggles the active status of an announcement.
   * @param {number|string} id
   * @param {boolean} isActive
   * @returns {Promise<any>}
   */
  async toggleActive(id, isActive) {
    const { data, error } = await supabase
      .from('topbar')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a topbar announcement.
   * @param {number|string} id
   * @returns {Promise<boolean>}
   */
  async deleteTopBar(id) {
    const { error } = await supabase
      .from('topbar')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Legacy support method: Updates if id exists, otherwise creates new record.
   * @param {{ id?: number, text: string, is_active?: boolean, link_url?: string }} config
   * @returns {Promise<any>}
   */
  async saveTopBar(config) {
    if (config?.id) {
      return this.updateTopBar(config.id, config);
    }
    return this.createTopBar(config);
  },
};
