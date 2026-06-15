import { useState } from 'react';
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Select,
  Modal,
  NumberInput,
  Progress,
  Switch,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSimulationStore } from '../store/useSimulationStore';
import { findWeakTowers } from '../utils/enemyIntelligence';
import { getDispatchStatus, recalculateCoverageWithGarrison } from '../utils/garrisonDispatch';
import { GARRISON_MIN_REMAINING } from '../constants';

export function GarrisonPanel() {
  const {
    towers,
    missions,
    dispatches,
    simulation,
    dispatchGarrison,
    cancelDispatch,
    autoDispatch,
    setAutoDispatch,
  } = useSimulationStore();

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [fromTowerId, setFromTowerId] = useState<string | null>(null);
  const [toTowerId, setToTowerId] = useState<string | null>(null);
  const [dispatchCount, setDispatchCount] = useState(3);

  const weakTowers = findWeakTowers(towers, missions);
  const coverage = recalculateCoverageWithGarrison(towers);

  const availableTowers = towers.filter(t => 
    t.isActive && !t.isDisabled && t.garrisonCount > GARRISON_MIN_REMAINING
  );

  const weakTowersList = towers.filter(t => 
    t.isActive && !t.isDisabled && t.garrisonCount > 0
  );

  const handleDispatch = () => {
    if (!fromTowerId || !toTowerId || dispatchCount <= 0) {
      notifications.show({
        title: '参数错误',
        message: '请选择来源和目标烽火台，并设置调度人数',
        color: 'red',
      });
      return;
    }

    const fromTower = towers.find(t => t.id === fromTowerId);
    if (!fromTower || fromTower.garrisonCount - dispatchCount < GARRISON_MIN_REMAINING) {
      notifications.show({
        title: '人数不足',
        message: `来源台至少保留 ${GARRISON_MIN_REMAINING} 人`,
        color: 'red',
      });
      return;
    }

    dispatchGarrison(fromTowerId, toTowerId, dispatchCount);
    setIsDispatchModalOpen(false);
    setFromTowerId(null);
    setToTowerId(null);
    setDispatchCount(3);

    notifications.show({
      title: '调度已发起',
      message: `已调度 ${dispatchCount} 人`,
      color: 'green',
    });
  };

  const handleCancelDispatch = (dispatchId: string) => {
    cancelDispatch(dispatchId);
    notifications.show({
      title: '调度已取消',
      message: '驻军调度已取消',
      color: 'yellow',
    });
  };

  const getTowerCode = (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    return tower?.code || '未知';
  };

  const getRiskColor = (riskLevel: number) => {
    switch (riskLevel) {
      case 3: return 'red';
      case 2: return 'orange';
      case 1: return 'yellow';
      default: return 'gray';
    }
  };

  const getRiskText = (riskLevel: number) => {
    switch (riskLevel) {
      case 3: return '高危';
      case 2: return '中危';
      case 1: return '低危';
      default: return '正常';
    }
  };

  return (
    <>
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">驻军调度</Text>
          <Group gap="xs">
            <Group gap="xs">
              <Text size="sm">自动调度</Text>
              <Switch
                checked={autoDispatch}
                onChange={(e) => setAutoDispatch(e.target.checked)}
              />
            </Group>
            <Button
              size="sm"
              color="blue"
              onClick={() => setIsDispatchModalOpen(true)}
              leftSection="🚀"
              disabled={simulation.status === 'running'}
            >
              手动调度
            </Button>
          </Group>
        </Group>

        <Stack gap="md">
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>薄弱台站检测</Text>
              <Badge color={weakTowers.length > 0 ? 'orange' : 'green'}>
                {weakTowers.length} 处风险
              </Badge>
            </Group>

            {weakTowers.length > 0 ? (
              <ScrollArea h={120} type="auto">
                <Stack gap="xs">
                  {weakTowers.map((weak) => {
                    const tower = towers.find(t => t.id === weak.towerId);
                    const cov = coverage.get(weak.towerId);
                    return (
                      <Group key={weak.towerId} justify="space-between" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                          <Badge color={getRiskColor(weak.riskLevel)}>
                            {getRiskText(weak.riskLevel)}
                          </Badge>
                          <div>
                            <Text fw={500} size="sm">{tower?.code}</Text>
                            <Text size="xs" c="dimmed">{weak.reason}</Text>
                          </div>
                        </Group>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            驻军: {tower?.garrisonCount}/{tower?.baseGarrisonCount}
                          </Text>
                          <Text size="xs" c="dimmed">
                            覆盖: {cov?.coverageScore || 0}
                          </Text>
                        </Group>
                      </Group>
                    );
                  })}
                </Stack>
              </ScrollArea>
            ) : (
              <Text size="xs" c="green">✓ 所有台站状态良好</Text>
            )}
          </div>

          <Divider />

          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>进行中的调度</Text>
              <Badge color="blue">
                {dispatches.filter(d => d.status !== 'completed').length} 项
              </Badge>
            </Group>

            {dispatches.length > 0 ? (
              <ScrollArea h={150} type="auto">
                <Stack gap="xs">
                  {dispatches.map((dispatch) => {
                    const status = getDispatchStatus(dispatch, simulation.globalTime);
                    const fromTower = towers.find(t => t.id === dispatch.fromTowerId);
                    const toTower = towers.find(t => t.id === dispatch.toTowerId);
                    return (
                      <Card key={dispatch.id} p="xs" radius="sm" withBorder>
                        <Group justify="space-between" mb="xs" wrap="nowrap">
                          <Group gap="xs" wrap="nowrap">
                            <Badge color={status.progress >= 1 ? 'green' : 'blue'}>
                              {status.status}
                            </Badge>
                            <div>
                              <Text fw={500} size="sm">
                                {fromTower?.code} → {toTower?.code}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {dispatch.count}人 · {dispatch.reason}
                              </Text>
                            </div>
                          </Group>
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">
                              {status.eta.toFixed(0)}s
                            </Text>
                            {dispatch.status !== 'completed' && (
                              <Tooltip label="取消调度">
                                <ActionIcon
                                  size="sm"
                                  color="red"
                                  variant="subtle"
                                  onClick={() => handleCancelDispatch(dispatch.id)}
                                  disabled={simulation.status === 'running'}
                                >
                                  ✕
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Group>
                        <Progress
                          value={status.progress * 100}
                          size="xs"
                          color={status.progress >= 1 ? 'green' : 'blue'}
                        />
                      </Card>
                    );
                  })}
                </Stack>
              </ScrollArea>
            ) : (
              <Text size="xs" c="dimmed">暂无调度任务</Text>
            )}
          </div>
        </Stack>
      </Card>

      <Modal
        opened={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="手动调度驻军"
        size="md"
      >
        <Stack gap="md">
          <Group grow>
            <div>
              <Text size="sm" fw={500} mb="xs">来源烽火台</Text>
              <Select
                placeholder="选择来源"
                data={availableTowers.map(t => ({
                  value: t.id,
                  label: `${t.code} - ${t.name} (驻军: ${t.garrisonCount})`,
                }))}
                value={fromTowerId}
                onChange={setFromTowerId}
                searchable
              />
            </div>
            <div>
              <Text size="sm" fw={500} mb="xs">目标烽火台</Text>
              <Select
                placeholder="选择目标"
                data={weakTowersList
                  .filter(t => t.id !== fromTowerId)
                  .map(t => ({
                    value: t.id,
                    label: `${t.code} - ${t.name} (驻军: ${t.garrisonCount}/${t.baseGarrisonCount})`,
                  }))}
                value={toTowerId}
                onChange={setToTowerId}
                searchable
              />
            </div>
          </Group>

          <div>
            <Text size="sm" fw={500} mb="xs">调度人数</Text>
            <NumberInput
              value={dispatchCount}
              onChange={(val) => setDispatchCount(Number(val) || 0)}
              min={1}
              max={20}
              step={1}
            />
            {fromTowerId && (
              <Text size="xs" c="dimmed" mt="xs">
                来源台剩余: {(towers.find(t => t.id === fromTowerId)?.garrisonCount || 0) - dispatchCount} 人
                {' '}(至少保留 {GARRISON_MIN_REMAINING} 人)
              </Text>
            )}
          </div>

          {fromTowerId && toTowerId && (
            <Card p="xs" radius="sm" bg="#eff6ff">
              <Text size="sm" fw={500} mb="xs">调度预览</Text>
              <Text size="xs" c="dimmed">
                {getTowerCode(fromTowerId)} ({towers.find(t => t.id === fromTowerId)?.garrisonCount}人)
                {' → '}
                {getTowerCode(toTowerId)} ({towers.find(t => t.id === toTowerId)?.garrisonCount}人)
                {' '}
                调度 {dispatchCount} 人
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                预计耗时: {(GARRISON_MIN_REMAINING + 
                  Math.sqrt(
                    Math.pow((towers.find(t => t.id === fromTowerId)?.x || 0) - (towers.find(t => t.id === toTowerId)?.x || 0), 2) +
                    Math.pow((towers.find(t => t.id === fromTowerId)?.y || 0) - (towers.find(t => t.id === toTowerId)?.y || 0), 2)
                  ) / 100
                ).toFixed(1)} 秒
              </Text>
            </Card>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="light" onClick={() => setIsDispatchModalOpen(false)}>
              取消
            </Button>
            <Button
              color="blue"
              onClick={handleDispatch}
              disabled={
                !fromTowerId || 
                !toTowerId || 
                dispatchCount <= 0 ||
                (towers.find(t => t.id === fromTowerId)?.garrisonCount || 0) - dispatchCount < GARRISON_MIN_REMAINING
              }
            >
              确认调度
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
