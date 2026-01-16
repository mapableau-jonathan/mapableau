"use client";

import { CheckCircle2 } from "lucide-react";
import type { AdData } from "../MapWithAds";

interface SearchAdProps {
  ad: AdData;
  onClick: () => void;
}

export function SearchAd({ ad, onClick }: SearchAdProps) {
  return (
    <div
      className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {ad.business.logoUrl && (
          <img
            src={ad.business.logoUrl}
            alt={ad.business.name}
            className="w-12 h-12 rounded object-cover"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm">{ad.title}</h4>
            {ad.business.verified && (
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
            )}
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
              Sponsored
            </span>
          </div>
          <p className="text-xs text-muted-foreground capitalize mb-1">
            {ad.business.category.replace("_", " ").toLowerCase()}
          </p>
          {ad.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {ad.description}
            </p>
          )}
          {ad.callToAction && (
            <span className="inline-block mt-2 text-xs text-blue-600 hover:underline">
              {ad.callToAction} →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
