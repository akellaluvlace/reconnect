import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import type { FeedbackEntry } from "./feedback-parsers";

interface InterviewRef {
  id: string;
  candidate_id: string | null;
  stage_id: string | null;
}

export interface FeedbackResult {
  interview: InterviewRef;
  data: FeedbackEntry[];
}

/**
 * Fetch feedback for multiple interviews in parallel.
 * Handles session expiry, error counting, and toast warnings.
 *
 * Returns fulfilled results only. Sets `cancelled` flag on session expiry.
 */
export async function loadFeedbackForInterviews(
  interviews: InterviewRef[],
  opts?: { filterValid?: boolean },
): Promise<{ results: FeedbackResult[]; cancelled: boolean }> {
  const targets = opts?.filterValid !== false
    ? interviews.filter((i) => i.candidate_id && i.stage_id)
    : interviews;

  let cancelled = false;

  const settled = await Promise.allSettled(
    targets.map(async (interview) => {
      const res = await fetch(`/api/feedback?interview_id=${interview.id}`);
      if (handleSessionExpired(res)) {
        cancelled = true;
        throw new Error("session_expired");
      }
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const { data } = await res.json();
      return {
        interview,
        data: Array.isArray(data) ? (data as FeedbackEntry[]) : [],
      };
    }),
  );

  const results: FeedbackResult[] = [];
  let failedCount = 0;

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else if (result.reason?.message !== "session_expired") {
      failedCount++;
    }
  }

  if (!cancelled && failedCount > 0) {
    toast.warning(
      `Some feedback could not be loaded (${failedCount} interview${failedCount > 1 ? "s" : ""} failed). Data may be incomplete.`,
    );
  }

  return { results, cancelled };
}
