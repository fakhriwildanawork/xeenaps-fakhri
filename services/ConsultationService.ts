import { ConsultationItem, ConsultationAnswerContent, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchConsultationsFromSupabase, 
  upsertConsultationToSupabase, 
  deleteConsultationFromSupabase 
} from './ConsultationSupabaseService';

/**
 * XEENAPS CONSULTATION SERVICE (HYBRID ARCHITECTURE)
 * Metadata: Supabase
 * Content: Google Apps Script (Sharding)
 */

/**
 * Proxy call to DeepSeek-R1 reasoning model
 */
export const callAiConsult = async (
  collectionId: string,
  question: string,
  extractedJsonId?: string,
  nodeUrl?: string
): Promise<{ answer: string, reasoning: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiConsultProxy',
        collectionId,
        question,
        extractedJsonId,
        nodeUrl
      })
    });
    const result = await res.json();
    if (result.status === 'success') {
      return { 
        answer: result.data,
        reasoning: result.reasoning 
      };
    }
    throw new Error(result.message || "Consultation engine failed");
  } catch (error) {
    console.error("AI Consult Error:", error);
    return null;
  }
};

export const fetchRelatedConsultations = async (
  collectionId: string,
  page: number = 1,
  limit: number = 20,
  search: string = ""
): Promise<{ items: ConsultationItem[], totalCount: number }> => {
  return await fetchConsultationsFromSupabase(collectionId, page, limit, search);
};

export const saveConsultation = async (item: ConsultationItem, content: ConsultationAnswerContent): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  try {
    // 1. Shard Content to GAS (Drive)
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveConsultationContent', // Specialized action for consult sharding
        item,
        content
      })
    });
    const result = await res.json();

    if (result.status === 'success') {
      // 2. Update Metadata with File IDs
      const updatedItem = {
        ...item,
        answerJsonId: result.fileId,
        nodeUrl: result.nodeUrl, // Using generic nodeUrl field for storage location
        updatedAt: new Date().toISOString()
      };

      // 3. Save Registry to Supabase
      return await upsertConsultationToSupabase(updatedItem);
    }
    return false;
  } catch (e) {
    console.error("Save Consultation Failed:", e);
    return false;
  }
};

export const deleteConsultation = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-consultation-deleted', { detail: id }));
  
  // Metadata Cleanup
  return await deleteConsultationFromSupabase(id);
};
