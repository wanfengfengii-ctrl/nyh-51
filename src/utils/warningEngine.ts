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
