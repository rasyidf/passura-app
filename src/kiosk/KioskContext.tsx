import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface KioskContextValue {
  isActive: boolean;
  enter: () => void;
  exit: () => void;
}

const KioskContext = createContext<KioskContextValue | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);

  const enter = useCallback(() => setIsActive(true), []);
  const exit = useCallback(() => setIsActive(false), []);

  return (
    <KioskContext.Provider value={{ isActive, enter, exit }}>
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk(): KioskContextValue {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error("useKiosk must be used within KioskProvider");
  return ctx;
}
