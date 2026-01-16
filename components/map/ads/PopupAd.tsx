"use client";

import { X } from "lucide-react";
import type { AdData } from "../MapWithAds";

interface PopupAdProps {
  ad: AdData;
  onClose: () => void;
  onClick: () => void;
}

export function PopupAd({ ad, onClose, onClick }: PopupAdProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 hover:bg-muted rounded transition-colors z-10"
          aria-label="Close ad"
        >
          <X className="w-5 h-5" />
        </button>

        {ad.imageUrl && (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-full h-48 object-cover cursor-pointer"
            onClick={onClick}
          />
        )}

        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">{ad.title}</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Sponsored
            </span>
          </div>

          {ad.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {ad.description}
            </p>
          )}

          {ad.callToAction && (
            <button
              onClick={onClick}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {ad.callToAction}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
