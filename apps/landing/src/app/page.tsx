import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero";
import { SolutionSection } from "@/components/sections/solution";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { CtaSection } from "@/components/sections/cta";
import { ContactSection } from "@/components/sections/contact";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <SolutionSection />
        <HowItWorksSection />
        <CtaSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
