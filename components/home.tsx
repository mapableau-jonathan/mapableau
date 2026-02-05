"use client";

import {
  ArrowRight,
  Award,
  BookOpen,
  Headphones,
  Library,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import Footer from "@/components/footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { buildPath } from "@/lib/router";

const STEPS = [
  { step: 1, title: "Join free", desc: "Sign up and set your preferred format.", icon: Library },
  { step: 2, title: "Browse", desc: "Discover titles in accessible formats.", icon: BookOpen },
  { step: 3, title: "Choose format", desc: "Audio, braille, large print or ebook.", icon: Headphones },
  { step: 4, title: "Read & listen", desc: "Borrow and enjoy.", icon: BookOpen },
] as const;

const TRUST = [
  { icon: ShieldCheck, label: "Accessible formats" },
  { icon: Award, label: "WCAG 2.1 AA" },
  { icon: BookOpen, label: "Australian-focused" },
] as const;

export default function Home() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;
  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-background" data-testid="page-home">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="content-width flex flex-wrap items-center justify-between gap-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-bold text-primary hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            aria-label={`${APP_NAME} home`}
          >
            <Image
              src={`/${LOGO_PATH}`}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              unoptimized
            />
            <span>{APP_NAME}</span>
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={buildPath("providerFinder", {})}
              className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            >
              Browse Library
            </Link>
            {isLoading ? (
              <span className="h-9 w-24 rounded-md bg-muted animate-pulse" aria-hidden />
            ) : isAuthenticated ? (
              <Link href={buildPath("dashboard", {})}>
                <Button variant="default" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link
                  href={buildPath("login", {})}
                  className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                >
                  Sign in
                </Link>
                <Link href={buildPath("register", {})}>
                  <Button variant="default" size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="section bg-gradient-to-b from-primary/5 to-background" aria-labelledby="hero-title">
        <div className="content-narrow text-center">
          <Badge
            variant="outline"
            className="mb-4 border-primary/20 bg-primary/5 text-primary"
            data-testid="badge-tagline"
          >
            {APP_TAGLINE}
          </Badge>
          <h1
            id="hero-title"
            className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground leading-tight mb-3"
            data-testid="text-hero-title"
          >
            Reading with <span className="text-primary">Dignity</span> &{" "}
            <span className="text-secondary">Equality</span>
          </h1>
          <p className="text-base text-muted-foreground mb-6" data-testid="text-hero-description">
            Audiobooks, braille, large print and ebooks—so everyone can enjoy literature.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <Link href={buildPath("dashboard", {})}>
                <Button variant="default" size="lg" className="px-6 h-12" data-testid="button-go-dashboard">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </Link>
            ) : (
              <>
                <Link href={buildPath("register", {})}>
                  <Button variant="default" size="lg" className="px-6 h-12" data-testid="button-get-started">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <Link href={buildPath("providerFinder", {})}>
                  <Button size="lg" variant="outline" data-testid="button-explore-services">
                    Explore Library
                  </Button>
                </Link>
              </>
            )}
          </div>
          <p className="mt-10 text-sm text-muted-foreground" data-testid="stats">
            <span data-testid="stat-users"><strong className="text-foreground">100+</strong> Titles</span>
            {" · "}
            <span data-testid="stat-providers"><strong className="text-foreground">4</strong> Formats</span>
            {" · "}
            <span data-testid="stat-bookings"><strong className="text-foreground">100+</strong> Readers</span>
          </p>
        </div>
      </section>

      <section className="section border-t border-border bg-muted/30" aria-labelledby="how-it-works">
        <div className="content-width">
          <h2 id="how-it-works" className="text-2xl font-heading font-bold text-center mb-2" data-testid="text-how-it-works">
            How It Works
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-10 max-w-lg mx-auto">
            Fair, dignified access—aligned with Australian disability community values.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center" data-testid={`step-${s.step}`}>
                <div className="relative inline-flex mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center" aria-hidden>
                    {s.step}
                  </span>
                </div>
                <h3 className="font-semibold text-sm mb-0.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight bg-primary text-primary-foreground" aria-label="Our commitments">
        <div className="content-width flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {TRUST.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-primary-foreground/90 text-sm" data-testid={`trust-badge-${i}`}>
              <b.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section bg-background" aria-labelledby="cta-title">
        <div className="content-narrow text-center">
          <h2 id="cta-title" className="text-2xl font-heading font-bold mb-3" data-testid="text-cta-title">
            Ready to Start Reading?
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Join {APP_NAME} for free. Browse the collection in the format that works for you.
          </p>
          {isAuthenticated ? (
            <Link href={buildPath("dashboard", {})}>
              <Button variant="outline" size="lg" data-testid="button-cta-dashboard">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : (
            <Link href={buildPath("register", {})}>
              <Button variant="default" size="lg" data-testid="button-cta-signup">
                Join the Library <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </Link>
          )}
        </div>
      </section>

      <section className="section-tight border-t border-border bg-muted/50">
        <div className="content-width flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div>
            <Badge variant="outline" className="mb-2 text-secondary border-secondary/20 bg-secondary/5">
              For Publishers & Libraries
            </Badge>
            <p className="text-sm text-muted-foreground">
              Add your titles, support accessible formats. Partner with us for a more inclusive literary landscape.
            </p>
          </div>
          <Link href={buildPath("providerRegister", {})} className="shrink-0">
            <Button variant="secondary" size="default" data-testid="button-provider-signup">
              <Library className="mr-2 h-4 w-4" aria-hidden /> Partner With Us
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
