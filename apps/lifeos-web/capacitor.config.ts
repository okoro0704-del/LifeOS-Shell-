import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lifeos.mobile",
  appName: "LifeOS",
  webDir: "dist",
  server: {
    androidScheme: "https",
    iosScheme: "https",
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
