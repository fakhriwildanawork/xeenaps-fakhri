import { getSupabase } from './supabaseClient';
import { TeachingItem } from '../types';

/**
 * XEENAPS TEACHING SUPABASE SERVICE
 * High-performance registry for Teaching Logs.
 */

export const fetchTeachingPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  sortKey: string = "teachingDate",
  sortDir: string = "desc"
): Promise<{ items: TeachingItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('teaching_logs')
    .select('*', { count: 'exact' });

  // 1. Smart Search
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // 2. Date Range Filter
  if (startDate) {
    query = query.gte('teachingDate', startDate);
  }
  if (endDate) {
    query = query.lte('teachingDate', endDate);
  }

  // 3. Sorting
  // Default sort by teachingDate usually makes sense for schedule
  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  // 4. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Teaching Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const fetchTeachingByIdFromSupabase = async (id: string): Promise<TeachingItem | null> => {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('teaching_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
};

export const upsertTeachingToSupabase = async (item: TeachingItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitasi: Hapus search_all agar di-handle oleh trigger DB
  const { search_all, ...cleanItem } = item as any;

  // Pastikan JSON fields berupa array/object valid, bukan undefined
  // Dan sertakan vault_items
  const payload = {
    ...cleanItem,
    referenceLinks: Array.isArray(cleanItem.referenceLinks) ? cleanItem.referenceLinks : [],
    presentationId: Array.isArray(cleanItem.presentationId) ? cleanItem.presentationId : [],
    questionBankId: Array.isArray(cleanItem.questionBankId) ? cleanItem.questionBankId : [],
    attachmentLink: Array.isArray(cleanItem.attachmentLink) ? cleanItem.attachmentLink : [],
    vault_items: Array.isArray(cleanItem.vault_items) ? cleanItem.vault_items : [],
    updatedAt: new Date().toISOString()
  };

  const { error } = await client
    .from('teaching_logs')
    .upsert(payload);

  if (error) {
    console.error("Supabase Teaching Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteTeachingFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('teaching_logs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Teaching Delete Error:", error);
    return false;
  }
  return true;
};