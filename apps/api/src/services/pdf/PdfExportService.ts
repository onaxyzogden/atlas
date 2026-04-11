/**
 * PdfExportService — orchestrates data gathering, template rendering,
 * Puppeteer PDF generation, and S3 upload for project exports.
 */

import type postgres from 'postgres';
import type { ExportType, CreateExportInput } from '@ogden/shared';
import { getBrowser } from './browserManager.js';
import { getStorageProvider } from '../storage/StorageProvider.js';
import { TEMPLATE_REGISTRY, type ExportDataBag, type ProjectRow, type AssessmentRow, type LayerRow, type DesignFeatureRow } from './templates/index.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

export interface ExportResult {
  id: string;
  projectId: string;
  exportType: string;
  storageUrl: string;
  generatedAt: string;
}

export class PdfExportService {
  constructor(
    private readonly db: postgres.Sql,
    private readonly userId: string,
  ) {}

  async generate(
    projectId: string,
    exportType: ExportType,
    payload?: CreateExportInput['payload'],
  ): Promise<ExportResult> {
    // 1. Fetch all data in parallel
    const [project, assessment, layers, designFeatures] = await Promise.all([
      this.fetchProject(projectId),
      this.fetchAssessment(projectId),
      this.fetchLayers(projectId),
      this.fetchDesignFeatures(projectId),
    ]);

    // 2. Select template and render HTML
    const templateFn = TEMPLATE_REGISTRY[exportType];
    const dataBag: ExportDataBag = {
      project,
      assessment,
      layers,
      designFeatures,
      payload,
      generatedAt: new Date().toISOString(),
    };

    const html = templateFn(dataBag);

    // 3. Render PDF via Puppeteer
    const pdfBuffer = await this.renderPdf(html);

    // 4. Upload to storage
    const timestamp = Date.now();
    const storageKey = `projects/${projectId}/exports/${exportType}_${timestamp}.pdf`;
    const storage = getStorageProvider();
    const storageUrl = await storage.upload(storageKey, pdfBuffer, 'application/pdf');

    // 5. Record in database
    const generatedAt = new Date().toISOString();
    const rows = await this.db`
      INSERT INTO project_exports (
        project_id, export_type, storage_url, generated_at, generated_by
      ) VALUES (
        ${projectId}, ${exportType}, ${storageUrl}, ${generatedAt}, ${this.userId}
      )
      RETURNING id, project_id, export_type, storage_url, generated_at
    `;
    const record = rows[0]!;

    return {
      id: record.id as string,
      projectId: record.project_id as string,
      exportType: record.export_type as string,
      storageUrl: record.storage_url as string,
      generatedAt: record.generated_at as string,
    };
  }

  // ─── Data fetchers ──────────────────────────────────────────────

  private async fetchProject(projectId: string): Promise<ProjectRow> {
    const [row] = await this.db`
      SELECT
        p.id, p.name, p.description, p.project_type, p.country,
        p.province_state, p.address, p.parcel_id, p.acreage,
        p.data_completeness_score,
        p.owner_notes, p.zoning_notes, p.access_notes,
        p.water_rights_notes, p.climate_region, p.bioregion,
        p.restrictions_covenants,
        p.created_at, p.updated_at,
        p.owner_id
      FROM projects p
      WHERE p.id = ${projectId}
    `;

    if (!row) throw new NotFoundError('Project', projectId);
    if (row.owner_id !== this.userId) throw new ForbiddenError('You do not own this project');

    return row as unknown as ProjectRow;
  }

  private async fetchAssessment(projectId: string): Promise<AssessmentRow | null> {
    const [row] = await this.db`
      SELECT
        sa.id, sa.suitability_score, sa.buildability_score,
        sa.water_resilience_score, sa.ag_potential_score, sa.overall_score,
        sa.score_breakdown, sa.flags, sa.data_sources_used,
        sa.confidence, sa.needs_site_visit
      FROM site_assessments sa
      WHERE sa.project_id = ${projectId}
        AND sa.is_current = true
      ORDER BY sa.computed_at DESC
      LIMIT 1
    `;

    return (row as unknown as AssessmentRow) ?? null;
  }

  private async fetchLayers(projectId: string): Promise<LayerRow[]> {
    const rows = await this.db`
      SELECT
        pl.layer_type, pl.fetch_status, pl.confidence,
        pl.source_api, pl.attribution_text, pl.geojson_data
      FROM project_layers pl
      WHERE pl.project_id = ${projectId}
      ORDER BY pl.layer_type
    `;

    return rows as unknown as LayerRow[];
  }

  private async fetchDesignFeatures(projectId: string): Promise<DesignFeatureRow[]> {
    const rows = await this.db`
      SELECT
        df.id, df.feature_type, df.subtype, df.label,
        df.properties, df.phase_tag,
        ST_AsGeoJSON(df.geometry)::text AS geometry_json,
        df.sort_order
      FROM design_features df
      WHERE df.project_id = ${projectId}
      ORDER BY df.sort_order, df.created_at
    `;

    return rows as unknown as DesignFeatureRow[];
  }

  // ─── PDF rendering ──────────────────────────────────────────────

  private async renderPdf(html: string): Promise<Buffer> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });

      const pdfUint8 = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="width:100%;font-size:7pt;font-family:'Fira Sans',sans-serif;color:#9CA3AF;
            padding:0 15mm;display:flex;justify-content:space-between">
            <span>OGDEN Atlas</span>
            <span></span>
          </div>`,
        footerTemplate: `
          <div style="width:100%;font-size:7pt;font-family:'Fira Sans',sans-serif;color:#9CA3AF;
            padding:0 15mm;display:flex;justify-content:space-between">
            <span>Confidential — For planning purposes only</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>`,
      });

      return Buffer.from(pdfUint8);
    } finally {
      await page.close();
    }
  }
}
