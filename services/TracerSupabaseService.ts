

import { getSupabase } from './supabaseClient';
import { TracerProject, TracerLog, TracerReference, TracerTodo, TracerFinanceItem } from '../types';

/**
 * XEENAPS TRACER SUPABASE SERVICE
 * Registry Metadata untuk modul Audit Trail, Log, Finance, dll.
 */

// --- 1. PROJECTS ---

export const fetchTracerProjectsFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: TracerProject[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client.from('tracer_projects').select('*', { count: 'exact' });

  if (search) {
    // Rely on search_all trigger column
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  query = query.order(sortKey, { ascending: sortDir === 'asc' });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("Supabase Tracer Project Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }
  return { items: data || [], totalCount: count || 0 };
};

export const upsertTracerProjectToSupabase = async (item: TracerProject): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  const { search_all, ...cleanItem } = item as any;
  const { error } = await client.from('tracer_projects').upsert(cleanItem);
  if (error) {
    console.error("Supabase Tracer Project Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteTracerProjectFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('tracer_projects').delete().eq('id', id);
  return !error;
};

// --- 2. LOGS ---

export const fetchTracerLogsFromSupabase = async (projectId: string): Promise<TracerLog[]> => {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('tracer_logs').select('*').eq('projectId', projectId).order('date', { ascending: false });
  if (error) return [];
  return data || [];
};

export const upsertTracerLogToSupabase = async (item: TracerLog): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  
  // Ensure vault_items is array
  const payload = {
    ...item,
    vault_items: Array.isArray(item.vault_items) ? item.vault_items : []
  };

  const { error } = await client.from('tracer_logs').upsert(payload);
  return !error;
};

export const deleteTracerLogFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('tracer_logs').delete().eq('id', id);
  return !error;
};

// --- 3. REFERENCES ---

export const fetchTracerReferencesFromSupabase = async (projectId: string): Promise<TracerReference[]> => {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('tracer_references').select('*').eq('projectId', projectId);
  if (error) return [];
  return data || [];
};

export const upsertTracerReferenceToSupabase = async (item: TracerReference): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Ensure quotes is array
  const payload = {
    ...item,
    quotes: Array.isArray(item.quotes) ? item.quotes : []
  };

  const { error } = await client.from('tracer_references').upsert(payload);
  return !error;
};

export const deleteTracerReferenceFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('tracer_references').delete().eq('id', id);
  return !error;
};

// --- 4. TODOS ---

export const fetchTracerTodosFromSupabase = async (projectId: string): Promise<TracerTodo[]> => {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('tracer_todos').select('*').eq('projectId', projectId).order('deadline', { ascending: true });
  if (error) return [];
  return data || [];
};

// NEW: Fetch ALL pending todos across all projects for Global Notification
export const fetchAllPendingTodosFromSupabase = async (): Promise<TracerTodo[]> => {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from('tracer_todos')
    .select('*')
    .eq('isDone', false)
    .order('deadline', { ascending: true });
  
  if (error) return [];
  return data || [];
};

export const upsertTracerTodoToSupabase = async (item: TracerTodo): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('tracer_todos').upsert(item);
  return !error;
};

export const deleteTracerTodoFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('tracer_todos').delete().eq('id', id);
  return !error;
};

// --- 5. FINANCE ---

export const fetchTracerFinanceFromSupabase = async (
  projectId: string,
  startDate: string = "",
  endDate: string = "",
  search: string = ""
): Promise<TracerFinanceItem[]> => {
  const client = getSupabase();
  if (!client) return [];

  let query = client.from('tracer_finance').select('*').eq('projectId', projectId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  if (search) query = query.ilike('search_all', `%${search.toLowerCase()}%`);

  query = query.order('date', { ascending: true });

  const { data, error } = await query;
  if (error) return [];
  return data || [];
};

export const upsertTracerFinanceToSupabase = async (item: TracerFinanceItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  const { search_all, ...cleanItem } = item as any;

  // Ensure attachments is array
  const payload = {
    ...cleanItem,
    attachments: Array.isArray(cleanItem.attachments) ? cleanItem.attachments : []
  };

  const { error } = await client.from('tracer_finance').upsert(payload);
  return !error;
};

export const deleteTracerFinanceFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('tracer_finance').delete().eq('id', id);
  return !error;
};