export interface BeaconTower {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  visualRange: number;
  garrisonCount: number;
  baseGarrisonCount: number;
  signalDelay: number;
  isActive: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  disabledUntil?: number;
}

export interface Weather {
  id: string;
  name: string;
  visibilityFactor: number;
  description: string;
  icon: string;
}

export interface EnemyLevel {
  id: string;
  name: string;
  signalType: 'smoke' | 'fire' | 'both';
  priority: number;
  description: string;
  delayFactor: number;
  smokeCount: number;
  fireIntensity: number;
  pathStrategy: 'fastest' | 'shortest' | 'mostReliable' | 'redundant';
}

export interface SignalPath {
  id: string;
  towers: string[];
  totalTime: number;
  totalDistance: number;
  isOptimal: boolean;
  reliability: number;
  enemySourceId?: string;
}

export interface EnemySource {
  id: string;
  name: string;
  level: EnemyLevel;
  startTowerId: string;
  endTowerId: string;
  createdAt: number;
  priority: number;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'merged';
  color: string;
  mergedInto?: string;
  mergedFrom?: string[];
}

export interface SignalMission {
  id: string;
  enemySourceId: string;
  path: SignalPath;
  currentStep: number;
  currentTime: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'interrupted';
  activeTowers: string[];
  signalProgress: number;
  startTime?: number;
  endTime?: number;
  failedReason?: string;
  interruptions: number;
}

export interface GarrisonDispatch {
  id: string;
  fromTowerId: string;
  toTowerId: string;
  count: number;
  startTime: number;
  duration: number;
  status: 'pending' | 'active' | 'completed';
  reason: string;
}

export interface WeatherEvent {
  id: string;
  weather: Weather;
  startTime: number;
  duration: number;
  affectedTowers: string[];
  triggerType: 'automatic' | 'manual';
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentStep: number;
  currentTime: number;
  activeTowers: string[];
  currentPath: string[];
  signalProgress: number;
  globalTime: number;
  isReplaying: boolean;
  replayTime: number;
  replaySpeed: number;
}

export interface BlindSpot {
  towerId: string;
  reason: string;
  firstDetected: number;
  resolvedAt?: number;
}

export interface TowerDelayInfo {
  towerId: string;
  delay: number;
  isSevere: boolean;
  missionCount: number;
}

export interface HistoryEvent {
  id: string;
  timestamp: number;
  type: 
    | 'enemy_detected' 
    | 'enemy_merged' 
    | 'signal_start' 
    | 'signal_reach' 
    | 'signal_complete' 
    | 'signal_failed'
    | 'signal_interrupted'
    | 'garrison_dispatch' 
    | 'weather_change' 
    | 'tower_disabled'
    | 'tower_recovered'
    | 'path_recalculated'
    | 'simulation_start'
    | 'simulation_end';
  data: Record<string, unknown>;
  description: string;
}

export interface StateSnapshot {
  timestamp: number;
  towers: BeaconTower[];
  missions: SignalMission[];
  enemySources: EnemySource[];
  weather: Weather;
  dispatches: GarrisonDispatch[];
  activePaths: SignalPath[];
  blindSpots: BlindSpot[];
  towerDelays: TowerDelayInfo[];
  selectedPathId: string | null;
}

export interface EvaluationResult {
  totalSimulationTime: number;
  totalEnemySources: number;
  completedMissions: number;
  failedMissions: number;
  successRate: number;
  averageDeliveryTime: number;
  minDeliveryTime: number;
  maxDeliveryTime: number;
  totalDispatches: number;
  weatherChanges: number;
  towerFailures: number;
  towerRecoveries: number;
  blindSpotHistory: { time: number; count: number }[];
  bottleneckTowers: { towerId: string; delay: number; missionCount: number }[];
  criticalTowers: string[];
  signalTypes: { type: string; count: number }[];
  pathStrategyEffectiveness: { strategy: string; successRate: number; avgTime: number }[];
  recommendations: string[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type WarningStatus = 'active' | 'acknowledged' | 'resolved' | 'expired';

export type WarningCategory =
  | 'enemy_threat'
  | 'weather_risk'
  | 'garrison_insufficient'
  | 'tower_failure'
  | 'transmission_risk'
  | 'path_bottleneck'
  | 'blind_spot';

export interface TriggerReason {
  type: string;
  description: string;
  value: number;
  threshold: number;
}

export interface AffectedScope {
  towerIds: string[];
  regionName?: string;
  enemySourceIds?: string[];
  missionIds?: string[];
}

export interface DispatchSuggestion {
  id: string;
  fromTowerId: string;
  toTowerId: string;
  count: number;
  estimatedDuration: number;
  reason: string;
  expectedImprovement: string;
}

export interface Warning {
  id: string;
  category: WarningCategory;
  riskLevel: RiskLevel;
  title: string;
  summary: string;
  status: WarningStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  triggerReasons: TriggerReason[];
  affectedScope: AffectedScope;
  suggestions: DispatchSuggestion[];
  expectedImprovement: string;
  evolution: WarningEvolutionSnapshot[];
}

export interface WarningEvolutionSnapshot {
  timestamp: number;
  riskLevel: RiskLevel;
  status: WarningStatus;
  summary: string;
  snapshotId?: string;
}

export interface RegionHeatData {
  regionId: string;
  regionName: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  heatScore: number;
  towerCount: number;
  activeEnemyCount: number;
  failureRate: number;
  avgTransmissionTime: number;
  towerIds: string[];
}

export interface FaultyTowerStats {
  towerId: string;
  towerCode: string;
  towerName: string;
  failureCount: number;
  totalDowntime: number;
  avgRecoveryTime: number;
  lastFailureAt?: number;
  failureReasons: { reason: string; count: number }[];
  affectedMissionCount: number;
  riskScore: number;
}

export interface FailurePrediction {
  towerId: string;
  towerCode: string;
  timeWindowStart: number;
  timeWindowEnd: number;
  failureProbability: number;
  confidence: number;
  contributingFactors: string[];
}

export interface ComprehensiveAssessment {
  overallRiskLevel: RiskLevel;
  overallRiskScore: number;
  totalActiveWarnings: number;
  criticalWarnings: number;
  highWarnings: number;
  mediumWarnings: number;
  lowWarnings: number;
  generatedAt: number;
  assessmentSummary: string;
  topRecommendations: string[];
  factorBreakdown: {
    enemyThreat: number;
    weatherImpact: number;
    garrisonStatus: number;
    networkHealth: number;
    historicalPerformance: number;
  };
}

export interface TheaterZone {
  id: string;
  name: string;
  code: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  towerIds: string[];
  riskScore: number;
  riskLevel: RiskLevel;
  activeEnemyCount: number;
  failedMissionCount: number;
  disabledTowerCount: number;
  lowGarrisonCount: number;
  avgTransmissionTime: number;
  failureHotspots: FailureHotspot[];
  bottleneckTowers: string[];
  garrisonWeakBelt: GarrisonWeakBelt[];
}

export interface FailureHotspot {
  towerId: string;
  towerCode: string;
  failureCount: number;
  affectedMissionIds: string[];
  failureRate: number;
}

export interface GarrisonWeakBelt {
  towerIds: string[];
  avgGarrisonRatio: number;
  direction: string;
}

export interface MissionFailurePrediction {
  missionId: string;
  enemySourceId: string;
  failureProbability: number;
  confidence: number;
  contributingFactors: MissionFailureFactor[];
  criticalPathTowers: string[];
  recommendedActions: RecommendedAction[];
}

export interface MissionFailureFactor {
  factorType: 'tower_risk' | 'weather_impact' | 'garrison_low' | 'path_overload' | 'enemy_pressure' | 'historical_failure';
  description: string;
  severity: number;
  relatedIds: string[];
}

export interface RecommendedAction {
  actionType: 'dispatch_garrison' | 'switch_route' | 'add_relay' | 'merge_warnings';
  description: string;
  targetIds: string[];
  expectedImprovement: string;
  priority: number;
}

export interface LinkageTrigger {
  id: string;
  warningId: string;
  triggerLevel: RiskLevel;
  triggerCategory: WarningCategory;
  triggeredAt: number;
  actions: LinkageAction[];
  soundAlert: boolean;
  popupShown: boolean;
  autoDismissed: boolean;
  dismissedAt?: number;
}

export interface LinkageAction {
  id: string;
  type: 'popup' | 'sound' | 'dispatch' | 'route_switch' | 'relay_add';
  description: string;
  status: 'pending' | 'executed' | 'failed' | 'skipped';
  executedAt?: number;
  result?: string;
}

export interface DisposalRecord {
  id: string;
  warningId: string;
  actionType: 'garrison_dispatch' | 'route_switch' | 'relay_add';
  executedAt: number;
  preRiskScore: number;
  postRiskScore: number;
  improvementDelta: number;
  improved: boolean;
  details: string;
  relatedWarningIds: string[];
}

export interface WarningReplayEvent {
  id: string;
  timestamp: number;
  eventType: 'warning_generated' | 'warning_upgraded' | 'warning_downgraded' | 'warning_acknowledged' | 'warning_resolved' | 'warning_expired' | 'linkage_triggered' | 'disposal_executed' | 'disposal_evaluated';
  warningId: string;
  warningTitle: string;
  warningCategory: WarningCategory;
  riskLevel: RiskLevel;
  previousRiskLevel?: RiskLevel;
  description: string;
  relatedData: Record<string, unknown>;
}

export interface TheaterReport {
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  overallRiskLevel: RiskLevel;
  overallRiskScore: number;
  theaterZoneSummaries: TheaterZoneSummary[];
  responseEfficiency: ResponseEfficiency;
  disposalSuccessRate: number;
  totalDisposals: number;
  successfulDisposals: number;
  criticalFailureChains: FailureChain[];
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface TheaterZoneSummary {
  zoneId: string;
  zoneName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  warningCount: number;
  avgResponseTime: number;
  disposalCount: number;
  disposalSuccessRate: number;
  dominantCategory: WarningCategory;
}

export interface ResponseEfficiency {
  avgAckTime: number;
  avgResolveTime: number;
  criticalResponseRate: number;
  highResponseRate: number;
  overallResponseRate: number;
}

export interface FailureChain {
  chainId: string;
  towerIds: string[];
  missionIds: string[];
  warningIds: string[];
  rootCause: string;
  impactScore: number;
  description: string;
}

export interface OptimizationSuggestion {
  id: string;
  category: 'garrison' | 'route' | 'relay' | 'structure';
  priority: number;
  description: string;
  expectedBenefit: string;
  affectedZoneIds: string[];
}
