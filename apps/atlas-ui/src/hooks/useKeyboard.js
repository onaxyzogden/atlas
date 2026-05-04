import { useEffect } from "react";

export function useKeyboard(key, handler, deps = []) {
  useEffect(() => {
    const onKey = (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (key === "mod+k" && isMeta && e.key === "k") {
        e.preventDefault();
        handler(e);
      } else if (key === "mod+i" && isMeta && e.key === "i") {
        e.preventDefault();
        handler(e);
      } else if (key === "Escape" && e.key === "Escape") {
        handler(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
