import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import {
  LivingLifeOsIdentity,
  LIVING_IDENTITY_INTERVAL_MS,
  LIVING_IDENTITY_PHASES,
} from "../src/components/LivingLifeOsIdentity";

vi.mock("../src/hooks/useCommandLayer", () => ({
  useCommandLayer: () => ({
    openCommand: vi.fn(),
    open: false,
    closeCommand: vi.fn(),
    query: "",
    setQuery: vi.fn(),
    commandMode: "ask",
    setCommandMode: vi.fn(),
    preview: null,
    setPreview: vi.fn(),
    lastOutcome: null,
    setLastOutcome: vi.fn(),
    pendingResults: [],
    setPendingResults: vi.fn(),
    sessionId: null,
    setSessionId: vi.fn(),
  }),
}));

describe("LivingLifeOsIdentity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on LifeOS and cycles ASK ME → TASK ME → LifeOS", () => {
    const { container } = render(<LivingLifeOsIdentity />);
    const root = container.querySelector("[data-living-identity]")!;
    expect(root.getAttribute("data-living-phase")).toBe("lifeos");
    expect(LIVING_IDENTITY_PHASES).toEqual(["lifeos", "ask", "task"]);
    expect(LIVING_IDENTITY_INTERVAL_MS).toBe(3000);

    act(() => {
      vi.advanceTimersByTime(LIVING_IDENTITY_INTERVAL_MS);
    });
    expect(root.getAttribute("data-living-phase")).toBe("ask");

    act(() => {
      vi.advanceTimersByTime(LIVING_IDENTITY_INTERVAL_MS);
    });
    expect(root.getAttribute("data-living-phase")).toBe("task");

    act(() => {
      vi.advanceTimersByTime(LIVING_IDENTITY_INTERVAL_MS);
    });
    expect(root.getAttribute("data-living-phase")).toBe("lifeos");
  });

  it("uses one persistent box with fixed-width ghost so TASK ME does not shift layout", () => {
    const { container } = render(<LivingLifeOsIdentity />);
    expect(container.querySelector(".living-lifeos-box")).toBeTruthy();
    expect(container.querySelector(".living-lifeos-box__ghost")?.textContent).toBe("TASK ME");
    expect(container.querySelector(".living-lifeos-box__frame")).toBeTruthy();
    expect(container.querySelectorAll(".living-lifeos-box").length).toBe(1);
  });
});
