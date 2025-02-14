//components/NotificationPermission
"use client";

import { useEffect } from "react";
import { requestNotificationPermission } from "@/lib/notifications";

export default function NotificationPermission() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return null; // Kein UI-Element notwendig
}