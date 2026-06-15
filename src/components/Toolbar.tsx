import { Group, Button, Tooltip } from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';

export function Toolbar() {
  const { isAddingTower, setIsAddingTower } = useSimulationStore();

  return (
    <Group gap="xs">
      <Tooltip label={isAddingTower ? '取消添加' : '点击地图添加烽火台'}>
        <Button
          variant={isAddingTower ? 'filled' : 'light'}
          color={isAddingTower ? 'green' : 'blue'}
          onClick={() => setIsAddingTower(!isAddingTower)}
          leftSection={isAddingTower ? '✕' : '➕'}
        >
          {isAddingTower ? '取消添加' : '添加烽火台'}
        </Button>
      </Tooltip>
    </Group>
  );
}
