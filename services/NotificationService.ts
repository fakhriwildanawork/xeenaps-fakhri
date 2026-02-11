
import { SharboxItem, TracerTodo } from '../types';
import { fetchAllPendingTodosFromSupabase } from './TracerSupabaseService';
import { fetchInboxFromSupabase } from './SharboxSupabaseService';

export interface NotificationData {
  sharbox: SharboxItem[];
  todos: TracerTodo[];
}

export const fetchNotifications = async (): Promise<NotificationData> => {
  let sharboxData: SharboxItem[] = [];
  let todosData: TracerTodo[] = [];

  // 1. Fetch Sharbox from Supabase (REPLACING GAS SOURCE)
  try {
    const allInbox = await fetchInboxFromSupabase();
    // Filter only unread items for notification
    sharboxData = allInbox.filter(item => !item.isRead);
  } catch (error) {
    console.error("Failed to fetch Supabase inbox notifications:", error);
  }

  // 2. Fetch Todos from Supabase
  try {
    const allPending = await fetchAllPendingTodosFromSupabase();
    
    // Filter Logic: Overdue, Today, or Next 3 Days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + 3); // Threshold: 3 days from now

    todosData = allPending.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      // Include if deadline is past (overdue), today, or within 3 days
      return d <= limitDate;
    });
  } catch (error) {
    console.error("Failed to fetch Supabase todos:", error);
  }

  return { sharbox: sharboxData, todos: todosData };
};

export const getUrgencyColor = (todo: TracerTodo): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(todo.deadline);
  
  if (today > deadline) return 'text-red-500'; // Overdue
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'text-orange-500'; // Today
  if (diffDays <= 3) return 'text-yellow-600'; // Urgent
  return 'text-[#004A74]';
};

export const getUrgencyLabel = (todo: TracerTodo): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(todo.deadline);
  
  if (today > deadline) return 'Overdue';
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Due Today';
  if (diffDays <= 3) return `${diffDays} days left`;
  return '';
};
