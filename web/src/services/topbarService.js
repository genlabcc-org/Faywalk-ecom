import { supabase } from '../lib/supabase';

export const topbarService = {
  /**
   * Fetches the latest topbar configuration from DB.
   */
  async getTopBar() {
    try {
      const { data, error } = await supabase
        .from('topbar')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching topbar:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Failed to get topbar:', err);
      return null;
    }
  },

  /**
   * Updates or inserts topbar configuration.
   * @param {{ id?: number, text: string, is_active?: boolean, link_url?: string }} config
   */
  async saveTopBar(config) {
    const payload = {
      text: config.text || '',
      is_active: config.is_active !== false,
      link_url: config.link_url ? config.link_url.trim() : null,
      updated_at: new Date().toISOString(),
    };

    if (config.id) {
      const { data, error } = await supabase
        .from('topbar')
        .update(payload)
        .eq('id', config.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const existing = await this.getTopBar();
      if (existing?.id) {
        const { data, error } = await supabase
          .from('topbar')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('topbar')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }
  },
};
