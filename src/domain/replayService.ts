import {
  WarningReplayEvent,
  RiskLevel,
} from '../types';
import { ID } from './types/ids';
import { ReplayContext } from './context';
import { getCategoryLabel } from './riskUtils';

export function generateWarningReplayEvents(
  ctx: ReplayContext
): WarningReplayEvent[] {
  const events: WarningReplayEvent[] = [];

  for (const warning of ctx.warnings) {
    events.push({
      id: ID.replay(),
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
        const riskOrder: Record<RiskLevel, number> = {
          low: 0,
          medium: 1,
          high: 2,
          critical: 3,
        };
        eventType =
          riskOrder[snapshot.riskLevel] > riskOrder[prev.riskLevel]
            ? 'warning_upgraded'
            : 'warning_downgraded';
      } else {
        continue;
      }

      events.push({
        id: ID.replay(),
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

  for (const trigger of ctx.linkageTriggers) {
    events.push({
      id: ID.replay(),
      timestamp: trigger.triggeredAt,
      eventType: 'linkage_triggered',
      warningId: trigger.warningId,
      warningTitle: `联动触发 - ${getCategoryLabel(trigger.triggerCategory)}`,
      warningCategory: trigger.triggerCategory,
      riskLevel: trigger.triggerLevel,
      description: `预警联动触发：${trigger.actions.map((a) => a.description).join('；')}`,
      relatedData: { actions: trigger.actions.length, soundAlert: trigger.soundAlert },
    });
  }

  for (const record of ctx.disposalRecords) {
    events.push({
      id: ID.replay(),
      timestamp: record.executedAt,
      eventType: 'disposal_executed',
      warningId: record.warningId,
      warningTitle: `处置执行 - ${record.actionType}`,
      warningCategory: 'tower_failure',
      riskLevel: 'medium',
      description: record.details,
      relatedData: {
        actionType: record.actionType,
        improved: record.improved,
      },
    });

    if (record.improved) {
      events.push({
        id: ID.replay(),
        timestamp: record.executedAt + 1,
        eventType: 'disposal_evaluated',
        warningId: record.warningId,
        warningTitle: `处置评估 - ${record.actionType}`,
        warningCategory: 'tower_failure',
        riskLevel: 'low',
        description: `处置有效，风险评分下降 ${record.improvementDelta} 分`,
        relatedData: {
          preScore: record.preRiskScore,
          postScore: record.postRiskScore,
        },
      });
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

export function getReplayEventsInRange(
  events: WarningReplayEvent[],
  startTime: number,
  endTime: number
): WarningReplayEvent[] {
  return events.filter(
    (e) => e.timestamp >= startTime && e.timestamp <= endTime
  );
}

export function groupReplayEventsByType(
  events: WarningReplayEvent[]
): Record<WarningReplayEvent['eventType'], WarningReplayEvent[]> {
  const grouped = {} as Record<WarningReplayEvent['eventType'], WarningReplayEvent[]>;

  for (const event of events) {
    if (!grouped[event.eventType]) {
      grouped[event.eventType] = [];
    }
    grouped[event.eventType].push(event);
  }

  return grouped;
}

export function getReplayEventSummary(
  events: WarningReplayEvent[]
): {
  total: number;
  warnings: number;
  linkages: number;
  disposals: number;
  byRisk: Record<RiskLevel, number>;
} {
  const summary = {
    total: events.length,
    warnings: 0,
    linkages: 0,
    disposals: 0,
    byRisk: { low: 0, medium: 0, high: 0, critical: 0 } as Record<RiskLevel, number>,
  };

  for (const event of events) {
    if (event.eventType.startsWith('warning_')) {
      summary.warnings++;
    } else if (event.eventType === 'linkage_triggered') {
      summary.linkages++;
    } else if (event.eventType.startsWith('disposal_')) {
      summary.disposals++;
    }
    summary.byRisk[event.riskLevel]++;
  }

  return summary;
}
