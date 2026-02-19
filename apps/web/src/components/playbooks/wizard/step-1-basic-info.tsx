"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePlaybookStore } from "@/stores/playbook-store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
      department: draft.basicInfo.department || undefined,
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
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Start by naming your playbook</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Title</FormLabel>
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
                  <FormLabel>Department (Optional)</FormLabel>
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
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
