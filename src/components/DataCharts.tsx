import { useMemo } from 'react';
import { Card, Text, Group, Tabs, Stack, Badge, ScrollArea } from '@mantine/core';
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
import { ENEMY_COLORS } from '../constants';

export function DataCharts() {
  const { 
    towers, 
    paths, 
    selectedPathId, 
    blindSpots, 
    weather,
    missions,
    enemySources,
    dispatches,
    historyEvents,
    simulation,
  } = useSimulationStore();

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

  const missionProgressData = useMemo(() => {
    return missions.map((mission, index) => {
      const source = enemySources.find(s => s.id === mission.enemySourceId);
      return {
        name: source?.name || `任务${index + 1}`,
        progress: Math.round(mission.signalProgress * 100),
        steps: mission.path.towers.length - 1,
        currentStep: mission.currentStep,
        color: ENEMY_COLORS[index % ENEMY_COLORS.length],
      };
    });
  }, [missions, enemySources]);

  const missionStatusData = useMemo(() => {
    const running = missions.filter(m => m.status === 'running').length;
    const completed = missions.filter(m => m.status === 'completed').length;
    const failed = missions.filter(m => m.status === 'failed').length;
    const pending = missions.filter(m => m.status === 'pending').length;
    const interrupted = missions.filter(m => m.status === 'interrupted').length;

    const data = [];
    if (running > 0) data.push({ name: '运行中', value: running, color: '#22c55e' });
    if (completed > 0) data.push({ name: '已完成', value: completed, color: '#3b82f6' });
    if (failed > 0) data.push({ name: '失败', value: failed, color: '#ef4444' });
    if (pending > 0) data.push({ name: '等待中', value: pending, color: '#9ca3af' });
    if (interrupted > 0) data.push({ name: '中断', value: interrupted, color: '#f59e0b' });

    return data;
  }, [missions]);

  const pathComparisonData = useMemo(() => {
    return paths.map((path, index) => {
      const source = enemySources.find(s => s.id === path.enemySourceId);
      return {
        name: source ? source.name.slice(0, 6) : (path.isOptimal ? '最快' : `备用${index}`),
        time: parseFloat(path.totalTime.toFixed(1)),
        distance: Math.round(path.totalDistance),
        stations: path.towers.length - 1,
        reliability: Math.round((path.reliability || 0) * 100),
      };
    });
  }, [paths, enemySources]);

  const garrisonDistributionData = useMemo(() => {
    return towers.map(tower => ({
      name: tower.code,
      current: tower.garrisonCount,
      base: tower.baseGarrisonCount,
      diff: tower.garrisonCount - tower.baseGarrisonCount,
    })).sort((a, b) => b.diff - a.diff);
  }, [towers]);

  const eventTimelineData = useMemo(() => {
    const eventCounts: Record<string, number> = {};
    historyEvents.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });
    
    return Object.entries(eventCounts).map(([type, count]) => ({
      type: type.replace(/_/g, ' '),
      count,
    }));
  }, [historyEvents]);

  const radarData = useMemo(() => {
    const activeTowers = towers.filter(t => t.isActive && t.garrisonCount > 0 && !t.isDisabled).length;
    const disabledTowers = towers.filter(t => t.isDisabled).length;
    
    return [
      {
        subject: '可视距离',
        value: Math.round(weather.visibilityFactor * 100),
        fullMark: 100,
      },
      {
        subject: '传递速度',
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
        value: towers.length > 0
          ? Math.round((activeTowers / Math.max(towers.length, 1)) * 100)
          : 0,
        fullMark: 100,
      },
      {
        subject: '健康度',
        value: towers.length > 0
          ? Math.round(((towers.length - disabledTowers) / Math.max(towers.length, 1)) * 100)
          : 0,
        fullMark: 100,
      },
    ];
  }, [weather.visibilityFactor, towers, blindSpots.length]);

  const statusPieData = useMemo(() => {
    const active = towers.filter((t) => t.isActive && t.garrisonCount > 0 && !t.isDisabled).length;
    const inactive = towers.filter((t) => !t.isActive).length;
    const noGarrison = towers.filter((t) => t.isActive && t.garrisonCount <= 0).length;
    const disabled = towers.filter((t) => t.isDisabled).length;

    const data = [];
    if (active > 0) data.push({ name: '正常运行', value: active, color: '#22c55e' });
    if (disabled > 0) data.push({ name: '故障', value: disabled, color: '#ef4444' });
    if (inactive > 0) data.push({ name: '未启用', value: inactive, color: '#9ca3af' });
    if (noGarrison > 0) data.push({ name: '无人驻守', value: noGarrison, color: '#f59e0b' });

    return data;
  }, [towers]);

  return (
    <Card shadow="sm" p="md" radius="md" withBorder h="100%">
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">数据统计</Text>
        <Group gap="xs">
          <Badge size="sm" color="blue">任务: {missions.length}</Badge>
          <Badge size="sm" color="green">调度: {dispatches.length}</Badge>
          <Badge size="sm" color="gray">时间: {simulation.globalTime.toFixed(1)}s</Badge>
        </Group>
      </Group>

      <Tabs defaultValue="missions" variant="pills">
        <Tabs.List grow>
          <Tabs.Tab value="missions">任务进度</Tabs.Tab>
          <Tabs.Tab value="delay">延迟分析</Tabs.Tab>
          <Tabs.Tab value="paths">路线对比</Tabs.Tab>
          <Tabs.Tab value="overview">总览</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="missions" pt="md">
          <Stack gap="md">
            {missions.length > 0 ? (
              <>
                <div style={{ width: '100%', height: 200 }}>
                  <Text size="sm" fw={500} mb="xs">各任务进度</Text>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={missionProgressData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} fontSize={10} />
                      <YAxis dataKey="name" type="category" fontSize={10} width={80} />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, '进度']}
                        labelFormatter={(label) => `任务: ${label}`}
                      />
                      <Bar 
                        dataKey="progress" 
                        name="进度(%)" 
                        radius={[0, 4, 4, 0]}
                      >
                        {missionProgressData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ width: '100%', height: 180 }}>
                  <Text size="sm" fw={500} mb="xs">任务状态分布</Text>
                  <Group grow>
                    <div style={{ width: '50%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={missionStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={60}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {missionStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ width: '50%' }}>
                      <ScrollArea h={160} type="auto">
                        <Stack gap="xs">
                          {missions.map((mission, idx) => {
                            const source = enemySources.find(s => s.id === mission.enemySourceId);
                            return (
                              <Group key={mission.id} justify="space-between" wrap="nowrap">
                                <Group gap="xs" wrap="nowrap">
                                  <div 
                                    style={{ 
                                      width: 8, 
                                      height: 8, 
                                      borderRadius: '50%', 
                                      backgroundColor: ENEMY_COLORS[idx % ENEMY_COLORS.length] 
                                    }} 
                                  />
                                  <Text size="xs" truncate style={{ maxWidth: 80 }}>
                                    {source?.name || '未知'}
                                  </Text>
                                </Group>
                                <Badge 
                                  size="xs"
                                  color={
                                    mission.status === 'running' ? 'green' :
                                    mission.status === 'completed' ? 'blue' :
                                    mission.status === 'failed' ? 'red' : 'gray'
                                  }
                                >
                                  {Math.round(mission.signalProgress * 100)}%
                                </Badge>
                              </Group>
                            );
                          })}
                        </Stack>
                      </ScrollArea>
                    </div>
                  </Group>
                </div>
              </>
            ) : (
              <Text c="dimmed" ta="center" py="xl" size="sm">
                暂无任务数据，请添加敌情源
              </Text>
            )}
          </Stack>
        </Tabs.Panel>

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
            {paths.length > 0 ? (
              <>
                <div style={{ width: '100%', height: 220 }}>
                  <Text size="sm" fw={500} mb="xs">路线对比</Text>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pathComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={10} />
                      <YAxis dataKey="name" type="category" fontSize={10} width={70} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="time" fill="#fbbf24" name="时间(秒)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="stations" fill="#8b5cf6" name="站数" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="reliability" fill="#22c55e" name="可靠性(%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ width: '100%', height: 180 }}>
                  <Text size="sm" fw={500} mb="xs">驻军分布</Text>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={garrisonDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={9} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="base" fill="#94a3b8" name="基准驻军" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="current" fill="#22c55e" name="当前驻军" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <Text c="dimmed" ta="center" py="xl" size="sm">
                暂无路线数据
              </Text>
            )}
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

          {eventTimelineData.length > 0 && (
            <div style={{ width: '100%', height: 150, marginTop: 'md' }}>
              <Text size="sm" fw={500} mb="xs">事件统计</Text>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" fontSize={9} angle={-30} textAnchor="end" height={60} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="次数" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
