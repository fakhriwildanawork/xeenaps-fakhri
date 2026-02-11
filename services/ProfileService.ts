import { GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { fetchProfileFromSupabase } from './ProfileSupabaseService';
import { BRAND_ASSETS } from '../assets';

/**
 * XEENAPS PROFILE SERVICE (HYBRID STORAGE UTILITIES)
 * 
 * NOTE: Metadata Registry (Identity, Education, Career) has moved to `ProfileSupabaseService`.
 * This file now EXCLUSIVELY handles:
 * 1. Physical File Storage (Photo Upload/Delete via GAS)
 * 2. Helper utilities
 */

/**
 * Get profile name stripped of all academic titles (Prefixes & Suffixes)
 * Uses Supabase as the source of truth.
 */
export const getCleanedProfileName = async (): Promise<string> => {
  const profile = await fetchProfileFromSupabase();
  if (!profile || !profile.fullName) return "Xeenaps User";
  
  // 1. Remove Suffixes (Everything after the first comma is considered a degree/title)
  let name = profile.fullName.split(',')[0].trim();
  
  // 2. Remove All Prefixes (Any word ending with a dot at the start of the string)
  name = name.replace(/^([A-Za-z]+\.\s*)+/i, '').trim();
  
  // 3. Fallback check
  return name || "Xeenaps User";
};

/**
 * Upload Profile Photo to Google Drive (via GAS Worker)
 * Returns the public URL and File IDs for storage in Supabase.
 */
export const uploadProfilePhoto = async (file: File): Promise<{ photoUrl: string, fileId: string, nodeUrl: string } | null> => {
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
        action: 'saveItem', // Using unified sharding logic in GAS
        item: { id: 'PHOTO_PROFILE', title: 'Profile Photo' },
        file: { fileName: file.name, mimeType: file.type, fileData: base64Data }
      })
    });
    const result = await response.json();
    if (result.status === 'success') {
      const fileId = result.fileId;
      const nodeUrl = result.nodeUrl;
      return {
        photoUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
        fileId: fileId,
        nodeUrl: nodeUrl
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Delete Profile Photo from Google Drive (via GAS Worker)
 */
export const deleteProfilePhoto = async (fileId: string, nodeUrl: string): Promise<boolean> => {
  try {
    // If no specific node URL, assume master GAS
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;
    if (!targetUrl) return false;

    const res = await fetch(targetUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [fileId] })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};
