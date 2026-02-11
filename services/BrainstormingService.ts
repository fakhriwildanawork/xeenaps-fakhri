import { BrainstormingItem, LibraryItem } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';
import { 
  fetchBrainstormingPaginatedFromSupabase, 
  upsertBrainstormingToSupabase, 
  deleteBrainstormingFromSupabase 
} from './BrainstormingSupabaseService';
import { fetchLibraryPaginatedFromSupabase } from './LibrarySupabaseService';

/**
 * XEENAPS BRAINSTORMING SERVICE (HYBRID)
 * CRUD -> Supabase
 * AI Synthesis -> GAS Proxy
 * Recommendations -> Supabase Query
 */

export const fetchBrainstormingPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: BrainstormingItem[], totalCount: number }> => {
  return await fetchBrainstormingPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
};

export const saveBrainstorming = async (item: BrainstormingItem): Promise<boolean> => {
  // SILENT BROADCAST FOR OPTIMISTIC UI SYNC
  window.dispatchEvent(new CustomEvent('xeenaps-brainstorming-updated', { detail: item }));
  return await upsertBrainstormingToSupabase(item);
};

export const deleteBrainstorming = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST FOR OPTIMISTIC UI SYNC
  window.dispatchEvent(new CustomEvent('xeenaps-brainstorming-deleted', { detail: id }));
  return await deleteBrainstormingFromSupabase(id);
};

// --- AI FUNCTIONS (REMAIN ON GAS/AI PROXY) ---

export const translateSingleField = async (
  text: string, 
  targetLang: string
): Promise<string | null> => {
  if (!text) return null;
  const prompt = `TRANSLATE THE FOLLOWING TEXT TO ${targetLang}.
  REQUIREMENTS:
  1. Maintain academic tone and nuance.
  2. Preserve any HTML tags if present (e.g. <b>, <i>).
  3. RETURN ONLY THE TRANSLATED TEXT. NO CONVERSATIONAL FILLER.
  
  TEXT:
  "${text}"`;

  try {
    const response = await callAiProxy('gemini', prompt);
    return response ? response.trim() : null;
  } catch (e) {
    console.error("Translation failed:", e);
    return null;
  }
};

export const refineBrainstormingField = async (
  fieldName: string,
  currentValue: string,
  context: BrainstormingItem,
  mode: 'REWRITE' | 'EXPAND'
): Promise<string | null> => {
  // Sanitasi context agar tidak terlalu besar (hilangkan array besar yang tidak relevan)
  const contextMini = {
    title: context.proposedTitle,
    problem: context.problemStatement,
    gap: context.researchGap,
    question: context.researchQuestion,
    methodology: context.methodology,
    population: context.population
  };

  const instruction = mode === 'REWRITE' 
    ? `Please REWRITE the '${fieldName}' field. Make it more academic, concise, and scientifically aligned with the Research Question.` 
    : `Please EXPAND the '${fieldName}' field. Add detail, depth, and rigorous academic nuance. CRITICAL: Ensure it is consistent with the Research Question and Problem Statement.`;

  const prompt = `ACT AS A SENIOR RESEARCH CO-PILOT.
  Based on the full project context below, perform the following action on the specific field.
  
  CONTEXT JSON:
  ${JSON.stringify(contextMini)}

  TARGET FIELD: "${fieldName}"
  CURRENT VALUE: "${currentValue}"
  ACTION: ${mode}

  INSTRUCTION: ${instruction}

  --- RULES ---
  1. RETURN ONLY THE NEW TEXT STRING for the field. NO CONVERSATION. NO JSON.
  2. STRICTLY DO NOT USE Markdown symbols like **, #, or -. Use standard text or HTML <b> if strictly necessary for emphasis.
  3. LANGUAGE: English (Academic).`;

  try {
    const response = await callAiProxy('gemini', prompt);
    return response ? response.trim() : null;
  } catch (e) {
    console.error("Refine field failed:", e);
    return null;
  }
};

export const synthesizeRoughIdea = async (roughIdea: string): Promise<Partial<BrainstormingItem> | null> => {
  const prompt = `ACT AS A SENIOR RESEARCH STRATEGIST.
  TRANSFORM THE FOLLOWING ROUGH IDEA INTO A STRUCTURED RESEARCH FRAMEWORK.
  
  ROUGH IDEA:
  "${roughIdea}"

  --- REQUIREMENTS ---
  1. RESPONSE MUST BE RAW JSON ONLY.
  2. LANGUAGE: ENGLISH BY DEFAULT.
  3. STRICT RULE: DO NOT USE the long dash character '—'. Use standard hyphens '-' instead.
  4. FIELDS TO FILL:
     - proposedTitle: High-impact academic title.
     - problemStatement: Concise justification of the study.
     - researchGap: What previous studies missed.
     - researchQuestion: Primary investigation question.
     - methodology: Proposed technical approach.
     - population: Targeted subjects or data sources.
     - keywords: Array of 5 core academic keywords.
     - pillars: Array of EXACTLY 10 main discussion pillars for the paper.

  EXPECTED JSON STRUCTURE:
  {
    "proposedTitle": "...",
    "problemStatement": "...",
    "researchGap": "...",
    "researchQuestion": "...",
    "methodology": "...",
    "population": "...",
    "keywords": ["...", "...", "...", "...", "..."],
    "pillars": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."]
  }`;

  try {
    const response = await callAiProxy('gemini', prompt);
    if (!response) return null;
    let cleanJson = response.trim();
    if (cleanJson.includes('{')) {
      cleanJson = cleanJson.substring(cleanJson.indexOf('{'), cleanJson.lastIndexOf('}') + 1);
    }
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Idea synthesis failed:", e);
    return null;
  }
};

export const generateProposedAbstract = async (item: BrainstormingItem): Promise<string | null> => {
  const prompt = `ACT AS A SENIOR ACADEMIC WRITER.
  COMPOSE A FORMAL ACADEMIC ABSTRACT BASED ON THESE RESEARCH ELEMENTS:
  
  TITLE: ${item.proposedTitle}
  PROBLEM: ${item.problemStatement}
  GAP: ${item.researchGap}
  QUESTION: ${item.researchQuestion}
  METHODOLOGY: ${item.methodology}
  PILLARS: ${item.pillars.join(', ')}

  --- RULES ---
  - NO CONVERSATION. ONLY TEXT.
  - USE ACADEMIC TONE.
  - MAX 250 WORDS.
  - STRICT RULE: DO NOT USE the long dash character '—'. Use standard hyphens '-' instead.
  - RETURN PLAIN STRING.`;

  try {
    const response = await callAiProxy('gemini', prompt);
    return response ? response.trim() : null;
  } catch (e) {
    console.error("Abstract generation failed:", e);
    return null;
  }
};

export const getExternalRecommendations = async (item: BrainstormingItem): Promise<string[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'getBrainstormingRecommendations', 
        keywords: item.keywords,
        title: item.proposedTitle
      })
    });
    const result = await res.json();
    // Return all 10 items from OpenAlex
    return result.status === 'success' ? (result.external || []) : [];
  } catch (error) {
    return [];
  }
};

export const getInternalRecommendations = async (item: BrainstormingItem): Promise<LibraryItem[]> => {
  try {
    const keywords = Array.isArray(item.keywords) ? item.keywords : [];
    
    // STRATEGY FOR RELEVANCE:
    // 1. Use the PRIMARY keyword (first one) as the main anchor.
    //    Concatenating multiple keywords with spaces often leads to zero results in 'ilike' search 
    //    because it looks for that EXACT phrase sequence.
    // 2. Fallback to Title if no keywords exist.
    
    let query = "";
    if (keywords.length > 0) {
       query = keywords[0]; // Most significant keyword
    } else {
       query = item.proposedTitle || "";
    }

    if (!query) return [];

    const result = await fetchLibraryPaginatedFromSupabase(
      1, 
      10, 
      query, 
      'Literature', // Type filter: Literature
      'research'    // Path filter context
    );
    
    // Client-side Filtering for Quality Control
    const filtered = (result.items || []).filter(lib => 
        lib.title && 
        lib.title.trim() !== "" && 
        lib.title !== "Untitled" &&
        lib.id !== item.id
    );
    
    return filtered;
  } catch (error) {
    console.error("Internal Recs Error:", error);
    return [];
  }
};

export const translateBrainstormingFields = async (item: BrainstormingItem, targetLang: string): Promise<Partial<BrainstormingItem> | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'translateBrainstorming', 
        data: item,
        targetLang: targetLang
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};