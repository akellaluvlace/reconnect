"use client";

import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { Button } from "@/components/ui/button";
import { EnvelopeSimple, LinkedinLogo, PaperPlaneTilt } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: Wire to Resend API or Supabase edge function when backend is ready
    setSubmitted(true);
  }

  return (
    <section id="contact" className="py-28 bg-cream-50 relative overflow-hidden">
      {/* Subtle noise */}
      <div className="bg-noise absolute inset-0 pointer-events-none" />

      <Container className="relative z-10">
        <div className="grid grid-cols-12 gap-16 items-start">
          {/* Left — Info (5 cols) */}
          <div className="col-span-12 lg:col-span-5">
            <AnimateOnScroll>
              <div>
                <span className="text-xs font-semibold font-display tracking-[0.15em] uppercase text-teal-600">
                  Get in Touch
                </span>
                <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-bold text-teal-900 tracking-[-0.025em] leading-[1.1]">
                  Ready to talk?
                </h2>
                <p className="mt-6 text-slate-500 leading-relaxed">
                  Whether you&apos;re hiring for one role or building out your
                  entire interview process, we&apos;d love to show you
                  how Axil works.
                </p>

                <div className="mt-10 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-900 text-teal-400">
                      <EnvelopeSimple size={24} weight="duotone" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Email us directly</p>
                      <a
                        href="mailto:hello@reconnect.io"
                        className="font-medium text-teal-900 hover:text-teal-600 transition-colors duration-200"
                      >
                        hello@reconnect.io
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-900 text-teal-400">
                      <LinkedinLogo size={24} weight="duotone" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">LinkedIn</p>
                      <span className="font-medium text-teal-900">
                        Coming soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>

          {/* Right — Form (7 cols) */}
          <div className="col-span-12 lg:col-span-7">
            <AnimateOnScroll delay={2}>
              <div className="card-light rounded-[20px] p-8 lg:p-10">
                {submitted ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-600 mb-5">
                      <PaperPlaneTilt size={32} weight="duotone" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-teal-900">
                      Thanks for your interest
                    </h3>
                    <p className="mt-2 text-slate-500">
                      We&apos;re launching soon. Email us directly at hello@reconnect.io and we&apos;ll be in touch within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-display font-medium text-teal-900 mb-2"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Your name"
                        className="w-full h-14 px-5 rounded-xl border border-cream-200 bg-cream-50 text-teal-900 placeholder:text-slate-400 transition-all duration-300 focus:border-teal-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-display font-medium text-teal-900 mb-2"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@company.com"
                        className="w-full h-14 px-5 rounded-xl border border-cream-200 bg-cream-50 text-teal-900 placeholder:text-slate-400 transition-all duration-300 focus:border-teal-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="company"
                        className="block text-sm font-display font-medium text-teal-900 mb-2"
                      >
                        Company
                      </label>
                      <input
                        id="company"
                        name="company"
                        type="text"
                        autoComplete="organization"
                        placeholder="Your company name"
                        className="w-full h-14 px-5 rounded-xl border border-cream-200 bg-cream-50 text-teal-900 placeholder:text-slate-400 transition-all duration-300 focus:border-teal-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-display font-medium text-teal-900 mb-2"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={4}
                        placeholder="Tell us about the role or team you're hiring for..."
                        className="w-full px-5 py-4 rounded-xl border border-cream-200 bg-cream-50 text-teal-900 placeholder:text-slate-400 transition-all duration-300 focus:border-teal-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] resize-none"
                      />
                    </div>
                    <Button type="submit" variant="outline-dark" size="lg" className="w-full">
                      Send Message
                      <PaperPlaneTilt size={18} weight="bold" className="ml-2" />
                    </Button>
                  </form>
                )}
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </Container>
    </section>
  );
}
