
import React, { useEffect } from 'react';
// @ts-ignore - Virtual module from vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Silent Updater Component
 * Invisible component that handles Service Worker lifecycle.
 * It forces the app to update immediately when a new version is detected,
 * solving the "stale data on refresh" issue.
 */
const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      if (r) {
        // FORCE CHECK: Immediately check for update on load/refresh
        r.update();
        // Check for updates every hour to keep long-running tabs fresh
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    // If a new SW is waiting (needRefresh), force update immediately
    // This triggers the page reload automatically due to 'autoUpdate' + clientsClaim
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  // No UI rendered
  return null;
};

export default ReloadPrompt;