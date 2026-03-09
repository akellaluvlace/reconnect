"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePlaybookStore } from "@/stores/playbook-store";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkillsInput } from "./skills-input";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_LEVELS = [
  { value: "junior", label: "Junior (0-2 years)" },
  { value: "mid", label: "Mid-Level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead (8+ years)" },
  { value: "executive", label: "Executive" },
];

const DEFAULT_INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Professional Services",
  "Other",
];

const step2Schema = z.object({
  level: z.string().min(1, "Level is required"),
  skills: z
    .array(z.string().min(1, "Skill cannot be empty").max(50))
    .min(1, "At least one skill is required")
    .max(15, "Maximum 15 skills allowed"),
  industry: z.string().min(1, "Industry is required"),
  customIndustry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
}).refine(
  (data) => data.industry !== "Other" || (data.customIndustry && data.customIndustry.trim().length > 0),
  { message: "Please enter your industry", path: ["customIndustry"] },
);

type Step2Values = z.infer<typeof step2Schema>;

export function Step2RoleDetails() {
  const { draft, updateRoleDetails, setStep } = usePlaybookStore();

  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [industries, setIndustries] = useState(DEFAULT_INDUSTRIES);
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [cmsLoading, setCmsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCmsData() {
      try {
        const supabase = createClient();

        const [levelsRes, industriesRes, skillsRes] = await Promise.all([
          supabase
            .from("cms_levels")
            .select("name, description, order_index")
            .eq("is_active", true)
            .order("order_index"),
          supabase
            .from("cms_industries")
            .select("name")
            .eq("is_active", true)
            .order("created_at"),
          supabase
            .from("cms_skills")
            .select("name")
            .eq("is_active", true)
            .order("name"),
        ]);

        if (cancelled) return;

        // Levels: use CMS if non-empty, otherwise keep defaults
        if (levelsRes.data && levelsRes.data.length > 0) {
          setLevels(
            levelsRes.data.map((l) => ({
              value: l.name.toLowerCase(),
              label: l.name + (l.description ? ` (${l.description})` : ""),
            })),
          );
        }

        // Industries: use CMS if non-empty, otherwise keep defaults. Always ensure "Other" is last.
        if (industriesRes.data && industriesRes.data.length > 0) {
          const cmsNames = industriesRes.data.map((i) => i.name).filter((n) => n !== "Other");
          setIndustries([...cmsNames, "Other"]);
        }

        // Skills: provide as suggestions (empty array is fine — means no suggestions)
        if (skillsRes.data && skillsRes.data.length > 0) {
          setSkillSuggestions(skillsRes.data.map((s) => s.name));
        }
      } catch {
        // On error, keep defaults — no need to surface this to the user
      } finally {
        if (!cancelled) {
          setCmsLoading(false);
        }
      }
    }

    fetchCmsData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Check if stored industry matches a preset; if not, it was a custom entry
  const isCustomIndustry = draft.roleDetails.industry && !industries.includes(draft.roleDetails.industry);

  const form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      level: draft.roleDetails.level,
      skills: draft.roleDetails.skills,
      industry: isCustomIndustry ? "Other" : draft.roleDetails.industry,
      customIndustry: isCustomIndustry ? draft.roleDetails.industry : "",
      location: draft.roleDetails.location || "",
    },
  });

  const watchedIndustry = form.watch("industry");

  const onSubmit = (data: Step2Values) => {
    updateRoleDetails({
      level: data.level,
      skills: data.skills,
      industry: data.industry === "Other" ? data.customIndustry!.trim() : data.industry,
      location: data.location ?? "",
    });
    setStep(3);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold">Role Details</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Tell us about the role to generate relevant content
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px]">Experience Level</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={cmsLoading}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={cmsLoading ? "Loading..." : "Select level"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px]">Industry</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={cmsLoading}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={cmsLoading ? "Loading..." : "Select industry"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedIndustry === "Other" && (
            <FormField
              control={form.control}
              name="customIndustry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px]">Specify Industry</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your industry"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px]">
                  Key Skills
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    (tools, technologies, languages)
                  </span>
                </FormLabel>
                <FormControl>
                  <SkillsInput
                    value={field.value}
                    onChange={field.onChange}
                    suggestions={skillSuggestions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px]">
                  Location (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Defaults to Ireland"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const values = form.getValues();
                updateRoleDetails({
                  level: values.level,
                  skills: values.skills,
                  industry: values.industry === "Other" ? (values.customIndustry?.trim() || "") : values.industry,
                  location: values.location ?? "",
                });
                setStep(1);
              }}
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Continue
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
