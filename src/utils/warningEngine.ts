import {
  BeaconTower,
  SignalMission,
  EnemySource,
  GarrisonDispatch,
  Weather,
  HistoryEvent,
  StateSnapshot,
  BlindSpot,
  Warning,
  WarningCategory,
  RiskLevel,
  WarningStatus,
  DispatchSuggestion,
  WarningEvolutionSnapshot,
  RegionHeatData,
  FaultyTowerStats,
  FailurePrediction,
  ComprehensiveAssessment,
  TheaterZone,
  FailureHotspot,
  GarrisonWeakBelt,
  MissionFailurePrediction,
  MissionFailureFactor,
  RecommendedAction,
  LinkageTrigger,
  LinkageAction,
  DisposalRecord,
  WarningReplayEvent,
  TheaterReport,
  TheaterZoneSummary,
  FailureChain,
  OptimizationSuggestion,
} from '../types';
import {
  DomainContext,
  WarningContext,
  createWarningContext,
  createLinkageContext,
  createDisposalContext,
  createReplayContext,
  createTheaterContext,
  RISK_THRESHOLDS as DOMAIN_RISK_THRESHOLDS,
  WARNING_THRESHOLDS as DOMAIN_WARNING_THRESHOLDS,
  getRiskLevel as domainGetRiskLevel,
  getCategoryLabel as domainGetCategoryLabel,
  generateWarnings as domainGenerateWarnings,
  updateWarningEvolution as domainUpdateWarningEvolution,
  calculateComprehensiveAssessment as domainCalculateComprehensiveAssessment,
  calculateRegionHeatData as domainCalculateRegionHeatData,
  calculateFaultyTowerStats as domainCalculateFaultyTowerStats,
  predictFailures as domainPredictFailures,
  acknowledgeWarning as domainAcknowledgeWarning,
  resolveWarning as domainResolveWarning,
  calculateTheaterZones as domainCalculateTheaterZones,
  predictMissionFailure as domainPredictMissionFailure,
  createLinkageTrigger as domainCreateLinkageTrigger,
  evaluateDisposal as domainEvaluateDisposal,
  generateWarningReplayEvents as domainGenerateWarningReplayEvents,
  generateTheaterReport as domainGenerateTheaterReport,
} from '../domain';

export type {
  DomainContext,
  WarningContext,
};
export {
  createWarningContext,
  createLinkageContext,
  createDisposalContext,
  createReplayContext,
  createTheaterContext,
};

export interface WarningEngineContext {
  towers: BeaconTower[];
  missions: SignalMission[];
  enemySources: EnemySource[];
  dispatches: GarrisonDispatch[];
  weather: Weather;
  historyEvents: HistoryEvent[];
  snapshots: StateSnapshot[];
  blindSpots: BlindSpot[];
  currentTime: number;
}

export const RISK_THRESHOLDS = DOMAIN_RISK_THRESHOLDS;

export const WARNING_THRESHOLDS = DOMAIN_WARNING_THRESHOLDS;

export function getRiskLevel(score: number): RiskLevel {
  return domainGetRiskLevel(score);
}

export function getRiskColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    critical: 'red',
  };
  return colors[level];
}

export function getRiskLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '紧急',
  };
  return labels[level];
}

export function getRiskIcon(level: RiskLevel): string {
  const icons: Record<RiskLevel, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };
  return icons[level];
}

export function getCategoryLabel(category: WarningCategory): string {
  return domainGetCategoryLabel(category);
}

export function getCategoryIcon(category: WarningCategory): string {
  const icons: Record<WarningCategory, string> = {
    garrison_insufficient: '👥',
    tower_failure: '⚠️',
    weather_risk: '🌩️',
    enemy_threat: '⚔️',
    blind_spot: '👁️',
    transmission_risk: '📡',
    path_bottleneck: '🔗',
  };
  return icons[category];
}

export function getStatusLabel(status: WarningStatus): string {
  const labels: Record<WarningStatus, string> = {
    active: '待处理',
    acknowledged: '已确认',
    resolved: '已解决',
    expired: '已过期',
  };
  return labels[status];
}

function legacyCtxToDomain(ctx: WarningEngineContext): DomainContext {
  return ctx as unknown as DomainContext;
}

export function calculateComprehensiveAssessment(
  ctx: WarningEngineContext,
  warnings: Warning[]
): ComprehensiveAssessment {
  return domainCalculateComprehensiveAssessment(legacyCtxToDomain(ctx), warnings);
}

export function generateWarnings(
  ctx: WarningEngineContext,
  existingWarnings: Warning[]
): Warning[] {
  const domainCtx = legacyCtxToDomain(ctx);
  const warningCtx = createWarningContext(domainCtx, existingWarnings);
  return domainGenerateWarnings(warningCtx);
}

export function updateWarningEvolution(
  warning: Warning,
  ctx: WarningEngineContext
): Warning {
  return domainUpdateWarningEvolution(warning, legacyCtxToDomain(ctx));
}

export function calculateRegionHeatData(
  ctx: WarningEngineContext,
  regionCount: number = 4
): RegionHeatData[] {
  return domainCalculateRegionHeatData(legacyCtxToDomain(ctx), regionCount);
}

export function calculateFaultyTowerStats(
  ctx: WarningEngineContext
): FaultyTowerStats[] {
  return domainCalculateFaultyTowerStats(legacyCtxToDomain(ctx));
}

export function predictFailures(
  ctx: WarningEngineContext,
  horizonSeconds: number = 60
): FailurePrediction[] {
  return domainPredictFailures(legacyCtxToDomain(ctx), horizonSeconds);
}

export function acknowledgeWarning(warning: Warning, currentTime: number): Warning {
  return domainAcknowledgeWarning(warning, currentTime);
}

export function resolveWarning(warning: Warning, currentTime: number): Warning {
  return domainResolveWarning(warning, currentTime);
}

export function calculateTheaterZones(ctx: WarningEngineContext): TheaterZone[] {
  return domainCalculateTheaterZones(legacyCtxToDomain(ctx));
}

export function predictMissionFailure(ctx: WarningEngineContext): MissionFailurePrediction[] {
  return domainPredictMissionFailure(legacyCtxToDomain(ctx));
}

export function createLinkageTrigger(
  warning: Warning,
  ctx: WarningEngineContext
): LinkageTrigger | null {
  return domainCreateLinkageTrigger(warning, legacyCtxToDomain(ctx));
}

export function evaluateDisposal(
  disposalRecord: DisposalRecord,
  warnings: Warning[],
  ctx: WarningEngineContext
): DisposalRecord {
  return domainEvaluateDisposal(disposalRecord, warnings, legacyCtxToDomain(ctx));
}

export function generateWarningReplayEvents(
  warnings: Warning[],
  linkageTriggers: LinkageTrigger[],
  disposalRecords: DisposalRecord[]
): WarningReplayEvent[] {
  const replayCtx: any = {
    currentTime: Date.now() / 1000,
    warnings,
    linkageTriggers,
    disposalRecords,
  };
  return domainGenerateWarningReplayEvents(replayCtx);
}

export function generateTheaterReport(
  warnings: Warning[],
  disposalRecords: DisposalRecord[],
  theaterZones: TheaterZone[],
  ctx: WarningEngineContext
): TheaterReport {
  const domainCtx = legacyCtxToDomain(ctx);
  const theaterCtx = createTheaterContext(domainCtx, warnings, disposalRecords, theaterZones);
  return domainGenerateTheaterReport(theaterCtx);
}

export type {
  DispatchSuggestion,
  WarningEvolutionSnapshot,
  FailureHotspot,
  GarrisonWeakBelt,
  MissionFailureFactor,
  RecommendedAction,
  LinkageAction,
  TheaterZoneSummary,
  FailureChain,
  OptimizationSuggestion,
};
