//lib/notification.js

export function sendNotification(title, options) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, options);
  }
}

export async function requestNotificationPermission() {
  if ("Notification" in window) {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
}