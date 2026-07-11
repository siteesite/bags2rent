import { useEffect } from 'react';

declare global {
  interface Window {
    __APP_VERSION__: string;
  }
}

const VersionCheck = () => {
  useEffect(() => {
    const checkVersion = async () => {
      if (process.env.NODE_ENV === 'development') return;

      try {
        // Fetch version.json from the server with a cache-busting query param
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await response.json();
        
        // __APP_VERSION__ is injected by Vite at build time
        // data.version is generated in public/version.json at build time
        const currentVersion = (window as any).__APP_VERSION__ || '';
        const serverVersion = data.version;

        if (serverVersion && currentVersion && serverVersion !== currentVersion) {
          console.log('New version detected. Clearing cache and reloading...');
          
          // Clear service worker caches if they exist
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // Unregister service workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(r => r.unregister()));
          }

          // Force reload from server
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    };

    // Check on mount and then every 30 minutes
    checkVersion();
    const interval = setInterval(checkVersion, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default VersionCheck;
