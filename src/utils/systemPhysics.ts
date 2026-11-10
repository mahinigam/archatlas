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
  const dau = Math.max(0.1, dauMillions) * 1_000_000;
  const secondsPerDay = 86_400;
  const readQps = Math.round((dau * readsPerUser) / secondsPerDay);
  const writeQps = Math.round((dau * writesPerUser) / secondsPerDay);
  const peakQps = (readQps + writeQps) * 3;

  const dailyBytes = dau * writesPerUser * payloadKB * 1024;
  const dailyStorageTB = dailyBytes / 1e12;
  const yearlyStorageTB = dailyStorageTB * 365;

  const yearlyStorageFormatted =
    yearlyStorageTB >= 1000
      ? `${(yearlyStorageTB / 1000).toFixed(2)} PB/yr`
      : `${yearlyStorageTB.toFixed(1)} TB/yr`;

  const ingressBandwidthMBps = Number(((writeQps * payloadKB) / 1024).toFixed(2));
  const egressBandwidthMBps = Number(((readQps * payloadKB) / 1024).toFixed(2));

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
  const cacheHit = Math.min(0.99, Math.max(0, cacheHitPct / 100));
  const readRatio = Math.min(0.99, Math.max(0.01, readRatioPct / 100));

  const hasActiveCache = rawNodes.some(
    (n) => (n.type === 'cache' || n.type === 'cdn') && !n.down
  );

  const qpsMap = new Map<string, number>();
  rawNodes.forEach((n) => {
    qpsMap.set(n.id, n.type === 'client' && !n.down ? ingressQps : 0);
  });

  // Propagate QPS across DAG hops
  for (let hop = 0; hop < 5; hop++) {
    const nextMap = new Map<string, number>();
    rawNodes.forEach((n) => {
      if (n.type === 'client') {
        nextMap.set(n.id, n.down ? 0 : ingressQps);
      } else {
        nextMap.set(n.id, 0);
      }
    });

    edges.forEach((e) => {
      const src = rawNodes.find((n) => n.id === e.from);
      const dst = rawNodes.find((n) => n.id === e.to);
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

  const simulatedNodes: SimulatedNode[] = rawNodes.map((n) => {
    const spec = COMPONENT_CATALOG[n.type];
    const inQps = qpsMap.get(n.id) || 0;
    const totalCap = spec.capacityPerNode * Math.max(1, n.replicas);
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

      const nodeAvailability = 1 - Math.pow(1 - spec.sla, Math.max(1, n.replicas));
      compositeSla *= nodeAvailability;
    }

    const concurrencyConnections = Math.round(inQps * (effectiveLatencyMs / 1000));

    let status: SimulatedNode['status'] = 'NOMINAL';
    if (n.down) status = 'OFFLINE';
    else if (utilizationPct > 100) status = 'OVERLOADED';
    else if (utilizationPct > 75) status = 'ELEVATED';

    return {
      ...n,
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
    findings.push({
      id: `overload-${o.id}`,
      severity: 'CRITICAL',
      title: `Bottleneck Meltdown on ${o.label} (${o.utilizationPct}% Load)`,
      detail: `Receiving ${o.inQps.toLocaleString()} QPS against ${(COMPONENT_CATALOG[o.type].capacityPerNode * o.replicas).toLocaleString()} QPS capacity. Scale out replicas (+1) or introduce a caching/queueing tier.`,
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
}

export function calculateBloomFilterMath(
  expectedItemsMillions: number,
  falsePositiveRate: number
): BloomFilterMathResult {
  const n = Math.max(1, expectedItemsMillions) * 1_000_000;
  const p = Math.min(0.5, Math.max(0.0001, falsePositiveRate));
  const ln2 = Math.log(2);
  const bitsPerElement = Number((-Math.log(p) / (ln2 * ln2)).toFixed(1));
  const optimalHashCount = Math.max(1, Math.round(bitsPerElement * ln2));
  const totalBits = n * bitsPerElement;
  const totalMegabytes = Number((totalBits / 8 / 1e6).toFixed(1));

  return {
    bitsPerElement,
    optimalHashCount,
    totalMegabytes,
  };
}

export function computeBloomHashes(
  key: string,
  bitArraySize = 32
): [number, number, number] {
  const clean = key.trim() || 'default';
  let h1 = 0;
  let h2 = 5381;
  let h3 = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    h1 = (h1 * 31 + code) % bitArraySize;
    h2 = (h2 * 33 + code) % bitArraySize;
    h3 = Math.abs(Math.imul(h3 ^ code, 16777619)) % bitArraySize;
  }
  return [h1, h2, h3];
}

export interface TailLatencyResult {
  singleSlowPct: number;
  compoundSlowPct: number;
  hedgedSlowPct: number;
}

export function calculateTailLatencyAmplification(
  fanOutCount: number,
  singleNodeSlowProbability: number
): TailLatencyResult {
  const n = Math.max(1, fanOutCount);
  const p = Math.min(0.99, Math.max(0.0001, singleNodeSlowProbability));
  const compoundProb = 1 - Math.pow(1 - p, n);
  const pHedged = p * p; // Duplicate request sent to replica after P95 threshold
  const hedgedCompound = 1 - Math.pow(1 - pHedged, n);

  return {
    singleSlowPct: Number((p * 100).toFixed(2)),
    compoundSlowPct: Number((compoundProb * 100).toFixed(1)),
    hedgedSlowPct: Number((hedgedCompound * 100).toFixed(2)),
  };
}

export interface QuorumResult {
  n: number;
  w: number;
  r: number;
  isStrongConsistency: boolean;
  writeFaultTolerance: number;
  readFaultTolerance: number;
}

export function calculateQuorumConsistency(
  n: number,
  w: number,
  r: number
): QuorumResult {
  const safeN = Math.max(1, n);
  const safeW = Math.min(safeN, Math.max(1, w));
  const safeR = Math.min(safeN, Math.max(1, r));
  return {
    n: safeN,
    w: safeW,
    r: safeR,
    isStrongConsistency: safeW + safeR > safeN,
    writeFaultTolerance: safeN - safeW,
    readFaultTolerance: safeN - safeR,
  };
}

export interface RingNode {
  name: string;
  angle: number;
  color: string;
}

export function hashKeyToDegree(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

export function routeConsistentHashKey(
  ringNodes: RingNode[],
  key: string
): { keyAngle: number; owner: RingNode; remapPercentage: number } {
  const sorted = [...ringNodes].sort((a, b) => a.angle - b.angle);
  const keyAngle = hashKeyToDegree(key || 'default_key');
  const owner = sorted.find((n) => n.angle >= keyAngle) || sorted[0];
  const remapPercentage = Number((100 / Math.max(1, sorted.length)).toFixed(1));
  return { keyAngle, owner, remapPercentage };
}

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
  log: { text: string; type: 'info' | 'success' | 'error' | 'warning' }[];
}

export interface SagaStep {
  name: string;
  state: SagaStepState;
  compensationName: string;
}

export interface SagaSimState {
  steps: SagaStep[];
  direction: 'forward' | 'compensating' | 'idle' | 'done' | 'compensated';
  log: { text: string; type: 'info' | 'success' | 'error' | 'warning' }[];
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
        text: 'Coordinator online. Waiting for distributed transaction request.',
        type: 'info',
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
        text: 'Saga orchestrator idle. Awaiting transaction trigger.',
        type: 'info',
      },
    ],
  };
}

