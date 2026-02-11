import { ColleagueItem } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchColleaguesPaginatedFromSupabase, 
  upsertColleagueToSupabase, 
  deleteColleagueFromSupabase,
  fetchColleagueByIdFromSupabase
} from './ColleagueSupabaseService';

/**
 * XEENAPS COLLEAGUE SERVICE (HYBRID ARCHITECTURE)
 * Metadata: Supabase Registry
 * Storage: Google Apps Script (Drive)
 */

export const fetchColleaguesPaginated = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  sortKey: string = "name",
  sortDir: string = "asc",
  signal?: AbortSignal
): Promise<{ items: ColleagueItem[], totalCount: number }> => {
  // Direct call to Supabase Registry
  return await fetchColleaguesPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
};

export const saveColleague = async (item: ColleagueItem): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-colleague-updated', { detail: item }));
  
  // Direct call to Supabase Registry
  return await upsertColleagueToSupabase(item);
};

export const deleteColleague = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-colleague-deleted', { detail: id }));

  try {
    // 1. Fetch Item to get Photo File ID
    const item = await fetchColleagueByIdFromSupabase(id);

    // 2. Physical File Cleanup (Fire & Forget to GAS)
    if (item && item.photoFileId && item.photoNodeUrl) {
       // Cleanup logic reusing existing endpoint pattern
       if (GAS_WEB_APP_URL) {
         fetch(item.photoNodeUrl, {
           method: 'POST',
           body: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [item.photoFileId] })
         }).catch(e => console.warn("Background photo cleanup failed", e));
       }
    }

    // 3. Metadata Cleanup (Supabase)
    return await deleteColleagueFromSupabase(id);

  } catch (e) {
    console.error("Delete Colleague Failed:", e);
    return false;
  }
};

/**
 * Dynamic Sharded Binary Upload for Colleague Photos (Keep pointing to GAS)
 */
export const uploadColleaguePhoto = async (file: File): Promise<{ photoUrl: string, fileId: string, nodeUrl: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  
  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  try {
    const response = await fetch(GAS_WEB_APP_URL, { 
      method: 'POST', 
      body: JSON.stringify({ 
        action: 'vaultFileUpload', // Reusing dynamic sharding logic
        fileData: base64Data, 
        fileName: `colleague_${Date.now()}_${file.name}`, 
        mimeType: file.type 
      })
    });
    const result = await response.json();
    if (result.status === 'success') {
      return {
        photoUrl: `https://lh3.googleusercontent.com/d/${result.fileId}`,
        fileId: result.fileId,
        nodeUrl: result.nodeUrl
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};