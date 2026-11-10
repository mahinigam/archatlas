import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  COMPONENT_CATALOG,
  ComponentType,
  WhiteboardNode,
  WhiteboardEdge,
  simulateWhiteboardTopology,
  routeConsistentHashKey,
  calculateQuorumConsistency,
  RingNode,
} from '../utils/systemPhysics';
import { WHITEBOARD_PRESETS } from '../data/systemDesignData';
import {
  Plus,
  Minus,
  Link2,
  ZapOff,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Download,
  Upload,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';

interface WhiteboardLabViewProps {
  initialPresetId?: string;
}

const RING_PALETTE = ['#c6f36a', '#73d9e8', '#ffb86b', '#ff8e9e', '#a78bfa', '#34d399'];

export const WhiteboardLabView: React.FC<WhiteboardLabViewProps> = ({
  initialPresetId = 'whatsapp',
}) => {
  const initialPreset =
    WHITEBOARD_PRESETS[initialPresetId] || WHITEBOARD_PRESETS.whatsapp;

  const [presetKey, setPresetKey] = useState<string>(initialPreset.id);
  const [nodes, setNodes] = useState<WhiteboardNode[]>(initialPreset.nodes);
  const [edges, setEdges] = useState<WhiteboardEdge[]>(initialPreset.edges);
  const [ingressQps, setIngressQps] = useState<number>(initialPreset.ingressQps);
  const [cacheHitPct, setCacheHitPct] = useState<number>(initialPreset.cacheHitPct);
  const [readRatioPct, setReadRatioPct] = useState<number>(initialPreset.readRatioPct);

  const [selectedNodeId, setSelectedNodeId] = useState<string>('n2');
  const [connectMode, setConnectMode] = useState<boolean>(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [chaosMode, setChaosMode] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Canvas Pan & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  const canvasStateRef = useRef({ panX: 0, panY: 0, zoom: 1 });
  canvasStateRef.current = { panX, panY, zoom };

  const panStartRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const touchStateRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    initialDist: number;
    initialZoom: number;
    pinchMidX: number;
    pinchMidY: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    initialDist: 0,
    initialZoom: 1,
    pinchMidX: 0,
    pinchMidY: 0,
  });

  // Consistent Hashing Ring State
  const [ringNodes, setRingNodes] = useState<RingNode[]>([
    { name: 'Shard-A', angle: 45, color: '#c6f36a' },
    { name: 'Shard-B', angle: 165, color: '#73d9e8' },
    { name: 'Shard-C', angle: 285, color: '#ffb86b' },
  ]);
  const [ringKey, setRingKey] = useState<string>('user_id:84920');

  // Token Bucket Rate Limiter State
  const [bucketTokens, setBucketTokens] = useState<number>(10);
  const [rateLogs, setRateLogs] = useState<
    { id: number; text: string; rejected: boolean }[]
  >([
    {
      id: 1,
      text: 'Bucket initialized (Capacity = 10 tokens, Refill = 1 token / 600ms)',
      rejected: false,
    },
  ]);

  // Leaderless Quorum (N, W, R) State
  const [quorumN, setQuorumN] = useState<number>(3);
  const [quorumW, setQuorumW] = useState<number>(2);
  const [quorumR, setQuorumR] = useState<number>(2);

  useEffect(() => {
    const timer = setInterval(() => {
      setBucketTokens((prev) => Math.min(10, prev + 1));
    }, 650);
    return () => clearInterval(timer);
  }, []);

  const loadPreset = (key: string) => {
    const p = WHITEBOARD_PRESETS[key];
    if (!p) return;
    setPresetKey(key);
    setNodes(p.nodes.map((n) => ({ ...n })));
    setEdges(p.edges.map((e) => ({ ...e })));
    setIngressQps(p.ingressQps);
    setCacheHitPct(p.cacheHitPct);
    setReadRatioPct(p.readRatioPct);
    setSelectedNodeId(p.nodes[1]?.id || p.nodes[0].id);
    setConnectMode(false);
    setConnectSourceId(null);
    setChaosMode(false);
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  useEffect(() => {
    if (initialPresetId && WHITEBOARD_PRESETS[initialPresetId]) {
      loadPreset(initialPresetId);
    }
  }, [initialPresetId]);

  const simulation = useMemo(
    () =>
      simulateWhiteboardTopology(
        nodes,
        edges,
        ingressQps,
        cacheHitPct,
        readRatioPct
      ),
    [nodes, edges, ingressQps, cacheHitPct, readRatioPct]
  );

  const selectedNode = useMemo(
    () =>
      simulation.nodes.find((n) => n.id === selectedNodeId) ||
      simulation.nodes[0],
    [simulation.nodes, selectedNodeId]
  );

  const handleAddNode = (type: ComponentType) => {
    const spec = COMPONENT_CATALOG[type];
    const newId = `n${Date.now().toString().slice(-4)}`;
    const newNode: WhiteboardNode = {
      id: newId,
      type,
      label: spec.name,
      x: 340 + Math.round((Math.random() - 0.5) * 120),
      y: 190 + Math.round((Math.random() - 0.5) * 120),
      replicas: 1,
      down: false,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  const getSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  };

  // Wheel zoom handler: passive: false to allow e.preventDefault()
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { panX: curPanX, panY: curPanY, zoom: curZoom } = canvasStateRef.current;
      const coords = getSvgCoords(e.clientX, e.clientY);
      const factor = e.ctrlKey
        ? Math.min(1.2, Math.max(0.8, 1 - e.deltaY * 0.01))
        : e.deltaY < 0
        ? 1.1
        : 0.9;
      const nextZoom = Math.min(3.0, Math.max(0.3, Number((curZoom * factor).toFixed(3))));
      if (nextZoom === curZoom) return;

      const nextPanX = coords.x - (coords.x - curPanX) * (curZoom / nextZoom);
      const nextPanY = coords.y - (coords.y - curPanY) * (curZoom / nextZoom);

      setZoom(nextZoom);
      setPanX(nextPanX);
      setPanY(nextPanY);
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Global mouseup to cancel node dragging or canvas panning safely
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      setDraggingId(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleNodeMouseDown = (
    e: React.MouseEvent<SVGGElement>,
    node: WhiteboardNode
  ) => {
    e.stopPropagation();

    if (chaosMode) {
      if (node.type !== 'client') {
        setNodes((prev) =>
          prev.map((n) => (n.id === node.id ? { ...n, down: !n.down } : n))
        );
      }
      return;
    }

    if (connectMode) {
      if (!connectSourceId) {
        setConnectSourceId(node.id);
      } else if (connectSourceId !== node.id) {
        const exists = edges.some(
          (ed) => ed.from === connectSourceId && ed.to === node.id
        );
        if (!exists) {
          setEdges((prev) => [...prev, { from: connectSourceId, to: node.id }]);
        }
        setConnectSourceId(null);
        setConnectMode(false);
      }
      return;
    }

    setSelectedNodeId(node.id);
    setDraggingId(node.id);
    const coords = getSvgCoords(e.clientX, e.clientY);
    setDragOffset({ x: coords.x - node.x, y: coords.y - node.y });
  };

  const handleNodeTouchStart = (
    e: React.TouchEvent<SVGGElement>,
    node: WhiteboardNode
  ) => {
    e.stopPropagation();

    if (chaosMode) {
      if (node.type !== 'client') {
        setNodes((prev) =>
          prev.map((n) => (n.id === node.id ? { ...n, down: !n.down } : n))
        );
      }
      return;
    }

    if (connectMode) {
      if (!connectSourceId) {
        setConnectSourceId(node.id);
      } else if (connectSourceId !== node.id) {
        const exists = edges.some(
          (ed) => ed.from === connectSourceId && ed.to === node.id
        );
        if (!exists) {
          setEdges((prev) => [...prev, { from: connectSourceId, to: node.id }]);
        }
        setConnectSourceId(null);
        setConnectMode(false);
      }
      return;
    }

    setSelectedNodeId(node.id);
    setDraggingId(node.id);
    const t = e.touches[0];
    const coords = getSvgCoords(t.clientX, t.clientY);
    setDragOffset({ x: coords.x - node.x, y: coords.y - node.y });
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (connectMode || chaosMode) return;
    if (e.button !== 0 && e.button !== 1) return;

    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panX,
      startPanY: panY,
    };
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      const svg = svgRef.current;
      if (svg) {
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const dx = (e.clientX - panStartRef.current.startX) / ctm.a;
          const dy = (e.clientY - panStartRef.current.startY) / ctm.d;
          setPanX(panStartRef.current.startPanX - dx);
          setPanY(panStartRef.current.startPanY - dy);
        }
      }
      return;
    }

    if (!draggingId) return;
    const coords = getSvgCoords(e.clientX, e.clientY);
    const nx = Math.max(-500, Math.min(2000, Math.round(coords.x - dragOffset.x)));
    const ny = Math.max(-500, Math.min(2000, Math.round(coords.y - dragOffset.y)));
    setNodes((prev) =>
      prev.map((n) => (n.id === draggingId ? { ...n, x: nx, y: ny } : n))
    );
  };

  const handleSvgMouseUp = () => {
    setIsPanning(false);
    setDraggingId(null);
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (connectMode || chaosMode) return;
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = {
        ...touchStateRef.current,
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        startPanX: panX,
        startPanY: panY,
      };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midClientX = (t1.clientX + t2.clientX) / 2;
      const midClientY = (t1.clientY + t2.clientY) / 2;
      const midSvg = getSvgCoords(midClientX, midClientY);

      touchStateRef.current = {
        mode: 'pinch',
        startX: midClientX,
        startY: midClientY,
        startPanX: panX,
        startPanY: panY,
        initialDist: dist,
        initialZoom: zoom,
        pinchMidX: midSvg.x,
        pinchMidY: midSvg.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (draggingId && e.touches.length === 1) {
      const t = e.touches[0];
      const coords = getSvgCoords(t.clientX, t.clientY);
      const nx = Math.max(-500, Math.min(2000, Math.round(coords.x - dragOffset.x)));
      const ny = Math.max(-500, Math.min(2000, Math.round(coords.y - dragOffset.y)));
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingId ? { ...n, x: nx, y: ny } : n))
      );
      return;
    }

    if (touchStateRef.current.mode === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      const svg = svgRef.current;
      if (svg) {
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const dx = (t.clientX - touchStateRef.current.startX) / ctm.a;
          const dy = (t.clientY - touchStateRef.current.startY) / ctm.d;
          setPanX(touchStateRef.current.startPanX - dx);
          setPanY(touchStateRef.current.startPanY - dy);
        }
      }
    } else if (touchStateRef.current.mode === 'pinch' && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (touchStateRef.current.initialDist > 0) {
        const factor = dist / touchStateRef.current.initialDist;
        const nextZoom = Math.min(3.0, Math.max(0.3, touchStateRef.current.initialZoom * factor));
        const midX = touchStateRef.current.pinchMidX;
        const midY = touchStateRef.current.pinchMidY;
        const initZoom = touchStateRef.current.initialZoom;
        const initPanX = touchStateRef.current.startPanX;
        const initPanY = touchStateRef.current.startPanY;

        const nextPanX = midX - (midX - initPanX) * (initZoom / nextZoom);
        const nextPanY = midY - (midY - initPanY) * (initZoom / nextZoom);

        setZoom(nextZoom);
        setPanX(nextPanX);
        setPanY(nextPanY);
      }
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current.mode = 'none';
    setDraggingId(null);
  };

  const handleZoomIn = () => {
    const curZoom = canvasStateRef.current.zoom;
    const curPanX = canvasStateRef.current.panX;
    const curPanY = canvasStateRef.current.panY;
    const nextZoom = Math.min(3.0, Number((curZoom * 1.2).toFixed(2)));
    if (nextZoom === curZoom) return;

    const centerX = curPanX + (850 / curZoom) / 2;
    const centerY = curPanY + (470 / curZoom) / 2;
    setPanX(centerX - (850 / nextZoom) / 2);
    setPanY(centerY - (470 / nextZoom) / 2);
    setZoom(nextZoom);
  };

  const handleZoomOut = () => {
    const curZoom = canvasStateRef.current.zoom;
    const curPanX = canvasStateRef.current.panX;
    const curPanY = canvasStateRef.current.panY;
    const nextZoom = Math.max(0.3, Number((curZoom / 1.2).toFixed(2)));
    if (nextZoom === curZoom) return;

    const centerX = curPanX + (850 / curZoom) / 2;
    const centerY = curPanY + (470 / curZoom) / 2;
    setPanX(centerX - (850 / nextZoom) / 2);
    setPanY(centerY - (470 / nextZoom) / 2);
    setZoom(nextZoom);
  };

  const handleResetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Architecture Export & Import handlers
  const handleExportJson = () => {
    const exportData = {
      version: 1,
      name: WHITEBOARD_PRESETS[presetKey]?.name || 'Custom Architecture',
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
      ingressQps,
      cacheHitPct,
      readRatioPct,
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archatlas-architecture-${Date.now().toString().slice(-6)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJsonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          alert('Invalid architecture file: missing nodes or edges array.');
          return;
        }

        const isValid = data.nodes.every(
          (n: any) =>
            typeof n === 'object' &&
            n !== null &&
            typeof n.id === 'string' &&
            typeof n.type === 'string' &&
            typeof n.x === 'number' &&
            typeof n.y === 'number'
        );

        if (!isValid) {
          alert('Invalid architecture file: node objects are missing required fields.');
          return;
        }

        const importedNodes: WhiteboardNode[] = data.nodes.map((n: any) => ({
          id: String(n.id),
          type: n.type as ComponentType,
          label: typeof n.label === 'string' ? n.label : 'Node',
          x: Number(n.x),
          y: Number(n.y),
          replicas: typeof n.replicas === 'number' && n.replicas > 0 ? n.replicas : 1,
          down: Boolean(n.down),
        }));

        const importedEdges: WhiteboardEdge[] = data.edges
          .filter((ed: any) => typeof ed?.from === 'string' && typeof ed?.to === 'string')
          .map((ed: any) => ({
            from: String(ed.from),
            to: String(ed.to),
          }));

        setNodes(importedNodes);
        setEdges(importedEdges);

        if (typeof data.ingressQps === 'number' && data.ingressQps > 0) {
          setIngressQps(data.ingressQps);
        }
        if (typeof data.cacheHitPct === 'number') {
          setCacheHitPct(Math.max(0, Math.min(100, data.cacheHitPct)));
        }
        if (typeof data.readRatioPct === 'number') {
          setReadRatioPct(Math.max(0, Math.min(100, data.readRatioPct)));
        }

        if (importedNodes.length > 0) {
          setSelectedNodeId(importedNodes[0].id);
        }

        setZoom(1);
        setPanX(0);
        setPanY(0);

        setConnectMode(false);
        setConnectSourceId(null);
        setChaosMode(false);
      } catch (err) {
        console.error('Failed to import architecture JSON', err);
        alert('Failed to parse architecture JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;

    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const rootStyle = window.getComputedStyle(document.documentElement);
      const cssVars: Record<string, string> = {
        '--bg': rootStyle.getPropertyValue('--bg').trim() || '#0a0d14',
        '--panel': rootStyle.getPropertyValue('--panel').trim() || '#111722',
        '--p2': rootStyle.getPropertyValue('--p2').trim() || '#151e2b',
        '--p3': rootStyle.getPropertyValue('--p3').trim() || '#1b2635',
        '--ink': rootStyle.getPropertyValue('--ink').trim() || '#f2f5f7',
        '--muted': rootStyle.getPropertyValue('--muted').trim() || '#9ba9b8',
        '--line': rootStyle.getPropertyValue('--line').trim() || '#263344',
        '--soft': rootStyle.getPropertyValue('--soft').trim() || '#344253',
        '--lime': rootStyle.getPropertyValue('--lime').trim() || '#c6f36a',
        '--lime-ink': rootStyle.getPropertyValue('--lime-ink').trim() || '#10150c',
        '--cyan': rootStyle.getPropertyValue('--cyan').trim() || '#73d9e8',
        '--orange': rootStyle.getPropertyValue('--orange').trim() || '#ffb86b',
        '--rose': rootStyle.getPropertyValue('--rose').trim() || '#ff8e9e',
      };

      const allCloneElements = clone.querySelectorAll<SVGElement>('*');
      allCloneElements.forEach((el) => {
        ['fill', 'stroke', 'stop-color'].forEach((attr) => {
          const val = el.getAttribute(attr);
          if (val && val.includes('var(')) {
            const resolved = val.replace(
              /var\((--[a-zA-Z0-9_-]+)\)/g,
              (_, varName) => cssVars[varName] || val
            );
            el.setAttribute(attr, resolved);
          }
        });
      });

      const origTexts = svg.querySelectorAll<SVGTextElement>('text');
      const cloneTexts = clone.querySelectorAll<SVGTextElement>('text');
      origTexts.forEach((origText, idx) => {
        const cloneText = cloneTexts[idx];
        if (!cloneText) return;
        const comp = window.getComputedStyle(origText);
        cloneText.setAttribute(
          'font-family',
          comp.fontFamily || 'DM Mono, monospace, sans-serif'
        );
        cloneText.setAttribute('font-size', comp.fontSize || '10px');
        cloneText.setAttribute('font-weight', comp.fontWeight || '400');
        const textAnchor = origText.getAttribute('text-anchor') || comp.textAnchor;
        if (textAnchor) {
          cloneText.setAttribute('text-anchor', textAnchor);
        }
        const fill = origText.getAttribute('fill');
        if (fill && fill.includes('var(')) {
          const resolved = fill.replace(
            /var\((--[a-zA-Z0-9_-]+)\)/g,
            (_, varName) => cssVars[varName] || comp.fill
          );
          cloneText.setAttribute('fill', resolved);
        } else {
          cloneText.setAttribute('fill', comp.fill || cssVars['--ink']);
        }
      });

      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', '-5000');
      bgRect.setAttribute('y', '-5000');
      bgRect.setAttribute('width', '10000');
      bgRect.setAttribute('height', '10000');
      bgRect.setAttribute('fill', cssVars['--bg']);
      const defs = clone.querySelector('defs');
      if (defs && defs.nextSibling) {
        clone.insertBefore(bgRect, defs.nextSibling);
      } else {
        clone.insertBefore(bgRect, clone.firstChild);
      }

      const exportWidth = 1700;
      const exportHeight = 940;
      clone.setAttribute('width', exportWidth.toString());
      clone.setAttribute('height', exportHeight.toString());

      let xml = new XMLSerializer().serializeToString(clone);
      xml = xml.replace(
        /var\((--[a-zA-Z0-9_-]+)\)/g,
        (_, varName) => cssVars[varName] || '#ffffff'
      );

      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(svgBlob);
      const img = new window.Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = exportWidth;
        canvas.height = exportHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = cssVars['--bg'];
          ctx.fillRect(0, 0, exportWidth, exportHeight);
          ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `archatlas-architecture-${Date.now().toString().slice(-6)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(blobUrl);
      };

      img.onerror = (e) => {
        console.error('Error rendering SVG image for PNG export', e);
        URL.revokeObjectURL(blobUrl);
        alert('Failed to export PNG.');
      };

      img.src = blobUrl;
    } catch (err) {
      console.error('Failed to export architecture PNG', err);
      alert('Failed to export PNG.');
    }
  };

  const scaleSelectedNode = (delta: number) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNode.id
          ? { ...n, replicas: Math.max(1, n.replicas + delta) }
          : n
      )
    );
  };

  const toggleSelectedNodeDown = () => {
    if (!selectedNode || selectedNode.type === 'client') return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNode.id ? { ...n, down: !n.down } : n
      )
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNode || selectedNode.type === 'client') return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
    setEdges((prev) =>
      prev.filter(
        (e) => e.from !== selectedNode.id && e.to !== selectedNode.id
      )
    );
    setSelectedNodeId(nodes[0]?.id || 'n1');
  };

  const ringResult = useMemo(
    () => routeConsistentHashKey(ringNodes, ringKey),
    [ringNodes, ringKey]
  );

  const handleAddRingShard = () => {
    if (ringNodes.length >= 6) return;
    const idx = ringNodes.length;
    setRingNodes((prev) => [
      ...prev,
      {
        name: `Shard-${String.fromCharCode(65 + idx)}`,
        angle: (idx * 67 + 25) % 360,
        color: RING_PALETTE[idx % RING_PALETTE.length],
      },
    ]);
  };

  const handleRemoveRingShard = () => {
    if (ringNodes.length <= 2) return;
    setRingNodes((prev) => prev.slice(0, -1));
  };

  const handleFireRequests = (count: number) => {
    let allowed = 0;
    let rejected = 0;
    let cur = bucketTokens;
    for (let i = 0; i < count; i++) {
      if (cur > 0) {
        cur--;
        allowed++;
      } else {
        rejected++;
      }
    }
    setBucketTokens(cur);
    const entry = {
      id: Date.now() + Math.random(),
      text:
        rejected > 0
          ? `Burst(${count}): ${allowed} Allowed (200 OK), ${rejected} Rejected (429 Too Many Requests)`
          : `Burst(${count}): All ${allowed} Allowed (200 OK)`,
      rejected: rejected > 0,
    };
    setRateLogs((prev) => [entry, ...prev.slice(0, 6)]);
  };

  const quorumResult = useMemo(
    () => calculateQuorumConsistency(quorumN, quorumW, quorumR),
    [quorumN, quorumW, quorumR]
  );

  return (
    <div className="space-y-10 pt-4">
      {/* Top Workspace Control Bar */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[var(--line)]">
        <div>
          <div className="eyebrow-line">
            Interactive Topology Simulator · Little’s Law Queueing · Staff Architecture Audit
          </div>
          <h1 className="font-display font-bold text-[clamp(28px,3.6vw,44px)] leading-[1.06] tracking-[-0.04em] text-[var(--ink)] mt-3">
            Architecture Whiteboard & Telemetry Lab
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="preset-select" className="text-xs font-mono text-[var(--muted)]">
            Blueprint:
          </label>
          <select
            id="preset-select"
            aria-label="Select architecture blueprint preset"
            value={presetKey}
            onChange={(e) => loadPreset(e.target.value)}
            className="px-3 py-2 text-xs font-mono font-medium bg-[var(--panel)] border border-[var(--line)] rounded-[10px] text-[var(--ink)] focus:outline-none focus:border-[var(--lime)]"
          >
            {Object.values(WHITEBOARD_PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setConnectMode((v) => !v);
              setChaosMode(false);
              setConnectSourceId(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-[10px] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              connectMode
                ? 'bg-[var(--cyan)] text-[#0a0d14] border-[var(--cyan)]'
                : 'bg-[var(--panel)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--cyan)]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            {connectMode
              ? connectSourceId
                ? 'Click Target Node'
                : 'Click Source Node'
              : 'Wire Nodes'}
          </button>

          <button
            type="button"
            onClick={() => {
              setChaosMode((v) => !v);
              setConnectMode(false);
              setConnectSourceId(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-[10px] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chaosMode
                ? 'bg-[var(--rose)] text-[#0a0d14] border-[var(--rose)]'
                : 'bg-[var(--panel)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--rose)]'
            }`}
          >
            <ZapOff className="w-3.5 h-3.5" />
            {chaosMode ? 'Click Node to Kill' : 'Chaos Mode'}
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            title="Download architecture as JSON file"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-[10px] border bg-[var(--panel)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--lime)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--lime)]" />
            Export JSON
          </button>

          <button
            type="button"
            onClick={handleImportJsonClick}
            title="Import architecture from JSON file"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-[10px] border bg-[var(--panel)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--cyan)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[var(--cyan)]" />
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-hidden="true"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={handleExportPng}
            title="Export whiteboard canvas as PNG image"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-[10px] border bg-[var(--panel)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--orange)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[var(--orange)]" />
            Export PNG
          </button>
        </div>
      </section>

      {/* Main 3-Column Whiteboard Studio */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left 3 Columns: Component Palette & Live Traffic Sliders */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-4">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--lime)] mb-3">
              Add Infrastructure Node
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
              {Object.values(COMPONENT_CATALOG)
                .filter((c) => c.type !== 'client')
                .map((comp) => (
                  <button
                    key={comp.type}
                    type="button"
                    onClick={() => handleAddNode(comp.type)}
                    className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-[var(--p2)] border border-[var(--line)] hover:border-[var(--lime)] text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-display font-bold text-[var(--ink)]">
                        {comp.name}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--muted)]">
                        {(comp.capacityPerNode / 1000).toFixed(0)}k QPS/node ·{' '}
                        {comp.baseLatencyMs}ms
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-[var(--lime)] shrink-0" />
                  </button>
                ))}
            </div>
          </div>

          {/* Live Traffic Physics Generator */}
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-4 space-y-3.5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--cyan)]">
              Live Traffic & Workload Sliders
            </h2>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <label htmlFor="wb-qps" className="text-[var(--muted)]">
                  Ingress Traffic QPS:
                </label>
                <strong className="text-[var(--lime)]">
                  {ingressQps.toLocaleString()} /s
                </strong>
              </div>
              <input
                id="wb-qps"
                type="range"
                min={1000}
                max={250000}
                step={1000}
                value={ingressQps}
                onChange={(e) => setIngressQps(Number(e.target.value))}
                className="w-full accent-[var(--lime)] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <label htmlFor="wb-cache" className="text-[var(--muted)]">
                  Cache Hit Ratio:
                </label>
                <strong className="text-[var(--cyan)]">{cacheHitPct}%</strong>
              </div>
              <input
                id="wb-cache"
                type="range"
                min={0}
                max={98}
                step={1}
                value={cacheHitPct}
                onChange={(e) => setCacheHitPct(Number(e.target.value))}
                className="w-full accent-[var(--cyan)] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <label htmlFor="wb-rw" className="text-[var(--muted)]">
                  Read : Write Ratio:
                </label>
                <strong className="text-[var(--orange)]">
                  {readRatioPct} : {100 - readRatioPct}
                </strong>
              </div>
              <input
                id="wb-rw"
                type="range"
                min={10}
                max={95}
                step={5}
                value={readRatioPct}
                onChange={(e) => setReadRatioPct(Number(e.target.value))}
                className="w-full accent-[var(--orange)] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Center 6 Columns: Interactive Drag-and-Drop SVG Canvas */}
        <div className="xl:col-span-6 bg-[var(--panel)] border border-[var(--line)] rounded-[18px] flex flex-col justify-between overflow-hidden shadow-[var(--shadow)]">
          {/* Canvas Telemetry Header */}
          <div className="px-4 py-3 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[var(--p2)]">
            <div className="flex items-center gap-3 text-[var(--muted)]">
              <span>
                E2E P99:{' '}
                <strong className="text-[var(--ink)]">
                  {simulation.e2eLatencyMs} ms
                </strong>
              </span>
              <span>·</span>
              <span>
                Composite SLA:{' '}
                <strong className="text-[var(--cyan)]">
                  {simulation.compositeSlaPct}
                </strong>
              </span>
            </div>

            <div>
              Status:{' '}
              <strong
                className={
                  simulation.overallStatus === 'NOMINAL'
                    ? 'text-[var(--lime)]'
                    : simulation.overallStatus === 'ELEVATED'
                    ? 'text-[var(--orange)]'
                    : 'text-[var(--rose)]'
                }
              >
                {simulation.overallStatus} (Max {simulation.maxUtilizationPct}%)
              </strong>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <div className="relative flex-1 map-radial-bg flex items-center justify-center p-2 overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`${panX} ${panY} ${850 / zoom} ${470 / zoom}`}
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={handleSvgMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={`w-full h-auto min-h-[360px] max-h-[480px] select-none whiteboard-canvas ${
                connectMode
                  ? 'cursor-crosshair'
                  : chaosMode
                  ? 'cursor-pointer'
                  : isPanning || draggingId
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
              }`}
              data-testid="architecture-whiteboard-svg"
            >
              <defs>
                <pattern
                  id="wb-grid"
                  width="28"
                  height="28"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1" fill="var(--line)" />
                </pattern>
              </defs>
              <rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#wb-grid)" />

              {/* Edges with Animated Packet Flow */}
              {edges.map((ed, idx) => {
                const src = simulation.nodes.find((n) => n.id === ed.from);
                const dst = simulation.nodes.find((n) => n.id === ed.to);
                if (!src || !dst) return null;

                const x1 = src.x + 170;
                const y1 = src.y + 38;
                const x2 = dst.x;
                const y2 = dst.y + 38;
                const cx = (x1 + x2) / 2;
                const pathData = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
                const isOverloaded = dst.utilizationPct > 100;

                return (
                  <g key={`wb-edge-${idx}`} className="pointer-events-none">
                    <path
                      d={pathData}
                      fill="none"
                      strokeWidth={2.2}
                      stroke="var(--soft)"
                      opacity={0.5}
                    />
                    {!src.down && !dst.down && src.inQps > 0 && (
                      <path
                        d={pathData}
                        fill="none"
                        strokeWidth={isOverloaded ? 3 : 2.2}
                        stroke={isOverloaded ? 'var(--rose)' : 'var(--lime)'}
                        className={
                          isOverloaded
                            ? 'animate-packet-overload'
                            : 'animate-packet-flow'
                        }
                      />
                    )}
                  </g>
                );
              })}

              {/* Whiteboard Nodes */}
              {simulation.nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const barWidth = Math.min(
                  150,
                  Math.round((node.utilizationPct / 100) * 150)
                );

                let strokeHex = isSelected ? 'var(--lime)' : 'var(--soft)';
                let barHex = 'var(--lime)';
                if (node.down || node.utilizationPct > 100) {
                  strokeHex = 'var(--rose)';
                  barHex = 'var(--rose)';
                } else if (node.utilizationPct > 75) {
                  strokeHex = 'var(--orange)';
                  barHex = 'var(--orange)';
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    onTouchStart={(e) => handleNodeTouchStart(e, node)}
                    className="cursor-move"
                  >
                    <rect
                      width={170}
                      height={76}
                      rx={11}
                      fill={isSelected ? 'var(--p2)' : 'var(--panel)'}
                      stroke={strokeHex}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray={node.down ? '4 3' : undefined}
                    />
                    <text
                      x={10}
                      y={19}
                      fill="var(--ink)"
                      className="font-mono text-[11px] font-bold"
                    >
                      {node.label.slice(0, 17)}
                    </text>
                    <text
                      x={160}
                      y={18}
                      textAnchor="end"
                      fill="var(--cyan)"
                      className="font-mono text-[10px] font-bold"
                    >
                      x{node.replicas}
                    </text>

                    <text
                      x={10}
                      y={37}
                      fill="var(--muted)"
                      className="font-mono text-[10px]"
                    >
                      In: {(node.inQps / 1000).toFixed(1)}k/s
                    </text>
                    <text
                      x={160}
                      y={37}
                      textAnchor="end"
                      fill={barHex}
                      className="font-mono text-[10px] font-bold"
                    >
                      {node.down
                        ? 'OFFLINE'
                        : node.type === 'client'
                        ? 'SOURCE'
                        : `${node.utilizationPct}%`}
                    </text>

                    <rect
                      x={10}
                      y={46}
                      width={150}
                      height={5}
                      rx={2.5}
                      fill="var(--p3)"
                    />
                    <rect
                      x={10}
                      y={46}
                      width={node.type === 'client' ? 150 : barWidth}
                      height={5}
                      rx={2.5}
                      fill={barHex}
                    />

                    <text
                      x={10}
                      y={66}
                      fill="var(--muted)"
                      className="font-mono text-[9.5px]"
                    >
                      {node.type === 'client'
                        ? 'Ingress Generator'
                        : `P99: ${node.effectiveLatencyMs}ms · L=${node.concurrencyConnections}`}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Zoom Controls Cluster */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 p-1 bg-[var(--panel)] border border-[var(--line)] rounded-[10px] shadow-sm select-none backdrop-blur-sm">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out (-)"
                aria-label="Zoom Out"
                className="w-6 h-6 flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--p2)] transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[10px] font-semibold text-[var(--ink)] min-w-[38px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In (+)"
                aria-label="Zoom In"
                className="w-6 h-6 flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--p2)] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-[var(--line)] mx-0.5" />
              <button
                type="button"
                onClick={handleResetView}
                title="Reset View (100%)"
                aria-label="Reset View"
                className="w-6 h-6 flex items-center justify-center rounded-[6px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--p2)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-[var(--line)] text-[11px] font-mono text-[var(--muted)] flex flex-wrap justify-between gap-2 bg-[var(--p2)]">
            <span>Drag nodes to arrange · Scroll to zoom · Drag canvas to pan</span>
            <span>Little’s Law Concurrency: L = λ × W</span>
          </div>
        </div>

        {/* Right 3 Columns: Selected Node Inspector + Staff Architecture Linter */}
        <div className="xl:col-span-3 space-y-4">
          {selectedNode && (
            <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
                  Node Inspector ({selectedNode.id})
                </h2>
                <span className="text-xs font-mono font-semibold text-[var(--lime)]">
                  {selectedNode.status}
                </span>
              </div>

              <div>
                <label
                  htmlFor="node-label-input"
                  className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] block mb-1"
                >
                  Component Label:
                </label>
                <input
                  id="node-label-input"
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id ? { ...n, label: val } : n
                      )
                    );
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--p2)] border border-[var(--line)] rounded-[8px] text-[var(--ink)] focus:outline-none focus:border-[var(--lime)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--muted)] block">
                    Incoming QPS
                  </span>
                  <strong className="text-sm text-[var(--cyan)]">
                    {selectedNode.inQps.toLocaleString()}/s
                  </strong>
                </div>
                <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--muted)] block">
                    Utilization
                  </span>
                  <strong
                    className={`text-sm ${
                      selectedNode.utilizationPct > 95
                        ? 'text-[var(--rose)]'
                        : 'text-[var(--lime)]'
                    }`}
                  >
                    {selectedNode.utilizationPct}%
                  </strong>
                </div>
                <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--muted)] block">
                    Concurrency (L)
                  </span>
                  <strong className="text-sm text-[var(--orange)]">
                    {selectedNode.concurrencyConnections} conns
                  </strong>
                </div>
                <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--muted)] block">
                    Node P99
                  </span>
                  <strong className="text-sm text-[var(--ink)]">
                    {selectedNode.effectiveLatencyMs} ms
                  </strong>
                </div>
              </div>

              {selectedNode.type !== 'client' && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => scaleSelectedNode(1)}
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[9px] hover:opacity-95 transition-opacity whitespace-nowrap cursor-pointer"
                    >
                      +1 Replica (x{selectedNode.replicas + 1})
                    </button>
                    <button
                      type="button"
                      onClick={() => scaleSelectedNode(-1)}
                      className="px-3 py-2 text-xs font-mono font-bold bg-[var(--p2)] text-[var(--ink)] rounded-[9px] border border-[var(--line)] hover:border-[var(--lime)] cursor-pointer"
                    >
                      -1
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectedNodeDown}
                      className="flex-1 px-3 py-1.5 text-xs font-mono font-medium border border-[var(--rose)]/50 text-[var(--rose)] rounded-[9px] hover:bg-[var(--rose)]/10 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {selectedNode.down ? 'Restore Node' : 'Simulate Crash'}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${selectedNode.label}`}
                      onClick={deleteSelectedNode}
                      className="px-2.5 py-1.5 text-xs font-mono border border-[var(--line)] text-[var(--muted)] hover:text-[var(--rose)] rounded-[9px] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Automated Staff Architecture Review Linter */}
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
                Staff Architecture Review
              </h2>
              <span className="text-[10px] font-mono text-[var(--lime)]">
                LIVE AUDIT
              </span>
            </div>

            <div className="space-y-2.5">
              {simulation.findings.map((f) => (
                <div
                  key={f.id}
                  className={`p-3 rounded-[10px] border text-xs ${
                    f.severity === 'CRITICAL'
                      ? 'bg-[var(--rose)]/10 border-[var(--rose)]/40'
                      : f.severity === 'WARNING'
                      ? 'bg-[var(--orange)]/10 border-[var(--orange)]/40'
                      : 'bg-[var(--lime)]/10 border-[var(--lime)]/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] mb-1">
                    {f.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-4 h-4 text-[var(--rose)] shrink-0" />
                    ) : f.severity === 'WARNING' ? (
                      <AlertTriangle className="w-4 h-4 text-[var(--orange)] shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[var(--lime)] shrink-0" />
                    )}
                    <span>{f.title}</span>
                  </div>
                  <p className="text-[var(--muted)] leading-relaxed text-[11px]">
                    {f.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Dock: 3 Interactive Algorithmic Proof Calculators */}
      <section className="pt-6 border-t border-[var(--line)] space-y-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--lime)]">
            Interactive Mathematical Proofs
          </p>
          <h2 className="font-display text-xl font-bold text-[var(--ink)] mt-1">
            Distributed Systems Calculators & Visualizers
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tool 1: Consistent Hashing Ring */}
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--ink)]">
                01. Consistent Hashing Ring (0..2³²-1)
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1 mb-3">
                Add or remove shards and hash keys to see clockwise routing and why only 1/N keys move.
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleAddRingShard}
                  className="px-2.5 py-1.5 text-xs font-mono font-medium bg-[var(--p2)] text-[var(--ink)] rounded-[8px] border border-[var(--line)] hover:border-[var(--lime)] whitespace-nowrap cursor-pointer"
                >
                  + Add Shard
                </button>
                <button
                  type="button"
                  onClick={handleRemoveRingShard}
                  className="px-2.5 py-1.5 text-xs font-mono font-medium bg-[var(--p2)] text-[var(--ink)] rounded-[8px] border border-[var(--line)] hover:border-[var(--rose)] whitespace-nowrap cursor-pointer"
                >
                  - Remove Shard
                </button>
                <input
                  type="text"
                  aria-label="Consistent hash key input"
                  value={ringKey}
                  onChange={(e) => setRingKey(e.target.value)}
                  className="flex-1 min-w-[120px] px-2.5 py-1.5 text-xs font-mono bg-[var(--p2)] border border-[var(--line)] rounded-[8px] text-[var(--ink)]"
                />
              </div>

              <div className="flex items-center gap-4">
                <svg width={150} height={150} viewBox="0 0 180 180" className="shrink-0">
                  <circle
                    cx={90}
                    cy={90}
                    r={64}
                    fill="none"
                    stroke="var(--p3)"
                    strokeWidth={4}
                  />
                  {ringNodes.map((n) => {
                    const rad = (n.angle - 90) * (Math.PI / 180);
                    const x = 90 + 64 * Math.cos(rad);
                    const y = 90 + 64 * Math.sin(rad);
                    const isOwner = n.name === ringResult.owner.name;
                    return (
                      <circle
                        key={n.name}
                        cx={x}
                        cy={y}
                        r={isOwner ? 8 : 5.5}
                        fill={n.color}
                        stroke="var(--bg)"
                        strokeWidth={2}
                      />
                    );
                  })}
                  {(() => {
                    const kRad = (ringResult.keyAngle - 90) * (Math.PI / 180);
                    const kx = 90 + 64 * Math.cos(kRad);
                    const ky = 90 + 64 * Math.sin(kRad);
                    const oRad = (ringResult.owner.angle - 90) * (Math.PI / 180);
                    const ox = 90 + 64 * Math.cos(oRad);
                    const oy = 90 + 64 * Math.sin(oRad);
                    return (
                      <>
                        <line
                          x1={kx}
                          y1={ky}
                          x2={ox}
                          y2={oy}
                          stroke={ringResult.owner.color}
                          strokeWidth={2}
                          strokeDasharray="3 2"
                        />
                        <circle
                          cx={kx}
                          cy={ky}
                          r={4.5}
                          fill="#ffffff"
                          stroke={ringResult.owner.color}
                          strokeWidth={2}
                        />
                        <text
                          x={90}
                          y={86}
                          textAnchor="middle"
                          fill="var(--muted)"
                          className="font-mono text-[9px]"
                        >
                          OWNER
                        </text>
                        <text
                          x={90}
                          y={102}
                          textAnchor="middle"
                          fill={ringResult.owner.color}
                          className="font-mono text-xs font-bold"
                        >
                          {ringResult.owner.name}
                        </text>
                      </>
                    );
                  })()}
                </svg>

                <div className="text-xs font-mono space-y-1.5 text-[var(--muted)]">
                  <div>
                    Key Angle: <strong className="text-[var(--ink)]">{ringResult.keyAngle}°</strong>
                  </div>
                  <div>
                    Routed To:{' '}
                    <strong style={{ color: ringResult.owner.color }}>
                      {ringResult.owner.name} ({ringResult.owner.angle}°)
                    </strong>
                  </div>
                  <div>Active Shards: {ringNodes.length}</div>
                  <div className="text-[var(--lime)]">
                    Scale Event Moves: ~{ringResult.remapPercentage}% keys
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tool 2: Token Bucket Rate Limiter Simulator */}
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--ink)]">
                02. Token Bucket Rate Limiter
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1 mb-3">
                Fire traffic bursts against a live refilling bucket to test HTTP 200 vs 429 rejections.
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handleFireRequests(1)}
                  className="px-2.5 py-1.5 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[8px] whitespace-nowrap cursor-pointer"
                >
                  Send 1 Req
                </button>
                <button
                  type="button"
                  onClick={() => handleFireRequests(5)}
                  className="px-2.5 py-1.5 text-xs font-mono font-bold bg-[var(--orange)] text-[#10150c] rounded-[8px] whitespace-nowrap cursor-pointer"
                >
                  Burst 5 Reqs
                </button>
                <button
                  type="button"
                  onClick={() => handleFireRequests(12)}
                  className="px-2.5 py-1.5 text-xs font-mono font-bold bg-[var(--rose)] text-[#10150c] rounded-[8px] whitespace-nowrap cursor-pointer"
                >
                  Spike 12 Reqs
                </button>
              </div>

              <div className="p-3 rounded-[10px] bg-[var(--p2)] border border-[var(--line)] mb-3">
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-[var(--muted)]">Available Tokens:</span>
                  <strong className="text-[var(--cyan)]">
                    {bucketTokens} / 10
                  </strong>
                </div>
                <div className="grid grid-cols-10 gap-1 h-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs transition-colors ${
                        i < bucketTokens ? 'bg-[var(--lime)]' : 'bg-[var(--p3)]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] font-mono p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                {rateLogs.map((log) => (
                  <div
                    key={log.id}
                    className={
                      log.rejected
                        ? 'text-[var(--rose)] font-semibold'
                        : 'text-[var(--lime)]'
                    }
                  >
                    {log.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tool 3: Dynamo Leaderless Quorum (W + R > N) Calculator */}
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--ink)]">
                03. Leaderless Quorum (W + R &gt; N)
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1 mb-3">
                Tune Replication Factor (N), Write Quorum (W), and Read Quorum (R) to verify strict overlap.
              </p>

              <div className="grid grid-cols-3 gap-2.5 mb-3 text-xs font-mono">
                <div>
                  <label htmlFor="q-n" className="block text-[var(--muted)] mb-1">
                    Replicas N: <strong className="text-[var(--ink)]">{quorumResult.n}</strong>
                  </label>
                  <input
                    id="q-n"
                    type="range"
                    min={1}
                    max={7}
                    value={quorumResult.n}
                    onChange={(e) => setQuorumN(Number(e.target.value))}
                    className="w-full accent-[var(--cyan)]"
                  />
                </div>
                <div>
                  <label htmlFor="q-w" className="block text-[var(--muted)] mb-1">
                    Write W: <strong className="text-[var(--lime)]">{quorumResult.w}</strong>
                  </label>
                  <input
                    id="q-w"
                    type="range"
                    min={1}
                    max={quorumResult.n}
                    value={quorumResult.w}
                    onChange={(e) => setQuorumW(Number(e.target.value))}
                    className="w-full accent-[var(--lime)]"
                  />
                </div>
                <div>
                  <label htmlFor="q-r" className="block text-[var(--muted)] mb-1">
                    Read R: <strong className="text-[var(--orange)]">{quorumResult.r}</strong>
                  </label>
                  <input
                    id="q-r"
                    type="range"
                    min={1}
                    max={quorumResult.n}
                    value={quorumResult.r}
                    onChange={(e) => setQuorumR(Number(e.target.value))}
                    className="w-full accent-[var(--orange)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {Array.from({ length: quorumResult.n }).map((_, idx) => {
                  const inW = idx < quorumResult.w;
                  const inR = idx >= quorumResult.n - quorumResult.r;
                  const isOverlap = inW && inR;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-[8px] border text-center font-mono text-[10px] ${
                        isOverlap
                          ? 'border-[var(--lime)] bg-[var(--lime)]/15 text-[var(--lime)] font-bold'
                          : inW
                          ? 'border-[var(--cyan)] bg-[var(--cyan)]/10 text-[var(--cyan)]'
                          : inR
                          ? 'border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]'
                          : 'border-[var(--line)] bg-[var(--p2)] text-[var(--muted)]'
                      }`}
                    >
                      R{idx + 1}
                      <span className="block text-[8.5px]">
                        {isOverlap ? 'W+R' : inW ? 'W' : inR ? 'R' : 'Idle'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className={`p-2.5 rounded-[10px] border text-xs font-mono ${
                  quorumResult.isStrongConsistency
                    ? 'border-[var(--lime)]/50 bg-[var(--lime)]/10 text-[var(--lime)]'
                    : 'border-[var(--rose)]/50 bg-[var(--rose)]/10 text-[var(--rose)]'
                }`}
              >
                {quorumResult.isStrongConsistency
                  ? `STRONG QUORUM (W+R = ${quorumResult.w + quorumResult.r} > ${quorumResult.n}) · Write Tol=${quorumResult.writeFaultTolerance}, Read Tol=${quorumResult.readFaultTolerance}`
                  : `EVENTUAL / STALE READ RISK (W+R = ${quorumResult.w + quorumResult.r} ≤ ${quorumResult.n})`}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
