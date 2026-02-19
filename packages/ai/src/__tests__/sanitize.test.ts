import { describe, it, expect } from "vitest";
import { sanitizeInput, wrapUserContent } from "../sanitize";

describe("sanitizeInput", () => {
  it("passes through normal text", () => {
    expect(sanitizeInput("Hello World")).toBe("Hello World");
  });

  it("preserves newlines", () => {
    expect(sanitizeInput("Line 1\nLine 2")).toBe("Line 1\nLine 2");
  });

  it("preserves tabs", () => {
    expect(sanitizeInput("Col1\tCol2")).toBe("Col1\tCol2");
  });

  it("strips null bytes", () => {
    expect(sanitizeInput("Hello\x00World")).toBe("HelloWorld");
  });

  it("strips control chars 0x01-0x08", () => {
    expect(sanitizeInput("A\x01B\x02C\x03D\x04E\x05F\x06G\x07H\x08I")).toBe("ABCDEFGHI");
  });

  it("strips vertical tab (0x0B)", () => {
    expect(sanitizeInput("Hello\x0BWorld")).toBe("HelloWorld");
  });

  it("strips form feed (0x0C)", () => {
    expect(sanitizeInput("Hello\x0CWorld")).toBe("HelloWorld");
  });

  it("strips chars 0x0E-0x1F", () => {
    expect(sanitizeInput("A\x0EB\x0FC\x10D\x1FE")).toBe("ABCDE");
  });

  it("strips DEL char (0x7F)", () => {
    expect(sanitizeInput("Hello\x7FWorld")).toBe("HelloWorld");
  });

  it("preserves carriage return (0x0D)", () => {
    // CR is part of CRLF line endings — should be preserved
    expect(sanitizeInput("Line1\r\nLine2")).toBe("Line1\r\nLine2");
  });

  it("handles empty string", () => {
    expect(sanitizeInput("")).toBe("");
  });

  it("handles string with only control chars", () => {
    expect(sanitizeInput("\x00\x01\x02")).toBe("");
  });

  it("preserves unicode characters", () => {
    expect(sanitizeInput("Café résumé naïve")).toBe("Café résumé naïve");
  });

  it("preserves emoji", () => {
    expect(sanitizeInput("Hello 🌍")).toBe("Hello 🌍");
  });

  it("handles very long strings", () => {
    const long = "A".repeat(100000);
    expect(sanitizeInput(long)).toBe(long);
  });

  it("strips mixed control characters from real-world attack", () => {
    const attack = "Engineer\x00; DROP TABLE users; --\x01\x02";
    const result = sanitizeInput(attack);
    expect(result).toBe("Engineer; DROP TABLE users; --");
    expect(result).not.toContain("\x00");
  });
});

describe("wrapUserContent", () => {
  it("wraps content in XML-style delimiters", () => {
    const result = wrapUserContent("role", "Software Engineer");
    expect(result).toBe("<role>\nSoftware Engineer\n</role>");
  });

  it("sanitizes content before wrapping", () => {
    const result = wrapUserContent("input", "Hello\x00World");
    expect(result).toBe("<input>\nHelloWorld\n</input>");
    expect(result).not.toContain("\x00");
  });

  it("handles empty content", () => {
    const result = wrapUserContent("data", "");
    expect(result).toBe("<data>\n\n</data>");
  });

  it("handles multi-line content", () => {
    const result = wrapUserContent("text", "Line 1\nLine 2\nLine 3");
    expect(result).toContain("Line 1\nLine 2\nLine 3");
    expect(result).toMatch(/^<text>\n/);
    expect(result).toMatch(/\n<\/text>$/);
  });
});
