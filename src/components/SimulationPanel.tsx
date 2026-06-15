import { useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Progress,
  Slider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSimulationStore } from '../store/useSimulationStore';

export function SimulationPanel() {
  const {
    simulation,
    paths,
    selectedPathId,
    startTowerId,
    endTowerId,
    calculatePaths,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    setSimulationStep,
  } = useSimulationStore();

  const selectedPath = paths.find((p) => p.id === selectedPathId);

  useEffect(() => {
    if (startTowerId && endTowerId && paths.length === 0) {
      calculatePaths();
    }
  }, [startTowerId, endTowerId, paths.length, calculatePaths]);

  const handleStart = useCallback(() => {
    if (!selectedPath || selectedPath.towers.length < 2) {
      notifications.show({
        title: '无法开始模拟',
        message: '请先选择起点和终点，并确保有可行的传递路线',
        color: 'red',
      });
      return;
    }
    startSimulation();
    notifications.show({
      title: '模拟开始',
      message: '信号传递模拟已启动',
      color: 'green',
    });
  }, [selectedPath, startSimulation]);

  const handlePause = () => {
    pauseSimulation();
    notifications.show({
      title: '模拟暂停',
      message: '信号传递已暂停',
      color: 'yellow',
    });
  };

  const handleResume = () => {
    resumeSimulation();
    notifications.show({
      title: '模拟继续',
      message: '信号传递继续进行',
      color: 'green',
    });
  };

  const handleStop = () => {
    stopSimulation();
    notifications.show({
      title: '模拟停止',
      message: '信号传递模拟已停止',
      color: 'blue',
    });
  };

  const handleSliderChange = (value: number) => {
    setSimulationStep(value);
  };

  const getStatusBadge = () => {
    switch (simulation.status) {
      case 'idle':
        return <Badge color="gray">待机</Badge>;
      case 'running':
        return <Badge color="green" variant="filled">运行中</Badge>;
      case 'paused':
        return <Badge color="yellow">已暂停</Badge>;
      case 'completed':
        return <Badge color="blue">已完成</Badge>;
      default:
        return null;
    }
  };

  const totalSteps = selectedPath ? selectedPath.towers.length - 1 : 0;
  const progressPercent = totalSteps > 0 ? (simulation.currentStep / totalSteps) * 100 : 0;

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">模拟控制</Text>
        {getStatusBadge()}
      </Group>

      <Stack gap="md">
        {selectedPath ? (
          <>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">传递进度</Text>
                <Text size="sm" fw={500}>
                  {simulation.currentStep} / {totalSteps} 站
                </Text>
              </Group>
              <Progress value={progressPercent} color="orange" size="sm" />
            </Stack>

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">总耗时</Text>
                <Text size="sm" fw={500}>
                  {selectedPath.totalTime.toFixed(1)} 秒
                </Text>
              </Group>
            </Stack>

            {simulation.status !== 'idle' && totalSteps > 0 && (
              <Stack gap="xs">
                <Text size="sm">手动调步</Text>
                <Slider
                  value={simulation.currentStep}
                  onChange={handleSliderChange}
                  min={0}
                  max={totalSteps}
                  step={1}
                  marks={selectedPath.towers.map((_, i) => ({
                    value: i,
                    label: '',
                  }))}
                />
              </Stack>
            )}
          </>
        ) : (
          <Text c="dimmed" ta="center" py="md" size="sm">
            请先选择起点和终点
          </Text>
        )}

        <Group grow>
          {simulation.status === 'idle' || simulation.status === 'completed' ? (
            <Button
              color="green"
              onClick={handleStart}
              disabled={!selectedPath || selectedPath.towers.length < 2}
              leftSection="▶"
            >
              开始模拟
            </Button>
          ) : simulation.status === 'running' ? (
            <Button
              color="yellow"
              onClick={handlePause}
              leftSection="⏸"
            >
              暂停
            </Button>
          ) : (
            <Button
              color="green"
              onClick={handleResume}
              leftSection="▶"
            >
              继续
            </Button>
          )}

          {(simulation.status === 'running' || simulation.status === 'paused') && (
            <Button
              color="red"
              onClick={handleStop}
              leftSection="⏹"
            >
              停止
            </Button>
          )}
        </Group>

        <Button
          variant="light"
          onClick={calculatePaths}
          disabled={!startTowerId || !endTowerId}
          leftSection="🔄"
        >
          重新计算路线
        </Button>
      </Stack>
    </Card>
  );
}
