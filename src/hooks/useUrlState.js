import { useEffect } from "react";
import { encodeState, decodeState } from "../utils/url.js";

export function useUrlState({ currentLevels, goalLevels, equipment }) {
  // Update URL when state changes
  useEffect(() => {
    const encoded = encodeState({ currentLevels, goalLevels, equipment });
    const newUrl = encoded
      ? `${window.location.pathname}?${encoded}`
      : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [currentLevels, goalLevels, equipment]);
}

export function getInitialStateFromUrl() {
  return decodeState(window.location.search);
}
