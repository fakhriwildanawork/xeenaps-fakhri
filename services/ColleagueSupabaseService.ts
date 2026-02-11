import { getSupabase } from './supabaseClient';
import { ColleagueItem } from '../types';

/**
 * XEENAPS COLLEAGUE SUPABASE SERVICE
 * Registry Metadata untuk modul Professional Network.
 */

export const fetchColleaguesPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  sortKey: string = "name",
  sortDir: string = "asc"
): Promise<{ items: ColleagueItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('colleagues')
    .select('*', { count: 'exact' });

  // 1. Smart Search (Server-side via search_all)
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // 2. Sorting
  // Special handling for favorites if needed, otherwise standard sort
  if (sortKey === 'isFavorite') {
      query = query.order('isFavorite', { ascending: false });
  }
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 3. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Colleagues Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const fetchColleagueByIdFromSupabase = async (id: string): Promise<ColleagueItem | null> => {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('colleagues')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
};

export const upsertColleagueToSupabase = async (item: ColleagueItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitasi: Hapus search_all agar di-handle oleh trigger DB
  const { search_all, ...cleanItem } = item as any;

  const { error } = await client
    .from('colleagues')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Colleague Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteColleagueFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('colleagues')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Colleague Delete Error:", error);
    return false;
  }
  return true;
};