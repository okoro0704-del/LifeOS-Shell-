import { createContext, useContext } from 'react';
import type { ExperienceMode } from '../lib/experienceMode';

/** Bridges Space presentation to existing experience overlays; owns no media. */
export const SpacePresentationContext = createContext<{ experienceMode: ExperienceMode; spaceMode: boolean; interactionsOpen: boolean }>({ experienceMode: 'APP', spaceMode: false, interactionsOpen: false });
export const useSpacePresentation = () => useContext(SpacePresentationContext);
