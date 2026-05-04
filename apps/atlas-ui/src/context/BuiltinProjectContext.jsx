import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { siteBanner as staticBanner, breadcrumbStem as staticStem } from "../data/builtin-sample.js";
import { useToast } from "../components/primitives/index.js";

const BuiltinProjectContext = createContext(null);

function deriveProjectBanner(project) {
  const countryLabel = project.country === "CA" ? "Canada" : project.country;
  const location = [project.metadata?.county, project.provinceState, countryLabel]
    .filter(Boolean)
    .join(", ");
  return {
    siteName: project.name,
    location,
    elevationRange: staticBanner.elevationRange,
    projectStart: new Date(project.createdAt).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" }),
    lastUpdatedAbsolute: new Date(project.updatedAt).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" }),
    lastUpdatedBy: staticBanner.lastUpdatedBy,
    syncStatus: staticBanner.syncStatus
  };
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  const body = await r.json();
  return body.data ?? null;
}

export function BuiltinProjectProvider({ children }) {
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [projectsData, assessmentData] = await Promise.all([
        fetchJson("/api/v1/projects/builtins"),
        fetchJson("/api/v1/projects/builtins/assessment"),
      ]);
      setProject(projectsData?.[0] ?? null);
      setAssessment(assessmentData ?? null);
      setStatus("ready");
    } catch (err) {
      setError(err);
      setStatus("error");
      toast.error("Could not load project data — using sample fallback.");
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const siteBanner = project ? deriveProjectBanner(project) : staticBanner;
  const breadcrumbStem = project
    ? ["Projects", project.name, "Roots & Diagnosis"]
    : staticStem;

  return (
    <BuiltinProjectContext.Provider value={{
      project,
      assessment,
      siteBanner,
      breadcrumbStem,
      status,
      error,
      retry: load,
    }}>
      {children}
    </BuiltinProjectContext.Provider>
  );
}

export function useBuiltinProject() {
  return useContext(BuiltinProjectContext);
}
