"use client";

import { BookOpen, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

import { APP_NAME, APP_DESCRIPTION } from "@/lib/brand";
import { buildPath } from "@/lib/router";

export default function Footer() {
  return (
    <footer
      id="footer"
      className="bg-muted/50 border-t border-border pt-12 pb-6"
      role="contentinfo"
      tabIndex={-1}
    >
      <div className="content-width">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-primary rounded-lg p-1.5">
                <BookOpen className="h-5 w-5 text-white fill-white" />
              </div>
              <span className="font-heading text-xl font-bold text-primary">
                {APP_NAME}
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {APP_DESCRIPTION}
            </p>
            <div className="flex gap-4" aria-label="Social media links">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                data-testid="link-facebook"
              >
                <Facebook
                  className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                  aria-hidden="true"
                />
                <span className="sr-only">Follow us on Facebook</span>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                data-testid="link-twitter"
              >
                <Twitter
                  className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                  aria-hidden="true"
                />
                <span className="sr-only">Follow us on Twitter</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                data-testid="link-instagram"
              >
                <Instagram
                  className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                  aria-hidden="true"
                />
                <span className="sr-only">Follow us on Instagram</span>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                data-testid="link-linkedin"
              >
                <Linkedin
                  className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                  aria-hidden="true"
                />
                <span className="sr-only">Follow us on LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">
              Library
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href={buildPath("providerFinder", {})} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Browse Collection
                </Link>
              </li>
              <li>
                <Link href={buildPath("dashboard", {})} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  My Library
                </Link>
              </li>
              <li>
                <Link href={buildPath("register", {})} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Join Free
                </Link>
              </li>
              <li>
                <Link href={buildPath("login", {})} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://ausdis.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                >
                  Australian Disability (ausdis.au)
                </a>
              </li>
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Accessibility
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>support@accessibooks.com</li>
              <li>Sydney, Australia</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © 2025 {APP_NAME}. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
