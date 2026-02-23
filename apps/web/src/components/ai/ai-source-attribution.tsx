"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface WebSource {
  url: string;
  title: string;
  relevance_score: number;
  published_date?: string;
}

interface AISourceAttributionProps {
  /** Mode A: simple labels like ["Market Research", "Hiring Strategy"] */
  basedOn?: string[];
  /** Mode B: web sources with clickable links (for Market Intelligence) */
  sources?: WebSource[];
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function AISourceAttribution({
  basedOn,
  sources,
}: AISourceAttributionProps) {
  const [expanded, setExpanded] = useState(false);

  // Mode B: web sources list (collapsible)
  if (sources && sources.length > 0) {
    return (
      <div className="text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <span>
            Based on {sources.length} source{sources.length !== 1 ? "s" : ""}
          </span>
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        {expanded && (
          <ul className="mt-1.5 space-y-1 pl-0.5">
            {sources.map((source) => (
              <li key={source.url} className="flex items-center gap-1.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-foreground hover:underline transition-colors"
                  title={source.title}
                >
                  {source.title}
                </a>
                <span className="shrink-0 text-muted-foreground/60">
                  — {extractDomain(source.url)}
                </span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40" />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Mode A: simple "Based on" tags
  if (basedOn && basedOn.length > 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Based on: {basedOn.join(" · ")}
      </p>
    );
  }

  return null;
}
