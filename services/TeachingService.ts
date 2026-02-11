

import { TeachingItem, TeachingVaultItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchTeachingPaginatedFromSupabase, 
  upsertTeachingToSupabase, 
  deleteTeachingFromSupabase 
} from './TeachingSupabaseService';

/**
 * XEENAPS TEACHING SERVICE (HYBRID ARCHITECTURE)
 * Metadata: Supabase
 * Storage: GAS
 */

export const fetchTeachingPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  signal?: AbortSignal
): Promise<{ items: TeachingItem[], totalCount: number }> => {
  // Direct call to Supabase Registry
  return await fetchTeachingPaginatedFromSupabase(
    page, 
    limit, 
    search, 
    startDate, 
    endDate
  );
};

export const saveTeachingItem = async (item: TeachingItem): Promise<boolean> => {
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-teaching-updated', { detail: item }));

  // Direct call to Supabase Registry
  return await upsertTeachingToSupabase(item);
};

export const deleteTeachingItem = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-teaching-deleted', { detail: id }));

  // Metadata Cleanup (Supabase)
  // Note: Physical file cleanup can be added here if needed using fetchTeachingById and deleteRemoteFile pattern
  return await deleteTeachingFromSupabase(id);
};
