
import { LibraryItem, GapAnalysisRow, NoveltySynthesis } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';
import { fetchResearchSourceBySourceId, upsertResearchSourceToSupabase } from './ResearchSupabaseService';

/**
 * XEENAPS RESEARCH GAP FINDER SERVICE
 * Fokus pada ekstraksi kebaruan dan deteksi white space dalam literatur.
 */

/**
 * Mendapatkan potongan teks awal dan akhir dokumen (Hybrid Snippet)
 */
export const fetchHybridSnippet = async (item: LibraryItem): Promise<string> => {
  if (!GAS_WEB_APP_URL || !item.extractedJsonId) return "";
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'getHybridSnippet', 
        fileId: item.extractedJsonId,
        nodeUrl: item.storageNodeUrl 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.snippet : "";
  } catch (e) {
    console.error("Failed to fetch hybrid snippet:", e);
    return "";
  }
};

/**
 * Menganalisis satu sumber untuk mengisi baris matrix (Findings, Method, Gap)
 * Menggunakan Gemini 3 Flash via Proxy.
 */
export const analyzeSingleSourceGap = async (snippet: string, title: string): Promise<Partial<GapAnalysisRow> | null> => {
  const prompt = `ACT AS A SENIOR SCIENTIFIC AUDITOR.
  Analyze the provided introduction and conclusion from the research titled: "${title}".
  
  TASK: Extract the Core Research Matrix.
  1. FINDINGS: What are the absolute primary results/discoveries? (Max 3 points)
  2. METHODOLOGY: What specific technical approach/paradigm was used?
  3. LIMITATIONS: What was NOT covered? What are the weaknesses or boundaries explicitly mentioned?

  --- RULES ---
  - RESPONSE MUST BE RAW JSON.
  - USE PLAIN STRING TEXT.
  - LANGUAGE: ENGLISH.

  CONTENT:
  ${snippet}

  EXPECTED JSON:
  {
    "findings": "...",
    "methodology": "...",
    "limitations": "..."
  }`;

  try {
    const aiRes = await callAiProxy('gemini', prompt);
    if (!aiRes) return null;

    // Robust JSON Cleaning: Remove Markdown fences first
    let cleanJson = aiRes.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // Find outer braces
    const start = cleanJson.indexOf('{');
    const end = cleanJson.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
      cleanJson = cleanJson.substring(start, end + 1);
    }
    
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("AI Analysis failed:", e);
    return null;
  }
};

/**
 * Mengecek apakah sumber ini sudah pernah dianalisis sebelumnya (Supabase).
 */
export const checkStoredGap = async (sourceId: string): Promise<GapAnalysisRow | null> => {
  try {
    const data = await fetchResearchSourceBySourceId(sourceId);
    return data;
  } catch (e) {
    return null;
  }
};

/**
 * Menyimpan hasil analisis gap ke registry (Supabase).
 * Membutuhkan projectId jika tersedia, atau null jika standalone (perlu penyesuaian schema jika projectId mandatory).
 * Asumsi: Component akan memastikan projectId ada jika dalam konteks Project.
 * Jika standalone, kita gunakan adapter ini.
 */
export const saveGapToRegistry = async (log: GapAnalysisRow): Promise<boolean> => {
  // Mapping GapAnalysisRow ke ResearchSource (Subset)
  // Perlu diperhatikan: saveGapToRegistry biasanya dipanggil dari GapFinderView
  // yang mungkin tidak memiliki ProjectContext. 
  // Namun, sesuai schema baru, ResearchSource butuh projectId.
  // Untuk kompatibilitas, kita akan melewatkan ini jika tidak ada project context yang jelas dari caller.
  // Component GapFinderView perlu diupdate untuk memberikan konteks Project atau kita simpan sebagai "General".
  
  // NOTE: Dalam konteks migrasi ini, GapFinderView biasanya dipakai dalam ResearchWorkArea yang sudah punya Project.
  // Jika GapFinderView dipakai mandiri, kita perlu strategi lain atau dummy project.
  // Di sini kita cast ke any untuk kompatibilitas, tapi idealnya caller (ResearchWorkArea) menggunakan saveProjectSource.
  
  return await upsertResearchSourceToSupabase(log as any);
};

/**
 * Melakukan sintesis novelty dari sekumpulan baris gap.
 * Menggunakan Gemini 3 Pro via Proxy untuk penalaran mendalam.
 */
export const synthesizeOverallNovelty = async (allGaps: GapAnalysisRow[]): Promise<NoveltySynthesis | null> => {
  const matrixText = allGaps.map((g, i) => `SOURCE ${i+1}: ${g.title}\n- Findings: ${g.findings}\n- Method: ${g.methodology}\n- Gaps: ${g.limitations}`).join('\n\n');

  const prompt = `ACT AS A DISTINGUISHED PROFESSOR AND RESEARCH STRATEGIST.
  You are looking at a comparison matrix of several research sources.
  
  TASK: Identify the "WHITE SPACE" (The ultimate Research Gap).
  1. NARRATIVE: Create a 3-paragraph synthesis. 
     - Para 1: Common themes and established knowledge across these sources.
     - Para 2: Theoretical or methodological contradictions/omissions found when comparing them.
     - Para 3: The NOVELTY statement. Why is a new study needed right now?
  2. PROPOSED_TITLE: Suggest 1 high-impact research title that fills this specific gap.
  3. FUTURE_DIRECTIONS: Suggest 3 specific tactical research directions.

  MATRIX DATA:
  ${matrixText}

  --- RULES ---
  - NO CONVERSATION. ONLY RAW JSON.
  - USE PLAIN STRING TEXT.
  - LANGUAGE: ENGLISH.

  EXPECTED JSON:
  {
    "narrative": "Full 3-paragraph synthesis",
    "proposedTitle": "Impactful Title",
    "futureDirections": ["Point 1", "Point 2", "Point 3"]
  }`;

  try {
    const aiRes = await callAiProxy('gemini', prompt);
    if (!aiRes) return null;

    // Robust JSON Cleaning: Remove Markdown fences first
    let cleanJson = aiRes.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // Find outer braces
    const start = cleanJson.indexOf('{');
    const end = cleanJson.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
      cleanJson = cleanJson.substring(start, end + 1);
    }
    
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Synthesis failed:", e);
    return null;
  }
};
