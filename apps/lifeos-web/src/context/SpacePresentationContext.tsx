import { createContext, useContext } from 'react';

/** Bridges Space presentation to existing experience overlays; owns no media. */
export const SpacePresentationContext = createContext({ spaceMode: false, interactionsOpen: false });
export const useSpacePresentation = () => useContext(SpacePresentationContext);
