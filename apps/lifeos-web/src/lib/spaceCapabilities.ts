import type { CapabilityRequirement } from "@digiconomy/space-capability-bridge";
export const lifeOsSpaceExperienceCapabilities = {
  TV: [{ id: "space.tv", requirement: "REQUIRED" }],
  RADIO: [{ id: "space.radio", requirement: "REQUIRED" }],
  CALL_DIAGNOSTIC: [{ id: "space.call", requirement: "OPTIONAL" }],
} satisfies Record<string, CapabilityRequirement[]>;
