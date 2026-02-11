import { LiteratureArticle, ArchivedArticleItem, ArchivedBookItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchArchivedArticlesPaginatedFromSupabase, 
  upsertArchivedArticleToSupabase, 
  deleteArchivedArticleFromSupabase,
  fetchArchivedBooksPaginatedFromSupabase,
  upsertArchivedBookToSupabase,
  deleteArchivedBookFromSupabase
} from './LiteratureSupabaseService';

/**
 * XEENAPS LITERATURE SEARCH SERVICE
 * Hybrid Integration:
 * - Articles Registry -> Supabase (Primary Source of Truth)
 * - Books Registry -> Supabase (Primary Source of Truth)
 * - External Search (OpenAlex/OpenLibrary) -> GAS Proxy
 */

// Client-side Session Cache (Non-persistent on F5, but survives route navigation)
let searchCache = {
  query: '',
  yearStart: '',
  yearEnd: '',
  results: [] as LiteratureArticle[]
};

let bookSearchCache = {
  query: '',
  yearStart: '',
  yearEnd: '',
  results: [] as LiteratureArticle[]
};

export const getSearchCache = () => searchCache;
export const setSearchCache = (data: typeof searchCache) => {
  searchCache = data;
};

export const getBookSearchCache = () => bookSearchCache;
export const setBookSearchCache = (data: typeof bookSearchCache) => {
  bookSearchCache = data;
};

export const searchArticles = async (
  query: string, 
  yearStart?: number, 
  yearEnd?: number,
  limit: number = 12
): Promise<LiteratureArticle[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=searchGlobalArticles&query=${encodeURIComponent(query)}&yearStart=${yearStart || ''}&yearEnd=${yearEnd || ''}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Proxy Search failed');
    const result = await response.json();
    if (result.status === 'success') {
      return result.data || [];
    } else {
      console.warn("Search Proxy Warning:", result.message);
      return [];
    }
  } catch (error) {
    console.error("Search articles exception:", error);
    return [];
  }
};

export const searchBooks = async (
  query: string, 
  yearStart?: number, 
  yearEnd?: number,
  limit: number = 12
): Promise<LiteratureArticle[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=searchGlobalBooks&query=${encodeURIComponent(query)}&yearStart=${yearStart || ''}&yearEnd=${yearEnd || ''}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Proxy Search failed');
    const result = await response.json();
    if (result.status === 'success') {
      return result.data || [];
    } else {
      console.warn("Book Search Proxy Warning:", result.message);
      return [];
    }
  } catch (error) {
    console.error("Search books exception:", error);
    return [];
  }
};

// --- ARCHIVED ARTICLES (SUPABASE) ---

export const fetchArchivedArticlesPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ArchivedArticleItem[], totalCount: number }> => {
  return await fetchArchivedArticlesPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
};

export const archiveArticle = async (article: LiteratureArticle, label: string): Promise<boolean> => {
  try {
    const authorList = article.authors?.map(a => a.name).join(', ') || 'Anonymous';
    const citation = `${authorList} (${article.year || 'n.d.'}). '${article.title}'. ${article.venue || 'Global Database'}.`;

    const archivedItem: ArchivedArticleItem = {
      id: crypto.randomUUID(),
      title: article.title,
      citationHarvard: citation,
      doi: article.doi || '',
      url: article.url || '',
      info: article.abstract || '',
      label: label.toUpperCase(),
      isFavorite: false,
      createdAt: new Date().toISOString()
    };

    return await upsertArchivedArticleToSupabase(archivedItem);
  } catch (error) {
    return false;
  }
};

export const deleteArchivedArticle = async (id: string): Promise<boolean> => {
  return await deleteArchivedArticleFromSupabase(id);
};

export const toggleFavoriteArticle = async (id: string, status: boolean): Promise<boolean> => {
  return await upsertArchivedArticleToSupabase({ id, isFavorite: status });
};

// --- ARCHIVED BOOKS (SUPABASE) ---

export const fetchArchivedBooksPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ArchivedBookItem[], totalCount: number }> => {
  return await fetchArchivedBooksPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
};

export const archiveBook = async (book: LiteratureArticle, label: string): Promise<boolean> => {
  try {
    const authorList = book.authors?.map(a => a.name).join(', ') || 'Anonymous';
    const citation = `${authorList} (${book.year || 'n.d.'}). '${book.title}'. ${book.venue || 'Global Publisher'}.`;

    const archivedItem: ArchivedBookItem = {
      id: crypto.randomUUID(),
      title: book.title,
      citationHarvard: citation,
      isbn: book.isbn || '',
      url: book.url || '',
      info: book.abstract || '',
      label: label.toUpperCase(),
      isFavorite: false,
      createdAt: new Date().toISOString()
    };

    return await upsertArchivedBookToSupabase(archivedItem);
  } catch (error) {
    return false;
  }
};

export const deleteArchivedBook = async (id: string): Promise<boolean> => {
  return await deleteArchivedBookFromSupabase(id);
};

export const toggleFavoriteBook = async (id: string, status: boolean): Promise<boolean> => {
  return await upsertArchivedBookToSupabase({ id, isFavorite: status });
};