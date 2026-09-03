"use client";

import { useEffect } from "react";

const ANIMATIONS_KEY = "forge-animations";
const CURSOR_KEY = "forge-cursor-effects";

function applyPreferences() {
  const animations = localStorage.getItem(ANIMATIONS_KEY) !== "false";
  const cursorEffects = localStorage.getItem(CURSOR_KEY) !== "false";

  document.documentElement.classList.toggle(
    "forge-disable-animations",
    !animations
  );

  document.documentElement.classList.toggle(
    "forge-disable-cursor",
    !cursorEffects
  );
}

export default function ForgePreferences() {
  useEffect(() => {
    applyPreferences();

    const handlePreferencesChanged = () => {
      applyPreferences();
    };

    window.addEventListener(
      "forge-preferences-changed",
      handlePreferencesChanged
    );

    window.addEventListener("storage", handlePreferencesChanged);

    return () => {
      window.removeEventListener(
        "forge-preferences-changed",
        handlePreferencesChanged
      );

      window.removeEventListener("storage", handlePreferencesChanged);
    };
  }, []);

  return null;
}