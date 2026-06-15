import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Radio,
  Switch,
  ScrollArea,
  Progress,
} from '@mantine/core';
import { useSimulationStore } from '../store/useSimulationStore';
import { WEATHER_TYPES } from '../constants';
import { getWeatherSeverity, getWeatherImpactDescription } from '../utils/weatherEngine';

export function DynamicWeatherPanel() {
  const {
    weather,
    weatherEvents,
    weatherForecast,
    simulation,
    setWeather,
    isDynamicWeather,
    setDynamicWeather,
  } = useSimulationStore();

  const severity = getWeatherSeverity(weather);
  const severityColor = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    critical: 'red',
  }[severity];

  const getNextWeatherTime = () => {
    const nextEvent = weatherForecast.find(e => e.startTime > simulation.globalTime);
    if (nextEvent) {
      return Math.max(0, nextEvent.startTime - simulation.globalTime).toFixed(0);
    }
    return null;
  };

  const nextWeatherTime = getNextWeatherTime();

  const getProgressToNextWeather = () => {
    if (!isDynamicWeather || weatherForecast.length === 0) return 0;
    const nextEvent = weatherForecast.find(e => e.startTime > simulation.globalTime);
    if (!nextEvent) return 100;
    
    const prevEvent = weatherForecast.find(e => e.startTime <= simulation.globalTime);
    const prevTime = prevEvent?.startTime || 0;
    const total = nextEvent.startTime - prevTime;
    const elapsed = simulation.globalTime - prevTime;
    return (elapsed / total) * 100;
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">天气系统</Text>
        <Group gap="xs">
          <Text size="sm">动态变化</Text>
          <Switch
            checked={isDynamicWeather}
            onChange={(e) => setDynamicWeather(e.target.checked)}
          />
        </Group>
      </Group>

      <Stack gap="md">
        <Card p="md" radius="md" bg={severity === 'critical' ? '#fef2f2' : severity === 'high' ? '#fff7ed' : 'transparent'}>
          <Group justify="space-between" mb="xs">
            <Group gap="md">
              <Text size="4xl">{weather.icon}</Text>
              <div>
                <Group gap="xs">
                  <Text fw={600} size="lg">{weather.name}</Text>
                  <Badge color={severityColor}>
                    {severity === 'low' ? '良好' : severity === 'medium' ? '一般' : severity === 'high' ? '较差' : '恶劣'}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">{getWeatherImpactDescription(weather)}</Text>
              </div>
            </Group>
            <Stack gap={4} align="flex-end">
              <Text size="sm" fw={500}>
                能见度 {(weather.visibilityFactor * 100).toFixed(0)}%
              </Text>
              <Badge color="blue" variant="light">
                持续时间: {weatherEvents.length > 0 ? '动态' : '固定'}
              </Badge>
            </Stack>
          </Group>

          {isDynamicWeather && nextWeatherTime !== null && (
            <Stack gap="xs" mt="md">
              <Group justify="space-between">
                <Text size="xs" c="dimmed">距下次天气变化</Text>
                <Text size="xs" fw={500}>{nextWeatherTime}s</Text>
              </Group>
              <Progress
                value={getProgressToNextWeather()}
                size="xs"
                color="blue"
              />
            </Stack>
          )}
        </Card>

        {isDynamicWeather && weatherForecast.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb="xs">天气预测</Text>
            <ScrollArea h={120} type="auto">
              <Stack gap="xs">
                {weatherForecast
                  .filter(e => e.startTime > simulation.globalTime)
                  .slice(0, 5)
                  .map((event, index) => {
                    const eventSeverity = getWeatherSeverity(event.weather);
                    const timeUntil = Math.max(0, event.startTime - simulation.globalTime);
                    return (
                      <Group key={event.id} justify="space-between" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                          <Text size="lg">{event.weather.icon}</Text>
                          <div>
                            <Text fw={500} size="sm">{event.weather.name}</Text>
                            <Text size="xs" c="dimmed">{event.weather.description}</Text>
                          </div>
                        </Group>
                        <Stack gap={4} align="flex-end">
                          <Badge color={
                            eventSeverity === 'low' ? 'green' : 
                            eventSeverity === 'medium' ? 'yellow' : 
                            eventSeverity === 'high' ? 'orange' : 'red'
                          } size="xs">
                            {(event.weather.visibilityFactor * 100).toFixed(0)}%
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {index === 0 ? `${timeUntil.toFixed(0)}s后` : `+${(event.startTime - simulation.globalTime).toFixed(0)}s`}
                          </Text>
                        </Stack>
                      </Group>
                    );
                  })}
              </Stack>
            </ScrollArea>
          </div>
        )}

        <div>
          <Text size="sm" fw={500} mb="xs">手动设置天气</Text>
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
        </div>

        {weatherEvents.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb="xs">天气历史</Text>
            <ScrollArea h={100} type="auto">
              <Stack gap="xs">
                {[...weatherEvents].reverse().slice(0, 5).map((event) => (
                  <Group key={event.id} justify="space-between" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm">{event.weather.icon}</Text>
                      <Text size="xs">{event.weather.name}</Text>
                    </Group>
                    <Group gap="xs">
                      <Badge size="xs" color={event.triggerType === 'automatic' ? 'blue' : 'orange'}>
                        {event.triggerType === 'automatic' ? '自动' : '手动'}
                      </Badge>
                      <Text size="xs" c="dimmed">{event.startTime.toFixed(0)}s</Text>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          </div>
        )}
      </Stack>
    </Card>
  );
}
