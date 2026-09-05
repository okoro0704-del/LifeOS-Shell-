import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";

export const isMobileApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getMobilePlatform = (): string => {
  return Capacitor.getPlatform();
};

export const triggerWorkspaceHaptic = async () => {
  if (isMobileApp()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (err) {
      console.warn("Haptics unsupported:", err);
    }
  }
};

export const configureMobileStatusBar = async (isDarkMode: boolean) => {
  if (isMobileApp()) {
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light });
    } catch (err) {
      console.warn("StatusBar configuration failed:", err);
    }
  }
};
