"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { UploadSimple, CircleNotch, FileAudio, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

const ACCEPTED_TYPES = ["audio/mp4", "audio/mpeg", "audio/webm", "audio/wav", "video/mp4", "video/webm"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

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
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = useCallback((selected: File) => {
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error("Unsupported file type. Use MP4, WebM, M4A, or WAV.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 100MB.");
      return;
    }
    setFile(selected);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const selected = e.dataTransfer.files[0];
    if (selected) validateAndSetFile(selected);
  }

  async function handleUpload() {
    if (!file || !consentChecked) return;

    setIsUploading(true);
    setProgress(10);

    try {
      setProgress(20);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("interview_id", interviewId);

      setProgress(40);

      const res = await fetch("/api/transcription/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(90);

      if (handleSessionExpired(res)) return;
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
    <div className="space-y-3 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.webm,.m4a,.wav,audio/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drop zone / file picker */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
            isDragging
              ? "border-teal-400 bg-teal-50/50"
              : "border-border/60 hover:border-teal-300 hover:bg-muted/30"
          }`}
        >
          <UploadSimple size={24} weight="duotone" className="text-muted-foreground/50" />
          <p className="mt-2 text-[13px] font-medium text-muted-foreground">
            Drop audio/video file here or click to browse
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            MP4, WebM, M4A, WAV — max 100MB
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
          <FileAudio size={20} weight="duotone" className="shrink-0 text-teal-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{file.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Consent checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="recording-consent"
          checked={consentChecked}
          onCheckedChange={(checked) => setConsentChecked(checked === true)}
        />
        <Label htmlFor="recording-consent" className="text-[12px]">
          I confirm that all participants consented to this recording
        </Label>
      </div>

      {/* Progress bar */}
      {isUploading && <Progress value={progress} className="h-2" />}

      {/* Upload button */}
      <Button
        size="sm"
        onClick={handleUpload}
        disabled={!file || !consentChecked || isUploading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white"
      >
        {isUploading ? (
          <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
        ) : (
          <UploadSimple size={16} weight="duotone" className="mr-2" />
        )}
        Upload & Transcribe
      </Button>
    </div>
  );
}
