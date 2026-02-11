import { getSupabase } from './supabaseClient';
import { PresentationItem } from '../types';

/**
 * XEENAPS PRESENTATION SUPABASE SERVICE
 * High-performance registry for synthesized presentations.
 */

export const fetchPresentationsPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  collectionId: string = "",
  startDate: string = "",
  endDate: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: PresentationItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('presentations')
    .select('*', { count: 'exact' });

  // 1. Filter by collectionId (Works naturally with TEXT[] using .contains)
  if (collectionId) {
    query = query.contains('collectionIds', [collectionId]);
  }

  // 2. Optimized Smart Search (Unified Search Index)
  // Strategi ini sama dengan modul Library: menggunakan satu kolom indeks gabungan
  if (search) {
    query = query.ilike('search_all', `%${search}%`);
  }

  // 3. Date Range Filter
  if (startDate) {
    query = query.gte('createdAt', startDate);
  }
  if (endDate) {
    query = query.lte('createdAt', endDate);
  }

  // 4. Sorting
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 5. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Presentations Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertPresentationToSupabase = async (item: PresentationItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('presentations')
    .upsert(item);

  if (error) {
    console.error("Supabase Presentation Upsert Error:", error);
    return false;
  }
  return true;
};

export const deletePresentationFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('presentations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Presentation Delete Error:", error);
    return false;
  }
  return true;
};