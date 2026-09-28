import React, { useEffect, useState } from "react";
import { AppAlert, type AlertType } from "@/components/AppAlert";

type Action = { text: string; onPress?: () => void; style?: "cancel" | "destructive" | "default" };
type Notice = { title: string; message?: string; actions: Action[]; type: AlertType };
const queue: Notice[] = [];
let notify: (() => void) | undefined;

function enqueue(notice: Notice) {
  queue.push(notice);
  notify?.();
}

/** App-wide replacement for React Native's Alert.alert, including action callbacks. */
export const Alert = {
  alert(title: string, message?: string, buttons?: Action[]) {
    const actions = buttons?.length ? buttons : [{ text: "OK" }];
    const type: AlertType = actions.length > 1 ? "confirm" :
      /error|fail|unable|invalid|unavailable|denied/i.test(title) ? "error" :
      /success|saved|updated|copied|sent|changed/i.test(title) ? "success" : "info";
    enqueue({ title, message, actions, type });
  },
};

export function showMessage(message: unknown) {
  Alert.alert("Notice", String(message ?? ""));
}

export function GlobalAlert() {
  const [active, setActive] = useState<Notice | null>(null);
  useEffect(() => {
    notify = () => setActive((current) => current ?? queue.shift() ?? null);
    notify();
    return () => { notify = undefined; };
  }, []);
  const close = (action?: Action) => {
    setActive(null);
    // Let the modal close before another message or navigation starts.
    setTimeout(() => {
      action?.onPress?.();
      setActive(queue.shift() ?? null);
    }, 250);
  };
  return <AppAlert
    visible={!!active}
    type={active?.type}
    title={active?.title ?? ""}
    message={active?.message}
    actions={active?.actions.map((action) => ({ ...action, onPress: () => close(action) }))}
    onCancel={() => close(active?.actions.find((action) => action.style === "cancel"))}
  />;
}
