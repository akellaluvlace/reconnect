"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Lightbulb,
  Factory,
  Stairs,
  Blueprint,
  ChatCircleText,
  FileText,
  EnvelopeSimple,
  Database,
  CheckCircle,
  SpinnerGap,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

interface SeedResult {
  seeded: Record<string, number>;
  message: string;
}

const CMS_SECTIONS = [
  {
    name: "Skills",
    description: "Manage your skills taxonomy",
    href: "/settings/admin/skills",
    icon: Lightbulb,
  },
  {
    name: "Industries",
    description: "Industry categories for playbooks",
    href: "/settings/admin/industries",
    icon: Factory,
  },
  {
    name: "Levels",
    description: "Seniority levels and experience bands",
    href: "/settings/admin/levels",
    icon: Stairs,
  },
  {
    name: "Stage Templates",
    description: "Reusable interview stage blueprints",
    href: "/settings/admin/templates",
    icon: Blueprint,
  },
  {
    name: "Question Bank",
    description: "Curated interview questions by category",
    href: "/settings/admin/questions",
    icon: ChatCircleText,
  },
  {
    name: "JD Templates",
    description: "Job description templates and styles",
    href: "/settings/admin/jd-templates",
    icon: FileText,
  },
  {
    name: "Email Templates",
    description: "Customise notification emails",
    href: "/settings/admin/emails",
    icon: EnvelopeSimple,
  },
];

export default function AdminPage() {
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeedResult] = useState<SeedResult | null>(null);
  const [checkingEmpty, setCheckingEmpty] = useState(true);
  const [tablesEmpty, setTablesEmpty] = useState(false);

  // Check if tables are empty on mount to decide whether to show the seed banner
  const checkEmpty = useCallback(async () => {
    try {
      // Quick check: try to fetch levels (a small table). If it returns 0 items,
      // the org likely has no CMS data yet.
      const res = await fetch("/api/admin/cms/levels");
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        setCheckingEmpty(false);
        return;
      }
      const data = await res.json();
      setTablesEmpty(Array.isArray(data) && data.length === 0);
    } catch {
      // Silently ignore — don't block page load
    } finally {
      setCheckingEmpty(false);
    }
  }, []);

  useEffect(() => {
    checkEmpty();
  }, [checkEmpty]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/cms/seed", { method: "POST" });
      if (handleSessionExpired(res)) return;

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to seed data");
      }

      const result: SeedResult = await res.json();
      setSeedResult(result);

      const totalSeeded = Object.values(result.seeded).reduce(
        (a, b) => a + b,
        0,
      );
      if (totalSeeded > 0) {
        toast.success(result.message);
        setTablesEmpty(false);
      } else {
        toast.info(result.message);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to seed data",
      );
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin CMS"
        description="Manage content that powers playbook wizards, AI generation, and interview processes across your organisation."
      />

      {/* Seed banner — shown when tables might be empty */}
      {!checkingEmpty && tablesEmpty && !seeded && (
        <Card className="border-teal-200 bg-teal-50/50">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100">
              <Database size={20} weight="duotone" className="text-teal-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Load starter data</CardTitle>
              <CardDescription className="mt-0.5">
                Populate levels, industries, stage templates, and interview
                questions with sensible defaults. You can customise everything
                afterwards.
              </CardDescription>
            </div>
            <Button
              onClick={handleSeed}
              disabled={seeding}
              size="sm"
              className="shrink-0"
            >
              {seeding ? (
                <>
                  <SpinnerGap
                    size={16}
                    className="mr-1.5 animate-spin"
                  />
                  Seeding...
                </>
              ) : (
                "Load defaults"
              )}
            </Button>
          </CardHeader>
        </Card>
      )}

      {/* Success banner — shown after seeding */}
      {seeded &&
        Object.values(seeded.seeded).reduce((a, b) => a + b, 0) > 0 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
                <CheckCircle
                  size={20}
                  weight="duotone"
                  className="text-green-600"
                />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Starter data loaded</CardTitle>
                <CardDescription className="mt-0.5">
                  {seeded.seeded.levels > 0 &&
                    `${seeded.seeded.levels} levels, `}
                  {seeded.seeded.industries > 0 &&
                    `${seeded.seeded.industries} industries, `}
                  {seeded.seeded.stage_templates > 0 &&
                    `${seeded.seeded.stage_templates} stage templates, `}
                  {seeded.seeded.questions > 0 &&
                    `${seeded.seeded.questions} questions`}
                  {" — "}
                  ready to customise.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}

      {/* CMS section cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {CMS_SECTIONS.map((section) => (
          <Link key={section.name} href={section.href}>
            <Card className="h-full transition-all duration-150 hover:bg-cream-100">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                  <section.icon
                    size={20}
                    weight="duotone"
                    className="text-teal-600"
                  />
                </div>
                <div>
                  <CardTitle className="text-base">{section.name}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
