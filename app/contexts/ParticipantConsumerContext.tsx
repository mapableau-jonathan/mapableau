"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ParticipantProfileData } from "@/components/participant-profile";
import { API_ROUTES } from "@/lib/routes";
import { parseResponseJson } from "@/lib/utils";

const STORAGE_KEY = "participant-emulation";

export type SyntheticParticipant = {
  displayName?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  preferredCategories?: string[];
  accessibilityNeeds?: string | null;
};

type EmulationStorage =
  | { mode: "slug"; slug: string }
  | { mode: "synthetic"; synthetic: SyntheticParticipant };

function readEmulation(): EmulationStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmulationStorage;
    if (parsed.mode === "slug" && typeof parsed.slug === "string") return parsed;
    if (
      parsed.mode === "synthetic" &&
      parsed.synthetic &&
      typeof parsed.synthetic === "object"
    )
      return parsed;
    return null;
  } catch {
    return null;
  }
}

function toParticipantFromApi(body: {
  id: string;
  slug: string | null;
  displayName?: string | null;
  visibility?: string;
  accessibilityNeeds?: string | null;
  preferredCategories?: string[];
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  savedProviders?: { id: string; slug: string; name: string }[];
}): ParticipantProfileData {
  return {
    id: body.id,
    slug: body.slug ?? null,
    displayName: body.displayName ?? null,
    visibility: (body.visibility as "private" | "public") ?? "public",
    accessibilityNeeds: body.accessibilityNeeds ?? null,
    preferredCategories: Array.isArray(body.preferredCategories)
      ? body.preferredCategories
      : [],
    suburb: body.suburb ?? null,
    state: body.state ?? null,
    postcode: body.postcode ?? null,
    savedProviderIds: Array.isArray(body.savedProviders)
      ? body.savedProviders.map((p) => p.id)
      : [],
  };
}

function toParticipantFromSynthetic(synthetic: SyntheticParticipant): ParticipantProfileData {
  return {
    id: "synthetic",
    slug: null,
    displayName: synthetic.displayName ?? null,
    visibility: "public",
    accessibilityNeeds: synthetic.accessibilityNeeds ?? null,
    preferredCategories: Array.isArray(synthetic.preferredCategories)
      ? synthetic.preferredCategories
      : [],
    suburb: synthetic.suburb ?? null,
    state: synthetic.state ?? null,
    postcode: synthetic.postcode ?? null,
    savedProviderIds: [],
  };
}

type ParticipantConsumerContextValue = {
  participant: ParticipantProfileData | null;
  isEmulated: boolean;
  isLoading: boolean;
  setEmulationBySlug: (slug: string) => void;
  setEmulationSynthetic: (data: SyntheticParticipant) => void;
  clearEmulation: () => void;
};

const ParticipantConsumerContext = createContext<ParticipantConsumerContextValue | null>(null);

export function useParticipantConsumer() {
  const ctx = useContext(ParticipantConsumerContext);
  if (!ctx) {
    throw new Error("useParticipantConsumer must be used within ParticipantConsumerProvider");
  }
  return ctx;
}

export function ParticipantConsumerProvider({ children }: { children: ReactNode }) {
  const [participant, setParticipant] = useState<ParticipantProfileData | null>(null);
  const [isEmulated, setIsEmulated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromStorage = useCallback(async () => {
    const emulation = readEmulation();
    if (!emulation) {
      setParticipant(null);
      setIsEmulated(false);
      setIsLoading(false);
      return;
    }
    setIsEmulated(true);
    if (emulation.mode === "synthetic") {
      setParticipant(toParticipantFromSynthetic(emulation.synthetic));
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(API_ROUTES.participants.bySlug(emulation.slug));
      if (!res.ok) {
        sessionStorage.removeItem(STORAGE_KEY);
        setParticipant(null);
        setIsEmulated(false);
        setIsLoading(false);
        return;
      }
      const body = await parseResponseJson(res);
      if (body) setParticipant(toParticipantFromApi(body));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      setParticipant(null);
      setIsEmulated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const setEmulationBySlug = useCallback((slug: string) => {
    const payload: EmulationStorage = { mode: "slug", slug: slug.trim() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setIsEmulated(true);
    setIsLoading(true);
    loadFromStorage();
  }, [loadFromStorage]);

  const setEmulationSynthetic = useCallback((data: SyntheticParticipant) => {
    const payload: EmulationStorage = { mode: "synthetic", synthetic: data };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setParticipant(toParticipantFromSynthetic(data));
    setIsEmulated(true);
    setIsLoading(false);
  }, []);

  const clearEmulation = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setParticipant(null);
    setIsEmulated(false);
  }, []);

  const value = useMemo<ParticipantConsumerContextValue>(
    () => ({
      participant,
      isEmulated,
      isLoading,
      setEmulationBySlug,
      setEmulationSynthetic,
      clearEmulation,
    }),
    [
      participant,
      isEmulated,
      isLoading,
      setEmulationBySlug,
      setEmulationSynthetic,
      clearEmulation,
    ],
  );

  return (
    <ParticipantConsumerContext.Provider value={value}>
      {children}
    </ParticipantConsumerContext.Provider>
  );
}
