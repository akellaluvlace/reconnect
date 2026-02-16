"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Solution", href: "#solution" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-cream-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          : "bg-transparent"
      )}
    >
      <Container size="wide">
        <nav className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link
            href="/"
            className={cn(
              "font-display text-xl font-bold tracking-tight transition-colors duration-300",
              scrolled ? "text-navy-900" : "text-white"
            )}
          >
            Rec
            <span className="text-gold-500">+</span>
            onnect
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200",
                  scrolled
                    ? "text-slate-600 hover:text-navy-900 hover:bg-cream-100"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className={cn(
                "text-sm font-medium transition-colors duration-200",
                scrolled
                  ? "text-slate-600 hover:text-navy-900"
                  : "text-white/70 hover:text-white"
              )}
            >
              Sign In
            </a>
            <Button
              href="#book-demo"
              variant="gold"
              size="sm"
            >
              Book a Demo
            </Button>
          </div>
        </nav>
      </Container>
    </header>
  );
}
