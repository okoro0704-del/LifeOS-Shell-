/** Installing/opening an app never grants Space capabilities; presentation is explicit. */
export const EXPERIENCE_MODES = ["APP", "SPACE"] as const;
export type ExperienceMode = (typeof EXPERIENCE_MODES)[number];
export function isSpaceExperience(mode: ExperienceMode): boolean { return mode === "SPACE"; }
export function nextExperienceMode(_current: ExperienceMode, target: ExperienceMode): ExperienceMode { return target; }
