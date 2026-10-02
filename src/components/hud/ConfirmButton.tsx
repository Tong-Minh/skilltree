"use client";

import { useEffect, useState, type ReactNode } from "react";

/** A button that needs a second click within a few seconds to fire. */
export function ConfirmButton({
  children,
  confirmLabel = "Confirm?",
  onConfirm,
  disabled,
  className = "hud-button",
}: {
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${className} ${armed ? "hud-button-danger" : ""}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
