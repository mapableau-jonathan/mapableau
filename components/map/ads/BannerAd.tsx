"use client";

import { X } from "lucide-react";
import type { AdData } from "../MapWithAds";

interface BannerAdProps {
  ad: AdData;
  position: "top" | "bottom";
  onClose: () => void;
}

export function BannerAd({ ad, position, onClose }: BannerAdProps) {
  const handleClick = () => {
    if (ad.tracking.clickUrl) {
      window.open(ad.tracking.clickUrl, "_blank");
    } else if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank");
    }
  };

  return (
    <div
      className={`absolute left-0 right-0 ${position === "top" ? "top-0" : "bottom-0"} z-50 bg-white border-b border-border shadow-lg`}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-4">
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="h-12 w-auto object-contain cursor-pointer"
              onClick={handleClick}
            />
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{ad.title}</h4>
            {ad.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {ad.description}
              </p>
            )}
          </div>
          {ad.callToAction && (
            <button
              onClick={handleClick}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {ad.callToAction}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Close ad"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
