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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const step1Schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  department: z.string().max(200).optional(),
});

type Step1Values = z.infer<typeof step1Schema>;

export function Step1BasicInfo() {
  const { draft, updateBasicInfo, setStep } = usePlaybookStore();

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: draft.basicInfo.title,
      department: draft.basicInfo.department || "",
    },
  });

  const onSubmit = (data: Step1Values) => {
    updateBasicInfo({
      title: data.title,
      department: data.department ?? "",
    });
    setStep(2);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold">Basic Information</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Start by naming your playbook
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px]">Role Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Senior Software Engineer"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px]">
                  Department (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Engineering"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Continue
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </form>
      </Form>
    </div>
  );
}
