import {
  BeaconTower,
  TheaterZone,
  FailureHotspot,
  GarrisonWeakBelt,
  RegionHeatData,
  FaultyTowerStats,
  FailurePrediction,
  MissionFailurePrediction,
  MissionFailureFactor,
  RecommendedAction,
  TheaterReport,
  TheaterZoneSummary,
  ResponseEfficiency,
  FailureChain,
  OptimizationSuggestion,
  Warning,
  RiskLevel,
} from '../types';
import { ID } from './types/ids';
import { DomainContext, TheaterContext } from './context';
import {
  WARNING_THRESHOLDS,
  getRiskLevel,
  clampScore,
} from './riskUtils';

export function calculateTheaterZones(ctx: DomainContext): TheaterZone[] {
  if (ctx.towers.length === 0) return [];

  const minX = Math.min(...ctx.towers.map((t) => t.x));
  const maxX = Math.max(...ctx.towers.map((t) => t.x));
  const minY = Math.min(...ctx.towers.map((t) => t.y));
  const maxY = Math.max(...ctx.towers.map((t) => t.y));

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
        .filter(
          (t) =>
            t.x >= zoneMinX && t.x <= zoneMaxX && t.y >= zoneMinY && t.y <= zoneMaxY
        )
        .map((t) => t.id);

      const zoneTowers = ctx.towers.filter((t) => zoneTowerIds.includes(t.id));

      const activeEnemyCount = ctx.enemySources.filter((e) => {
        const start = ctx.towers.find((t) => t.id === e.startTowerId);
        return (
          start &&
          zoneTowerIds.includes(start.id) &&
          (e.status === 'active' || e.status === 'pending')
        );
      }).length;

      const zoneMissions = ctx.missions.filter((m) =>
        m.path.towers.some((tid) => zoneTowerIds.includes(tid))
      );
      const failedMissionCount = zoneMissions.filter((m) => m.status === 'failed').length;
      const disabledTowerCount = zoneTowers.filter((t) => t.isDisabled).length;
      const lowGarrisonCount = zoneTowers.filter(
        (t) => t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio
      ).length;

      const completedMissions = zoneMissions.filter((m) => m.status === 'completed');
      const avgTransmissionTime =
        completedMissions.length > 0
          ? completedMissions.reduce(
              (sum, m) => sum + ((m.endTime || 0) - (m.startTime || 0)),
              0
            ) / completedMissions.length
          : 0;

      const failureHotspots: FailureHotspot[] = zoneTowers
        .map((tower) => {
          const failCount = ctx.historyEvents.filter(
            (e) => e.type === 'tower_disabled' && (e.data.towerId as string) === tower.id
          ).length;
          const affectedMissions = zoneMissions.filter(
            (m) => m.status === 'failed' && m.path.towers.includes(tower.id)
          );
          if (failCount === 0 && affectedMissions.length === 0) return null;
          return {
            towerId: tower.id,
            towerCode: tower.code,
            failureCount: failCount,
            affectedMissionIds: affectedMissions.map((m) => m.id),
            failureRate:
              zoneMissions.length > 0 ? affectedMissions.length / zoneMissions.length : 0,
          };
        })
        .filter((h): h is FailureHotspot => h !== null)
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, 3);

      const missionLoad = new Map<string, number>();
      zoneMissions.forEach((m) => {
        m.path.towers.forEach((tid) => {
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
        .filter(
          (t) => t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio
        )
        .sort(
          (a, b) =>
            a.garrisonCount / Math.max(1, a.baseGarrisonCount) -
            b.garrisonCount / Math.max(1, b.baseGarrisonCount)
        );

      const garrisonWeakBelt: GarrisonWeakBelt[] = [];
      if (garrisonWeakTowers.length >= 2) {
        const avgRatio =
          garrisonWeakTowers.reduce(
            (s, t) => s + t.garrisonCount / Math.max(1, t.baseGarrisonCount),
            0
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
          towerIds: garrisonWeakTowers.map((t) => t.id),
          avgGarrisonRatio: avgRatio,
          direction,
        });
      }

      const riskScore = clampScore(
        activeEnemyCount * 25 +
          disabledTowerCount * 20 +
          lowGarrisonCount * 15 +
          (zoneMissions.length > 0 ? (failedMissionCount / zoneMissions.length) * 40 : 0)
      );

      zones.push({
        id: ID.zone(),
        name: zoneNames[idx].name,
        code: zoneNames[idx].code,
        bounds: { minX: zoneMinX, maxX: zoneMaxX, minY: zoneMinY, maxY: zoneMaxY },
        towerIds: zoneTowerIds,
        riskScore,
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

export function calculateRegionHeatData(
  ctx: DomainContext,
  regionCount: number = 4
): RegionHeatData[] {
  if (ctx.towers.length === 0) return [];

  const minX = Math.min(...ctx.towers.map((t) => t.x));
  const maxX = Math.max(...ctx.towers.map((t) => t.x));
  const minY = Math.min(...ctx.towers.map((t) => t.y));
  const maxY = Math.max(...ctx.towers.map((t) => t.y));

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
        .filter(
          (t) =>
            t.x >= regionMinX &&
            t.x <= regionMaxX &&
            t.y >= regionMinY &&
            t.y <= regionMaxY
        )
        .map((t) => t.id);

      const regionTowers = ctx.towers.filter((t) => towerIds.includes(t.id));
      const disabledCount = regionTowers.filter((t) => t.isDisabled).length;
      const lowGarrisonCount = regionTowers.filter(
        (t) => t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio
      ).length;

      const regionEnemyCount = ctx.enemySources.filter((e) => {
        const start = ctx.towers.find((t) => t.id === e.startTowerId);
        return start && towerIds.includes(start.id);
      }).length;

      const regionMissions = ctx.missions.filter((m) =>
        m.path.towers.some((tid) => towerIds.includes(tid))
      );
      const failedCount = regionMissions.filter((m) => m.status === 'failed').length;
      const failureRate = regionMissions.length > 0 ? failedCount / regionMissions.length : 0;

      const completedMissions = regionMissions.filter((m) => m.status === 'completed');
      const avgTime =
        completedMissions.length > 0
          ? completedMissions.reduce(
              (sum, m) => sum + ((m.endTime || 0) - (m.startTime || 0)),
              0
            ) / completedMissions.length
          : 0;

      const heatScore = clampScore(
        regionEnemyCount * 25 +
          disabledCount * 20 +
          lowGarrisonCount * 15 +
          failureRate * 40
      );

      regions.push({
        regionId: `region-${idx}`,
        regionName: directionNames[idx] || `区域${idx + 1}`,
        bounds: {
          minX: regionMinX,
          maxX: regionMaxX,
          minY: regionMinY,
          maxY: regionMaxY,
        },
        heatScore,
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
  ctx: DomainContext
): FaultyTowerStats[] {
  const disableEvents = ctx.historyEvents.filter((e) => e.type === 'tower_disabled');
  const recoveryEvents = ctx.historyEvents.filter((e) => e.type === 'tower_recovered');

  const stats: Map<string, FaultyTowerStats> = new Map();

  ctx.towers.forEach((tower) => {
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

  disableEvents.forEach((event) => {
    const towerId = event.data.towerId as string;
    if (!towerId || !stats.has(towerId)) return;

    const stat = stats.get(towerId)!;
    stat.failureCount++;

    const reason = (event.data.reason as string) || '未知原因';
    const existingReason = stat.failureReasons.find((r) => r.reason === reason);
    if (existingReason) {
      existingReason.count++;
    } else {
      stat.failureReasons.push({ reason, count: 1 });
    }

    const recovery = recoveryEvents.find(
      (e) => (e.data.towerId as string) === towerId && e.timestamp > event.timestamp
    );
    const downtime = recovery ? recovery.timestamp - event.timestamp : 10;
    stat.totalDowntime += downtime;
    stat.lastFailureAt = event.timestamp;
  });

  stats.forEach((stat) => {
    if (stat.failureCount > 0) {
      stat.avgRecoveryTime = stat.totalDowntime / stat.failureCount;
    }

    stat.affectedMissionCount = ctx.missions.filter(
      (m) =>
        m.path.towers.includes(stat.towerId) &&
        (m.status === 'failed' || m.interruptions > 0)
    ).length;

    const tower = ctx.towers.find((t) => t.id === stat.towerId);
    const isCurrentlyDisabled = tower?.isDisabled ? 30 : 0;
    const frequencyScore = stat.failureCount * 15;
    const missionImpact = stat.affectedMissionCount * 10;
    stat.riskScore = clampScore(isCurrentlyDisabled + frequencyScore + missionImpact);
  });

  return Array.from(stats.values())
    .filter((s) => s.failureCount > 0 || s.affectedMissionCount > 0)
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function predictFailures(
  ctx: DomainContext,
  horizonSeconds: number = 60
): FailurePrediction[] {
  const predictions: FailurePrediction[] = [];
  const now = ctx.currentTime;

  const stats = calculateFaultyTowerStats(ctx);
  const disableEvents = ctx.historyEvents.filter((e) => e.type === 'tower_disabled');

  ctx.towers.forEach((tower) => {
    if (tower.isDisabled) return;

    const towerStat = stats.find((s) => s.towerId === tower.id);
    const recentFailures = disableEvents.filter(
      (e) =>
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

    const highGarrisonNeighbors = ctx.towers.filter((t) => {
      if (t.id === tower.id) return false;
      if (t.garrisonCount < t.baseGarrisonCount * 0.8) return false;
      const dist = Math.sqrt(
        Math.pow(t.x - tower.x, 2) + Math.pow(t.y - tower.y, 2)
      );
      return dist <= tower.visualRange;
    }).length;

    predictions.push({
      towerId: tower.id,
      towerCode: tower.code,
      timeWindowStart: now,
      timeWindowEnd: now + horizonSeconds,
      failureProbability: Math.round(probability * 100),
      confidence: clampScore(50 + recentFailures * 15 + highGarrisonNeighbors * 5),
      contributingFactors,
    });
  });

  return predictions.sort((a, b) => b.failureProbability - a.failureProbability);
}

export function predictMissionFailure(
  ctx: DomainContext
): MissionFailurePrediction[] {
  const predictions: MissionFailurePrediction[] = [];
  const now = ctx.currentTime;

  const runningMissions = ctx.missions.filter(
    (m) => m.status === 'running' || m.status === 'pending'
  );

  for (const mission of runningMissions) {
    const factors: MissionFailureFactor[] = [];
    let totalRisk = 0.1;

    const pathTowers = mission.path.towers
      .map((tid) => ctx.towers.find((t) => t.id === tid))
      .filter((t): t is BeaconTower => t !== undefined);

    const disabledOnPath = pathTowers.filter((t) => t.isDisabled);
    if (disabledOnPath.length > 0) {
      factors.push({
        factorType: 'tower_risk',
        description: `路径上 ${disabledOnPath.map((t) => t.code).join(', ')} 台站故障`,
        severity: disabledOnPath.length * 0.3,
        relatedIds: disabledOnPath.map((t) => t.id),
      });
      totalRisk += disabledOnPath.length * 0.3;
    }

    const lowGarrisonOnPath = pathTowers.filter(
      (t) =>
        !t.isDisabled &&
        t.garrisonCount / Math.max(1, t.baseGarrisonCount) < WARNING_THRESHOLDS.garrisonMinRatio
    );
    if (lowGarrisonOnPath.length > 0) {
      factors.push({
        factorType: 'garrison_low',
        description: `路径上 ${lowGarrisonOnPath.map((t) => t.code).join(', ')} 驻军不足`,
        severity: lowGarrisonOnPath.length * 0.15,
        relatedIds: lowGarrisonOnPath.map((t) => t.id),
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
    ctx.missions.forEach((m) => {
      if (m.id === mission.id) return;
      m.path.towers.forEach((tid) => {
        missionLoad.set(tid, (missionLoad.get(tid) || 0) + 1);
      });
    });
    const overloadedTowers = pathTowers.filter(
      (t) => (missionLoad.get(t.id) || 0) >= WARNING_THRESHOLDS.bottleneckLoad
    );
    if (overloadedTowers.length > 0) {
      factors.push({
        factorType: 'path_overload',
        description: `路径上 ${overloadedTowers.map((t) => t.code).join(', ')} 负载过高`,
        severity: overloadedTowers.length * 0.1,
        relatedIds: overloadedTowers.map((t) => t.id),
      });
      totalRisk += overloadedTowers.length * 0.1;
    }

    const source = ctx.enemySources.find((e) => e.id === mission.enemySourceId);
    if (source && source.level.priority >= WARNING_THRESHOLDS.enemyPriorityCritical) {
      factors.push({
        factorType: 'enemy_pressure',
        description: `${source.level.name}敌情压力增大`,
        severity: 0.15,
        relatedIds: [source.id],
      });
      totalRisk += 0.15;
    }

    const recentFailures = ctx.historyEvents.filter(
      (e) => e.type === 'signal_failed' && e.timestamp > now - 60
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
      .filter(
        (t) => t.isDisabled || t.garrisonCount / Math.max(1, t.baseGarrisonCount) < 0.3
      )
      .map((t) => t.id);

    const recommendedActions: RecommendedAction[] = [];

    if (lowGarrisonOnPath.length > 0) {
      const targetTower = lowGarrisonOnPath[0];
      recommendedActions.push({
        actionType: 'dispatch_garrison',
        description: `向 ${targetTower.code} 增派驻军 ${Math.ceil(
          targetTower.baseGarrisonCount * 0.5 - targetTower.garrisonCount
        )} 人`,
        targetIds: [targetTower.id],
        expectedImprovement: `提升 ${targetTower.code} 驻军至安全水平，降低传递延迟`,
        priority: 1,
      });
    }

    if (disabledOnPath.length > 0) {
      recommendedActions.push({
        actionType: 'switch_route',
        description: '切换备用传递路线绕过故障台站',
        targetIds: disabledOnPath.map((t) => t.id),
        expectedImprovement: '绕过故障台站，恢复信号传递',
        priority: 1,
      });
    }

    if (overloadedTowers.length > 0) {
      recommendedActions.push({
        actionType: 'add_relay',
        description: `在 ${overloadedTowers.map((t) => t.code).join('、')} 附近增设中继台`,
        targetIds: overloadedTowers.map((t) => t.id),
        expectedImprovement: '分流信号负载，降低瓶颈台站压力',
        priority: 2,
      });
    }

    predictions.push({
      missionId: mission.id,
      enemySourceId: mission.enemySourceId,
      failureProbability: Math.round(failureProbability * 100),
      confidence: clampScore(40 + factors.length * 12 + recentFailures * 8),
      contributingFactors: factors,
      criticalPathTowers,
      recommendedActions: recommendedActions.sort((a, b) => a.priority - b.priority),
    });
  }

  return predictions.sort((a, b) => b.failureProbability - a.failureProbability);
}

export function generateTheaterReport(
  ctx: TheaterContext
): TheaterReport {
  const now = ctx.currentTime;
  const periodStart =
    ctx.warnings.length > 0
      ? Math.min(...ctx.warnings.map((w) => w.createdAt))
      : 0;

  const allWarningScores = ctx.warnings.map((w) => {
    const scores: Record<RiskLevel, number> = {
      low: 10,
      medium: 35,
      high: 60,
      critical: 85,
    };
    return scores[w.riskLevel];
  });
  const overallRiskScore =
    allWarningScores.length > 0
      ? Math.round(
          allWarningScores.reduce((a, b) => a + b, 0) / allWarningScores.length
        )
      : 0;

  const acknowledgedWarnings = ctx.warnings.filter(
    (w) => w.acknowledgedAt !== undefined
  );
  const resolvedWarnings = ctx.warnings.filter((w) => w.resolvedAt !== undefined);

  const avgAckTime =
    acknowledgedWarnings.length > 0
      ? acknowledgedWarnings.reduce(
          (sum, w) => sum + ((w.acknowledgedAt || w.createdAt) - w.createdAt),
          0
        ) / acknowledgedWarnings.length
      : 0;

  const avgResolveTime =
    resolvedWarnings.length > 0
      ? resolvedWarnings.reduce(
          (sum, w) => sum + ((w.resolvedAt || w.createdAt) - w.createdAt),
          0
        ) / resolvedWarnings.length
      : 0;

  const criticalWarnings = ctx.warnings.filter((w) => w.riskLevel === 'critical');
  const highWarnings = ctx.warnings.filter((w) => w.riskLevel === 'high');
  const criticalResponseRate =
    criticalWarnings.length > 0
      ? criticalWarnings.filter((w) => w.acknowledgedAt !== undefined).length /
        criticalWarnings.length
      : 1;
  const highResponseRate =
    highWarnings.length > 0
      ? highWarnings.filter((w) => w.acknowledgedAt !== undefined).length /
        highWarnings.length
      : 1;
  const overallResponseRate =
    ctx.warnings.length > 0
      ? ctx.warnings.filter((w) => w.acknowledgedAt !== undefined).length /
        ctx.warnings.length
      : 1;

  const successfulDisposals = ctx.disposalRecords.filter((d) => d.improved);
  const disposalSuccessRate =
    ctx.disposalRecords.length > 0
      ? successfulDisposals.length / ctx.disposalRecords.length
      : 0;

  const theaterZoneSummaries: TheaterZoneSummary[] = ctx.theaterZones.map((zone) => {
    const zoneWarnings = ctx.warnings.filter((w) =>
      w.affectedScope.towerIds.some((tid) => zone.towerIds.includes(tid))
    );
    const categoryCount = new Map<string, number>();
    zoneWarnings.forEach((w) => {
      categoryCount.set(w.category, (categoryCount.get(w.category) || 0) + 1);
    });
    const dominantCategory =
      Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'enemy_threat';

    const zoneDisposals = ctx.disposalRecords.filter((d) => {
      const relatedWarning = ctx.warnings.find((w) => w.id === d.warningId);
      return (
        relatedWarning?.affectedScope.towerIds.some((tid) =>
          zone.towerIds.includes(tid)
        ) ?? false
      );
    });

    const zoneAckWarnings = zoneWarnings.filter((w) => w.acknowledgedAt);
    const avgResponseTime =
      zoneAckWarnings.length > 0
        ? zoneAckWarnings.reduce(
            (sum, w) => sum + ((w.acknowledgedAt || w.createdAt) - w.createdAt),
            0
          ) / zoneAckWarnings.length
        : 0;

    const successfulZoneDisposals = zoneDisposals.filter((d) => d.improved);
    const zoneDisposalSuccessRate =
      zoneDisposals.length > 0
        ? successfulZoneDisposals.length / zoneDisposals.length
        : 0;

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      riskScore: zone.riskScore,
      riskLevel: zone.riskLevel,
      warningCount: zoneWarnings.length,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      disposalCount: zoneDisposals.length,
      disposalSuccessRate: Math.round(zoneDisposalSuccessRate * 100) / 100,
      dominantCategory: dominantCategory as Warning['category'],
    };
  });

  const responseEfficiency: ResponseEfficiency = {
    avgAckTime: Math.round(avgAckTime * 10) / 10,
    avgResolveTime: Math.round(avgResolveTime * 10) / 10,
    criticalResponseRate: Math.round(criticalResponseRate * 100) / 100,
    highResponseRate: Math.round(highResponseRate * 100) / 100,
    overallResponseRate: Math.round(overallResponseRate * 100) / 100,
  };

  const criticalFailureChains: FailureChain[] = [];
  const failureMissions = ctx.missions.filter((m) => m.status === 'failed');
  failureMissions.forEach((mission) => {
    const relatedWarnings = ctx.warnings.filter((w) =>
      w.affectedScope.missionIds?.includes(mission.id)
    );
    const failedTowers = mission.path.towers.filter((tid) => {
      const tower = ctx.towers.find((t) => t.id === tid);
      return tower?.isDisabled;
    });

    if (relatedWarnings.length > 0 || failedTowers.length > 0) {
      criticalFailureChains.push({
        chainId: ID.chain(),
        towerIds: failedTowers,
        missionIds: [mission.id],
        warningIds: relatedWarnings.map((w) => w.id),
        rootCause: mission.failedReason || '未知原因',
        impactScore: clampScore(relatedWarnings.length * 25 + failedTowers.length * 30),
        description: `任务 ${mission.id.slice(0, 8)} 失败，影响 ${failedTowers.length} 座台站，${relatedWarnings.length} 条预警关联`,
      });
    }
  });

  const optimizationSuggestions: OptimizationSuggestion[] = [];
  let suggestionPriority = 1;

  const lowGarrisonTowers = ctx.towers.filter(
    (t) => t.isActive && !t.isDisabled && t.garrisonCount / Math.max(1, t.baseGarrisonCount) < 0.5
  );
  if (lowGarrisonTowers.length > 0) {
    const affectedZones = ctx.theaterZones
      .filter((z) => lowGarrisonTowers.some((t) => z.towerIds.includes(t.id)))
      .map((z) => z.id);

    optimizationSuggestions.push({
      id: ID.optimization(),
      category: 'garrison',
      priority: suggestionPriority++,
      description: `${lowGarrisonTowers.length} 座烽火台驻军不足编制的50%，建议立即调度增援`,
      expectedBenefit: '预计可降低传递延迟30%，减少驻军不足类预警60%',
      affectedZoneIds: affectedZones,
    });
  }

  const disabledTowerStats = calculateFaultyTowerStats(ctx).slice(0, 2);
  if (disabledTowerStats.length > 0) {
    const affectedZones = ctx.theaterZones
      .filter((z) => disabledTowerStats.some((s) => z.towerIds.includes(s.towerId)))
      .map((z) => z.id);

    optimizationSuggestions.push({
      id: ID.optimization(),
      category: 'structure',
      priority: suggestionPriority++,
      description: `${disabledTowerStats.map((s) => s.towerCode).join('、')} 故障频发，建议检修设备或调整部署位置`,
      expectedBenefit: '预计可减少台站故障40%，降低信号中断风险',
      affectedZoneIds: affectedZones,
    });
  }

  const missionPredictions = predictMissionFailure(ctx).slice(0, 3);
  if (missionPredictions.length > 0) {
    const atRiskZones = new Set<string>();
    missionPredictions.forEach((p) => {
      const mission = ctx.missions.find((m) => m.id === p.missionId);
      if (mission) {
        ctx.theaterZones.forEach((z) => {
          if (mission.path.towers.some((tid) => z.towerIds.includes(tid))) {
            atRiskZones.add(z.id);
          }
        });
      }
    });

    optimizationSuggestions.push({
      id: ID.optimization(),
      category: 'route',
      priority: suggestionPriority++,
      description: `${missionPredictions.length} 条传递任务存在较高失败风险，建议启用冗余路径或增设中继`,
      expectedBenefit: '预计可提升任务成功率25%以上',
      affectedZoneIds: Array.from(atRiskZones),
    });
  }

  return {
    generatedAt: now,
    periodStart,
    periodEnd: now,
    overallRiskLevel: getRiskLevel(overallRiskScore),
    overallRiskScore,
    theaterZoneSummaries,
    responseEfficiency,
    disposalSuccessRate: Math.round(disposalSuccessRate * 100) / 100,
    totalDisposals: ctx.disposalRecords.length,
    successfulDisposals: successfulDisposals.length,
    criticalFailureChains,
    optimizationSuggestions: optimizationSuggestions.sort((a, b) => a.priority - b.priority),
  };
}
