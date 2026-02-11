
import { getSupabase } from './supabaseClient';
import { CVDocument } from '../types';

/**
 * XEENAPS CV SUPABASE SERVICE
 * Registry Metadata untuk modul CV Architect.
 */

export const fetchCVListFromSupabase = async (): Promise<CVDocument[]> => {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('cv_documents')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error("Supabase CV Fetch Error:", error);
    return [];
  }
  return data || [];
};

export const upsertCVToSupabase = async (item: CVDocument): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // Sanitasi: Hapus search_all agar di-handle oleh trigger DB
  const { search_all, ...cleanItem } = item as any;

  // Ensure arrays are arrays (defensive)
  const payload = {
    ...cleanItem,
    selectedEducationIds: Array.isArray(cleanItem.selectedEducationIds) ? cleanItem.selectedEducationIds : [],
    selectedCareerIds: Array.isArray(cleanItem.selectedCareerIds) ? cleanItem.selectedCareerIds : [],
    selectedPublicationIds: Array.isArray(cleanItem.selectedPublicationIds) ? cleanItem.selectedPublicationIds : [],
    selectedActivityIds: Array.isArray(cleanItem.selectedActivityIds) ? cleanItem.selectedActivityIds : [],
    updatedAt: new Date().toISOString()
  };

  const { error } = await client
    .from('cv_documents')
    .upsert(payload);

  if (error) {
    console.error("Supabase CV Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteCVFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('cv_documents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase CV Delete Error:", error);
    return false;
  }
  return true;
};
