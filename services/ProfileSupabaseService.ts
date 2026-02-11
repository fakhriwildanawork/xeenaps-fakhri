import { getSupabase } from './supabaseClient';
import { UserProfile, EducationEntry, CareerEntry } from '../types';

/**
 * XEENAPS PROFILE SUPABASE SERVICE
 * High-performance registry for User Identity and History.
 */

const MAIN_USER_ID = 'MAIN_USER';

export const fetchProfileFromSupabase = async (): Promise<UserProfile | null> => {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', MAIN_USER_ID)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Supabase Profile Fetch Error:", error);
    return null;
  }
  return data || null;
};

export const upsertProfileToSupabase = async (profile: UserProfile): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('profiles')
    .upsert({ ...profile, id: MAIN_USER_ID, updatedAt: new Date().toISOString() });

  if (error) {
    console.error("Supabase Profile Upsert Error:", error);
    return false;
  }
  return true;
};

export const fetchEducationFromSupabase = async (): Promise<EducationEntry[]> => {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('education_history')
    .select('*')
    .eq('profile_id', MAIN_USER_ID)
    .order('startYear', { ascending: false });

  if (error) {
    console.error("Supabase Education Fetch Error:", error);
    return [];
  }
  return data || [];
};

export const upsertEducationToSupabase = async (entry: EducationEntry): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('education_history')
    .upsert({ ...entry, profile_id: MAIN_USER_ID });

  if (error) {
    console.error("Supabase Education Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteEducationFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('education_history')
    .delete()
    .eq('id', id);

  return !error;
};

export const fetchCareerFromSupabase = async (): Promise<CareerEntry[]> => {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('career_history')
    .select('*')
    .eq('profile_id', MAIN_USER_ID)
    .order('startDate', { ascending: false });

  if (error) {
    console.error("Supabase Career Fetch Error:", error);
    return [];
  }
  return data || [];
};

export const upsertCareerToSupabase = async (entry: CareerEntry): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('career_history')
    .upsert({ ...entry, profile_id: MAIN_USER_ID });

  if (error) {
    console.error("Supabase Career Upsert Error:", error);
    return false;
  }
  return true;
};

export const deleteCareerFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('career_history')
    .delete()
    .eq('id', id);

  return !error;
};