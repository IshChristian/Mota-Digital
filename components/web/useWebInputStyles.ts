import { useEffect } from "react";
import { Platform } from "react-native";
import type { ThemeColors } from "@/context/ThemeContext";

const STYLE_ID = "mota-web-inputs";
const TEXT_INPUTS = "input:not([type=checkbox]):not([type=radio]):not([type=range])";

/**
 * Browser-only input styling the app can't express with React Native styles:
 * - no browser focus ring when a field is clicked (the caret already shows focus);
 * - in dark mode, no light border around text fields or the box that wraps them;
 * - Chrome's autofill keeps the field's own colours instead of a white box.
 */
export function useWebInputStyles(colors: ThemeColors, isDark: boolean) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    const darkBorders = isDark
      ? `${TEXT_INPUTS}, textarea, div:has(> ${TEXT_INPUTS}), div:has(> textarea) { border-color: transparent !important; }`
      : "";
    el.textContent = `
      ${TEXT_INPUTS}, textarea, select { outline: none !important; box-shadow: none !important; }
      ${TEXT_INPUTS}:focus, ${TEXT_INPUTS}:focus-visible, textarea:focus, textarea:focus-visible { outline: none !important; box-shadow: none !important; }
      ${darkBorders}
      input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, textarea:-webkit-autofill {
        -webkit-text-fill-color: ${colors.textPrimary} !important;
        caret-color: ${colors.textPrimary};
        -webkit-box-shadow: 0 0 0 1000px ${colors.inputBg} inset !important;
        box-shadow: 0 0 0 1000px ${colors.inputBg} inset !important;
        transition: background-color 9999s ease-out 0s;
      }
    `;
  }, [colors.textPrimary, colors.inputBg, isDark]);
}
