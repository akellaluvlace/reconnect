"use client";

import { cn } from "@/lib/cn";
import { useEffect, useRef, type HTMLAttributes } from "react";

interface AnimateOnScrollProps extends HTMLAttributes<HTMLDivElement> {
  delay?: 0 | 1 | 2 | 3 | 4;
}

export function AnimateOnScroll({
  children,
  className,
  delay = 0,
  ...props
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "animate-on-scroll",
        delay > 0 && `animate-delay-${delay}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
