import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  notifyManager,
  checkAllFeedbackCollected,
} from "@/lib/notifications";

const CollaboratorFeedbackSchema = z.object({
  token: z.string().min(1).max(200),
  interview_id: z.string().uuid(),
  ratings: z
    .array(
      z.object({
        category: z.string().min(1).max(200),
        score: z.number().int().min(1).max(4),
        notes: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(20),
  pros: z.array(z.string().max(500)).max(20),
  cons: z.array(z.string().max(500)).max(20),
  notes: z.string().max(5000).optional(),
  focus_areas_confirmed: z.literal(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CollaboratorFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const supabase = createServiceRoleClient();

    // 1. Validate token
    const { data: collaborator, error: collabError } = await supabase
      .from("collaborators")
      .select(
        "id, email, name, playbook_id, assigned_stages, expires_at, accepted_at",
      )
      .eq("invite_token", input.token)
      .single();

    if (collabError || !collaborator) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 },
      );
    }

    // Check expiry
    if (new Date(collaborator.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 404 },
      );
    }

    // 2. Verify interview exists and stage is assigned to this collaborator
    const { data: interview } = await supabase
      .from("interviews")
      .select("id, stage_id, candidate_id")
      .eq("id", input.interview_id)
      .single();

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    // Verify interview belongs to the collaborator's playbook
    if (interview.stage_id) {
      const { data: stage } = await supabase
        .from("interview_stages")
        .select("playbook_id")
        .eq("id", interview.stage_id)
        .single();

      if (!stage || stage.playbook_id !== collaborator.playbook_id) {
        return NextResponse.json(
          { error: "Interview does not belong to your assigned playbook" },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Interview has no stage assigned" },
        { status: 400 },
      );
    }

    // Check stage assignment if collaborator has specific stages
    if (collaborator.assigned_stages) {
      const assigned = collaborator.assigned_stages as string[];
      if (assigned.length > 0 && !assigned.includes(interview.stage_id)) {
        return NextResponse.json(
          { error: "You are not assigned to this interview's stage" },
          { status: 403 },
        );
      }
    }

    // 3. Check for duplicate submission
    const { data: existing } = await supabase
      .from("feedback")
      .select("id")
      .eq("interview_id", input.interview_id)
      .eq("collaborator_id", collaborator.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error:
            "You have already submitted feedback for this interview",
        },
        { status: 409 },
      );
    }

    // 4. Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from("feedback")
      .insert({
        interview_id: input.interview_id,
        interviewer_id: null,
        collaborator_id: collaborator.id,
        ratings: input.ratings,
        pros: input.pros,
        cons: input.cons,
        notes: input.notes ?? null,
        focus_areas_confirmed: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "[feedback/collaborator] insert error:",
        insertError,
      );
      return NextResponse.json(
        { error: "Failed to submit feedback" },
        { status: 500 },
      );
    }

    console.log(
      `[TRACE:feedback:collaborator] collaborator=${collaborator.id} interview=${input.interview_id} ratingsCount=${input.ratings.length}`,
    );

    // Fire-and-forget notifications — never block the response
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.axil.ie";

    // Resolve stage name and candidate name for the notification
    const { data: stage } = await supabase
      .from("interview_stages")
      .select("name, playbook_id")
      .eq("id", interview.stage_id)
      .single();

    const { data: candidate } = await supabase
      .from("candidates")
      .select("name")
      .eq("id", interview.candidate_id!)
      .single();

    const playbookId = stage?.playbook_id ?? collaborator.playbook_id;

    if (playbookId) {
      notifyManager({
        playbookId,
        type: "feedback_submitted",
        data: {
          interviewerName: collaborator.name ?? "Collaborator",
          stageName: stage?.name ?? "Interview",
          candidateName: candidate?.name ?? "Candidate",
          ratingSummary: "",
          debriefLink: `${appUrl}/playbooks/${playbookId}/debrief`,
        },
      }).catch(() => {});

      checkAllFeedbackCollected(input.interview_id, playbookId).catch(
        () => {},
      );
    }

    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (err) {
    console.error("[feedback/collaborator] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
