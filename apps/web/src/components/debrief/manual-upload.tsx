"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, FileAudio } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_TYPES = ["audio/mp4", "audio/mpeg", "audio/webm", "video/mp4", "video/webm"];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

interface ManualUploadProps {
  interviewId: string;
  onUploadComplete: () => void;
}

export function ManualUpload({
  interviewId,
  onUploadComplete,
}: ManualUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error("Unsupported file type. Use MP4, WebM, or M4A.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 500MB.");
      return;
    }

    setFile(selected);
  }

  async function handleUpload() {
    if (!file || !consentChecked) return;

    setIsUploading(true);
    setProgress(10);

    try {
      // Simulate upload progress (real implementation uses Supabase Storage)
      setProgress(30);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("interview_id", interviewId);

      // Upload to Supabase Storage would go here
      // For now, this is a skeleton that calls the transcription route
      setProgress(60);

      // After upload, trigger transcription
      const res = await fetch("/api/transcription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_id: interviewId,
          recording_url: `storage://recordings/${interviewId}/${file.name}`,
        }),
      });

      setProgress(90);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      setProgress(100);
      toast.success("Recording uploaded and transcription started");
      onUploadComplete();
      setFile(null);
      setConsentChecked(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      console.error("[manual-upload] Failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Upload failed",
      );
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <p className="text-sm font-medium">Upload Recording</p>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.webm,.m4a,audio/*,video/*"
          onChange={handleFileChange}
          className="text-sm"
        />
        {file && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <FileAudio className="h-3.5 w-3.5" />
            {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="recording-consent"
          checked={consentChecked}
          onCheckedChange={(checked) => setConsentChecked(checked === true)}
        />
        <Label htmlFor="recording-consent" className="text-xs">
          I confirm that all participants consented to this recording
        </Label>
      </div>

      {isUploading && <Progress value={progress} className="h-2" />}

      <Button
        size="sm"
        onClick={handleUpload}
        disabled={!file || !consentChecked || isUploading}
      >
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Upload & Transcribe
      </Button>
    </div>
  );
}
