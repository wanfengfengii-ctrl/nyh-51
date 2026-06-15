import { useState, useMemo } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  ScrollArea,
  Slider,
  Select,
  Timeline,
  Divider,
  ThemeIcon,
  SimpleGrid,
} from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { WarningReplayEvent } from '../types';
import { getRiskColor, getRiskLabel, getRiskIcon } from '../utils/warningEngine';

const replayEventTypeLabels: Record<WarningReplayEvent['eventType'], string> = {
  warning_generated: '预警生成',
  warning_upgraded: '预警升级',
  warning_downgraded: '预警降级',
  warning_acknowledged: '预警确认',
  warning_resolved: '预警解除',
  warning_expired: '预警过期',
  linkage_triggered: '联动触发',
  disposal_executed: '处置执行',
  disposal_evaluated: '处置评估',
};

const replayEventTypeIcons: Record<WarningReplayEvent['eventType'], string> = {
  warning_generated: '🔴',
  warning_upgraded: '⬆️',
  warning_downgraded: '⬇️',
  warning_acknowledged: '✅',
  warning_resolved: '🟢',
  warning_expired: '⏰',
  linkage_triggered: '🔗',
  disposal_executed: '⚙️',
  disposal_evaluated: '📊',
};

const replayEventTypeColors: Record<WarningReplayEvent['eventType'], string> = {
  warning_generated: 'red',
  warning_upgraded: 'orange',
  warning_downgraded: 'green',
  warning_acknowledged: 'blue',
  warning_resolved: 'green',
  warning_expired: 'gray',
  linkage_triggered: 'violet',
  disposal_executed: 'cyan',
  disposal_evaluated: 'teal',
};

export function WarningReplayPanel() {
  const {
    warningReplayEvents,
  } = useSimulationStore();

  const [filterType, setFilterType] = useState<string>('all');
  const [replayPosition, setReplayPosition] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);

  const maxTime = warningReplayEvents.length > 0
    ? Math.max(...warningReplayEvents.map(e => e.timestamp))
    : 0;
  const minTime = warningReplayEvents.length > 0
    ? Math.min(...warningReplayEvents.map(e => e.timestamp))
    : 0;

  const filteredEvents = useMemo(() => {
    let events = warningReplayEvents;
    if (filterType !== 'all') {
      events = events.filter(e => e.eventType === filterType);
    }
    const cutoffTime = minTime + (maxTime - minTime) * (replayPosition / 100);
    return events.filter(e => e.timestamp <= cutoffTime);
  }, [warningReplayEvents, filterType, replayPosition, minTime, maxTime]);

  const stats = useMemo(() => {
    const total = warningReplayEvents.length;
    const generated = warningReplayEvents.filter(e => e.eventType === 'warning_generated').length;
    const upgraded = warningReplayEvents.filter(e => e.eventType === 'warning_upgraded').length;
    const resolved = warningReplayEvents.filter(e => e.eventType === 'warning_resolved').length;
    const downgraded = warningReplayEvents.filter(e => e.eventType === 'warning_downgraded').length;
    const linkages = warningReplayEvents.filter(e => e.eventType === 'linkage_triggered').length;
    const disposals = warningReplayEvents.filter(e => e.eventType === 'disposal_executed').length;
    const evaluated = warningReplayEvents.filter(e => e.eventType === 'disposal_evaluated').length;

    return { total, generated, upgraded, downgraded, resolved, linkages, disposals, evaluated };
  }, [warningReplayEvents]);

  const formatTime = (timestamp: number) => {
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const eventFilterOptions = [
    { value: 'all', label: '全部事件' },
    { value: 'warning_generated', label: '预警生成' },
    { value: 'warning_upgraded', label: '预警升级' },
    { value: 'warning_downgraded', label: '预警降级' },
    { value: 'warning_resolved', label: '预警解除' },
    { value: 'linkage_triggered', label: '联动触发' },
    { value: 'disposal_executed', label: '处置执行' },
    { value: 'disposal_evaluated', label: '处置评估' },
  ];

  if (warningReplayEvents.length === 0) {
    return (
      <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
        <Text size="lg" c="dimmed">⏪ 暂无预警回放数据</Text>
        <Text size="sm" c="dimmed" mt="xs">运行模拟后，系统将记录预警生成、升级、解除及指挥响应全过程</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <SimpleGrid cols={4}>
        <Card p="sm" radius="md" withBorder style={{ borderLeft: '3px solid #ef4444' }}>
          <Text size="xs" c="dimmed">预警生成</Text>
          <Text fw={700} size="lg" c="red">{stats.generated}</Text>
        </Card>
        <Card p="sm" radius="md" withBorder style={{ borderLeft: '3px solid #f97316' }}>
          <Text size="xs" c="dimmed">升级/降级</Text>
          <Text fw={700} size="lg" c="orange">{stats.upgraded}/{stats.downgraded || 0}</Text>
        </Card>
        <Card p="sm" radius="md" withBorder style={{ borderLeft: '3px solid #22c55e' }}>
          <Text size="xs" c="dimmed">解除/联动</Text>
          <Text fw={700} size="lg" c="green">{stats.resolved}/{stats.linkages}</Text>
        </Card>
        <Card p="sm" radius="md" withBorder style={{ borderLeft: '3px solid #3b82f6' }}>
          <Text size="xs" c="dimmed">处置/评估</Text>
          <Text fw={700} size="lg" c="blue">{stats.disposals}/{stats.evaluated}</Text>
        </Card>
      </SimpleGrid>

      <Card p="md" radius="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>⏪ 预警回放时间轴</Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant={isPlaying ? 'filled' : 'light'}
              color="blue"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
            </Button>
            <Select
              size="xs"
              value={playSpeed.toString()}
              onChange={(v) => setPlaySpeed(Number(v) || 1)}
              data={[
                { value: '0.5', label: '0.5x' },
                { value: '1', label: '1x' },
                { value: '2', label: '2x' },
                { value: '4', label: '4x' },
              ]}
              style={{ width: 80 }}
            />
            <Select
              size="xs"
              value={filterType}
              onChange={(v) => setFilterType(v || 'all')}
              data={eventFilterOptions}
              style={{ width: 120 }}
            />
          </Group>
        </Group>

        <Stack gap="xs" mb="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">回放进度</Text>
            <Text size="xs" fw={500}>
              {formatTime(minTime + (maxTime - minTime) * (replayPosition / 100))} / {formatTime(maxTime)}
            </Text>
          </Group>
          <Slider
            value={replayPosition}
            onChange={setReplayPosition}
            min={0}
            max={100}
            step={0.5}
          />
        </Stack>

        <Divider mb="sm" />

        <ScrollArea h={400} type="auto">
          {filteredEvents.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              当前时间范围内无预警事件
            </Text>
          ) : (
            <Timeline active={filteredEvents.length - 1} bulletSize={20} lineWidth={2}>
              {[...filteredEvents].reverse().map(event => (
                <Timeline.Item
                  key={event.id}
                  bullet={
                    <ThemeIcon
                      size={20}
                      radius="xl"
                      color={replayEventTypeColors[event.eventType]}
                    >
                      {replayEventTypeIcons[event.eventType]}
                    </ThemeIcon>
                  }
                  color={replayEventTypeColors[event.eventType]}
                  title={
                    <Group gap="xs" justify="space-between">
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {replayEventTypeLabels[event.eventType]}
                        </Text>
                        <Badge size="xs" color={getRiskColor(event.riskLevel)} variant="light">
                          {getRiskIcon(event.riskLevel)} {getRiskLabel(event.riskLevel)}
                        </Badge>
                        {event.previousRiskLevel && (
                          <Text size="xs" c="dimmed">
                            ({getRiskLabel(event.previousRiskLevel)} → {getRiskLabel(event.riskLevel)})
                          </Text>
                        )}
                      </Group>
                      <Badge size="xs" variant="light" color="gray">
                        {formatTime(event.timestamp)}
                      </Badge>
                    </Group>
                  }
                >
                  <Text size="xs" fw={500} mb={2}>{event.warningTitle}</Text>
                  <Text size="xs" c="dimmed">{event.description}</Text>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </ScrollArea>
      </Card>
    </Stack>
  );
}
