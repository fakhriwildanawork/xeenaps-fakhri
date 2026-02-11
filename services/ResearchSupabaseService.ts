import { getSupabase } from './supabaseClient';
import { ResearchProject, ResearchSource } from '../types';

/**
 * XEENAPS RESEARCH SUPABASE SERVICE
 * Registry Metadata untuk module Gap Finder & Research Projects.
 */

// --- PROJECTS ---

export const fetchResearchProjectsFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc"
): Promise<{ items: ResearchProject[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('research_projects')
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
    console.error("Supabase Research Projects Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertResearchProjectToSupabase = async (project: ResearchProject): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { search_all, ...cleanItem } = project as any;

  const { error } = await client
    .from('research_projects')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Research Project Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteResearchProjectFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('research_projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Research Project Delete Error:", error);
    return false;
  }
  return true;
};

// --- SOURCES (MATRIX) ---

export const fetchResearchSourcesFromSupabase = async (projectId: string): Promise<ResearchSource[]> => {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('research_sources')
    .select('*')
    .eq('projectId', projectId)
    .order('createdAt', { ascending: true });

  if (error) {
    console.error("Supabase Research Sources Fetch Error:", error);
    return [];
  }
  return data || [];
};

export const upsertResearchSourceToSupabase = async (source: ResearchSource): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { search_all, isAnalyzing, ...cleanItem } = source as any;

  const { error } = await client
    .from('research_sources')
    .upsert(cleanItem);

  if (error) {
    console.error("Supabase Research Source Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteResearchSourceFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('research_sources')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Research Source Delete Error:", error);
    return false;
  }
  return true;
};

// --- HELPERS FOR GAP FINDER VIEW ---

export const fetchResearchSourceBySourceId = async (sourceId: string): Promise<ResearchSource | null> => {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('research_sources')
    .select('*')
    .eq('sourceId', sourceId)
    .limit(1)
    .single();

  if (error) return null;
  return data;
};
