import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Agency {
  id: number;
  name: string;
  slug: string;
  logoBase64?: string;
  plan?: string;
  isActive?: boolean;
  settings?: any;
}

interface AgencyContextType {
  currentAgency: Agency | null;
  agencies: Agency[];
  setCurrentAgency: (agency: Agency) => void;
  loading: boolean;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

function getCurrentUserId(): number {
  try {
    const session = JSON.parse(sessionStorage.getItem('session') || '{}');
    return session.userId || session.id || 0;
  } catch {
    return 0;
  }
}

export function AgencyProvider({ children }: { children: ReactNode }) {
  const [currentAgency, setCurrentAgencyState] = useState<Agency | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // در حالت فعلی API-based، از endpoint آژانس‌ها استفاده می‌کنیم
        // یا از localStorage برای تک‌آژانسی
        const savedId = localStorage.getItem('currentAgencyId');
        
        // Fallback برای حالت تک‌آژانسی تا زمان آماده شدن کامل API
        const defaultAgency: Agency = {
          id: Number(savedId) || 1,
          name: 'آژانس پیش‌فرض',
          slug: 'default',
          plan: 'pro',
          isActive: true,
        };

        setAgencies([defaultAgency]);
        setCurrentAgencyState(defaultAgency);
        
        if (!savedId) {
          localStorage.setItem('currentAgencyId', '1');
        }
      } catch (err) {
        console.error('Failed to load agencies', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const setCurrentAgency = (agency: Agency) => {
    setCurrentAgencyState(agency);
    localStorage.setItem('currentAgencyId', String(agency.id));
  };

  return (
    <AgencyContext.Provider value={{ currentAgency, agencies, setCurrentAgency, loading }}>
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  const ctx = useContext(AgencyContext);
  if (!ctx) {
    throw new Error('useAgency must be used within AgencyProvider');
  }
  return ctx;
}
