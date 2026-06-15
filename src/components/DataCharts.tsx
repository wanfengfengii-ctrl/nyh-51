import { useMemo } from 'react';
import { Card, Text, Group, Tabs, Stack } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useSimulationStore } from '../store/useSimulationStore';

export function DataCharts() {
  const { towers, paths, selectedPathId, blindSpots, weather } = useSimulationStore();

  const selectedPath = paths.find((p) => p.id === selectedPathId);

  const delayData = useMemo(() => {
    if (!selectedPath) return [];
    return selectedPath.towers.map((towerId, index) => {
      const tower = towers.find((t) => t.id === towerId);
      return {
        name: tower?.code || '',
        delay: tower?.signalDelay || 0,
        step: index + 1,
      };
    });
  }, [selectedPath, towers]);

  const cumulativeTimeData = useMemo(() => {
    if (!selectedPath) return [];
    let cumulativeTime = 0;
    return selectedPath.towers.map((towerId, index) => {
      const tower = towers.find((t) => t.id === towerId);
      if (index > 0) {
        cumulativeTime += tower?.signalDelay || 0;
      }
      return {
        name: tower?.code || '',
        time: parseFloat(cumulativeTime.toFixed(1)),
        step: index,
      };
    });
  }, [selectedPath, towers]);

  const pathComparisonData = useMemo(() => {
    return paths.map((path, index) => ({
      name: path.isOptimal ? '最快路线' : `备用${index}`,
      time: parseFloat(path.totalTime.toFixed(1)),
      distance: Math.round(path.totalDistance),
      stations: path.towers.length - 1,
    }));
  }, [paths]);

  const radarData = useMemo(() => {
    return [
      {
        subject: '可视距离',
        value: Math.round(weather.visibilityFactor * 100),
        fullMark: 100,
      },
      {
        subject: '信号速度',
        value: 70,
        fullMark: 100,
      },
      {
        subject: '覆盖率',
        value: towers.length > 0
          ? Math.round(((towers.length - blindSpots.length) / towers.length) * 100)
          : 0,
        fullMark: 100,
      },
      {
        subject: '可靠性',
        value: Math.round(
          (towers.filter((t) => t.isActive && t.garrisonCount > 0).length /
            Math.max(towers.length, 1)) *
            100
        ),
        fullMark: 100,
      },
    ];
  }, [weather.visibilityFactor, towers, blindSpots.length]);

  const statusPieData = useMemo(() => {
    const active = towers.filter((t) => t.isActive && t.garrisonCount > 0).length;
    const inactive = towers.filter((t) => !t.isActive).length;
    const noGarrison = towers.filter((t) => t.isActive && t.garrisonCount <= 0).length;

    const data = [];
    if (active > 0) data.push({ name: '正常运行', value: active, color: '#22c55e' });
    if (inactive > 0) data.push({ name: '未启用', value: inactive, color: '#9ca3af' });
    if (noGarrison > 0) data.push({ name: '无人驻守', value: noGarrison, color: '#ef4444' });

    return data;
  }, [towers]);

  return (
    <Card shadow="sm" p="md" radius="md" withBorder h="100%">
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">数据统计</Text>
      </Group>

      <Tabs defaultValue="delay" variant="pills">
        <Tabs.List grow>
          <Tabs.Tab value="delay">延迟分析</Tabs.Tab>
          <Tabs.Tab value="paths">路线对比</Tabs.Tab>
          <Tabs.Tab value="overview">总览</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="delay" pt="md">
          <Stack gap="md">
            <div style={{ width: '100%', height: 200 }}>
              <Text size="sm" fw={500} mb="xs">各站信号延迟</Text>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="delay" fill="#f97316" name="延迟(秒)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ width: '100%', height: 200 }}>
              <Text size="sm" fw={500} mb="xs">累积传递时间</Text>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="time"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="时间(秒)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="paths" pt="md">
          <Stack gap="md">
            <div style={{ width: '100%', height: 220 }}>
              <Text size="sm" fw={500} mb="xs">路线对比</Text>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pathComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={10} />
                  <YAxis dataKey="name" type="category" fontSize={10} width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="time" fill="#fbbf24" name="时间(秒)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="stations" fill="#8b5cf6" name="站数" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="overview" pt="md">
          <Group grow>
            <div style={{ width: '48%', height: 220 }}>
              <Text size="sm" fw={500} mb="xs">网络状态</Text>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
                  <Radar
                    name="状态"
                    dataKey="value"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ width: '48%', height: 220 }}>
              <Text size="sm" fw={500} mb="xs">烽火台状态</Text>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Group>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
