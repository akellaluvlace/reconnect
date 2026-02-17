import Image from "next/image";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

interface TeamMember {
  name: string;
  role: string;
  image: string;
}

const team: TeamMember[] = [
  {
    name: "Robert Coffey",
    role: "Founder",
    image: "/team/rob.jpg",
  },
  {
    name: "Helga Reeves",
    role: "Talent Scout",
    image: "/team/helga.jpg",
  },
  {
    name: "Magda Cerello",
    role: "Recruitment Consultant",
    image: "/team/magda.jpg",
  },
];

export function TeamSection() {
  return (
    <section className="relative py-24 lg:py-32 bg-cream-50 overflow-hidden border-b border-cream-200/60">
      <Container size="wide" className="relative z-10">
        {/* Header */}
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold font-display tracking-[0.15em] uppercase text-teal-600 mb-3 block">
              Our Team
            </span>
            <h2 className="font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-bold text-teal-950 tracking-[-0.03em] leading-[1.08]">
              30 years of combined experience
            </h2>
            <p className="mt-5 text-[15px] text-slate-500 leading-[1.7]">
              From agency to in-house, SME to multinational — your hiring needs are in safe hands.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Team grid */}
        <div className="flex justify-center gap-16 lg:gap-24">
          {team.map((member, i) => (
            <AnimateOnScroll
              key={member.name}
              delay={i < 3 ? ((i + 1) as 1 | 2 | 3) : undefined}
            >
              <div className="text-center">
                <div className="relative w-[180px] h-[180px] mx-auto mb-6">
                  {/* Subtle ring */}
                  <div className="absolute inset-0 rounded-full border border-teal-500/10" />
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={180}
                    height={180}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-teal-950 tracking-[-0.01em]">
                  {member.name}
                </h3>
                <p className="mt-1 text-sm text-teal-600 font-medium">
                  {member.role}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
