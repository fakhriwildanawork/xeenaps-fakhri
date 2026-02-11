import { SPREADSHEET_CONFIG } from '../assets';
import { TutorialItem } from '../types';

/**
 * Service to fetch and parse Tutorial data from CSV.
 */
export const fetchTutorials = async (): Promise<Record<string, TutorialItem[]>> => {
  try {
    const response = await fetch(SPREADSHEET_CONFIG.TUTORIAL_CSV);
    if (!response.ok) {
      throw new Error('Failed to fetch tutorials');
    }
    const csvText = await response.text();
    
    // Split by new line
    // Handle potential carriage returns from Excel/Sheets
    const rows = csvText.split(/\r?\n/).filter(row => row.trim().length > 0);
    
    // Skip header (Row 1)
    const dataRows = rows.slice(1);
    
    const tutorials: Record<string, TutorialItem[]> = {};

    dataRows.forEach(row => {
      // Manual CSV Parsing to handle quotes, commas, and spaces correctly.
      // This ensures multi-word titles like "Getting Started" are preserved 
      // and not split into "Getting".
      
      const cols: string[] = [];
      let currentVal = '';
      let inQuote = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
          // Handle quotes: toggle state, or handle escaped quotes ("")
          if (inQuote && row[i+1] === '"') {
             currentVal += '"';
             i++; // Skip next quote
          } else {
             inQuote = !inQuote;
          }
        } else if (char === ',' && !inQuote) {
          // Comma acts as separator only if NOT inside quotes
          cols.push(currentVal);
          currentVal = '';
        } else {
          // Normal character (including spaces)
          currentVal += char;
        }
      }
      cols.push(currentVal); // Push the last column

      // Clean up
      const finalCols = cols.map(c => c.trim());

      // Mapping based on Sheet Columns: 
      // Col 0: ID
      // Col 1: Category
      // Col 2: Nama (Title)
      // Col 3: Link
      
      if (finalCols.length >= 4) {
        const id = finalCols[0];
        const category = finalCols[1];
        const title = finalCols[2];
        const link = finalCols[3];

        // Ensure we have valid data before adding
        if (id && category && title && link) {
          // Additional cleanup just in case parser left wrapping quotes
          const cleanCategory = category.replace(/^"|"$/g, '');
          const cleanTitle = title.replace(/^"|"$/g, '');
          
          if (!tutorials[cleanCategory]) {
            tutorials[cleanCategory] = [];
          }
          tutorials[cleanCategory].push({ 
             id, 
             category: cleanCategory, 
             title: cleanTitle, 
             link: link.replace(/^"|"$/g, '') 
          });
        }
      }
    });

    return tutorials;
  } catch (error) {
    console.error("Failed to fetch tutorials", error);
    return {};
  }
};