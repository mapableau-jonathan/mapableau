import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Mockup } from "./Mockup";

type ShowcasePanelProps = {
  audienceLabel: string;
  title: string;
  description?: string;
  imageSrc?: string;
  imageAlt: string;
  priority?: boolean;
};

export function ShowcasePanel({
  audienceLabel,
  title,
  description,
  imageSrc,
  imageAlt,
  priority,
}: ShowcasePanelProps) {
  return (
    <Card variant="gradient" className="h-full">
      <CardHeader className="space-y-2">
        <Badge
          variant="outline"
          className="w-fit border-primary/20 bg-primary/5 text-primary"
        >
          {audienceLabel}
        </Badge>
        <div className="space-y-1">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-sm">{description}</CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <Mockup src={imageSrc} alt={imageAlt} priority={priority} />
      </CardContent>
    </Card>
  );
}

