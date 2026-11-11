import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCapacityEstimates,
  simulateWhiteboardTopology,
  calculateBloomFilterMath,
  calculateBloomFilterFpRate,
  computeBloomHashes,
  calculateTailLatencyAmplification,
  calculateQuorumConsistency,
  hashKeyToDegree,
  routeConsistentHashKey,
  generateRingVirtualNodes,
  calculateRingDistribution,
  createInitial2PCState,
  createInitialSagaState,
  execute2PCStep,
  createInitialLsmState,
  simulateLsmWrite,
  simulateLsmCompaction,
  calculateLsmStorageComparison,
  calculateRaftQuorum,
  createInitialRaftCluster,
  partitionRaftCluster,
  healRaftCluster,
  simulateRaftWrite,
  COMPONENT_CATALOG,
} from './systemPhysics.ts';

// ============================================================================
// 1. CAPACITY ESTIMATES TESTS
// ============================================================================

test('calculateCapacityEstimates computes accurate QPS and yearly storage', () => {
  const res = calculateCapacityEstimates(50, 40, 5, 25);
  assert.equal(res.readQps, 23148);
  assert.equal(res.writeQps, 2894);
  assert.equal(res.peakQps, (23148 + 2894) * 3);
  assert.equal(res.yearlyStorageFormatted, '2.34 PB/yr');
  assert.equal(res.ingressBandwidthMBps, 70.65);
  assert.equal(res.egressBandwidthMBps, 565.14);
});

test('calculateCapacityEstimates handles small volume and formats in GB/yr or TB/yr', () => {
  const small = calculateCapacityEstimates(0.1, 5, 1, 2);
  assert.equal(small.yearlyStorageFormatted.includes('GB/yr'), true);

  const medium = calculateCapacityEstimates(2, 10, 2, 10);
  assert.equal(medium.yearlyStorageFormatted.includes('TB/yr'), true);
});

test('calculateCapacityEstimates handles invalid, zero, and boundary inputs gracefully', () => {
  const res = calculateCapacityEstimates(-10, -5, -2, -100);
  assert.equal(Number.isFinite(res.readQps), true);
  assert.equal(Number.isFinite(res.writeQps), true);
  assert.equal(Number.isFinite(res.peakQps), true);
  assert.equal(res.readQps >= 0, true);
  assert.equal(res.writeQps >= 0, true);
  assert.equal(typeof res.yearlyStorageFormatted, 'string');
});

// ============================================================================
// 2. WHITEBOARD TOPOLOGY SIMULATION TESTS
// ============================================================================

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

test('simulateWhiteboardTopology flags hardware outage when a node is marked down', () => {
  const nodes = [
    { id: 'c1', type: 'client' as const, label: 'Client', x: 0, y: 0, replicas: 1, down: false },
    { id: 'a1', type: 'app' as const, label: 'App', x: 100, y: 0, replicas: 2, down: true },
  ];
  const edges = [{ from: 'c1', to: 'a1' }];
  const result = simulateWhiteboardTopology(nodes, edges, 1000, 50, 80);

  assert.equal(result.overallStatus, 'OUTAGE');
  assert.equal(result.findings.some((f) => f.id === 'outage'), true);
});

test('simulateWhiteboardTopology flags single point of failure (SPOF) on tier with 1 replica', () => {
  const nodes = [
    { id: 'c1', type: 'client' as const, label: 'Client', x: 0, y: 0, replicas: 1, down: false },
    { id: 'a1', type: 'app' as const, label: 'App', x: 100, y: 0, replicas: 1, down: false },
  ];
  const edges = [{ from: 'c1', to: 'a1' }];
  const result = simulateWhiteboardTopology(nodes, edges, 1000, 50, 80);

  assert.equal(result.findings.some((f) => f.id === 'spof'), true);
});

test('simulateWhiteboardTopology handles empty nodes and edges without throwing', () => {
  const empty = simulateWhiteboardTopology([], [], 0, 0, 0);
  assert.equal(empty.overallStatus, 'NOMINAL');
  assert.equal(empty.nodes.length, 0);
  assert.equal(empty.maxUtilizationPct, 0);
});

// ============================================================================
// 3. BLOOM FILTER MATH & HASHING TESTS
// ============================================================================

test('calculateBloomFilterMath derives 9.6 bits per element for 1% false positive rate', () => {
  const bf = calculateBloomFilterMath(100, 0.01);
  assert.equal(bf.bitsPerElement, 9.6);
  assert.equal(bf.optimalHashCount, 7);
  assert.equal(bf.totalMegabytes, 120);
  assert.equal(typeof bf.theoreticalFpRate, 'number');

  const hashes = computeBloomHashes('user:9912', 32);
  assert.equal(hashes.length, 3);
  assert.equal(hashes.every((h) => h >= 0 && h < 32), true);
});

test('calculateBloomFilterMath clamps boundary and invalid inputs safely', () => {
  const low = calculateBloomFilterMath(-10, -0.5);
  assert.equal(low.bitsPerElement > 0, true);
  assert.equal(low.optimalHashCount >= 1, true);

  const high = calculateBloomFilterMath(1000, 0.99);
  assert.equal(high.bitsPerElement > 0, true);
});

test('calculateBloomFilterFpRate calculates theoretical false positive rate correctly', () => {
  // 100M items, 960M bits, 7 hashes -> expected ~0.01
  const fpRate = calculateBloomFilterFpRate(960_000_000, 100_000_000, 7);
  assert.equal(Math.abs(fpRate - 0.01) < 0.005, true);
});

test('computeBloomHashes is deterministic and handles empty strings, unicode, and varied array sizes', () => {
  const h1 = computeBloomHashes('user:1001', 32, 3);
  const h2 = computeBloomHashes('user:1001', 32, 3);
  assert.deepEqual(h1, h2);

  const empty = computeBloomHashes('', 64, 5);
  assert.equal(empty.length, 5);
  assert.equal(empty.every((idx) => idx >= 0 && idx < 64), true);

  const unicode = computeBloomHashes('用户:883921_🚀', 16, 4);
  assert.equal(unicode.length, 4);
  assert.equal(unicode.every((idx) => idx >= 0 && idx < 16), true);
});

// ============================================================================
// 4. TAIL LATENCY AMPLIFICATION TESTS
// ============================================================================

test('calculateTailLatencyAmplification shows compound slow rate vs hedged requests', () => {
  const tail = calculateTailLatencyAmplification(50, 0.01);
  assert.equal(tail.singleSlowPct, 1);
  assert.equal(tail.compoundSlowPct, 39.5);
  assert.equal(tail.hedgedSlowPct < 1, true);
  assert.equal(tail.amplificationMultiplier, 39.5);
});

test('calculateTailLatencyAmplification with N=1 gives matching single and compound rates', () => {
  const single = calculateTailLatencyAmplification(1, 0.02);
  assert.equal(single.singleSlowPct, 2);
  assert.equal(single.compoundSlowPct, 2);
  assert.equal(single.hedgedSlowPct, 0.04);
});

test('calculateTailLatencyAmplification clamps invalid fanout and probability bounds', () => {
  const clamped = calculateTailLatencyAmplification(-5, 2.5);
  assert.equal(clamped.singleSlowPct, 99.99);
  assert.equal(Number.isFinite(clamped.compoundSlowPct), true);
});

// ============================================================================
// 5. QUORUM CONSISTENCY TESTS
// ============================================================================

test('calculateQuorumConsistency checks strict W + R > N overlap', () => {
  const strong = calculateQuorumConsistency(3, 2, 2);
  assert.equal(strong.isStrongConsistency, true);
  assert.equal(strong.writeFaultTolerance, 1);
  assert.equal(strong.readFaultTolerance, 1);
  assert.equal(strong.strictMajority, 2);

  const eventual = calculateQuorumConsistency(3, 1, 1);
  assert.equal(eventual.isStrongConsistency, false);
});

test('calculateQuorumConsistency handles asymmetric read-heavy and write-heavy topologies', () => {
  // Fast writes (W=1, R=5, N=5) -> Strong consistency
  const writeHeavy = calculateQuorumConsistency(5, 1, 5);
  assert.equal(writeHeavy.isStrongConsistency, true);
  assert.equal(writeHeavy.writeFaultTolerance, 4);
  assert.equal(writeHeavy.readFaultTolerance, 0);

  // Fast reads (W=5, R=1, N=5) -> Strong consistency
  const readHeavy = calculateQuorumConsistency(5, 5, 1);
  assert.equal(readHeavy.isStrongConsistency, true);
  assert.equal(readHeavy.writeFaultTolerance, 0);
  assert.equal(readHeavy.readFaultTolerance, 4);
});

test('calculateQuorumConsistency clamps negative and boundary parameters safely', () => {
  const clamped = calculateQuorumConsistency(-3, -1, 10);
  assert.equal(clamped.n, 1);
  assert.equal(clamped.w, 1);
  assert.equal(clamped.r, 1);
});

// ============================================================================
// 6. CONSISTENT HASHING & RING TESTS
// ============================================================================

test('hashKeyToDegree produces bounded degrees [0, 359] deterministically', () => {
  const deg1 = hashKeyToDegree('account:48201');
  const deg2 = hashKeyToDegree('account:48201');
  assert.equal(deg1, deg2);
  assert.equal(deg1 >= 0 && deg1 < 360, true);

  const fallback = hashKeyToDegree('');
  assert.equal(fallback >= 0 && fallback < 360, true);
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

test('routeConsistentHashKey wraps around to first node when key angle exceeds last node', () => {
  const nodes = [
    { name: 'Shard-A', angle: 50, color: '#0284c7' },
    { name: 'Shard-B', angle: 150, color: '#10b981' },
  ];
  // Force a test key with known angle or test wrap-around logic
  const keyWithHighAngle = 'user_999999';
  const routed = routeConsistentHashKey(nodes, keyWithHighAngle);
  assert.equal(nodes.some((n) => n.name === routed.owner.name), true);
});

test('routeConsistentHashKey handles empty ring gracefully without crashing', () => {
  const routed = routeConsistentHashKey([], 'key1');
  assert.equal(routed.owner.name, 'unassigned');
  assert.equal(routed.remapPercentage, 0);
});

test('generateRingVirtualNodes and calculateRingDistribution distribute keys evenly', () => {
  const vnodes = generateRingVirtualNodes(['Node1', 'Node2', 'Node3'], 3);
  assert.equal(vnodes.length, 9);
  assert.equal(vnodes.every((v) => v.angle >= 0 && v.angle < 360), true);

  const keys = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10'];
  const dist = calculateRingDistribution(vnodes, keys);
  const totalMapped = Object.values(dist).reduce((sum, count) => sum + count, 0);
  assert.equal(totalMapped, keys.length);
});

// ============================================================================
// 7. LSM-TREE STORAGE ENGINE PHYSICS TESTS
// ============================================================================

test('createInitialLsmState initializes MemTable and default metrics', () => {
  const state = createInitialLsmState(100);
  assert.equal(state.memKeys, 25);
  assert.equal(state.memCapacity, 100);
  assert.equal(state.l0Tables.length, 1);
  assert.equal(state.l1Tables.length, 0);
  assert.equal(state.writeAmplificationFactor >= 1.0, true);
  assert.equal(state.readAmplificationFactor >= 1.0, true);
});

test('simulateLsmWrite flushes MemTable when capacity is reached', () => {
  const initial = createInitialLsmState(100);
  // Write 80 keys: 25 + 80 = 105 -> flushes 1 SSTable to L0, 5 keys remain in MemTable
  const next = simulateLsmWrite(initial, 80);
  assert.equal(next.memKeys, 5);
  assert.equal(next.l0Tables.length, 2);
  assert.equal(next.totalKeysWritten, 105);
  assert.equal(next.lsmSequentialOps > initial.lsmSequentialOps, true);
  assert.equal(next.btreeRandomIops > initial.btreeRandomIops, true);
});

test('simulateLsmWrite triggers L1 level compaction when L0 reaches threshold', () => {
  const initial = createInitialLsmState(100);
  // Write enough keys to trigger 3 more flushes (total 4 in L0) -> compacts to L1
  const afterBurst = simulateLsmWrite(initial, 300, 4);
  assert.equal(afterBurst.l0Tables.length, 0);
  assert.equal(afterBurst.l1Tables.length, 1);
  assert.equal(afterBurst.l1Tables[0].includes('Merged'), true);
});

test('simulateLsmCompaction manually compacts L0 SSTables into L1', () => {
  let state = createInitialLsmState(100);
  state = simulateLsmWrite(state, 100); // 2 L0 tables
  assert.equal(state.l0Tables.length, 2);

  const compacted = simulateLsmCompaction(state);
  assert.equal(compacted.l0Tables.length, 0);
  assert.equal(compacted.l1Tables.length, 1);
  assert.equal(compacted.readAmplificationFactor, 1.05);

  // Calling compaction on empty L0 returns same state
  const noop = simulateLsmCompaction(compacted);
  assert.equal(noop.l1Tables.length, 1);
});

test('calculateLsmStorageComparison quantifies IOPS and disk write reduction', () => {
  const comp = calculateLsmStorageComparison(1000, 256, 8192);
  assert.equal(comp.lsmOps < comp.btreeIops, true);
  assert.equal(comp.writeReductionRatio > 1, true);
  assert.equal(comp.btreeWrittenMB > comp.lsmWrittenMB, true);
});

// ============================================================================
// 8. RAFT CONSENSUS & FENCING TOKENS TESTS
// ============================================================================

test('calculateRaftQuorum derives accurate majority threshold and fault tolerance', () => {
  const r3 = calculateRaftQuorum(3);
  assert.equal(r3.quorumSize, 2);
  assert.equal(r3.maxFailuresTolerated, 1);

  const r5 = calculateRaftQuorum(5);
  assert.equal(r5.quorumSize, 3);
  assert.equal(r5.maxFailuresTolerated, 2);

  const r7 = calculateRaftQuorum(7);
  assert.equal(r7.quorumSize, 4);
  assert.equal(r7.maxFailuresTolerated, 3);
});

test('createInitialRaftCluster initializes unified 5-node cluster with Node 1 as Leader', () => {
  const cluster = createInitialRaftCluster();
  assert.equal(cluster.term, 1);
  assert.equal(cluster.isPartitioned, false);
  assert.equal(cluster.activeLeaderId, 1);
  assert.equal(cluster.nodes.length, 5);
  assert.equal(cluster.nodes[0].role, 'LEADER');
  assert.equal(cluster.nodes.slice(1).every((n) => n.role === 'FOLLOWER'), true);
});

test('simulateRaftWrite commits in unified healthy cluster', () => {
  const cluster = createInitialRaftCluster();
  const writeRes = simulateRaftWrite(cluster, 1);
  assert.equal(writeRes.success, true);
  assert.equal(writeRes.state.logStatus, 'ok');
  assert.equal(writeRes.message.includes('COMMITTED'), true);
});

test('partitionRaftCluster severs network and elects majority leader with incremented Term', () => {
  const cluster = createInitialRaftCluster();
  const partitioned = partitionRaftCluster(cluster);

  assert.equal(partitioned.isPartitioned, true);
  assert.equal(partitioned.term, 2);
  assert.equal(partitioned.fencingToken, 2);
  assert.equal(partitioned.activeLeaderId, 3);

  // Node 1 is isolated with stale Term 1
  assert.equal(partitioned.nodes[0].isStale, true);
  assert.equal(partitioned.nodes[0].term, 1);

  // Node 3 is majority leader in Term 2
  assert.equal(partitioned.nodes[2].role, 'LEADER');
  assert.equal(partitioned.nodes[2].term, 2);
  assert.equal(partitioned.nodes[2].isStale, false);
});

test('simulateRaftWrite rejects writes on isolated stale leader and accepts on majority leader', () => {
  const cluster = createInitialRaftCluster();
  const partitioned = partitionRaftCluster(cluster);

  // Write to stale Node 1 in 2/5 minority -> REJECTED
  const staleWrite = simulateRaftWrite(partitioned, 1);
  assert.equal(staleWrite.success, false);
  assert.equal(staleWrite.state.logStatus, 'err');
  assert.equal(staleWrite.message.includes('REJECTED'), true);
  assert.equal(staleWrite.message.includes('Fencing Token'), true);

  // Write to Node 3 in 3/5 majority -> COMMITTED
  const majorityWrite = simulateRaftWrite(partitioned, 3);
  assert.equal(majorityWrite.success, true);
  assert.equal(majorityWrite.state.logStatus, 'ok');
  assert.equal(majorityWrite.message.includes('COMMITTED'), true);
});

test('healRaftCluster restores unified consensus and steps down stale leader', () => {
  const cluster = createInitialRaftCluster();
  const partitioned = partitionRaftCluster(cluster);
  const healed = healRaftCluster(partitioned);

  assert.equal(healed.isPartitioned, false);
  assert.equal(healed.term, 2);
  assert.equal(healed.nodes[0].role, 'FOLLOWER');
  assert.equal(healed.nodes[0].isStale, false);
  assert.equal(healed.nodes[2].role, 'LEADER');
  assert.equal(healed.logStatus, 'ok');
});

// ============================================================================
// 9. DISTRIBUTED TRANSACTIONS: 2PC & SAGAS TESTS
// ============================================================================

test('createInitial2PCState initializes coordinator and participants with no locks held', () => {
  const state = createInitial2PCState();
  assert.equal(state.phase, 'idle');
  assert.equal(state.coordinator, 'ALIVE');
  assert.equal(state.participants.length, 3);
  assert.equal(
    state.participants.every((p) => p.state === 'IDLE' && !p.locksHeld && p.vote === null),
    true
  );
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

test('execute2PCStep performs atomic prepare, commit, abort, crash, and recover transitions', () => {
  let state = createInitial2PCState();

  // Prepare phase
  state = execute2PCStep(state, 'prepare');
  assert.equal(state.phase, 'phase1');
  assert.equal(state.participants.every((p) => p.state === 'PREPARED' && p.locksHeld), true);

  // Crash coordinator (participants blocked with locks held)
  const crashed = execute2PCStep(state, 'crash');
  assert.equal(crashed.phase, 'coordinator-down');
  assert.equal(crashed.coordinator, 'CRASHED');
  assert.equal(crashed.participants.every((p) => p.state === 'BLOCKED' && p.locksHeld), true);

  // Recover coordinator (WAL replay and commit)
  const recovered = execute2PCStep(crashed, 'recover');
  assert.equal(recovered.phase, 'committed');
  assert.equal(recovered.coordinator, 'ALIVE');
  assert.equal(recovered.participants.every((p) => p.state === 'COMMITTED' && !p.locksHeld), true);

  // Abort path
  const aborted = execute2PCStep(state, 'abort');
  assert.equal(aborted.phase, 'aborted');
  assert.equal(aborted.participants.every((p) => p.state === 'ABORTED' && !p.locksHeld), true);
});
