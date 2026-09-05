export const isDesktopApp = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

export const sendDesktopNotification = async (title: string, body: string) => {
  if (isDesktopApp()) {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import(
        "@tauri-apps/plugin-notification"
      );
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      if (granted) {
        sendNotification({ title, body });
      }
    } catch (err) {
      console.warn("Native notification failed:", err);
    }
    return;
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
};

/** Request OS notification permission when running under Tauri. */
export const ensureDesktopNotificationPermission = async (): Promise<boolean> => {
  if (!isDesktopApp()) {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }
  try {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  } catch {
    return false;
  }
};
