'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ConnectedSnapshot } from '@/lib/connected-portfolio';

type SessionValue = { snapshot: ConnectedSnapshot | null; setSnapshot: (snapshot: ConnectedSnapshot) => void; clearSnapshot: () => void };
const PortfolioSessionContext = createContext<SessionValue | null>(null);

export function PortfolioSessionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setCurrent] = useState<ConnectedSnapshot | null>(null);
  const value = useMemo(() => ({ snapshot, setSnapshot: setCurrent, clearSnapshot: () => setCurrent(null) }), [snapshot]);
  return <PortfolioSessionContext.Provider value={value}>{children}</PortfolioSessionContext.Provider>;
}

export function usePortfolioSession() {
  const value = useContext(PortfolioSessionContext);
  if (!value) throw new Error('Portfolio session provider is missing.');
  return value;
}
