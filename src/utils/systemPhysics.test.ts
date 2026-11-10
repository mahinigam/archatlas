import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCapacityEstimates,
  simulateWhiteboardTopology,
  calculateBloomFilterMath,
  computeBloomHashes,
  calculateTailLatencyAmplification,
  calculateQuorumConsistency,
  routeConsistentHashKey,
  createInitial2PCState,
  createInitialSagaState,
} from './systemPhysics.ts';

test('calculateCapacityEstimates computes accurate QPS and yearly storage', () => {
  const res = calculateCapacityEstimates(50, 40, 5, 25);
  assert.equal(res.readQps, 23148);
  assert.equal(res.writeQps, 2894);
  assert.equal(res.peakQps, (23148 + 2894) * 3);
  assert.equal(res.yearlyStorageFormatted, '2.34 PB/yr');
});

test('simulateWhiteboardTopology flags overloaded SQL node and resolves when cached and scaled', () => {
  const naiveNodes = [
    { id: 'n1', type: 'client' as const, label: 'Clients', x: 0, y: 0, replicas: 1, down: false },
    { id: 'n2', type: 'app' as const, label: 'App Server', x: 100, y: 0, replicas: 1, down: false },
    { id: 'n3', type: 'sql' as const, label: 'Postgres Primary', x: 200, y: 0, replicas: 1, down: false },
  ];
  const naiveEdges = [
    { from: 'n1', to: 'n2' },
    { from: 'n2', to: 'n3' },
  ];

  const melted = simulateWhiteboardTopology(naiveNodes, naiveEdges, 45000, 0, 80);
  assert.equal(melted.overallStatus, 'OVERLOADED');
  assert.equal(melted.maxUtilizationPct > 100, true);
  assert.equal(melted.findings.some((f) => f.severity === 'CRITICAL'), true);

  // Add Redis cache and scale out replicas
  const scaledNodes = [
    { id: 'n1', type: 'client' as const, label: 'Clients', x: 0, y: 0, replicas: 1, down: false },
    { id: 'n2', type: 'app' as const, label: 'App Server', x: 100, y: 0, replicas: 3, down: false },
    { id: 'n4', type: 'cache' as const, label: 'Redis Cache', x: 200, y: 0, replicas: 2, down: false },
    { id: 'n3', type: 'sql' as const, label: 'Postgres Primary', x: 200, y: 100, replicas: 2, down: false },
  ];
  const scaledEdges = [
    { from: 'n1', to: 'n2' },
    { from: 'n2', to: 'n4' },
    { from: 'n2', to: 'n3' },
  ];

  const healthy = simulateWhiteboardTopology(scaledNodes, scaledEdges, 45000, 90, 85);
  assert.equal(healthy.overallStatus, 'NOMINAL');
  assert.equal(healthy.findings[0].severity, 'NOMINAL');
});

test('calculateBloomFilterMath derives 9.6 bits per element for 1% false positive rate', () => {
  const bf = calculateBloomFilterMath(100, 0.01);
  assert.equal(bf.bitsPerElement, 9.6);
  assert.equal(bf.optimalHashCount, 7);
  assert.equal(bf.totalMegabytes, 120);

  const hashes = computeBloomHashes('user:9912', 32);
  assert.equal(hashes.length, 3);
  assert.equal(hashes.every((h) => h >= 0 && h < 32), true);
});

test('calculateTailLatencyAmplification shows compound slow rate vs hedged requests', () => {
  const tail = calculateTailLatencyAmplification(50, 0.01);
  assert.equal(tail.singleSlowPct, 1);
  assert.equal(tail.compoundSlowPct, 39.5);
  assert.equal(tail.hedgedSlowPct < 1, true);
});

test('calculateQuorumConsistency checks strict W + R > N overlap', () => {
  const strong = calculateQuorumConsistency(3, 2, 2);
  assert.equal(strong.isStrongConsistency, true);
  assert.equal(strong.writeFaultTolerance, 1);

  const eventual = calculateQuorumConsistency(3, 1, 1);
  assert.equal(eventual.isStrongConsistency, false);
});

test('routeConsistentHashKey maps keys deterministically clockwise on the ring', () => {
  const nodes = [
    { name: 'Shard-A', angle: 45, color: '#0284c7' },
    { name: 'Shard-B', angle: 165, color: '#10b981' },
    { name: 'Shard-C', angle: 285, color: '#ec4899' },
  ];
  const routed = routeConsistentHashKey(nodes, 'user_id:84920');
  assert.equal(routed.remapPercentage, 33.3);
  assert.equal(typeof routed.owner.name, 'string');
});

test('createInitial2PCState initializes coordinator and participants with no locks held', () => {
  const state = createInitial2PCState();
  assert.equal(state.phase, 'idle');
  assert.equal(state.coordinator, 'ALIVE');
  assert.equal(state.participants.length, 3);
  assert.equal(state.participants.every((p) => p.state === 'IDLE' && !p.locksHeld && p.vote === null), true);
  assert.equal(state.log.length > 0, true);
});

test('createInitialSagaState initializes forward steps with proper compensating actions', () => {
  const state = createInitialSagaState();
  assert.equal(state.direction, 'idle');
  assert.equal(state.steps.length, 3);
  assert.equal(state.steps[0].compensationName, 'Cancel Order');
  assert.equal(state.steps[1].compensationName, 'Refund Payment');
  assert.equal(state.steps[2].compensationName, 'Restock Inventory');
  assert.equal(state.steps.every((s) => s.state === 'PENDING'), true);
});
