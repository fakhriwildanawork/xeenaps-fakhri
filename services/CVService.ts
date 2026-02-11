
import { CVDocument, CVTemplateType, GASResponse, UserProfile, EducationEntry, CareerEntry, PublicationItem, ActivityItem } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { fetchCVListFromSupabase, upsertCVToSupabase, deleteCVFromSupabase } from './CVSupabaseService';
import { deleteRemoteFile } from './ActivityService'; // Reusing generic remote file deletion

// Import Supabase Services for Data Gathering
import { fetchProfileFromSupabase, fetchEducationFromSupabase, fetchCareerFromSupabase } from './ProfileSupabaseService';
import { fetchPublicationsPaginatedFromSupabase } from './PublicationSupabaseService';
import { fetchActivitiesPaginatedFromSupabase } from './ActivitySupabaseService';

/**
 * XEENAPS CV ARCHITECT SERVICE (HYBRID ARCHITECTURE)
 * Metadata: Supabase
 * PDF Engine: Google Apps Script
 */

export const fetchCVList = async (signal?: AbortSignal): Promise<CVDocument[]> => {
  // Direct call to Supabase Registry
  return await fetchCVListFromSupabase();
};

export const deleteCVDocument = async (id: string, fileId?: string, nodeUrl?: string): Promise<boolean> => {
  // 1. Clean up physical file in Drive (GAS)
  if (fileId && nodeUrl) {
    await deleteRemoteFile(fileId, nodeUrl);
  } else if (fileId && GAS_WEB_APP_URL) {
    // Fallback if nodeUrl missing
    await deleteRemoteFile(fileId, GAS_WEB_APP_URL);
  }

  // 2. Clean up metadata in Supabase
  return await deleteCVFromSupabase(id);
};

/**
 * Pengambilan data terkonsolidasi untuk checklist CV Architect
 * Updated: Uses Supabase Services directly for speed
 */
export const fetchSourceDataForCV = async (): Promise<{
  profile: UserProfile | null,
  education: EducationEntry[],
  career: CareerEntry[],
  publications: PublicationItem[],
  activities: ActivityItem[]
}> => {
  try {
    const [profile, education, career, pubsResult, actsResult] = await Promise.all([
      fetchProfileFromSupabase(),
      fetchEducationFromSupabase(),
      fetchCareerFromSupabase(),
      fetchPublicationsPaginatedFromSupabase(1, 1000), // Get all for selection
      fetchActivitiesPaginatedFromSupabase(1, 1000)    // Get all for selection
    ]);

    return {
      profile,
      education,
      career,
      publications: pubsResult.items || [],
      activities: actsResult.items || []
    };
  } catch (e) {
    console.error("Failed to fetch CV source data", e);
    return { profile: null, education: [], career: [], publications: [], activities: [] };
  }
};

/**
 * Pemicu utama generator PDF di Apps Script + Registry di Supabase
 */
export const generateCVPdf = async (
  config: {
    title: string,
    template: CVTemplateType,
    selectedEducationIds: string[],
    selectedCareerIds: string[],
    selectedPublicationIds: string[],
    selectedActivityIds: string[],
    includePhoto: boolean,
    aiSummary: string
  },
  sourceData?: {
    profile: UserProfile | null,
    education: EducationEntry[],
    career: CareerEntry[],
    publications: PublicationItem[],
    activities: ActivityItem[]
  }
): Promise<CVDocument | null> => {
  if (!GAS_WEB_APP_URL) return null;

  try {
    // 1. Prepare Data Payload (Filtered)
    // If sourceData not passed, fetch it (Safety fallback)
    const data = sourceData || await fetchSourceDataForCV();
    
    if (!data.profile) throw new Error("Profile data missing");

    const payload = {
      profile: data.profile,
      education: data.education.filter(e => config.selectedEducationIds.includes(e.id)),
      career: data.career.filter(c => config.selectedCareerIds.includes(c.id)),
      publications: data.publications.filter(p => config.selectedPublicationIds.includes(p.id)),
      activities: data.activities.filter(a => config.selectedActivityIds.includes(a.id)),
      summary: config.aiSummary
    };

    // 2. Call GAS Worker to Generate PDF
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'generateCV_PDF', 
        config,
        payload // Send actual data to worker
      })
    });
    const result = await res.json();
    
    if (result.status === 'success' && result.data) {
       const workerData = result.data;
       
       // 3. Construct Final Document Object
       const cvDoc: CVDocument = {
         id: workerData.id || crypto.randomUUID(),
         title: config.title,
         template: config.template,
         fileId: workerData.fileId,
         storageNodeUrl: workerData.storageNodeUrl,
         includePhoto: config.includePhoto,
         aiSummary: config.aiSummary,
         selectedEducationIds: config.selectedEducationIds,
         selectedCareerIds: config.selectedCareerIds,
         selectedPublicationIds: config.selectedPublicationIds,
         selectedActivityIds: config.selectedActivityIds,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
       };

       // 4. Save Metadata to Supabase Registry
       const saved = await upsertCVToSupabase(cvDoc);
       if (saved) return cvDoc;
    }
    
    return null;
  } catch (e) {
    console.error("CV Gen Error:", e);
    return null;
  }
};
