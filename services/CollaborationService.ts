
import { SPREADSHEET_CONFIG } from '../assets';
import { CollaborationItem } from '../types';

/**
 * Service to fetch and parse Collaboration data from CSV.
 * Read-Only from Public Spreadsheet.
 */
export const fetchCollaborations = async (): Promise<CollaborationItem[]> => {
  try {
    const response = await fetch(SPREADSHEET_CONFIG.COLLABORATION_CSV);
    if (!response.ok) {
      throw new Error('Failed to fetch collaborations');
    }
    const csvText = await response.text();
    
    // Manual CSV Parsing (Quote-aware)
    const parseCSVRow = (row: string) => {
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
    const dataRows = rows.slice(1); // Skip header
    
    const items: CollaborationItem[] = [];

    dataRows.forEach(row => {
      const cols = parseCSVRow(row);
      
      // Expected Headers: No, Status, Category, CollaboratorName, StartDate, Duration, EndDate, Title, Campaign, Keyword, Image, CTA Link
      // Indices: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
      
      if (cols.length >= 12) {
        const status = cols[1]?.toUpperCase() || '';

        // FILTER: Status column (Col B) must be "ACTIVE"
        if (status === 'ACTIVE') {
           const startDateStr = cols[4];
           const endDateStr = cols[6];
           const images = cols[10].split(';').map(url => url.trim()).filter(Boolean);

           items.push({
             id: cols[0],
             status: cols[1], // Keep original casing for display
             category: cols[2],
             collaboratorName: cols[3],
             startDate: startDateStr,
             duration: cols[5],
             endDate: endDateStr,
             title: cols[7],
             campaign: cols[8],
             keyword: cols[9],
             images: images,
             ctaLink: cols[11]
           });
        }
      }
    });

    return items;
  } catch (error) {
    console.error("Failed to fetch collaboration data", error);
    return [];
  }
};
