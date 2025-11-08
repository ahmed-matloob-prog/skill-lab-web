import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

interface VersionInfo {
  version: string;
  timestamp: number;
  buildDate: string;
}

export const useVersionCheck = (checkIntervalMs: number = 300000) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      // Fetch version.json with cache-busting timestamp
      const response = await fetch(`/version.json?t=${Date.now()}`);

      if (!response.ok) {
        logger.warn('Failed to fetch version info');
        return;
      }

      const versionInfo: VersionInfo = await response.json();
      const storedVersion = localStorage.getItem('appVersion');

      // First time - store current version
      if (!storedVersion) {
        localStorage.setItem('appVersion', versionInfo.version);
        setCurrentVersion(versionInfo.version);
        logger.log(`App version initialized: ${versionInfo.version}`);
        return;
      }

      // Check if version changed
      if (versionInfo.version !== storedVersion) {
        logger.log(`New version available: ${versionInfo.version} (current: ${storedVersion})`);
        setUpdateAvailable(true);
      }

      setCurrentVersion(versionInfo.version);
    } catch (error) {
      logger.warn('Error checking version:', error);
    }
  }, []);

  const applyUpdate = useCallback(() => {
    // Update stored version
    if (currentVersion) {
      localStorage.setItem('appVersion', currentVersion);
    }

    // Hard reload to bypass cache
    window.location.reload();
  }, [currentVersion]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);

    // Update stored version so we don't keep showing banner
    if (currentVersion) {
      localStorage.setItem('appVersion', currentVersion);
    }
  }, [currentVersion]);

  useEffect(() => {
    // Check version on mount
    checkVersion();

    // Check periodically (default: every 5 minutes)
    const interval = setInterval(checkVersion, checkIntervalMs);

    // Check when window regains focus (user returns to tab)
    const handleFocus = () => checkVersion();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkVersion, checkIntervalMs]);

  return {
    updateAvailable,
    currentVersion,
    applyUpdate,
    dismissUpdate
  };
};
