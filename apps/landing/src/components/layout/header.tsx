"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Solution", href: "#solution" },
  { label: "FAQ", href: "#faq" },
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
          ? "bg-white/90 backdrop-blur-xl border-b border-[var(--border-light-subtle)] shadow-[0_1px_3px_rgba(10,22,40,0.04),0_4px_12px_rgba(10,22,40,0.02)]"
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
              "text-teal-950"
            )}
          >
            Rec
            <span
              className="text-teal-500 transition-colors duration-300"
            >
              +
            </span>
            onnect
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "link-underline-grow px-4 py-2 text-sm font-medium transition-colors duration-200",
                  "text-teal-800/50 hover:text-teal-950"
                )}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <a
              href="/login"
              className={cn(
                "text-sm font-medium transition-colors duration-200",
                "text-teal-800/50 hover:text-teal-950"
              )}
            >
              Sign In
            </a>
            <Button
              href="#book-demo"
              variant="outline-dark"
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
