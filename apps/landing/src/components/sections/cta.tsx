import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section
      id="book-demo"
      className="relative py-24 lg:py-32 hero-gradient bg-noise overflow-hidden"
    >
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gold-500/[0.04] rounded-full blur-3xl" />
      </div>

      <Container size="narrow" className="relative z-10">
        <AnimateOnScroll>
          <div className="text-center">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              Ready to transform
              <br />
              your hiring?
            </h2>
            <p className="mt-6 text-lg text-white/50 max-w-md mx-auto leading-relaxed">
              See how Rec+onnect helps recruitment teams hire faster, smarter,
              and with full confidence.
            </p>
            <div className="mt-10">
              <Button href="#contact" variant="gold" size="xl">
                Book a Demo
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/30">
              Free to try &middot; No credit card required
            </p>
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
