"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationPreferences {
  feedback_submitted: boolean;
  all_feedback_collected: boolean;
  synthesis_ready: boolean;
  reminders: boolean;
}

const TOGGLE_CONFIG: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "feedback_submitted",
    label: "Feedback submitted",
    description:
      "Get notified when a collaborator submits interview feedback",
  },
  {
    key: "all_feedback_collected",
    label: "All feedback collected",
    description:
      "Get notified when all collaborators have submitted feedback",
  },
  {
    key: "synthesis_ready",
    label: "Synthesis ready",
    description: "Get notified when AI synthesis is complete",
  },
  {
    key: "reminders",
    label: "Daily reminders",
    description:
      "Send daily reminders to collaborators with pending feedback",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationsPageClient() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch preferences on mount
  // -----------------------------------------------------------------------

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/users/preferences");
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        throw new Error("Failed to load notification preferences");
      }
      const data: NotificationPreferences = await res.json();
      setPrefs(data);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load notification preferences",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  // -----------------------------------------------------------------------
  // Toggle a preference
  // -----------------------------------------------------------------------

  async function handleToggle(
    key: keyof NotificationPreferences,
    checked: boolean,
  ) {
    if (!prefs) return;

    // Optimistic update
    const prev = { ...prefs };
    setPrefs({ ...prefs, [key]: checked });
    setSavingKey(key);

    try {
      const res = await fetch("/api/users/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: checked }),
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        throw new Error("Failed to save preferences");
      }
      const updated: NotificationPreferences = await res.json();
      setPrefs(updated);
      toast.success("Preferences saved");
    } catch (err) {
      // Revert on failure
      setPrefs(prev);
      toast.error(
        err instanceof Error ? err.message : "Failed to save preferences",
      );
    } finally {
      setSavingKey(null);
    }
  }

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
              <Bell size={18} weight="duotone" className="text-teal-600" />
            </div>
            <div>
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-1.5 h-3 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-56 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!prefs) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load notification preferences. Please try refreshing the page.
        </CardContent>
      </Card>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
            <Bell size={18} weight="duotone" className="text-teal-600" />
          </div>
          <div>
            <CardTitle className="text-base">Email Notifications</CardTitle>
            <CardDescription>
              Choose which notifications you want to receive by email
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {TOGGLE_CONFIG.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-4"
          >
            <div className="space-y-0.5">
              <Label
                htmlFor={`toggle-${key}`}
                className="text-[14px] font-medium cursor-pointer"
              >
                {label}
              </Label>
              <p className="text-[13px] text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {savingKey === key && (
                <CircleNotch
                  size={14}
                  weight="bold"
                  className="animate-spin text-muted-foreground"
                />
              )}
              <Switch
                id={`toggle-${key}`}
                checked={prefs[key]}
                onCheckedChange={(checked) => handleToggle(key, checked)}
                disabled={savingKey !== null}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
