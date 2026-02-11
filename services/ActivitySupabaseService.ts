import { getSupabase } from './supabaseClient';
import { ActivityItem } from '../types';

/**
 * XEENAPS ACTIVITY SUPABASE SERVICE
 * Registry Metadata untuk modul Activities/Portfolio.
 */

export const fetchActivitiesPaginatedFromSupabase = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  type: string = "All",
  sortKey: string = "startDate", 
  sortDir: string = "desc"
): Promise<{ items: ActivityItem[], totalCount: number }> => {
  const client = getSupabase();
  if (!client) return { items: [], totalCount: 0 };

  let query = client
    .from('activities')
    .select('*', { count: 'exact' });

  // 1. Filter by Type
  if (type !== "All") {
    query = query.eq('type', type);
  }

  // 2. Smart Search (Server-side via search_all)
  if (search) {
    query = query.ilike('search_all', `%${search.toLowerCase()}%`);
  }

  // 3. Date Range Filter
  if (startDate) {
    query = query.gte('startDate', startDate);
  }
  if (endDate) {
    query = query.lte('startDate', endDate);
  }

  // 4. Sorting
  if (sortKey === 'isFavorite') {
      query = query.order('isFavorite', { ascending: false });
      query = query.order('startDate', { ascending: false });
  } else {
      query = query.order(sortKey, { ascending: sortDir === 'asc' });
  }

  // 5. Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase Activities Fetch Error:", error);
    return { items: [], totalCount: 0 };
  }

  return {
    items: data || [],
    totalCount: count || 0
  };
};

export const upsertActivityToSupabase = async (item: ActivityItem): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  // --- DEEP SANITIZATION PAYLOAD ---
  // Mencegah Error 406/500 akibat format JSONB yang salah
  
  // 1. Pisahkan kolom generated (search_all)
  const { search_all, ...cleanItem } = item as any;

  // 2. Pastikan vault_items adalah Array valid (Bukan null/undefined)
  const vaultItemsSafe = Array.isArray(cleanItem.vault_items) 
    ? cleanItem.vault_items 
    : [];

  // 3. Construct Payload yang Aman
  const payload = {
    ...cleanItem,
    // Paksa tipe data yang benar
    vault_items: vaultItemsSafe, 
    // Pastikan field opsional tidak undefined (gunakan null jika kosong agar SQL valid)
    organizer: cleanItem.organizer || null,
    location: cleanItem.location || null,
    certificateNumber: cleanItem.certificateNumber || null,
    vaultJsonId: cleanItem.vaultJsonId || null, 
    certificateFileId: cleanItem.certificateFileId || null,
    certificateNodeUrl: cleanItem.certificateNodeUrl || null,
    storageNodeUrl: cleanItem.storageNodeUrl || null,
    updatedAt: new Date().toISOString()
  };

  try {
    const { error } = await client
      .from('activities')
      .upsert(payload, { onConflict: 'id' }); // Explicit conflict target

    if (error) {
      console.error("Supabase Activity Upsert Error Detail:", JSON.stringify(error, null, 2));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase Unexpected Error:", err);
    return false;
  }
};

export const deleteActivityFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase Activity Delete Error:", error);
    return false;
  }
  return true;
};

export const fetchActivityByIdFromSupabase = async (id: string): Promise<ActivityItem | null> => {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('activities')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
};