import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";

export default async function CollaboratorAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  const serviceClient = createServiceRoleClient();

  // Look up collaborator by invite token
  const { data: collaborator, error } = await serviceClient
    .from("collaborators")
    .select("id, email, name, role, accepted_at, expires_at, playbook_id")
    .eq("invite_token", token)
    .single();

  if (error || !collaborator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <WarningCircle size={40} weight="duotone" className="mx-auto text-amber-500" />
            <h2 className="text-lg font-semibold">Invalid Invitation</h2>
            <p className="text-sm text-muted-foreground">
              This invitation link is invalid or has already been used.
              Please contact the person who invited you for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check expiration
  if (collaborator.expires_at && new Date(collaborator.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <WarningCircle size={40} weight="duotone" className="mx-auto text-amber-500" />
            <h2 className="text-lg font-semibold">Invitation Expired</h2>
            <p className="text-sm text-muted-foreground">
              This invitation has expired. Please contact the hiring team
              to request a new invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch playbook title
  const { data: playbook } = await serviceClient
    .from("playbooks")
    .select("title")
    .eq("id", collaborator.playbook_id ?? "")
    .single();

  // Mark as accepted (if not already)
  if (!collaborator.accepted_at) {
    await serviceClient
      .from("collaborators")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", collaborator.id);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <CheckCircle size={48} weight="duotone" className="mx-auto text-green-500 mb-2" />
          <CardTitle>Invitation Accepted</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {collaborator.accepted_at
              ? "You have already accepted this invitation."
              : "Thank you for accepting the invitation."}
          </p>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-left">
            {playbook?.title && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{playbook.title}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your role</span>
              <span className="font-medium capitalize">{collaborator.role ?? "Interviewer"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{collaborator.email}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            The hiring team will share further details about your interview
            stage and preparation materials separately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
