import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/** Local push for new orders (works in a development build; Expo Go limits push). */
export async function setupNotifications() {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return;
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("orders", {
        name: "New orders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    /* ignore */
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
