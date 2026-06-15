import { useCallback, useMemo } from 'react';
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Progress,
  ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSimulationStore } from '../store/useSimulationStore';
import { ENEMY_COLORS } from '../constants';

export function SimulationPanel() {
  const {
    simulation,
    missions,
    enemySources,
    isDynamicWeather,
    autoDispatch,
    setDynamicWeather,
    setAutoDispatch,
    calculatePaths,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    resetSimulation,
  } = useSimulationStore();

  const missionStats = useMemo(() => {
    const running = missions.filter(m => m.status === 'running').length;
    const completed = missions.filter(m => m.status === 'completed').length;
    const failed = missions.filter(m => m.status === 'failed').length;
    const pending = missions.filter(m => m.status === 'pending').length;
    const total = missions.length;
    
    const avgProgress = total > 0 
      ? missions.reduce((sum, m) => sum + m.signalProgress, 0) / total * 100 
      : 0;

    return { running, completed, failed, pending, total, avgProgress };
  }, [missions]);

  const handleStart = useCallback(() => {
    if (missions.length === 0) {
      notifications.show({
        title: '无法开始模拟',
        message: '请先添加至少一个敌情源',
        color: 'red',
      });
      return;
    }
    startSimulation();
    notifications.show({
      title: '联防调度开始',
      message: `开始处理 ${missionStats.total} 个敌情任务`,
      color: 'green',
    });
  }, [missions.length, startSimulation, missionStats.total]);

  const handlePause = () => {
    pauseSimulation();
    notifications.show({
      title: '模拟暂停',
      message: '所有信号传递已暂停',
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
      message: '联防调度模拟已停止，正在生成评估报告',
      color: 'blue',
    });
  };

  const handleReset = () => {
    resetSimulation();
    notifications.show({
      title: '已重置',
      message: '系统已重置，可开始新的模拟',
      color: 'gray',
    });
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

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">联防调度控制</Text>
        {getStatusBadge()}
      </Group>

      <Stack gap="md">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm">全局时间</Text>
            <Text size="sm" fw={500}>
              {simulation.globalTime.toFixed(1)} 秒
            </Text>
          </Group>
        </Stack>

        {missionStats.total > 0 && (
          <>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">总体进度</Text>
                <Text size="sm" fw={500}>
                  {missionStats.completed} / {missionStats.total} 完成
                </Text>
              </Group>
              <Progress value={missionStats.avgProgress} color="orange" size="sm" />
            </Stack>

            <Group grow>
              <Badge color="green" variant="light">
                运行中: {missionStats.running}
              </Badge>
              <Badge color="blue" variant="light">
                已完成: {missionStats.completed}
              </Badge>
              <Badge color="red" variant="light">
                失败: {missionStats.failed}
              </Badge>
            </Group>

            <Card p="xs" radius="sm" withBorder bg="gray.0">
              <Text size="xs" fw={500} mb="xs">任务列表</Text>
              <ScrollArea h={150} type="auto">
                <Stack gap="xs">
                  {missions.map((mission, idx) => {
                    const source = enemySources.find(s => s.id === mission.enemySourceId);
                    const color = ENEMY_COLORS[idx % ENEMY_COLORS.length];
                    return (
                      <Group key={mission.id} justify="space-between" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                          <div 
                            style={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              backgroundColor: color 
                            }} 
                          />
                          <Text size="xs" truncate style={{ maxWidth: 100 }}>
                            {source?.name || '未知任务'}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <Badge 
                            size="xs"
                            color={
                              mission.status === 'running' ? 'green' :
                              mission.status === 'completed' ? 'blue' :
                              mission.status === 'failed' ? 'red' : 'gray'
                            }
                          >
                            {mission.status === 'running' ? '运行' :
                             mission.status === 'completed' ? '完成' :
                             mission.status === 'failed' ? '失败' : '等待'}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {Math.round(mission.signalProgress * 100)}%
                          </Text>
                        </Group>
                      </Group>
                    );
                  })}
                </Stack>
              </ScrollArea>
            </Card>
          </>
        )}

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm">动态天气系统</Text>
            <Button
              size="xs"
              variant={isDynamicWeather ? 'filled' : 'light'}
              color={isDynamicWeather ? 'blue' : 'gray'}
              onClick={() => setDynamicWeather(!isDynamicWeather)}
            >
              {isDynamicWeather ? '已开启' : '已关闭'}
            </Button>
          </Group>
          <Group justify="space-between">
            <Text size="sm">自动驻军调度</Text>
            <Button
              size="xs"
              variant={autoDispatch ? 'filled' : 'light'}
              color={autoDispatch ? 'green' : 'gray'}
              onClick={() => setAutoDispatch(!autoDispatch)}
            >
              {autoDispatch ? '已开启' : '已关闭'}
            </Button>
          </Group>
        </Stack>

        <Group grow>
          {simulation.status === 'idle' || simulation.status === 'completed' ? (
            <Button
              color="green"
              onClick={handleStart}
              disabled={missions.length === 0}
              leftSection="▶"
            >
              开始联防
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

        <Group grow>
          <Button
            variant="light"
            onClick={calculatePaths}
            leftSection="🔄"
          >
            重新计算路线
          </Button>
          <Button
            variant="light"
            color="red"
            onClick={handleReset}
            leftSection="🗑️"
          >
            重置系统
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
