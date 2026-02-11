
import { getSupabase } from './supabaseClient';
import { LibraryItem, LibraryType } from '../types';

/**
 * XEENAPS LIBRARY SUPABASE SERVICE
 * High-performance text database registry.
 */

export const fetchLibraryFromSupabase = async (): Promise<LibraryItem[]> => {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('library_items')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error("Supabase Fetch Error:", error);
    return [];
  }
  return data || [];
};

export const fetchLibraryPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  type: string = "All",
  path: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: LibraryItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('library_items')
    .select('*', { count: 'exact' });

  // 1. Filtering by Type
  if (type !== "All") {
    query = query.eq('type', type);
  }

  // 2. Filtering by Path
  if (path === "favorite") {
    query = query.eq('isFavorite', true);
  } else if (path === "bookmark") {
    query = query.eq('isBookmarked', true);
  } else if (path === "research_ai") {
    // STRICT AI MODE: Must have extracted content (Tracer, Review, Presentation)
    query = query.not('extractedJsonId', 'is', null).neq('extractedJsonId', '');
  }
  // Note: path === "research" allows ALL items (hybrid mode for Question Bank)

  // 3. Smart Search Logic (Using the generated search_all column for maximum stability and full metadata support)
  if (search) {
    query = query.ilike('search_all', `%${search}%`);
  }

  // 4. Sorting
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 5. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Paginated Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertLibraryItemToSupabase = async (item: LibraryItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // SANITIZE DATA: Remove generated column 'search_all' to prevent Error 428C9
  // Database will automatically re-calculate this column on server-side.
  const { search_all, ...cleanItem } = item as any;

  const { error } = await client
    .from('library_items')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteLibraryItemFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('library_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Delete Error:", error);
    return false;
  }
  return true;
};
