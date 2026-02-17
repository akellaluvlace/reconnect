import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Solution", href: "#solution" },
    { label: "FAQ", href: "#faq" },
    { label: "Book a Demo", href: "#book-demo" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "#contact" },
    { label: "Privacy Policy", href: "#" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-teal-950 text-white/50 overflow-hidden">
      {/* Teal gradient divider at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(rgba(20, 184, 166, 0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
      </div>

      <Container size="wide" className="relative z-10 py-20">
        <AnimateOnScroll>
        <div className="grid grid-cols-12 gap-8">
          {/* Brand */}
          <div className="col-span-5">
            <Link href="/" className="font-display text-xl font-bold text-white tracking-tight">
              Rec<span className="text-teal-500">+</span>onnect
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              AI-powered strategic recruitment platform. Helping Irish
              businesses hire with clarity, confidence, and compliance.
            </p>
          </div>

          {/* Product Links */}
          <div className="col-span-3 col-start-7">
            <h4 className="font-display font-semibold text-white text-xs tracking-[0.15em] uppercase mb-5">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="link-underline-grow text-sm text-white/50 hover:text-teal-400 transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="col-span-2">
            <h4 className="font-display font-semibold text-white text-xs tracking-[0.15em] uppercase mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="link-underline-grow text-sm text-white/50 hover:text-teal-400 transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        </AnimateOnScroll>

        {/* Bottom Bar */}
        <AnimateOnScroll>
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/35">
          <p>&copy; {currentYear} Rec+onnect. All rights reserved.</p>
          <p className="flex items-center gap-2">
            Made in Ireland
            <span className="text-xl" aria-label="Irish flag">
              &#127470;&#127466;
            </span>
          </p>
        </div>
        </AnimateOnScroll>
      </Container>
    </footer>
  );
}
