import {
  Warning,
  WarningCategory,
  RiskLevel,
  WarningStatus,
  WarningEvolutionSnapshot,
  TriggerReason,
  AffectedScope,
  DispatchSuggestion,
  ComprehensiveAssessment,
  BeaconTower,
} from '../types';
import { ID } from './types/ids';
import { DomainContext, WarningContext } from './context';
import {
  getRiskLevel,
  getRiskLabel,
  clampScore,
  WARNING_THRESHOLDS,
} from './riskUtils';

interface CreateWarningParams {
  category: WarningCategory;
  riskLevel: RiskLevel;
  title: string;
  summary: string;
  triggerReasons: TriggerReason[];
  affectedScope: AffectedScope;
  suggestions?: DispatchSuggestion[];
  expectedImprovement?: string;
}

export function createWarningBase(
  ctx: DomainContext,
  params: CreateWarningParams
): Warning {
  const now = ctx.currentTime;
  const initialSnapshot: WarningEvolutionSnapshot = {
    timestamp: now,
    riskLevel: params.riskLevel,
    status: 'active',
    summary: `预警触发：${params.title}`,
  };

  return {
    id: ID.warning(),
    category: params.category,
    riskLevel: params.riskLevel,
    title: params.title,
    summary: params.summary,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 300,
    triggerReasons: params.triggerReasons,
    affectedScope: params.affectedScope,
    suggestions: params.suggestions ?? [],
    expectedImprovement: params.expectedImprovement ?? '采取相应措施后可降低风险等级',
    evolution: [initialSnapshot],
  };
}

export function findNearbyTowers(
  centerTower: BeaconTower,
  towers: BeaconTower[],
  maxDistance: number
): string[] {
  return towers
    .filter((t) => {
      const dist = Math.sqrt(
        Math.pow(t.x - centerTower.x, 2) + Math.pow(t.y - centerTower.y, 2)
      );
      return dist <= maxDistance && t.id !== centerTower.id;
    })
    .map((t) => t.id);
}

export function suggestDispatch(
  toTowerId: string,
  count: number,
  reason: string,
  ctx: DomainContext
): DispatchSuggestion | null {
  const toTower = ctx.towers.find((t) => t.id === toTowerId);
  if (!toTower) return null;

  let bestFrom: BeaconTower | null = null;
  let bestDist = Infinity;

  for (const tower of ctx.towers) {
    if (tower.id === toTowerId) continue;
    if (!tower.isActive || tower.isDisabled) continue;
    const available = tower.garrisonCount - 2;
    if (available < count) continue;

    const dist = Math.sqrt(
      Math.pow(tower.x - toTower.x, 2) + Math.pow(tower.y - toTower.y, 2)
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestFrom = tower;
    }
  }

  if (!bestFrom) return null;

  return {
    id: ID.suggestion(),
    fromTowerId: bestFrom.id,
    toTowerId,
    count,
    estimatedDuration: Math.ceil(bestDist / 50),
    reason,
    expectedImprovement: `预计可将 ${toTower.code} 的驻军恢复至安全水平，降低传递延迟约 ${(count * 0.5).toFixed(1)} 秒`,
  };
}

function isDuplicateWarning(
  category: WarningCategory,
  scopeChecker: (w: Warning) => boolean,
  existing: Warning[]
): boolean {
  return existing.some(
    (w) =>
      w.category === category &&
      (w.status === 'active' || w.status === 'acknowledged') &&
      scopeChecker(w)
  );
}

export function generateLowGarrisonWarnings(ctx: WarningContext): Warning[] {
  const warnings: Warning[] = [];

  ctx.towers
    .filter((t) => {
      const ratio = t.garrisonCount / Math.max(1, t.baseGarrisonCount);
      return t.isActive && !t.isDisabled && ratio < WARNING_THRESHOLDS.garrisonMinRatio;
    })
    .forEach((tower) => {
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

      if (
        isDuplicateWarning(
          'garrison_insufficient',
          (w) => w.affectedScope.towerIds.includes(tower.id),
          ctx.existingWarnings
        )
      ) {
        return;
      }

      warnings.push(
        createWarningBase(ctx, {
          category: 'garrison_insufficient',
          riskLevel,
          title: `${tower.code} 驻军不足`,
          summary: `${tower.name} 驻军仅 ${tower.garrisonCount} 人，为编制的 ${(ratio * 100).toFixed(0)}%，可能影响信号传递效率`,
          triggerReasons: [
            {
              type: 'garrison_ratio',
              description: '驻军比例低于安全阈值',
              value: ratio,
              threshold: WARNING_THRESHOLDS.garrisonMinRatio,
            },
          ],
          affectedScope: {
            towerIds: [tower.id, ...findNearbyTowers(tower, ctx.towers, tower.visualRange)],
          },
          suggestions: suggestion ? [suggestion] : [],
          expectedImprovement: suggestion
            ? `调度 ${suggestion.count} 人后，驻军比例可恢复至 ${((tower.garrisonCount + suggestion.count) / tower.baseGarrisonCount * 100).toFixed(0)}%`
            : '增派驻军后可显著提升信号传递可靠性',
        })
      );
    });

  return warnings;
}

export function generateTowerFailureWarnings(ctx: WarningContext): Warning[] {
  const warnings: Warning[] = [];

  ctx.towers
    .filter((t) => t.isDisabled)
    .forEach((tower) => {
      const affectedMissions = ctx.missions.filter(
        (m) =>
          m.path.towers.includes(tower.id) &&
          (m.status === 'running' || m.status === 'pending')
      );

      if (
        isDuplicateWarning(
          'tower_failure',
          (w) => w.affectedScope.towerIds.includes(tower.id),
          ctx.existingWarnings
        )
      ) {
        return;
      }

      const riskLevel: RiskLevel =
        affectedMissions.length >= 2 ? 'critical' : affectedMissions.length >= 1 ? 'high' : 'medium';

      warnings.push(
        createWarningBase(ctx, {
          category: 'tower_failure',
          riskLevel,
          title: `${tower.code} 台站故障`,
          summary: `${tower.name} 因"${tower.disabledReason || '未知原因'}"故障，预计 ${Math.max(0, ((tower.disabledUntil || ctx.currentTime + 10) - ctx.currentTime)).toFixed(0)} 秒后恢复`,
          triggerReasons: [
            {
              type: 'tower_disabled',
              description: '台站处于故障状态',
              value: 1,
              threshold: 0,
            },
          ],
          affectedScope: {
            towerIds: [tower.id, ...findNearbyTowers(tower, ctx.towers, tower.visualRange)],
            missionIds: affectedMissions.map((m) => m.id),
          },
          expectedImprovement: '台站恢复后，受影响的传递任务可自动恢复或切换至备用路径',
        })
      );
    });

  return warnings;
}

export function generateWeatherWarnings(ctx: WarningContext): Warning[] {
  if (ctx.weather.visibilityFactor >= WARNING_THRESHOLDS.weatherCriticalVisibility) {
    return [];
  }

  if (
    isDuplicateWarning(
      'weather_risk',
      () => true,
      ctx.existingWarnings
    )
  ) {
    return [];
  }

  const affectedTowers = ctx.towers
    .filter((t) => t.isActive && !t.isDisabled)
    .map((t) => t.id);

  const riskLevel: RiskLevel = ctx.weather.visibilityFactor < 0.45 ? 'critical' : 'high';

  return [
    createWarningBase(ctx, {
      category: 'weather_risk',
      riskLevel,
      title: `恶劣天气：${ctx.weather.name}`,
      summary: `当前天气为${ctx.weather.name}，能见度仅为正常的 ${(ctx.weather.visibilityFactor * 100).toFixed(0)}%，严重影响烟火信号传递`,
      triggerReasons: [
        {
          type: 'weather_visibility',
          description: '天气能见度低于临界阈值',
          value: ctx.weather.visibilityFactor,
          threshold: WARNING_THRESHOLDS.weatherCriticalVisibility,
        },
      ],
      affectedScope: { towerIds: affectedTowers },
      expectedImprovement: '建议等待天气好转或增设近距离中继台以缩短传递距离',
    }),
  ];
}

export function generateEnemyThreatWarnings(ctx: WarningContext): Warning[] {
  const warnings: Warning[] = [];

  ctx.enemySources
    .filter(
      (e) =>
        (e.status === 'active' || e.status === 'pending') &&
        e.level.priority >= WARNING_THRESHOLDS.enemyPriorityCritical
    )
    .forEach((enemy) => {
      if (
        isDuplicateWarning(
          'enemy_threat',
          (w) => w.affectedScope.enemySourceIds?.includes(enemy.id) ?? false,
          ctx.existingWarnings
        )
      ) {
        return;
      }

      const riskLevel: RiskLevel = enemy.level.priority >= 4 ? 'critical' : 'high';
      const startTower = ctx.towers.find((t) => t.id === enemy.startTowerId);
      const endTower = ctx.towers.find((t) => t.id === enemy.endTowerId);

      warnings.push(
        createWarningBase(ctx, {
          category: 'enemy_threat',
          riskLevel,
          title: `${enemy.level.name}来袭`,
          summary: `${enemy.name}：${enemy.level.description}，方向 ${startTower?.code || '未知'} → ${endTower?.code || '未知'}`,
          triggerReasons: [
            {
              type: 'enemy_priority',
              description: '敌情等级达到高威胁级别',
              value: enemy.level.priority,
              threshold: WARNING_THRESHOLDS.enemyPriorityCritical,
            },
          ],
          affectedScope: {
            towerIds: [enemy.startTowerId, enemy.endTowerId],
            enemySourceIds: [enemy.id],
          },
          expectedImprovement: '建议优先保障该路线上的烽火台驻军充足，必要时启用冗余路径',
        })
      );
    });

  return warnings;
}

export function generateBlindSpotWarnings(ctx: WarningContext): Warning[] {
  const unresolvedBlindSpots = ctx.blindSpots.filter((b) => !b.resolvedAt);
  if (unresolvedBlindSpots.length < WARNING_THRESHOLDS.blindSpotCount) {
    return [];
  }

  if (
    isDuplicateWarning(
      'blind_spot',
      () => true,
      ctx.existingWarnings
    )
  ) {
    return [];
  }

  const riskLevel: RiskLevel = unresolvedBlindSpots.length >= 3 ? 'high' : 'medium';

  return [
    createWarningBase(ctx, {
      category: 'blind_spot',
      riskLevel,
      title: `存在 ${unresolvedBlindSpots.length} 处信号盲区`,
      summary: '部分区域存在信号覆盖盲区，可能导致敌情信息无法及时传递至指挥中心',
      triggerReasons: [
        {
          type: 'blind_spot_count',
          description: '信号盲区数量超过阈值',
          value: unresolvedBlindSpots.length,
          threshold: WARNING_THRESHOLDS.blindSpotCount,
        },
      ],
      affectedScope: {
        towerIds: unresolvedBlindSpots.map((b) => b.towerId),
      },
      expectedImprovement: '在盲区位置增设中继烽火台或调整现有台站位置可消除信号盲区',
    }),
  ];
}

export function generateTransmissionRiskWarnings(ctx: WarningContext): Warning[] {
  const totalMissions = ctx.missions.length;
  const failedMissions = ctx.missions.filter((m) => m.status === 'failed').length;
  const failureRate = totalMissions > 0 ? failedMissions / totalMissions : 0;

  if (failureRate < WARNING_THRESHOLDS.missionFailureRate || totalMissions < 3) {
    return [];
  }

  if (
    isDuplicateWarning(
      'transmission_risk',
      () => true,
      ctx.existingWarnings
    )
  ) {
    return [];
  }

  const activeTowerIds = ctx.towers
    .filter((t) => t.isActive && !t.isDisabled)
    .map((t) => t.id);

  const riskLevel: RiskLevel = failureRate >= 0.4 ? 'critical' : 'high';

  return [
    createWarningBase(ctx, {
      category: 'transmission_risk',
      riskLevel,
      title: '信号传递失败率过高',
      summary: `近期信号传递失败率达 ${(failureRate * 100).toFixed(1)}%（${failedMissions}/${totalMissions}），远超正常水平`,
      triggerReasons: [
        {
          type: 'mission_failure_rate',
          description: '任务失败率超过安全阈值',
          value: failureRate,
          threshold: WARNING_THRESHOLDS.missionFailureRate,
        },
      ],
      affectedScope: {
        towerIds: activeTowerIds,
        missionIds: ctx.missions.filter((m) => m.status === 'failed').map((m) => m.id),
      },
      expectedImprovement: '排查失败原因，增派驻军或启用冗余路径可显著降低失败率',
    }),
  ];
}

export function generateWarnings(ctx: WarningContext): Warning[] {
  return [
    ...generateLowGarrisonWarnings(ctx),
    ...generateTowerFailureWarnings(ctx),
    ...generateWeatherWarnings(ctx),
    ...generateEnemyThreatWarnings(ctx),
    ...generateBlindSpotWarnings(ctx),
    ...generateTransmissionRiskWarnings(ctx),
  ];
}

export function updateWarningEvolution(
  warning: Warning,
  ctx: DomainContext
): Warning {
  const now = ctx.currentTime;
  const lastSnapshot = warning.evolution[warning.evolution.length - 1];

  let newRiskLevel = warning.riskLevel;
  const towerIds = warning.affectedScope.towerIds;
  const affectedTowers = ctx.towers.filter((t) => towerIds.includes(t.id));

  switch (warning.category) {
    case 'garrison_insufficient': {
      const avgRatio =
        affectedTowers.reduce(
          (sum, t) => sum + (t.garrisonCount / Math.max(1, t.baseGarrisonCount)),
          0
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
      break;
    }
    case 'tower_failure': {
      const stillDisabled = affectedTowers.some((t) => t.isDisabled);
      if (!stillDisabled) newRiskLevel = 'low';
      break;
    }
    default:
      break;
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
      summary:
        newStatus === 'resolved'
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

export function acknowledgeWarning(
  warning: Warning,
  currentTime: number
): Warning {
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

export function calculateComprehensiveAssessment(
  ctx: DomainContext,
  warnings: Warning[]
): ComprehensiveAssessment {
  const activeWarnings = warnings.filter(
    (w) => w.status === 'active' || w.status === 'acknowledged'
  );

  const activeEnemyCount = ctx.enemySources.filter(
    (e) => e.status === 'active' || e.status === 'pending'
  ).length;
  const highPriorityEnemies = ctx.enemySources.filter(
    (e) => e.level.priority >= WARNING_THRESHOLDS.enemyPriorityCritical
  ).length;
  const enemyThreatScore = clampScore(activeEnemyCount * 15 + highPriorityEnemies * 25);

  const weatherImpactScore = (1 - ctx.weather.visibilityFactor) * 100;

  const totalGarrison = ctx.towers.reduce((sum, t) => sum + t.garrisonCount, 0);
  const baseGarrison = ctx.towers.reduce((sum, t) => sum + t.baseGarrisonCount, 0);
  const garrisonRatio = baseGarrison > 0 ? totalGarrison / baseGarrison : 1;
  const lowGarrisonTowers = ctx.towers.filter(
    (t) => t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio
  ).length;
  const garrisonScore = clampScore((1 - garrisonRatio) * 60 + lowGarrisonTowers * 10);

  const disabledTowers = ctx.towers.filter((t) => t.isDisabled).length;
  const failedMissions = ctx.missions.filter((m) => m.status === 'failed').length;
  const totalMissions = ctx.missions.length;
  const missionFailureRate = totalMissions > 0 ? failedMissions / totalMissions : 0;
  const networkHealthScore = clampScore(
    (disabledTowers / Math.max(1, ctx.towers.length)) * 50 +
      missionFailureRate * 80 +
      ctx.blindSpots.filter((b) => !b.resolvedAt).length * 15
  );

  const completedMissions = ctx.missions.filter((m) => m.status === 'completed').length;
  const successRate = totalMissions > 0 ? completedMissions / totalMissions : 1;
  const historicalScore = (1 - successRate) * 100;

  const overallRiskScore = clampScore(
    enemyThreatScore * 0.3 +
      weatherImpactScore * 0.15 +
      garrisonScore * 0.2 +
      networkHealthScore * 0.25 +
      historicalScore * 0.1
  );

  const overallRiskLevel = getRiskLevel(overallRiskScore);

  const topRecommendations: string[] = [];
  if (enemyThreatScore >= 60) {
    topRecommendations.push('当前敌情威胁严重，建议启动最高级别的联防响应机制');
  }
  if (weatherImpactScore >= 50) {
    topRecommendations.push(
      `恶劣天气(${ctx.weather.name})影响信号传递，建议启动备用传递路线`
    );
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
    criticalWarnings: activeWarnings.filter((w) => w.riskLevel === 'critical').length,
    highWarnings: activeWarnings.filter((w) => w.riskLevel === 'high').length,
    mediumWarnings: activeWarnings.filter((w) => w.riskLevel === 'medium').length,
    lowWarnings: activeWarnings.filter((w) => w.riskLevel === 'low').length,
    generatedAt: ctx.currentTime,
    assessmentSummary: summaryParts.join('，'),
    topRecommendations: topRecommendations.slice(0, 5),
    factorBreakdown: {
      enemyThreat: clampScore(enemyThreatScore),
      weatherImpact: clampScore(weatherImpactScore),
      garrisonStatus: clampScore(garrisonScore),
      networkHealth: clampScore(networkHealthScore),
      historicalPerformance: clampScore(historicalScore),
    },
  };
}
