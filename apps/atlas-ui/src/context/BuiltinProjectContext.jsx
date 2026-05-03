import { createContext, useContext, useEffect, useState } from "react";
import { siteBanner as staticBanner, breadcrumbStem as staticStem } from "../data/builtin-sample.js";

const BuiltinProjectContext = createContext(null);

function deriveProjectBanner(project) {
  const location = [project.provinceState, project.country === "CA" ? "Canada" : project.country]
    .filter(Boolean)
    .join(", ");
  return {
    siteName: project.name,
    location,
    elevationRange: staticBanner.elevationRange,
    projectStart: staticBanner.projectStart,
    lastUpdatedAbsolute: staticBanner.lastUpdatedAbsolute,
    lastUpdatedBy: staticBanner.lastUpdatedBy,
    syncStatus: staticBanner.syncStatus
  };
}

export function BuiltinProjectProvider({ children }) {
  const [project, setProject] = useState(null);

  useEffect(() => {
    fetch("/api/v1/projects/builtins")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((body) => setProject(body.data?.[0] ?? null))
      .catch(() => {});
  }, []);

  const siteBanner = project ? deriveProjectBanner(project) : staticBanner;
  const breadcrumbStem = project
    ? ["Projects", project.name, "Roots & Diagnosis"]
    : staticStem;

  return (
    <BuiltinProjectContext.Provider value={{ project, siteBanner, breadcrumbStem }}>
      {children}
    </BuiltinProjectContext.Provider>
  );
}

export function useBuiltinProject() {
  return useContext(BuiltinProjectContext);
}
