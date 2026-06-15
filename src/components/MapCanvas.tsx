import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useSimulationStore } from '../store/useSimulationStore';
import { MAP_CONFIG, COLORS, ENEMY_COLORS } from '../constants';
import { BeaconTower, SignalMission, EnemySource } from '../types';

interface MapCanvasProps {
  width?: number;
  height?: number;
}

export function MapCanvas({ width = 800, height = 600 }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const towerSpritesRef = useRef<Map<string, PIXI.Container>>(new Map());
  const lineGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const signalGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const rangeGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const dispatchGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const weatherOverlayRef = useRef<PIXI.Graphics | null>(null);
  const draggingTowerRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const {
    towers,
    weather,
    paths,
    selectedPathId,
    isAddingTower,
    simulation,
    missions,
    enemySources,
    dispatches,
    addTower,
    selectTower,
    moveTower,
  } = useSimulationStore();

  const getSourceColor = (enemySourceId?: string): number => {
    if (!enemySourceId) return COLORS.signal;
    const source = enemySources.find(s => s.id === enemySourceId);
    if (source) {
      const index = enemySources.indexOf(source);
      return parseInt(ENEMY_COLORS[index % ENEMY_COLORS.length].replace('#', ''), 16);
    }
    return COLORS.signal;
  };

  const getEnemySourceByMission = (missionId: string): EnemySource | undefined => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return undefined;
    return enemySources.find(s => s.id === mission.enemySourceId);
  };

  const initPixi = useCallback(() => {
    if (!containerRef.current || appRef.current) return;

    const app = new PIXI.Application({
      width,
      height,
      background: MAP_CONFIG.backgroundColor,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const bgGraphics = new PIXI.Graphics();
    bgGraphics.beginFill(MAP_CONFIG.backgroundColor);
    bgGraphics.drawRect(0, 0, width, height);
    bgGraphics.endFill();
    app.stage.addChild(bgGraphics);

    const gridGraphics = new PIXI.Graphics();
    gridGraphics.lineStyle(1, MAP_CONFIG.gridColor, 0.5);

    for (let x = 0; x <= width; x += MAP_CONFIG.gridSize) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += MAP_CONFIG.gridSize) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(width, y);
    }

    app.stage.addChild(gridGraphics);

    lineGraphicsRef.current = new PIXI.Graphics();
    app.stage.addChild(lineGraphicsRef.current);

    rangeGraphicsRef.current = new PIXI.Graphics();
    app.stage.addChild(rangeGraphicsRef.current);

    dispatchGraphicsRef.current = new PIXI.Graphics();
    app.stage.addChild(dispatchGraphicsRef.current);

    signalGraphicsRef.current = new PIXI.Graphics();
    app.stage.addChild(signalGraphicsRef.current);

    weatherOverlayRef.current = new PIXI.Graphics();
    app.stage.addChild(weatherOverlayRef.current);

    app.stage.eventMode = 'static';
    app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);

    app.stage.on('pointerdown', (event) => {
      const globalPos = event.global;
      if (isAddingTower) {
        addTower(globalPos.x, globalPos.y);
      }
    });

    app.ticker.add(() => {
      if (useSimulationStore.getState().simulation.status === 'running') {
        useSimulationStore.getState().advanceSimulation(0.016);
      }
      drawSignalProgress();
    });

    const state = useSimulationStore.getState();
    state.towers.forEach((tower) => {
      const sprite = createTowerSprite(tower);
      towerSpritesRef.current.set(tower.id, sprite);
      app.stage.addChild(sprite);
    });

    drawLines();
    drawRanges();
    drawWeatherOverlay();

    app.render();
  }, [width, height, isAddingTower, addTower]);

  const createTowerSprite = useCallback(
    (tower: BeaconTower): PIXI.Container => {
      const container = new PIXI.Container();
      container.x = tower.x;
      container.y = tower.y;
      container.eventMode = 'static';
      container.cursor = 'pointer';

      const base = new PIXI.Graphics();
      base.name = 'base';
      base.beginFill(COLORS.tower.normal);
      base.drawRect(-15, -20, 30, 40);
      base.endFill();

      const roof = new PIXI.Graphics();
      roof.beginFill(0x654321);
      roof.moveTo(-20, -20);
      roof.lineTo(0, -35);
      roof.lineTo(20, -20);
      roof.closePath();
      roof.endFill();

      const window = new PIXI.Graphics();
      window.beginFill(0xffd700);
      window.drawRect(-5, -10, 10, 15);
      window.endFill();

      const label = new PIXI.Text(tower.code, {
        fontSize: 10,
        fill: 0x000000,
        fontFamily: 'Arial',
      });
      label.anchor.set(0.5);
      label.y = 30;

      const garrisonLabel = new PIXI.Text(`👥${tower.garrisonCount}`, {
        fontSize: 9,
        fill: 0x000000,
        fontFamily: 'Arial',
      });
      garrisonLabel.name = 'garrisonLabel';
      garrisonLabel.anchor.set(0.5);
      garrisonLabel.y = 45;

      container.addChild(base, roof, window, label, garrisonLabel);
      container.name = tower.id;

      container.on('pointerdown', (event) => {
        event.stopPropagation();
        if (!isAddingTower) {
          selectTower(tower.id);
          draggingTowerRef.current = tower.id;
        }
      });

      container.on('pointerup', () => {
        draggingTowerRef.current = null;
      });

      container.on('pointerupoutside', () => {
        draggingTowerRef.current = null;
      });

      return container;
    },
    [isAddingTower, selectTower]
  );

  const drawFlame = useCallback((sprite: PIXI.Container, tower: BeaconTower, missions: SignalMission[]) => {
    const existingFlames = sprite.children.filter(c => c.name === 'flame');
    existingFlames.forEach(f => sprite.removeChild(f));

    const activeMissions = missions.filter(m => 
      m.status === 'running' && m.activeTowers.includes(tower.id)
    );

    activeMissions.forEach((mission, idx) => {
      const source = getEnemySourceByMission(mission.id);
      if (!source) return;

      const color = getSourceColor(mission.enemySourceId);
      const flameGfx = new PIXI.Graphics();
      flameGfx.name = 'flame';

      const offsetX = (idx - (activeMissions.length - 1) / 2) * 15;
      const { level } = source;

      if (level.signalType === 'smoke' || level.signalType === 'both') {
        for (let i = 0; i < level.smokeCount; i++) {
          const smokeY = -40 - i * 12;
          flameGfx.beginFill(color, 0.7);
          flameGfx.drawCircle(offsetX, smokeY, 6 + Math.sin(Date.now() / 300 + i) * 2);
          flameGfx.endFill();
        }
      }

      if (level.signalType === 'fire' || level.signalType === 'both') {
        for (let i = 0; i < level.fireIntensity; i++) {
          const fireY = -35 - i * 8;
          flameGfx.beginFill(0xff4500);
          flameGfx.moveTo(offsetX - 8, fireY);
          flameGfx.quadraticCurveTo(offsetX, fireY - 20 - Math.sin(Date.now() / 200) * 3, offsetX + 8, fireY);
          flameGfx.closePath();
          flameGfx.endFill();

          flameGfx.beginFill(0xffd700);
          flameGfx.moveTo(offsetX - 4, fireY);
          flameGfx.quadraticCurveTo(offsetX, fireY - 12, offsetX + 4, fireY);
          flameGfx.closePath();
          flameGfx.endFill();
        }
      }

      sprite.addChild(flameGfx);
    });
  }, [enemySources]);

  const updateTowerVisual = useCallback(
    (towerId: string) => {
      const sprite = towerSpritesRef.current.get(towerId);
      if (!sprite || !appRef.current) return;

      const state = useSimulationStore.getState();
      const tower = state.towers.find((t) => t.id === towerId);
      if (!tower) return;

      const base = sprite.getChildByName('base') as PIXI.Graphics;
      base.clear();

      let color = COLORS.tower.normal;
      if (tower.isDisabled) {
        color = COLORS.tower.disabled;
      } else if (!tower.isActive || tower.garrisonCount <= 0) {
        color = COLORS.tower.disabled;
      } else if (state.selectedTowerId === towerId) {
        color = COLORS.tower.selected;
      } else {
        const activeMission = state.missions.find(m => 
          m.status === 'running' && m.activeTowers.includes(towerId)
        );
        if (activeMission) {
          color = getSourceColor(activeMission.enemySourceId);
        }
      }

      base.beginFill(color);
      base.drawRect(-15, -20, 30, 40);
      base.endFill();

      const garrisonLabel = sprite.getChildByName('garrisonLabel') as PIXI.Text;
      if (garrisonLabel) {
        garrisonLabel.text = `👥${tower.garrisonCount}`;
      }

      if (tower.isDisabled) {
        const disabledMark = sprite.getChildByName('disabledMark');
        if (!disabledMark) {
          const mark = new PIXI.Graphics();
          mark.name = 'disabledMark';
          mark.lineStyle(3, 0xff0000);
          mark.moveTo(-15, -20);
          mark.lineTo(15, 20);
          mark.moveTo(15, -20);
          mark.lineTo(-15, 20);
          sprite.addChild(mark);
        }
      } else {
        const disabledMark = sprite.getChildByName('disabledMark');
        if (disabledMark) {
          sprite.removeChild(disabledMark);
        }
      }

      drawFlame(sprite, tower, state.missions);
    },
    [drawFlame]
  );

  const drawLines = useCallback(() => {
    if (!lineGraphicsRef.current) return;

    const state = useSimulationStore.getState();
    const graphics = lineGraphicsRef.current;
    graphics.clear();

    const adjacency: Map<string, Set<string>> = new Map();
    state.towers.forEach((t) => adjacency.set(t.id, new Set()));

    const activePathEdges = new Map<string, { color: number; width: number; alpha: number }>();

    state.missions.forEach(mission => {
      if (mission.status !== 'running' && mission.status !== 'completed') return;
      
      const color = getSourceColor(mission.enemySourceId);
      const path = mission.path.towers;

      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const key = `${from}-${to}`;
        const reverseKey = `${to}-${from}`;

        if (!activePathEdges.has(key) && !activePathEdges.has(reverseKey)) {
          activePathEdges.set(key, {
            color,
            width: mission.status === 'completed' ? 2 : 3,
            alpha: mission.status === 'completed' ? 0.5 : 0.8,
          });
        }
      }
    });

    const selectedPath = state.paths.find((p) => p.id === state.selectedPathId);
    if (selectedPath) {
      for (let i = 0; i < selectedPath.towers.length - 1; i++) {
        const from = selectedPath.towers[i];
        const to = selectedPath.towers[i + 1];
        const key = `${from}-${to}`;
        const reverseKey = `${to}-${from}`;

        if (!activePathEdges.has(key) && !activePathEdges.has(reverseKey)) {
          activePathEdges.set(key, {
            color: COLORS.line.optimal,
            width: 4,
            alpha: 1,
          });
        }
      }
    }

    const altPaths = state.paths.filter((p) => p.id !== state.selectedPathId);
    altPaths.forEach((path) => {
      for (let i = 0; i < path.towers.length - 1; i++) {
        const from = path.towers[i];
        const to = path.towers[i + 1];
        const key = `${from}-${to}`;
        const reverseKey = `${to}-${from}`;

        if (!activePathEdges.has(key) && !activePathEdges.has(reverseKey)) {
          activePathEdges.set(key, {
            color: COLORS.line.alternative,
            width: 2,
            alpha: 0.4,
          });
        }
      }
    });

    for (let i = 0; i < state.towers.length; i++) {
      for (let j = i + 1; j < state.towers.length; j++) {
        const towerA = state.towers[i];
        const towerB = state.towers[j];

        if (!towerA.isActive || !towerB.isActive) continue;
        if (towerA.garrisonCount <= 0 || towerB.garrisonCount <= 0) continue;
        if (towerA.isDisabled || towerB.isDisabled) continue;

        const distance = Math.sqrt(
          Math.pow(towerA.x - towerB.x, 2) + Math.pow(towerA.y - towerB.y, 2)
        );
        const effectiveRange = towerA.visualRange * state.weather.visibilityFactor;

        if (distance <= effectiveRange) {
          adjacency.get(towerA.id)?.add(towerB.id);
          adjacency.get(towerB.id)?.add(towerA.id);

          const edgeKey = `${towerA.id}-${towerB.id}`;
          const reverseKey = `${towerB.id}-${towerA.id}`;
          
          const edgeStyle = activePathEdges.get(edgeKey) || activePathEdges.get(reverseKey);

          let lineColor = COLORS.line.normal;
          let lineWidth = 1;
          let alpha = 0.2;

          if (edgeStyle) {
            lineColor = edgeStyle.color;
            lineWidth = edgeStyle.width;
            alpha = edgeStyle.alpha;
          }

          graphics.lineStyle(lineWidth, lineColor, alpha);
          graphics.moveTo(towerA.x, towerA.y);
          graphics.lineTo(towerB.x, towerB.y);
        }
      }
    }
  }, [enemySources]);

  const drawRanges = useCallback(() => {
    if (!rangeGraphicsRef.current) return;

    const state = useSimulationStore.getState();
    const graphics = rangeGraphicsRef.current;
    graphics.clear();

    if (!state.selectedTowerId) return;

    const tower = state.towers.find((t) => t.id === state.selectedTowerId);
    if (!tower || !tower.isActive || tower.garrisonCount <= 0 || tower.isDisabled) return;

    const effectiveRange = tower.visualRange * state.weather.visibilityFactor;

    graphics.lineStyle(2, COLORS.tower.selected, 0.5);
    graphics.beginFill(COLORS.tower.selected, 0.1);
    graphics.drawCircle(tower.x, tower.y, effectiveRange);
    graphics.endFill();

    if (tower.garrisonCount > tower.baseGarrisonCount) {
      const bonusRange = effectiveRange * 1.15;
      graphics.lineStyle(2, 0x22c55e, 0.3);
      graphics.beginFill(0x22c55e, 0.05);
      graphics.drawCircle(tower.x, tower.y, bonusRange);
      graphics.endFill();
    }
  }, []);

  const drawDispatches = useCallback(() => {
    if (!dispatchGraphicsRef.current) return;

    const state = useSimulationStore.getState();
    const graphics = dispatchGraphicsRef.current;
    graphics.clear();

    state.dispatches.forEach(dispatch => {
      if (dispatch.status === 'completed') return;

      const fromTower = state.towers.find(t => t.id === dispatch.fromTowerId);
      const toTower = state.towers.find(t => t.id === dispatch.toTowerId);

      if (!fromTower || !toTower) return;

      const progress = dispatch.status === 'active' 
        ? Math.min(1, (state.simulation.globalTime - dispatch.startTime) / dispatch.duration)
        : 0;

      graphics.lineStyle(3, 0x22c55e, 0.7);
      graphics.moveTo(fromTower.x, fromTower.y);
      graphics.lineTo(toTower.x, toTower.y);

      const currentX = fromTower.x + (toTower.x - fromTower.x) * progress;
      const currentY = fromTower.y + (toTower.y - fromTower.y) * progress;

      graphics.beginFill(0x22c55e);
      graphics.drawCircle(currentX, currentY, 8);
      graphics.endFill();

      const label = new PIXI.Text(`+${dispatch.count}`, {
        fontSize: 10,
        fill: 0xffffff,
        fontFamily: 'Arial',
        fontWeight: 'bold',
      });
      label.anchor.set(0.5);
      label.x = currentX;
      label.y = currentY;
      graphics.addChild(label);
    });
  }, []);

  const drawWeatherOverlay = useCallback(() => {
    if (!weatherOverlayRef.current) return;

    const state = useSimulationStore.getState();
    const graphics = weatherOverlayRef.current;
    graphics.clear();

    if (state.weather.visibilityFactor < 0.8) {
      let overlayColor = 0xaaaaaa;
      let alpha = 0.1;

      if (state.weather.id === 'fog') {
        overlayColor = 0xcccccc;
        alpha = 0.3;
      } else if (state.weather.id === 'rain') {
        overlayColor = 0x4488cc;
        alpha = 0.15;
      } else if (state.weather.id === 'snow') {
        overlayColor = 0xffffff;
        alpha = 0.25;
      }

      graphics.beginFill(overlayColor, alpha);
      graphics.drawRect(0, 0, width, height);
      graphics.endFill();

      if (state.weather.id === 'rain' || state.weather.id === 'snow') {
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * width;
          const y = (Date.now() / 10 + i * 30) % height;
          
          if (state.weather.id === 'rain') {
            graphics.lineStyle(1, 0x88bbff, 0.6);
            graphics.moveTo(x, y);
            graphics.lineTo(x - 2, y + 8);
          } else {
            graphics.beginFill(0xffffff, 0.8);
            graphics.drawCircle(x, y, 2);
            graphics.endFill();
          }
        }
      }
    }
  }, [width, height]);

  const drawSignalProgress = useCallback(() => {
    if (!signalGraphicsRef.current || !appRef.current) return;

    const state = useSimulationStore.getState();
    const graphics = signalGraphicsRef.current;
    graphics.clear();

    state.missions.forEach(mission => {
      if (mission.status !== 'running') return;

      const color = getSourceColor(mission.enemySourceId);
      const path = mission.path.towers;
      const { currentStep, currentTime } = mission;

      if (currentStep < path.length - 1) {
        const fromTower = state.towers.find((t) => t.id === path[currentStep]);
        const toTower = state.towers.find((t) => t.id === path[currentStep + 1]);

        if (fromTower && toTower) {
          const source = state.enemySources.find(s => s.id === mission.enemySourceId);
          const delay = source ? source.level.delayFactor * fromTower.signalDelay : fromTower.signalDelay;
          const garrisonFactor = fromTower.garrisonCount > 0 
            ? Math.max(0.7, fromTower.baseGarrisonCount / fromTower.garrisonCount)
            : 1.5;
          const effectiveDelay = delay * garrisonFactor;
          
          const stepProgress = currentTime / effectiveDelay;
          const clampedProgress = Math.min(1, Math.max(0, stepProgress));

          const signalX = fromTower.x + (toTower.x - fromTower.x) * clampedProgress;
          const signalY = fromTower.y + (toTower.y - fromTower.y) * clampedProgress;

          graphics.beginFill(color);
          graphics.drawCircle(signalX, signalY, 10);
          graphics.endFill();

          graphics.beginFill(color, 0.3);
          graphics.drawCircle(signalX, signalY, 18 + Math.sin(Date.now() / 200) * 4);
          graphics.endFill();

          const pulseGfx = new PIXI.Graphics();
          pulseGfx.lineStyle(2, color, 0.5);
          pulseGfx.drawCircle(signalX, signalY, 25 + Math.sin(Date.now() / 150) * 5);
          graphics.addChild(pulseGfx);
        }
      }
    });
  }, [enemySources]);

  const refreshAllVisuals = useCallback(() => {
    drawLines();
    drawRanges();
    drawDispatches();
    drawWeatherOverlay();
    towers.forEach((tower) => {
      updateTowerVisual(tower.id);
    });
  }, [towers, drawLines, drawRanges, drawDispatches, drawWeatherOverlay, updateTowerVisual]);

  useEffect(() => {
    initPixi();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [initPixi]);

  useEffect(() => {
    if (!appRef.current) return;

    const app = appRef.current;

    towerSpritesRef.current.forEach((sprite) => {
      app.stage.removeChild(sprite);
    });
    towerSpritesRef.current.clear();

    towers.forEach((tower) => {
      const sprite = createTowerSprite(tower);
      towerSpritesRef.current.set(tower.id, sprite);
      app.stage.addChild(sprite);
    });

    refreshAllVisuals();
  }, [towers, createTowerSprite, refreshAllVisuals]);

  useEffect(() => {
    refreshAllVisuals();
  }, [weather, selectedPathId, paths, missions, enemySources, dispatches, simulation.globalTime, refreshAllVisuals]);

  useEffect(() => {
    if (!appRef.current) return;

    const handlePointerMove = (event: PIXI.FederatedPointerEvent) => {
      if (draggingTowerRef.current) {
        const globalPos = event.global;
        const newX = Math.max(20, Math.min(width - 20, globalPos.x));
        const newY = Math.max(40, Math.min(height - 40, globalPos.y));

        const sprite = towerSpritesRef.current.get(draggingTowerRef.current);
        if (sprite) {
          sprite.x = newX;
          sprite.y = newY;
        }

        moveTower(draggingTowerRef.current, newX, newY, false);
        drawLines();
        drawRanges();
      }
    };

    const handlePointerUp = () => {
      if (draggingTowerRef.current) {
        const sprite = towerSpritesRef.current.get(draggingTowerRef.current);
        if (sprite) {
          moveTower(draggingTowerRef.current, sprite.x, sprite.y, true);
        }
        draggingTowerRef.current = null;
      }
    };

    const stage = appRef.current.stage;
    stage.on('pointermove', handlePointerMove);
    stage.on('pointerup', handlePointerUp);
    stage.on('pointerupoutside', handlePointerUp);

    return () => {
      stage.off('pointermove', handlePointerMove);
      stage.off('pointerup', handlePointerUp);
      stage.off('pointerupoutside', handlePointerUp);
    };
  }, [moveTower, width, height, drawLines, drawRanges]);

  useEffect(() => {
    if (!containerRef.current || !appRef.current) return;

    appRef.current.renderer.resize(width, height);
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 500,
        border: '2px solid #8b4513',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    />
  );
}
