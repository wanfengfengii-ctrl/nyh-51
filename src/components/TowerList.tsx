import { useMemo } from 'react';
import {
  Card,
  Text,
  TextInput,
  NumberInput,
  Switch,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
  ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSimulationStore } from '../store/useSimulationStore';
import { isCodeUnique } from '../utils/pathfinding';
import { BeaconTower } from '../types';

export function TowerList() {
  const {
    towers,
    selectedTowerId,
    selectTower,
    deleteTower,
    startTowerId,
    endTowerId,
    setStartTower,
    setEndTower,
  } = useSimulationStore();

  const sortedTowers = useMemo(() => {
    return [...towers].sort((a, b) => a.code.localeCompare(b.code));
  }, [towers]);

  const handleDelete = (id: string) => {
    deleteTower(id);
    notifications.show({
      title: '删除成功',
      message: '烽火台已删除',
      color: 'red',
    });
  };

  const getTowerStatusBadge = (tower: typeof towers[0]) => {
    if (!tower.isActive) return <Badge color="gray">未启用</Badge>;
    if (tower.garrisonCount <= 0) return <Badge color="red">无人驻守</Badge>;
    if (tower.id === startTowerId) return <Badge color="green">起点</Badge>;
    if (tower.id === endTowerId) return <Badge color="blue">终点</Badge>;
    return <Badge color="green">正常</Badge>;
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">烽火台列表</Text>
        <Text size="sm" c="dimmed">共 {towers.length} 座</Text>
      </Group>

      <ScrollArea h={300} type="auto">
        <Stack gap="xs">
          {sortedTowers.map((tower) => (
            <Card
              key={tower.id}
              p="xs"
              radius="sm"
              withBorder
              style={{
                cursor: 'pointer',
                borderColor:
                  selectedTowerId === tower.id ? '#4169e1' : undefined,
                backgroundColor:
                  selectedTowerId === tower.id ? '#e6f0ff' : undefined,
              }}
              onClick={() => selectTower(tower.id)}
            >
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Group gap="xs">
                    <Text fw={500} size="sm">{tower.code}</Text>
                    {getTowerStatusBadge(tower)}
                  </Group>
                  <Text size="xs" c="dimmed">{tower.name}</Text>
                </div>
                <Group gap={4}>
                  <Tooltip label="设为起点">
                    <ActionIcon
                      size="sm"
                      color={tower.id === startTowerId ? 'green' : 'gray'}
                      variant={tower.id === startTowerId ? 'filled' : 'subtle'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStartTower(tower.id === startTowerId ? null : tower.id);
                      }}
                    >
                      🏁
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="设为终点">
                    <ActionIcon
                      size="sm"
                      color={tower.id === endTowerId ? 'blue' : 'gray'}
                      variant={tower.id === endTowerId ? 'filled' : 'subtle'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEndTower(tower.id === endTowerId ? null : tower.id);
                      }}
                    >
                      🎯
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="删除">
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tower.id);
                      }}
                    >
                      🗑️
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Card>
          ))}

          {towers.length === 0 && (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              暂无烽火台，点击地图添加
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Card>
  );
}

export function TowerEditor() {
  const { towers, selectedTowerId, updateTower } = useSimulationStore();
  const selectedTower = towers.find((t) => t.id === selectedTowerId);

  const handleUpdate = (updates: Partial<BeaconTower>) => {
    if (!selectedTowerId) return;
    updateTower(selectedTowerId, updates);
  };

  const handleCodeChange = (value: string | null) => {
    if (!selectedTowerId || !value) return;

    if (!isCodeUnique(value, towers, selectedTowerId)) {
      notifications.show({
        title: '编号重复',
        message: '烽火台编号不能重复',
        color: 'red',
      });
      return;
    }

    handleUpdate({ code: value });
  };

  if (!selectedTower) {
    return (
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">烽火台详情</Text>
        <Text c="dimmed" ta="center" py="xl" size="sm">
          请选择一个烽火台查看详情
        </Text>
      </Card>
    );
  }

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">烽火台详情</Text>
        <Badge color={selectedTower.isActive ? 'green' : 'gray'}>
          {selectedTower.isActive ? '运行中' : '已停用'}
        </Badge>
      </Group>

      <Stack gap="md">
        <TextInput
          label="编号"
          value={selectedTower.code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="例如：FT-001"
        />

        <TextInput
          label="名称"
          value={selectedTower.name}
          onChange={(e) => handleUpdate({ name: e.target.value })}
          placeholder="烽火台名称"
        />

        <NumberInput
          label="可视距离 (像素)"
          value={selectedTower.visualRange}
          onChange={(val) => handleUpdate({ visualRange: Number(val) || 0 })}
          min={50}
          max={500}
          step={10}
        />

        <NumberInput
          label="驻守人数"
          value={selectedTower.garrisonCount}
          onChange={(val) => handleUpdate({ garrisonCount: Number(val) || 0 })}
          min={0}
          max={100}
          step={1}
        />

        <NumberInput
          label="信号延迟 (秒)"
          value={selectedTower.signalDelay}
          onChange={(val) => handleUpdate({ signalDelay: Number(val) || 0 })}
          min={0.5}
          max={30}
          step={0.5}
        />

        <Switch
          label="启用烽火台"
          checked={selectedTower.isActive}
          onChange={(e) => handleUpdate({ isActive: e.currentTarget.checked })}
        />

        <Group grow>
          <Text size="sm">位置 X: {Math.round(selectedTower.x)}</Text>
          <Text size="sm">位置 Y: {Math.round(selectedTower.y)}</Text>
        </Group>
      </Stack>
    </Card>
  );
}
