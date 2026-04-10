# Graph Report - .  (2026-04-10)

## Corpus Check
- 193 files · ~112,182 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 453 nodes · 370 edges · 182 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `OGDEN Land Design Atlas` - 13 edges
2. `fetchWithRetry()` - 11 edges
3. `fetchAllLayersInternal()` - 9 edges
4. `DataPipelineOrchestrator` - 8 edges
5. `s()` - 8 edges
6. `Atlas Design System Master` - 8 edges
7. `evaluateRules()` - 7 edges
8. `num()` - 7 edges
9. `computeAssessmentScores()` - 7 edges
10. `layerByType()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Atlas Design System Master` --conceptually_related_to--> `OGDEN Land Design Atlas`  [INFERRED]
  atlas/design-system/ogden-atlas/MASTER.md → atlas/README.md

## Hyperedges (group relationships)
- **Atlas Full-Stack Architecture** — readme_react_typescript_vite, readme_mapboxgl_deckgl, readme_fastify_api, readme_postgresql_postgis, readme_bullmq_redis, readme_supabase_auth, readme_pnpm_turborepo [EXTRACTED 1.00]
- **Four-Phase Development Roadmap** — readme_site_intelligence_phase, readme_design_atlas_phase, readme_collaboration_ai_phase, readme_public_portal_phase [EXTRACTED 1.00]
- **Atlas Visual Identity System** — master_color_palette, master_typography_fira, master_organic_biophilic_style, master_component_specs [EXTRACTED 1.00]

## Communities

### Community 0 - "Geospatial Layer Fetcher"
Cohesion: 0.12
Nodes (33): aafcCodeToDistribution(), dayOfYearToDate(), deriveFallbackStreamOrder(), elevationFromLatitude(), estimateAspect(), fetchAafcLandCover(), fetchAllLayers(), fetchAllLayersInternal() (+25 more)

### Community 1 - "Architecture & Design System"
Cohesion: 0.1
Nodes (23): Anti-Patterns Checklist, Color Palette (Earth Green + Harvest Gold), Community/Forum Landing Page Pattern, Component Specs (Buttons, Cards, Inputs, Modals), Atlas Design System Master, Organic Biophilic Style, Page-Level Override Logic, Typography (Fira Code + Fira Sans) (+15 more)

### Community 2 - "Site Assessment Scoring"
Cohesion: 0.33
Nodes (12): clamp(), computeAssessmentScores(), deriveDataLayerRows(), deriveLandWants(), deriveLiveDataRows(), deriveSiteSummary(), layerByType(), normalizeConfidence() (+4 more)

### Community 3 - "Data Pipeline Orchestrator"
Cohesion: 0.16
Nodes (3): DataPipelineOrchestrator, ManualFlagAdapter, resolveAdapter()

### Community 4 - "API Error Hierarchy"
Cohesion: 0.18
Nodes (5): AppError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError

### Community 5 - "Map Canvas & Drawing"
Cohesion: 0.22
Nodes (2): addAllLayers(), tryAdd()

### Community 6 - "API Route Index"
Cohesion: 0.25
Nodes (0): 

### Community 7 - "Rules Engine (Siting)"
Cohesion: 0.46
Nodes (7): checkAccessRequirements(), checkBoundarySetbacks(), checkGuestPrivacy(), checkInfrastructureDependencies(), checkLivestockSpiritualBuffers(), checkWaterProximity(), evaluateRules()

### Community 8 - "Project React Queries"
Cohesion: 0.25
Nodes (0): 

### Community 9 - "Claude AI Client"
Cohesion: 0.29
Nodes (2): AnalysisGuardrails, ClaudeClient

### Community 10 - "Geo File Parsers"
Cohesion: 0.57
Nodes (6): extractKMLCoords(), extractKMLFromZip(), parseGeoFile(), parseGeoJSON(), parseKML(), parseKMZ()

### Community 11 - "Site Data Store"
Cohesion: 0.4
Nodes (2): getLayer(), getLayerSummary()

### Community 12 - "Tabs UI Component"
Cohesion: 0.6
Nodes (3): TabsList(), TabsPanel(), useTabsContext()

### Community 13 - "Terrain Dashboard"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "Map View Controller"
Cohesion: 0.4
Nodes (0): 

### Community 15 - "Before/After Slider"
Cohesion: 0.4
Nodes (0): 

### Community 16 - "API Client (HTTP)"
Cohesion: 0.4
Nodes (1): ApiError

### Community 17 - "Qibla Computation"
Cohesion: 0.6
Nodes (3): computeQibla(), toDeg(), toRad()

### Community 18 - "Safe LocalStorage"
Cohesion: 0.4
Nodes (0): 

### Community 19 - "Assessment Rule Engine"
Cohesion: 0.6
Nodes (3): buildContext(), evaluateAssessmentRules(), evaluateRule()

### Community 20 - "New Project Wizard"
Cohesion: 0.4
Nodes (0): 

### Community 21 - "Portal Page"
Cohesion: 0.4
Nodes (0): 

### Community 22 - "Case Transform Utils"
Cohesion: 0.6
Nodes (4): camelToSnake(), snakeToCamel(), toCamelCase(), toSnakeCase()

### Community 23 - "Error Boundary"
Cohesion: 0.5
Nodes (0): 

### Community 24 - "Site Intelligence Panel"
Cohesion: 0.5
Nodes (0): 

### Community 25 - "Accordion Component"
Cohesion: 0.5
Nodes (0): 

### Community 26 - "Solar Climate Panel"
Cohesion: 0.5
Nodes (0): 

### Community 27 - "QR Code Generator"
Cohesion: 0.5
Nodes (0): 

### Community 28 - "Hydrology Metrics"
Cohesion: 0.5
Nodes (0): 

### Community 29 - "Icon Sidebar Nav"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "Toast Notifications"
Cohesion: 0.67
Nodes (0): 

### Community 31 - "Map Layers Panel"
Cohesion: 0.67
Nodes (0): 

### Community 32 - "Climate Scenario Overlay"
Cohesion: 1.0
Nodes (2): projectClimate(), shiftDate()

### Community 33 - "Collaboration Panel"
Cohesion: 0.67
Nodes (0): 

### Community 34 - "Ecological Dashboard"
Cohesion: 0.67
Nodes (0): 

### Community 35 - "Project Notes Step"
Cohesion: 0.67
Nodes (0): 

### Community 36 - "Reporting Panel"
Cohesion: 0.67
Nodes (0): 

### Community 37 - "Structure Properties"
Cohesion: 0.67
Nodes (0): 

### Community 38 - "Vision Panel"
Cohesion: 0.67
Nodes (0): 

### Community 39 - "Media Query Hook"
Cohesion: 1.0
Nodes (2): useIsMobile(), useMediaQuery()

### Community 40 - "Geodata Cache"
Cohesion: 1.0
Nodes (2): openDB(), tx()

### Community 41 - "Mock Layer Data"
Cohesion: 0.67
Nodes (0): 

### Community 42 - "Login Page"
Cohesion: 0.67
Nodes (0): 

### Community 43 - "Config"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Commandpalette"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Projecttabbar"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Atlasaipanel"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Timelinepanel"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Button"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Spinner"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Stack"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Stepindicator"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Contextbuilder"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Dashboardview"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Metriccard"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Simplebarchart"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Dashboardplaceholder"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Hydrologydashboard"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Nurseryledgerdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Embedcodemodal"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Projectsummaryexport"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Fieldworkpanel"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Walkrouterecorder"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Livestockpanel"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Domainmapping"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Usemapbox"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Herosection"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Supportcta"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Projecteditor"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Versionhistory"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Regulatorypanel"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Scenariopanel"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Spiritualpanel"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Footprints"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Usekeyboardshortcuts"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Claude"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Projectpage"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Cascadedelete"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Projectstore"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Uistore"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Api Schema"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Migrate"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Auth"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Database"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Redis"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Bcryptjs D"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 87 - "Main"
Cohesion: 1.0
Nodes (0): 

### Community 88 - "App"
Cohesion: 1.0
Nodes (0): 

### Community 89 - "Appshell"
Cohesion: 1.0
Nodes (0): 

### Community 90 - "Slideuppanel"
Cohesion: 1.0
Nodes (0): 

### Community 91 - "Designtoolspanel"
Cohesion: 1.0
Nodes (0): 

### Community 92 - "Educationalatlaspanel"
Cohesion: 1.0
Nodes (0): 

### Community 93 - "Hydrologyrightpanel"
Cohesion: 1.0
Nodes (0): 

### Community 94 - "Badge"
Cohesion: 1.0
Nodes (0): 

### Community 95 - "Card"
Cohesion: 1.0
Nodes (0): 

### Community 96 - "Emptystate"
Cohesion: 1.0
Nodes (0): 

### Community 97 - "Formfield"
Cohesion: 1.0
Nodes (0): 

### Community 98 - "Input"
Cohesion: 1.0
Nodes (0): 

### Community 99 - "Modal"
Cohesion: 1.0
Nodes (0): 

### Community 100 - "Panelloader"
Cohesion: 1.0
Nodes (0): 

### Community 101 - "Skeleton"
Cohesion: 1.0
Nodes (0): 

### Community 102 - "Toggle"
Cohesion: 1.0
Nodes (0): 

### Community 103 - "Tooltip"
Cohesion: 1.0
Nodes (0): 

### Community 104 - "Accesspanel"
Cohesion: 1.0
Nodes (0): 

### Community 105 - "Confidenceindicator"
Cohesion: 1.0
Nodes (0): 

### Community 106 - "Datacompletenesswidget"
Cohesion: 1.0
Nodes (0): 

### Community 107 - "Siteassessmentpanel"
Cohesion: 1.0
Nodes (0): 

### Community 108 - "Terrainanalysisflags"
Cohesion: 1.0
Nodes (0): 

### Community 109 - "Croppanel"
Cohesion: 1.0
Nodes (0): 

### Community 110 - "Dashboardmetrics"
Cohesion: 1.0
Nodes (0): 

### Community 111 - "Dashboardrouter"
Cohesion: 1.0
Nodes (0): 

### Community 112 - "Dashboardsidebar"
Cohesion: 1.0
Nodes (0): 

### Community 113 - "Progressbar"
Cohesion: 1.0
Nodes (0): 

### Community 114 - "Carbondiagnosticdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 115 - "Cartographicdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 116 - "Foresthubdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 117 - "Grazingdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 118 - "Herdrotationdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 119 - "Livestockdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 120 - "Paddockdesigndashboard"
Cohesion: 1.0
Nodes (0): 

### Community 121 - "Plantingtooldashboard"
Cohesion: 1.0
Nodes (0): 

### Community 122 - "Stewardshipdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 123 - "Decisionsupportpanel"
Cohesion: 1.0
Nodes (0): 

### Community 124 - "Economicspanel"
Cohesion: 1.0
Nodes (0): 

### Community 125 - "Advancededucationpanel"
Cohesion: 1.0
Nodes (0): 

### Community 126 - "Educationalbookletexport"
Cohesion: 1.0
Nodes (0): 

### Community 127 - "Investorsummaryexport"
Cohesion: 1.0
Nodes (0): 

### Community 128 - "Hydrologypanel"
Cohesion: 1.0
Nodes (0): 

### Community 129 - "Speciesdata"
Cohesion: 1.0
Nodes (0): 

### Community 130 - "Domainfloatingtoolbar"
Cohesion: 1.0
Nodes (0): 

### Community 131 - "Environmentoverlays"
Cohesion: 1.0
Nodes (0): 

### Community 132 - "Layerpanel"
Cohesion: 1.0
Nodes (0): 

### Community 133 - "Mapstyleswitcher"
Cohesion: 1.0
Nodes (0): 

### Community 134 - "Measuretools"
Cohesion: 1.0
Nodes (0): 

### Community 135 - "Terraincontrols"
Cohesion: 1.0
Nodes (0): 

### Community 136 - "Fieldnotes"
Cohesion: 1.0
Nodes (0): 

### Community 137 - "Gpstracker"
Cohesion: 1.0
Nodes (0): 

### Community 138 - "Moontrancepanel"
Cohesion: 1.0
Nodes (0): 

### Community 139 - "Portalconfigpanel"
Cohesion: 1.0
Nodes (0): 

### Community 140 - "Publicportalshell"
Cohesion: 1.0
Nodes (0): 

### Community 141 - "Interactivemapview"
Cohesion: 1.0
Nodes (0): 

### Community 142 - "Missionoverlay"
Cohesion: 1.0
Nodes (0): 

### Community 143 - "Narrativesections"
Cohesion: 1.0
Nodes (0): 

### Community 144 - "Stagerevealstory"
Cohesion: 1.0
Nodes (0): 

### Community 145 - "Projectdashboard"
Cohesion: 1.0
Nodes (0): 

### Community 146 - "Stepbasicinfo"
Cohesion: 1.0
Nodes (0): 

### Community 147 - "Stepboundary"
Cohesion: 1.0
Nodes (0): 

### Community 148 - "Steplocation"
Cohesion: 1.0
Nodes (0): 

### Community 149 - "Types"
Cohesion: 1.0
Nodes (0): 

### Community 150 - "Wizardnav"
Cohesion: 1.0
Nodes (0): 

### Community 151 - "Rulespanel"
Cohesion: 1.0
Nodes (0): 

### Community 152 - "Sitingrules"
Cohesion: 1.0
Nodes (0): 

### Community 153 - "Templatemarketplace"
Cohesion: 1.0
Nodes (0): 

### Community 154 - "Templatepanel"
Cohesion: 1.0
Nodes (0): 

### Community 155 - "Utilitypanel"
Cohesion: 1.0
Nodes (0): 

### Community 156 - "Zonepanel"
Cohesion: 1.0
Nodes (0): 

### Community 157 - "Mapbox"
Cohesion: 1.0
Nodes (0): 

### Community 158 - "Assessmentrules"
Cohesion: 1.0
Nodes (0): 

### Community 159 - "Homepage"
Cohesion: 1.0
Nodes (0): 

### Community 160 - "Authstore"
Cohesion: 1.0
Nodes (0): 

### Community 161 - "Commentstore"
Cohesion: 1.0
Nodes (0): 

### Community 162 - "Cropstore"
Cohesion: 1.0
Nodes (0): 

### Community 163 - "Fieldworkstore"
Cohesion: 1.0
Nodes (0): 

### Community 164 - "Livestockstore"
Cohesion: 1.0
Nodes (0): 

### Community 165 - "Mapstore"
Cohesion: 1.0
Nodes (0): 

### Community 166 - "Pathstore"
Cohesion: 1.0
Nodes (0): 

### Community 167 - "Phasestore"
Cohesion: 1.0
Nodes (0): 

### Community 168 - "Portalstore"
Cohesion: 1.0
Nodes (0): 

### Community 169 - "Scenariostore"
Cohesion: 1.0
Nodes (0): 

### Community 170 - "Structurestore"
Cohesion: 1.0
Nodes (0): 

### Community 171 - "Templatestore"
Cohesion: 1.0
Nodes (0): 

### Community 172 - "Utilitystore"
Cohesion: 1.0
Nodes (0): 

### Community 173 - "Versionstore"
Cohesion: 1.0
Nodes (0): 

### Community 174 - "Zonestore"
Cohesion: 1.0
Nodes (0): 

### Community 175 - "Datasources"
Cohesion: 1.0
Nodes (0): 

### Community 176 - "Flags"
Cohesion: 1.0
Nodes (0): 

### Community 177 - "Assessment Schema"
Cohesion: 1.0
Nodes (0): 

### Community 178 - "Confidence Schema"
Cohesion: 1.0
Nodes (0): 

### Community 179 - "Layer Schema"
Cohesion: 1.0
Nodes (0): 

### Community 180 - "Project Schema"
Cohesion: 1.0
Nodes (0): 

### Community 181 - "Spiritual Schema"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **13 isolated node(s):** `Phase 2: Design Atlas`, `Phase 3: Collaboration + AI`, `Phase 4: Public + Portal`, `Adapter Registry (dataSources.ts)`, `MapboxGL JS v3 + Deck.gl Map Engine` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Config`** (2 nodes): `config.ts`, `loadConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Commandpalette`** (2 nodes): `CommandPalette.tsx`, `handleKey()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projecttabbar`** (2 nodes): `ProjectTabBar.tsx`, `ProjectTabBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Atlasaipanel`** (2 nodes): `AtlasAIPanel.tsx`, `handleRating()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Timelinepanel`** (2 nodes): `TimelinePanel.tsx`, `handleFilterChange()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button`** (2 nodes): `Button.tsx`, `LoadingSpinner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spinner`** (2 nodes): `Spinner.tsx`, `Spinner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stack`** (2 nodes): `Stack.tsx`, `Stack()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stepindicator`** (2 nodes): `StepIndicator.tsx`, `isClickable()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Contextbuilder`** (2 nodes): `ContextBuilder.ts`, `buildProjectContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboardview`** (2 nodes): `DashboardView.tsx`, `DashboardView()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Metriccard`** (2 nodes): `MetricCard.tsx`, `MetricCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Simplebarchart`** (2 nodes): `SimpleBarChart.tsx`, `SimpleBarChart()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboardplaceholder`** (2 nodes): `DashboardPlaceholder.tsx`, `DashboardPlaceholder()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hydrologydashboard`** (2 nodes): `HydrologyDashboard.tsx`, `healthColor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Nurseryledgerdashboard`** (2 nodes): `NurseryLedgerDashboard.tsx`, `NurseryLedgerDashboard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Embedcodemodal`** (2 nodes): `EmbedCodeModal.tsx`, `handleCopy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projectsummaryexport`** (2 nodes): `ProjectSummaryExport.tsx`, `handlePrint()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fieldworkpanel`** (2 nodes): `FieldworkPanel.tsx`, `handleAddFromMap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Walkrouterecorder`** (2 nodes): `WalkRouteRecorder.tsx`, `formatDuration()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Livestockpanel`** (2 nodes): `LivestockPanel.tsx`, `toggleSpecies()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Domainmapping`** (2 nodes): `domainMapping.ts`, `getDomainContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Usemapbox`** (2 nodes): `useMapbox.ts`, `useMapbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Herosection`** (2 nodes): `HeroSection.tsx`, `HeroSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supportcta`** (2 nodes): `SupportCTA.tsx`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projecteditor`** (2 nodes): `ProjectEditor.tsx`, `handleSave()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Versionhistory`** (2 nodes): `VersionHistory.tsx`, `handleRestore()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Regulatorypanel`** (2 nodes): `RegulatoryPanel.tsx`, `return()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Scenariopanel`** (2 nodes): `ScenarioPanel.tsx`, `handleCreate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spiritualpanel`** (2 nodes): `SpiritualPanel.tsx`, `bearingToCardinal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Footprints`** (2 nodes): `footprints.ts`, `createFootprintPolygon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Usekeyboardshortcuts`** (2 nodes): `useKeyboardShortcuts.ts`, `useKeyboardShortcuts()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Claude`** (2 nodes): `claude.ts`, `sendMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projectpage`** (2 nodes): `ProjectPage.tsx`, `handleDelete()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cascadedelete`** (2 nodes): `cascadeDelete.ts`, `cascadeDeleteProject()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projectstore`** (2 nodes): `projectStore.ts`, `generateId()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Uistore`** (2 nodes): `uiStore.ts`, `applyColorScheme()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Api Schema`** (2 nodes): `api.schema.ts`, `ApiResponse()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Migrate`** (1 nodes): `migrate.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth`** (1 nodes): `auth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Database`** (1 nodes): `database.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Redis`** (1 nodes): `redis.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bcryptjs D`** (1 nodes): `bcryptjs.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Main`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App`** (1 nodes): `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Appshell`** (1 nodes): `AppShell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Slideuppanel`** (1 nodes): `SlideUpPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Designtoolspanel`** (1 nodes): `DesignToolsPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Educationalatlaspanel`** (1 nodes): `EducationalAtlasPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hydrologyrightpanel`** (1 nodes): `HydrologyRightPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Badge`** (1 nodes): `Badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card`** (1 nodes): `Card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Emptystate`** (1 nodes): `EmptyState.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Formfield`** (1 nodes): `FormField.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input`** (1 nodes): `Input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Modal`** (1 nodes): `Modal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Panelloader`** (1 nodes): `PanelLoader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Skeleton`** (1 nodes): `Skeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Toggle`** (1 nodes): `Toggle.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tooltip`** (1 nodes): `Tooltip.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Accesspanel`** (1 nodes): `AccessPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confidenceindicator`** (1 nodes): `ConfidenceIndicator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Datacompletenesswidget`** (1 nodes): `DataCompletenessWidget.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Siteassessmentpanel`** (1 nodes): `SiteAssessmentPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Terrainanalysisflags`** (1 nodes): `TerrainAnalysisFlags.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Croppanel`** (1 nodes): `CropPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboardmetrics`** (1 nodes): `DashboardMetrics.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboardrouter`** (1 nodes): `DashboardRouter.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboardsidebar`** (1 nodes): `DashboardSidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Progressbar`** (1 nodes): `ProgressBar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Carbondiagnosticdashboard`** (1 nodes): `CarbonDiagnosticDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cartographicdashboard`** (1 nodes): `CartographicDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Foresthubdashboard`** (1 nodes): `ForestHubDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Grazingdashboard`** (1 nodes): `GrazingDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Herdrotationdashboard`** (1 nodes): `HerdRotationDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Livestockdashboard`** (1 nodes): `LivestockDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Paddockdesigndashboard`** (1 nodes): `PaddockDesignDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Plantingtooldashboard`** (1 nodes): `PlantingToolDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stewardshipdashboard`** (1 nodes): `StewardshipDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Decisionsupportpanel`** (1 nodes): `DecisionSupportPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Economicspanel`** (1 nodes): `EconomicsPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Advancededucationpanel`** (1 nodes): `AdvancedEducationPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Educationalbookletexport`** (1 nodes): `EducationalBookletExport.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Investorsummaryexport`** (1 nodes): `InvestorSummaryExport.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hydrologypanel`** (1 nodes): `HydrologyPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Speciesdata`** (1 nodes): `speciesData.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Domainfloatingtoolbar`** (1 nodes): `DomainFloatingToolbar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Environmentoverlays`** (1 nodes): `EnvironmentOverlays.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layerpanel`** (1 nodes): `LayerPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mapstyleswitcher`** (1 nodes): `MapStyleSwitcher.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Measuretools`** (1 nodes): `MeasureTools.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Terraincontrols`** (1 nodes): `TerrainControls.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fieldnotes`** (1 nodes): `FieldNotes.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gpstracker`** (1 nodes): `GPSTracker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Moontrancepanel`** (1 nodes): `MoontrancePanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Portalconfigpanel`** (1 nodes): `PortalConfigPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Publicportalshell`** (1 nodes): `PublicPortalShell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Interactivemapview`** (1 nodes): `InteractiveMapView.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Missionoverlay`** (1 nodes): `MissionOverlay.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Narrativesections`** (1 nodes): `NarrativeSections.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stagerevealstory`** (1 nodes): `StageRevealStory.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projectdashboard`** (1 nodes): `ProjectDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stepbasicinfo`** (1 nodes): `StepBasicInfo.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stepboundary`** (1 nodes): `StepBoundary.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Steplocation`** (1 nodes): `StepLocation.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Wizardnav`** (1 nodes): `WizardNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Rulespanel`** (1 nodes): `RulesPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sitingrules`** (1 nodes): `SitingRules.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Templatemarketplace`** (1 nodes): `TemplateMarketplace.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Templatepanel`** (1 nodes): `TemplatePanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilitypanel`** (1 nodes): `UtilityPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Zonepanel`** (1 nodes): `ZonePanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mapbox`** (1 nodes): `mapbox.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Assessmentrules`** (1 nodes): `assessmentRules.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Homepage`** (1 nodes): `HomePage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Authstore`** (1 nodes): `authStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Commentstore`** (1 nodes): `commentStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cropstore`** (1 nodes): `cropStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fieldworkstore`** (1 nodes): `fieldworkStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Livestockstore`** (1 nodes): `livestockStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mapstore`** (1 nodes): `mapStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pathstore`** (1 nodes): `pathStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Phasestore`** (1 nodes): `phaseStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Portalstore`** (1 nodes): `portalStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Scenariostore`** (1 nodes): `scenarioStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Structurestore`** (1 nodes): `structureStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Templatestore`** (1 nodes): `templateStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilitystore`** (1 nodes): `utilityStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Versionstore`** (1 nodes): `versionStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Zonestore`** (1 nodes): `zoneStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Datasources`** (1 nodes): `dataSources.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flags`** (1 nodes): `flags.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Assessment Schema`** (1 nodes): `assessment.schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confidence Schema`** (1 nodes): `confidence.schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layer Schema`** (1 nodes): `layer.schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Schema`** (1 nodes): `project.schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spiritual Schema`** (1 nodes): `spiritual.schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Phase 2: Design Atlas`, `Phase 3: Collaboration + AI`, `Phase 4: Public + Portal` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Geospatial Layer Fetcher` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Architecture & Design System` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._