import React, { useState, useMemo, useRef, useEffect } from 'react';
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
} from '../utils/systemPhysics';

export const InternalsWorkbenchView: React.FC = () => {
  // 1. LSM-Tree vs B+Tree Simulator State
  const [memKeys, setMemKeys] = useState<number>(25);
  const [totalKeys, setTotalKeys] = useState<number>(25);
  const [l0Tables, setL0Tables] = useState<string[]>(['SST_L0_#1 (100 keys)']);
  const [l1Tables, setL1Tables] = useState<string[]>([]);
  const [lsmSequentialOps, setLsmSequentialOps] = useState<number>(2);
  const [btreeRandomIops, setBtreeRandomIops] = useState<number>(225);

  const handleWriteStorage = (count: number) => {
    let nextMem = memKeys + count;
    let nextL0 = [...l0Tables];
    let nextL1 = [...l1Tables];
    let nextLsmOps = lsmSequentialOps + 1;

    while (nextMem >= 100) {
      nextMem -= 100;
      nextL0.push(`SST_L0_#${nextL0.length + 1} (100 keys)`);
      nextLsmOps += 1;
    }

    if (nextL0.length >= 4) {
      const merged = nextL0.length;
      nextL0 = [];
      nextL1.push(`SST_L1_Merged_${nextL1.length + 1} (${merged * 100} keys)`);
      nextLsmOps += 2;
    }

    setMemKeys(nextMem);
    setTotalKeys((prev) => prev + count);
    setL0Tables(nextL0);
    setL1Tables(nextL1);
    setLsmSequentialOps(nextLsmOps);
    setBtreeRandomIops((prev) => prev + Math.round(count * 1.8));
  };

  const handleCompactL0 = () => {
    if (l0Tables.length === 0) return;
    const count = l0Tables.length;
    setL0Tables([]);
    setL1Tables((prev) => [
      ...prev,
      `SST_L1_Merged_${prev.length + 1} (${count * 100} keys)`,
    ]);
    setLsmSequentialOps((prev) => prev + 2);
  };

  const handleResetStorage = () => {
    setMemKeys(0);
    setTotalKeys(0);
    setL0Tables([]);
    setL1Tables([]);
    setLsmSequentialOps(0);
    setBtreeRandomIops(0);
  };

  // 2. Raft Consensus & Split-Brain Partition State
  const [isPartitioned, setIsPartitioned] = useState<boolean>(false);
  const [raftTerm, setRaftTerm] = useState<number>(1);
  const [raftLogMessage, setRaftLogMessage] = useState<string>(
    'Cluster healthy. Node 01 is Leader in Term 1 (Fencing Token = 1) with 5/5 nodes reachable.'
  );
  const [raftLogStatus, setRaftLogStatus] = useState<'ok' | 'err'>('ok');

  const handleTogglePartition = () => {
    if (!isPartitioned) {
      const nextTerm = raftTerm + 1;
      setIsPartitioned(true);
      setRaftTerm(nextTerm);
      setRaftLogStatus('err');
      setRaftLogMessage(
        `Network Partition Severed (2 vs 3). Nodes [03, 04, 05] formed a 3/5 quorum and elected Node 03 as Leader in Term ${nextTerm} (Fencing Token = ${nextTerm}). Node 01 is isolated in a 2/5 minority.`
      );
    } else {
      setIsPartitioned(false);
      setRaftLogStatus('ok');
      setRaftLogMessage(
        `Partition Healed. Node 01 observed higher Term ${raftTerm}, stepped down to Follower, and synced log from Majority Leader.`
      );
    }
  };

  const handleWriteOldLeader = () => {
    if (isPartitioned) {
      setRaftLogStatus('err');
      setRaftLogMessage(
        `WRITE REJECTED ON NODE 01: Node 01 (Stale Term 1) only reaches 2/5 nodes (Quorum requires 3). Furthermore, Storage rejects Fencing Token 1 < Active Token ${raftTerm}! Split-Brain prevented.`
      );
    } else {
      setRaftLogStatus('ok');
      setRaftLogMessage(
        `WRITE COMMITTED ON NODE 01: Replicated to 5/5 nodes in Term ${raftTerm} (Fencing Token = ${raftTerm}).`
      );
    }
  };

  const handleWriteMajorityLeader = () => {
    if (isPartitioned) {
      setRaftLogStatus('ok');
      setRaftLogMessage(
        `WRITE COMMITTED ON NODE 03: Majority partition [03, 04, 05] achieved 3/5 Quorum in Term ${raftTerm} (Fencing Token = ${raftTerm}).`
      );
    } else {
      setRaftLogStatus('ok');
      setRaftLogMessage(
        `WRITE COMMITTED: Cluster is unified under Term ${raftTerm}; replicated across all 5 nodes.`
      );
    }
  };

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

  const handleBfInsert = () => {
    const [h1, h2, h3] = computeBloomHashes(bfKey, 32);
    setBitArray((prev) => {
      const next = [...prev];
      next[h1] = 1;
      next[h2] = 1;
      next[h3] = 1;
      return next;
    });
    setBfFeedback(
      `Inserted "${bfKey}" → Set bit indices [${h1}, ${h2}, ${h3}] to 1.`
    );
  };

  const handleBfQuery = () => {
    const [h1, h2, h3] = computeBloomHashes(bfKey, 32);
    const allPresent =
      bitArray[h1] === 1 && bitArray[h2] === 1 && bitArray[h3] === 1;
    if (allPresent) {
      setBfFeedback(
        `Query "${bfKey}" → Bits [${h1}, ${h2}, ${h3}] are ALL 1: PROBABLY IN SET (Proceed to Cache/DB).`
      );
    } else {
      setBfFeedback(
        `Query "${bfKey}" → At least one bit in [${h1}, ${h2}, ${h3}] is 0: 100% DEFINITELY NOT IN SET (Skip DB query!).`
      );
    }
  };

  // 4. Tail Latency Amplification & Hedged Requests State
  const [fanOutCount, setFanOutCount] = useState<number>(25);
  const [singleNodeSlowSlider, setSingleNodeSlowSlider] = useState<number>(10);

  const tailMath = useMemo(
    () =>
      calculateTailLatencyAmplification(
        fanOutCount,
        singleNodeSlowSlider / 1000
      ),
    [fanOutCount, singleNodeSlowSlider]
  );

  // 5. Distributed Sagas vs. 2PC Simulator State
  const [activeDistTxTab, setActiveDistTxTab] = useState<'2pc' | 'saga'>('2pc');
  const [tpcState, setTpcState] = useState<TwoPhaseSimState>(() =>
    createInitial2PCState()
  );
  const [sagaState, setSagaState] = useState<SagaSimState>(() =>
    createInitialSagaState()
  );
  const [isAnimating, setIsAnimating] = useState(false);

  const timerIdsRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timerIdsRef.current.forEach((id) => clearTimeout(id));
    timerIdsRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const scheduleTimer = (fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, delayMs);
    timerIdsRef.current.push(id);
  };

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

  const handleReset2PC = () => {
    clearAllTimers();
    setTpcState(createInitial2PCState());
    setIsAnimating(false);
  };

  const handleRunNormal2PC = () => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

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
          text: 'Phase 1 (Prepare): Coordinator broadcasts PREPARE message to all participants.',
          type: 'info',
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Order Service'
            ? { ...p, state: 'PREPARED', vote: 'YES' }
            : p
        ),
        log: [
          {
            text: 'Order Service: Local validation passed. Voted YES (holding table lock).',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 600);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Payment Service'
            ? { ...p, state: 'PREPARED', vote: 'YES' }
            : p
        ),
        log: [
          {
            text: 'Payment Service: Funds authorized and balance hold placed. Voted YES (holding balance lock).',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 1200);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Inventory Service'
            ? { ...p, state: 'PREPARED', vote: 'YES' }
            : p
        ),
        log: [
          {
            text: 'Inventory Service: Warehouse inventory reserved. Voted YES (holding stock lock).',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 1800);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        phase: 'phase1-complete',
        log: [
          {
            text: 'Consensus Reached: All participants voted YES (3/3). Coordinator writing COMMIT decision to WAL.',
            type: 'success',
          },
          ...prev.log,
        ],
      }));
    }, 2300);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        phase: 'phase2',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'COMMITTING',
        })),
        log: [
          {
            text: 'Phase 2 (Commit): Coordinator broadcasts COMMIT command to participants.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 2900);

    scheduleTimer(() => {
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
            text: 'Transaction Committed: All participants committed local transactions and released exclusive locks.',
            type: 'success',
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 3600);
  };

  const handleForceVoteNoPayment = () => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

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
          text: 'Phase 1 (Prepare): Coordinator broadcasts PREPARE message to all participants.',
          type: 'info',
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Order Service'
            ? { ...p, state: 'PREPARED', vote: 'YES' }
            : p
        ),
        log: [
          {
            text: 'Order Service: Local checks passed. Voted YES.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 600);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Payment Service'
            ? { ...p, state: 'ABORTED', vote: 'NO', locksHeld: false }
            : p
        ),
        log: [
          {
            text: 'Payment Service: Insufficient customer balance! Voted NO and released locks.',
            type: 'error',
          },
          ...prev.log,
        ],
      }));
    }, 1200);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Inventory Service'
            ? { ...p, state: 'PREPARED', vote: 'YES' }
            : p
        ),
        log: [
          {
            text: 'Inventory Service: Stock reserved. Voted YES.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 1800);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        phase: 'phase1-complete',
        log: [
          {
            text: 'Consensus Failed: Payment Service voted NO. Coordinator writing ABORT record to WAL.',
            type: 'warning',
          },
          ...prev.log,
        ],
      }));
    }, 2300);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        phase: 'phase2',
        participants: prev.participants.map((p) => ({
          ...p,
          state: 'ABORTING',
        })),
        log: [
          {
            text: 'Phase 2 (Abort): Coordinator broadcasts ABORT command to all participants.',
            type: 'error',
          },
          ...prev.log,
        ],
      }));
    }, 2900);

    scheduleTimer(() => {
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
            text: 'Transaction Aborted: All participants rolled back pending writes and released locks.',
            type: 'error',
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 3600);
  };

  const handleCrashCoordinator = () => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

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
          text: 'Phase 1 (Prepare): Coordinator broadcasts PREPARE message to all participants.',
          type: 'info',
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Order Service'
            ? { ...p, state: 'PREPARED', vote: 'YES' }
            : p
        ),
        log: [
          {
            text: 'Order Service: Voted YES (holding table locks).',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 600);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Payment Service'
            ? { ...p, state: 'PREPARED', vote: 'YES' }
            : p
        ),
        log: [
          {
            text: 'Payment Service: Voted YES (holding account locks).',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 1100);

    scheduleTimer(() => {
      setTpcState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.name === 'Inventory Service'
            ? { ...p, state: 'PREPARED', vote: 'YES' }
            : p
        ),
        log: [
          {
            text: 'Inventory Service: Voted YES (holding warehouse locks).',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 1600);

    scheduleTimer(() => {
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
            text: 'CRITICAL FAILURE: Coordinator crashed after Phase 1! Participants cannot unilaterally commit or abort. All 3 services are BLOCKED holding exclusive database locks indefinitely (Classic 2PC Blocking Flaw).',
            type: 'warning',
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 2200);
  };

  const handleRecoverCoordinator = () => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    setTpcState((prev) => ({
      ...prev,
      coordinator: 'RECOVERING',
      log: [
        {
          text: 'Coordinator Reboot: Replaying WAL disk log to resolve in-flight distributed transactions...',
          type: 'info',
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
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
            text: 'WAL Recovery Successful: Found 3 YES votes in persistent log. Coordinator broadcasting delayed COMMIT.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 900);

    scheduleTimer(() => {
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
            text: 'System Recovered: All participants applied committed writes and released blocked locks.',
            type: 'success',
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 1800);
  };

  const handleResetSaga = () => {
    clearAllTimers();
    setSagaState(createInitialSagaState());
    setIsAnimating(false);
  };

  const handleRunNormalSaga = () => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    setSagaState((prev) => ({
      ...prev,
      direction: 'forward',
      steps: prev.steps.map((s, idx) =>
        idx === 0 ? { ...s, state: 'EXECUTING' } : { ...s, state: 'PENDING' }
      ),
      log: [
        {
          text: 'Saga Initiated: Order Service executing local transaction (T1)...',
          type: 'info',
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
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
            text: 'Order Service: Local ACID commit complete. Emitted event "OrderCreated" → Payment Service consuming.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 700);

    scheduleTimer(() => {
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
            text: 'Payment Service: Charged credit card $120.00 locally. Emitted event "PaymentProcessed" → Inventory Service consuming.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 1400);

    scheduleTimer(() => {
      setSagaState((prev) => ({
        ...prev,
        direction: 'done',
        steps: prev.steps.map((s, idx) =>
          idx === 2 ? { ...s, state: 'COMPLETED' } : s
        ),
        log: [
          {
            text: 'Inventory Service: Reserved stock in warehouse. Emitted event "InventoryAllocated". SAGA COMPLETE: All 3 services committed independently with NO distributed locks!',
            type: 'success',
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 2100);
  };

  const handleFailPaymentSaga = () => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    setSagaState((prev) => ({
      ...prev,
      direction: 'forward',
      steps: prev.steps.map((s, idx) =>
        idx === 0 ? { ...s, state: 'EXECUTING' } : { ...s, state: 'PENDING' }
      ),
      log: [
        {
          text: 'Saga Initiated: Order Service executing local transaction (T1)...',
          type: 'info',
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
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
            text: 'Order Service: Local ACID commit complete. Emitted event "OrderCreated" → Payment Service executing.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 700);

    scheduleTimer(() => {
      setSagaState((prev) => ({
        ...prev,
        direction: 'compensating',
        steps: prev.steps.map((s, idx) =>
          idx === 1 ? { ...s, state: 'FAILED' } : s
        ),
        log: [
          {
            text: 'Payment Service FAILED: Card declined (expired token). Emitted "PaymentFailed". Initiating backward compensation choreography!',
            type: 'error',
          },
          ...prev.log,
        ],
      }));
    }, 1400);

    scheduleTimer(() => {
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === 0 ? { ...s, state: 'COMPENSATING' } : s
        ),
        log: [
          {
            text: 'Order Service: Consumed "PaymentFailed". Executing compensating transaction "Cancel Order" (C1)...',
            type: 'warning',
          },
          ...prev.log,
        ],
      }));
    }, 2100);

    scheduleTimer(() => {
      setSagaState((prev) => ({
        ...prev,
        direction: 'compensated',
        steps: prev.steps.map((s, idx) =>
          idx === 0 ? { ...s, state: 'COMPENSATED' } : s
        ),
        log: [
          {
            text: 'Compensation Finished: Order status set to CANCELLED. System returned to clean eventual consistency.',
            type: 'error',
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 2800);
  };

  const handleFailInventorySaga = () => {
    if (isAnimating) return;
    clearAllTimers();
    setIsAnimating(true);

    setSagaState((prev) => ({
      ...prev,
      direction: 'forward',
      steps: prev.steps.map((s, idx) =>
        idx === 0 ? { ...s, state: 'EXECUTING' } : { ...s, state: 'PENDING' }
      ),
      log: [
        {
          text: 'Saga Initiated: Order Service executing local transaction (T1)...',
          type: 'info',
        },
        ...prev.log,
      ],
    }));

    scheduleTimer(() => {
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
            text: 'Order Service: Local ACID commit complete. Emitted event "OrderCreated" → Payment Service executing.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 700);

    scheduleTimer(() => {
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
            text: 'Payment Service: Charged credit card $120.00 locally. Emitted event "PaymentProcessed" → Inventory Service allocating stock.',
            type: 'info',
          },
          ...prev.log,
        ],
      }));
    }, 1400);

    scheduleTimer(() => {
      setSagaState((prev) => ({
        ...prev,
        direction: 'compensating',
        steps: prev.steps.map((s, idx) =>
          idx === 2 ? { ...s, state: 'FAILED' } : s
        ),
        log: [
          {
            text: 'Inventory Service FAILED: SKU out of stock! Emitted "InventoryFailed". Triggering reverse compensating cascade (C2 → C1)...',
            type: 'error',
          },
          ...prev.log,
        ],
      }));
    }, 2100);

    scheduleTimer(() => {
      setSagaState((prev) => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === 1 ? { ...s, state: 'COMPENSATING' } : s
        ),
        log: [
          {
            text: 'Payment Service: Consumed failure. Executing compensating action "Refund Payment" (C2)... Reversing credit card transaction.',
            type: 'warning',
          },
          ...prev.log,
        ],
      }));
    }, 2800);

    scheduleTimer(() => {
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
            text: 'Payment refunded. Order Service: Consumed event. Executing compensating action "Cancel Order" (C1)...',
            type: 'warning',
          },
          ...prev.log,
        ],
      }));
    }, 3500);

    scheduleTimer(() => {
      setSagaState((prev) => ({
        ...prev,
        direction: 'compensated',
        steps: prev.steps.map((s, idx) =>
          idx === 0 ? { ...s, state: 'COMPENSATED' } : s
        ),
        log: [
          {
            text: 'All Compensations Applied: Payment refunded and Order marked CANCELLED. System returned to consistent state.',
            type: 'error',
          },
          ...prev.log,
        ],
      }));
      setIsAnimating(false);
    }, 4200);
  };

  return (
    <div className="space-y-8 pt-4">
      <section className="pb-5 border-b border-[var(--line)]">
        <div className="eyebrow-line">
          Storage Engine Internals · Raft Split-Brain Consensus · Probabilistic Data Structures · Tail Latency Math · Distributed Transactions
        </div>
        <h1 className="font-display font-bold text-[clamp(28px,3.6vw,44px)] leading-[1.06] tracking-[-0.04em] text-[var(--ink)] mt-3">
          Deep Internals & Distributed Storage Engine Workbench
        </h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* WORKBENCH 1: LSM-TREE VS B+TREE STORAGE ENGINE */}
        <article className="bg-[var(--panel)] border border-[var(--line)] rounded-[18px] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="font-display text-base font-bold text-[var(--ink)]">
                01. Storage Internals: LSM-Tree vs. B+Tree IOPS
              </h2>
              <span className="text-[10px] font-mono text-[var(--lime)] uppercase tracking-wider">
                DDIA Ch. 3
              </span>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Simulate random key writes. Watch how an LSM-Tree (Cassandra/RocksDB) buffers writes in RAM (MemTable + sequential WAL) and flushes immutable SSTables, while a B+Tree (PostgreSQL) incurs random disk page I/O.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleWriteStorage(25)}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[9px] whitespace-nowrap cursor-pointer"
              >
                + Write 25 Keys
              </button>
              <button
                type="button"
                onClick={() => handleWriteStorage(100)}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--cyan)] text-[#0a0d14] rounded-[9px] whitespace-nowrap cursor-pointer"
              >
                Flush Burst (100 Keys)
              </button>
              <button
                type="button"
                onClick={handleCompactL0}
                className="px-3 py-1.5 text-xs font-mono font-medium bg-[var(--p2)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--lime)] rounded-[9px] whitespace-nowrap cursor-pointer"
              >
                Run Level Compaction
              </button>
              <button
                type="button"
                onClick={handleResetStorage}
                className="px-3 py-1.5 text-xs font-mono text-[var(--muted)] hover:text-[var(--rose)] border border-[var(--line)] rounded-[9px] cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="p-3.5 rounded-[12px] bg-[var(--p2)] border border-[var(--line)] space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--muted)]">
                    RAM MemTable (SkipList, Flushes @ 100 keys):
                  </span>
                  <strong className="text-[var(--lime)]">
                    {memKeys} / 100 keys
                  </strong>
                </div>
                <div className="h-2.5 bg-[var(--p3)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--lime)] transition-all"
                    style={{ width: `${memKeys}%` }}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-[var(--muted)] w-24 shrink-0">L0 SSTables:</span>
                <div className="text-[var(--cyan)]">
                  {l0Tables.length > 0
                    ? l0Tables.join(' · ')
                    : 'Empty (Awaiting MemTable flush)'}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-[var(--muted)] w-24 shrink-0">L1 Compacted:</span>
                <div className="text-[var(--lime)]">
                  {l1Tables.length > 0
                    ? l1Tables.join(' · ')
                    : 'Auto-compacts when 4 L0 files accumulate'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono">
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  Keys Written
                </span>
                <strong className="text-sm text-[var(--cyan)]">
                  {totalKeys}
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  LSM Sequential I/O
                </span>
                <strong className="text-sm text-[var(--lime)]">
                  {lsmSequentialOps} ops
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  B+Tree Random IOPS
                </span>
                <strong className="text-sm text-[var(--rose)]">
                  {btreeRandomIops} IOPS
                </strong>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-[var(--line)] text-xs text-[var(--muted)]">
            <strong className="text-[var(--ink)]">Staff Trade-Off:</strong>{' '}
            LSM-Trees trade fast sequential writes for Read Amplification (checking MemTable → L0 → L1), which RocksDB mitigates using per-SSTable Bloom Filters.
          </p>
        </article>

        {/* WORKBENCH 2: RAFT CONSENSUS & FENCING TOKENS */}
        <article className="bg-[var(--panel)] border border-[var(--line)] rounded-[18px] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="font-display text-base font-bold text-[var(--ink)]">
                02. Raft Consensus, Partition & Fencing Tokens
              </h2>
              <span className="text-[10px] font-mono text-[var(--cyan)] uppercase tracking-wider">
                Split-Brain Defense
              </span>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Simulate a 5-node Raft cluster (Quorum = 3). Sever the network to isolate Leader Node 01 in a 2-node minority, watch the 3-node majority elect a new Leader with a higher Term (Fencing Token), and test writes on both sides.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTogglePartition}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-[9px] border whitespace-nowrap cursor-pointer ${
                  isPartitioned
                    ? 'bg-[var(--orange)] text-[#10150c] border-[var(--orange)]'
                    : 'bg-[var(--p2)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--orange)]'
                }`}
              >
                {isPartitioned
                  ? 'Heal Network Partition'
                  : 'Sever Network Partition (2 vs 3)'}
              </button>
              <button
                type="button"
                onClick={handleWriteOldLeader}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--rose)] text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer"
              >
                Write to Node 01 (Term 1)
              </button>
              <button
                type="button"
                onClick={handleWriteMajorityLeader}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[9px] whitespace-nowrap cursor-pointer"
              >
                Write to Majority Leader
              </button>
            </div>

            <svg
              viewBox="0 0 540 185"
              className="w-full h-44 bg-[var(--p2)] border border-[var(--line)] rounded-[12px]"
            >
              {(() => {
                const raftNodes = [
                  {
                    id: 1,
                    x: 85,
                    y: 55,
                    side: 'left',
                    role: isPartitioned
                      ? 'STALE LEADER (T1)'
                      : `LEADER (T${raftTerm})`,
                    status: isPartitioned ? 'stale' : 'leader',
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
                    role: isPartitioned
                      ? `NEW LEADER (T${raftTerm})`
                      : `FOLLOWER (T${raftTerm})`,
                    status: isPartitioned ? 'leader' : 'follower',
                  },
                  {
                    id: 4,
                    x: 455,
                    y: 95,
                    side: 'right',
                    role: `FOLLOWER (T${raftTerm})`,
                    status: 'follower',
                  },
                  {
                    id: 5,
                    x: 325,
                    y: 145,
                    side: 'right',
                    role: `FOLLOWER (T${raftTerm})`,
                    status: 'follower',
                  },
                ];

                return (
                  <>
                    {raftNodes.map((a) =>
                      raftNodes
                        .filter((b) => a.id < b.id)
                        .map((b) => {
                          const severed = isPartitioned && a.side !== b.side;
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

                    {isPartitioned && (
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
                        <g
                          key={n.id}
                          transform={`translate(${n.x - 58}, ${n.y - 20})`}
                        >
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
                raftLogStatus === 'err'
                  ? 'bg-[var(--rose)]/10 border-[var(--rose)]/40 text-[var(--rose)]'
                  : 'bg-[var(--lime)]/10 border-[var(--lime)]/40 text-[var(--lime)]'
              }`}
            >
              {raftLogMessage}
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-[var(--line)] text-xs text-[var(--muted)]">
            <strong className="text-[var(--ink)]">Staff Interview Signal:</strong>{' '}
            Storage nodes enforce Monotonic Fencing Tokens (Term ID) so a leader waking up from a 15-second GC pause can never corrupt state.
          </p>
        </article>

        {/* WORKBENCH 3: BLOOM FILTER BIT-ARRAY & SIZING MATH */}
        <article className="bg-[var(--panel)] border border-[var(--line)] rounded-[18px] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="font-display text-base font-bold text-[var(--ink)]">
                03. Bloom Filter Bit-Array & Sizing Calculator
              </h2>
              <span className="text-[10px] font-mono text-[var(--orange)] uppercase tracking-wider">
                Zero False Negatives
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                aria-label="Bloom filter key input"
                value={bfKey}
                onChange={(e) => setBfKey(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-[var(--p2)] border border-[var(--line)] rounded-[9px] text-[var(--ink)]"
              />
              <button
                type="button"
                onClick={handleBfInsert}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[9px] whitespace-nowrap cursor-pointer"
              >
                + Insert Key
              </button>
              <button
                type="button"
                onClick={handleBfQuery}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--cyan)] text-[#0a0d14] rounded-[9px] whitespace-nowrap cursor-pointer"
              >
                Check Membership
              </button>
            </div>

            <div className="text-xs font-mono text-[var(--cyan)]">
              {bfFeedback}
            </div>

            <div className="grid grid-cols-16 gap-1">
              {bitArray.map((bit, idx) => (
                <div
                  key={idx}
                  className={`py-1.5 text-center font-mono text-[10px] rounded border ${
                    bit === 1
                      ? 'bg-[var(--lime)] text-[var(--lime-ink)] font-bold border-[var(--lime)]'
                      : 'bg-[var(--p2)] text-[var(--muted)] border-[var(--line)]'
                  }`}
                >
                  {bit}
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-[12px] bg-[var(--p2)] border border-[var(--line)] space-y-3 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bf-n" className="block text-[var(--muted)] mb-1">
                    Expected Keys (N): <strong className="text-[var(--ink)]">{bfItemsMillions}M</strong>
                  </label>
                  <input
                    id="bf-n"
                    type="range"
                    min={1}
                    max={500}
                    value={bfItemsMillions}
                    onChange={(e) => setBfItemsMillions(Number(e.target.value))}
                    className="w-full accent-[var(--cyan)]"
                  />
                </div>
                <div>
                  <label htmlFor="bf-p" className="block text-[var(--muted)] mb-1">
                    False Positive Rate (P):{' '}
                    <strong className="text-[var(--ink)]">{(falsePositiveRate * 100).toFixed(1)}%</strong>
                  </label>
                  <input
                    id="bf-p"
                    type="range"
                    min={1}
                    max={50}
                    value={bfFalsePositiveSlider}
                    onChange={(e) =>
                      setBfFalsePositiveSlider(Number(e.target.value))
                    }
                    className="w-full accent-[var(--lime)]"
                  />
                </div>
              </div>

              <div className="text-[var(--lime)] pt-1">
                Optimal Bits/Key: <strong>{bloomMath.bitsPerElement} bits</strong> ·
                Hash Functions: <strong>k = {bloomMath.optimalHashCount}</strong> ·
                Total RAM for {bfItemsMillions}M keys:{' '}
                <strong>{bloomMath.totalMegabytes} MB</strong>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-[var(--line)] text-xs text-[var(--muted)]">
            <strong className="text-[var(--ink)]">Rule of Thumb:</strong>{' '}
            1% false-positive rate costs ~9.6 bits (1.2 bytes) per key—allowing 100M crawled URLs to fit in 120 MB of RAM.
          </p>
        </article>

        {/* WORKBENCH 4: TAIL LATENCY AMPLIFICATION & HEDGED REQUESTS */}
        <article className="bg-[var(--panel)] border border-[var(--line)] rounded-[18px] p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="font-display text-base font-bold text-[var(--ink)]">
                04. Tail Latency Amplification & Hedged Requests
              </h2>
              <span className="text-[10px] font-mono text-[var(--rose)] uppercase tracking-wider">
                The Tail at Scale
              </span>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              When an aggregator service fans out to N parallel shards and waits for the slowest response, tail latency compounds according to P(Slow) = 1 - (1 - p)ⁿ.
            </p>

            <div className="p-3.5 rounded-[12px] bg-[var(--p2)] border border-[var(--line)] space-y-3 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <label htmlFor="tail-n" className="text-[var(--muted)]">
                    Parallel Microservice Fan-Out (N shards):
                  </label>
                  <strong className="text-[var(--cyan)]">
                    {fanOutCount} services
                  </strong>
                </div>
                <input
                  id="tail-n"
                  type="range"
                  min={1}
                  max={100}
                  value={fanOutCount}
                  onChange={(e) => setFanOutCount(Number(e.target.value))}
                  className="w-full accent-[var(--cyan)]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label htmlFor="tail-p" className="text-[var(--muted)]">
                    Single Leaf P99 Slow Probability (p):
                  </label>
                  <strong className="text-[var(--orange)]">
                    {tailMath.singleSlowPct}%
                  </strong>
                </div>
                <input
                  id="tail-p"
                  type="range"
                  min={1}
                  max={50}
                  value={singleNodeSlowSlider}
                  onChange={(e) =>
                    setSingleNodeSlowSlider(Number(e.target.value))
                  }
                  className="w-full accent-[var(--orange)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono">
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  Single Shard Slow
                </span>
                <strong className="text-sm text-[var(--ink)]">
                  {tailMath.singleSlowPct}%
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  Compound User P99
                </span>
                <strong className="text-sm text-[var(--rose)]">
                  {tailMath.compoundSlowPct}% of reqs
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  With Hedged Reqs
                </span>
                <strong className="text-sm text-[var(--lime)]">
                  {tailMath.hedgedSlowPct}% of reqs
                </strong>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[var(--muted)]">Unhedged User Tail Experience</span>
                  <span className="text-[var(--rose)]">{tailMath.compoundSlowPct}% slow</span>
                </div>
                <div className="h-2.5 bg-[var(--p3)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--rose)]"
                    style={{ width: `${Math.min(100, tailMath.compoundSlowPct)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[var(--muted)]">Hedged Requests (Duplicate sent after P95 wait)</span>
                  <span className="text-[var(--lime)]">
                    {tailMath.hedgedSlowPct}% slow
                  </span>
                </div>
                <div className="h-2.5 bg-[var(--p3)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--lime)]"
                    style={{ width: `${Math.max(2, tailMath.hedgedSlowPct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-[var(--line)] text-xs text-[var(--muted)]">
            <strong className="text-[var(--ink)]">Staff Mitigation:</strong>{' '}
            Send a hedged request to a replica if the primary shard exceeds its P95 threshold, cutting P99 tail latency by 10x for only ~5% extra load.
          </p>
        </article>

        {/* WORKBENCH 5: DISTRIBUTED SAGAS VS. TWO-PHASE COMMIT (2PC) */}
        <article className="bg-[var(--panel)] border border-[var(--line)] rounded-[18px] p-5 sm:p-6 flex flex-col justify-between lg:col-span-2">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-[var(--ink)]">
                  05. Distributed Sagas vs. Two-Phase Commit (2PC)
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Atomicity vs. Availability across microservices: Compare synchronous blocking 2PC with asynchronous compensating Sagas.
                </p>
              </div>
              <span className="text-[10px] font-mono text-[var(--lime)] uppercase tracking-wider px-2 py-0.5 rounded-[6px] bg-[var(--p2)] border border-[var(--line)]">
                Dual-Phase vs Choreography
              </span>
            </div>

            {/* Tab Switcher & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-[var(--p2)] border border-[var(--line)] rounded-[10px] p-1 w-fit">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAnimating) setActiveDistTxTab('2pc');
                  }}
                  className={
                    activeDistTxTab === '2pc'
                      ? 'px-3 py-1.5 text-xs font-mono font-bold rounded-[8px] bg-[var(--lime)] text-[var(--lime-ink)] cursor-pointer'
                      : 'px-3 py-1.5 text-xs font-mono font-bold rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer'
                  }
                >
                  Two-Phase Commit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAnimating) setActiveDistTxTab('saga');
                  }}
                  className={
                    activeDistTxTab === 'saga'
                      ? 'px-3 py-1.5 text-xs font-mono font-bold rounded-[8px] bg-[var(--lime)] text-[var(--lime-ink)] cursor-pointer'
                      : 'px-3 py-1.5 text-xs font-mono font-bold rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer'
                  }
                >
                  Saga Pattern
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                {activeDistTxTab === '2pc' ? (
                  <>
                    <span className="text-[var(--muted)]">Phase:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                        tpcState.phase === 'coordinator-down'
                          ? 'bg-[var(--rose)]/15 border-[var(--rose)]/40 text-[var(--rose)]'
                          : tpcState.phase === 'committed'
                          ? 'bg-[var(--lime)]/15 border-[var(--lime)]/40 text-[var(--lime)]'
                          : tpcState.phase === 'aborted'
                          ? 'bg-[var(--rose)]/15 border-[var(--rose)]/40 text-[var(--rose)]'
                          : tpcState.phase.startsWith('phase')
                          ? 'bg-[var(--cyan)]/15 border-[var(--cyan)]/40 text-[var(--cyan)]'
                          : 'bg-[var(--p2)] border-[var(--line)] text-[var(--muted)]'
                      }`}
                    >
                      {tpcState.phase.toUpperCase()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[var(--muted)]">Execution Flow:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                        sagaState.direction === 'done'
                          ? 'bg-[var(--lime)]/15 border-[var(--lime)]/40 text-[var(--lime)]'
                          : sagaState.direction === 'compensating' ||
                            sagaState.direction === 'compensated'
                          ? 'bg-[var(--rose)]/15 border-[var(--rose)]/40 text-[var(--rose)]'
                          : sagaState.direction === 'forward'
                          ? 'bg-[var(--cyan)]/15 border-[var(--cyan)]/40 text-[var(--cyan)]'
                          : 'bg-[var(--p2)] border-[var(--line)] text-[var(--muted)]'
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
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Normal 2PC
                </button>
                <button
                  type="button"
                  onClick={handleForceVoteNoPayment}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--rose)] text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Force Vote NO on Payment
                </button>
                <button
                  type="button"
                  onClick={handleCrashCoordinator}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--orange)] text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crash Coordinator After Phase 1
                </button>
                {(tpcState.coordinator === 'CRASHED' ||
                  tpcState.phase === 'coordinator-down') && (
                  <button
                    type="button"
                    onClick={handleRecoverCoordinator}
                    disabled={isAnimating}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--cyan)] text-[#0a0d14] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                  >
                    Recover Coordinator
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset2PC}
                  className="px-3 py-1.5 text-xs font-mono text-[var(--muted)] hover:text-[var(--rose)] border border-[var(--line)] rounded-[9px] cursor-pointer hover:border-[var(--rose)] ml-auto"
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
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Normal Saga
                </button>
                <button
                  type="button"
                  onClick={handleFailPaymentSaga}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--orange)] text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fail Payment Service
                </button>
                <button
                  type="button"
                  onClick={handleFailInventorySaga}
                  disabled={isAnimating}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--rose)] text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fail Inventory Service
                </button>
                <button
                  type="button"
                  onClick={handleResetSaga}
                  className="px-3 py-1.5 text-xs font-mono text-[var(--muted)] hover:text-[var(--rose)] border border-[var(--line)] rounded-[9px] cursor-pointer hover:border-[var(--rose)] ml-auto"
                >
                  Reset
                </button>
              </div>
            )}

            {/* SVG Visualizations */}
            {activeDistTxTab === '2pc' ? (
              <svg
                viewBox="0 0 680 260"
                className="w-full h-auto bg-[var(--p2)] border border-[var(--line)] rounded-[12px]"
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
                        {/* Dynamic message label during flight */}
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
                              participant.state === 'ABORTING' ||
                              participant.state === 'ABORTED'
                                ? 'var(--rose)'
                                : 'var(--lime)'
                            }
                            className="font-mono text-[9px] font-bold"
                          >
                            {participant.state === 'ABORTING' ||
                            participant.state === 'ABORTED'
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
                        strokeDasharray={
                          tpcState.coordinator === 'CRASHED' ? '6 4' : undefined
                        }
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
                          fill={
                            participant.locksHeld
                              ? 'var(--orange)'
                              : 'var(--muted)'
                          }
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

                  <text
                    x={15}
                    y={52}
                    fill="var(--muted)"
                    className="font-mono text-[10px]"
                  >
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

                  <text
                    x={15}
                    y={74}
                    fill="var(--muted)"
                    className="font-mono text-[10px]"
                  >
                    Coordinator:
                  </text>
                  <text
                    x={185}
                    y={74}
                    textAnchor="end"
                    fill={
                      tpcState.coordinator === 'CRASHED'
                        ? 'var(--rose)'
                        : 'var(--lime)'
                    }
                    className="font-mono text-[10px] font-bold"
                  >
                    {tpcState.coordinator}
                  </text>

                  <text
                    x={15}
                    y={96}
                    fill="var(--muted)"
                    className="font-mono text-[10px]"
                  >
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

                  <text
                    x={15}
                    y={118}
                    fill="var(--muted)"
                    className="font-mono text-[10px]"
                  >
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

                  <text
                    x={15}
                    y={150}
                    fill="var(--muted)"
                    className="font-mono text-[10px]"
                  >
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

                  <text
                    x={15}
                    y={172}
                    fill="var(--muted)"
                    className="font-mono text-[10px]"
                  >
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

                  <text
                    x={15}
                    y={194}
                    fill="var(--muted)"
                    className="font-mono text-[10px]"
                  >
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

                  {/* Warning banner inside monitor if blocked */}
                  {tpcState.coordinator === 'CRASHED' && (
                    <rect
                      x={10}
                      y={204}
                      width={180}
                      height={22}
                      rx={5}
                      fill="var(--rose)"
                      opacity={0.15}
                    />
                  )}
                  {tpcState.coordinator === 'CRASHED' && (
                    <text
                      x={100}
                      y={219}
                      textAnchor="middle"
                      fill="var(--rose)"
                      className="font-mono text-[9px] font-bold"
                    >
                      ⚠️ PARTICIPANTS BLOCKED
                    </text>
                  )}
                  {tpcState.phase === 'committed' && (
                    <rect
                      x={10}
                      y={204}
                      width={180}
                      height={22}
                      rx={5}
                      fill="var(--lime)"
                      opacity={0.15}
                    />
                  )}
                  {tpcState.phase === 'committed' && (
                    <text
                      x={100}
                      y={219}
                      textAnchor="middle"
                      fill="var(--lime)"
                      className="font-mono text-[9px] font-bold"
                    >
                      ✓ ATOMIC COMMIT CONFIRMED
                    </text>
                  )}
                </g>
              </svg>
            ) : (
              <svg
                viewBox="0 0 680 220"
                className="w-full h-auto bg-[var(--p2)] border border-[var(--line)] rounded-[12px]"
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
                          isAnimating &&
                          sagaState.steps[1].state === 'COMPENSATING'
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
                          isAnimating &&
                          sagaState.steps[0].state === 'COMPENSATING'
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
                  <line
                    x1={0}
                    y1={0}
                    x2={20}
                    y2={0}
                    stroke="var(--lime)"
                    strokeWidth={2}
                  />
                  <text
                    x={26}
                    y={3}
                    fill="var(--muted)"
                    className="font-mono text-[9px]"
                  >
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
                  <text
                    x={396}
                    y={3}
                    fill="var(--muted)"
                    className="font-mono text-[9px]"
                  >
                    Compensating Cascade: Semantic Rollbacks (C2 → C1)
                  </text>
                </g>
              </svg>
            )}

            {/* Architecture Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  Distributed Locking
                </span>
                <strong
                  className={`text-sm ${
                    activeDistTxTab === '2pc' &&
                    tpcState.participants.some((p) => p.locksHeld)
                      ? 'text-[var(--orange)]'
                      : 'text-[var(--lime)]'
                  }`}
                >
                  {activeDistTxTab === '2pc'
                    ? `${tpcState.participants.filter((p) => p.locksHeld).length} / 3 Locks Held`
                    : 'Zero Distributed Locks'}
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  Consistency Model
                </span>
                <strong className="text-sm text-[var(--cyan)]">
                  {activeDistTxTab === '2pc'
                    ? 'Strict ACID (XA)'
                    : 'Eventual Consistency (BASE)'}
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  Fault Behavior
                </span>
                <strong
                  className={`text-sm ${
                    activeDistTxTab === '2pc'
                      ? tpcState.coordinator === 'CRASHED'
                        ? 'text-[var(--rose)]'
                        : 'text-[var(--ink)]'
                      : 'text-[var(--lime)]'
                  }`}
                >
                  {activeDistTxTab === '2pc'
                    ? tpcState.coordinator === 'CRASHED'
                      ? 'Blocked (Unusable)'
                      : 'Vulnerable to SPOF'
                    : 'Non-Blocking (Compensates)'}
                </strong>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                <span className="text-[10px] text-[var(--muted)] block">
                  System Throughput
                </span>
                <strong
                  className={`text-sm ${
                    activeDistTxTab === '2pc'
                      ? 'text-[var(--rose)]'
                      : 'text-[var(--lime)]'
                  }`}
                >
                  {activeDistTxTab === '2pc'
                    ? 'Low (Lock Contention)'
                    : 'High (Local Autonomy)'}
                </strong>
              </div>
            </div>

            {/* Phase Log Display */}
            <div>
              <div className="text-[11px] font-mono text-[var(--muted)] mb-1 flex items-center justify-between">
                <span>Transaction Execution Log</span>
                <span className="text-[10px] text-[var(--soft)]">
                  {activeDistTxTab === '2pc'
                    ? `${tpcState.log.length} entries`
                    : `${sagaState.log.length} entries`}
                </span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] font-mono p-3 rounded-[10px] bg-[var(--p2)] border border-[var(--line)]">
                {(activeDistTxTab === '2pc' ? tpcState.log : sagaState.log).map(
                  (entry, i) => {
                    const colorClass =
                      entry.type === 'success'
                        ? 'text-[var(--lime)]'
                        : entry.type === 'error'
                        ? 'text-[var(--rose)]'
                        : entry.type === 'warning'
                        ? 'text-[var(--orange)]'
                        : 'text-[var(--muted)]';
                    return (
                      <div key={i} className={colorClass}>
                        {entry.text}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-[var(--line)] text-xs text-[var(--muted)]">
            <strong className="text-[var(--ink)]">Staff Trade-Off:</strong>{' '}
            2PC guarantees atomic all-or-nothing across services but blocks participants if the coordinator crashes (violating availability). Sagas trade atomicity for availability—each step commits locally and failures trigger compensating transactions, achieving eventual consistency without distributed locks.
          </p>
        </article>
      </div>
    </div>
  );
};
