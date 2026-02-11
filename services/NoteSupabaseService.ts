import { getSupabase } from './supabaseClient';
import { NoteItem } from '../types';

/**
 * XEENAPS NOTEBOOK SUPABASE SERVICE
 * Registry Metadata untuk modul Notebook.
 * Menggantikan Google Sheets sebagai penyimpanan utama metadata.
 */

export const fetchNotesPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  collectionId: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: NoteItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('notes')
    .select('*', { count: 'exact' });

  // 1. Filter by Collection ID
  // SPECIAL TOKEN: __INDEPENDENT__ means collectionId is empty/null
  if (collectionId === "__INDEPENDENT__") {
    // Syntax .or() untuk menangani null atau string kosong
    query = query.or('collectionId.is.null,collectionId.eq.""');
  } else if (collectionId) {
    query = query.eq('collectionId', collectionId);
  }

  // 2. Smart Search (Server-side via search_all generated column)
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // 3. Sorting
  if (sortKey === 'isFavorite') {
      query = query.order('isFavorite', { ascending: false });
  }
  // Primary Sort
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 4. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Notes Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertNoteToSupabase = async (item: NoteItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitasi: Hapus search_all agar di-handle oleh trigger DB
  // @ts-ignore
  const { search_all, ...cleanItem } = item;

  const { error } = await client
    .from('notes')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Note Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteNoteFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Note Delete Error:", error);
    return false;
  }
  return true;
};