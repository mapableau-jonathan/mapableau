"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type IconStyle = "organic" | "3d";

interface BrandContextType {
  iconStyle: IconStyle;
  setIconStyle: (style: IconStyle) => void;
  toggleIconStyle: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function useBrand(): BrandContextType {
  const ctx = useContext(BrandContext);
  if (ctx === undefined) {
    throw new Error("useBrand must be used within BrandProvider");
  }
  return ctx;
}

const STORAGE_KEY = "accessibooks-icon-style";

export function BrandProvider({ children }: { children: ReactNode }) {
  const [iconStyle, setIconStyleState] = useState<IconStyle>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored === "3d" ? "3d" : "organic") as IconStyle;
    }
    return "organic";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, iconStyle);
  }, [iconStyle]);

  const setIconStyle = (style: IconStyle) => {
    setIconStyleState(style);
  };

  const toggleIconStyle = () => {
    setIconStyleState((prev) => (prev === "organic" ? "3d" : "organic"));
  };

  return (
    <BrandContext.Provider value={{ iconStyle, setIconStyle, toggleIconStyle }}>
      {children}
    </BrandContext.Provider>
  );
}
