import { Container } from "@/components/ui/container";
import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Solution", href: "#solution" },
    { label: "How it works", href: "#how-it-works" },
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
    <footer className="bg-navy-950 text-white/60">
      <Container size="wide" className="py-16">
        <div className="grid grid-cols-12 gap-8">
          {/* Brand */}
          <div className="col-span-5">
            <Link href="/" className="font-display text-xl font-bold text-white tracking-tight">
              Rec<span className="text-gold-500">+</span>onnect
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              AI-powered strategic recruitment platform. Helping Irish
              businesses hire with clarity, confidence, and compliance.
            </p>
          </div>

          {/* Product Links */}
          <div className="col-span-3 col-start-7">
            <h4 className="font-display font-semibold text-white text-sm tracking-wide uppercase mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="col-span-2">
            <h4 className="font-display font-semibold text-white text-sm tracking-wide uppercase mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between text-xs">
          <p>&copy; {currentYear} Rec+onnect. All rights reserved.</p>
          <p>
            Made in Ireland{" "}
            <span className="inline-block" aria-label="Irish flag">
              &#127470;&#127466;
            </span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
