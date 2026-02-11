import { SharboxItem, LibraryItem, GASResponse, ColleagueItem, SharboxStatus } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchInboxFromSupabase, 
  fetchSentFromSupabase, 
  upsertInboxItemToSupabase, 
  upsertSentItemToSupabase, 
  deleteInboxItemFromSupabase, 
  deleteSentItemFromSupabase 
} from './SharboxSupabaseService';
import { upsertLibraryItemToSupabase } from './LibrarySupabaseService';
import { fetchProfileFromSupabase } from './ProfileSupabaseService';

/**
 * XEENAPS SHARBOX SERVICE (HYBRID ARCHITECTURE)
 * - Inbox: Reads from Supabase. Background syncs from GAS Sheet.
 * - Sent: Writes to Supabase (History) + GAS (Transport). Reads from Supabase.
 */

export const initializeSharboxDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    // This still initializes the Google Sheet Inbox which acts as the physical mailbox
    const response = await fetch(GAS_WEB_APP_URL!, {
      method: 'POST',
      body: JSON.stringify({ action: 'setupSharboxDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

export const fetchSharboxItems = async (type: 'Inbox' | 'Sent'): Promise<SharboxItem[]> => {
  // Direct call to Supabase Registry
  if (type === 'Inbox') {
    return await fetchInboxFromSupabase();
  } else {
    return await fetchSentFromSupabase();
  }
};

/**
 * SYNC ENGINE: Fetches buffer from GAS -> Saves to Supabase -> Clears GAS buffer.
 * Should be called periodically or on app load.
 */
export const syncInboxBackground = async (): Promise<void> => {
  if (!GAS_WEB_APP_URL) return;

  try {
    // 1. Fetch Buffer from GAS
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getInboxBuffer`);
    const json = await res.json();
    
    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      const bufferItems: SharboxItem[] = json.data;
      const syncedIds: string[] = [];

      // 2. Persist to Supabase
      for (const item of bufferItems) {
        const success = await upsertInboxItemToSupabase(item);
        if (success) {
          syncedIds.push(item.id);
        }
      }

      // 3. Clear successfully synced items from GAS Buffer
      if (syncedIds.length > 0) {
        await fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'clearInboxBuffer', 
            ids: syncedIds 
          })
        });
        
        // Trigger UI refresh
        window.dispatchEvent(new CustomEvent('xeenaps-notif-refresh'));
      }
    }
  } catch (e) {
    console.error("Inbox Sync Failed:", e);
  }
};

export const shareToColleague = async (
  targetUniqueAppId: string, 
  receiverName: string, 
  receiverPhotoUrl: string,
  message: string,
  item: LibraryItem,
  receiverContacts?: { email?: string, phone?: string, socialMedia?: string }
): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  
  const timestamp = new Date().toISOString();
  const transactionId = crypto.randomUUID();

  try {
    // CORRECTION: Fetch Sender Profile from Supabase to ensure accurate identity
    const senderProfile = await fetchProfileFromSupabase();

    // 1. Transport via GAS (To Receiver's Sheet)
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'sendToSharbox', 
        targetUniqueAppId, 
        receiverName, 
        receiverPhotoUrl,
        message,
        item, // GAS Script needs full item to write to Receiver's Inbox
        receiverContacts,
        senderProfile // Pass Supabase profile data to GAS
      })
    });
    const result = await res.json();

    if (result.status === 'success') {
      
      // 2. Save to Local Supabase History (Sent Box)
      // FIX: Explicitly construct the Sent Item to avoid any prototype pollution 
      // or stray properties from the source item (like senderName from Inbox items)
      
      const sentItem: SharboxItem = {
        // Identity
        id: transactionId,
        receiverName,
        receiverPhotoUrl,
        receiverUniqueAppId: targetUniqueAppId,
        receiverEmail: receiverContacts?.email,
        receiverPhone: receiverContacts?.phone,
        receiverSocialMedia: receiverContacts?.socialMedia,
        message,
        timestamp,
        status: SharboxStatus.SENT,
        
        // Content Reference
        id_item: item.id,
        title: item.title,
        type: item.type,
        category: item.category,
        topic: item.topic,
        subTopic: item.subTopic,
        authors: item.authors,
        publisher: item.publisher,
        year: item.year,
        fullDate: item.fullDate,
        pubInfo: item.pubInfo,
        identifiers: item.identifiers,
        source: item.source,
        format: item.format,
        url: item.url,
        fileId: item.fileId,
        imageView: item.imageView,
        youtubeId: item.youtubeId,
        tags: item.tags,
        abstract: item.abstract,
        mainInfo: item.mainInfo,
        extractedJsonId: item.extractedJsonId,
        insightJsonId: item.insightJsonId,
        storageNodeUrl: item.storageNodeUrl,
        supportingReferences: item.supportingReferences,
        
        // Added missing properties from LibraryItem
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        
        // Forced Cleanup (Just in case)
        isRead: undefined as any,
        senderName: undefined as any
      };

      await upsertSentItemToSupabase(sentItem);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const claimSharboxItem = async (transactionId: string): Promise<boolean> => {
  try {
    const inbox = await fetchInboxFromSupabase();
    const itemToClaim = inbox.find(i => i.id === transactionId);
    
    if (!itemToClaim) return false;
    if (itemToClaim.status === SharboxStatus.CLAIMED) return false;

    // 2. Construct Library Item
    // Explicitly destructure to ensure we only get LibraryItem props
    const { 
      id, senderName, senderPhotoUrl, senderAffiliation, senderUniqueAppId, 
      senderEmail, senderPhone, senderSocialMedia, receiverName, message, 
      timestamp, status, isRead, id_item, 
      ...rawLibraryData 
    } = itemToClaim as any;

    const libraryItem: LibraryItem = {
      ...rawLibraryData,
      id: itemToClaim.id_item || crypto.randomUUID(),
      // Force clean ownership
      isFavorite: false,
      isBookmarked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 3. Save to Local Library (Supabase)
    const success = await upsertLibraryItemToSupabase(libraryItem);

    if (success) {
      // 4. Update Status in Sharbox Inbox (Supabase)
      const updatedSharboxItem = { ...itemToClaim, status: SharboxStatus.CLAIMED };
      await upsertInboxItemToSupabase(updatedSharboxItem);
      
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const markSharboxItemAsRead = async (id: string): Promise<boolean> => {
  try {
    const inbox = await fetchInboxFromSupabase();
    const item = inbox.find(i => i.id === id);
    if (item) {
       await upsertInboxItemToSupabase({ ...item, isRead: true });
       return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const deleteSharboxItem = async (id: string, type: 'Inbox' | 'Sent'): Promise<boolean> => {
  if (type === 'Inbox') {
    return await deleteInboxItemFromSupabase(id);
  } else {
    return await deleteSentItemFromSupabase(id);
  }
};