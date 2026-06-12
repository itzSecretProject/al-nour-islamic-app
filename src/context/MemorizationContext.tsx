import React, { createContext, useContext, useCallback, useState } from 'react';

const STORAGE_KEY = 'memorized_duas_v1';

interface MemorizationContextType {
  memorized: Set<string>;
  isMemorized: (id: string) => boolean;
  toggle: (id: string) => void;
  setMemorized: (id: string, value: boolean) => void;
  count: number;
}

const MemorizationContext = createContext<MemorizationContextType | null>(null);

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export const MemorizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memorized, setMem] = useState<Set<string>>(load);

  const setMemorized = useCallback(
    (id: string, value: boolean) => {
      setMem((prev) => {
        const next = new Set(prev);
        if (value) next.add(id);
        else next.delete(id);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        } catch {}
        return next;
      });
    },
    []
  );

  const toggle = useCallback(
    (id: string) => {
      setMem((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        } catch {}
        return next;
      });
    },
    []
  );

  return (
    <MemorizationContext.Provider
      value={{
        memorized,
        isMemorized: (id) => memorized.has(id),
        toggle,
        setMemorized,
        count: memorized.size,
      }}
    >
      {children}
    </MemorizationContext.Provider>
  );
};

export const useMemorization = () => {
  const ctx = useContext(MemorizationContext);
  if (!ctx) throw new Error('useMemorization must be used within MemorizationProvider');
  return ctx;
};
