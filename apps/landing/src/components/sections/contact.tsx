"use client";

import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { Button } from "@/components/ui/button";
import { Mail, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Future: POST to API endpoint
    setSubmitted(true);
  }

  return (
    <section id="contact" className="py-24 lg:py-32 bg-cream-50">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left — Info */}
          <AnimateOnScroll>
            <div>
              <span className="text-sm font-semibold font-display tracking-widest uppercase text-gold-600">
                Get in Touch
              </span>
              <h2 className="mt-4 font-display text-3xl lg:text-4xl font-bold text-navy-900 tracking-tight leading-tight">
                Let&apos;s talk about your hiring needs
              </h2>
              <p className="mt-6 text-slate-500 leading-relaxed">
                Whether you&apos;re hiring for one role or building a full
                recruitment process, we&apos;d love to show you how Rec+onnect
                can help.
              </p>

              <div className="mt-10 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy-900 text-gold-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email us directly</p>
                  <a
                    href="mailto:hello@reconnect.io"
                    className="font-medium text-navy-900 hover:text-gold-600 transition-colors"
                  >
                    hello@reconnect.io
                  </a>
                </div>
              </div>
            </div>
          </AnimateOnScroll>

          {/* Right — Form */}
          <AnimateOnScroll delay={2}>
            <div className="rounded-2xl bg-white p-8 lg:p-10 border border-cream-200 shadow-sm">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-600 mb-4">
                    <Send className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-navy-900">
                    Message sent
                  </h3>
                  <p className="mt-2 text-slate-500">
                    We&apos;ll be in touch within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-navy-900 mb-2"
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Your name"
                      className="w-full h-12 px-4 rounded-xl border border-cream-200 bg-cream-50 text-navy-900 placeholder:text-slate-400 transition-colors focus:border-gold-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-navy-900 mb-2"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="you@company.com"
                      className="w-full h-12 px-4 rounded-xl border border-cream-200 bg-cream-50 text-navy-900 placeholder:text-slate-400 transition-colors focus:border-gold-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-navy-900 mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      placeholder="Tell us about the role or team you're hiring for..."
                      className="w-full px-4 py-3 rounded-xl border border-cream-200 bg-cream-50 text-navy-900 placeholder:text-slate-400 transition-colors focus:border-gold-500 focus:bg-white resize-none"
                    />
                  </div>
                  <Button type="submit" variant="gold" size="lg" className="w-full">
                    Send Message
                    <Send className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              )}
            </div>
          </AnimateOnScroll>
        </div>
      </Container>
    </section>
  );
}
