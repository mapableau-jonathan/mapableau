"use client";

import React, { useCallback, useState } from "react";
import { useBrand } from "@/app/contexts/BrandContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/brand";
import { getModules, type ServiceModule } from "@/lib/modules";
import { cn } from "@/lib/utils";

export function ServicesCarousel() {
  const { iconStyle } = useBrand();
  const [selected, setSelected] = useState<string | null>(null);
  const modules = getModules();

  const handleSelect = useCallback((id: string) => {
    setSelected((prev) => (prev === id ? null : id));
  }, []);

  if (modules.length === 0) {
    return (
      <section className="container mx-auto px-4 py-8" aria-label="Services">
        <h2 className="text-xl font-semibold text-foreground">Services</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No services configured. Add items to the carousel in lib/modules.
        </p>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-8" aria-label={`${APP_NAME} services`}>
      <h2 className="text-xl font-semibold text-foreground">Services</h2>
      <div
        className="mt-4 flex gap-4 overflow-x-auto pb-2"
        aria-label="Service cards"
      >
        {modules.map((mod) => (
          <Card
            key={mod.id}
            variant="interactive"
            className={cn(
              "min-w-[280px] shrink-0",
              selected === mod.id && "ring-2 ring-primary",
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{mod.title}</CardTitle>
                {mod.category && (
                  <Badge variant="secondary" className="shrink-0">
                    {mod.category}
                  </Badge>
                )}
              </div>
            </CardHeader>
            {mod.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{mod.description}</p>
                {mod.href && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => handleSelect(mod.id)}
                    asChild
                  >
                    <a href={mod.href}>View</a>
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
