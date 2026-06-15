import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useSimulationStore } from '../store/useSimulationStore';
import { MAP_CONFIG, COLORS } from '../constants';
import { BeaconTower } from '../types';

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
  const draggingTowerRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const {
    towers,
    selectedTowerId,
    startTowerId,
    endTowerId,
    weather,
    paths,
    selectedPathId,
    isAddingTower,
    simulation,
    addTower,
    selectTower,
    moveTower,
  } = useSimulationStore();

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

    signalGraphicsRef.current = new PIXI.Graphics();
    app.stage.addChild(signalGraphicsRef.current);

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
    });

    const state = useSimulationStore.getState();
    state.towers.forEach((tower) => {
      const sprite = createTowerSprite(tower);
      towerSpritesRef.current.set(tower.id, sprite);
      app.stage.addChild(sprite);
    });

    drawLines();
    drawRanges();

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

      container.addChild(base, roof, window, label);
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

  const updateTowerVisual = useCallback(
    (towerId: string) => {
      const sprite = towerSpritesRef.current.get(towerId);
      if (!sprite || !appRef.current) return;

      const state = useSimulationStore.getState();
      const tower = state.towers.find((t) => t.id === towerId);
      if (!tower) return;

      const base = sprite.getChildAt(0) as PIXI.Graphics;
      base.clear();

      let color = COLORS.tower.normal;
      if (!tower.isActive || tower.garrisonCount <= 0) {
        color = COLORS.tower.disabled;
      } else if (towerId === state.startTowerId) {
        color = COLORS.tower.start;
      } else if (towerId === state.endTowerId) {
        color = COLORS.tower.selected;
      } else if (state.simulation.activeTowers.includes(towerId)) {
        color = COLORS.tower.active;
      } else if (towerId === state.selectedTowerId) {
        color = COLORS.tower.selected;
      }

      base.beginFill(color);
      base.drawRect(-15, -20, 30, 40);
      base.endFill();

      if (state.simulation.activeTowers.includes(towerId)) {
        const flame = sprite.getChildByName('flame');
        if (!flame) {
          const flameGfx = new PIXI.Graphics();
          flameGfx.name = 'flame';
          flameGfx.beginFill(COLORS.signal);
          flameGfx.moveTo(-8, -35);
          flameGfx.quadraticCurveTo(0, -55, 8, -35);
          flameGfx.closePath();
          flameGfx.endFill();
          sprite.addChild(flameGfx);
        }
      } else {
        const flame = sprite.getChildByName('flame');
        if (flame) {
          sprite.removeChild(flame);
        }
      }
    },
    []
  );

  const drawLines = useCallback(() => {
    if (!lineGraphicsRef.current) return;

    const state = useSimulationStore.getState();
    const graphics = lineGraphicsRef.current;
    graphics.clear();

    const adjacency: Map<string, Set<string>> = new Map();
    state.towers.forEach((t) => adjacency.set(t.id, new Set()));

    const selectedPath = state.paths.find((p) => p.id === state.selectedPathId);
    const pathEdges = new Set<string>();

    if (selectedPath) {
      for (let i = 0; i < selectedPath.towers.length - 1; i++) {
        const from = selectedPath.towers[i];
        const to = selectedPath.towers[i + 1];
        pathEdges.add(`${from}-${to}`);
        pathEdges.add(`${to}-${from}`);
      }
    }

    const altPaths = state.paths.filter((p) => p.id !== state.selectedPathId);
    const altPathEdges = new Set<string>();

    altPaths.forEach((path) => {
      for (let i = 0; i < path.towers.length - 1; i++) {
        const from = path.towers[i];
        const to = path.towers[i + 1];
        altPathEdges.add(`${from}-${to}`);
        altPathEdges.add(`${to}-${from}`);
      }
    });

    for (let i = 0; i < state.towers.length; i++) {
      for (let j = i + 1; j < state.towers.length; j++) {
        const towerA = state.towers[i];
        const towerB = state.towers[j];

        if (!towerA.isActive || !towerB.isActive) continue;
        if (towerA.garrisonCount <= 0 || towerB.garrisonCount <= 0) continue;

        const distance = Math.sqrt(
          Math.pow(towerA.x - towerB.x, 2) + Math.pow(towerA.y - towerB.y, 2)
        );
        const effectiveRange = towerA.visualRange * state.weather.visibilityFactor;

        if (distance <= effectiveRange) {
          adjacency.get(towerA.id)?.add(towerB.id);
          adjacency.get(towerB.id)?.add(towerA.id);

          const edgeKey = `${towerA.id}-${towerB.id}`;
          let lineColor = COLORS.line.normal;
          let lineWidth = 1;
          let alpha = 0.3;

          if (pathEdges.has(edgeKey)) {
            lineColor = COLORS.line.optimal;
            lineWidth = 4;
            alpha = 1;
          } else if (altPathEdges.has(edgeKey)) {
            lineColor = COLORS.line.alternative;
            lineWidth = 2;
            alpha = 0.6;
          }

          graphics.lineStyle(lineWidth, lineColor, alpha);
          graphics.moveTo(towerA.x, towerA.y);
          graphics.lineTo(towerB.x, towerB.y);
        }
      }
    }
  }, []);

  const drawRanges = useCallback(() => {
    if (!rangeGraphicsRef.current) return;

    const state = useSimulationStore.getState();
    const graphics = rangeGraphicsRef.current;
    graphics.clear();

    if (!state.selectedTowerId) return;

    const tower = state.towers.find((t) => t.id === state.selectedTowerId);
    if (!tower || !tower.isActive || tower.garrisonCount <= 0) return;

    const effectiveRange = tower.visualRange * state.weather.visibilityFactor;

    graphics.lineStyle(2, COLORS.tower.selected, 0.5);
    graphics.beginFill(COLORS.tower.selected, 0.1);
    graphics.drawCircle(tower.x, tower.y, effectiveRange);
    graphics.endFill();
  }, []);

  const drawSignalProgress = useCallback(() => {
    if (!signalGraphicsRef.current) return;

    const state = useSimulationStore.getState();
    const graphics = signalGraphicsRef.current;
    graphics.clear();

    const selectedPath = state.paths.find((p) => p.id === state.selectedPathId);
    if (!selectedPath || state.simulation.status === 'idle') return;

    const { currentStep } = state.simulation;

    if (currentStep < selectedPath.towers.length - 1) {
      const fromTower = state.towers.find(
        (t) => t.id === selectedPath.towers[currentStep]
      );
      const toTower = state.towers.find(
        (t) => t.id === selectedPath.towers[currentStep + 1]
      );

      if (fromTower && toTower) {
        const currentTower = state.towers.find(
          (t) => t.id === selectedPath.towers[currentStep]
        );
        const delay = currentTower?.signalDelay || 1;
        const stepProgress = state.simulation.currentTime / delay;
        const clampedProgress = Math.min(1, Math.max(0, stepProgress));

        const signalX = fromTower.x + (toTower.x - fromTower.x) * clampedProgress;
        const signalY = fromTower.y + (toTower.y - fromTower.y) * clampedProgress;

        graphics.beginFill(COLORS.signal);
        graphics.drawCircle(signalX, signalY, 8);
        graphics.endFill();

        const glow = new PIXI.Graphics();
        glow.beginFill(COLORS.signal, 0.3);
        glow.drawCircle(signalX, signalY, 15 + Math.sin(Date.now() / 200) * 3);
        glow.endFill();
      }
    }
  }, []);

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

    drawLines();
    drawRanges();
  }, [towers, createTowerSprite, drawLines, drawRanges]);

  useEffect(() => {
    drawLines();
    drawRanges();
  }, [weather, selectedPathId, paths, drawLines, drawRanges]);

  useEffect(() => {
    towers.forEach((tower) => {
      updateTowerVisual(tower.id);
    });
    drawSignalProgress();
  }, [
    selectedTowerId,
    startTowerId,
    endTowerId,
    simulation.activeTowers,
    simulation.status,
    simulation.currentTime,
    towers,
    updateTowerVisual,
    drawSignalProgress,
  ]);

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
      }
    };

    const handlePointerUp = () => {
      if (draggingTowerRef.current) {
        const sprite = towerSpritesRef.current.get(draggingTowerRef.current);
        if (sprite) {
          moveTower(draggingTowerRef.current, sprite.x, sprite.y);
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
  }, [moveTower, width, height]);

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
