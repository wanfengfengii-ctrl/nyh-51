import { v4 as uuidv4 } from 'uuid';
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

export const RISK_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 35,
  low: 0,
};

export const WARNING_THRESHOLDS = {
  garrisonMinRatio: 0.4,
  garrisonCriticalRatio: 0.2,
  towerFailureRate: 0.15,
  missionFailureRate: 0.25,
  weatherCriticalVisibility: 0.5,
  enemyPriorityCritical: 3,
  blindSpotCount: 2,
  bottleneckDelay: 4,
  bottleneckLoad: 3,
};

export function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_THRESHOLDS.high) return 'high';
  if (score >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
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
  const labels: Record<WarningCategory, string> = {
    enemy_threat: '敌情威胁',
    weather_risk: '天气风险',
    garrison_insufficient: '驻军不足',
    tower_failure: '台站故障',
    transmission_risk: '传递风险',
    path_bottleneck: '路径瓶颈',
    blind_spot: '信号盲区',
  };
  return labels[category];
}

export function getCategoryIcon(category: WarningCategory): string {
  const icons: Record<WarningCategory, string> = {
    enemy_threat: '⚔️',
    weather_risk: '🌤️',
    garrison_insufficient: '👥',
    tower_failure: '🏚️',
    transmission_risk: '📡',
    path_bottleneck: '🚧',
    blind_spot: '👁️‍🗨️',
  };
  return icons[category];
}

export function getStatusLabel(status: WarningStatus): string {
  const labels: Record<WarningStatus, string> = {
    active: '活动中',
    acknowledged: '已确认',
    resolved: '已解决',
    expired: '已过期',
  };
  return labels[status];
}

interface WarningEngineContext {
  towers: BeaconTower[];
  missions: SignalMission[];
  enemySources: EnemySource[];
  dispatches: GarrisonDispatch[];
  weather: Weather;
  weatherForecast?: { weather: Weather; startTime: number; duration: number }[];
  historyEvents: HistoryEvent[];
  snapshots: StateSnapshot[];
  blindSpots: BlindSpot[];
  currentTime: number;
}

export function calculateComprehensiveAssessment(
  ctx: WarningEngineContext,
  existingWarnings: Warning[]
): ComprehensiveAssessment {
  const activeWarnings = existingWarnings.filter(w => w.status === 'active' || w.status === 'acknowledged');

  const activeEnemyCount = ctx.enemySources.filter(e => e.status === 'active' || e.status === 'pending').length;
  const highPriorityEnemies = ctx.enemySources.filter(e => e.level.priority >= WARNING_THRESHOLDS.enemyPriorityCritical).length;
  const enemyThreatScore = Math.min(100, (activeEnemyCount * 15) + (highPriorityEnemies * 25));

  const weatherImpactScore = (1 - ctx.weather.visibilityFactor) * 100;

  const totalGarrison = ctx.towers.reduce((sum, t) => sum + t.garrisonCount, 0);
  const baseGarrison = ctx.towers.reduce((sum, t) => sum + t.baseGarrisonCount, 0);
  const garrisonRatio = baseGarrison > 0 ? totalGarrison / baseGarrison : 1;
  const lowGarrisonTowers = ctx.towers.filter(t => t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio).length;
  const garrisonScore = Math.min(100, ((1 - garrisonRatio) * 60) + (lowGarrisonTowers * 10));

  const disabledTowers = ctx.towers.filter(t => t.isDisabled).length;
  const failedMissions = ctx.missions.filter(m => m.status === 'failed').length;
  const totalMissions = ctx.missions.length;
  const missionFailureRate = totalMissions > 0 ? failedMissions / totalMissions : 0;
  const networkHealthScore = Math.min(100,
    (disabledTowers / Math.max(1, ctx.towers.length) * 50) +
    (missionFailureRate * 80) +
    (ctx.blindSpots.filter(b => !b.resolvedAt).length * 15)
  );

  const completedMissions = ctx.missions.filter(m => m.status === 'completed').length;
  const successRate = totalMissions > 0 ? completedMissions / totalMissions : 1;
  const historicalScore = (1 - successRate) * 100;

  const overallRiskScore = Math.round(
    enemyThreatScore * 0.30 +
    weatherImpactScore * 0.15 +
    garrisonScore * 0.20 +
    networkHealthScore * 0.25 +
    historicalScore * 0.10
  );

  const overallRiskLevel = getRiskLevel(overallRiskScore);

  const topRecommendations: string[] = [];
  if (enemyThreatScore >= 60) {
    topRecommendations.push('当前敌情威胁严重，建议启动最高级别的联防响应机制');
  }
  if (weatherImpactScore >= 50) {
    topRecommendations.push(`恶劣天气(${ctx.weather.name})影响信号传递，建议启动备用传递路线`);
  }
  if (garrisonScore >= 50) {
    topRecommendations.push(`${lowGarrisonTowers} 座烽火台驻军不足，建议立即调度增援`);
  }
  if (networkHealthScore >= 50) {
    topRecommendations.push('通信网络健康度较低，建议排查故障台站并填补信号盲区');
  }

  const summaryParts: string[] = [];
  if (overallRiskLevel === 'critical' || overallRiskLevel === 'high') {
    summaryParts.push(`当前整体风险等级为${getRiskLabel(overallRiskLevel)}`);
  } else {
    summaryParts.push('当前整体态势相对平稳');
  }
  if (activeEnemyCount > 0) {
    summaryParts.push(`监测到 ${activeEnemyCount} 路敌情活动`);
  }
  if (disabledTowers > 0) {
    summaryParts.push(`${disabledTowers} 座台站处于故障状态`);
  }
  if (activeWarnings.length > 0) {
    summaryParts.push(`${activeWarnings.length} 条预警待处理`);
  }

  return {
    overallRiskLevel,
    overallRiskScore,
    totalActiveWarnings: activeWarnings.length,
    criticalWarnings: activeWarnings.filter(w => w.riskLevel === 'critical').length,
    highWarnings: activeWarnings.filter(w => w.riskLevel === 'high').length,
    mediumWarnings: activeWarnings.filter(w => w.riskLevel === 'medium').length,
    lowWarnings: activeWarnings.filter(w => w.riskLevel === 'low').length,
    generatedAt: ctx.currentTime,
    assessmentSummary: summaryParts.join('，'),
    topRecommendations: topRecommendations.slice(0, 5),
    factorBreakdown: {
      enemyThreat: Math.round(enemyThreatScore),
      weatherImpact: Math.round(weatherImpactScore),
      garrisonStatus: Math.round(garrisonScore),
      networkHealth: Math.round(networkHealthScore),
      historicalPerformance: Math.round(historicalScore),
    },
  };
}

function createWarningBase(
  category: WarningCategory,
  riskLevel: RiskLevel,
  title: string,
  summary: string,
  ctx: WarningEngineContext
): Omit<Warning, 'triggerReasons' | 'affectedScope' | 'suggestions' | 'expectedImprovement' | 'evolution'> {
  const now = ctx.currentTime;
  return {
    id: uuidv4(),
    category,
    riskLevel,
    title,
    summary,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 300,
  };
}

function findNearbyTowers(centerTower: BeaconTower, towers: BeaconTower[], maxDistance: number): string[] {
  return towers
    .filter(t => {
      const dist = Math.sqrt(Math.pow(t.x - centerTower.x, 2) + Math.pow(t.y - centerTower.y, 2));
      return dist <= maxDistance && t.id !== centerTower.id;
    })
    .map(t => t.id);
}

function suggestDispatch(
  toTowerId: string,
  count: number,
  reason: string,
  ctx: WarningEngineContext
): DispatchSuggestion | null {
  const toTower = ctx.towers.find(t => t.id === toTowerId);
  if (!toTower) return null;

  let bestFrom: BeaconTower | null = null;
  let bestDist = Infinity;

  for (const tower of ctx.towers) {
    if (tower.id === toTowerId) continue;
    if (!tower.isActive || tower.isDisabled) continue;
    const available = tower.garrisonCount - 2;
    if (available < count) continue;

    const dist = Math.sqrt(Math.pow(tower.x - toTower.x, 2) + Math.pow(tower.y - toTower.y, 2));
    if (dist < bestDist) {
      bestDist = dist;
      bestFrom = tower;
    }
  }

  if (!bestFrom) return null;

  return {
    id: uuidv4(),
    fromTowerId: bestFrom.id,
    toTowerId,
    count,
    estimatedDuration: Math.ceil(bestDist / 50),
    reason,
    expectedImprovement: `预计可将 ${toTower.code} 的驻军恢复至安全水平，降低传递延迟约 ${(count * 0.5).toFixed(1)} 秒`,
  };
}

export function generateWarnings(ctx: WarningEngineContext, existingWarnings: Warning[]): Warning[] {
  const newWarnings: Warning[] = [];
  const now = ctx.currentTime;
  const activeTowerIds = ctx.towers.filter(t => t.isActive && !t.isDisabled).map(t => t.id);

  const lowGarrisonTowers = ctx.towers.filter(t => {
    const ratio = t.garrisonCount / Math.max(1, t.baseGarrisonCount);
    return t.isActive && !t.isDisabled && ratio < WARNING_THRESHOLDS.garrisonMinRatio;
  });

  lowGarrisonTowers.forEach(tower => {
    const ratio = tower.garrisonCount / Math.max(1, tower.baseGarrisonCount);
    const isCritical = ratio < WARNING_THRESHOLDS.garrisonCriticalRatio;
    const riskLevel: RiskLevel = isCritical ? 'critical' : ratio < 0.3 ? 'high' : 'medium';
    const needsCount = Math.max(0, Math.ceil(tower.baseGarrisonCount * 0.6) - tower.garrisonCount);

    const suggestion = suggestDispatch(
      tower.id,
      Math.min(needsCount, 5),
      `${tower.code} 驻军严重不足，当前 ${tower.garrisonCount}/${tower.baseGarrisonCount} 人`,
      ctx
    );

    const existing = existingWarnings.find(w =>
      w.category === 'garrison_insufficient' &&
      w.affectedScope.towerIds.includes(tower.id) &&
      (w.status === 'active' || w.status === 'acknowledged')
    );

    if (!existing) {
      const warning: Warning = {
        ...createWarningBase(
          'garrison_insufficient',
          riskLevel,
          `${tower.code} 驻军不足`,
          `${tower.name} 驻军仅 ${tower.garrisonCount} 人，为编制的 ${(ratio * 100).toFixed(0)}%，可能影响信号传递效率`,
          ctx
        ),
        triggerReasons: [{
          type: 'garrison_ratio',
          description: '驻军比例低于安全阈值',
          value: ratio,
          threshold: WARNING_THRESHOLDS.garrisonMinRatio,
        }],
        affectedScope: {
          towerIds: [tower.id, ...findNearbyTowers(tower, ctx.towers, tower.visualRange)],
        },
        suggestions: suggestion ? [suggestion] : [],
        expectedImprovement: suggestion
          ? `调度 ${suggestion.count} 人后，驻军比例可恢复至 ${((tower.garrisonCount + suggestion.count) / tower.baseGarrisonCount * 100).toFixed(0)}%`
          : '增派驻军后可显著提升信号传递可靠性',
        evolution: [{
          timestamp: now,
          riskLevel,
          status: 'active',
          summary: `预警触发：驻军比例 ${(ratio * 100).toFixed(0)}%`,
        }],
      };
      newWarnings.push(warning);
    }
  });

  const disabledTowers = ctx.towers.filter(t => t.isDisabled);
  disabledTowers.forEach(tower => {
    const affectedMissions = ctx.missions.filter(m =>
      m.path.towers.includes(tower.id) && (m.status === 'running' || m.status === 'pending')
    );

    const existing = existingWarnings.find(w =>
      w.category === 'tower_failure' &&
      w.affectedScope.towerIds.includes(tower.id) &&
      (w.status === 'active' || w.status === 'acknowledged')
    );

    if (!existing) {
      const riskLevel: RiskLevel = affectedMissions.length >= 2 ? 'critical' : affectedMissions.length >= 1 ? 'high' : 'medium';

      const warning: Warning = {
        ...createWarningBase(
          'tower_failure',
          riskLevel,
          `${tower.code} 台站故障`,
          `${tower.name} 因"${tower.disabledReason || '未知原因'}"故障，预计 ${((tower.disabledUntil || now + 10) - now).toFixed(0)} 秒后恢复`,
          ctx
        ),
        triggerReasons: [{
          type: 'tower_disabled',
          description: '台站处于故障状态',
          value: 1,
          threshold: 0,
        }],
        affectedScope: {
          towerIds: [tower.id, ...findNearbyTowers(tower, ctx.towers, tower.visualRange)],
          missionIds: affectedMissions.map(m => m.id),
        },
        suggestions: [],
        expectedImprovement: '台站恢复后，受影响的传递任务可自动恢复或切换至备用路径',
        evolution: [{
          timestamp: now,
          riskLevel,
          status: 'active',
          summary: `预警触发：${tower.code} 故障 - ${tower.disabledReason}`,
        }],
      };
      newWarnings.push(warning);
    }
  });

  const criticalWeather = ctx.weather.visibilityFactor < WARNING_THRESHOLDS.weatherCriticalVisibility;
  if (criticalWeather) {
    const affectedTowers = ctx.towers.filter(t => t.isActive && !t.isDisabled).map(t => t.id);
    const existing = existingWarnings.find(w =>
      w.category === 'weather_risk' &&
      w.status === 'active'
    );

    if (!existing) {
      const riskLevel: RiskLevel = ctx.weather.visibilityFactor < 0.45 ? 'critical' : 'high';

      const warning: Warning = {
        ...createWarningBase(
          'weather_risk',
          riskLevel,
          `恶劣天气：${ctx.weather.name}`,
          `当前天气为${ctx.weather.name}，能见度仅为正常的 ${(ctx.weather.visibilityFactor * 100).toFixed(0)}%，严重影响烟火信号传递`,
          ctx
        ),
        triggerReasons: [{
          type: 'weather_visibility',
          description: '天气能见度低于临界阈值',
          value: ctx.weather.visibilityFactor,
          threshold: WARNING_THRESHOLDS.weatherCriticalVisibility,
        }],
        affectedScope: {
          towerIds: affectedTowers,
        },
        suggestions: [],
        expectedImprovement: '建议等待天气好转或增设近距离中继台以缩短传递距离',
        evolution: [{
          timestamp: now,
          riskLevel,
          status: 'active',
          summary: `预警触发：恶劣天气 ${ctx.weather.name}`,
        }],
      };
      newWarnings.push(warning);
    }
  }

  const activeHighThreatEnemies = ctx.enemySources.filter(e =>
    (e.status === 'active' || e.status === 'pending') &&
    e.level.priority >= WARNING_THRESHOLDS.enemyPriorityCritical
  );

  activeHighThreatEnemies.forEach(enemy => {
    const existing = existingWarnings.find(w =>
      w.category === 'enemy_threat' &&
      w.affectedScope.enemySourceIds?.includes(enemy.id) &&
      (w.status === 'active' || w.status === 'acknowledged')
    );

    if (!existing) {
      const riskLevel: RiskLevel = enemy.level.priority >= 4 ? 'critical' : 'high';
      const startTower = ctx.towers.find(t => t.id === enemy.startTowerId);
      const endTower = ctx.towers.find(t => t.id === enemy.endTowerId);

      const warning: Warning = {
        ...createWarningBase(
          'enemy_threat',
          riskLevel,
          `${enemy.level.name}来袭`,
          `${enemy.name}：${enemy.level.description}，方向 ${startTower?.code || '未知'} → ${endTower?.code || '未知'}`,
          ctx
        ),
        triggerReasons: [{
          type: 'enemy_priority',
          description: '敌情等级达到高威胁级别',
          value: enemy.level.priority,
          threshold: WARNING_THRESHOLDS.enemyPriorityCritical,
        }],
        affectedScope: {
          towerIds: [enemy.startTowerId, enemy.endTowerId],
          enemySourceIds: [enemy.id],
        },
        suggestions: [],
        expectedImprovement: '建议优先保障该路线上的烽火台驻军充足，必要时启用冗余路径',
        evolution: [{
          timestamp: now,
          riskLevel,
          status: 'active',
          summary: `预警触发：${enemy.level.name} - ${enemy.name}`,
        }],
      };
      newWarnings.push(warning);
    }
  });

  const unresolvedBlindSpots = ctx.blindSpots.filter(b => !b.resolvedAt);
  if (unresolvedBlindSpots.length >= WARNING_THRESHOLDS.blindSpotCount) {
    const existing = existingWarnings.find(w =>
      w.category === 'blind_spot' &&
      w.status === 'active'
    );

    if (!existing) {
      const riskLevel: RiskLevel = unresolvedBlindSpots.length >= 3 ? 'high' : 'medium';
      const warning: Warning = {
        ...createWarningBase(
          'blind_spot',
          riskLevel,
          `存在 ${unresolvedBlindSpots.length} 处信号盲区`,
          '部分区域存在信号覆盖盲区，可能导致敌情信息无法及时传递至指挥中心',
          ctx
        ),
        triggerReasons: [{
          type: 'blind_spot_count',
          description: '信号盲区数量超过阈值',
          value: unresolvedBlindSpots.length,
          threshold: WARNING_THRESHOLDS.blindSpotCount,
        }],
        affectedScope: {
          towerIds: unresolvedBlindSpots.map(b => b.towerId),
        },
        suggestions: [],
        expectedImprovement: '在盲区位置增设中继烽火台或调整现有台站位置可消除信号盲区',
        evolution: [{
          timestamp: now,
          riskLevel,
          status: 'active',
          summary: `预警触发：${unresolvedBlindSpots.length} 处信号盲区`,
        }],
      };
      newWarnings.push(warning);
    }
  }

  const totalMissions = ctx.missions.length;
  const failedMissions = ctx.missions.filter(m => m.status === 'failed').length;
  const failureRate = totalMissions > 0 ? failedMissions / totalMissions : 0;

  if (failureRate >= WARNING_THRESHOLDS.missionFailureRate && totalMissions >= 3) {
    const existing = existingWarnings.find(w =>
      w.category === 'transmission_risk' &&
      w.status === 'active'
    );

    if (!existing) {
      const riskLevel: RiskLevel = failureRate >= 0.4 ? 'critical' : 'high';
      const warning: Warning = {
        ...createWarningBase(
          'transmission_risk',
          riskLevel,
          '信号传递失败率过高',
          `近期信号传递失败率达 ${(failureRate * 100).toFixed(1)}%（${failedMissions}/${totalMissions}），远超正常水平`,
          ctx
        ),
        triggerReasons: [{
          type: 'mission_failure_rate',
          description: '任务失败率超过安全阈值',
          value: failureRate,
          threshold: WARNING_THRESHOLDS.missionFailureRate,
        }],
        affectedScope: {
          towerIds: activeTowerIds,
          missionIds: ctx.missions.filter(m => m.status === 'failed').map(m => m.id),
        },
        suggestions: [],
        expectedImprovement: '排查失败原因，增派驻军或启用冗余路径可显著降低失败率',
        evolution: [{
          timestamp: now,
          riskLevel,
          status: 'active',
          summary: `预警触发：传递失败率 ${(failureRate * 100).toFixed(1)}%`,
        }],
      };
      newWarnings.push(warning);
    }
  }

  return newWarnings;
}

export function updateWarningEvolution(
  warning: Warning,
  ctx: WarningEngineContext
): Warning {
  const now = ctx.currentTime;
  const lastSnapshot = warning.evolution[warning.evolution.length - 1];

  let newRiskLevel = warning.riskLevel;
  const towerIds = warning.affectedScope.towerIds;
  const affectedTowers = ctx.towers.filter(t => towerIds.includes(t.id));

  if (warning.category === 'garrison_insufficient') {
    const avgRatio = affectedTowers.reduce((sum, t) =>
      sum + (t.garrisonCount / Math.max(1, t.baseGarrisonCount)), 0
    ) / Math.max(1, affectedTowers.length);
    if (avgRatio >= WARNING_THRESHOLDS.garrisonMinRatio) {
      newRiskLevel = 'low';
    } else if (avgRatio < WARNING_THRESHOLDS.garrisonCriticalRatio) {
      newRiskLevel = 'critical';
    } else if (avgRatio < 0.3) {
      newRiskLevel = 'high';
    } else {
      newRiskLevel = 'medium';
    }
  } else if (warning.category === 'tower_failure') {
    const stillDisabled = affectedTowers.some(t => t.isDisabled);
    if (!stillDisabled) {
      newRiskLevel = 'low';
    }
  }

  let newStatus: WarningStatus = warning.status;
  if (warning.status === 'active' && newRiskLevel === 'low') {
    newStatus = 'resolved';
  }
  if (warning.expiresAt && now > warning.expiresAt && warning.status === 'active') {
    newStatus = 'expired';
  }

  if (lastSnapshot && (lastSnapshot.riskLevel !== newRiskLevel || lastSnapshot.status !== newStatus)) {
    const newSnapshot: WarningEvolutionSnapshot = {
      timestamp: now,
      riskLevel: newRiskLevel,
      status: newStatus,
      summary: newStatus === 'resolved'
        ? '风险解除，预警自动关闭'
        : newStatus === 'expired'
          ? '预警已超时自动过期'
          : `风险等级变更：${getRiskLabel(lastSnapshot.riskLevel)} → ${getRiskLabel(newRiskLevel)}`,
    };

    return {
      ...warning,
      riskLevel: newRiskLevel,
      status: newStatus,
      updatedAt: now,
      resolvedAt: newStatus === 'resolved' ? now : warning.resolvedAt,
      evolution: [...warning.evolution, newSnapshot],
    };
  }

  return warning;
}

export function calculateRegionHeatData(
  ctx: WarningEngineContext,
  regionCount: number = 4
): RegionHeatData[] {
  if (ctx.towers.length === 0) return [];

  const minX = Math.min(...ctx.towers.map(t => t.x));
  const maxX = Math.max(...ctx.towers.map(t => t.x));
  const minY = Math.min(...ctx.towers.map(t => t.y));
  const maxY = Math.max(...ctx.towers.map(t => t.y));

  const cols = Math.ceil(Math.sqrt(regionCount));
  const rows = Math.ceil(regionCount / cols);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  const regions: RegionHeatData[] = [];
  const directionNames = ['西北', '东北', '西南', '东南', '北部', '南部', '东部', '西部', '中部'];

  let idx = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const regionMinX = minX + col * cellWidth;
      const regionMaxX = regionMinX + cellWidth;
      const regionMinY = minY + row * cellHeight;
      const regionMaxY = regionMinY + cellHeight;

      const towerIds = ctx.towers
        .filter(t =>
          t.x >= regionMinX && t.x <= regionMaxX &&
          t.y >= regionMinY && t.y <= regionMaxY
        )
        .map(t => t.id);

      const regionTowers = ctx.towers.filter(t => towerIds.includes(t.id));
      const disabledCount = regionTowers.filter(t => t.isDisabled).length;
      const lowGarrisonCount = regionTowers.filter(t =>
        t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio
      ).length;

      const regionEnemyCount = ctx.enemySources.filter(e => {
        const start = ctx.towers.find(t => t.id === e.startTowerId);
        return start && towerIds.includes(start.id);
      }).length;

      const regionMissions = ctx.missions.filter(m =>
        m.path.towers.some(tid => towerIds.includes(tid))
      );
      const failedCount = regionMissions.filter(m => m.status === 'failed').length;
      const failureRate = regionMissions.length > 0 ? failedCount / regionMissions.length : 0;

      const completedMissions = regionMissions.filter(m => m.status === 'completed');
      const avgTime = completedMissions.length > 0
        ? completedMissions.reduce((sum, m) => sum + ((m.endTime || 0) - (m.startTime || 0)), 0) / completedMissions.length
        : 0;

      const heatScore = Math.min(100,
        regionEnemyCount * 25 +
        disabledCount * 20 +
        lowGarrisonCount * 15 +
        failureRate * 40
      );

      regions.push({
        regionId: `region-${idx}`,
        regionName: directionNames[idx] || `区域${idx + 1}`,
        bounds: { minX: regionMinX, maxX: regionMaxX, minY: regionMinY, maxY: regionMaxY },
        heatScore: Math.round(heatScore),
        towerCount: towerIds.length,
        activeEnemyCount: regionEnemyCount,
        failureRate: Math.round(failureRate * 100),
        avgTransmissionTime: Math.round(avgTime * 10) / 10,
        towerIds,
      });
      idx++;
    }
  }

  return regions;
}

export function calculateFaultyTowerStats(
  ctx: WarningEngineContext
): FaultyTowerStats[] {
  const disableEvents = ctx.historyEvents.filter(e => e.type === 'tower_disabled');
  const recoveryEvents = ctx.historyEvents.filter(e => e.type === 'tower_recovered');

  const stats: Map<string, FaultyTowerStats> = new Map();

  ctx.towers.forEach(tower => {
    stats.set(tower.id, {
      towerId: tower.id,
      towerCode: tower.code,
      towerName: tower.name,
      failureCount: 0,
      totalDowntime: 0,
      avgRecoveryTime: 0,
      failureReasons: [],
      affectedMissionCount: 0,
      riskScore: 0,
    });
  });

  disableEvents.forEach(event => {
    const towerId = event.data.towerId as string;
    if (!towerId || !stats.has(towerId)) return;

    const stat = stats.get(towerId)!;
    stat.failureCount++;

    const reason = (event.data.reason as string) || '未知原因';
    const existingReason = stat.failureReasons.find(r => r.reason === reason);
    if (existingReason) {
      existingReason.count++;
    } else {
      stat.failureReasons.push({ reason, count: 1 });
    }

    const recovery = recoveryEvents.find(e =>
      (e.data.towerId as string) === towerId && e.timestamp > event.timestamp
    );
    const downtime = recovery ? recovery.timestamp - event.timestamp : 10;
    stat.totalDowntime += downtime;
    stat.lastFailureAt = event.timestamp;
  });

  stats.forEach(stat => {
    if (stat.failureCount > 0) {
      stat.avgRecoveryTime = stat.totalDowntime / stat.failureCount;
    }

    stat.affectedMissionCount = ctx.missions.filter(m =>
      m.path.towers.includes(stat.towerId) &&
      (m.status === 'failed' || m.interruptions > 0)
    ).length;

    const tower = ctx.towers.find(t => t.id === stat.towerId);
    const isCurrentlyDisabled = tower?.isDisabled ? 30 : 0;
    const frequencyScore = stat.failureCount * 15;
    const missionImpact = stat.affectedMissionCount * 10;
    stat.riskScore = Math.min(100, isCurrentlyDisabled + frequencyScore + missionImpact);
  });

  return Array.from(stats.values())
    .filter(s => s.failureCount > 0 || s.affectedMissionCount > 0)
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function predictFailures(
  ctx: WarningEngineContext,
  horizonSeconds: number = 60
): FailurePrediction[] {
  const predictions: FailurePrediction[] = [];
  const now = ctx.currentTime;

  const stats = calculateFaultyTowerStats(ctx);
  const disableEvents = ctx.historyEvents.filter(e => e.type === 'tower_disabled');

  ctx.towers.forEach(tower => {
    if (tower.isDisabled) return;

    const towerStat = stats.find(s => s.towerId === tower.id);
    const recentFailures = disableEvents.filter(e =>
      (e.data.towerId as string) === tower.id &&
      e.timestamp > now - 120
    ).length;

    const garrisonRatio = tower.garrisonCount / Math.max(1, tower.baseGarrisonCount);
    const weatherFactor = 1 - ctx.weather.visibilityFactor;

    let baseProbability = 0.05;
    baseProbability += recentFailures * 0.1;
    baseProbability += (1 - garrisonRatio) * 0.15;
    baseProbability += weatherFactor * 0.1;
    baseProbability += towerStat?.failureCount ? towerStat.failureCount * 0.02 : 0;

    const probability = Math.min(0.95, baseProbability);
    if (probability < 0.1) return;

    const contributingFactors: string[] = [];
    if (recentFailures > 0) contributingFactors.push(`近期故障频发（${recentFailures}次）`);
    if (garrisonRatio < 0.5) contributingFactors.push(`驻军不足（${(garrisonRatio * 100).toFixed(0)}%）`);
    if (weatherFactor > 0.4) contributingFactors.push(`恶劣天气影响`);
    if ((towerStat?.failureCount || 0) >= 2) contributingFactors.push(`历史故障记录较多`);

    const highGarrisonNeighbors = ctx.towers.filter(t => {
      if (t.id === tower.id) return false;
      if (t.garrisonCount < t.baseGarrisonCount * 0.8) return false;
      const dist = Math.sqrt(Math.pow(t.x - tower.x, 2) + Math.pow(t.y - tower.y, 2));
      return dist <= tower.visualRange;
    }).length;

    predictions.push({
      towerId: tower.id,
      towerCode: tower.code,
      timeWindowStart: now,
      timeWindowEnd: now + horizonSeconds,
      failureProbability: Math.round(probability * 100),
      confidence: Math.min(95, 50 + recentFailures * 15 + highGarrisonNeighbors * 5),
      contributingFactors,
    });
  });

  return predictions.sort((a, b) => b.failureProbability - a.failureProbability);
}

export function acknowledgeWarning(warning: Warning, currentTime: number): Warning {
  return {
    ...warning,
    status: 'acknowledged',
    acknowledgedAt: currentTime,
    updatedAt: currentTime,
    evolution: [
      ...warning.evolution,
      {
        timestamp: currentTime,
        riskLevel: warning.riskLevel,
        status: 'acknowledged',
        summary: '指挥人员已确认该预警',
      },
    ],
  };
}

export function resolveWarning(warning: Warning, currentTime: number): Warning {
  return {
    ...warning,
    status: 'resolved',
    resolvedAt: currentTime,
    updatedAt: currentTime,
    evolution: [
      ...warning.evolution,
      {
        timestamp: currentTime,
        riskLevel: 'low',
        status: 'resolved',
        summary: '预警已手动标记为已解决',
      },
    ],
  };
}

export function calculateTheaterZones(ctx: WarningEngineContext): TheaterZone[] {
  if (ctx.towers.length === 0) return [];

  const minX = Math.min(...ctx.towers.map(t => t.x));
  const maxX = Math.max(...ctx.towers.map(t => t.x));
  const minY = Math.min(...ctx.towers.map(t => t.y));
  const maxY = Math.max(...ctx.towers.map(t => t.y));

  const cols = 2;
  const rows = 2;
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  const zoneNames = [
    { code: 'NW', name: '西北战区' },
    { code: 'NE', name: '东北战区' },
    { code: 'SW', name: '西南战区' },
    { code: 'SE', name: '东南战区' },
  ];

  const zones: TheaterZone[] = [];
  let idx = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const zoneMinX = minX + col * cellWidth;
      const zoneMaxX = zoneMinX + cellWidth;
      const zoneMinY = minY + row * cellHeight;
      const zoneMaxY = zoneMinY + cellHeight;

      const zoneTowerIds = ctx.towers
        .filter(t => t.x >= zoneMinX && t.x <= zoneMaxX && t.y >= zoneMinY && t.y <= zoneMaxY)
        .map(t => t.id);

      const zoneTowers = ctx.towers.filter(t => zoneTowerIds.includes(t.id));

      const activeEnemyCount = ctx.enemySources.filter(e => {
        const start = ctx.towers.find(t => t.id === e.startTowerId);
        return start && zoneTowerIds.includes(start.id) && (e.status === 'active' || e.status === 'pending');
      }).length;

      const zoneMissions = ctx.missions.filter(m =>
        m.path.towers.some(tid => zoneTowerIds.includes(tid))
      );
      const failedMissionCount = zoneMissions.filter(m => m.status === 'failed').length;
      const disabledTowerCount = zoneTowers.filter(t => t.isDisabled).length;
      const lowGarrisonCount = zoneTowers.filter(t =>
        t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio
      ).length;

      const completedMissions = zoneMissions.filter(m => m.status === 'completed');
      const avgTransmissionTime = completedMissions.length > 0
        ? completedMissions.reduce((sum, m) => sum + ((m.endTime || 0) - (m.startTime || 0)), 0) / completedMissions.length
        : 0;

      const failureHotspots: FailureHotspot[] = zoneTowers
        .map(tower => {
          const failCount = ctx.historyEvents.filter(e =>
            e.type === 'tower_disabled' && (e.data.towerId as string) === tower.id
          ).length;
          const affectedMissions = zoneMissions.filter(m =>
            m.status === 'failed' && m.path.towers.includes(tower.id)
          );
          if (failCount === 0 && affectedMissions.length === 0) return null;
          return {
            towerId: tower.id,
            towerCode: tower.code,
            failureCount: failCount,
            affectedMissionIds: affectedMissions.map(m => m.id),
            failureRate: zoneMissions.length > 0 ? affectedMissions.length / zoneMissions.length : 0,
          };
        })
        .filter((h): h is FailureHotspot => h !== null)
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, 3);

      const missionLoad = new Map<string, number>();
      zoneMissions.forEach(m => {
        m.path.towers.forEach(tid => {
          if (zoneTowerIds.includes(tid)) {
            missionLoad.set(tid, (missionLoad.get(tid) || 0) + 1);
          }
        });
      });
      const bottleneckTowers = Array.from(missionLoad.entries())
        .filter(([_, count]) => count >= WARNING_THRESHOLDS.bottleneckLoad)
        .sort((a, b) => b[1] - a[1])
        .map(([tid]) => tid)
        .slice(0, 3);

      const garrisonWeakTowers = zoneTowers
        .filter(t => t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio)
        .sort((a, b) => (a.garrisonCount / Math.max(1, a.baseGarrisonCount)) - (b.garrisonCount / Math.max(1, b.baseGarrisonCount)));

      const garrisonWeakBelt: GarrisonWeakBelt[] = [];
      if (garrisonWeakTowers.length >= 2) {
        const avgRatio = garrisonWeakTowers.reduce((s, t) =>
          s + t.garrisonCount / Math.max(1, t.baseGarrisonCount), 0
        ) / garrisonWeakTowers.length;

        let direction = '中部';
        const avgX = garrisonWeakTowers.reduce((s, t) => s + t.x, 0) / garrisonWeakTowers.length;
        const avgY = garrisonWeakTowers.reduce((s, t) => s + t.y, 0) / garrisonWeakTowers.length;
        const zoneCenterX = (zoneMinX + zoneMaxX) / 2;
        const zoneCenterY = (zoneMinY + zoneMaxY) / 2;
        if (avgX < zoneCenterX && avgY < zoneCenterY) direction = '西北角';
        else if (avgX >= zoneCenterX && avgY < zoneCenterY) direction = '东北角';
        else if (avgX < zoneCenterX && avgY >= zoneCenterY) direction = '西南角';
        else direction = '东南角';

        garrisonWeakBelt.push({
          towerIds: garrisonWeakTowers.map(t => t.id),
          avgGarrisonRatio: avgRatio,
          direction,
        });
      }

      const riskScore = Math.min(100,
        activeEnemyCount * 25 +
        disabledTowerCount * 20 +
        lowGarrisonCount * 15 +
        (zoneMissions.length > 0 ? (failedMissionCount / zoneMissions.length) * 40 : 0)
      );

      zones.push({
        id: `theater-${zoneNames[idx].code}`,
        name: zoneNames[idx].name,
        code: zoneNames[idx].code,
        bounds: { minX: zoneMinX, maxX: zoneMaxX, minY: zoneMinY, maxY: zoneMaxY },
        towerIds: zoneTowerIds,
        riskScore: Math.round(riskScore),
        riskLevel: getRiskLevel(riskScore),
        activeEnemyCount,
        failedMissionCount,
        disabledTowerCount,
        lowGarrisonCount,
        avgTransmissionTime: Math.round(avgTransmissionTime * 10) / 10,
        failureHotspots,
        bottleneckTowers,
        garrisonWeakBelt,
      });
      idx++;
    }
  }

  return zones;
}

export function predictMissionFailure(ctx: WarningEngineContext): MissionFailurePrediction[] {
  const predictions: MissionFailurePrediction[] = [];
  const now = ctx.currentTime;

  const runningMissions = ctx.missions.filter(m =>
    m.status === 'running' || m.status === 'pending'
  );

  for (const mission of runningMissions) {
    const factors: MissionFailureFactor[] = [];
    let totalRisk = 0.1;

    const pathTowers = mission.path.towers.map(tid =>
      ctx.towers.find(t => t.id === tid)
    ).filter((t): t is BeaconTower => t !== undefined);

    const disabledOnPath = pathTowers.filter(t => t.isDisabled);
    if (disabledOnPath.length > 0) {
      factors.push({
        factorType: 'tower_risk',
        description: `路径上 ${disabledOnPath.map(t => t.code).join(', ')} 台站故障`,
        severity: disabledOnPath.length * 0.3,
        relatedIds: disabledOnPath.map(t => t.id),
      });
      totalRisk += disabledOnPath.length * 0.3;
    }

    const lowGarrisonOnPath = pathTowers.filter(t =>
      !t.isDisabled && t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio
    );
    if (lowGarrisonOnPath.length > 0) {
      factors.push({
        factorType: 'garrison_low',
        description: `路径上 ${lowGarrisonOnPath.map(t => t.code).join(', ')} 驻军不足`,
        severity: lowGarrisonOnPath.length * 0.15,
        relatedIds: lowGarrisonOnPath.map(t => t.id),
      });
      totalRisk += lowGarrisonOnPath.length * 0.15;
    }

    if (ctx.weather.visibilityFactor < WARNING_THRESHOLDS.weatherCriticalVisibility) {
      factors.push({
        factorType: 'weather_impact',
        description: `恶劣天气(${ctx.weather.name})影响信号传递`,
        severity: (1 - ctx.weather.visibilityFactor) * 0.2,
        relatedIds: [],
      });
      totalRisk += (1 - ctx.weather.visibilityFactor) * 0.2;
    }

    const missionLoad = new Map<string, number>();
    ctx.missions.forEach(m => {
      if (m.id === mission.id) return;
      m.path.towers.forEach(tid => {
        missionLoad.set(tid, (missionLoad.get(tid) || 0) + 1);
      });
    });
    const overloadedTowers = pathTowers.filter(t =>
      (missionLoad.get(t.id) || 0) >= WARNING_THRESHOLDS.bottleneckLoad
    );
    if (overloadedTowers.length > 0) {
      factors.push({
        factorType: 'path_overload',
        description: `路径上 ${overloadedTowers.map(t => t.code).join(', ')} 负载过高`,
        severity: overloadedTowers.length * 0.1,
        relatedIds: overloadedTowers.map(t => t.id),
      });
      totalRisk += overloadedTowers.length * 0.1;
    }

    const source = ctx.enemySources.find(e => e.id === mission.enemySourceId);
    if (source && source.level.priority >= WARNING_THRESHOLDS.enemyPriorityCritical) {
      factors.push({
        factorType: 'enemy_pressure',
        description: `${source.level.name}敌情压力增大`,
        severity: 0.15,
        relatedIds: [source.id],
      });
      totalRisk += 0.15;
    }

    const recentFailures = ctx.historyEvents.filter(e =>
      e.type === 'signal_failed' && e.timestamp > now - 60
    ).length;
    if (recentFailures > 0) {
      factors.push({
        factorType: 'historical_failure',
        description: `近期已有 ${recentFailures} 次传递失败`,
        severity: Math.min(0.2, recentFailures * 0.05),
        relatedIds: [],
      });
      totalRisk += Math.min(0.2, recentFailures * 0.05);
    }

    const failureProbability = Math.min(0.95, totalRisk);
    if (failureProbability < 0.15) continue;

    const criticalPathTowers = pathTowers
      .filter(t => t.isDisabled || t.garrisonCount / Math.max(1, t.baseGarrisonCount) < 0.3)
      .map(t => t.id);

    const recommendedActions: RecommendedAction[] = [];

    if (lowGarrisonOnPath.length > 0) {
      const targetTower = lowGarrisonOnPath[0];
      recommendedActions.push({
        actionType: 'dispatch_garrison',
        description: `向 ${targetTower.code} 增派驻军 ${Math.ceil(targetTower.baseGarrisonCount * 0.5 - targetTower.garrisonCount)} 人`,
        targetIds: [targetTower.id],
        expectedImprovement: `提升 ${targetTower.code} 驻军至安全水平，降低传递延迟`,
        priority: 1,
      });
    }

    if (disabledOnPath.length > 0) {
      recommendedActions.push({
        actionType: 'switch_route',
        description: '切换备用传递路线绕过故障台站',
        targetIds: disabledOnPath.map(t => t.id),
        expectedImprovement: '绕过故障台站，恢复信号传递',
        priority: 1,
      });
    }

    if (overloadedTowers.length > 0) {
      recommendedActions.push({
        actionType: 'add_relay',
        description: `在 ${overloadedTowers.map(t => t.code).join('、')} 附近增设中继台`,
        targetIds: overloadedTowers.map(t => t.id),
        expectedImprovement: '分流信号负载，降低瓶颈台站压力',
        priority: 2,
      });
    }

    predictions.push({
      missionId: mission.id,
      enemySourceId: mission.enemySourceId,
      failureProbability: Math.round(failureProbability * 100),
      confidence: Math.min(95, 40 + factors.length * 12 + recentFailures * 8),
      contributingFactors: factors,
      criticalPathTowers,
      recommendedActions: recommendedActions.sort((a, b) => a.priority - b.priority),
    });
  }

  return predictions.sort((a, b) => b.failureProbability - a.failureProbability);
}

export function createLinkageTrigger(
  warning: Warning,
  ctx: WarningEngineContext
): LinkageTrigger | null {
  if (warning.riskLevel !== 'critical' && warning.riskLevel !== 'high') return null;
  if (warning.status !== 'active') return null;

  const actions: LinkageAction[] = [];

  actions.push({
    id: uuidv4(),
    type: 'popup',
    description: `弹窗告警：${warning.title}`,
    status: 'pending',
  });

  if (warning.riskLevel === 'critical') {
    actions.push({
      id: uuidv4(),
      type: 'sound',
      description: '声音告警：紧急预警警报',
      status: 'pending',
    });
  }

  if (warning.suggestions.length > 0) {
    const topSuggestion = warning.suggestions[0];
    actions.push({
      id: uuidv4(),
      type: 'dispatch',
      description: `建议调度：${topSuggestion.reason}`,
      status: 'pending',
    });
  }

  if (warning.category === 'tower_failure' || warning.category === 'transmission_risk') {
    actions.push({
      id: uuidv4(),
      type: 'route_switch',
      description: '建议切换备用传递路线',
      status: 'pending',
    });
  }

  if (warning.category === 'blind_spot') {
    actions.push({
      id: uuidv4(),
      type: 'relay_add',
      description: '建议在盲区增设中继台',
      status: 'pending',
    });
  }

  return {
    id: uuidv4(),
    warningId: warning.id,
    triggerLevel: warning.riskLevel,
    triggerCategory: warning.category,
    triggeredAt: ctx.currentTime,
    actions,
    soundAlert: warning.riskLevel === 'critical',
    popupShown: false,
    autoDismissed: false,
  };
}

export function evaluateDisposal(
  disposalRecord: DisposalRecord,
  warnings: Warning[],
  ctx: WarningEngineContext
): DisposalRecord {
  const relatedWarning = warnings.find(w => w.id === disposalRecord.warningId);
  const postRiskScore = relatedWarning
    ? calculateWarningRiskScore(relatedWarning, ctx)
    : disposalRecord.preRiskScore;

  const improvementDelta = disposalRecord.preRiskScore - postRiskScore;

  return {
    ...disposalRecord,
    postRiskScore,
    improvementDelta: Math.max(0, improvementDelta),
    improved: improvementDelta > 5,
  };
}

function calculateWarningRiskScore(warning: Warning, ctx: WarningEngineContext): number {
  const towerIds = warning.affectedScope.towerIds;
  const affectedTowers = ctx.towers.filter(t => towerIds.includes(t.id));

  let score = 0;

  switch (warning.category) {
    case 'garrison_insufficient': {
      const avgRatio = affectedTowers.reduce((sum, t) =>
        sum + (t.garrisonCount / Math.max(1, t.baseGarrisonCount)), 0
      ) / Math.max(1, affectedTowers.length);
      score = (1 - avgRatio) * 100;
      break;
    }
    case 'tower_failure': {
      const stillDisabled = affectedTowers.filter(t => t.isDisabled).length;
      score = (stillDisabled / Math.max(1, affectedTowers.length)) * 100;
      break;
    }
    case 'weather_risk': {
      score = (1 - ctx.weather.visibilityFactor) * 100;
      break;
    }
    case 'enemy_threat': {
      const activeEnemies = ctx.enemySources.filter(e =>
        (e.status === 'active' || e.status === 'pending') &&
        warning.affectedScope.enemySourceIds?.includes(e.id)
      ).length;
      score = Math.min(100, activeEnemies * 40);
      break;
    }
    case 'transmission_risk': {
      const failedMissions = ctx.missions.filter(m =>
        m.status === 'failed' && warning.affectedScope.missionIds?.includes(m.id)
      ).length;
      const totalMissions = warning.affectedScope.missionIds?.length || 1;
      score = (failedMissions / totalMissions) * 100;
      break;
    }
    default: {
      score = 30;
    }
  }

  return Math.round(Math.min(100, score));
}

export function generateWarningReplayEvents(
  warnings: Warning[],
  linkageTriggers: LinkageTrigger[],
  disposalRecords: DisposalRecord[],
): WarningReplayEvent[] {
  const events: WarningReplayEvent[] = [];

  for (const warning of warnings) {
    events.push({
      id: uuidv4(),
      timestamp: warning.createdAt,
      eventType: 'warning_generated',
      warningId: warning.id,
      warningTitle: warning.title,
      warningCategory: warning.category,
      riskLevel: warning.riskLevel,
      description: `预警生成：${warning.title} - ${warning.summary}`,
      relatedData: { category: warning.category, riskLevel: warning.riskLevel },
    });

    for (let i = 1; i < warning.evolution.length; i++) {
      const snapshot = warning.evolution[i];
      const prev = warning.evolution[i - 1];

      let eventType: WarningReplayEvent['eventType'];
      if (snapshot.status === 'acknowledged') {
        eventType = 'warning_acknowledged';
      } else if (snapshot.status === 'resolved') {
        eventType = 'warning_resolved';
      } else if (snapshot.status === 'expired') {
        eventType = 'warning_expired';
      } else if (prev.riskLevel !== snapshot.riskLevel) {
        const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        eventType = riskOrder[snapshot.riskLevel] > riskOrder[prev.riskLevel]
          ? 'warning_upgraded' : 'warning_downgraded';
      } else {
        continue;
      }

      events.push({
        id: uuidv4(),
        timestamp: snapshot.timestamp,
        eventType,
        warningId: warning.id,
        warningTitle: warning.title,
        warningCategory: warning.category,
        riskLevel: snapshot.riskLevel,
        previousRiskLevel: prev.riskLevel,
        description: snapshot.summary,
        relatedData: { status: snapshot.status },
      });
    }
  }

  for (const trigger of linkageTriggers) {
    events.push({
      id: uuidv4(),
      timestamp: trigger.triggeredAt,
      eventType: 'linkage_triggered',
      warningId: trigger.warningId,
      warningTitle: `联动触发 - ${getCategoryLabel(trigger.triggerCategory)}`,
      warningCategory: trigger.triggerCategory,
      riskLevel: trigger.triggerLevel,
      description: `预警联动触发：${trigger.actions.map(a => a.description).join('；')}`,
      relatedData: { actions: trigger.actions.length, soundAlert: trigger.soundAlert },
    });
  }

  for (const record of disposalRecords) {
    events.push({
      id: uuidv4(),
      timestamp: record.executedAt,
      eventType: 'disposal_executed',
      warningId: record.warningId,
      warningTitle: `处置执行 - ${record.actionType}`,
      warningCategory: 'tower_failure',
      riskLevel: 'medium',
      description: record.details,
      relatedData: { actionType: record.actionType, improved: record.improved },
    });

    if (record.improved) {
      events.push({
        id: uuidv4(),
        timestamp: record.executedAt + 1,
        eventType: 'disposal_evaluated',
        warningId: record.warningId,
        warningTitle: `处置评估 - ${record.actionType}`,
        warningCategory: 'tower_failure',
        riskLevel: 'low',
        description: `处置有效，风险评分下降 ${record.improvementDelta} 分`,
        relatedData: { preScore: record.preRiskScore, postScore: record.postRiskScore },
      });
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

export function generateTheaterReport(
  warnings: Warning[],
  disposalRecords: DisposalRecord[],
  theaterZones: TheaterZone[],
  ctx: WarningEngineContext
): TheaterReport {
  const now = ctx.currentTime;
  const periodStart = warnings.length > 0
    ? Math.min(...warnings.map(w => w.createdAt))
    : 0;

  const allWarningScores = warnings.map(w => {
    const riskOrder = { low: 10, medium: 35, high: 60, critical: 85 };
    return riskOrder[w.riskLevel];
  });
  const overallRiskScore = allWarningScores.length > 0
    ? Math.round(allWarningScores.reduce((a, b) => a + b, 0) / allWarningScores.length)
    : 0;

  const acknowledgedWarnings = warnings.filter(w => w.acknowledgedAt !== undefined);
  const resolvedWarnings = warnings.filter(w => w.resolvedAt !== undefined);

  const avgAckTime = acknowledgedWarnings.length > 0
    ? acknowledgedWarnings.reduce((sum, w) => sum + ((w.acknowledgedAt || w.createdAt) - w.createdAt), 0) / acknowledgedWarnings.length
    : 0;

  const avgResolveTime = resolvedWarnings.length > 0
    ? resolvedWarnings.reduce((sum, w) => sum + ((w.resolvedAt || w.createdAt) - w.createdAt), 0) / resolvedWarnings.length
    : 0;

  const criticalWarnings = warnings.filter(w => w.riskLevel === 'critical');
  const highWarnings = warnings.filter(w => w.riskLevel === 'high');
  const criticalResponseRate = criticalWarnings.length > 0
    ? criticalWarnings.filter(w => w.acknowledgedAt !== undefined).length / criticalWarnings.length
    : 1;
  const highResponseRate = highWarnings.length > 0
    ? highWarnings.filter(w => w.acknowledgedAt !== undefined).length / highWarnings.length
    : 1;
  const overallResponseRate = warnings.length > 0
    ? warnings.filter(w => w.acknowledgedAt !== undefined).length / warnings.length
    : 1;

  const successfulDisposals = disposalRecords.filter(d => d.improved);
  const disposalSuccessRate = disposalRecords.length > 0
    ? successfulDisposals.length / disposalRecords.length
    : 0;

  const theaterZoneSummaries: TheaterZoneSummary[] = theaterZones.map(zone => {
    const zoneWarnings = warnings.filter(w =>
      w.affectedScope.towerIds.some(tid => zone.towerIds.includes(tid))
    );
    const categoryCount = new Map<WarningCategory, number>();
    zoneWarnings.forEach(w => {
      categoryCount.set(w.category, (categoryCount.get(w.category) || 0) + 1);
    });
    let dominantCategory: WarningCategory = 'tower_failure';
    let maxCount = 0;
    categoryCount.forEach((count, cat) => {
      if (count > maxCount) { maxCount = count; dominantCategory = cat; }
    });

    const zoneDisposals = disposalRecords.filter(d =>
      zoneWarnings.some(w => w.id === d.warningId)
    );
    const zoneAckTime = zoneWarnings.filter(w => w.acknowledgedAt !== undefined)
      .reduce((sum, w) => sum + ((w.acknowledgedAt || w.createdAt) - w.createdAt), 0) /
      Math.max(1, zoneWarnings.filter(w => w.acknowledgedAt !== undefined).length);

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      riskScore: zone.riskScore,
      riskLevel: zone.riskLevel,
      warningCount: zoneWarnings.length,
      avgResponseTime: Math.round(zoneAckTime * 10) / 10,
      disposalCount: zoneDisposals.length,
      disposalSuccessRate: zoneDisposals.length > 0
        ? zoneDisposals.filter(d => d.improved).length / zoneDisposals.length
        : 0,
      dominantCategory,
    };
  });

  const failureChains = identifyFailureChains(warnings, ctx);

  const suggestions: OptimizationSuggestion[] = [];

  const weakGarrisonZones = theaterZones.filter(z => z.lowGarrisonCount >= 2);
  for (const zone of weakGarrisonZones) {
    suggestions.push({
      id: uuidv4(),
      category: 'garrison',
      priority: 1,
      description: `${zone.name}存在 ${zone.lowGarrisonCount} 座驻军不足台站，建议集中调度增援`,
      expectedBenefit: `提升 ${zone.name} 驻军安全比例至 60% 以上，预计降低该区域传递延迟 30%`,
      affectedZoneIds: [zone.id],
    });
  }

  const highRiskZones = theaterZones.filter(z => z.riskLevel === 'high' || z.riskLevel === 'critical');
  for (const zone of highRiskZones) {
    if (zone.bottleneckTowers.length > 0) {
      suggestions.push({
        id: uuidv4(),
        category: 'route',
        priority: 2,
        description: `${zone.name}存在瓶颈台站，建议优化传递路线或启用冗余路径`,
        expectedBenefit: `缓解 ${zone.name} 瓶颈压力，预计提升传递成功率 20%`,
        affectedZoneIds: [zone.id],
      });
    }
  }

  const blindSpotZones = theaterZones.filter(z =>
    warnings.some(w => w.category === 'blind_spot' && w.affectedScope.towerIds.some(tid => z.towerIds.includes(tid)))
  );
  for (const zone of blindSpotZones) {
    suggestions.push({
      id: uuidv4(),
      category: 'relay',
      priority: 1,
      description: `${zone.name}存在信号盲区，建议增设中继烽火台`,
      expectedBenefit: `消除 ${zone.name} 信号盲区，确保敌情信息全链路可达`,
      affectedZoneIds: [zone.id],
    });
  }

  if (disposalSuccessRate < 0.5 && disposalRecords.length > 0) {
    suggestions.push({
      id: uuidv4(),
      category: 'structure',
      priority: 2,
      description: '处置成功率偏低，建议优化联动阈值和调度策略',
      expectedBenefit: '提升整体处置成功率至 60% 以上',
      affectedZoneIds: theaterZones.map(z => z.id),
    });
  }

  return {
    generatedAt: now,
    periodStart,
    periodEnd: now,
    overallRiskLevel: getRiskLevel(overallRiskScore),
    overallRiskScore,
    theaterZoneSummaries,
    responseEfficiency: {
      avgAckTime: Math.round(avgAckTime * 10) / 10,
      avgResolveTime: Math.round(avgResolveTime * 10) / 10,
      criticalResponseRate: Math.round(criticalResponseRate * 100),
      highResponseRate: Math.round(highResponseRate * 100),
      overallResponseRate: Math.round(overallResponseRate * 100),
    },
    disposalSuccessRate: Math.round(disposalSuccessRate * 100),
    totalDisposals: disposalRecords.length,
    successfulDisposals: successfulDisposals.length,
    criticalFailureChains: failureChains,
    optimizationSuggestions: suggestions.sort((a, b) => a.priority - b.priority),
  };
}

function identifyFailureChains(warnings: Warning[], ctx: WarningEngineContext): FailureChain[] {
  const chains: FailureChain[] = [];
  const failedMissions = ctx.missions.filter(m => m.status === 'failed');

  const towerFailureMap = new Map<string, { warnings: Warning[]; missions: SignalMission[] }>();

  for (const tower of ctx.towers) {
    const relatedWarnings = warnings.filter(w =>
      w.affectedScope.towerIds.includes(tower.id) &&
      (w.category === 'tower_failure' || w.category === 'transmission_risk' || w.category === 'path_bottleneck')
    );
    const relatedMissions = failedMissions.filter(m =>
      m.path.towers.includes(tower.id)
    );

    if (relatedWarnings.length > 0 || relatedMissions.length > 0) {
      towerFailureMap.set(tower.id, { warnings: relatedWarnings, missions: relatedMissions });
    }
  }

  const visited = new Set<string>();

  for (const [towerId, data] of towerFailureMap) {
    if (visited.has(towerId)) continue;

    const chainTowerIds = [towerId];
    const chainWarningIds = data.warnings.map(w => w.id);
    const chainMissionIds = data.missions.map(m => m.id);
    visited.add(towerId);

    const tower = ctx.towers.find(t => t.id === towerId);
    if (!tower) continue;

    for (const otherTower of ctx.towers) {
      if (visited.has(otherTower.id)) continue;
      const dist = Math.sqrt(Math.pow(tower.x - otherTower.x, 2) + Math.pow(tower.y - otherTower.y, 2));
      if (dist <= tower.visualRange) {
        const otherData = towerFailureMap.get(otherTower.id);
        if (otherData && (otherData.warnings.length > 0 || otherData.missions.length > 0)) {
          chainTowerIds.push(otherTower.id);
          chainWarningIds.push(...otherData.warnings.map(w => w.id));
          chainMissionIds.push(...otherData.missions.map(m => m.id));
          visited.add(otherTower.id);
        }
      }
    }

    if (chainTowerIds.length >= 2 || data.missions.length >= 2) {
      const impactScore = chainWarningIds.length * 20 + chainMissionIds.length * 15 + chainTowerIds.length * 10;
      const rootCause = data.warnings.length > 0
        ? getCategoryLabel(data.warnings[0].category)
        : '传递失败';

      chains.push({
        chainId: uuidv4(),
        towerIds: chainTowerIds,
        missionIds: chainMissionIds,
        warningIds: chainWarningIds,
        rootCause,
        impactScore: Math.min(100, impactScore),
        description: `${chainTowerIds.map(id => ctx.towers.find(t => t.id === id)?.code || '未知').join(' → ')} 链路受 ${rootCause} 影响，波及 ${chainMissionIds.length} 个传递任务`,
      });
    }
  }

  return chains.sort((a, b) => b.impactScore - a.impactScore).slice(0, 5);
}
