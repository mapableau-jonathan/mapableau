"use client";

import {
  ArrowRight,
  Bus,
  Briefcase,
  Check,
  Heart,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { FloatingAuthPanel, type AuthPanelMode } from "@/components/FloatingAuthPanel";
import Footer from "@/components/footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { buildPath } from "@/lib/router";

const QUICK_ACTIONS = [
  { title: "Find Care Provider", href: "providerFinder" as const, icon: Stethoscope },
  { title: "Book Transport", href: "transport" as const, icon: Bus },
  { title: "Jobs", href: "employment" as const, icon: Briefcase },
] as const;

const STEPS = [
  { step: 1, title: "Get started", desc: "Sign up and set your preferences.", icon: MapPin },
  { step: 2, title: "Search", desc: "Find care, transport or providers by location.", icon: MapPin },
  { step: 3, title: "Choose", desc: "Pick the service that fits your access needs.", icon: Heart },
  { step: 4, title: "Connect", desc: "Book and connect with dignity.", icon: ShieldCheck },
] as const;

const TRUST = [
  { icon: ShieldCheck, label: "Accessible" },
  { icon: Heart, label: "NDIS-aligned" },
  { icon: MapPin, label: "Australian-focused" },
] as const;

/** Mockup landing: benefit checkmarks (NDIS verified, transport, arrange independently) */
const HERO_BENEFITS = [
  { label: "NDIS Worker Screening verified", icon: Check },
  { label: "Transport-capable support workers", icon: Check },
  { label: "Arrange services independently", icon: Check },
] as const;

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authPanelMode, setAuthPanelMode] = useState<AuthPanelMode>("login");
  const [heroLocation, setHeroLocation] = useState("");

  const openLogin = () => {
    setAuthPanelMode("login");
    setAuthPanelOpen(true);
  };
  const openRegister = () => {
    setAuthPanelMode("register");
    setAuthPanelOpen(true);
  };

  const handleHeroSearch = () => {
    const base = buildPath("providerFinder", {});
    const q = heroLocation.trim();
    const params = q ? (/\d+/.test(q) ? `?postcode=${encodeURIComponent(q)}` : `?suburb=${encodeURIComponent(q)}`) : "";
    router.push(base + params);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="page-home">
      <SiteHeader variant="topLite" onOpenLogin={openLogin} onOpenRegister={openRegister} />
      <FloatingAuthPanel
        open={authPanelOpen}
        mode={authPanelMode}
        onClose={() => setAuthPanelOpen(false)}
        onSwitchMode={setAuthPanelMode}
      />

      {/* Hero – mockup-aligned: NDIS headline, hero search, benefits, View Workers */}
      <section className="section hero-bg flex-1" aria-labelledby="hero-title">
        <div className="content-narrow text-center">
          <Badge
            variant="outline"
            className="mb-5 border-primary/25 bg-primary/5 text-primary font-medium px-4 py-1"
            data-testid="badge-tagline"
          >
            {APP_TAGLINE}
          </Badge>
          <h1
            id="hero-title"
            className="text-hero font-heading font-bold text-foreground leading-tight mb-4"
            data-testid="text-hero-title"
          >
            {APP_NAME === "MapAble" ? (
              "Find verified NDIS transport support workers"
            ) : (
              <>
                Reading with <span className="text-primary">Dignity</span> &{" "}
                <span className="text-secondary">Equality</span>
              </>
            )}
          </h1>
          <p className="text-lead text-muted-foreground mb-6 max-w-lg mx-auto" data-testid="text-hero-description">
            {APP_NAME === "MapAble"
              ? "Search by suburb or postcode to find transport-capable support workers near you."
              : "Audiobooks, braille, large print and ebooks—so everyone can enjoy literature."}
          </p>

          {/* Hero search (mockup): suburb/postcode + Search */}
          {APP_NAME === "MapAble" && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-md mx-auto mb-8">
              <input
                type="text"
                value={heroLocation}
                onChange={(e) => setHeroLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleHeroSearch()}
                placeholder="Search by suburb / postcode"
                className="flex-1 min-w-0 rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Search by suburb or postcode"
              />
              <Button
                type="button"
                size="lg"
                className="rounded-lg shrink-0"
                onClick={handleHeroSearch}
                data-testid="button-hero-search"
              >
                Search
              </Button>
            </div>
          )}

          {/* Benefit checkmarks (mockup) */}
          {APP_NAME === "MapAble" && (
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {HERO_BENEFITS.map((b) => (
                <span
                  key={b.label}
                  className="benefit-check px-4 py-2 text-sm"
                  data-testid={`hero-benefit-${b.label.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <b.icon className="h-5 w-5 text-secondary shrink-0" aria-hidden />
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* View Workers CTA (mockup) + quick actions */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <Link href={buildPath("providerFinder", {})}>
              <Button variant="default" size="lg" className="rounded-lg px-8 h-12" data-testid="button-view-workers">
                View Workers
              </Button>
            </Link>
            {!isAuthenticated && (
              <>
                <Button size="lg" variant="outline" className="rounded-lg h-12" onClick={openRegister} data-testid="button-get-started">
                  Get Started
                </Button>
                <Button size="lg" variant="outline" className="rounded-lg h-12" onClick={openLogin} data-testid="button-sign-in">
                  Sign in
                </Button>
              </>
            )}
          </div>

          {/* Quick actions – cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={buildPath(action.href, {})}
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
              >
                <Card variant="elevated" className="h-full transition-all duration-200 group-hover:border-primary/30 group-hover:shadow-glass-lg">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                      <action.icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="font-semibold text-foreground">{action.title}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={buildPath("dashboard", {})}>
                <Button variant="default" size="lg" className="rounded-lg px-8 h-12" data-testid="button-go-dashboard">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </Link>
            </div>
          )}
          <p className="mt-10 text-sm text-muted-foreground" data-testid="stats">
            <span data-testid="stat-users"><strong className="text-foreground">100+</strong> Providers</span>
            {" · "}
            <span data-testid="stat-providers"><strong className="text-foreground">Care</strong> & Transport</span>
            {" · "}
            <span data-testid="stat-bookings"><strong className="text-foreground">NDIS</strong> aligned</span>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="section border-t border-border bg-muted/30" aria-labelledby="how-it-works">
        <div className="content-width">
          <h2 id="how-it-works" className="text-display font-heading font-bold text-center mb-2" data-testid="text-how-it-works">
            How it works
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-12 max-w-lg mx-auto">
            Fair, dignified access—aligned with Australian disability community values.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center" data-testid={`step-${s.step}`}>
                <div className="relative inline-flex mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-7 w-7 text-primary" aria-hidden />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center" aria-hidden>
                    {s.step}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm">
            <Link href={buildPath("accessiview", {})} className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
              See the AccessiView 3D walk through
            </Link>
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <section className="section-tight bg-primary text-primary-foreground" aria-label="Our commitments">
        <div className="content-width flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {TRUST.map((b, i) => (
            <div key={i} className="flex items-center gap-3 text-primary-foreground/95 text-sm md:text-base" data-testid={`trust-badge-${i}`}>
              <b.icon className="h-5 w-5 shrink-0" aria-hidden />
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-background" aria-labelledby="cta-title">
        <div className="content-narrow text-center">
          <h2 id="cta-title" className="text-display font-heading font-bold mb-3" data-testid="text-cta-title">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Join {APP_NAME} for free. Find care, transport and providers that work for you.
          </p>
          {isAuthenticated ? (
            <Link href={buildPath("dashboard", {})}>
              <Button variant="outline" size="lg" className="rounded-lg" data-testid="button-cta-dashboard">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="default"
                size="lg"
                className="rounded-lg"
                data-testid="button-cta-signup"
                onClick={openRegister}
              >
                Get Started <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
              <Button variant="outline" size="lg" className="rounded-lg" onClick={openLogin}>
                Sign in
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* For Providers */}
      <section className="section-tight border-t border-border bg-muted/50">
        <div className="content-width flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div>
            <Badge variant="outline" className="mb-3 text-secondary border-secondary/25 bg-secondary/5">
              For Providers
            </Badge>
            <p className="text-sm text-muted-foreground max-w-xl">
              List your services, reach participants and support accessible care and transport.
            </p>
          </div>
          <Link href={buildPath("providerRegister", {})} className="shrink-0">
            <Button variant="secondary" size="default" className="rounded-lg" data-testid="button-provider-signup">
              Register as provider
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
