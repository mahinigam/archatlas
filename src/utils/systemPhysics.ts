export interface CapacityEstimate {
  readQps: number;
  writeQps: number;
  peakQps: number;
  dailyStorageTB: number;
  yearlyStorageTB: number;
  yearlyStorageFormatted: string;
  ingressBandwidthMBps: number;
  egressBandwidthMBps: number;
}

export function calculateCapacityEstimates(
  dauMillions: number,
  readsPerUser: number,
  writesPerUser: number,
  payloadKB: number
): CapacityEstimate {
  const safeDauM = Number.isFinite(dauMillions) && dauMillions > 0 ? dauMillions : 0.1;
  const safeReads = Number.isFinite(readsPerUser) && readsPerUser >= 0 ? readsPerUser : 0;
  const safeWrites = Number.isFinite(writesPerUser) && writesPerUser >= 0 ? writesPerUser : 0;
  const safePayload = Number.isFinite(payloadKB) && payloadKB >= 0 ? payloadKB : 1;

  const dau = safeDauM * 1_000_000;
  const secondsPerDay = 86_400;
  const readQps = Math.round((dau * safeReads) / secondsPerDay);
  const writeQps = Math.round((dau * safeWrites) / secondsPerDay);
  const peakQps = (readQps + writeQps) * 3;

  const dailyBytes = dau * safeWrites * safePayload * 1024;
  const dailyStorageTB = dailyBytes / 1e12;
  const yearlyStorageTB = dailyStorageTB * 365;

  let yearlyStorageFormatted: string;
  if (yearlyStorageTB >= 1000) {
    yearlyStorageFormatted = `${(yearlyStorageTB / 1000).toFixed(2)} PB/yr`;
  } else if (yearlyStorageTB >= 1) {
    yearlyStorageFormatted = `${yearlyStorageTB.toFixed(1)} TB/yr`;
  } else {
    yearlyStorageFormatted = `${(yearlyStorageTB * 1000).toFixed(1)} GB/yr`;
  }

  const ingressBandwidthMBps = Number(((writeQps * safePayload) / 1024).toFixed(2));
  const egressBandwidthMBps = Number(((readQps * safePayload) / 1024).toFixed(2));

  return {
    readQps,
    writeQps,
    peakQps,
    dailyStorageTB: Number(dailyStorageTB.toFixed(2)),
    yearlyStorageTB: Number(yearlyStorageTB.toFixed(2)),
    yearlyStorageFormatted,
    ingressBandwidthMBps,
    egressBandwidthMBps,
  };
}

export type ComponentType =
  | 'client'
  | 'cdn'
  | 'lb'
  | 'gateway'
  | 'app'
  | 'cache'
  | 'queue'
  | 'sql'
  | 'nosql'
  | 's3';

export interface ComponentSpec {
  type: ComponentType;
  name: string;
  category: string;
  capacityPerNode: number;
  baseLatencyMs: number;
  sla: number;
  color: string;
}

export const COMPONENT_CATALOG: Record<ComponentType, ComponentSpec> = {
  client: {
    type: 'client',
    name: 'Client Traffic Source',
    category: 'Ingress',
    capacityPerNode: 10_000_000,
    baseLatencyMs: 1,
    sla: 1.0,
    color: '#0284c7',
  },
  cdn: {
    type: 'cdn',
    name: 'Edge CDN & Waiting Room',
    category: 'Edge',
    capacityPerNode: 250_000,
    baseLatencyMs: 4,
    sla: 0.9999,
    color: '#0ea5e9',
  },
  lb: {
    type: 'lb',
    name: 'L4/L7 Load Balancer',
    category: 'Edge',
    capacityPerNode: 120_000,
    baseLatencyMs: 2,
    sla: 0.9999,
    color: '#6366f1',
  },
  gateway: {
    type: 'gateway',
    name: 'API & WebSocket Gateway',
    category: 'Edge',
    capacityPerNode: 60_000,
    baseLatencyMs: 5,
    sla: 0.9995,
    color: '#8b5cf6',
  },
  app: {
    type: 'app',
    name: 'Stateless App Service',
    category: 'Compute',
    capacityPerNode: 25_000,
    baseLatencyMs: 12,
    sla: 0.999,
    color: '#10b981',
  },
  cache: {
    type: 'cache',
    name: 'Redis In-Memory Cluster',
    category: 'Storage',
    capacityPerNode: 110_000,
    baseLatencyMs: 1,
    sla: 0.9995,
    color: '#f59e0b',
  },
  queue: {
    type: 'queue',
    name: 'Kafka Partitioned Stream',
    category: 'Messaging',
    capacityPerNode: 150_000,
    baseLatencyMs: 4,
    sla: 0.9999,
    color: '#ec4899',
  },
  sql: {
    type: 'sql',
    name: 'PostgreSQL ACID Primary',
    category: 'Storage',
    capacityPerNode: 12_000,
    baseLatencyMs: 18,
    sla: 0.999,
    color: '#3b82f6',
  },
  nosql: {
    type: 'nosql',
    name: 'ScyllaDB / Cassandra LSM',
    category: 'Storage',
    capacityPerNode: 65_000,
    baseLatencyMs: 6,
    sla: 0.9999,
    color: '#14b8a6',
  },
  s3: {
    type: 's3',
    name: 'Object Storage (S3/GCS)',
    category: 'Storage',
    capacityPerNode: 100_000,
    baseLatencyMs: 25,
    sla: 0.9999,
    color: '#eab308',
  },
};

export interface WhiteboardNode {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  replicas: number;
  down: boolean;
}

export interface WhiteboardEdge {
  from: string;
  to: string;
}

export interface SimulatedNode extends WhiteboardNode {
  inQps: number;
  utilizationPct: number;
  effectiveLatencyMs: number;
  concurrencyConnections: number;
  status: 'NOMINAL' | 'ELEVATED' | 'OVERLOADED' | 'OFFLINE';
}

export interface LintFinding {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'NOMINAL';
  title: string;
  detail: string;
}

export interface TopologySimulationResult {
  nodes: SimulatedNode[];
  maxUtilizationPct: number;
  e2eLatencyMs: number;
  compositeSlaPct: string;
  overallStatus: 'NOMINAL' | 'ELEVATED' | 'OVERLOADED' | 'OUTAGE';
  findings: LintFinding[];
}

export function simulateWhiteboardTopology(
  rawNodes: WhiteboardNode[],
  edges: WhiteboardEdge[],
  ingressQps: number,
  cacheHitPct: number,
  readRatioPct: number
): TopologySimulationResult {
  const safeNodes = Array.isArray(rawNodes) ? rawNodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const safeIngressQps = Math.max(0, Number.isFinite(ingressQps) ? ingressQps : 0);
  const cacheHit = Math.min(0.99, Math.max(0, (Number.isFinite(cacheHitPct) ? cacheHitPct : 80) / 100));
  const readRatio = Math.min(0.99, Math.max(0.01, (Number.isFinite(readRatioPct) ? readRatioPct : 80) / 100));

  const hasActiveCache = safeNodes.some(
    (n) => (n.type === 'cache' || n.type === 'cdn') && !n.down
  );

  const qpsMap = new Map<string, number>();
  safeNodes.forEach((n) => {
    qpsMap.set(n.id, n.type === 'client' && !n.down ? safeIngressQps : 0);
  });

  // Propagate QPS across DAG hops
  for (let hop = 0; hop < 5; hop++) {
    const nextMap = new Map<string, number>();
    safeNodes.forEach((n) => {
      if (n.type === 'client') {
        nextMap.set(n.id, n.down ? 0 : safeIngressQps);
      } else {
        nextMap.set(n.id, 0);
      }
    });

    safeEdges.forEach((e) => {
      const src = safeNodes.find((n) => n.id === e.from);
      const dst = safeNodes.find((n) => n.id === e.to);
      if (!src || !dst || src.down || dst.down) return;

      const srcQps = qpsMap.get(src.id) || 0;
      let factor = 1.0;

      if (dst.type === 'cache' || dst.type === 'cdn') {
        factor = readRatio;
      } else if (dst.type === 'sql' || dst.type === 'nosql') {
        const writeShare = 1 - readRatio;
        const missedReadShare = hasActiveCache
          ? readRatio * (1 - cacheHit)
          : readRatio;
        factor = writeShare + missedReadShare;
      } else if (dst.type === 'queue') {
        factor = 1 - readRatio;
      } else {
        factor = 1.0;
      }

      nextMap.set(dst.id, (nextMap.get(dst.id) || 0) + Math.round(srcQps * factor));
    });

    nextMap.forEach((val, key) => qpsMap.set(key, val));
  }

  let maxUtilizationPct = 0;
  let e2eLatencyMs = 0;
  let compositeSla = 1.0;

  const simulatedNodes: SimulatedNode[] = safeNodes.map((n) => {
    const spec = COMPONENT_CATALOG[n.type] || {
      type: n.type,
      name: n.label || 'Generic Component',
      category: 'Compute',
      capacityPerNode: 20_000,
      baseLatencyMs: 10,
      sla: 0.999,
      color: '#6366f1',
    };
    const inQps = qpsMap.get(n.id) || 0;
    const replicas = Math.max(1, Number.isFinite(n.replicas) ? Math.floor(n.replicas) : 1);
    const totalCap = Math.max(1, spec.capacityPerNode * replicas);
    const utilizationPct = n.down
      ? 0
      : Math.min(999, Math.round((inQps / totalCap) * 100));

    let effectiveLatencyMs = 0;
    if (n.type !== 'client' && !n.down) {
      maxUtilizationPct = Math.max(maxUtilizationPct, utilizationPct);
      const queueMultiplier =
        utilizationPct > 85 ? 1 + Math.pow((utilizationPct - 80) / 10, 2) : 1;
      effectiveLatencyMs = Math.round(spec.baseLatencyMs * queueMultiplier);
      e2eLatencyMs += effectiveLatencyMs;

      const nodeAvailability = 1 - Math.pow(1 - spec.sla, replicas);
      compositeSla *= nodeAvailability;
    }

    const concurrencyConnections = Math.round(inQps * (effectiveLatencyMs / 1000));

    let status: SimulatedNode['status'] = 'NOMINAL';
    if (n.down) status = 'OFFLINE';
    else if (utilizationPct > 100) status = 'OVERLOADED';
    else if (utilizationPct > 75) status = 'ELEVATED';

    return {
      ...n,
      replicas,
      inQps,
      utilizationPct,
      effectiveLatencyMs,
      concurrencyConnections,
      status,
    };
  });

  const findings: LintFinding[] = [];
  const downNodes = simulatedNodes.filter((n) => n.down);
  const overloadedNodes = simulatedNodes.filter(
    (n) => n.utilizationPct > 100 && n.type !== 'client'
  );
  const spofNodes = simulatedNodes.filter(
    (n) => n.replicas === 1 && n.type !== 'client' && n.inQps > 0 && !n.down
  );
  const sqlNodes = simulatedNodes.filter((n) => n.type === 'sql' && !n.down);

  if (downNodes.length > 0) {
    findings.push({
      id: 'outage',
      severity: 'CRITICAL',
      title: `Hardware Outage Detected (${downNodes.map((d) => d.label).join(', ')})`,
      detail:
        'Downstream traffic across severed edges is blackholed. Restore failed nodes or add active-active failover.',
    });
  }

  overloadedNodes.forEach((o) => {
    const spec = COMPONENT_CATALOG[o.type] || { capacityPerNode: 20_000 };
    findings.push({
      id: `overload-${o.id}`,
      severity: 'CRITICAL',
      title: `Bottleneck Meltdown on ${o.label} (${o.utilizationPct}% Load)`,
      detail: `Receiving ${o.inQps.toLocaleString()} QPS against ${(spec.capacityPerNode * o.replicas).toLocaleString()} QPS capacity. Scale out replicas (+1) or introduce a caching/queueing tier.`,
    });
  });

  sqlNodes.forEach((s) => {
    if (s.inQps > 15_000) {
      findings.push({
        id: `sql-iops-${s.id}`,
        severity: 'CRITICAL',
        title: `B+Tree Disk IOPS Wall on ${s.label}`,
        detail: `${s.inQps.toLocaleString()} QPS hitting a relational leader causes severe MVCC lock contention and WAL fsync saturation. Offload reads to Redis or buffer writes via Kafka/ScyllaDB.`,
      });
    }
  });

  if (!hasActiveCache) {
    findings.push({
      id: 'no-cache',
      severity: 'WARNING',
      title: 'Missing In-Memory Caching Tier',
      detail:
        '100% of read requests traverse directly to persistent storage. Add a Redis Cluster (Cache-Aside) to absorb 85%+ of read load.',
    });
  }

  if (spofNodes.length > 0) {
    findings.push({
      id: 'spof',
      severity: 'WARNING',
      title: `Single Point of Failure (SPOF) on ${spofNodes.length} Tier(s)`,
      detail: `${spofNodes.map((s) => s.label).join(', ')} running with x1 replica. Provision at least x2 replicas across Availability Zones.`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: 'healthy',
      severity: 'NOMINAL',
      title: 'Staff Architecture Rubric Passed',
      detail:
        'Zero single points of failure, balanced queue utilization (<75%), and storage IOPS are shielded by caching and event streaming.',
    });
  }

  let overallStatus: TopologySimulationResult['overallStatus'] = 'NOMINAL';
  if (downNodes.length > 0) overallStatus = 'OUTAGE';
  else if (maxUtilizationPct > 100) overallStatus = 'OVERLOADED';
  else if (maxUtilizationPct > 75) overallStatus = 'ELEVATED';

  return {
    nodes: simulatedNodes,
    maxUtilizationPct,
    e2eLatencyMs,
    compositeSlaPct: `${(compositeSla * 100).toFixed(3)}%`,
    overallStatus,
    findings,
  };
}

export interface BloomFilterMathResult {
  bitsPerElement: number;
  optimalHashCount: number;
  totalMegabytes: number;
  theoreticalFpRate?: number;
}

export function calculateBloomFilterMath(
  expectedItemsMillions: number,
  falsePositiveRate: number
): BloomFilterMathResult {
  const safeN = Number.isFinite(expectedItemsMillions) && expectedItemsMillions > 0
    ? expectedItemsMillions
    : 1;
  const n = safeN * 1_000_000;
  const safeP = Number.isFinite(falsePositiveRate)
    ? Math.min(0.5, Math.max(0.0001, falsePositiveRate))
    : 0.01;
  const ln2 = Math.log(2);
  const bitsPerElement = Number((-Math.log(safeP) / (ln2 * ln2)).toFixed(1));
  const optimalHashCount = Math.max(1, Math.round(bitsPerElement * ln2));
  const totalBits = n * bitsPerElement;
  const totalMegabytes = Number((totalBits / 8 / 1e6).toFixed(1));

  const theoreticalFpRate = Number(
    Math.pow(1 - Math.exp((-optimalHashCount * n) / totalBits), optimalHashCount).toFixed(4)
  );

  return {
    bitsPerElement,
    optimalHashCount,
    totalMegabytes,
    theoreticalFpRate,
  };
}

export function calculateBloomFilterFpRate(
  totalBits: number,
  itemCount: number,
  hashCount: number
): number {
  const m = Math.max(1, totalBits);
  const n = Math.max(1, itemCount);
  const k = Math.max(1, hashCount);
  return Number(Math.pow(1 - Math.exp((-k * n) / m), k).toFixed(5));
}

export function computeBloomHashes(
  key: string,
  bitArraySize = 32,
  hashCount = 3
): [number, number, number] & number[] {
  const size = Math.max(1, Math.round(Number.isFinite(bitArraySize) ? bitArraySize : 32));
  const k = Math.max(1, Math.round(Number.isFinite(hashCount) ? hashCount : 3));
  const clean = (typeof key === 'string' ? key.trim() : '') || 'default';

  // FNV-1a 32-bit hash (h1)
  let h1 = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    h1 ^= clean.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
  }
  h1 = h1 >>> 0;

  // DJB2 hash (h2)
  let h2 = 5381;
  for (let i = 0; i < clean.length; i++) {
    h2 = ((h2 << 5) + h2 + clean.charCodeAt(i)) >>> 0;
  }
  if (h2 === 0) h2 = 1;

  // Kirsch-Mitzenmacher double hashing: g_i(x) = (h1 + i * h2) % size
  const hashes: number[] = [];
  for (let i = 0; i < k; i++) {
    const combined = (h1 + Math.imul(i, h2)) >>> 0;
    hashes.push(combined % size);
  }

  return hashes as [number, number, number] & number[];
}

export interface TailLatencyResult {
  singleSlowPct: number;
  compoundSlowPct: number;
  hedgedSlowPct: number;
  amplificationMultiplier?: number;
}

export function calculateTailLatencyAmplification(
  fanOutCount: number,
  singleNodeSlowProbability: number
): TailLatencyResult {
  const n = Math.max(1, Number.isFinite(fanOutCount) ? Math.floor(fanOutCount) : 1);
  const p = Math.min(
    0.9999,
    Math.max(0.0001, Number.isFinite(singleNodeSlowProbability) ? singleNodeSlowProbability : 0.01)
  );
  const compoundProb = 1 - Math.pow(1 - p, n);
  const pHedged = p * p; // Duplicate request sent to replica after P95 threshold
  const hedgedCompound = 1 - Math.pow(1 - pHedged, n);

  const singleSlowPct = Number((p * 100).toFixed(2));
  const compoundSlowPct = Number((compoundProb * 100).toFixed(1));
  const hedgedSlowPct = Number((hedgedCompound * 100).toFixed(2));
  const amplificationMultiplier =
    singleSlowPct > 0 ? Number((compoundSlowPct / singleSlowPct).toFixed(1)) : 1;

  return {
    singleSlowPct,
    compoundSlowPct,
    hedgedSlowPct,
    amplificationMultiplier,
  };
}

export interface QuorumResult {
  n: number;
  w: number;
  r: number;
  isStrongConsistency: boolean;
  writeFaultTolerance: number;
  readFaultTolerance: number;
  strictMajority?: number;
}

export function calculateQuorumConsistency(
  n: number,
  w: number,
  r: number
): QuorumResult {
  const safeN = Math.max(1, Number.isFinite(n) ? Math.floor(n) : 1);
  const safeW = Math.min(safeN, Math.max(1, Number.isFinite(w) ? Math.floor(w) : 1));
  const safeR = Math.min(safeN, Math.max(1, Number.isFinite(r) ? Math.floor(r) : 1));
  return {
    n: safeN,
    w: safeW,
    r: safeR,
    isStrongConsistency: safeW + safeR > safeN,
    writeFaultTolerance: safeN - safeW,
    readFaultTolerance: safeN - safeR,
    strictMajority: Math.floor(safeN / 2) + 1,
  };
}

export interface RingNode {
  name: string;
  angle: number;
  color: string;
}

export function hashKeyToDegree(key: string): number {
  const clean = (typeof key === 'string' ? key : String(key || '')) || 'default_key';
  let h = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    h ^= clean.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function routeConsistentHashKey(
  ringNodes: RingNode[],
  key: string
): { keyAngle: number; owner: RingNode; remapPercentage: number } {
  const nodes = Array.isArray(ringNodes) ? ringNodes : [];
  const sorted = [...nodes].sort((a, b) => a.angle - b.angle);
  const keyAngle = hashKeyToDegree(key || 'default_key');
  const fallbackOwner: RingNode = { name: 'unassigned', angle: 0, color: '#9ba9b8' };
  const owner = sorted.length > 0
    ? (sorted.find((n) => n.angle >= keyAngle) || sorted[0])
    : fallbackOwner;
  const remapPercentage = sorted.length > 0
    ? Number((100 / sorted.length).toFixed(1))
    : 0;
  return { keyAngle, owner, remapPercentage };
}

export function generateRingVirtualNodes(
  nodeNames: string[],
  vnodesPerNode = 3,
  palette: string[] = ['#0284c7', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6']
): RingNode[] {
  const result: RingNode[] = [];
  const safeNodes = Array.isArray(nodeNames) ? nodeNames : [];
  safeNodes.forEach((name, nodeIdx) => {
    const color = palette[nodeIdx % palette.length];
    for (let v = 0; v < vnodesPerNode; v++) {
      const vKey = `${name}#vn${v}`;
      const angle = hashKeyToDegree(vKey);
      result.push({
        name: `${name} (vn${v})`,
        angle,
        color,
      });
    }
  });
  return result.sort((a, b) => a.angle - b.angle);
}

export function calculateRingDistribution(
  ringNodes: RingNode[],
  keys: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!ringNodes || ringNodes.length === 0) return counts;
  ringNodes.forEach((n) => {
    counts[n.name] = 0;
  });
  const safeKeys = Array.isArray(keys) ? keys : [];
  safeKeys.forEach((k) => {
    const routed = routeConsistentHashKey(ringNodes, k);
    counts[routed.owner.name] = (counts[routed.owner.name] || 0) + 1;
  });
  return counts;
}

// ============================================================================
// LSM-TREE VS B+TREE STORAGE ENGINE PHYSICS
// ============================================================================

export interface LsmEngineState {
  memKeys: number;
  memCapacity: number;
  totalKeysWritten: number;
  l0Tables: string[];
  l1Tables: string[];
  lsmSequentialOps: number;
  btreeRandomIops: number;
  writeAmplificationFactor: number;
  readAmplificationFactor: number;
}

export function createInitialLsmState(memCapacity = 100): LsmEngineState {
  return {
    memKeys: 25,
    memCapacity,
    totalKeysWritten: 25,
    l0Tables: ['SST_L0_#1 (100 keys)'],
    l1Tables: [],
    lsmSequentialOps: 2,
    btreeRandomIops: 225,
    writeAmplificationFactor: 1.2,
    readAmplificationFactor: 1.1,
  };
}

export function simulateLsmWrite(
  state: LsmEngineState,
  keyCount: number,
  l0CompactionThreshold = 4
): LsmEngineState {
  const safeCount = Math.max(1, Math.round(Number.isFinite(keyCount) ? keyCount : 1));
  let nextMem = state.memKeys + safeCount;
  let nextL0 = [...state.l0Tables];
  let nextL1 = [...state.l1Tables];
  let nextLsmOps = state.lsmSequentialOps + 1;

  while (nextMem >= state.memCapacity) {
    nextMem -= state.memCapacity;
    nextL0.push(`SST_L0_#${nextL0.length + 1} (${state.memCapacity} keys)`);
    nextLsmOps += 1;
  }

  if (nextL0.length >= l0CompactionThreshold) {
    const mergedCount = nextL0.length;
    nextL0 = [];
    nextL1.push(`SST_L1_Merged_${nextL1.length + 1} (${mergedCount * state.memCapacity} keys)`);
    nextLsmOps += 2;
  }

  const nextTotalKeys = state.totalKeysWritten + safeCount;
  const nextBtreeIops = state.btreeRandomIops + Math.round(safeCount * 1.8);

  const flushes = Math.floor(nextTotalKeys / state.memCapacity);
  const waf = Number((1.0 + (flushes > 0 ? nextL1.length * 1.2 : 0)).toFixed(1));
  const raf = Number((1.0 + nextL0.length * 0.05).toFixed(2));

  return {
    ...state,
    memKeys: nextMem,
    totalKeysWritten: nextTotalKeys,
    l0Tables: nextL0,
    l1Tables: nextL1,
    lsmSequentialOps: nextLsmOps,
    btreeRandomIops: nextBtreeIops,
    writeAmplificationFactor: waf,
    readAmplificationFactor: raf,
  };
}

export function simulateLsmCompaction(state: LsmEngineState): LsmEngineState {
  if (state.l0Tables.length === 0) return state;
  const count = state.l0Tables.length;
  const nextL1 = [
    ...state.l1Tables,
    `SST_L1_Merged_${state.l1Tables.length + 1} (${count * state.memCapacity} keys)`,
  ];
  return {
    ...state,
    l0Tables: [],
    l1Tables: nextL1,
    lsmSequentialOps: state.lsmSequentialOps + 2,
    readAmplificationFactor: 1.05,
  };
}

export function calculateLsmStorageComparison(
  keysWritten: number,
  avgKeySizeBytes = 256,
  pageSizeBytes = 8192
) {
  const keys = Math.max(1, Math.round(Number.isFinite(keysWritten) ? keysWritten : 1));
  const lsmOps = Math.ceil(keys / 100) + 1;
  const btreeIops = Math.round(keys * 1.8);
  const lsmWrittenMB = Number(((keys * avgKeySizeBytes * 1.2) / 1e6).toFixed(2));
  const btreeWrittenMB = Number(((btreeIops * pageSizeBytes) / 1e6).toFixed(2));
  const writeReductionRatio =
    btreeWrittenMB > 0 ? Number((btreeWrittenMB / Math.max(0.01, lsmWrittenMB)).toFixed(1)) : 1;

  return {
    lsmOps,
    btreeIops,
    lsmWrittenMB,
    btreeWrittenMB,
    writeReductionRatio,
  };
}

// ============================================================================
// RAFT CONSENSUS & SPLIT-BRAIN FENCING PHYSICS
// ============================================================================

export interface RaftNodeState {
  id: number;
  role: 'LEADER' | 'FOLLOWER' | 'CANDIDATE';
  term: number;
  isStale: boolean;
  partitionSide: 'left' | 'right';
}

export interface RaftClusterState {
  term: number;
  isPartitioned: boolean;
  nodes: RaftNodeState[];
  activeLeaderId: number;
  fencingToken: number;
  logMessage: string;
  logStatus: 'ok' | 'err';
}

export function calculateRaftQuorum(totalNodes: number): {
  quorumSize: number;
  maxFailuresTolerated: number;
} {
  const n = Math.max(1, Number.isFinite(totalNodes) ? Math.floor(totalNodes) : 1);
  const quorumSize = Math.floor(n / 2) + 1;
  const maxFailuresTolerated = Math.floor((n - 1) / 2);
  return { quorumSize, maxFailuresTolerated };
}

export function createInitialRaftCluster(): RaftClusterState {
  const term = 1;
  return {
    term,
    isPartitioned: false,
    fencingToken: term,
    activeLeaderId: 1,
    logStatus: 'ok',
    logMessage:
      'Cluster healthy. Node 01 is Leader in Term 1 (Fencing Token = 1) with 5/5 nodes reachable.',
    nodes: [
      { id: 1, role: 'LEADER', term, isStale: false, partitionSide: 'left' },
      { id: 2, role: 'FOLLOWER', term, isStale: false, partitionSide: 'left' },
      { id: 3, role: 'FOLLOWER', term, isStale: false, partitionSide: 'right' },
      { id: 4, role: 'FOLLOWER', term, isStale: false, partitionSide: 'right' },
      { id: 5, role: 'FOLLOWER', term, isStale: false, partitionSide: 'right' },
    ],
  };
}

export function partitionRaftCluster(state: RaftClusterState): RaftClusterState {
  if (state.isPartitioned) return state;
  const nextTerm = state.term + 1;
  return {
    term: nextTerm,
    isPartitioned: true,
    fencingToken: nextTerm,
    activeLeaderId: 3,
    logStatus: 'err',
    logMessage: `Network Partition Severed (2 vs 3). Nodes [03, 04, 05] formed a 3/5 quorum and elected Node 03 as Leader in Term ${nextTerm} (Fencing Token = ${nextTerm}). Node 01 is isolated in a 2/5 minority.`,
    nodes: state.nodes.map((node) => {
      if (node.id === 1) return { ...node, role: 'LEADER', term: state.term, isStale: true };
      if (node.id === 3) return { ...node, role: 'LEADER', term: nextTerm, isStale: false };
      return { ...node, term: node.partitionSide === 'right' ? nextTerm : node.term };
    }),
  };
}

export function healRaftCluster(state: RaftClusterState): RaftClusterState {
  if (!state.isPartitioned) return state;
  return {
    term: state.term,
    isPartitioned: false,
    fencingToken: state.term,
    activeLeaderId: 3,
    logStatus: 'ok',
    logMessage: `Partition Healed. Node 01 observed higher Term ${state.term}, stepped down to Follower, and synced log from Majority Leader Node 03.`,
    nodes: state.nodes.map((node) => ({
      ...node,
      role: node.id === 3 ? 'LEADER' : 'FOLLOWER',
      term: state.term,
      isStale: false,
    })),
  };
}

export function simulateRaftWrite(
  state: RaftClusterState,
  targetLeaderId: number
): { success: boolean; state: RaftClusterState; message: string } {
  if (state.isPartitioned) {
    if (targetLeaderId === 1) {
      const message = `WRITE REJECTED ON NODE 01: Node 01 (Stale Term ${state.nodes[0].term}) only reaches 2/5 nodes (Quorum requires 3). Furthermore, Storage rejects Fencing Token ${state.nodes[0].term} < Active Token ${state.fencingToken}! Split-Brain prevented.`;
      return {
        success: false,
        message,
        state: { ...state, logStatus: 'err', logMessage: message },
      };
    } else {
      const message = `WRITE COMMITTED ON NODE 03: Majority partition [03, 04, 05] achieved 3/5 Quorum in Term ${state.term} (Fencing Token = ${state.fencingToken}).`;
      return {
        success: true,
        message,
        state: { ...state, logStatus: 'ok', logMessage: message },
      };
    }
  } else {
    const message = `WRITE COMMITTED: Cluster is unified under Term ${state.term}; replicated across all 5 nodes (Fencing Token = ${state.fencingToken}).`;
    return {
      success: true,
      message,
      state: { ...state, logStatus: 'ok', logMessage: message },
    };
  }
}

// ============================================================================
// DISTRIBUTED TRANSACTIONS: TWO-PHASE COMMIT & SAGAS
// ============================================================================

export type TwoPhaseState =
  | 'IDLE'
  | 'PREPARING'
  | 'PREPARED'
  | 'COMMITTING'
  | 'COMMITTED'
  | 'ABORTING'
  | 'ABORTED'
  | 'BLOCKED';

export type SagaStepState =
  | 'PENDING'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'COMPENSATING'
  | 'COMPENSATED';

export interface TwoPhaseParticipant {
  name: string;
  state: TwoPhaseState;
  vote: 'YES' | 'NO' | null;
  locksHeld: boolean;
}

export interface SimLogEntry {
  id?: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp?: number;
}

export interface TwoPhaseSimState {
  phase:
    | 'idle'
    | 'phase1'
    | 'phase1-complete'
    | 'phase2'
    | 'committed'
    | 'aborted'
    | 'coordinator-down'
    | 'recovered';
  coordinator: 'ALIVE' | 'CRASHED' | 'RECOVERING';
  participants: TwoPhaseParticipant[];
  log: SimLogEntry[];
}

export interface SagaStep {
  name: string;
  state: SagaStepState;
  compensationName: string;
}

export interface SagaSimState {
  steps: SagaStep[];
  direction: 'forward' | 'compensating' | 'idle' | 'done' | 'compensated';
  log: SimLogEntry[];
}

export function createInitial2PCState(): TwoPhaseSimState {
  return {
    phase: 'idle',
    coordinator: 'ALIVE',
    participants: [
      { name: 'Order Service', state: 'IDLE', vote: null, locksHeld: false },
      { name: 'Payment Service', state: 'IDLE', vote: null, locksHeld: false },
      { name: 'Inventory Service', state: 'IDLE', vote: null, locksHeld: false },
    ],
    log: [
      {
        id: 'init-2pc',
        text: 'Coordinator online. Waiting for distributed transaction request.',
        type: 'info',
        timestamp: Date.now(),
      },
    ],
  };
}

export function createInitialSagaState(): SagaSimState {
  return {
    steps: [
      {
        name: 'Order Service',
        state: 'PENDING',
        compensationName: 'Cancel Order',
      },
      {
        name: 'Payment Service',
        state: 'PENDING',
        compensationName: 'Refund Payment',
      },
      {
        name: 'Inventory Service',
        state: 'PENDING',
        compensationName: 'Restock Inventory',
      },
    ],
    direction: 'idle',
    log: [
      {
        id: 'init-saga',
        text: 'Saga orchestrator idle. Awaiting transaction trigger.',
        type: 'info',
        timestamp: Date.now(),
      },
    ],
  };
}

export function execute2PCStep(
  state: TwoPhaseSimState,
  action: 'prepare' | 'commit' | 'abort' | 'crash' | 'recover'
): TwoPhaseSimState {
  const ts = Date.now();
  switch (action) {
    case 'prepare':
      return {
        ...state,
        phase: 'phase1',
        coordinator: 'ALIVE',
        participants: state.participants.map((p) => ({
          ...p,
          state: 'PREPARED',
          vote: 'YES',
          locksHeld: true,
        })),
        log: [
          {
            id: `prepare-${ts}`,
            text: 'Phase 1: All participants voted YES and hold exclusive database locks.',
            type: 'info',
            timestamp: ts,
          },
          ...state.log,
        ],
      };
    case 'commit':
      return {
        ...state,
        phase: 'committed',
        coordinator: 'ALIVE',
        participants: state.participants.map((p) => ({
          ...p,
          state: 'COMMITTED',
          locksHeld: false,
        })),
        log: [
          {
            id: `commit-${ts}`,
            text: 'Phase 2: Coordinator committed transaction. All locks released.',
            type: 'success',
            timestamp: ts,
          },
          ...state.log,
        ],
      };
    case 'abort':
      return {
        ...state,
        phase: 'aborted',
        coordinator: 'ALIVE',
        participants: state.participants.map((p) => ({
          ...p,
          state: 'ABORTED',
          locksHeld: false,
        })),
        log: [
          {
            id: `abort-${ts}`,
            text: 'Phase 2: Transaction aborted. All writes rolled back and locks released.',
            type: 'error',
            timestamp: ts,
          },
          ...state.log,
        ],
      };
    case 'crash':
      return {
        ...state,
        phase: 'coordinator-down',
        coordinator: 'CRASHED',
        participants: state.participants.map((p) => ({
          ...p,
          state: 'BLOCKED',
          locksHeld: true,
        })),
        log: [
          {
            id: `crash-${ts}`,
            text: 'CRITICAL: Coordinator crashed! Participants blocked holding locks.',
            type: 'warning',
            timestamp: ts,
          },
          ...state.log,
        ],
      };
    case 'recover':
      return {
        ...state,
        phase: 'committed',
        coordinator: 'ALIVE',
        participants: state.participants.map((p) => ({
          ...p,
          state: 'COMMITTED',
          locksHeld: false,
        })),
        log: [
          {
            id: `recover-${ts}`,
            text: 'Recovery complete: WAL replayed and locks released.',
            type: 'success',
            timestamp: ts,
          },
          ...state.log,
        ],
      };
    default:
      return state;
  }
}
