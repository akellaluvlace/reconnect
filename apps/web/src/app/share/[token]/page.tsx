import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate token server-side using service_role (no public SELECT policy)
  const serviceClient = createServiceRoleClient();

  const { data: link, error } = await serviceClient
    .from("share_links")
    .select("*, playbooks(id, title)")
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (error || !link) {
    notFound();
  }

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    notFound();
  }

  // Increment view count (fire-and-forget, minor race condition acceptable for analytics)
  serviceClient
    .from("share_links")
    .update({ view_count: (link.view_count ?? 0) + 1 })
    .eq("id", link.id)
    .then(
      () => {},
      (err: unknown) => console.error("[share] View count increment failed:", err),
    );

  // Fetch minimal data: stages + focus areas
  const { data: stages } = await serviceClient
    .from("interview_stages")
    .select("id, name, type, order_index, focus_areas")
    .eq("playbook_id", link.playbook_id ?? "")
    .order("order_index", { ascending: true });

  // Minimal data scope: candidate first name + role, stages, focus areas, questions
  const playbook = link.playbooks as unknown as {
    id: string;
    title: string;
  } | null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Shared Playbook</CardTitle>
          </div>
          {playbook && (
            <p className="text-sm text-muted-foreground">
              {playbook.title}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stages overview */}
          {stages && stages.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Interview Stages</p>
              {stages.map((stage) => (
                <div key={stage.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{stage.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {stage.type ?? "Custom"}
                    </Badge>
                  </div>
                  {stage.focus_areas &&
                    Array.isArray(stage.focus_areas) && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Focus Areas
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {stage.focus_areas
                            .filter(
                              (fa) =>
                                typeof fa === "object" && fa !== null && !Array.isArray(fa) && "name" in fa,
                            )
                            .map((fa, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs"
                              >
                                {String((fa as { name: string }).name)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No stages defined for this playbook yet.
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center pt-4">
            This is a limited view shared by the hiring team. For full access,
            please contact the person who shared this link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
