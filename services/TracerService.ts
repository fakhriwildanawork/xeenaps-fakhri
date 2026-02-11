


import { TracerProject, TracerLog, TracerReference, TracerTodo, TracerFinanceItem, TracerFinanceContent, GASResponse, TracerLogContent, TracerReferenceContent } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchTracerProjectsFromSupabase, 
  upsertTracerProjectToSupabase, 
  deleteTracerProjectFromSupabase,
  fetchTracerLogsFromSupabase,
  upsertTracerLogToSupabase,
  deleteTracerLogFromSupabase,
  fetchTracerReferencesFromSupabase,
  upsertTracerReferenceToSupabase,
  deleteTracerReferenceFromSupabase,
  fetchTracerTodosFromSupabase,
  upsertTracerTodoToSupabase,
  deleteTracerTodoFromSupabase,
  fetchTracerFinanceFromSupabase,
  upsertTracerFinanceToSupabase,
  deleteTracerFinanceFromSupabase,
  fetchAllPendingTodosFromSupabase
} from './TracerSupabaseService';
import { deleteRemoteFile } from './ActivityService';
import { fetchFileContent, callAiProxy } from './gasService';

/**
 * XEENAPS TRACER SERVICE (HYBRID ARCHITECTURE)
 * Metadata: Supabase
 * Payload: Google Apps Script (Sharding)
 */

// --- AI & UTILS ---

export const translateTracerField = async (
  text: string, 
  targetLang: string
): Promise<string | null> => {
  if (!text) return null;
  const prompt = `TRANSLATE THE FOLLOWING TEXT TO ${targetLang}.
  REQUIREMENTS:
  1. Maintain research/academic tone.
  2. Preserve any HTML tags if present.
  3. RETURN ONLY THE TRANSLATED TEXT.
  
  TEXT:
  "${text}"`;

  try {
    const response = await callAiProxy('gemini', prompt);
    return response ? response.trim() : null;
  } catch (e) {
    console.error("Tracer Translation failed:", e);
    return null;
  }
};

export const refineTracerField = async (
  fieldName: string,
  currentValue: string,
  context: TracerProject,
  mode: 'REWRITE' | 'EXPAND'
): Promise<string | null> => {
  const contextMini = {
    title: context.title || context.label,
    topic: context.topic,
    problem: context.problemStatement,
    gap: context.researchGap,
    question: context.researchQuestion,
    methodology: context.methodology,
    population: context.population
  };

  const instruction = mode === 'REWRITE' 
    ? `Please REWRITE the '${fieldName}' field. Make it more professional, concise, and scientifically aligned with the Research Context.` 
    : `Please EXPAND the '${fieldName}' field. Add detail, depth, and rigorous academic nuance based on the project context.`;

  const prompt = `ACT AS A SENIOR RESEARCH AUDITOR.
  Based on the project context below, perform the following action.
  
  CONTEXT JSON:
  ${JSON.stringify(contextMini)}

  TARGET FIELD: "${fieldName}"
  CURRENT VALUE: "${currentValue}"
  ACTION: ${mode}

  INSTRUCTION: ${instruction}

  --- RULES ---
  1. RETURN ONLY THE NEW TEXT STRING. NO CONVERSATION.
  2. STRICTLY DO NOT USE Markdown symbols.
  3. LANGUAGE: English (Academic).`;

  try {
    const response = await callAiProxy('gemini', prompt);
    return response ? response.trim() : null;
  } catch (e) {
    console.error("Refine Tracer field failed:", e);
    return null;
  }
};

// --- 1. PROJECTS ---

export const fetchTracerProjects = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  signal?: AbortSignal
): Promise<{ items: TracerProject[], totalCount: number }> => {
  return await fetchTracerProjectsFromSupabase(page, limit, search, "updatedAt", "desc");
};

export const saveTracerProject = async (item: TracerProject): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-tracer-updated', { detail: item }));
  return await upsertTracerProjectToSupabase(item);
};

export const deleteTracerProject = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-tracer-deleted', { detail: id }));
  return await deleteTracerProjectFromSupabase(id);
};

// --- 2. LOGS ---

export const fetchTracerLogs = async (projectId: string): Promise<TracerLog[]> => {
  return await fetchTracerLogsFromSupabase(projectId);
};

export const saveTracerLog = async (item: TracerLog, content: TracerLogContent): Promise<boolean> => {
  // DIRECT REGISTRY: Send content as part of the item metadata to Supabase
  // No need to shard small JSON to GAS anymore
  const updatedItem: TracerLog = {
    ...item,
    description: content.description,
    vault_items: content.attachments
  };

  // Save Metadata to Supabase
  return await upsertTracerLogToSupabase(updatedItem);
};

export const deleteTracerLog = async (id: string): Promise<boolean> => {
  // Metadata deletion is prioritized.
  // Physical file cleanup (if any legacy exists) can be added if needed, 
  // but direct registry doesn't use new files.
  return await deleteTracerLogFromSupabase(id);
};

// --- 3. REFERENCES ---

export const fetchTracerReferences = async (projectId: string): Promise<TracerReference[]> => {
  return await fetchTracerReferencesFromSupabase(projectId);
};

export const linkTracerReference = async (item: Partial<TracerReference>): Promise<TracerReference | null> => {
  try {
    const newRef: TracerReference = {
      id: item.id || crypto.randomUUID(),
      projectId: item.projectId || '',
      collectionId: item.collectionId || '',
      contentJsonId: '',
      storageNodeUrl: '',
      quotes: [], // Initialize empty
      createdAt: new Date().toISOString()
    };
    
    const success = await upsertTracerReferenceToSupabase(newRef);
    return success ? newRef : null;
  } catch (e) {
    return null;
  }
};

export const unlinkTracerReference = async (id: string): Promise<boolean> => {
  return await deleteTracerReferenceFromSupabase(id);
};

export const fetchReferenceContent = async (fileId: string, nodeUrl?: string): Promise<TracerReferenceContent | null> => {
  return await fetchFileContent(fileId, nodeUrl);
};

/**
 * DIRECT REGISTRY: Save Reference Content (Quotes)
 */
export const saveReferenceContent = async (item: TracerReference, content: TracerReferenceContent): Promise<{contentJsonId: string, storageNodeUrl: string} | null> => {
  // DIRECT REGISTRY: Update item with quotes and save to Supabase
  const updatedItem: TracerReference = {
    ...item,
    quotes: content.quotes
  };
  
  const success = await upsertTracerReferenceToSupabase(updatedItem);
  
  if (success) {
      // Return existing IDs just to satisfy interface or dummy values
      return { contentJsonId: item.contentJsonId, storageNodeUrl: item.storageNodeUrl };
  }
  return null;
};

// --- 4. TODOS ---

export const fetchTracerTodos = async (projectId: string): Promise<TracerTodo[]> => {
  return await fetchTracerTodosFromSupabase(projectId);
};

export const saveTracerTodo = async (item: TracerTodo): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-todo-updated', { detail: item }));
  return await upsertTracerTodoToSupabase(item);
};

export const deleteTracerTodo = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-todo-deleted', { detail: id }));
  return await deleteTracerTodoFromSupabase(id);
};

// --- 5. FINANCE ---

export const fetchTracerFinance = async (projectId: string, startDate = "", endDate = "", search = ""): Promise<TracerFinanceItem[]> => {
  return await fetchTracerFinanceFromSupabase(projectId, startDate, endDate, search);
};

/**
 * EXPORT PDF LOGIC (Hybrid Stitching)
 * 1. Fetch metadata from Supabase
 * 2. Calculate Running Balance
 * 3. Fetch attachments info (sharded JSON)
 * 4. Construct payload
 * 5. POST payload to GAS PDF Engine
 */
export const exportFinanceLedger = async (projectId: string, currency: string): Promise<{ base64: string, filename: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
     // 1. Fetch Finance Items (All)
     const financeItems = await fetchTracerFinanceFromSupabase(projectId);
     if (financeItems.length === 0) return null;

     // 2. Calculate Running Balance for Export
     // Ensure items are sorted chronologically before calculating
     const sortedItems = [...financeItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     let runningBalance = 0;
     const calculatedItems = sortedItems.map(item => {
         runningBalance += (item.credit || 0) - (item.debit || 0);
         return { ...item, balance: runningBalance };
     });

     // 3. Fetch Project Info
     const { items: projects } = await fetchTracerProjectsFromSupabase(1, 1000, ""); 
     const project = projects.find(p => p.id === projectId);
     const projectTitle = project?.title || project?.label || "Financial Report";
     const projectAuthors = Array.isArray(project?.authors) ? project.authors.join(", ") : "Xeenaps User";

     // 4. Enrich Items with Attachment Links
     // DIRECT REGISTRY: Attachments are now in item.attachments
     const enrichedTransactions = calculatedItems.map(item => {
        let linkString = "-";
        if (item.attachments && Array.isArray(item.attachments)) {
            const urls = item.attachments.map((a: any) => 
                a.url || (a.fileId ? `https://drive.google.com/file/d/${a.fileId}/view` : "")
            ).filter((u: string) => u !== "");
            if (urls.length > 0) linkString = urls.join(" | ");
        }
        // Legacy fallback: fetch from GAS if attachmentsJsonId exists but attachments is empty
        // Omitted for simplicity as migration assumes new structure or re-save
        return { ...item, links: linkString };
     });

     // 5. Construct Payload
     const payload = {
        transactions: enrichedTransactions,
        projectTitle,
        projectAuthors,
        currency
     };

     // 6. Send to GAS
     const res = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
           action: 'generateFinanceExport',
           payload: payload
        })
     });
     
     const result = await res.json();
     if (result.status === 'success') {
        return { base64: result.base64, filename: result.filename };
     }
     return null;
  } catch (e) {
    console.error("Finance Export Error:", e);
    return null;
  }
};

export const saveTracerFinance = async (item: TracerFinanceItem, content: TracerFinanceContent): Promise<boolean> => {
  // DIRECT REGISTRY: Embed attachments in item
  const updatedItem: TracerFinanceItem = {
    ...item,
    attachments: content.attachments
  };

  // Save Metadata to Supabase
  return await upsertTracerFinanceToSupabase(updatedItem);
};

export const deleteTracerFinance = async (id: string): Promise<GASResponse<any>> => {
  const success = await deleteTracerFinanceFromSupabase(id);
  return { status: success ? 'success' : 'error' };
};

// --- AI TRACER PROXIES (Passthrough to GAS) ---

export const extractTracerQuotes = async (collectionId: string, contextQuery: string): Promise<Array<{ originalText: string; enhancedText: string }> | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiTracerProxy', 
        subAction: 'extractQuote', 
        payload: { collectionId, contextQuery } 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

export const enhanceTracerQuote = async (originalText: string, citation: string): Promise<string | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiTracerProxy', 
        subAction: 'enhanceQuote', 
        payload: { originalText, citation } 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};