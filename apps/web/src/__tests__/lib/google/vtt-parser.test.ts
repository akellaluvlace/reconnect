import { describe, it, expect } from "vitest";

import { parseVTT, parseSBV } from "@/lib/google/vtt-parser";

// ---------------------------------------------------------------------------
// Test samples
// ---------------------------------------------------------------------------

const SAMPLE_VTT = `WEBVTT

00:00:01.000 --> 00:00:05.000
Speaker 1: Hello, welcome to the interview.

00:00:06.000 --> 00:00:10.000
Speaker 2: Thank you for having me.

00:00:11.000 --> 00:00:20.000
Speaker 1: Let's start with your background.
Can you tell me about your experience?`;

const SAMPLE_SBV = `0:00:01.000,0:00:05.000
Hello, welcome to the interview.

0:00:06.000,0:00:10.000
Thank you for having me.

0:00:11.000,0:00:20.000
Let's start with your background.
Can you tell me about your experience?`;

const SAMPLE_VTT_WITH_NOTES = `WEBVTT

NOTE
This is a comment block that should be skipped.

00:00:01.000 --> 00:00:05.000
Speaker 1: Hello, welcome to the interview.

NOTE Another note

00:00:06.000 --> 00:00:10.000
Speaker 2: Thank you for having me.`;

// ---------------------------------------------------------------------------
// parseVTT
// ---------------------------------------------------------------------------

describe("parseVTT", () => {
  it("parses WebVTT into segments", () => {
    const result = parseVTT(SAMPLE_VTT);

    expect(result.segments).toHaveLength(3);

    expect(result.segments[0]).toEqual({
      start: "00:00:01.000",
      end: "00:00:05.000",
      speaker: "Speaker 1",
      text: "Hello, welcome to the interview.",
    });

    expect(result.segments[1]).toEqual({
      start: "00:00:06.000",
      end: "00:00:10.000",
      speaker: "Speaker 2",
      text: "Thank you for having me.",
    });

    expect(result.segments[2]).toEqual({
      start: "00:00:11.000",
      end: "00:00:20.000",
      speaker: "Speaker 1",
      text: "Let's start with your background.\nCan you tell me about your experience?",
    });
  });

  it("assembles plain text from all segments", () => {
    const result = parseVTT(SAMPLE_VTT);

    expect(result.plainText).toBe(
      "Hello, welcome to the interview.\n" +
        "Thank you for having me.\n" +
        "Let's start with your background.\nCan you tell me about your experience?",
    );
  });

  it("extracts speaker labels when present", () => {
    const result = parseVTT(SAMPLE_VTT);

    expect(result.segments[0].speaker).toBe("Speaker 1");
    expect(result.segments[1].speaker).toBe("Speaker 2");
    expect(result.segments[2].speaker).toBe("Speaker 1");
  });

  it("handles empty input", () => {
    expect(parseVTT("")).toEqual({ segments: [], plainText: "" });
    expect(parseVTT("  ")).toEqual({ segments: [], plainText: "" });
  });

  it("handles VTT with NOTE blocks (skips them)", () => {
    const result = parseVTT(SAMPLE_VTT_WITH_NOTES);

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].speaker).toBe("Speaker 1");
    expect(result.segments[0].text).toBe("Hello, welcome to the interview.");
    expect(result.segments[1].speaker).toBe("Speaker 2");
    expect(result.segments[1].text).toBe("Thank you for having me.");
  });
});

// ---------------------------------------------------------------------------
// parseSBV
// ---------------------------------------------------------------------------

describe("parseSBV", () => {
  it("parses SBV format into segments", () => {
    const result = parseSBV(SAMPLE_SBV);

    expect(result.segments).toHaveLength(3);

    expect(result.segments[0]).toEqual({
      start: "0:00:01.000",
      end: "0:00:05.000",
      speaker: "",
      text: "Hello, welcome to the interview.",
    });

    expect(result.segments[1]).toEqual({
      start: "0:00:06.000",
      end: "0:00:10.000",
      speaker: "",
      text: "Thank you for having me.",
    });
  });

  it("handles multiline text in segments", () => {
    const result = parseSBV(SAMPLE_SBV);

    expect(result.segments[2]).toEqual({
      start: "0:00:11.000",
      end: "0:00:20.000",
      speaker: "",
      text: "Let's start with your background.\nCan you tell me about your experience?",
    });
  });
});
