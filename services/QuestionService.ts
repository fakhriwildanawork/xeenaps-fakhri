import { QuestionItem, BloomsLevel, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchQuestionsFromSupabase, 
  fetchQuestionsByIds as fetchByIdsSupabase,
  upsertQuestionToSupabase, 
  deleteQuestionFromSupabase 
} from './QuestionSupabaseService';

/**
 * XEENAPS QUESTION BANK SERVICE
 * Refactored to Point to Supabase Registry (Metadata) and GAS Worker (AI Generation)
 */

export const fetchRelatedQuestions = async (
  collectionId: string,
  page: number = 1,
  limit: number = 20,
  search: string = "",
  bloomFilter: string = "All",
  signal?: AbortSignal
): Promise<{ items: QuestionItem[], totalCount: number }> => {
  return await fetchQuestionsFromSupabase(page, limit, search, collectionId, bloomFilter);
};

/**
 * Fetch All Questions (Global) with Filtering, Sorting, and Pagination via Supabase
 */
export const fetchAllQuestionsPaginated = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  bloomFilter: string = "All",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: QuestionItem[], totalCount: number }> => {
  return await fetchQuestionsFromSupabase(page, limit, search, "", bloomFilter, startDate, endDate, sortKey, sortDir);
};

/**
 * Fetch specific questions by IDs
 */
export const fetchQuestionsByIds = async (ids: string[]): Promise<QuestionItem[]> => {
  return await fetchByIdsSupabase(ids);
};

/**
 * Generate Questions via AI (GAS Worker) and store in Supabase
 */
export const generateQuestionsWorkflow = async (
  config: {
    collectionId: string;
    extractedJsonId: string;
    nodeUrl?: string;
    bloomLevel: BloomsLevel;
    count: number;
    additionalContext: string;
    language: string;
  }
): Promise<QuestionItem[] | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    // Stage 1: Call GAS AI Worker (Pure Logic, No Sheet Write)
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'generateQuestionsAI',
        ...config
      })
    });
    const result = await res.json();
    
    if (result.status === 'success' && Array.isArray(result.data)) {
      const generatedItems: QuestionItem[] = result.data;
      
      // Stage 2: Persist to Supabase Registry
      for (const q of generatedItems) {
        await upsertQuestionToSupabase(q);
        // SILENT BROADCAST
        window.dispatchEvent(new CustomEvent('xeenaps-question-updated', { detail: q }));
      }
      
      return generatedItems;
    } else {
      // Propagate original backend error message
      throw new Error(result.message || "AI Extraction failed to produce valid items.");
    }
  } catch (error: any) {
    console.error("Question Generation Error:", error);
    throw error;
  }
};

/**
 * Save or Update a single question record with Supabase Persistence
 */
export const saveQuestionRecord = async (item: QuestionItem): Promise<boolean> => {
  const success = await upsertQuestionToSupabase(item);
  if (success) {
    window.dispatchEvent(new CustomEvent('xeenaps-question-updated', { detail: item }));
  }
  return success;
};

/**
 * Delete Question with SILENT BROADCAST
 */
export const deleteQuestion = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST FOR REAL-TIME SYNC & CASCADE CLEANUP
  window.dispatchEvent(new CustomEvent('xeenaps-question-deleted', { detail: id }));

  // Metadata Sync
  return await deleteQuestionFromSupabase(id);
};