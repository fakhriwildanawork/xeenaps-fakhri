import { getSupabase } from './supabaseClient';
import { QuestionItem } from '../types';

/**
 * XEENAPS QUESTION SUPABASE SERVICE
 * High-performance registry for assessment items.
 */

export const fetchQuestionsFromSupabase = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  collectionId: string = "",
  bloomFilter: string = "All",
  startDate: string = "",
  endDate: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: QuestionItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('questions')
    .select('*', { count: 'exact' });

  // 1. Context Filtering
  if (collectionId) {
    query = query.eq('collectionId', collectionId);
  }

  // 2. Bloom Filtering
  if (bloomFilter !== "All") {
    query = query.eq('bloomLevel', bloomFilter);
  }

  // 3. Smart Search (Server-side)
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // 4. Date Filtering
  if (startDate) query = query.gte('createdAt', startDate);
  if (endDate) query = query.lte('createdAt', endDate);

  // 5. Sorting & Pagination
  query = query.order(sortKey, { ascending: sortDir === 'asc' });
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Questions Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const fetchQuestionsByIds = async (ids: string[]): Promise<QuestionItem[]> => {
  const client = getSupabase();
  if (!client || ids.length === 0) return [];

  const { data, error } = await client
    .from('questions')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error("Supabase Questions By IDs Fetch Error:", error);
    return [];
  }

  return data || [];
};

export const upsertQuestionToSupabase = async (item: QuestionItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitize: remove search_all if present (it's managed by DB trigger)
  // Ensure all required fields are present and not undefined
  const { search_all, ...cleanItem } = item as any;
  
  // Integrity check for JSONB fields
  const payload = {
    ...cleanItem,
    options: Array.isArray(cleanItem.options) ? cleanItem.options : [],
    reasoningDistractors: (cleanItem.reasoningDistractors && typeof cleanItem.reasoningDistractors === 'object') 
      ? cleanItem.reasoningDistractors 
      : {},
    updatedAt: new Date().toISOString()
  };

  const { error } = await client
    .from('questions')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error("Supabase Question Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteQuestionFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Question Delete Error:", error);
    return false;
  }
  return true;
};