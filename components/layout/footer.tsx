import { MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer id="footer" className="bg-slate-50 border-t border-slate-200 pt-16 pb-8" role="contentinfo" tabIndex={-1}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-primary rounded-lg p-1.5">
                <MapPin className="h-5 w-5 text-white fill-white" />
              </div>
              <span className="font-heading text-xl font-bold text-primary">
                MapAble
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Enabling people with disabilities to live independent and dignified lives through innovative technology in care, transport, and employment.
            </p>
            <div className="flex gap-4" role="list" aria-label="Social media links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md" data-testid="link-facebook">
                <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" aria-hidden="true" />
                <span className="sr-only">Follow us on Facebook</span>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md" data-testid="link-twitter">
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" aria-hidden="true" />
                <span className="sr-only">Follow us on Twitter</span>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md" data-testid="link-instagram">
                <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" aria-hidden="true" />
                <span className="sr-only">Follow us on Instagram</span>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md" data-testid="link-linkedin">
                <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" aria-hidden="true" />
                <span className="sr-only">Follow us on LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Platform</h4>
            <ul className="space-y-3">
              <li><Link href="/care"><span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">MapAble Care</span></Link></li>
              <li><Link href="/transport"><span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">MapAble Transport</span></Link></li>
              <li><Link href="/employment"><span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">MapAble Employment</span></Link></li>
              <li><Link href="/dashboard"><span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">MapAble Dashboard</span></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              <li><Link href="/ndis"><span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">NDIS Profile</span></Link></li>
              <li><Link href="/accessibility-map"><span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">Accessibility Map</span></Link></li>
              <li><Link href="/support-centre"><span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">Help Centre</span></Link></li>
              <li><Link href="/resources"><span className="text-sm text-muted-foreground hover:text-primary cursor-pointer">Resources</span></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>support@mapable.com.au</li>
              <li>1300 MAP ABLE</li>
              <li>Sydney, Australia</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © 2025 Australian Disability Ltd. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span className="hover:text-primary cursor-pointer">Privacy Policy</span>
            <span className="hover:text-primary cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
