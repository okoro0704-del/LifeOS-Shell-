import type { ComponentType, SVGProps } from "react";
import { IconLink } from "@lifeos/ui";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/**
 * Canonical LifeOS Space Switcher visual — same primitive in Personal and Business.
 * Business Space established IconLink as the shared mark.
 */
export const SpaceSwitcherIcon: IconComp = IconLink;
