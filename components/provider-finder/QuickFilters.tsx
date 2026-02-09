"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickFiltersProps = {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  maxVisible?: number;
};

export function QuickFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  maxVisible = 5,
}: QuickFiltersProps) {
  const visible = categories.slice(0, maxVisible);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Quick filters:
      </span>
      {visible.map((cat) => (
        <Button
          key={cat}
          variant={selectedCategory === cat ? "default" : "outline"}
          size="sm"
          onClick={() =>
            onCategoryChange(selectedCategory === cat ? "all" : cat)
          }
          type="button"
          className={cn(
            "h-8 text-xs",
            selectedCategory === cat &&
              "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
          )}
        >
          {cat}
        </Button>
      ))}
    </div>
  );
}
