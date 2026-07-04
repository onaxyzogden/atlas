/**
 * /v3/project/:projectId/report — Project Report.
 *
 * "Generate Summary" reveals an on-screen summary that aggregates
 * verdict + scores + blockers + actions.
 *
 *   - "Download PDF" calls the server-side Puppeteer renderer
 *     (`api.exports.generate` → `capital_partner_summary`) and opens
 *     the stored PDF. Browser Print is kept as an offline fallback.
 *   - "Download Markdown" exports the same payload as a `.md` file.
 *   - "Publish view-only link" generates + publishes a frozen
 *     capital_partner_summary snapshot and copies a tokenized,
 *     unauthenticated `/report-share/:token` link (no recipient
 *     login). The PDF streams through the API gated by token secrecy
 *     + a `reportShare.published` flag; "Unpublish" revokes it
 *     immediately. Reuses the audited `project_portals` token model.
 */

import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import PageHeader from "../components/PageHeader.js";
import { useV3Project } from "../data/useV3Project.js";
import { api } from "../../lib/apiClient.js";
import { useServerProjectId } from "../../hooks/useServerProjectId.js";
import { DEMO_OFFLINE_ENABLED } from "../../app/demoSession.js";
import { downloadProjectReport } from "../data/generateProjectReport.js";
import { formatLocationArea } from "../data/parcelIntegrity.js";
import type { ProjectScores } from "../types.js";
import StageShell from "../_shell/StageShell.js";
import ReportStageGateOverlay from "./ReportStageGateOverlay.js";
import css from "./ReportPage.module.css";

const SCORE_KEYS: Array<{ key: keyof ProjectScores; label: string }> = [
  { key: "landFit", label: "Land Fit" },
  { key: "water", label: "Water" },
  { key: "regulation", label: "Regulation" },
  { key: "access", label: "Access" },
  { key: "financial", label: "Financial" },
  { key: "designCompleteness", label: "Design" },
];

export default function ReportPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);
  const [generated, setGenerated] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePublished, setSharePublished] = useState(false);
  // Portfolio navigates with the LOCAL project id; the exports/portal APIs
  // address the SERVER UUID (H4, deep-audit 2026-07-03). Null → not synced.
  const serverProjectId = useServerProjectId(params.projectId);

  if (!project) {
    return (
      <StageShell
        canvasLabel="Report canvas"
        canvas={<p className={css.empty}>No project loaded.</p>}
      />
    );
  }

  const onServerPdf = async () => {
    if (pdfBusy || serverProjectId === null) return;
    setPdfBusy(true);
    try {
      const { data } = await api.exports.generate(serverProjectId, {
        exportType: "capital_partner_summary",
      });
      window.open(data.storageUrl, "_blank");
    } catch (err) {
      console.error("Server PDF export failed", err);
      setShareToast("PDF export failed — check connection / project sync");
      window.setTimeout(() => setShareToast(null), 3000);
    } finally {
      setPdfBusy(false);
    }
  };

  const flashToast = (msg: string, ms = 3000) => {
    setShareToast(msg);
    window.setTimeout(() => setShareToast(null), ms);
  };

  // Generate + publish a frozen view-only snapshot, then copy the
  // public /report-share/<token> link. No recipient login required;
  // the link only ever exposes the frozen capital-partner PDF.
  const onPublishShare = async () => {
    if (shareBusy || serverProjectId === null) return;
    setShareBusy(true);
    try {
      const { data } = await api.portal.publishReport(serverProjectId);
      const url = `${window.location.origin}/report-share/${data.shareToken}`;
      setSharePublished(true);
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          flashToast("View-only link published & copied");
        } else {
          flashToast(url, 6000);
        }
      } catch {
        flashToast(url, 6000);
      }
    } catch (err) {
      console.error("Publish view-only link failed", err);
      flashToast("Publish failed — check connection / project sync");
    } finally {
      setShareBusy(false);
    }
  };

  const onUnpublishShare = async () => {
    if (shareBusy || serverProjectId === null) return;
    setShareBusy(true);
    try {
      await api.portal.unpublishReport(serverProjectId);
      setSharePublished(false);
      flashToast("View-only link unpublished");
    } catch (err) {
      console.error("Unpublish view-only link failed", err);
      flashToast("Unpublish failed — check connection");
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <StageShell canvasLabel="Report canvas" canvas={
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
    <div className={css.page}>
      <PageHeader
        eyebrow="Report"
        title="Project Report"
        subtitle="Generate and share the project summary — verdict, scores, blockers, and next actions."
        actions={
          <div className={css.headerActions}>
            <button
              type="button"
              className={`${css.btn} ${css.btnPrimary}`}
              onClick={() => setGenerated(true)}
            >
              {generated ? "Regenerate Summary" : "Generate Summary"}
            </button>
            <button
              type="button"
              className={css.btn}
              onClick={() => downloadProjectReport(project)}
              disabled={!generated}
              title="Download a Markdown copy of this report"
            >
              Download Markdown
            </button>
            <button
              type="button"
              className={css.btn}
              onClick={onServerPdf}
              disabled={!generated || pdfBusy || DEMO_OFFLINE_ENABLED || serverProjectId === null}
              title={
                DEMO_OFFLINE_ENABLED
                  ? "Server-rendered PDF isn't available in the offline demo — use Download Markdown or Print"
                  : serverProjectId === null
                    ? "Save this project to the server to enable PDF export — use Download Markdown or Print meanwhile"
                    : "Generate a server-rendered PDF (capital partner summary)"
              }
            >
              {pdfBusy ? "Generating PDF…" : "Download PDF"}
            </button>
            <button
              type="button"
              className={css.btn}
              onClick={() => window.print()}
              disabled={!generated}
              title="Browser print dialog — fallback if server PDF is unavailable"
            >
              Print
            </button>
            <button
              type="button"
              className={css.btn}
              onClick={onPublishShare}
              disabled={!generated || shareBusy || DEMO_OFFLINE_ENABLED || serverProjectId === null}
              title={
                DEMO_OFFLINE_ENABLED
                  ? "Publishing a view-only link needs the OLOS backend — not available in the offline demo"
                  : serverProjectId === null
                    ? "Save this project to the server to enable publishing a view-only link"
                    : "Publish a tokenized, view-only link (no recipient login)"
              }
            >
              {shareBusy
                ? "Publishing…"
                : shareToast ?? "Publish view-only link"}
            </button>
            {sharePublished && (
              <button
                type="button"
                className={css.btn}
                onClick={onUnpublishShare}
                disabled={shareBusy}
                title="Revoke the view-only link immediately"
              >
                Unpublish
              </button>
            )}
          </div>
        }
      />

      {!generated ? (
        <section className={css.placeholder} aria-label="Report placeholder">
          <p className={css.placeholderTitle}>Ready to generate.</p>
          <p className={css.placeholderText}>
            Click <strong>Generate Summary</strong> to compile the verdict, six scores,
            blocking issues, and next actions. Once generated you can download the
            report as Markdown, print to PDF, or copy a shareable link.
          </p>
        </section>
      ) : (
        <article className={css.summary} aria-label="Project summary">
          <header className={css.summaryHeader}>
            <span className={css.eyebrow}>Project Summary · Generated just now</span>
            <h2 className={css.summaryTitle}>{project.name}</h2>
            <p className={css.summaryMeta}>
              {project.location.region} · {formatLocationArea(project.location)}
            </p>
          </header>

          <section className={css.block}>
            <h3 className={css.blockTitle}>Verdict</h3>
            <div className={css.verdictRow}>
              <span className={css.verdictScore}>{project.verdict.score}</span>
              <div className={css.verdictBody}>
                <span className={css.verdictLabel}>{project.verdict.label}</span>
                <p className={css.verdictSummary}>{project.verdict.summary}</p>
              </div>
            </div>
          </section>

          <section className={css.block}>
            <h3 className={css.blockTitle}>Scores</h3>
            <ul className={css.scoreList}>
              {SCORE_KEYS.map(({ key, label }) => {
                const s = project.scores[key];
                return (
                  <li key={key} className={css.scoreRow}>
                    <span className={css.scoreLabel}>{label}</span>
                    <span className={css.scoreBar}>
                      <span className={css.scoreFill} style={{ width: `${s.value}%` }} />
                    </span>
                    <span className={css.scoreValue}>{s.value}</span>
                    <span className={css.scoreNote}>{s.label}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={css.block}>
            <h3 className={css.blockTitle}>
              Blocking Issues <span className={css.count}>({project.blockers.length})</span>
            </h3>
            {project.blockers.length === 0 ? (
              <p className={css.muted}>No blocking issues.</p>
            ) : (
              <ol className={css.blockerList}>
                {project.blockers.map((b) => (
                  <li key={b.id} className={css.blockerItem}>
                    <div className={css.blockerHead}>
                      <span className={`${css.severity} ${css[`sev-${b.severity}`]}`}>{b.severity}</span>
                      <span className={css.blockerTitle}>{b.title}</span>
                    </div>
                    <p className={css.blockerText}>{b.description}</p>
                    <p className={css.blockerAction}><strong>Recommended:</strong> {b.recommendedAction}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={css.block}>
            <h3 className={css.blockTitle}>
              Next Actions <span className={css.count}>({project.actions.length})</span>
            </h3>
            <ul className={css.actionList}>
              {project.actions.map((a) => (
                <li key={a.id} className={css.actionItem}>
                  <span className={`${css.actionDot} ${css[`act-${a.status}`]}`} />
                  <span className={css.actionTitle}>{a.title}</span>
                  {a.dueLabel && <span className={css.actionDue}>{a.dueLabel}</span>}
                </li>
              ))}
            </ul>
          </section>

          <footer className={css.summaryFooter}>
            <span>OGDEN Atlas · {project.shortLabel}</span>
            <span>Use Download PDF or Download Markdown to export</span>
          </footer>
        </article>
      )}
    </div>
    <ReportStageGateOverlay projectId={params.projectId ?? null} />
    </div>
    } />
  );
}
