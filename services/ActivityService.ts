

import { ActivityItem, ActivityVaultItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchActivitiesPaginatedFromSupabase, 
  upsertActivityToSupabase, 
  deleteActivityFromSupabase,
  fetchActivityByIdFromSupabase 
} from './ActivitySupabaseService';

/**
 * XEENAPS ACTIVITY SERVICE (HYBRID MIGRATION)
 * Metadata: Supabase
 * Storage: Google Apps Script (Drive)
 */

export const fetchActivitiesPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  type: string = "All",
  signal?: AbortSignal
): Promise<{ items: ActivityItem[], totalCount: number }> => {
  // Direct call to Supabase Registry
  return await fetchActivitiesPaginatedFromSupabase(
    page, 
    limit, 
    search, 
    startDate, 
    endDate, 
    type, 
    "startDate", 
    "desc"
  );
};

export const saveActivity = async (item: ActivityItem): Promise<boolean> => {
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-activity-updated', { detail: item }));
  
  // Direct call to Supabase Registry
  return await upsertActivityToSupabase(item);
};

export const deleteActivity = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-activity-deleted', { detail: id }));

  try {
    // 1. Fetch Item to get File IDs (Cert)
    const item = await fetchActivityByIdFromSupabase(id);
    
    // 2. Physical File Cleanup (Fire & Forget to GAS)
    if (item) {
      if (item.certificateFileId && item.certificateNodeUrl) {
         deleteRemoteFile(item.certificateFileId, item.certificateNodeUrl);
      }
      
      // Cleanup files inside the vault_items array if present
      if (item.vault_items && Array.isArray(item.vault_items)) {
         item.vault_items.forEach(vItem => {
            if (vItem.type === 'FILE' && vItem.fileId && vItem.nodeUrl) {
              // Ensure we don't delete optimistic placeholders
              if (!vItem.fileId.startsWith('optimistic_')) {
                 deleteRemoteFile(vItem.fileId, vItem.nodeUrl);
              }
            }
         });
      }
    }

    // 3. Metadata Cleanup (Supabase)
    return await deleteActivityFromSupabase(id);

  } catch (e) {
    console.error("Delete Activity Failed:", e);
    return false;
  }
};

/**
 * Helper to permanently delete a file from a specific storage node
 */
export const deleteRemoteFile = async (fileId: string, nodeUrl: string): Promise<boolean> => {
  try {
    const res = await fetch(nodeUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [fileId] })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

/**
 * Dynamic Sharded Binary Upload for Vault
 * Returns both fileId and nodeUrl where the file was actually stored
 */
export const uploadVaultFile = async (file: File): Promise<{ fileId: string, nodeUrl: string } | null> => {
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
        action: 'vaultFileUpload', 
        fileData: base64Data, 
        fileName: file.name, 
        mimeType: file.type 
      })
    });
    const result = await response.json();
    return result.status === 'success' ? { fileId: result.fileId, nodeUrl: result.nodeUrl } : null;
  } catch (e) {
    return null;
  }
};