import { getSupabase } from './supabaseClient';
import { ConsultationItem } from '../types';

/**
 * XEENAPS CONSULTATION SUPABASE SERVICE
 * Registry Metadata untuk modul konsultasi AI.
 * Menggantikan Google Sheets sebagai penyimpanan utama metadata.
 */

export const fetchConsultationsFromSupabase = async (
  collectionId: string,
  page: number = 1,
  limit: number = 20,
  search: string = ""
): Promise<{ items: ConsultationItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('consultations')
    .select('*', { count: 'exact' })
    .eq('collectionId', collectionId);

  // Smart Search pada kolom search_all (Generated Column)
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // Sorting: Favorite dulu, lalu CreatedAt Descending
  query = query.order('isFavorite', { ascending: false })
               .order('createdAt', { ascending: false });

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Consultation Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertConsultationToSupabase = async (item: ConsultationItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitasi: Hapus search_all agar di-handle oleh trigger DB
  // @ts-ignore
  const { search_all, ...cleanItem } = item;

  const { error } = await client
    .from('consultations')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Consultation Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteConsultationFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('consultations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Consultation Delete Error:", error);
    return false;
  }
  return true;
};