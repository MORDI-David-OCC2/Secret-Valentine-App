import { useEffect } from "react";

export function Toast({
  message,
  show,
  onHide,
  duration = 2500,
}: {
  message: string;
  show: boolean;
  onHide: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(onHide, duration);
    return () => window.clearTimeout(t);
  }, [show, onHide, duration]);

  return <div className={`toast ${show ? "show" : ""}`}>{message}</div>;
}