import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceOSViewport } from "@lifeos/shell-ui";
import { SERVICEOS_PRESETS, serviceosPresetIcon, type ServiceOSPreset } from "@lifeos/shell-core";
import { createServiceOSShellManifest } from "../src/lib/serviceos";
import { ServiceOSTrackFrame } from "../src/routes/app/serviceos";

const ICONS: Record<ServiceOSPreset, string> = {
  beauty: "✂️",
  wellness: "💆",
  technical: "🛠️",
  culinary: "👨‍🍳",
};

afterEach(() => {
  cleanup();
});

function renderCatalog(preset: ServiceOSPreset = "beauty") {
  const app = createServiceOSShellManifest({
    tenantId: `tenant_${preset}`,
    preset,
    apiBase: "http://localhost:8920",
    trustId: "TD-SERVICE",
  });
  return render(
    <ServiceOSViewport
      app={app}
      tab="catalog"
      preset={preset}
      apiBaseUrl="http://localhost:8920"
      trustIdToken="sess_trust"
      trustId="TD-SERVICE"
    />,
  );
}

describe("serviceos-render (lifeos-web shell)", () => {
  it("renders ServiceOSViewport with preset icons ✂️ 💆 🛠️ 👨‍🍳", () => {
    renderCatalog("beauty");

    expect(screen.getByTestId("serviceos-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("serviceos-active-preset")).toHaveTextContent("✂️");

    for (const preset of SERVICEOS_PRESETS) {
      expect(screen.getByTestId(`serviceos-preset-${preset}`)).toHaveTextContent(ICONS[preset]);
      expect(serviceosPresetIcon(preset)).toBe(ICONS[preset]);
    }
  });

  it("switching the active preset updates /embed/catalog params", async () => {
    const user = userEvent.setup();
    renderCatalog("beauty");

    const embed = screen.getByTestId("serviceos-embed") as HTMLIFrameElement;
    expect(embed.src).toContain("/embed/catalog");
    expect(embed.src).toContain("preset=beauty");
    expect(embed.src).toContain("tenantId=tenant_beauty");
    expect(embed.src).toContain("trustId=sess_trust");
    expect(embed.src.startsWith("http://localhost:8920/")).toBe(true);

    await user.click(screen.getByTestId("serviceos-preset-wellness"));
    expect(screen.getByTestId("serviceos-active-preset")).toHaveTextContent("💆");
    expect((screen.getByTestId("serviceos-embed") as HTMLIFrameElement).src).toContain("preset=wellness");
    expect((screen.getByTestId("serviceos-embed") as HTMLIFrameElement).src).toContain("/embed/catalog");

    await user.click(screen.getByTestId("serviceos-preset-technical"));
    expect(screen.getByTestId("serviceos-active-preset")).toHaveTextContent("🛠️");
    expect((screen.getByTestId("serviceos-embed") as HTMLIFrameElement).src).toContain("preset=technical");

    await user.click(screen.getByTestId("serviceos-preset-culinary"));
    expect(screen.getByTestId("serviceos-active-preset")).toHaveTextContent("👨‍🍳");
    expect((screen.getByTestId("serviceos-embed") as HTMLIFrameElement).src).toContain("preset=culinary");
  });

  it("live tracking route embeds /track/booking/:bookingId in the shell", () => {
    render(
      <ServiceOSTrackFrame
        bookingId="job_doorstep_1"
        tenantId="tenant_beauty"
        trustIdToken="sess_trust"
        trustId="TD-SERVICE"
        apiBase="http://localhost:8920"
      />,
    );

    expect(screen.getByTestId("serviceos-track-page")).toBeInTheDocument();
    const frame = screen.getByTestId("serviceos-track-embed") as HTMLIFrameElement;
    expect(frame.src).toContain("/track/booking/job_doorstep_1");
    expect(frame.src).toContain("tenantId=tenant_beauty");
    expect(frame.src).toContain("trustId=sess_trust");
    expect(frame.src.startsWith("http://localhost:8920/")).toBe(true);
  });
});
