import { describe, it, expect } from "vitest";
import { interpolateTemplate } from "@/lib/admin/email-interpolation";

describe("interpolateTemplate", () => {
  it("replaces known variables", () => {
    expect(
      interpolateTemplate("Hello {{name}}, welcome to {{company}}!", {
        name: "Jane",
        company: "Axil",
      }),
    ).toBe("Hello Jane, welcome to Axil!");
  });

  it("leaves unknown variables unchanged", () => {
    expect(
      interpolateTemplate("Hello {{name}}, your {{unknown}} is ready", {
        name: "Jane",
      }),
    ).toBe("Hello Jane, your {{unknown}} is ready");
  });

  it("handles empty template", () => {
    expect(interpolateTemplate("", { name: "Jane" })).toBe("");
  });

  it("handles empty variables", () => {
    expect(interpolateTemplate("Hello {{name}}", {})).toBe("Hello {{name}}");
  });

  it("handles template with no variables", () => {
    expect(interpolateTemplate("No variables here", { name: "Jane" })).toBe(
      "No variables here",
    );
  });

  it("handles multiple occurrences of same variable", () => {
    expect(
      interpolateTemplate("{{name}} and {{name}} again", { name: "Jane" }),
    ).toBe("Jane and Jane again");
  });
});
