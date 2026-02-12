import { ReviewItem, ReviewContent, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchReviewsPaginatedFromSupabase, 
  upsertReviewToSupabase, 
  deleteReviewFromSupabase 
} from './ReviewSupabaseService';
import { callAiProxy } from './gasService';

/**
 * XEENAPS REVIEW SERVICE (HYBRID ARCHITECTURE)
 * Metadata: Supabase
 * Content: GAS (Sharding)
 */

export const fetchReviewsPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ReviewItem[], totalCount: number }> => {
  return await fetchReviewsPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
};

export const saveReview = async (item: ReviewItem, content: ReviewContent): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-review-updated', { detail: item }));

  try {
    // 1. Shard Content to GAS if content exists
    let updatedItem = { ...item };
    
    if (content) {
      const res = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'saveReviewContent',
          item,
          content
        })
      });
      const result = await res.json();
      
      if (result.status === 'success') {
        updatedItem = {
          ...updatedItem,
          reviewJsonId: result.fileId,
          storageNodeUrl: result.nodeUrl
        };
      }
    }

    // 2. Save Registry to Supabase
    return await upsertReviewToSupabase(updatedItem);
  } catch (e) {
    console.error("Save Review Failed:", e);
    return false;
  }
};

export const deleteReview = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-review-deleted', { detail: id }));
  
  return await deleteReviewFromSupabase(id);
};

/**
 * AI Matrix Extraction: Memanggil proxy Groq khusus review
 */
export const runMatrixExtraction = async (
  collectionId: string, 
  centralQuestion: string,
  extractedJsonId?: string,
  nodeUrl?: string
): Promise<{ answer: string, verbatim: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiReviewProxy', 
        subAction: 'extract',
        payload: { collectionId, centralQuestion, extractedJsonId, nodeUrl }
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

export const translateReviewRowContent = async (text: string, targetLang: string): Promise<string | null> => {
  const prompt = `TRANSLATE THE FOLLOWING TEXT TO ${targetLang}.
  REQUIREMENTS:
  1. Maintain academic tone.
  2. Preserve HTML tags if any.
  3. RETURN ONLY THE TRANSLATED TEXT.
  
  TEXT: "${text}"`;

  try {
    const response = await callAiProxy('gemini', prompt);
    return response ? response.trim() : null;
  } catch (e) {
    return null;
  }
};
