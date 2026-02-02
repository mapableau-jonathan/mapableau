"use client";

import { CheckCircle2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WorkerCardProps {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  verifications: {
    hasIdentity: boolean;
    hasVEVO: boolean;
    hasWWCC: boolean;
    hasNDIS: boolean;
    hasFirstAid: boolean;
  };
}

export function WorkerCard({
  id,
  name,
  email,
  image,
  role,
  verifications,
}: WorkerCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const verificationCount =
    (verifications.hasIdentity ? 1 : 0) +
    (verifications.hasVEVO ? 1 : 0) +
    (verifications.hasWWCC ? 1 : 0) +
    (verifications.hasNDIS ? 1 : 0) +
    (verifications.hasFirstAid ? 1 : 0);

  return (
    <Card variant="interactive" className="h-full">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={image || undefined} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{name}</h3>
            {role && (
              <p className="text-sm text-muted-foreground mt-1">{role}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {verificationCount} Verified
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate">{email}</span>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Verifications:
            </p>
            <div className="flex flex-wrap gap-2">
              {verifications.hasIdentity && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-light" />
                  Identity
                </Badge>
              )}
              {verifications.hasVEVO && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-light" />
                  Work Rights
                </Badge>
              )}
              {verifications.hasWWCC && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-light" />
                  WWCC
                </Badge>
              )}
              {verifications.hasNDIS && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-light" />
                  NDIS
                </Badge>
              )}
              {verifications.hasFirstAid && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-light" />
                  First Aid
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
