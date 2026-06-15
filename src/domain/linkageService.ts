import {
  Warning,
  LinkageTrigger,
  LinkageAction,
  DisposalRecord,
} from '../types';
import { ID } from './types/ids';
import { DomainContext } from './context';
import { riskLevelToScore } from './riskUtils';

export function createLinkageTrigger(
  warning: Warning,
  ctx: DomainContext
): LinkageTrigger | null {
  if (warning.riskLevel !== 'critical' && warning.riskLevel !== 'high') return null;
  if (warning.status !== 'active') return null;

  const actions: LinkageAction[] = [];

  actions.push({
    id: ID.action(),
    type: 'popup',
    description: `弹窗告警：${warning.title}`,
    status: 'pending',
  });

  if (warning.riskLevel === 'critical') {
    actions.push({
      id: ID.action(),
      type: 'sound',
      description: '声音告警：紧急预警警报',
      status: 'pending',
    });
  }

  if (warning.suggestions.length > 0) {
    const topSuggestion = warning.suggestions[0];
    actions.push({
      id: ID.action(),
      type: 'dispatch',
      description: `建议调度：${topSuggestion.reason}`,
      status: 'pending',
    });
  }

  if (warning.category === 'tower_failure' || warning.category === 'transmission_risk') {
    actions.push({
      id: ID.action(),
      type: 'route_switch',
      description: '建议切换备用传递路线',
      status: 'pending',
    });
  }

  if (warning.category === 'blind_spot') {
    actions.push({
      id: ID.action(),
      type: 'relay_add',
      description: '建议在盲区增设中继台',
      status: 'pending',
    });
  }

  return {
    id: ID.linkage(),
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

export function collectNewLinkageTriggers(
  warnings: Warning[],
  existingTriggers: LinkageTrigger[],
  ctx: DomainContext
): LinkageTrigger[] {
  const newTriggers: LinkageTrigger[] = [];
  const existingWarningIds = new Set(existingTriggers.map((t) => t.warningId));

  for (const warning of warnings) {
    if (existingWarningIds.has(warning.id)) continue;

    const trigger = createLinkageTrigger(warning, ctx);
    if (trigger) {
      newTriggers.push(trigger);
    }
  }

  return newTriggers;
}

export function dismissLinkage(
  trigger: LinkageTrigger,
  dismissedAt: number
): LinkageTrigger {
  return {
    ...trigger,
    autoDismissed: true,
    dismissedAt,
  };
}

export function executeLinkageAction(
  trigger: LinkageTrigger,
  actionId: string,
  executedAt: number,
  result?: string
): LinkageTrigger {
  return {
    ...trigger,
    actions: trigger.actions.map((a) =>
      a.id === actionId
        ? { ...a, status: 'executed' as const, executedAt, result }
        : a
    ),
  };
}

export function calculateWarningRiskScore(
  warning: Warning,
  ctx: DomainContext
): number {
  const towerIds = warning.affectedScope.towerIds;
  const affectedTowers = ctx.towers.filter((t) => towerIds.includes(t.id));

  let score = 0;

  switch (warning.category) {
    case 'garrison_insufficient': {
      const avgRatio =
        affectedTowers.reduce(
          (sum, t) => sum + (t.garrisonCount / Math.max(1, t.baseGarrisonCount)),
          0
        ) / Math.max(1, affectedTowers.length);
      score = (1 - avgRatio) * 100;
      break;
    }
    case 'tower_failure': {
      const stillDisabled = affectedTowers.filter((t) => t.isDisabled).length;
      score = (stillDisabled / Math.max(1, affectedTowers.length)) * 100;
      break;
    }
    case 'weather_risk': {
      score = (1 - ctx.weather.visibilityFactor) * 100;
      break;
    }
    case 'enemy_threat': {
      const activeEnemies = ctx.enemySources.filter(
        (e) =>
          (e.status === 'active' || e.status === 'pending') &&
          warning.affectedScope.enemySourceIds?.includes(e.id)
      ).length;
      score = Math.min(100, activeEnemies * 40);
      break;
    }
    case 'transmission_risk': {
      const failedMissions = ctx.missions.filter(
        (m) =>
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

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function evaluateDisposal(
  disposalRecord: DisposalRecord,
  warnings: Warning[],
  ctx: DomainContext
): DisposalRecord {
  const relatedWarning = warnings.find((w) => w.id === disposalRecord.warningId);
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

export function createDisposalRecord(
  warningId: string,
  actionType: DisposalRecord['actionType'],
  details: string,
  warnings: Warning[],
  ctx: DomainContext
): DisposalRecord {
  const relatedWarning = warnings.find((w) => w.id === warningId);
  const preRiskScore = relatedWarning
    ? riskLevelToScore(relatedWarning.riskLevel)
    : calculateWarningRiskScore(
        { id: warningId } as Warning,
        ctx
      );

  const baseRecord: DisposalRecord = {
    id: ID.disposal(),
    warningId,
    actionType,
    executedAt: ctx.currentTime,
    preRiskScore,
    postRiskScore: preRiskScore,
    improvementDelta: 0,
    improved: false,
    details,
    relatedWarningIds: [warningId],
  };

  return evaluateDisposal(baseRecord, warnings, ctx);
}
