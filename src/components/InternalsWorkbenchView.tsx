import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  calculateBloomFilterMath,
  computeBloomHashes,
  calculateTailLatencyAmplification,
  TwoPhaseState,
  SagaStepState,
  TwoPhaseSimState,
  SagaSimState,
  createInitial2PCState,
  createInitialSagaState,
  LsmEngineState,
  createInitialLsmState,
  simulateLsmWrite,
  simulateLsmCompaction,
  RaftClusterState,
  createInitialRaftCluster,
  partitionRaftCluster,
  healRaftCluster,
  simulateRaftWrite,
} from '../utils/systemPhysics';

export const InternalsWorkbenchView: React.FC = () => {
  // 1. LSM-Tree vs B+Tree Storage Engine State
  const [lsmState, setLsmState] = useState<LsmEngineState>(() => createInitialLsmState(100));

  const handleWriteStorage = useCallback((count: number) => {
    setLsmState((prev) => simulateLsmWrite(prev, count, 4));
  }, []);

  const handleCompactL0 = useCallback(() => {
    setLsmState((prev) => simulateLsmCompaction(prev));
  }, []);

  const handleResetStorage = useCallback(() => {
    setLsmState({
      memKeys: 0,
      memCapacity: 100,
      totalKeysWritten: 0,
      l0Tables: [],
      l1Tables: [],
      lsmSequentialOps: 0,
      btreeRandomIops: 0,
      writeAmplificationFactor: 1.0,
      readAmplificationFactor: 1.0,
    });
  }, []);

  // 2. Raft Consensus & Split-Brain Partition State
  const [raftCluster, setRaftCluster] = useState<RaftClusterState>(() => createInitialRaftCluster());

  const handleTogglePartition = useCallback(() => {
    setRaftCluster((prev) => (prev.isPartitioned ? healRaftCluster(prev) : partitionRaftCluster(prev)));
  }, []);

  const handleWriteOldLeader = useCallback(() => {
    setRaftCluster((prev) => simulateRaftWrite(prev, 1).state);
  }, []);

  const handleWriteMajorityLeader = useCallback(() => {
    setRaftCluster((prev) => simulateRaftWrite(prev, 3).state);
  }, []);

  // 3. Bloom Filter Bit-Array & Sizing Calculator State
  const [bfKey, setBfKey] = useState<string>('user:9912');
  const [bitArray, setBitArray] = useState<number[]>(() => {
    const arr = Array(32).fill(0);
    const [h1, h2, h3] = computeBloomHashes('user:1001', 32);
    arr[h1] = 1;
    arr[h2] = 1;
    arr[h3] = 1;
    return arr;
  });
  const [bfFeedback, setBfFeedback] = useState<string>(
    'Pre-seeded "user:1001". Insert or check keys to observe k=3 hash bit positions.'
  );
  const [bfItemsMillions, setBfItemsMillions] = useState<number>(100);
  const [bfFalsePositiveSlider, setBfFalsePositiveSlider] = useState<number>(10);

  const falsePositiveRate = bfFalsePositiveSlider / 1000;
  const bloomMath = useMemo(
    () => calculateBloomFilterMath(bfItemsMillions, falsePositiveRate),
    [bfItemsMillions, falsePositiveRate]
  );

  const handleBfInsert = useCallback(() => {
    const [h1, h2, h3] = computeBloomHashes(bfKey, 32);
    setBitArray((prev) => {
      const next = [...prev];
      next[h1] = 1;
      next[h2] = 1;
      next[h3] = 1;
      return next;
    });
    setBfFeedback(`Inserted "${bfKey}" → Set bit indices [${h1}, ${h2}, ${h3}] to 1.`);
  }, [bfKey]);

  const handleBfQuery = useCallback(() => {
    const [h1, h2, h3] = computeBloomHashes(bfKey, 32);
    const allPresent = bitArray[h1] === 1 && bitArray[h2] === 1 && bitArray[h3] === 1;
    if (allPresent) {
      setBfFeedback(
        `Query "${bfKey}" → Bits [${h1}, ${h2}, ${h3}] are ALL 1: PROBABLY IN SET (Proceed to Cache/DB).`
      );
    } else {
      setBfFeedback(
        `Query "${bfKey}" → At least one bit in [${h1}, ${h2}, ${h3}] is 0: 100% DEFINITELY NOT IN SET (Skip DB query!).`
      );
    }
  }, [bfKey, bitArray]);

  // 4. Tail Latency Amplification & Hedged Requests State
  const [fanOutCount, setFanOutCount] = useState<number>(25);
  const [singleNodeSlowSlider, setSingleNodeSlowSlider] = useState<number>(10);

  const tailMath = useMemo(
    () => calculateTailLatencyAmplification(fanOutCount, singleNodeSlowSlider / 1000),
    [fanOutCount, singleNodeSlowSlider]
  );

  // 5. Distributed Sagas vs. 2PC Simulator State
  const [activeDistTxTab, setActiveDistTxTab] = useState<'2pc' | 'saga'>('2pc');
  const [tpcState, setTpcState] = useState<TwoPhaseSimState>(() => createInitial2PCState());
  const [sagaState, setSagaState] = useState<SagaSimState>(() => createInitialSagaState());
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const timerIdsRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timerIdsRef.current.forEach((id) => clearTimeout(id));
    timerIdsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const scheduleTimer = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      // Remove self from tracked timers
      timerIdsRef.current = timerIdsRef.current.filter((t) => t !== id);
      fn();
    }, delayMs);
    timerIdsRef.current.push(id);
  }, []);

  const get2PCStateColor = (state: TwoPhaseState) => {
    switch (state) {
      case 'IDLE':
        return 'var(--soft)';
      case 'PREPARING':
      case 'COMMITTING':
        return 'var(--cyan)';
      case 'PREPARED':
      case 'COMMITTED':
        return 'var(--lime)';
      case 'BLOCKED':
        return 'var(--orange)';
      case 'ABORTING':
      case 'ABORTED':
        return 'var(--rose)';
      default:
        return 'var(--soft)';
    }
  };

  const getSagaStepColor = (state: SagaStepState) => {
    switch (state) {
      case 'PENDING':
        return 'var(--soft)';
      case 'EXECUTING':
        return 'var(--cyan)';
      case 'COMPLETED':
        return 'var(--lime)';
      case 'FAILED':
        return 'var(--rose)';
      case 'COMPENSATING':
        return 'var(--orange)';
      case 'COMPENSATED':
        return 'var(--rose)';
      default:
        return 'var(--soft)';
    }
  };

  const handleTabSwitch = useCallback(
    (tab: '2pc' | 'saga') => {
      if (isAnimating) return;
      clearAllTimers();
      setActiveDistTxTab(tab);
    },
    [isAnimating, clearAllTimers]
  );

  const handleReset2PC = useCallback(() => {
    clearAllTimers();
    setTpcState(createInitial2PCState());
    setIsAnimating(false);
  }, [clearAllTimers]);

  const handleRunNormal2PC = useCallback(() => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    const ts = Date.now();
    setTpcState((prev) => ({
      ...prev,
      phase: 'phase1',
      coordinator: 'ALIVE',
      participants: prev.participants.map((p) => ({
        ...p,
        state: 'PREPARING',
        vote: null,
        locksHeld: true,
      })),
      log: [
        {
          id: `tpc-${ts}-0`,
          text: 'Phase 1 (Prepare): Coordinator broadcasts PREPARE message to all participants.',
          type: 'info',
          timestamp: ts,
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Order Service' ? { ...p, state: 'PREPARED', vote: 'YES' } : p
        ),
        log: [
          {
            id: `tpc-${now}-1`,
            text: 'Order Service: Local validation passed. Voted YES (holding table lock).',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 600);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Payment Service' ? { ...p, state: 'PREPARED', vote: 'YES' } : p
        ),
        log: [
          {
            id: `tpc-${now}-2`,
            text: 'Payment Service: Funds authorized and balance hold placed. Voted YES (holding balance lock).',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1200);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Inventory Service' ? { ...p, state: 'PREPARED', vote: 'YES' } : p
        ),
        log: [
          {
            id: `tpc-${now}-3`,
            text: 'Inventory Service: Warehouse inventory reserved. Voted YES (holding stock lock).',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1800);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        phase: 'phase1-complete',
        log: [
          {
            id: `tpc-${now}-4`,
            text: 'Consensus Reached: All participants voted YES (3/3). Coordinator writing COMMIT decision to WAL.',
            type: 'success',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 2300);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        phase: 'phase2',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'COMMITTING',
        })),
        log: [
          {
            id: `tpc-${now}-5`,
            text: 'Phase 2 (Commit): Coordinator broadcasts COMMIT command to participants.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 2900);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        phase: 'committed',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'COMMITTED',
          locksHeld: false,
        })),
        log: [
          {
            id: `tpc-${now}-6`,
            text: 'Transaction Committed: All participants committed local transactions and released exclusive locks.',
            type: 'success',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 3600);
  }, [isAnimating, clearAllTimers, scheduleTimer]);

  const handleForceVoteNoPayment = useCallback(() => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    const ts = Date.now();
    setTpcState((prev) => ({
      ...prev,
      phase: 'phase1',
      coordinator: 'ALIVE',
      participants: prev.participants.map((p) => ({
        ...p,
        state: 'PREPARING',
        vote: null,
        locksHeld: true,
      })),
      log: [
        {
          id: `tpc-${ts}-0`,
          text: 'Phase 1 (Prepare): Coordinator broadcasts PREPARE message to all participants.',
          type: 'info',
          timestamp: ts,
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Order Service' ? { ...p, state: 'PREPARED', vote: 'YES' } : p
        ),
        log: [
          {
            id: `tpc-${now}-1`,
            text: 'Order Service: Local checks passed. Voted YES.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 600);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Payment Service'
            ? { ...p, state: 'ABORTED', vote: 'NO', locksHeld: false }
            : p
        ),
        log: [
          {
            id: `tpc-${now}-2`,
            text: 'Payment Service: Insufficient customer balance! Voted NO and released locks.',
            type: 'error',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1200);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Inventory Service' ? { ...p, state: 'PREPARED', vote: 'YES' } : p
        ),
        log: [
          {
            id: `tpc-${now}-3`,
            text: 'Inventory Service: Stock reserved. Voted YES.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1800);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        phase: 'phase1-complete',
        log: [
          {
            id: `tpc-${now}-4`,
            text: 'Consensus Failed: Payment Service voted NO. Coordinator writing ABORT record to WAL.',
            type: 'warning',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 2300);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        phase: 'phase2',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'ABORTING',
        })),
        log: [
          {
            id: `tpc-${now}-5`,
            text: 'Phase 2 (Abort): Coordinator broadcasts ABORT command to all participants.',
            type: 'error',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 2900);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        phase: 'aborted',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'ABORTED',
          locksHeld: false,
        })),
        log: [
          {
            id: `tpc-${now}-6`,
            text: 'Transaction Aborted: All participants rolled back pending writes and released locks.',
            type: 'error',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 3600);
  }, [isAnimating, clearAllTimers, scheduleTimer]);

  const handleCrashCoordinator = useCallback(() => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    const ts = Date.now();
    setTpcState((prev) => ({
      ...prev,
      phase: 'phase1',
      coordinator: 'ALIVE',
      participants: prev.participants.map((p) => ({
        ...p,
        state: 'PREPARING',
        vote: null,
        locksHeld: true,
      })),
      log: [
        {
          id: `tpc-${ts}-0`,
          text: 'Phase 1 (Prepare): Coordinator broadcasts PREPARE message to all participants.',
          type: 'info',
          timestamp: ts,
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Order Service' ? { ...p, state: 'PREPARED', vote: 'YES' } : p
        ),
        log: [
          {
            id: `tpc-${now}-1`,
            text: 'Order Service: Voted YES (holding table locks).',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 600);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Payment Service' ? { ...p, state: 'PREPARED', vote: 'YES' } : p
        ),
        log: [
          {
            id: `tpc-${now}-2`,
            text: 'Payment Service: Voted YES (holding account locks).',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1100);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Inventory Service' ? { ...p, state: 'PREPARED', vote: 'YES' } : p
        ),
        log: [
          {
            id: `tpc-${now}-3`,
            text: 'Inventory Service: Voted YES (holding warehouse locks).',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1600);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        phase: 'coordinator-down',
        coordinator: 'CRASHED',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'BLOCKED',
          locksHeld: true,
        })),
        log: [
          {
            id: `tpc-${now}-4`,
            text: 'CRITICAL FAILURE: Coordinator crashed after Phase 1! Participants cannot unilaterally commit or abort. All 3 services are BLOCKED holding exclusive database locks indefinitely (Classic 2PC Blocking Flaw).',
            type: 'warning',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 2200);
  }, [isAnimating, clearAllTimers, scheduleTimer]);

  const handleRecoverCoordinator = useCallback(() => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    const ts = Date.now();
    setTpcState((prev) => ({
      ...prev,
      coordinator: 'RECOVERING',
      log: [
        {
          id: `tpc-${ts}-rec1`,
          text: 'Coordinator Reboot: Replaying WAL disk log to resolve in-flight distributed transactions...',
          type: 'info',
          timestamp: ts,
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        coordinator: 'ALIVE',
        phase: 'phase2',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'COMMITTING',
        })),
        log: [
          {
            id: `tpc-${now}-rec2`,
            text: 'WAL Recovery Successful: Found 3 YES votes in persistent log. Coordinator broadcasting delayed COMMIT.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 900);

    scheduleTimer(() => {
      const now = Date.now();
      setTpcState((prev) => ({
        ...prev,
        phase: 'committed',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'COMMITTED',
          locksHeld: false,
        })),
        log: [
          {
            id: `tpc-${now}-rec3`,
            text: 'System Recovered: All participants applied committed writes and released blocked locks.',
            type: 'success',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 1800);
  }, [isAnimating, clearAllTimers, scheduleTimer]);

  const handleResetSaga = useCallback(() => {
    clearAllTimers();
    setSagaState(createInitialSagaState());
    setIsAnimating(false);
  }, [clearAllTimers]);

  const handleRunNormalSaga = useCallback(() => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    const ts = Date.now();
    setSagaState((prev) => ({
      ...prev,
      direction: 'forward',
      steps: prev.steps.map((s, idx) =>
        idx === 0 ? { ...s, state: 'EXECUTING' } : { ...s, state: 'PENDING' }
      ),
      log: [
        {
          id: `saga-${ts}-0`,
          text: 'Saga Initiated: Order Service executing local transaction (T1)...',
          type: 'info',
          timestamp: ts,
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === 0
            ? { ...s, state: 'COMPLETED' }
            : idx === 1
            ? { ...s, state: 'EXECUTING' }
            : s
        ),
        log: [
          {
            id: `saga-${now}-1`,
            text: 'Order Service: Local ACID commit complete. Emitted event "OrderCreated" → Payment Service consuming.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 700);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === 1
            ? { ...s, state: 'COMPLETED' }
            : idx === 2
            ? { ...s, state: 'EXECUTING' }
            : s
        ),
        log: [
          {
            id: `saga-${now}-2`,
            text: 'Payment Service: Charged credit card $120.00 locally. Emitted event "PaymentProcessed" → Inventory Service consuming.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1400);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        direction: 'done',
        steps: prev.steps.map((s, idx) => (idx === 2 ? { ...s, state: 'COMPLETED' } : s)),
        log: [
          {
            id: `saga-${now}-3`,
            text: 'Inventory Service: Reserved stock in warehouse. Emitted event "InventoryAllocated". SAGA COMPLETE: All 3 services committed independently with NO distributed locks!',
            type: 'success',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 2100);
  }, [isAnimating, clearAllTimers, scheduleTimer]);

  const handleFailPaymentSaga = useCallback(() => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    const ts = Date.now();
    setSagaState((prev) => ({
      ...prev,
      direction: 'forward',
      steps: prev.steps.map((s, idx) =>
        idx === 0 ? { ...s, state: 'EXECUTING' } : { ...s, state: 'PENDING' }
      ),
      log: [
        {
          id: `saga-${ts}-0`,
          text: 'Saga Initiated: Order Service executing local transaction (T1)...',
          type: 'info',
          timestamp: ts,
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === 0
            ? { ...s, state: 'COMPLETED' }
            : idx === 1
            ? { ...s, state: 'EXECUTING' }
            : s
        ),
        log: [
          {
            id: `saga-${now}-1`,
            text: 'Order Service: Local ACID commit complete. Emitted event "OrderCreated" → Payment Service executing.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 700);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        direction: 'compensating',
        steps: prev.steps.map((s, idx) => (idx === 1 ? { ...s, state: 'FAILED' } : s)),
        log: [
          {
            id: `saga-${now}-2`,
            text: 'Payment Service FAILED: Card declined (expired token). Emitted "PaymentFailed". Initiating backward compensation choreography!',
            type: 'error',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1400);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) => (idx === 0 ? { ...s, state: 'COMPENSATING' } : s)),
        log: [
          {
            id: `saga-${now}-3`,
            text: 'Order Service: Consumed "PaymentFailed". Executing compensating transaction "Cancel Order" (C1)...',
            type: 'warning',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 2100);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        direction: 'compensated',
        steps: prev.steps.map((s, idx) => (idx === 0 ? { ...s, state: 'COMPENSATED' } : s)),
        log: [
          {
            id: `saga-${now}-4`,
            text: 'Compensation Finished: Order status set to CANCELLED. System returned to clean eventual consistency.',
            type: 'error',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 2800);
  }, [isAnimating, clearAllTimers, scheduleTimer]);

  const handleFailInventorySaga = useCallback(() => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    const ts = Date.now();
    setSagaState((prev) => ({
      ...prev,
      direction: 'forward',
      steps: prev.steps.map((s, idx) =>
        idx === 0 ? { ...s, state: 'EXECUTING' } : { ...s, state: 'PENDING' }
      ),
      log: [
        {
          id: `saga-${ts}-0`,
          text: 'Saga Initiated: Order Service executing local transaction (T1)...',
          type: 'info',
          timestamp: ts,
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === 0
            ? { ...s, state: 'COMPLETED' }
            : idx === 1
            ? { ...s, state: 'EXECUTING' }
            : s
        ),
        log: [
          {
            id: `saga-${now}-1`,
            text: 'Order Service: Local ACID commit complete. Emitted event "OrderCreated" → Payment Service executing.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 700);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === 1
            ? { ...s, state: 'COMPLETED' }
            : idx === 2
            ? { ...s, state: 'EXECUTING' }
            : s
        ),
        log: [
          {
            id: `saga-${now}-2`,
            text: 'Payment Service: Charged credit card $120.00 locally. Emitted event "PaymentProcessed" → Inventory Service allocating stock.',
            type: 'info',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 1400);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        direction: 'compensating',
        steps: prev.steps.map((s, idx) => (idx === 2 ? { ...s, state: 'FAILED' } : s)),
        log: [
          {
            id: `saga-${now}-3`,
            text: 'Inventory Service FAILED: SKU out of stock! Emitted "InventoryFailed". Triggering reverse compensating cascade (C2 → C1)...',
            type: 'error',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 2100);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) => (idx === 1 ? { ...s, state: 'COMPENSATING' } : s)),
        log: [
          {
            id: `saga-${now}-4`,
            text: 'Payment Service: Consumed failure. Executing compensating action "Refund Payment" (C2)... Reversing credit card transaction.',
            type: 'warning',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 2800);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === 1
            ? { ...s, state: 'COMPENSATED' }
            : idx === 0
            ? { ...s, state: 'COMPENSATING' }
            : s
        ),
        log: [
          {
            id: `saga-${now}-5`,
            text: 'Payment refunded. Order Service: Consumed event. Executing compensating action "Cancel Order" (C1)...',
            type: 'warning',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
    }, 3500);

    scheduleTimer(() => {
      const now = Date.now();
      setSagaState((prev) => ({
        ...prev,
        direction: 'compensated',
        steps: prev.steps.map((s, idx) => (idx === 0 ? { ...s, state: 'COMPENSATED' } : s)),
        log: [
          {
            id: `saga-${now}-6`,
            text: 'All Compensations Applied: Payment refunded and Order marked CANCELLED. System returned to consistent state.',
            type: 'error',
            timestamp: now,
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 4200);
  }, [isAnimating, clearAllTimers, scheduleTimer]);

  return (
    <div className="space-y-8 pt-4">
      <section className="pb-5 border-b border-(--line)">
        <div className="eyebrow-line">
          Storage Engine Internals · Raft Split-Brain Consensus · Probabilistic Data Structures ·
          Tail Latency Math · Distributed Transactions
        </div>
        <h1 className="font-display font-bold text-[clamp(28px,3.6vw,44px)] leading-[1.06] tracking-[-0.04em] text-(--ink) mt-3">
          Deep Internals & Distributed Storage Engine Workbench
        </h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* WORKBENCH 1: LSM-TREE VS B+TREE STORAGE ENGINE */}
        <article className="bg-(--panel) border border-(--line) rounded-[18px] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-(--line) pb-3">
              <h2 className="font-display text-base font-bold text-(--ink)">
                01. Storage Internals: LSM-Tree vs. B+Tree IOPS
              </h2>
              <span className="text-[10px] font-mono text-(--lime) uppercase tracking-wider">
                DDIA Ch. 3
              </span>
            </div>

            <p className="text-xs text-(--muted) leading-relaxed">
              Simulate random key writes. Watch how an LSM-Tree (Cassandra/RocksDB) buffers writes in
              RAM (MemTable + sequential WAL) and flushes immutable SSTables, while a B+Tree
              (PostgreSQL) incurs random disk page I/O.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleWriteStorage(25)}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-(--lime) text-(--lime-ink) rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90"
              >
                + Write 25 Keys
              </button>
              <button
                type="button"
                onClick={() => handleWriteStorage(100)}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-(--cyan) text-[#0a0d14] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90"
              >
                Flush Burst (100 Keys)
              </button>
              <button
                type="button"
                onClick={handleCompactL0}
                className="px-3 py-1.5 text-xs font-mono font-medium bg-(--p2) text-(--ink) border border-(--line) hover:border-(--lime) rounded-[9px] whitespace-nowrap cursor-pointer"
              >
                Run Level Compaction
              </button>
              <button
                type="button"
                onClick={handleResetStorage}
                className="px-3 py-1.5 text-xs font-mono text-(--muted) hover:text-(--rose) border border-(--line) rounded-[9px] cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-(--p2) border border-(--line) space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-(--muted)">
                    RAM MemTable (SkipList, Flushes @ {lsmState.memCapacity} keys):
                  </span>
                  <strong className="text-(--lime)">
                    {lsmState.memKeys} / {lsmState.memCapacity} keys
                  </strong>
                </div>
                <div className="h-2.5 bg-(--p3) rounded-full overflow-hidden">
                  <div
                    className="h-full bg-(--lime) transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (lsmState.memKeys / lsmState.memCapacity) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-(--muted) w-24 shrink-0">L0 SSTables:</span>
                <div className="text-(--cyan) break-all">
                  {lsmState.l0Tables.length > 0
                    ? lsmState.l0Tables.join(' · ')
                    : 'Empty (Awaiting MemTable flush)'}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-(--muted) w-24 shrink-0">L1 Compacted:</span>
                <div className="text-(--lime) break-all">
                  {lsmState.l1Tables.length > 0
                    ? lsmState.l1Tables.join(' · ')
                    : 'Auto-compacts when 4 L0 files accumulate'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono">
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">Keys Written</span>
                <strong className="text-sm text-(--cyan)">{lsmState.totalKeysWritten}</strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">LSM Sequential I/O</span>
                <strong className="text-sm text-(--lime)">{lsmState.lsmSequentialOps} ops</strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">B+Tree Random IOPS</span>
                <strong className="text-sm text-(--rose)">{lsmState.btreeRandomIops} IOPS</strong>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-(--line) text-xs text-(--muted)">
            <strong className="text-(--ink)">Staff Trade-Off:</strong> LSM-Trees trade fast sequential
            writes for Read Amplification (RAF ~{lsmState.readAmplificationFactor}x checking
            MemTable → L0 → L1), which RocksDB mitigates using per-SSTable Bloom Filters.
          </p>
        </article>

        {/* WORKBENCH 2: RAFT CONSENSUS & FENCING TOKENS */}
        <article className="bg-(--panel) border border-(--line) rounded-[18px] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-(--line) pb-3">
              <h2 className="font-display text-base font-bold text-(--ink)">
                02. Raft Consensus, Partition & Fencing Tokens
              </h2>
              <span className="text-[10px] font-mono text-(--cyan) uppercase tracking-wider">
                Split-Brain Defense
              </span>
            </div>

            <p className="text-xs text-(--muted) leading-relaxed">
              Simulate a 5-node Raft cluster (Quorum = 3). Sever the network to isolate Leader Node 01
              in a 2-node minority, watch the 3-node majority elect a new Leader with a higher Term
              (Fencing Token), and test writes on both sides.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTogglePartition}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-[9px] border whitespace-nowrap cursor-pointer transition-colors ${
                  raftCluster.isPartitioned
                    ? 'bg-(--orange) text-[#10150c] border-(--orange)'
                    : 'bg-(--p2) text-(--ink) border-(--line) hover:border-(--orange)'
                }`}
              >
                {raftCluster.isPartitioned
                  ? 'Heal Network Partition'
                  : 'Sever Network Partition (2 vs 3)'}
              </button>
              <button
                type="button"
                onClick={handleWriteOldLeader}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-(--rose) text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90"
              >
                Write to Node 01 (Term 1)
              </button>
              <button
                type="button"
                onClick={handleWriteMajorityLeader}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-(--lime) text-(--lime-ink) rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90"
              >
                Write to Majority Leader
              </button>
            </div>

            <svg
              viewBox="0 0 540 185"
              className="w-full h-44 bg-(--p2) border border-(--line) rounded-xl"
              aria-label="5-node Raft consensus cluster topology"
            >
              {(() => {
                const raftNodes = [
                  {
                    id: 1,
                    x: 85,
                    y: 55,
                    side: 'left',
                    role: raftCluster.isPartitioned
                      ? 'STALE LEADER (T1)'
                      : `LEADER (T${raftCluster.term})`,
                    status: raftCluster.isPartitioned ? 'stale' : 'leader',
                  },
                  {
                    id: 2,
                    x: 85,
                    y: 135,
                    side: 'left',
                    role: 'FOLLOWER (T1)',
                    status: 'follower',
                  },
                  {
                    id: 3,
                    x: 325,
                    y: 42,
                    side: 'right',
                    role: raftCluster.isPartitioned
                      ? `NEW LEADER (T${raftCluster.term})`
                      : `FOLLOWER (T${raftCluster.term})`,
                    status: raftCluster.isPartitioned ? 'leader' : 'follower',
                  },
                  {
                    id: 4,
                    x: 455,
                    y: 95,
                    side: 'right',
                    role: `FOLLOWER (T${raftCluster.term})`,
                    status: 'follower',
                  },
                  {
                    id: 5,
                    x: 325,
                    y: 145,
                    side: 'right',
                    role: `FOLLOWER (T${raftCluster.term})`,
                    status: 'follower',
                  },
                ];

                return (
                  <>
                    {raftNodes.map((a) =>
                      raftNodes
                        .filter((b) => a.id < b.id)
                        .map((b) => {
                          const severed = raftCluster.isPartitioned && a.side !== b.side;
                          return (
                            <line
                              key={`raft-link-${a.id}-${b.id}`}
                              x1={a.x}
                              y1={a.y}
                              x2={b.x}
                              y2={b.y}
                              stroke={severed ? 'var(--rose)' : 'var(--soft)'}
                              strokeWidth={severed ? 1 : 1.75}
                              strokeDasharray={severed ? '3 5' : undefined}
                              opacity={severed ? 0.35 : 0.75}
                            />
                          );
                        })
                    )}

                    {raftCluster.isPartitioned && (
                      <>
                        <line
                          x1={205}
                          y1={10}
                          x2={205}
                          y2={175}
                          stroke="var(--rose)"
                          strokeWidth={2.5}
                          strokeDasharray="6 4"
                        />
                        <text
                          x={205}
                          y={22}
                          textAnchor="middle"
                          fill="var(--rose)"
                          className="font-mono text-[10px] font-bold"
                        >
                          NETWORK PARTITION (2 vs 3)
                        </text>
                      </>
                    )}

                    {raftNodes.map((n) => {
                      const stroke =
                        n.status === 'stale'
                          ? 'var(--rose)'
                          : n.status === 'leader'
                          ? 'var(--lime)'
                          : 'var(--cyan)';
                      return (
                        <g key={n.id} transform={`translate(${n.x - 58}, ${n.y - 20})`}>
                          <rect
                            width={116}
                            height={42}
                            rx={8}
                            fill="var(--panel)"
                            stroke={stroke}
                            strokeWidth={2}
                          />
                          <text
                            x={58}
                            y={17}
                            textAnchor="middle"
                            fill="var(--ink)"
                            className="font-mono text-[11px] font-bold"
                          >
                            NODE 0{n.id}
                          </text>
                          <text
                            x={58}
                            y={32}
                            textAnchor="middle"
                            fill={stroke}
                            className="font-mono text-[9px] font-bold"
                          >
                            {n.role}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>

            <div
              className={`p-3 rounded-[10px] border font-mono text-xs ${
                raftCluster.logStatus === 'err'
                  ? 'bg-(--rose)/10 border-(--rose)/40 text-(--rose)'
                  : 'bg-(--lime)/10 border-(--lime)/40 text-(--lime)'
              }`}
            >
              {raftCluster.logMessage}
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-(--line) text-xs text-(--muted)">
            <strong className="text-(--ink)">Staff Interview Signal:</strong> Storage nodes enforce
            Monotonic Fencing Tokens (Term ID = {raftCluster.fencingToken}) so a leader waking up from
            a 15-second GC pause can never corrupt state.
          </p>
        </article>

        {/* WORKBENCH 3: BLOOM FILTER BIT-ARRAY & SIZING MATH */}
        <article className="bg-(--panel) border border-(--line) rounded-[18px] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-(--line) pb-3">
              <h2 className="font-display text-base font-bold text-(--ink)">
                03. Bloom Filter Bit-Array & Sizing Calculator
              </h2>
              <span className="text-[10px] font-mono text-(--orange) uppercase tracking-wider">
                Zero False Negatives
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                aria-label="Bloom filter key input"
                value={bfKey}
                onChange={(e) => setBfKey(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-(--p2) border border-(--line) rounded-[9px] text-(--ink)"
              />
              <button
                type="button"
                onClick={handleBfInsert}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-(--lime) text-(--lime-ink) rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90"
              >
                + Insert Key
              </button>
              <button
                type="button"
                onClick={handleBfQuery}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-(--cyan) text-[#0a0d14] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90"
              >
                Check Membership
              </button>
            </div>

            <div className="text-xs font-mono text-(--cyan)">{bfFeedback}</div>

            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
              aria-label="Bloom filter 32-bit array state"
            >
              {bitArray.map((bit, idx) => (
                <div
                  key={`bf-bit-${idx}`}
                  className={`py-1.5 text-center font-mono text-[10px] rounded border transition-colors ${
                    bit === 1
                      ? 'bg-(--lime) text-(--lime-ink) font-bold border-(--lime)'
                      : 'bg-(--p2) text-(--muted) border-(--line)'
                  }`}
                >
                  {bit}
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-(--p2) border border-(--line) space-y-3 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bf-n" className="block text-(--muted) mb-1">
                    Expected Keys (N): <strong className="text-(--ink)">{bfItemsMillions}M</strong>
                  </label>
                  <input
                    id="bf-n"
                    type="range"
                    min={1}
                    max={500}
                    value={bfItemsMillions}
                    onChange={(e) => setBfItemsMillions(Number(e.target.value))}
                    className="w-full accent-(--cyan)"
                    aria-valuemin={1}
                    aria-valuemax={500}
                    aria-valuenow={bfItemsMillions}
                  />
                </div>
                <div>
                  <label htmlFor="bf-p" className="block text-(--muted) mb-1">
                    False Positive Rate (P):{' '}
                    <strong className="text-(--ink)">{(falsePositiveRate * 100).toFixed(1)}%</strong>
                  </label>
                  <input
                    id="bf-p"
                    type="range"
                    min={1}
                    max={50}
                    value={bfFalsePositiveSlider}
                    onChange={(e) => setBfFalsePositiveSlider(Number(e.target.value))}
                    className="w-full accent-(--lime)"
                    aria-valuemin={1}
                    aria-valuemax={50}
                    aria-valuenow={bfFalsePositiveSlider}
                  />
                </div>
              </div>

              <div className="text-(--lime) pt-1">
                Optimal Bits/Key: <strong>{bloomMath.bitsPerElement} bits</strong> · Hash
                Functions: <strong>k = {bloomMath.optimalHashCount}</strong> · Total RAM for{' '}
                {bfItemsMillions}M keys: <strong>{bloomMath.totalMegabytes} MB</strong>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-(--line) text-xs text-(--muted)">
            <strong className="text-(--ink)">Rule of Thumb:</strong> 1% false-positive rate costs
            ~9.6 bits (1.2 bytes) per key—allowing 100M crawled URLs to fit in 120 MB of RAM.
          </p>
        </article>

        {/* WORKBENCH 4: TAIL LATENCY AMPLIFICATION & HEDGED REQUESTS */}
        <article className="bg-(--panel) border border-(--line) rounded-[18px] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-(--line) pb-3">
              <h2 className="font-display text-base font-bold text-(--ink)">
                04. Tail Latency Amplification & Hedged Requests
              </h2>
              <span className="text-[10px] font-mono text-(--rose) uppercase tracking-wider">
                The Tail at Scale
              </span>
            </div>

            <p className="text-xs text-(--muted) leading-relaxed">
              When an aggregator service fans out to N parallel shards and waits for the slowest
              response, tail latency compounds according to P(Slow) = 1 - (1 - p)ⁿ.
            </p>

            <div className="p-3.5 rounded-xl bg-(--p2) border border-(--line) space-y-3 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <label htmlFor="tail-n" className="text-(--muted)">
                    Parallel Microservice Fan-Out (N shards):
                  </label>
                  <strong className="text-(--cyan)">{fanOutCount} services</strong>
                </div>
                <input
                  id="tail-n"
                  type="range"
                  min={1}
                  max={100}
                  value={fanOutCount}
                  onChange={(e) => setFanOutCount(Number(e.target.value))}
                  className="w-full accent-(--cyan)"
                  aria-valuemin={1}
                  aria-valuemax={100}
                  aria-valuenow={fanOutCount}
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label htmlFor="tail-p" className="text-(--muted)">
                    Single Leaf P99 Slow Probability (p):
                  </label>
                  <strong className="text-(--orange)">{tailMath.singleSlowPct}%</strong>
                </div>
                <input
                  id="tail-p"
                  type="range"
                  min={1}
                  max={50}
                  value={singleNodeSlowSlider}
                  onChange={(e) => setSingleNodeSlowSlider(Number(e.target.value))}
                  className="w-full accent-(--orange)"
                  aria-valuemin={1}
                  aria-valuemax={50}
                  aria-valuenow={singleNodeSlowSlider}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono">
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">Single Shard Slow</span>
                <strong className="text-sm text-(--ink)">{tailMath.singleSlowPct}%</strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">Compound User P99</span>
                <strong className="text-sm text-(--rose)">{tailMath.compoundSlowPct}% of reqs</strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">With Hedged Reqs</span>
                <strong className="text-sm text-(--lime)">{tailMath.hedgedSlowPct}% of reqs</strong>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-(--muted)">Unhedged User Tail Experience</span>
                  <span className="text-(--rose)">{tailMath.compoundSlowPct}% slow</span>
                </div>
                <div className="h-2.5 bg-(--p3) rounded-full overflow-hidden">
                  <div
                    className="h-full bg-(--rose) transition-all duration-300"
                    style={{ width: `${Math.min(100, tailMath.compoundSlowPct)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-(--muted)">Hedged Requests (Duplicate sent after P95 wait)</span>
                  <span className="text-(--lime)">{tailMath.hedgedSlowPct}% slow</span>
                </div>
                <div className="h-2.5 bg-(--p3) rounded-full overflow-hidden">
                  <div
                    className="h-full bg-(--lime) transition-all duration-300"
                    style={{ width: `${Math.max(2, tailMath.hedgedSlowPct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-(--line) text-xs text-(--muted)">
            <strong className="text-(--ink)">Staff Mitigation:</strong> Send a hedged request to a
            replica if the primary shard exceeds its P95 threshold, cutting P99 tail latency by{' '}
            {tailMath.amplificationMultiplier || 10}x for only ~5% extra cluster load.
          </p>
        </article>

        {/* WORKBENCH 5: DISTRIBUTED SAGAS VS. TWO-PHASE COMMIT (2PC) */}
        <article className="bg-(--panel) border border-(--line) rounded-[18px] p-5 sm:p-6 flex flex-col justify-between lg:col-span-2">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--line) pb-3">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-(--ink)">
                  05. Distributed Sagas vs. Two-Phase Commit (2PC)
                </h2>
                <p className="text-xs text-(--muted) mt-0.5">
                  Atomicity vs. Availability across microservices: Compare synchronous blocking 2PC
                  with asynchronous compensating Sagas.
                </p>
              </div>
              <span className="text-[10px] font-mono text-(--lime) uppercase tracking-wider px-2 py-0.5 rounded-md bg-(--p2) border border-(--line)">
                Dual-Phase vs Choreography
              </span>
            </div>

            {/* Tab Switcher & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex items-center gap-1 bg-(--p2) border border-(--line) rounded-[10px] p-1 w-fit"
                role="tablist"
                aria-label="Distributed transaction simulation selector"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-2pc"
                  aria-selected={activeDistTxTab === '2pc'}
                  aria-controls="dist-tx-panel"
                  onClick={() => handleTabSwitch('2pc')}
                  className={
                    activeDistTxTab === '2pc'
                      ? 'px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-(--lime) text-(--lime-ink) cursor-pointer'
                      : 'px-3 py-1.5 text-xs font-mono font-bold rounded-lg text-(--muted) hover:text-(--ink) cursor-pointer'
                  }
                >
                  Two-Phase Commit
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-saga"
                  aria-selected={activeDistTxTab === 'saga'}
                  aria-controls="dist-tx-panel"
                  onClick={() => handleTabSwitch('saga')}
                  className={
                    activeDistTxTab === 'saga'
                      ? 'px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-(--lime) text-(--lime-ink) cursor-pointer'
                      : 'px-3 py-1.5 text-xs font-mono font-bold rounded-lg text-(--muted) hover:text-(--ink) cursor-pointer'
                  }
                >
                  Saga Pattern
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                {activeDistTxTab === '2pc' ? (
                  <>
                    <span className="text-(--muted)">Phase:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                        tpcState.phase === 'coordinator-down'
                          ? 'bg-(--rose)/15 border-(--rose)/40 text-(--rose)'
                          : tpcState.phase === 'committed'
                          ? 'bg-(--lime)/15 border-(--lime)/40 text-(--lime)'
                          : tpcState.phase === 'aborted'
                          ? 'bg-(--rose)/15 border-(--rose)/40 text-(--rose)'
                          : tpcState.phase.startsWith('phase')
                          ? 'bg-(--cyan)/15 border-(--cyan)/40 text-(--cyan)'
                          : 'bg-(--p2) border-(--line) text-(--muted)'
                      }`}
                    >
                      {tpcState.phase.toUpperCase()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-(--muted)">Execution Flow:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                        sagaState.direction === 'done'
                          ? 'bg-(--lime)/15 border-(--lime)/40 text-(--lime)'
                          : sagaState.direction === 'compensating' ||
                            sagaState.direction === 'compensated'
                          ? 'bg-(--rose)/15 border-(--rose)/40 text-(--rose)'
                          : sagaState.direction === 'forward'
                          ? 'bg-(--cyan)/15 border-(--cyan)/40 text-(--cyan)'
                          : 'bg-(--p2) border-(--line) text-(--muted)'
                      }`}
                    >
                      {sagaState.direction.toUpperCase()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Control Buttons */}
            {activeDistTxTab === '2pc' ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRunNormal2PC}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-(--lime) text-(--lime-ink) rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Normal 2PC
                </button>
                <button
                  type="button"
                  onClick={handleForceVoteNoPayment}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-(--rose) text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Force Vote NO on Payment
                </button>
                <button
                  type="button"
                  onClick={handleCrashCoordinator}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-(--orange) text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crash Coordinator After Phase 1
                </button>
                {(tpcState.coordinator === 'CRASHED' ||
                  tpcState.phase === 'coordinator-down') && (
                  <button
                    type="button"
                    onClick={handleRecoverCoordinator}
                    disabled={isAnimating}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-(--cyan) text-[#0a0d14] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                  >
                    Recover Coordinator
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset2PC}
                  className="px-3 py-1.5 text-xs font-mono text-(--muted) hover:text-(--rose) border border-(--line) rounded-[9px] cursor-pointer hover:border-(--rose) ml-auto"
                >
                  Reset
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRunNormalSaga}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-(--lime) text-(--lime-ink) rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Normal Saga
                </button>
                <button
                  type="button"
                  onClick={handleFailPaymentSaga}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-(--orange) text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fail Payment Service
                </button>
                <button
                  type="button"
                  onClick={handleFailInventorySaga}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-(--rose) text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fail Inventory Service
                </button>
                <button
                  type="button"
                  onClick={handleResetSaga}
                  className="px-3 py-1.5 text-xs font-mono text-(--muted) hover:text-(--rose) border border-(--line) rounded-[9px] cursor-pointer hover:border-(--rose) ml-auto"
                >
                  Reset
                </button>
              </div>
            )}

            {/* SVG Visualizations in Panel */}
            <div
              id="dist-tx-panel"
              role="tabpanel"
              aria-labelledby={activeDistTxTab === '2pc' ? 'tab-2pc' : 'tab-saga'}
            >
              {activeDistTxTab === '2pc' ? (
                <svg
                  viewBox="0 0 680 260"
                  className="w-full h-auto bg-(--p2) border border-(--line) rounded-xl"
                  aria-label="Two-Phase Commit distributed transaction coordinator and participant states"
                >
                  <defs>
                    <marker
                      id="tpc-arrow-lime"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--lime)" />
                    </marker>
                    <marker
                      id="tpc-arrow-cyan"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--cyan)" />
                    </marker>
                    <marker
                      id="tpc-arrow-rose"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--rose)" />
                    </marker>
                    <marker
                      id="tpc-arrow-orange"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--orange)" />
                    </marker>
                  </defs>

                  {/* Animated Lines between Coordinator and 3 participants */}
                  {(() => {
                    const pCoords = [
                      { y: 42.5, name: 'Order Service' },
                      { y: 127.5, name: 'Payment Service' },
                      { y: 212.5, name: 'Inventory Service' },
                    ];

                    return pCoords.map((target, idx) => {
                      const participant = tpcState.participants[idx];
                      let stroke = 'var(--soft)';
                      let markerEnd = '';
                      let isAnimated = false;
                      let dashArray: string | undefined = undefined;

                      if (tpcState.coordinator === 'CRASHED') {
                        stroke = 'var(--rose)';
                        dashArray = '4 4';
                      } else if (
                        tpcState.phase === 'phase1' ||
                        tpcState.phase === 'phase1-complete'
                      ) {
                        stroke = 'var(--cyan)';
                        markerEnd = 'url(#tpc-arrow-cyan)';
                        isAnimated = isAnimating;
                      } else if (
                        tpcState.phase === 'phase2' ||
                        tpcState.phase === 'committed'
                      ) {
                        stroke = 'var(--lime)';
                        markerEnd = 'url(#tpc-arrow-lime)';
                        isAnimated = isAnimating;
                      } else if (tpcState.phase === 'aborted') {
                        stroke = 'var(--rose)';
                        markerEnd = 'url(#tpc-arrow-rose)';
                      } else {
                        stroke = 'var(--soft)';
                        dashArray = '3 3';
                      }

                      return (
                        <g key={`tpc-line-${target.name}`}>
                          <line
                            x1={170}
                            y1={125}
                            x2={260}
                            y2={target.y}
                            stroke={stroke}
                            strokeWidth={2}
                            strokeDasharray={dashArray}
                            className={isAnimated ? 'animate-packet-flow' : undefined}
                            opacity={0.85}
                            markerEnd={markerEnd || undefined}
                          />
                          {tpcState.phase === 'phase1' && (
                            <text
                              x={210}
                              y={(125 + target.y) / 2 - 4}
                              textAnchor="middle"
                              fill="var(--cyan)"
                              className="font-mono text-[9px] font-bold"
                            >
                              PREPARE?
                            </text>
                          )}
                          {tpcState.phase === 'phase2' && (
                            <text
                              x={210}
                              y={(125 + target.y) / 2 - 4}
                              textAnchor="middle"
                              fill={
                                participant.state === 'ABORTING' || participant.state === 'ABORTED'
                                  ? 'var(--rose)'
                                  : 'var(--lime)'
                              }
                              className="font-mono text-[9px] font-bold"
                            >
                              {participant.state === 'ABORTING' || participant.state === 'ABORTED'
                                ? 'ABORT'
                                : 'COMMIT'}
                            </text>
                          )}
                        </g>
                      );
                    });
                  })()}

                  {/* Coordinator Box */}
                  {(() => {
                    const coordStroke =
                      tpcState.coordinator === 'CRASHED'
                        ? 'var(--rose)'
                        : tpcState.coordinator === 'RECOVERING'
                        ? 'var(--orange)'
                        : tpcState.phase === 'committed'
                        ? 'var(--lime)'
                        : 'var(--cyan)';

                    return (
                      <g transform="translate(30, 85)">
                        <rect
                          width={140}
                          height={80}
                          rx={10}
                          fill="var(--panel)"
                          stroke={coordStroke}
                          strokeWidth={2.5}
                          strokeDasharray={tpcState.coordinator === 'CRASHED' ? '6 4' : undefined}
                        />
                        <text
                          x={70}
                          y={26}
                          textAnchor="middle"
                          fill="var(--ink)"
                          className="font-mono text-[11px] font-bold tracking-wider"
                        >
                          COORDINATOR
                        </text>
                        <text
                          x={70}
                          y={46}
                          textAnchor="middle"
                          fill={coordStroke}
                          className="font-mono text-[10px] font-bold"
                        >
                          {tpcState.coordinator === 'CRASHED'
                            ? '⚡ CRASHED (SPOF)'
                            : tpcState.coordinator === 'RECOVERING'
                            ? 'RECOVERING WAL'
                            : '● ALIVE (LEADER)'}
                        </text>
                        <text
                          x={70}
                          y={64}
                          textAnchor="middle"
                          fill="var(--muted)"
                          className="font-mono text-[9px]"
                        >
                          Dual-Phase WAL Engine
                        </text>
                      </g>
                    );
                  })()}

                  {/* 3 Participant Boxes */}
                  {(() => {
                    const pConfigs = [
                      { y: 10, participant: tpcState.participants[0] },
                      { y: 95, participant: tpcState.participants[1] },
                      { y: 180, participant: tpcState.participants[2] },
                    ];

                    return pConfigs.map(({ y, participant }) => {
                      const strokeColor = get2PCStateColor(participant.state);
                      return (
                        <g
                          key={`tpc-node-${participant.name}`}
                          transform={`translate(260, ${y})`}
                        >
                          <rect
                            width={155}
                            height={65}
                            rx={8}
                            fill="var(--panel)"
                            stroke={strokeColor}
                            strokeWidth={2}
                          />
                          <text
                            x={77.5}
                            y={20}
                            textAnchor="middle"
                            fill="var(--ink)"
                            className="font-mono text-[11px] font-bold"
                          >
                            {participant.name}
                          </text>
                          <text
                            x={77.5}
                            y={37}
                            textAnchor="middle"
                            fill={strokeColor}
                            className="font-mono text-[10px] font-bold"
                          >
                            {participant.state}
                          </text>
                          <text
                            x={77.5}
                            y={53}
                            textAnchor="middle"
                            fill={participant.locksHeld ? 'var(--orange)' : 'var(--muted)'}
                            className="font-mono text-[9px]"
                          >
                            Vote: {participant.vote || '—'} ·{' '}
                            {participant.locksHeld ? '🔒 LOCK HELD' : '🔓 NO LOCK'}
                          </text>
                        </g>
                      );
                    });
                  })()}

                  {/* Phase Log / Protocol Monitor in SVG (x=450 area) */}
                  <g transform="translate(450, 10)">
                    <rect
                      width={200}
                      height={235}
                      rx={10}
                      fill="var(--panel)"
                      stroke="var(--line)"
                      strokeWidth={1}
                    />
                    <text
                      x={15}
                      y={24}
                      fill="var(--muted)"
                      className="font-mono text-[10px] font-bold uppercase tracking-wider"
                    >
                      2PC Consensus Monitor
                    </text>
                    <line
                      x1={15}
                      y1={32}
                      x2={185}
                      y2={32}
                      stroke="var(--line)"
                      strokeWidth={1}
                    />

                    <text x={15} y={52} fill="var(--muted)" className="font-mono text-[10px]">
                      Phase:
                    </text>
                    <text
                      x={185}
                      y={52}
                      textAnchor="end"
                      fill="var(--cyan)"
                      className="font-mono text-[10px] font-bold"
                    >
                      {tpcState.phase.toUpperCase()}
                    </text>

                    <text x={15} y={74} fill="var(--muted)" className="font-mono text-[10px]">
                      Coordinator:
                    </text>
                    <text
                      x={185}
                      y={74}
                      textAnchor="end"
                      fill={tpcState.coordinator === 'CRASHED' ? 'var(--rose)' : 'var(--lime)'}
                      className="font-mono text-[10px] font-bold"
                    >
                      {tpcState.coordinator}
                    </text>

                    <text x={15} y={96} fill="var(--muted)" className="font-mono text-[10px]">
                      Votes Cast:
                    </text>
                    <text
                      x={185}
                      y={96}
                      textAnchor="end"
                      fill="var(--ink)"
                      className="font-mono text-[10px] font-bold"
                    >
                      {tpcState.participants.filter((p) => p.vote === 'YES').length} YES
                      {' / '}
                      {tpcState.participants.filter((p) => p.vote === 'NO').length} NO
                    </text>

                    <text x={15} y={118} fill="var(--muted)" className="font-mono text-[10px]">
                      Locks In Fleet:
                    </text>
                    <text
                      x={185}
                      y={118}
                      textAnchor="end"
                      fill={
                        tpcState.participants.some((p) => p.locksHeld)
                          ? 'var(--orange)'
                          : 'var(--lime)'
                      }
                      className="font-mono text-[10px] font-bold"
                    >
                      {tpcState.participants.filter((p) => p.locksHeld).length} / 3 Held
                    </text>

                    <line
                      x1={15}
                      y1={130}
                      x2={185}
                      y2={130}
                      stroke="var(--line)"
                      strokeWidth={1}
                    />

                    <text x={15} y={150} fill="var(--muted)" className="font-mono text-[10px]">
                      Atomicity:
                    </text>
                    <text
                      x={185}
                      y={150}
                      textAnchor="end"
                      fill="var(--lime)"
                      className="font-mono text-[10px] font-bold"
                    >
                      Guaranteed (ACID)
                    </text>

                    <text x={15} y={172} fill="var(--muted)" className="font-mono text-[10px]">
                      Availability:
                    </text>
                    <text
                      x={185}
                      y={172}
                      textAnchor="end"
                      fill="var(--rose)"
                      className="font-mono text-[10px] font-bold"
                    >
                      Low (Blocking)
                    </text>

                    <text x={15} y={194} fill="var(--muted)" className="font-mono text-[10px]">
                      Overhead:
                    </text>
                    <text
                      x={185}
                      y={194}
                      textAnchor="end"
                      fill="var(--orange)"
                      className="font-mono text-[10px] font-bold"
                    >
                      2 RTTs + WAL fsync
                    </text>

                    {tpcState.coordinator === 'CRASHED' && (
                      <g>
                        <rect
                          x={10}
                          y={204}
                          width={180}
                          height={22}
                          rx={5}
                          fill="var(--rose)"
                          opacity={0.15}
                        />
                        <text
                          x={100}
                          y={219}
                          textAnchor="middle"
                          fill="var(--rose)"
                          className="font-mono text-[9px] font-bold"
                        >
                          ⚠️ PARTICIPANTS BLOCKED
                        </text>
                      </g>
                    )}
                    {tpcState.phase === 'committed' && (
                      <g>
                        <rect
                          x={10}
                          y={204}
                          width={180}
                          height={22}
                          rx={5}
                          fill="var(--lime)"
                          opacity={0.15}
                        />
                        <text
                          x={100}
                          y={219}
                          textAnchor="middle"
                          fill="var(--lime)"
                          className="font-mono text-[9px] font-bold"
                        >
                          ✓ ATOMIC COMMIT CONFIRMED
                        </text>
                      </g>
                    )}
                  </g>
                </svg>
              ) : (
                <svg
                  viewBox="0 0 680 220"
                  className="w-full h-auto bg-(--p2) border border-(--line) rounded-xl"
                  aria-label="Saga pattern asynchronous forward choreography and backward compensating cascade"
                >
                  <defs>
                    <marker
                      id="saga-arrow-lime"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--lime)" />
                    </marker>
                    <marker
                      id="saga-arrow-rose"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--rose)" />
                    </marker>
                  </defs>

                  {/* Forward Event Arrows (Top) */}
                  {/* 1. Order to Payment */}
                  {(() => {
                    const isFwd1Active =
                      sagaState.steps[0].state === 'COMPLETED' ||
                      sagaState.steps[1].state === 'EXECUTING' ||
                      sagaState.steps[1].state === 'COMPLETED';

                    return (
                      <g>
                        <path
                          d="M 185 85 C 210 40, 235 40, 260 85"
                          fill="none"
                          stroke={isFwd1Active ? 'var(--lime)' : 'var(--soft)'}
                          strokeWidth={2}
                          className={
                            isAnimating &&
                            sagaState.steps[0].state === 'COMPLETED' &&
                            sagaState.steps[1].state === 'EXECUTING'
                              ? 'animate-packet-flow'
                              : undefined
                          }
                          markerEnd={isFwd1Active ? 'url(#saga-arrow-lime)' : undefined}
                        />
                        <text
                          x={222.5}
                          y={42}
                          textAnchor="middle"
                          fill={isFwd1Active ? 'var(--lime)' : 'var(--muted)'}
                          className="font-mono text-[9px] font-bold"
                        >
                          OrderCreated →
                        </text>
                      </g>
                    );
                  })()}

                  {/* 2. Payment to Inventory */}
                  {(() => {
                    const isFwd2Active =
                      sagaState.steps[1].state === 'COMPLETED' ||
                      sagaState.steps[2].state === 'EXECUTING' ||
                      sagaState.steps[2].state === 'COMPLETED';

                    return (
                      <g>
                        <path
                          d="M 415 85 C 440 40, 465 40, 490 85"
                          fill="none"
                          stroke={isFwd2Active ? 'var(--lime)' : 'var(--soft)'}
                          strokeWidth={2}
                          className={
                            isAnimating &&
                            sagaState.steps[1].state === 'COMPLETED' &&
                            sagaState.steps[2].state === 'EXECUTING'
                              ? 'animate-packet-flow'
                              : undefined
                          }
                          markerEnd={isFwd2Active ? 'url(#saga-arrow-lime)' : undefined}
                        />
                        <text
                          x={452.5}
                          y={42}
                          textAnchor="middle"
                          fill={isFwd2Active ? 'var(--lime)' : 'var(--muted)'}
                          className="font-mono text-[9px] font-bold"
                        >
                          PaymentProcessed →
                        </text>
                      </g>
                    );
                  })()}

                  {/* Compensating Event Arrows (Bottom) */}
                  {/* 3. Inventory to Payment Compensation */}
                  {(() => {
                    const isComp1Active =
                      sagaState.steps[2].state === 'FAILED' ||
                      sagaState.steps[1].state === 'COMPENSATING' ||
                      sagaState.steps[1].state === 'COMPENSATED';

                    return (
                      <g>
                        <path
                          d="M 490 125 C 465 170, 440 170, 415 125"
                          fill="none"
                          stroke={isComp1Active ? 'var(--rose)' : 'var(--soft)'}
                          strokeWidth={2}
                          strokeDasharray={isComp1Active ? '4 3' : '3 3'}
                          className={
                            isAnimating && sagaState.steps[1].state === 'COMPENSATING'
                              ? 'animate-packet-flow'
                              : undefined
                          }
                          markerEnd={isComp1Active ? 'url(#saga-arrow-rose)' : undefined}
                        />
                        <text
                          x={452.5}
                          y={178}
                          textAnchor="middle"
                          fill={isComp1Active ? 'var(--rose)' : 'var(--muted)'}
                          className="font-mono text-[9px] font-bold"
                        >
                          ← C2: Refund Payment
                        </text>
                      </g>
                    );
                  })()}

                  {/* 4. Payment to Order Compensation */}
                  {(() => {
                    const isComp2Active =
                      sagaState.steps[1].state === 'FAILED' ||
                      sagaState.steps[0].state === 'COMPENSATING' ||
                      sagaState.steps[0].state === 'COMPENSATED';

                    return (
                      <g>
                        <path
                          d="M 260 125 C 235 170, 210 170, 185 125"
                          fill="none"
                          stroke={isComp2Active ? 'var(--rose)' : 'var(--soft)'}
                          strokeWidth={2}
                          strokeDasharray={isComp2Active ? '4 3' : '3 3'}
                          className={
                            isAnimating && sagaState.steps[0].state === 'COMPENSATING'
                              ? 'animate-packet-flow'
                              : undefined
                          }
                          markerEnd={isComp2Active ? 'url(#saga-arrow-rose)' : undefined}
                        />
                        <text
                          x={222.5}
                          y={178}
                          textAnchor="middle"
                          fill={isComp2Active ? 'var(--rose)' : 'var(--muted)'}
                          className="font-mono text-[9px] font-bold"
                        >
                          ← C1: Cancel Order
                        </text>
                      </g>
                    );
                  })()}

                  {/* 3 Horizontal Saga Service Rectangles */}
                  {(() => {
                    const sagaCoords = [
                      { x: 30, step: sagaState.steps[0], label: '1. Order Service' },
                      { x: 260, step: sagaState.steps[1], label: '2. Payment Service' },
                      { x: 490, step: sagaState.steps[2], label: '3. Inventory Service' },
                    ];

                    return sagaCoords.map(({ x, step, label }) => {
                      const strokeColor = getSagaStepColor(step.state);
                      return (
                        <g key={label} transform={`translate(${x}, 70)`}>
                          <rect
                            width={155}
                            height={70}
                            rx={8}
                            fill="var(--panel)"
                            stroke={strokeColor}
                            strokeWidth={2}
                          />
                          <text
                            x={77.5}
                            y={22}
                            textAnchor="middle"
                            fill="var(--ink)"
                            className="font-mono text-[11px] font-bold"
                          >
                            {label}
                          </text>
                          <text
                            x={77.5}
                            y={40}
                            textAnchor="middle"
                            fill={strokeColor}
                            className="font-mono text-[10px] font-bold"
                          >
                            {step.state}
                          </text>
                          <text
                            x={77.5}
                            y={56}
                            textAnchor="middle"
                            fill="var(--muted)"
                            className="font-mono text-[9px]"
                          >
                            Undo: {step.compensationName}
                          </text>
                        </g>
                      );
                    });
                  })()}

                  {/* Legend at bottom of SVG */}
                  <g transform="translate(30, 204)">
                    <line x1={0} y1={0} x2={20} y2={0} stroke="var(--lime)" strokeWidth={2} />
                    <text x={26} y={3} fill="var(--muted)" className="font-mono text-[9px]">
                      Forward Choreography: Independent Local Transactions (T1 → T2 → T3)
                    </text>

                    <line
                      x1={370}
                      y1={0}
                      x2={390}
                      y2={0}
                      stroke="var(--rose)"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                    <text x={396} y={3} fill="var(--muted)" className="font-mono text-[9px]">
                      Compensating Cascade: Semantic Rollbacks (C2 → C1)
                    </text>
                  </g>
                </svg>
              )}
            </div>

            {/* Architecture Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">Distributed Locking</span>
                <strong
                  className={`text-sm ${
                    activeDistTxTab === '2pc' && tpcState.participants.some((p) => p.locksHeld)
                      ? 'text-(--orange)'
                      : 'text-(--lime)'
                  }`}
                >
                  {activeDistTxTab === '2pc'
                    ? `${tpcState.participants.filter((p) => p.locksHeld).length} / 3 Locks Held`
                    : 'Zero Distributed Locks'}
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">Consistency Model</span>
                <strong className="text-sm text-(--cyan)">
                  {activeDistTxTab === '2pc'
                    ? 'Strict ACID (XA)'
                    : 'Eventual Consistency (BASE)'}
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">Fault Behavior</span>
                <strong
                  className={`text-sm ${
                    activeDistTxTab === '2pc'
                      ? tpcState.coordinator === 'CRASHED'
                        ? 'text-(--rose)'
                        : 'text-(--ink)'
                      : 'text-(--lime)'
                  }`}
                >
                  {activeDistTxTab === '2pc'
                    ? tpcState.coordinator === 'CRASHED'
                      ? 'Blocked (Unusable)'
                      : 'Vulnerable to SPOF'
                    : 'Non-Blocking (Compensates)'}
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-(--p2) border border-(--line)">
                <span className="text-[10px] text-(--muted) block">System Throughput</span>
                <strong
                  className={`text-sm ${
                    activeDistTxTab === '2pc' ? 'text-(--rose)' : 'text-(--lime)'
                  }`}
                >
                  {activeDistTxTab === '2pc' ? 'Low (Lock Contention)' : 'High (Local Autonomy)'}
                </strong>
              </div>
            </div>

            {/* Phase Log Display */}
            <div>
              <div className="text-[11px] font-mono text-(--muted) mb-1 flex items-center justify-between">
                <span>Transaction Execution Log</span>
                <span className="text-[10px] text-(--muted)">
                  {activeDistTxTab === '2pc'
                    ? `${tpcState.log.length} entries`
                    : `${sagaState.log.length} entries`}
                </span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] font-mono p-3 rounded-[10px] bg-(--p2) border border-(--line)">
                {(activeDistTxTab === '2pc' ? tpcState.log : sagaState.log).map((entry, i) => {
                  const colorClass =
                    entry.type === 'success'
                      ? 'text-(--lime)'
                      : entry.type === 'error'
                      ? 'text-(--rose)'
                      : entry.type === 'warning'
                      ? 'text-(--orange)'
                      : 'text-(--muted)';
                  return (
                    <div key={entry.id || `log-${i}`} className={colorClass}>
                      {entry.text}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-(--line) text-xs text-(--muted)">
            <strong className="text-(--ink)">Staff Trade-Off:</strong> 2PC guarantees atomic
            all-or-nothing across services but blocks participants if the coordinator crashes
            (violating availability). Sagas trade atomicity for availability—each step commits
            locally and failures trigger compensating transactions, achieving eventual consistency
            without distributed locks.
          </p>
        </article>
      </div>
    </div>
  );
};
