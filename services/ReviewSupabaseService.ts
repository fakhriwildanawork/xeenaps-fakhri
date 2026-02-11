import { getSupabase } from './supabaseClient';
import { ReviewItem } from '../types';

/**
 * XEENAPS REVIEW SUPABASE SERVICE
 * Registry Metadata untuk modul Literature Review.
 */

export const fetchReviewsPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: ReviewItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('reviews')
    .select('*', { count: 'exact' });

  // 1. Smart Search (Server-side via search_all)
  if (search) {
    query = query.ilike('search_all', `%${search}%`);
  }

  // 2. Sorting
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 3. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Reviews Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertReviewToSupabase = async (item: ReviewItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitasi: Hapus search_all agar di-handle oleh trigger DB
  const { search_all, ...cleanItem } = item as any;

  const { error } = await client
    .from('reviews')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Review Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteReviewFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('reviews')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Review Delete Error:", error);
    return false;
  }
  return true;
};