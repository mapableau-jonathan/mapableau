"use client";

import { RotateCw, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

interface Map3DControlsProps {
  onTiltChange?: (tilt: number) => void;
  onHeadingChange?: (heading: number) => void;
  onReset?: () => void;
  currentTilt?: number;
  currentHeading?: number;
  className?: string;
}

export function Map3DControls({
  onTiltChange,
  onHeadingChange,
  onReset,
  currentTilt = 0,
  currentHeading = 0,
  className = "",
}: Map3DControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTiltChange = (delta: number) => {
    const newTilt = Math.max(0, Math.min(45, currentTilt + delta));
    onTiltChange?.(newTilt);
  };

  const handleHeadingChange = (delta: number) => {
    const newHeading = (currentHeading + delta) % 360;
    onHeadingChange?.(newHeading >= 0 ? newHeading : newHeading + 360);
  };

  return (
    <div
      className={`absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg border border-border ${className}`}
    >
      <div className="p-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-muted rounded transition-colors"
          aria-label={isExpanded ? "Collapse 3D controls" : "Expand 3D controls"}
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 border-t border-border space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Tilt: {currentTilt}°
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTiltChange(-5)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                aria-label="Decrease tilt"
                disabled={currentTilt <= 0}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0"
                max="45"
                value={currentTilt}
                onChange={(e) => onTiltChange?.(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <button
                onClick={() => handleTiltChange(5)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                aria-label="Increase tilt"
                disabled={currentTilt >= 45}
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Rotation: {currentHeading}°
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleHeadingChange(-15)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                aria-label="Rotate left"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0"
                max="360"
                value={currentHeading}
                onChange={(e) =>
                  onHeadingChange?.(parseInt(e.target.value, 10))
                }
                className="flex-1"
              />
              <button
                onClick={() => handleHeadingChange(15)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                aria-label="Rotate right"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {onReset && (
            <button
              onClick={onReset}
              className="w-full px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
            >
              Reset View
            </button>
          )}
        </div>
      )}
    </div>
  );
}
