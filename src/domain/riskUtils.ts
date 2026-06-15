import { RiskLevel, WarningCategory, WarningStatus } from '../types';

export const RISK_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 35,
  low: 0,
} as const;

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
} as const;

export function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_THRESHOLDS.high) return 'high';
  if (score >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function riskLevelToScore(level: RiskLevel): number {
  const scores: Record<RiskLevel, number> = {
    critical: 85,
    high: 60,
    medium: 35,
    low: 10,
  };
  return scores[level];
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

export function compareRiskLevel(a: RiskLevel, b: RiskLevel): number {
  const order: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  return order[a] - order[b];
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
