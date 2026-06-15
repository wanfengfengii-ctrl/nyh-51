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
  Checkbox,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSimulationStore } from '../store/useSimulationStore';
import { ENEMY_LEVELS } from '../constants';
import { EnemyLevel, EnemySource } from '../types';
import { getSignalVisualType, shouldUsePathStrategy } from '../utils/enemyIntelligence';

export function EnemySourcesPanel() {
  const {
    towers,
    enemySources,
    addEnemySource,
    removeEnemySource,
    mergeEnemySourcesById,
    simulation,
  } = useSimulationStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>(ENEMY_LEVELS[0].id);
  const [startTowerId, setStartTowerId] = useState<string | null>(null);
  const [endTowerId, setEndTowerId] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const activeTowers = towers.filter(t => t.isActive && !t.isDisabled && t.garrisonCount > 0);

  const handleAddEnemy = () => {
    if (!startTowerId || !endTowerId) {
      notifications.show({
        title: '参数错误',
        message: '请选择起点和终点烽火台',
        color: 'red',
      });
      return;
    }

    if (startTowerId === endTowerId) {
      notifications.show({
        title: '参数错误',
        message: '起点和终点不能相同',
        color: 'red',
      });
      return;
    }

    const level = ENEMY_LEVELS.find(l => l.id === selectedLevel);
    if (!level) return;

    addEnemySource(level, startTowerId, endTowerId);
    setIsAddModalOpen(false);
    setStartTowerId(null);
    setEndTowerId(null);

    notifications.show({
      title: '敌情已添加',
      message: `已添加 ${level.name} 级敌情`,
      color: 'green',
    });
  };

  const handleMerge = () => {
    if (selectedSources.length < 2) {
      notifications.show({
        title: '选择错误',
        message: '请至少选择2个敌情进行合并',
        color: 'red',
      });
      return;
    }

    mergeEnemySourcesById(selectedSources);
    setSelectedSources([]);

    notifications.show({
      title: '合并成功',
      message: `已合并 ${selectedSources.length} 个敌情`,
      color: 'green',
    });
  };

  const handleRemove = (id: string) => {
    removeEnemySource(id);
    setSelectedSources(prev => prev.filter(s => s !== id));
    notifications.show({
      title: '删除成功',
      message: '敌情已删除',
      color: 'red',
    });
  };

  const getTowerCode = (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    return tower?.code || '未知';
  };

  const getStatusBadge = (source: EnemySource) => {
    switch (source.status) {
      case 'pending':
        return <Badge color="yellow">待处理</Badge>;
      case 'active':
        return <Badge color="green" variant="filled">传递中</Badge>;
      case 'completed':
        return <Badge color="blue">已完成</Badge>;
      case 'failed':
        return <Badge color="red">已失败</Badge>;
      case 'merged':
        return <Badge color="gray">已合并</Badge>;
      default:
        return null;
    }
  };

  const getSignalIcon = (level: EnemyLevel) => {
    const visual = getSignalVisualType(level);
    return (
      <Group gap={4}>
        {visual.primary === 'fire' && (
          <Text size="sm">🔥×{visual.fireIntensity}</Text>
        )}
        {visual.primary === 'smoke' && (
          <Text size="sm">🌫️×{visual.smokeColumns}</Text>
        )}
        {visual.secondary && (
          <Text size="sm">
            {visual.secondary === 'fire' ? `🔥×${visual.fireIntensity}` : `🌫️×${visual.smokeColumns}`}
          </Text>
        )}
      </Group>
    );
  };

  return (
    <>
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">敌情源管理</Text>
          <Group gap="xs">
            {selectedSources.length >= 2 && (
              <Button
                size="sm"
                color="orange"
                onClick={handleMerge}
                leftSection="🔀"
              >
                合并选中
              </Button>
            )}
            <Button
              size="sm"
              color="red"
              onClick={() => setIsAddModalOpen(true)}
              leftSection="➕"
              disabled={simulation.status === 'running'}
            >
              添加敌情
            </Button>
          </Group>
        </Group>

        <ScrollArea h={350} type="auto">
          <Stack gap="xs">
            {enemySources.map((source) => (
              <Card
                key={source.id}
                p="xs"
                radius="sm"
                withBorder
                style={{
                  borderColor: source.color,
                  borderWidth: 2,
                }}
              >
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Checkbox
                      checked={selectedSources.includes(source.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSources(prev => [...prev, source.id]);
                        } else {
                          setSelectedSources(prev => prev.filter(s => s !== source.id));
                        }
                      }}
                      disabled={source.status === 'merged' || source.status === 'completed' || source.status === 'failed'}
                    />
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: source.color,
                      }}
                    />
                    <div>
                      <Group gap="xs">
                        <Text fw={500} size="sm">{source.name}</Text>
                        {getStatusBadge(source)}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {getTowerCode(source.startTowerId)} → {getTowerCode(source.endTowerId)}
                      </Text>
                    </div>
                  </Group>
                  <Group gap={4}>
                    {getSignalIcon(source.level)}
                    <Tooltip label="删除">
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemove(source.id)}
                        disabled={simulation.status === 'running'}
                      >
                        🗑️
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                <Group gap="xs" wrap="nowrap">
                  <Badge color={source.level.priority <= 2 ? 'green' : source.level.priority === 3 ? 'yellow' : 'red'}>
                    {source.level.name}
                  </Badge>
                  <Badge color="blue" variant="light">
                    优先级 {source.priority.toFixed(1)}
                  </Badge>
                  <Badge color="violet" variant="light">
                    {shouldUsePathStrategy(source.level, towers).strategy}
                  </Badge>
                </Group>

                {source.mergedFrom && source.mergedFrom.length > 0 && (
                  <Text size="xs" c="dimmed" mt="xs">
                    合并自: {source.mergedFrom.length} 个敌情
                  </Text>
                )}
              </Card>
            ))}

            {enemySources.length === 0 && (
              <Text c="dimmed" ta="center" py="xl" size="sm">
                暂无敌情源，点击"添加敌情"创建
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Card>

      <Modal
        opened={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="添加新敌情"
        size="md"
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">敌情等级</Text>
            <ScrollArea h={200} type="auto">
              <Stack gap="xs">
                {ENEMY_LEVELS.map((level) => (
                  <Card
                    key={level.id}
                    p="xs"
                    radius="sm"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      borderColor: selectedLevel === level.id ? '#f97316' : undefined,
                      backgroundColor: selectedLevel === level.id ? '#fff7ed' : undefined,
                    }}
                    onClick={() => setSelectedLevel(level.id)}
                  >
                    <Group justify="space-between">
                      <Group gap="xs">
                        <div>
                          <Group gap="xs">
                            <Text fw={500} size="sm">{level.name}</Text>
                            {getSignalIcon(level)}
                          </Group>
                          <Text size="xs" c="dimmed">{level.description}</Text>
                        </div>
                      </Group>
                      <Stack gap={4} align="flex-end">
                        <Badge color={level.priority <= 2 ? 'green' : level.priority === 3 ? 'yellow' : 'red'}>
                          {level.priority}级
                        </Badge>
                        <Badge color="blue" variant="light">
                          速度 ×{(1 / level.delayFactor).toFixed(2)}
                        </Badge>
                      </Stack>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </ScrollArea>
          </div>

          <Divider />

          <Group grow>
            <div>
              <Text size="sm" fw={500} mb="xs">起点烽火台</Text>
              <Select
                placeholder="选择起点"
                data={activeTowers.map(t => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
                value={startTowerId}
                onChange={setStartTowerId}
                searchable
              />
            </div>
            <div>
              <Text size="sm" fw={500} mb="xs">终点烽火台</Text>
              <Select
                placeholder="选择终点"
                data={activeTowers.map(t => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
                value={endTowerId}
                onChange={setEndTowerId}
                searchable
              />
            </div>
          </Group>

          {selectedLevel && startTowerId && endTowerId && (
            <Card p="xs" radius="sm" bg="#f0fdf4">
              <Text size="sm" fw={500} mb="xs">路径策略</Text>
              <Text size="xs" c="dimmed">
                {shouldUsePathStrategy(
                  ENEMY_LEVELS.find(l => l.id === selectedLevel)!,
                  towers
                ).description}
              </Text>
            </Card>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="light" onClick={() => setIsAddModalOpen(false)}>
              取消
            </Button>
            <Button
              color="red"
              onClick={handleAddEnemy}
              disabled={!startTowerId || !endTowerId || startTowerId === endTowerId}
            >
              确认添加
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
