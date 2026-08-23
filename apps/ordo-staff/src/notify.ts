import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/** Sets the foreground handler + Android channel. Does NOT prompt for permission. */
export function configureNotifications() {
  if (Platform.OS === "web") return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("orders", {
        name: "New orders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch {
    /* ignore */
  }
}

/** Request notification permission — only called from a user toggle in Settings. */
export async function enableNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  } catch {
    return false;
  }
}

export async function notifyNewOrder(orderNumber: number, detail: string) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `New order #${orderNumber}`,
        body: detail,
        sound: "default",
      },
      trigger: null,
    });
  } catch {
    /* ignore */
  }
}
