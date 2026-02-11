
import { ResearchProject, ResearchSource } from '../types';
import { 
  fetchResearchProjectsFromSupabase,
  upsertResearchProjectToSupabase,
  deleteResearchProjectFromSupabase,
  fetchResearchSourcesFromSupabase,
  upsertResearchSourceToSupabase,
  deleteResearchSourceFromSupabase
} from './ResearchSupabaseService';

/**
 * XEENAPS RESEARCH SERVICE
 * Hub for Project-based Gap Analysis Management.
 * Refactored to use Supabase Registry.
 */

export const fetchResearchProjects = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ResearchProject[], totalCount: number }> => {
  return await fetchResearchProjectsFromSupabase(page, limit, search, sortKey, sortDir);
};

export const saveResearchProject = async (project: ResearchProject): Promise<boolean> => {
  return await upsertResearchProjectToSupabase(project);
};

export const deleteResearchProject = async (id: string): Promise<boolean> => {
  return await deleteResearchProjectFromSupabase(id);
};

export const fetchProjectSources = async (projectId: string): Promise<ResearchSource[]> => {
  return await fetchResearchSourcesFromSupabase(projectId);
};

export const saveProjectSource = async (source: ResearchSource): Promise<boolean> => {
  return await upsertResearchSourceToSupabase(source);
};

export const deleteProjectSource = async (id: string): Promise<boolean> => {
  return await deleteResearchSourceFromSupabase(id);
};
