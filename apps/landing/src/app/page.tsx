import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero";
import { StatsBar } from "@/components/sections/stats-bar";
import { ProblemSection } from "@/components/sections/problem";
import { SolutionSection } from "@/components/sections/solution";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { TrustSection } from "@/components/sections/trust";
import { CtaSection } from "@/components/sections/cta";
import { FaqSection } from "@/components/sections/faq";
import { ContactSection } from "@/components/sections/contact";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <StatsBar />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <TrustSection />
        <CtaSection />
        <FaqSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
