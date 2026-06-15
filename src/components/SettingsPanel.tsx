import { Card, Text, Group, Stack, Badge, Radio } from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { WEATHER_TYPES, ENEMY_LEVELS } from '../constants';

export function WeatherPanel() {
  const { weather, setWeather } = useSimulationStore();

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Text fw={600} size="lg" mb="md">天气设置</Text>

      <Radio.Group value={weather.id} onChange={(value) => {
        const w = WEATHER_TYPES.find((wt) => wt.id === value);
        if (w) setWeather(w);
      }}>
        <Stack gap="xs">
          {WEATHER_TYPES.map((w) => (
            <Radio.Card key={w.id} value={w.id} p="xs">
              <Group wrap="nowrap" justify="space-between">
                <Group gap="xs">
                  <Text size="xl">{w.icon}</Text>
                  <div>
                    <Text fw={500} size="sm">{w.name}</Text>
                    <Text size="xs" c="dimmed">{w.description}</Text>
                  </div>
                </Group>
                <Badge color={w.visibilityFactor >= 0.8 ? 'green' : w.visibilityFactor >= 0.6 ? 'yellow' : 'red'}>
                  {(w.visibilityFactor * 100).toFixed(0)}%
                </Badge>
              </Group>
            </Radio.Card>
          ))}
        </Stack>
      </Radio.Group>
    </Card>
  );
}

export function EnemyLevelPanel() {
  const { enemyLevel, setEnemyLevel } = useSimulationStore();

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'smoke':
        return '🌫️ 烟';
      case 'fire':
        return '🔥 火';
      case 'both':
        return '🔥🌫️ 烟火';
      default:
        return '';
    }
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Text fw={600} size="lg" mb="md">敌情等级</Text>
      <Text size="xs" c="dimmed" mb="sm">等级越高，传递速度越快</Text>

      <Radio.Group value={enemyLevel.id} onChange={(value) => {
        const level = ENEMY_LEVELS.find((l) => l.id === value);
        if (level) setEnemyLevel(level);
      }}>
        <Stack gap="xs">
          {ENEMY_LEVELS.map((level) => (
            <Radio.Card key={level.id} value={level.id} p="xs">
              <Group wrap="nowrap" justify="space-between">
                <div>
                  <Group gap="xs">
                    <Text fw={500} size="sm">{level.name}</Text>
                    <Text size="xs">{getSignalIcon(level.signalType)}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">{level.description}</Text>
                </div>
                <Stack gap={4} align="flex-end">
                  <Badge color={level.priority <= 2 ? 'green' : level.priority === 3 ? 'yellow' : 'red'}>
                    {level.priority}级
                  </Badge>
                  <Badge color="blue" variant="light">
                    速度 ×{(1 / level.delayFactor).toFixed(2)}
                  </Badge>
                </Stack>
              </Group>
            </Radio.Card>
          ))}
        </Stack>
      </Radio.Group>
    </Card>
  );
}
