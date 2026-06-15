import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Slider,
  Select,
  Timeline,
  Divider,
  Progress,
} from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { HistoryEvent, SignalMission } from '../types';

const eventTypeColors: Record<HistoryEvent['type'], string> = {
  enemy_detected: 'red',
  enemy_merged: 'orange',
  signal_start: 'green',
  signal_reach: 'blue',
  signal_complete: 'green',
  signal_failed: 'red',
  signal_interrupted: 'yellow',
  garrison_dispatch: 'blue',
  weather_change: 'violet',
  tower_disabled: 'red',
  tower_recovered: 'green',
  path_recalculated: 'orange',
  simulation_start: 'green',
  simulation_end: 'blue',
};

const eventTypeIcons: Record<HistoryEvent['type'], string> = {
  enemy_detected: '⚠️',
  enemy_merged: '🔀',
  signal_start: '🚀',
  signal_reach: '📡',
  signal_complete: '✅',
  signal_failed: '❌',
  signal_interrupted: '⏸️',
  garrison_dispatch: '🚀',
  weather_change: '🌤️',
  tower_disabled: '🔴',
  tower_recovered: '🟢',
  path_recalculated: '🔄',
  simulation_start: '▶️',
  simulation_end: '⏹️',
};

export function HistoryReplayPanel() {
  const {
    historyEvents,
    snapshots,
    simulation,
    missions,
    towers,
    startReplay,
    stopReplay,
    setReplayTime,
    setReplaySpeed,
    seekReplay,
    showEvaluation,
    setShowEvaluation,
  } = useSimulationStore();

  const [filterType, setFilterType] = useState<string>('all');
  const [isPlaying, setIsPlaying] = useState(false);

  const maxTime = snapshots.length > 0 ? Math.max(...snapshots.map(s => s.timestamp)) : 0;

  useEffect(() => {
    if (!isPlaying || !simulation.isReplaying) return;

    const interval = setInterval(() => {
      const newTime = simulation.replayTime + 0.1 * simulation.replaySpeed;
      if (newTime >= maxTime) {
        setIsPlaying(false);
        setReplayTime(maxTime);
      } else {
        setReplayTime(newTime);
        seekReplay(newTime);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, simulation.isReplaying, simulation.replayTime, simulation.replaySpeed, maxTime, setReplayTime, seekReplay]);

  const handlePlayPause = useCallback(() => {
    if (!simulation.isReplaying) {
      startReplay();
    }
    setIsPlaying(!isPlaying);
  }, [simulation.isReplaying, isPlaying, startReplay]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    stopReplay();
  }, [stopReplay]);

  const handleSeek = useCallback((value: number) => {
    setReplayTime(value);
    seekReplay(value);
  }, [setReplayTime, seekReplay]);

  const filteredEvents = historyEvents.filter(event => {
    if (filterType === 'all') return true;
    return event.type === filterType;
  });

  const getMissionProgress = (mission: SignalMission) => {
    const totalSteps = mission.path.towers.length - 1;
    return totalSteps > 0 ? (mission.currentStep / totalSteps) * 100 : 0;
  };

  const getTowerCode = (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    return tower?.code || '未知';
  };

  const eventTypes = [
    { value: 'all', label: '全部事件' },
    { value: 'enemy_detected', label: '敌情发现' },
    { value: 'signal_complete', label: '信号完成' },
    { value: 'signal_failed', label: '信号失败' },
    { value: 'garrison_dispatch', label: '驻军调度' },
    { value: 'weather_change', label: '天气变化' },
    { value: 'tower_disabled', label: '台站故障' },
    { value: 'path_recalculated', label: '路径重算' },
  ];

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">历史回放</Text>
        <Group gap="xs">
          <Button
            size="sm"
            variant={showEvaluation ? 'filled' : 'light'}
            color="violet"
            onClick={() => setShowEvaluation(!showEvaluation)}
            leftSection="📊"
          >
            {showEvaluation ? '隐藏评估' : '查看评估'}
          </Button>
          <Button
            size="sm"
            variant={simulation.isReplaying ? 'filled' : 'light'}
            color="blue"
            onClick={() => {
              if (simulation.isReplaying) {
                handleStop();
              } else {
                startReplay();
              }
            }}
            leftSection="⏮️"
            disabled={historyEvents.length === 0}
          >
            {simulation.isReplaying ? '退出回放' : '开始回放'}
          </Button>
        </Group>
      </Group>

      {simulation.isReplaying && (
        <Stack gap="md" mb="md">
          <Group grow>
            <Button
              onClick={handlePlayPause}
              leftSection={isPlaying ? '⏸️' : '▶️'}
              color="blue"
            >
              {isPlaying ? '暂停' : '播放'}
            </Button>
            <Button
              onClick={handleStop}
              leftSection="⏹️"
              color="red"
              variant="light"
            >
              停止
            </Button>
            <Select
              value={simulation.replaySpeed.toString()}
              onChange={(value) => setReplaySpeed(Number(value) || 1)}
              data={[
                { value: '0.5', label: '0.5x' },
                { value: '1', label: '1x' },
                { value: '2', label: '2x' },
                { value: '4', label: '4x' },
              ]}
              style={{ width: 100 }}
            />
          </Group>

          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">回放进度</Text>
              <Text size="xs" fw={500}>
                {simulation.replayTime.toFixed(1)}s / {maxTime.toFixed(1)}s
              </Text>
            </Group>
            <Slider
              value={simulation.replayTime}
              onChange={handleSeek}
              min={0}
              max={maxTime}
              step={0.1}
              marks={snapshots.filter((_, i) => i % 10 === 0).map(s => ({
                value: s.timestamp,
                label: '',
              }))}
            />
          </Stack>

          <Divider />

          <div>
            <Text size="sm" fw={500} mb="xs">任务状态</Text>
            <ScrollArea h={120} type="auto">
              <Stack gap="xs">
                {missions.map(mission => {
                  return (
                    <Card key={mission.id} p="xs" radius="sm" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <Badge color={
                            mission.status === 'completed' ? 'green' :
                            mission.status === 'failed' ? 'red' :
                            mission.status === 'running' ? 'blue' : 'gray'
                          }>
                            {mission.status === 'completed' ? '已完成' :
                             mission.status === 'failed' ? '已失败' :
                             mission.status === 'running' ? '进行中' : '待处理'}
                          </Badge>
                          <Text size="sm" fw={500}>
                            {getTowerCode(mission.path.towers[0])} → {getTowerCode(mission.path.towers[mission.path.towers.length - 1])}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {mission.currentStep}/{mission.path.towers.length - 1} 站
                        </Text>
                      </Group>
                      <Progress
                        value={getMissionProgress(mission)}
                        size="xs"
                        color={
                          mission.status === 'completed' ? 'green' :
                          mission.status === 'failed' ? 'red' : 'blue'
                        }
                      />
                    </Card>
                  );
                })}
              </Stack>
            </ScrollArea>
          </div>
        </Stack>
      )}

      <Card p="xs" radius="sm" bg="blue.0" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>事件时间线</Text>
          <Select
            value={filterType}
            onChange={(value) => setFilterType(value || 'all')}
            data={eventTypes}
            size="xs"
            style={{ width: 120 }}
          />
        </Group>

        <ScrollArea h={300} type="auto">
          {filteredEvents.length > 0 ? (
            <Timeline active={filteredEvents.length - 1} bulletSize={16} lineWidth={2}>
              {[...filteredEvents].reverse().map((event) => (
                <Timeline.Item
                  key={event.id}
                  bullet={eventTypeIcons[event.type]}
                  color={eventTypeColors[event.type]}
                  title={
                    <Group gap="xs" justify="space-between">
                      <Text size="sm" fw={500}>{event.description}</Text>
                      <Badge size="xs" color="gray">
                        {event.timestamp.toFixed(1)}s
                      </Badge>
                    </Group>
                  }
                >
                  <Text size="xs" c="dimmed">
                    类型: {event.type.replace(/_/g, ' ')}
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              暂无历史事件
            </Text>
          )}
        </ScrollArea>
      </Card>
    </Card>
  );
}
