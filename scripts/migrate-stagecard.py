import os, re

TARGETS = [
    'apps/web/src/v3/plan/cards/zone-circulation/SectorOverlayCard.tsx',
    'apps/web/src/v3/plan/cards/zone-circulation/ZoneCirculationOverviewCard.tsx',
    'apps/web/src/v3/plan/cards/water-management/WaterNetworkCard.tsx',
    'apps/web/src/v3/plan/cards/soil-fertility/SoilResourcesCard.tsx',
    'apps/web/src/v3/plan/cards/soil-fertility/SoilBuildingPlanCard.tsx',
    'apps/web/src/v3/plan/cards/soil-fertility/SoilBaselineCard.tsx',
    'apps/web/src/v3/plan/cards/soil-fertility/ClosedLoopGraphCard.tsx',
    'apps/web/src/v3/plan/cards/principle-verification/PrincipleCoverageMatrixCard.tsx',
    'apps/web/src/v3/plan/cards/principle-verification/ThreeEthicsRollupCard.tsx',
    'apps/web/src/v3/plan/cards/plant-systems/PlantDatabaseSiteMatchCard.tsx',
    'apps/web/src/v3/plan/cards/plant-systems/GuildSpatialBuilderCard.tsx',
    'apps/web/src/v3/plan/cards/plant-systems/CanopySuccessionCard.tsx',
    'apps/web/src/v3/plan/cards/phasing-budgeting/CumulativeInvestmentCard.tsx',
    'apps/web/src/v3/plan/cards/phasing-budgeting/PhasingScaleMatrixCard.tsx',
    'apps/web/src/v3/plan/cards/dynamic-layering/PermanenceLadderCard.tsx',
    'apps/web/src/v3/plan/cards/dynamic-layering/EnterprisesCard.tsx',
    'apps/web/src/v3/plan/cards/cross-section/SectionAnnotationsCard.tsx',
    'apps/web/src/features/act/WasteRoutingChecklistCard.tsx',
    'apps/web/src/features/act/WeatherForecastCard.tsx',
    'apps/web/src/features/act/SuccessionTrackerCard.tsx',
    'apps/web/src/features/act/PilotPlotsCard.tsx',
    'apps/web/src/features/act/StructureYieldCard.tsx',
    'apps/web/src/features/act/OngoingSwotCard.tsx',
    'apps/web/src/features/act/NetworkCrmCard.tsx',
    'apps/web/src/features/act/MaintenanceLogCard.tsx',
    'apps/web/src/features/act/MaintenanceScheduleCard.tsx',
    'apps/web/src/features/act/LivestockYieldCard.tsx',
    'apps/web/src/features/act/LivestockMoveCard.tsx',
    'apps/web/src/features/act/IrrigationManagerCard.tsx',
    'apps/web/src/features/act/HazardPlansCard.tsx',
    'apps/web/src/features/act/HarvestLogCard.tsx',
    'apps/web/src/features/act/EventCalendarCard.tsx',
    'apps/web/src/features/act/CommunityEventCard.tsx',
    'apps/web/src/features/act/BudgetActualsCard.tsx',
    'apps/web/src/features/act/BuildGanttCard.tsx',
    'apps/web/src/features/act/AppropriateTechLogCard.tsx',
    'apps/web/src/features/plan/ZoneLevelLayer.tsx',
    'apps/web/src/features/plan/TransectVerticalEditorCard.tsx',
    'apps/web/src/features/plan/WasteVectorTool.tsx',
    'apps/web/src/features/plan/SwaleDrainTool.tsx',
    'apps/web/src/features/plan/StorageInfraTool.tsx',
    'apps/web/src/features/plan/SoilFertilityDesignerCard.tsx',
    'apps/web/src/features/plan/SeasonalTaskCard.tsx',
    'apps/web/src/features/plan/RunoffCalculatorCard.tsx',
    'apps/web/src/features/plan/PlantDatabaseCard.tsx',
    'apps/web/src/features/plan/PhasingMatrixCard.tsx',
    'apps/web/src/features/plan/PermanenceScalesCard.tsx',
    'apps/web/src/features/plan/PathFrequencyEditor.tsx',
    'apps/web/src/features/plan/LaborBudgetSummaryCard.tsx',
    'apps/web/src/features/plan/HolmgrenChecklistCard.tsx',
    'apps/web/src/features/plan/GuildBuilderCard.tsx',
    'apps/web/src/features/plan/CanopySimulatorCard.tsx',
    'apps/web/src/features/vision/BeforeAfterMasterplanCard.tsx',
]

def rel_to_stagecard(path):
    target = 'apps/web/src/v3/_shared/stageCard/stageCard.module.css'
    from_dir = os.path.dirname(path)
    rel = os.path.relpath(target, from_dir)
    return rel.replace(os.sep, '/')

results = []
for f in TARGETS:
    if not os.path.exists(f):
        results.append(f'MISSING: {f}')
        continue
    with open(f, 'rb') as fh:
        raw = fh.read()
    if raw.startswith(b'\xef\xbb\xbf'):
        results.append(f'BOM: {f}')
        continue
    try:
        text = raw.decode('utf-8')
    except UnicodeDecodeError as e:
        results.append(f'DECODE-FAIL {f}: {e}')
        continue

    new_rel = rel_to_stagecard(f)
    stage = 'act' if '/features/act/' in f.replace('\\', '/') else 'plan'

    orig = text

    text = re.sub(
        r"""(['"])([^'"]*?(?:features/plan/|\./)planCard\.module\.css)\1""",
        lambda m: f'{m.group(1)}{new_rel}{m.group(1)}',
        text,
    )
    text = re.sub(
        r"""(['"])([^'"]*?(?:features/act/|\./)actCard\.module\.css)\1""",
        lambda m: f'{m.group(1)}{new_rel}{m.group(1)}',
        text,
    )

    def add_data_stage(m):
        tag_open = m.group(0)
        if 'data-stage' in tag_open:
            return tag_open
        return tag_open[:-1] + f' data-stage="{stage}">'

    text = re.sub(
        r'<\w+\s+className=\{\w+\.hero\}\s*>',
        add_data_stage,
        text,
    )

    if text == orig:
        results.append(f'NOCHANGE: {f}')
        continue

    with open(f, 'wb') as fh:
        fh.write(text.encode('utf-8'))
    results.append(f'OK: {f}')

for r in results:
    print(r)
print(f'\nTotal processed: {len(results)}')
