import { getSupabase } from './supabaseClient';
import { ArchivedArticleItem, ArchivedBookItem } from '../types';

/**
 * XEENAPS LITERATURE SUPABASE SERVICE
 * High-performance registry for Archived Articles and Books.
 */

// --- ARCHIVED ARTICLES ---

export const fetchArchivedArticlesPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: ArchivedArticleItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('archived_articles')
    .select('*', { count: 'exact' });

  // 1. Smart Search (Server-side via search_all trigger)
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // 2. Sorting
  // Prioritize sorting logic from params
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 3. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Archived Articles Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertArchivedArticleToSupabase = async (item: Partial<ArchivedArticleItem>): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitize: Remove generated column 'search_all' if present
  const { search_all, ...cleanItem } = item as any;
  
  const { error } = await client
    .from('archived_articles')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Archived Article Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteArchivedArticleFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('archived_articles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Archived Article Delete Error:", error);
    return false;
  }
  return true;
};

// --- ARCHIVED BOOKS ---

export const fetchArchivedBooksPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: ArchivedBookItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('archived_books')
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
    console.error("Supabase Archived Books Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertArchivedBookToSupabase = async (item: Partial<ArchivedBookItem>): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { search_all, ...cleanItem } = item as any;
  
  const { error } = await client
    .from('archived_books')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Archived Book Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteArchivedBookFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('archived_books')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Archived Book Delete Error:", error);
    return false;
  }
  return true;
};