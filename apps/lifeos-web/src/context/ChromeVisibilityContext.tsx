import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

type ChromeCtx = {
  chromeHidden: boolean;
  setChromeHidden: (hidden: boolean) => void;
  reportScroll: (scrollTop: number, prevScrollTop: number) => void;
};

const ChromeContext = createContext<ChromeCtx | null>(null);

/** Hides top section chrome + bottom nav while scrolling down; shows again scrolling up. */
export function ChromeVisibilityProvider({ children }: { children: ReactNode }) {
  const [chromeHidden, setChromeHidden] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setChromeHidden(false);
  }, [location.pathname]);

  const reportScroll = useCallback((scrollTop: number, prevScrollTop: number) => {
    const delta = scrollTop - prevScrollTop;
    if (scrollTop < 48) {
      setChromeHidden(false);
      return;
    }
    if (delta > 8) setChromeHidden(true);
    else if (delta < -8) setChromeHidden(false);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("lifeos-chrome-hidden", chromeHidden);
    return () => document.documentElement.classList.remove("lifeos-chrome-hidden");
  }, [chromeHidden]);

  const value = useMemo(
    () => ({ chromeHidden, setChromeHidden, reportScroll }),
    [chromeHidden, reportScroll],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChromeVisibility() {
  const ctx = useContext(ChromeContext);
  if (!ctx) {
    return {
      chromeHidden: false,
      setChromeHidden: () => undefined,
      reportScroll: () => undefined,
    };
  }
  return ctx;
}
