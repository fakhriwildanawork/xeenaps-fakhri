
import { PublicationItem } from '../types';
import { 
  fetchPublicationsPaginatedFromSupabase, 
  upsertPublicationToSupabase, 
  deletePublicationFromSupabase 
} from './PublicationSupabaseService';

/**
 * XEENAPS PUBLICATION SERVICE (HYBRID MIGRATION)
 * Migrated to use Supabase Registry for Metadata.
 */

export const fetchPublicationsPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: PublicationItem[], totalCount: number }> => {
  return await fetchPublicationsPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
};

export const savePublication = async (item: PublicationItem): Promise<boolean> => {
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-publication-updated', { detail: item }));
  return await upsertPublicationToSupabase(item);
};

export const deletePublication = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-publication-deleted', { detail: id }));
  return await deletePublicationFromSupabase(id);
};
