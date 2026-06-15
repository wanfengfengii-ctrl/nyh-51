import { useState, useEffect, useRef } from 'react';
import {
  MantineProvider,
  AppShell,
  Group,
  Text,
  Badge,
  SimpleGrid,
  ScrollArea,
  Stack,
} from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { MapCanvas } from './components/MapCanvas';
import { TowerList, TowerEditor } from './components/TowerList';
import { WeatherPanel, EnemyLevelPanel } from './components/SettingsPanel';
import { SimulationPanel } from './components/SimulationPanel';
import { PathInfoPanel, AnalysisPanel } from './components/AnalysisPanel';
import { DataCharts } from './components/DataCharts';
import { Toolbar } from './components/Toolbar';
import { useSimulationStore } from './store/useSimulationStore';
import { BeaconTower } from './types';

function App() {
  const { isAddingTower, towers } = useSimulationStore();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  const sampleLoadedRef = useRef(false);

  useEffect(() => {
    const updateSize = () => {
      const mapContainer = document.getElementById('map-container');
      if (mapContainer) {
        const rect = mapContainer.getBoundingClientRect();
        setCanvasSize({
          width: Math.max(600, rect.width - 4),
          height: Math.max(400, Math.min(500, rect.height - 40)),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const addSampleTowers = () => {
    if (sampleLoadedRef.current) return;
    sampleLoadedRef.current = true;

    const sampleTowers: Omit<BeaconTower, 'id'>[] = [
      { x: 80, y: 150, code: 'FT-001', name: '烽火台一号', visualRange: 250, garrisonCount: 15, signalDelay: 2, isActive: true },
      { x: 230, y: 100, code: 'FT-002', name: '烽火台二号', visualRange: 250, garrisonCount: 12, signalDelay: 3, isActive: true },
      { x: 380, y: 120, code: 'FT-003', name: '烽火台三号', visualRange: 250, garrisonCount: 10, signalDelay: 2.5, isActive: true },
      { x: 520, y: 90, code: 'FT-004', name: '烽火台四号', visualRange: 200, garrisonCount: 8, signalDelay: 4, isActive: true },
      { x: 260, y: 250, code: 'FT-005', name: '烽火台五号', visualRange: 200, garrisonCount: 0, signalDelay: 2, isActive: true },
      { x: 420, y: 280, code: 'FT-006', name: '烽火台六号', visualRange: 200, garrisonCount: 10, signalDelay: 3, isActive: true },
      { x: 120, y: 320, code: 'FT-007', name: '烽火台七号', visualRange: 180, garrisonCount: 5, signalDelay: 5, isActive: true },
    ];

    const newTowers: BeaconTower[] = sampleTowers.map((t, index) => ({
      ...t,
      id: `sample-${index}`,
    }));

    useSimulationStore.setState({
      towers: newTowers,
      startTowerId: 'sample-0',
      endTowerId: 'sample-3',
    });

    setTimeout(() => {
      useSimulationStore.getState().calculatePaths();
      notifications.show({
        title: '示例数据已加载',
        message: '已添加 7 座示例烽火台，点击开始模拟查看效果',
        color: 'green',
      });
    }, 100);
  };

  useEffect(() => {
    if (towers.length === 0 && !sampleLoadedRef.current) {
      addSampleTowers();
    }
  }, [towers.length]);

  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppShell
        header={{ height: 60 }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Text fw={700} size="xl" c="#8b4513">
                🏯 烽火台信号接力推演器
              </Text>
              <Badge color="yellow" variant="light">
                古代信息传递模拟
              </Badge>
            </Group>
            <Toolbar />
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <div style={{ height: 'calc(100vh - 80px)', padding: '12px' }}>
            <SimpleGrid
              cols={{ base: 1, xl: 4 }}
              spacing="md"
              style={{ height: '100%' }}
            >
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflow: 'hidden' }}>
                <div
                  id="map-container"
                  style={{
                    flex: '0 0 auto',
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>地图画布</Text>
                    {isAddingTower && (
                      <Badge color="green" variant="filled">
                        点击地图添加烽火台
                      </Badge>
                    )}
                  </Group>
                  <MapCanvas width={canvasSize.width} height={canvasSize.height} />
                </div>
                <DataCharts />
              </div>

              <ScrollArea type="auto" style={{ height: '100%' }}>
                <Stack gap="md" pr="xs">
                  <TowerList />
                  <TowerEditor />
                  <WeatherPanel />
                </Stack>
              </ScrollArea>

              <ScrollArea type="auto" style={{ height: '100%' }}>
                <Stack gap="md" pr="xs">
                  <SimulationPanel />
                  <EnemyLevelPanel />
                  <PathInfoPanel />
                  <AnalysisPanel />
                </Stack>
              </ScrollArea>
            </SimpleGrid>
          </div>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
