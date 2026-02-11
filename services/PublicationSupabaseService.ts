
import { getSupabase } from './supabaseClient';
import { PublicationItem } from '../types';

/**
 * XEENAPS PUBLICATION SUPABASE SERVICE
 * Registry Metadata untuk modul Publication.
 */

export const fetchPublicationsPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: PublicationItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('publications')
    .select('*', { count: 'exact' });

  // 1. Smart Search (Server-side via search_all)
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // 2. Sorting
  // Handle special case for isFavorite logic if needed, but usually sorted by date
  // SortKey from UI matches DB column names (camelCase preserved in DB via quotes)
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 3. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Publication Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertPublicationToSupabase = async (item: PublicationItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitasi: Hapus search_all agar di-handle oleh trigger DB
  const { search_all, ...cleanItem } = item as any;

  // Pastikan array tidak null/undefined
  const payload = {
    ...cleanItem,
    authors: Array.isArray(cleanItem.authors) ? cleanItem.authors : [],
    keywords: Array.isArray(cleanItem.keywords) ? cleanItem.keywords : [],
    updatedAt: new Date().toISOString()
  };

  const { error } = await client
    .from('publications')
    .upsert(payload);

  if (error) {
    console.error("Supabase Publication Upsert Error:", error);
    return false;
  }
  return true;
};

export const deletePublicationFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('publications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Publication Delete Error:", error);
    return false;
  }
  return true;
};
