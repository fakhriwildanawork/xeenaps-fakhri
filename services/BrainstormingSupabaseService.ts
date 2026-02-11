import { getSupabase } from './supabaseClient';
import { BrainstormingItem } from '../types';

/**
 * XEENAPS BRAINSTORMING SUPABASE SERVICE
 * Registry Metadata untuk modul Research Incubation.
 */

export const fetchBrainstormingPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: BrainstormingItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('brainstorming')
    .select('*', { count: 'exact' });

  // 1. Smart Search
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // 2. Sorting
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 3. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Brainstorming Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertBrainstormingToSupabase = async (item: BrainstormingItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitasi: Hapus search_all agar di-handle oleh trigger DB
  const { search_all, ...cleanItem } = item as any;

  // Ensure arrays are arrays (defensive)
  const payload = {
    ...cleanItem,
    keywords: Array.isArray(cleanItem.keywords) ? cleanItem.keywords : [],
    pillars: Array.isArray(cleanItem.pillars) ? cleanItem.pillars : [],
    externalRefs: Array.isArray(cleanItem.externalRefs) ? cleanItem.externalRefs : [],
    internalRefs: Array.isArray(cleanItem.internalRefs) ? cleanItem.internalRefs : [],
    updatedAt: new Date().toISOString()
  };

  const { error } = await client
    .from('brainstorming')
    .upsert(payload);

  if (error) {
    console.error("Supabase Brainstorming Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteBrainstormingFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('brainstorming')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Brainstorming Delete Error:", error);
    return false;
  }
  return true;
};