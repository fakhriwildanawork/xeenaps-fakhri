
import { LibraryItem, GASResponse, ExtractionResult } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

/**
 * Manage API Keys (Gemini, Groq, ScrapingAnt) via GAS Backend
 */
export const manageApiKeys = async (payload: any): Promise<GASResponse<any>> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ 
        action: 'manageApiKey',
        ...payload
      }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

export const initializeDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'setupDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

/**
 * NEW: Initialize Consultation Database Structure
 */
export const initializeConsultationDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'setupConsultationDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

/**
 * NEW: Initialize Brainstorming Database Structure (Optional Legacy)
 */
export const initializeBrainstormingDatabase = async (): Promise<{ status: string; message: string }> => {
  // Legacy stub, real logic moved to Supabase service
  return { status: 'success', message: 'Brainstorming DB ready (Supabase managed).' };
};

/**
 * NEW: Initialize Publication Database Structure (Optional Legacy)
 */
export const initializePublicationDatabase = async (): Promise<{ status: string; message: string }> => {
  // Legacy stub
  return { status: 'success', message: 'Publication DB ready (Supabase managed).' };
};

export const deleteLibraryItem = async (id: string): Promise<boolean> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'deleteItem', id }),
    });
    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Delete failed:", error);
    return false;
  }
};

export const callAiProxy = async (
  provider: 'gemini' | 'groq', 
  prompt: string, 
  modelOverride?: string,
  signal?: AbortSignal,
  responseType?: 'json' | 'text' 
): Promise<string> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ 
        action: 'aiProxy', 
        provider, 
        prompt, 
        modelOverride,
        responseType
      }),
      signal // Pass abort signal to fetch
    });
    const result = await response.json();
    if (result.status === 'success') {
      return result.data;
    } else {
      console.error("AI Proxy Error:", result.message);
      return '';
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // Silent abort
    } else {
      console.error("AI Proxy Connection Failed:", error);
    }
    return '';
  }
};

/**
 * Upload File Helper for Library
 */
export const uploadAndStoreFile = async (
  file: File, 
  metadata: Partial<LibraryItem>
): Promise<{ status: string; fileId?: string; nodeUrl?: string; message?: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
        
        const response = await fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'saveItem',
            item: metadata,
            file: {
              fileName: file.name,
              mimeType: file.type,
              fileData: base64Data
            }
          })
        });
        const result = await response.json();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

/**
 * Save Extracted Content (Text) to Drive via GAS (Sharding)
 * Used by ContentManagerModal
 */
export const saveExtractedContentToDrive = async (
  item: LibraryItem, 
  content: string
): Promise<{ status: string, fileId: string, nodeUrl: string } | null> => {
  try {
    if (!GAS_WEB_APP_URL) return null;

    // 1. UPDATE MODE: If ID exists, overwrite the existing file
    if (item.extractedJsonId) {
      const targetUrl = item.storageNodeUrl || GAS_WEB_APP_URL;
      const jsonContent = JSON.stringify({ id: item.id, fullText: content });
      
      const payload = {
        action: 'saveJsonFile',
        fileId: item.extractedJsonId,
        fileName: `extracted_${item.id}.json`,
        content: jsonContent
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        return { 
           status: 'success', 
           fileId: item.extractedJsonId, 
           nodeUrl: targetUrl 
        };
      }
      return null;
    }

    // 2. CREATE MODE: Register new file (Let GAS handle storage balancing)
    const payload = {
      action: 'saveItem',
      item: item,
      extractedText: content
      // No binary file attached
    };
    
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.status === 'success') {
       // IMPORTANT: Map extractedJsonId to fileId for modal compatibility
       return {
         status: 'success',
         fileId: result.extractedJsonId,
         nodeUrl: result.nodeUrl
       };
    }
    return result;
  } catch (e) {
    return null;
  }
};

/**
 * Helper: Create Empty Insight File if missing
 */
export const createEmptyInsightFile = async (item: LibraryItem, nodeUrl?: string): Promise<string | null> => {
  try {
    if (!GAS_WEB_APP_URL) return null;
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;

    // Use generic saveJsonFile action
    const res = await fetch(targetUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveJsonFile', 
        fileName: `insight_${item.id}.json`, 
        content: JSON.stringify({}) 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.fileId : null;
  } catch (e) {
    return null;
  }
};

/**
 * Extract Metadata from URL via GAS (Scraping)
 */
export const extractFromUrl = async (url: string): Promise<any> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'extractOnly', url }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

/**
 * Identifier Search Proxy
 */
export const callIdentifierSearch = async (idValue: string, signal?: AbortSignal): Promise<any> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'searchByIdentifier', idValue }),
      signal
    });
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
  } catch (error) {
    return null;
  }
};

/**
 * Generate Citations
 */
export const generateCitations = async (item: LibraryItem, style: string, language: string): Promise<any> => {
  try {
    if (!GAS_WEB_APP_URL) return null;
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'generateCitations', item, style, language })
    });
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

/**
 * Generate Insight (AI Insighter)
 */
export const generateInsight = async (item: LibraryItem): Promise<any> => {
  try {
    if (!GAS_WEB_APP_URL) return null;
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'generateInsight', item })
    });
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

/**
 * Translate Insight Section
 */
export const translateInsightSection = async (item: LibraryItem, sectionName: string, targetLang: string): Promise<string | null> => {
  try {
    if (!GAS_WEB_APP_URL || !item.insightJsonId) return null;
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'translateInsightSection', 
        fileId: item.insightJsonId, 
        sectionName, 
        targetLang,
        nodeUrl: item.storageNodeUrl 
      })
    });
    const result = await response.json();
    return result.status === 'success' ? result.translatedText : null;
  } catch (e) {
    return null;
  }
};

/**
 * Fetch File Content (JSON Sharding)
 */
export const fetchFileContent = async (fileId: string, nodeUrl?: string): Promise<any> => {
  if (!fileId) return null;
  try {
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;
    if (!targetUrl) return null;
    const finalUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getFileContent&fileId=${fileId}`;
    const response = await fetch(finalUrl);
    const result = await response.json();
    return result.status === 'success' ? JSON.parse(result.content) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Process Library File in Cloud (Heavy Lifting Worker)
 * Delegates complex extraction and file saving to GAS to avoid browser timeouts.
 */
export const processLibraryFileInCloud = async (
  item: any, 
  fileUploadData?: { fileName: string, mimeType: string, fileData: string }, 
  extractedText?: string
): Promise<any> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');

    const payload = {
      action: 'saveItem',
      item: item,
      file: fileUploadData,
      extractedText: extractedText
    };

    // Use a longer timeout fetch wrapper or standard fetch
    // Note: Standard fetch doesn't have timeout, browsers default to ~300s
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};
