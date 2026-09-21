import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import {
  NavigationDockProvider,
  useNavigationDock,
  SHELL_CONFIRM_MS,
  SHELL_IDLE_MS,
} from "../src/context/NavigationDockContext";

vi.mock("../src/context/WorkspaceContext", () => ({
  useWorkspace: () => ({
    mode: "PERSONAL" as const,
    setMode: () => undefined,
    toggleMode: () => undefined,
    activeBusinessId: null,
    setActiveBusinessId: () => undefined,
  }),
}));

function Probe({ onCtx }: { onCtx: (c: ReturnType<typeof useNavigationDock>) => void }) {
  const ctx = useNavigationDock();
  onCtx(ctx);
  return (
    <div data-testid="probe" data-visible={ctx.shellControlsVisible ? "1" : "0"}>
      {ctx.shellControlsVisible ? "open" : "closed"}
    </div>
  );
}

describe("shell timing state machine (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    try {
      sessionStorage.setItem("lifeos.shell.introSeen", "1");
    } catch {
      /* ignore */
    }
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function mount() {
    let latest!: ReturnType<typeof useNavigationDock>;
    const ui = render(
      <NavigationDockProvider>
        <Probe
          onCtx={(c) => {
            latest = c;
          }}
        />
      </NavigationDockProvider>,
    );
    return { ui, get: () => latest };
  }

  it("dismisses ~4000ms after summon with no interaction", () => {
    const { get, ui } = mount();
    act(() => get().open());
    expect(ui.getByTestId("probe").dataset.visible).toBe("1");
    act(() => {
      vi.advanceTimersByTime(SHELL_IDLE_MS - 1);
    });
    expect(ui.getByTestId("probe").dataset.visible).toBe("1");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(ui.getByTestId("probe").dataset.visible).toBe("0");
  });

  it("keeps shell visible ~1000ms after confirmSelection", () => {
    const { get, ui } = mount();
    act(() => get().open());
    act(() => get().confirmSelection());
    expect(ui.getByTestId("probe").dataset.visible).toBe("1");
    act(() => {
      vi.advanceTimersByTime(SHELL_CONFIRM_MS - 1);
    });
    expect(ui.getByTestId("probe").dataset.visible).toBe("1");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(ui.getByTestId("probe").dataset.visible).toBe("0");
  });

  it("confirm preempts idle and rapid re-confirm cancels stale close", () => {
    const { get, ui } = mount();
    act(() => get().open());
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => get().confirmSelection());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => get().confirmSelection());
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(ui.getByTestId("probe").dataset.visible).toBe("1");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(ui.getByTestId("probe").dataset.visible).toBe("0");
  });

  it("noteShellActivity resets idle while not confirming", () => {
    const { get, ui } = mount();
    act(() => get().open());
    act(() => {
      vi.advanceTimersByTime(SHELL_IDLE_MS - 1500);
    });
    act(() => get().noteShellActivity());
    act(() => {
      vi.advanceTimersByTime(SHELL_IDLE_MS - 1500);
    });
    expect(ui.getByTestId("probe").dataset.visible).toBe("1");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(ui.getByTestId("probe").dataset.visible).toBe("0");
  });
});
