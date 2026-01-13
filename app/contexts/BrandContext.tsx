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

const STORAGE_KEY = "mapable-icon-style";

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

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}

export function useBrandSafe() {
  const context = useContext(BrandContext);
  return (
    context ?? {
      iconStyle: "organic" as IconStyle,
      setIconStyle: () => {},
      toggleIconStyle: () => {},
    }
  );
}
