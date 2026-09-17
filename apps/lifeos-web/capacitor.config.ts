import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Production APKs set CAPACITOR_SERVER_URL so the native shell loads the live
 * Netlify origin. Install once; web updates ship OTA on every launch.
 * Dev / local sync leaves this unset and uses bundled `dist/`.
 */
const productionUrl = (process.env.CAPACITOR_SERVER_URL ?? "").trim().replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "com.lifeos.mobile",
  appName: "LifeOS",
  webDir: "dist",
  server: {
    androidScheme: "https",
    iosScheme: "https",
    ...(productionUrl
      ? {
          url: productionUrl,
          cleartext: false,
        }
      : {}),
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
    },
    Keyboard: {
      resize: "body",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
