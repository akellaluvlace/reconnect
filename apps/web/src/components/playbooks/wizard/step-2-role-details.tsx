"use client";

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
import { ArrowLeft, ArrowRight } from "lucide-react";

const levels = [
  { value: "junior", label: "Junior (0-2 years)" },
  { value: "mid", label: "Mid-Level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead (8+ years)" },
  { value: "executive", label: "Executive" },
];

const industries = [
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
  location: z.string().max(200).optional(),
});

type Step2Values = z.infer<typeof step2Schema>;

export function Step2RoleDetails() {
  const { draft, updateRoleDetails, setStep } = usePlaybookStore();

  const form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      level: draft.roleDetails.level,
      skills: draft.roleDetails.skills,
      industry: draft.roleDetails.industry,
      location: draft.roleDetails.location || "",
    },
  });

  const onSubmit = (data: Step2Values) => {
    updateRoleDetails({
      level: data.level,
      skills: data.skills,
      industry: data.industry,
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
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select level" />
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
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select industry" />
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

          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px]">Key Skills</FormLabel>
                <FormControl>
                  <SkillsInput
                    value={field.value}
                    onChange={field.onChange}
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
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Continue
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
