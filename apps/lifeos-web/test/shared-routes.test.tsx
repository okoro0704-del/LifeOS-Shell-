import { describe, expect, it } from "vitest";
import { SharedRoutes } from "../src/routes/sharedRoutes";

describe("shared routes module", () => {
  it("exports SharedRoutes component", () => {
    expect(typeof SharedRoutes).toBe("function");
  });
});
