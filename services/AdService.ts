
import { SPREADSHEET_CONFIG } from '../assets';
import { VipAdItem } from '../types';

export const fetchVipAd = async (): Promise<VipAdItem | null> => {
  try {
    console.log("🔍 [AdService] Fetching VIP Ads from:", SPREADSHEET_CONFIG.VIP_ADS_CSV);
    
    const response = await fetch(SPREADSHEET_CONFIG.VIP_ADS_CSV);
    
    // 1. Cek apakah Response OK
    if (!response.ok) {
      console.error(`❌ [AdService] HTTP Error: ${response.status}`);
      return null;
    }

    const csvText = await response.text();

    // 2. Cek apakah ini Halaman Login Google (HTML) bukan CSV
    // Ini terjadi jika Spreadsheet belum di-set "Anyone with the link"
    if (csvText.trim().startsWith("<!DOCTYPE html>") || csvText.includes("<html")) {
      console.error("❌ [AdService] Error: URL mengembalikan HTML (Halaman Login), bukan CSV. Pastikan Spreadsheet di-share 'Anyone with the link' dan GID benar.");
      return null;
    }

    // Simple CSV parser for quoted fields
    const parseRow = (row: string) => {
      const cols: string[] = [];
      let currentVal = '';
      let inQuote = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          if (inQuote && row[i+1] === '"') {
             currentVal += '"';
             i++;
          } else {
             inQuote = !inQuote;
          }
        } else if (char === ',' && !inQuote) {
          cols.push(currentVal);
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      cols.push(currentVal);
      return cols.map(c => c.trim().replace(/^"|"$/g, ''));
    };

    const rows = csvText.split(/\r?\n/).filter(row => row.trim().length > 0);
    
    if (rows.length < 2) {
      console.warn("⚠️ [AdService] CSV kosong atau hanya header.");
      return null;
    }

    // 3. DYNAMIC HEADER MAPPING
    // Cari index kolom berdasarkan nama header (Case Insensitive)
    const headers = parseRow(rows[0]).map(h => h.toLowerCase());
    console.log("ℹ️ [AdService] Detected Headers:", headers);

    const statusIdx = headers.findIndex(h => h === 'status');
    const imageIdx = headers.findIndex(h => h === 'image');
    const linkIdx = headers.findIndex(h => h === 'ctalink' || h === 'cta link' || h === 'link');

    if (statusIdx === -1 || imageIdx === -1) {
      console.error("❌ [AdService] Kolom 'Status' atau 'Image' tidak ditemukan pada Header CSV.");
      return null;
    }

    // 4. Reverse Search (Cari ACTIVE terbawah)
    for (let i = rows.length - 1; i >= 1; i--) {
      const cols = parseRow(rows[i]);
      
      // Pastikan baris memiliki data di kolom yang dibutuhkan
      if (cols[statusIdx]) {
        const status = cols[statusIdx].toUpperCase();
        
        if (status === 'ACTIVE') {
          const imageUrl = cols[imageIdx];
          const ctaLink = linkIdx !== -1 ? cols[linkIdx] : '';

          if (imageUrl) {
            console.log(`✅ [AdService] Found Active Ad at Row ${i + 1}:`, { imageUrl, ctaLink });
            return {
              imageUrl: imageUrl,
              ctaLink: ctaLink
            };
          }
        }
      }
    }
    
    console.log("ℹ️ [AdService] Tidak ada iklan dengan status ACTIVE.");
    return null;
  } catch (error) {
    console.error("❌ [AdService] Exception:", error);
    return null;
  }
};
