export const SWIMLANE_POS: Record<number, [number, number]> = {
  1: [135, 95],
  2: [335, 95],
  3: [535, 95],
  4: [735, 95],
  5: [95, 280],
  6: [263, 280],
  7: [431, 280],
  8: [599, 280],
  9: [767, 280],
  10: [935, 280],
  11: [1103, 280],
  12: [85, 490],
  13: [230, 490],
  14: [375, 490],
  15: [520, 490],
  16: [665, 490],
  17: [810, 490],
  18: [955, 490],
  19: [1100, 490],
  20: [150, 690],
  21: [330, 690],
  22: [510, 690],
  23: [690, 690],
  24: [870, 690],
  25: [1050, 690],
};

export const SWIMLANE_EDGES: [number, number][] = [
  [1, 2], [2, 3], [3, 4], [4, 5], [4, 7], [4, 8],
  [5, 6], [5, 8], [5, 17], [6, 10], [7, 10], [7, 11],
  [8, 9], [8, 12], [8, 19], [9, 12], [9, 13], [9, 18],
  [10, 12], [10, 13], [10, 18], [11, 12], [11, 15], [11, 16],
  [12, 13], [12, 14], [12, 15], [12, 16], [12, 17], [12, 18], [12, 19],
  [13, 20], [13, 21], [14, 15], [14, 20], [15, 21], [15, 25],
  [16, 17], [16, 21], [16, 23], [17, 18], [17, 22], [18, 19],
  [18, 22], [19, 22], [20, 21], [21, 22], [22, 23], [23, 24], [24, 25],
];

export interface SwimlaneLane {
  id: number;
  y: number;
  h: number;
  label: string;
  range: string;
  title: string;
  desc: string;
}

export const SWIMLANE_LANES: SwimlaneLane[] = [
  { id: 1, y: 25, h: 135, label: '01 / FOUNDATIONS', range: '01—04', title: 'Foundations', desc: 'Understand how requests move, what systems promise, and how to size the problem.' },
  { id: 2, y: 195, h: 165, label: '02 / BUILDING BLOCKS', range: '05—11', title: 'Core building blocks', desc: 'Data, caching, traffic distribution, queues, scaling, and fault tolerance.' },
  { id: 3, y: 395, h: 185, label: '03 / ARCHITECTURE & OPERATIONS', range: '12—19', title: 'Architecture & operations', desc: 'Service boundaries, security, observability, cloud, storage, and distributed systems.' },
  { id: 4, y: 610, h: 135, label: '04 / DESIGN & INTERVIEW', range: '20—25', title: 'Design & interview lab', desc: 'Object design, HLD method, case studies, tools, deliberate practice, and mastery.' },
];

export interface ModuleQuiz {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface ModuleInteractiveSupplement {
  flow: string[];
  checks: string[];
  quiz: ModuleQuiz;
}

export const MODULE_SUPPLEMENTS: Record<number, ModuleInteractiveSupplement> = {
  1: {
    flow: ['Client', 'DNS + connect', 'TLS + HTTP', 'Gateway / LB', 'Service + data'],
    checks: [
      'Explain DNS, TCP/QUIC, TLS, and HTTP in order.',
      'Distinguish concurrency from parallelism.',
      'Choose HTTP, SSE, or WebSocket for a product feature.',
    ],
    quiz: {
      question: 'Which statement best describes TCP?',
      options: ['Reliable, ordered byte stream', 'Message queue with exactly-once delivery', 'Encryption protocol', 'Database replication protocol'],
      answerIndex: 0,
      explanation: 'TCP provides reliable, ordered delivery of bytes; it does not define application message boundaries or encryption.',
    },
  },
  2: {
    flow: ['Client', 'API / application', 'Domain modules', 'Database + cache', 'Async workers'],
    checks: [
      'Give one reason to keep a monolith and one to split.',
      'Identify work that belongs on a synchronous request path.',
      'Explain why stateless instances simplify horizontal scaling.',
    ],
    quiz: {
      question: 'Best default for a small product team?',
      options: ['Begin with dozens of microservices', 'Modular monolith until a boundary needs independent operation', 'Keep all state in process memory', 'Make every operation asynchronous'],
      answerIndex: 1,
      explanation: 'A modular monolith preserves boundaries without paying distributed-systems costs prematurely.',
    },
  },
  3: {
    flow: ['User journeys', 'FR + NFR', 'DAU / RPS / peak', 'Storage + bandwidth', 'Design constraints'],
    checks: [
      'Calculate QPS from DAU and requests/user/day.',
      'Estimate annual storage from item volume and size.',
      'Turn “fast and reliable” into p95, availability, and durability targets.',
    ],
    quiz: {
      question: '10M DAU each make 10 requests/day. Approximate average QPS?',
      options: ['~116', '~1,157', '~11,570', '~100,000'],
      answerIndex: 1,
      explanation: '100M requests/day ÷ 86,400 seconds/day ≈ 1,157 requests/second.',
    },
  },
  4: {
    flow: ['Client', 'API contract', 'Auth + validation', 'Service handler', 'Response / event'],
    checks: [
      'Explain why a timed-out payment request may have succeeded.',
      'Choose REST, GraphQL, or gRPC for a scenario.',
      'Compare polling, SSE, and WebSocket.',
    ],
    quiz: {
      question: 'Client times out after POST /payments. Safest retry?',
      options: ['Retry with a new request ID', 'Never retry any POST', 'Retry with the same durable idempotency key', 'Switch to UDP'],
      answerIndex: 2,
      explanation: 'The same key lets the server return the original outcome instead of applying the side effect again.',
    },
  },
  5: {
    flow: ['Access patterns', 'Data model + invariants', 'Primary key + indexes', 'Isolation + transactions', 'Scale strategy'],
    checks: [
      'Choose SQL vs NoSQL from access patterns and invariants.',
      'Explain composite B-tree index prefix ordering.',
      'Describe how read-your-writes consistency handles replica lag.',
    ],
    quiz: {
      question: 'When does a composite B-tree index on (user_id, created_at) help most?',
      options: ['Filtering only by created_at', 'Full-text wildcard regex search', 'Filtering by user_id and sorting by created_at', 'Eliminating write amplification'],
      answerIndex: 2,
      explanation: 'Composite B-tree indexes follow left-prefix ordering: equality on user_id followed by range/sort on created_at scans a contiguous range.',
    },
  },
  6: {
    flow: ['Request', 'Check cache', 'Hit → return fast', 'Miss → single-flight DB read', 'Populate with TTL + jitter'],
    checks: [
      'Compare cache-aside, write-through, and write-back.',
      'Explain how single-flight coalescing prevents cache stampede.',
      'Describe why deleting cache on write is safer than overwriting blindly.',
    ],
    quiz: {
      question: 'What causes a cache stampede (thundering herd)?',
      options: ['Too many Redis replicas', 'Using LRU instead of LFU', 'Setting TTL jitter', 'A hot key expires and thousands of concurrent misses hit the database simultaneously'],
      answerIndex: 3,
      explanation: 'When a popular key expires, concurrent callers miss simultaneously unless request coalescing (single-flight) or early refresh is used.',
    },
  },
  7: {
    flow: ['DNS / Anycast', 'CDN Edge', 'L4 Load Balancer', 'L7 Reverse Proxy / Gateway', 'Healthy App Instances'],
    checks: [
      'Distinguish L4 transport load balancing from L7 application routing.',
      'Explain how consistent hashing with virtual nodes minimizes key movement.',
      'Separate shallow liveness checks from readiness probes.',
    ],
    quiz: {
      question: 'What is the primary advantage of consistent hashing when scaling a stateful cache ring?',
      options: ['Only ~1/N of keys relocate when a node joins or leaves instead of nearly all keys', 'It encrypts all cache keys', 'It eliminates network partitions', 'It replaces DNS'],
      answerIndex: 0,
      explanation: 'Modulo hashing (hash % N) remaps almost every key when N changes; consistent hashing only moves keys adjacent on the ring.',
    },
  },
  8: {
    flow: ['Partition key choice', 'Shard routing', 'Leader / quorum write', 'Async / quorum replication', 'Read consistency policy'],
    checks: [
      'Explain why CAP is a per-operation choice during a partition.',
      'Calculate strict quorum overlap (W + R > N).',
      'Mitigate hot partitions using key salting / write scatter.',
    ],
    quiz: {
      question: 'In a 5-replica quorum system (N=5), which (W, R) pair guarantees overlap between write and read sets?',
      options: ['W=2, R=2', 'W=3, R=3', 'W=1, R=3', 'W=2, R=3'],
      answerIndex: 1,
      explanation: 'W=3, R=3 satisfies W + R > 5 (6 > 5) while also tolerating 2 node failures on both reads and writes.',
    },
  },
  9: {
    flow: ['Producer + Outbox', 'Partitioned Log / Broker', 'Consumer Group', 'Idempotent Handler', 'Ack / Dead-Letter Queue'],
    checks: [
      'Compare Kafka partitioned logs with RabbitMQ message brokers.',
      'Explain why effective exactly-once requires at-least-once delivery + idempotent consumer.',
      'Handle poison messages with bounded retries and a DLQ.',
    ],
    quiz: {
      question: 'Within Apache Kafka, message ordering is guaranteed at what scope?',
      options: ['Globally across the entire cluster', 'Across all topics in a consumer group', 'Within a single partition', 'Ordering is never preserved'],
      answerIndex: 2,
      explanation: 'Kafka appends records sequentially per partition; events sharing a partition key preserve strict relative order.',
    },
  },
  10: {
    flow: ['Measure p50/p95/p99', 'Profile bottleneck', 'Connection pooling + batching', 'Bound queues + load shed', 'Autoscale on leading signals'],
    checks: [
      'Explain tail latency amplification across fan-out dependencies.',
      'Size database connection pools without overwhelming Postgres CPU.',
      'Combine exponential backoff, full jitter, and retry budgets.',
    ],
    quiz: {
      question: 'Why does unbounded queueing in front of a saturated service hurt reliability?',
      options: ['It reduces memory usage', 'It makes p99 faster than p50', 'It bypasses TLS', 'Every caller waits until timeout and retries, multiplying load and exhausting threads'],
      answerIndex: 3,
      explanation: 'Unbounded queues turn transient spikes into prolonged high latency for all requests; bounded queues + load shedding protect healthy traffic.',
    },
  },
  11: {
    flow: ['Redundant instances', 'Timeouts + bounded retries', 'Circuit breaker + bulkhead', 'Graceful degradation', 'Tested backup / failover'],
    checks: [
      'Distinguish RPO (data loss window) from RTO (recovery time).',
      'Walk through Closed → Open → Half-Open circuit breaker states.',
      'Isolate non-critical dependencies with bulkheads.',
    ],
    quiz: {
      question: 'What is the difference between RPO and RTO?',
      options: ['RPO is max tolerable data-loss age; RTO is max tolerable time to restore service', 'They are identical metrics', 'RPO measures p99 latency; RTO measures QPS', 'RPO is for caches; RTO is for DNS'],
      answerIndex: 0,
      explanation: 'Recovery Point Objective (RPO) measures how much recent data can be lost; Recovery Time Objective (RTO) measures downtime duration.',
    },
  },
  12: {
    flow: ['API Gateway', 'Service boundary', 'Local DB + Outbox', 'Orchestrated / Choreographed Saga', 'Compensating action'],
    checks: [
      'Contrast two-phase commit (2PC) with Saga compensating transactions.',
      'Explain the Transactional Outbox pattern for atomic DB + event emission.',
      'Justify when CQRS is warranted vs unnecessary complexity.',
    ],
    quiz: {
      question: 'How does the Transactional Outbox pattern avoid dual-write inconsistency?',
      options: ['By writing to Kafka first and ignoring DB errors', 'By disabling database transactions', 'By inserting both the business row and outbox event in a single local DB transaction, then relaying asynchronously', 'By using sticky sessions'],
      answerIndex: 2,
      explanation: 'A local ACID transaction guarantees the business state and outbox record commit together; a relay publishes to the broker with at-least-once semantics.',
    },
  },
  13: {
    flow: ['Identity / OAuth2', 'Edge WAF + Rate Limit', 'mTLS + RBAC / ABAC', 'Parameterized Queries', 'KMS Secrets + Audit Log'],
    checks: [
      'Distinguish authentication (who you are) from authorization (what you can access).',
      'Compare Token Bucket vs Sliding Window rate limiting.',
      'Explain envelope encryption with KMS data keys.',
    ],
    quiz: {
      question: 'What vulnerability occurs when an endpoint checks that a JWT is valid but fails to verify the caller owns the requested resource ID?',
      options: ['Broken Object-Level Authorization (BOLA / IDOR)', 'SQL Injection', 'Cross-Site Scripting', 'DNS Spoofing'],
      answerIndex: 0,
      explanation: 'Valid authentication proves identity, not resource ownership; every data access must authorize the principal against the target object.',
    },
  },
  14: {
    flow: ['Domain Invariants', 'Bounded Contexts', 'Clean / Hexagonal Ports', 'Contract / Integration Tests', 'Canary + Feature Flag Rollout'],
    checks: [
      'Keep domain logic independent of transport and ORM frameworks.',
      'Separate schema migration from code deployment (expand-and-contract).',
      'Use canary analysis and feature flags for instant rollback.',
    ],
    quiz: {
      question: 'How do you safely rename or drop a database column in zero-downtime production?',
      options: ['Run ALTER TABLE DROP COLUMN immediately during peak traffic', 'Stop all servers for 30 minutes', 'Delete the table and recreate it', 'Use expand-and-contract across multiple deployments so old and new code coexist safely'],
      answerIndex: 3,
      explanation: 'Expand-and-contract adds the new column first, dual-writes/backfills, switches reads, and drops the old column only after no running code references it.',
    },
  },
  15: {
    flow: ['Structured Logs', 'RED / USE Metrics', 'OpenTelemetry Traces', 'SLI / SLO Error Budget', 'Symptom-Based Alert + Runbook'],
    checks: [
      'Connect logs, metrics, and distributed traces via trace_id.',
      'Distinguish SLIs, SLOs, and contractual SLAs.',
      'Alert on user-visible symptoms and burn rate rather than noisy CPU spikes.',
    ],
    quiz: {
      question: 'Why must Prometheus metric labels avoid high-cardinality values like raw user_id or request_id?',
      options: ['Prometheus does not support strings', 'Each unique label combination creates a new time-series, exhausting memory and index capacity', 'It slows down DNS resolution', 'It disables TLS'],
      answerIndex: 1,
      explanation: 'High-cardinality identifiers belong in structured logs and trace spans; metric labels should remain bounded (status_code, route, region).',
    },
  },
  16: {
    flow: ['Immutable Container Image', 'Multi-AZ Orchestration', 'Readiness / Liveness Probes', 'Declarative Terraform IaC', 'FinOps Cost Per Request'],
    checks: [
      'Place stateful replicas across availability zones (AZs).',
      'Explain why readiness probes should not cascade when an optional dependency slows down.',
      'Identify cross-AZ and NAT egress cost drivers.',
    ],
    quiz: {
      question: 'What happens if a Kubernetes liveness probe checks a slow downstream database?',
      options: ['The database scales automatically', 'Traffic routes to CDN', 'Pods get restarted repeatedly in a crash loop, amplifying the outage instead of recovering', 'Latency drops to zero'],
      answerIndex: 2,
      explanation: 'Liveness probes should only verify the local process is not deadlocked; restarting healthy pods during a downstream DB slowdown causes cascading failure.',
    },
  },
  17: {
    flow: ['Presigned URL Upload', 'Object Storage (S3)', 'Metadata DB + Async Worker', 'Search / Analytics Index', 'Lifecycle Tiering'],
    checks: [
      'Keep large binary blobs in object storage rather than relational tables.',
      'Use presigned URLs so file bytes bypass application servers.',
      'Sync search and warehouse stores asynchronously via CDC or events.',
    ],
    quiz: {
      question: 'Why are presigned URLs preferred for large client video or image uploads?',
      options: ['Clients upload bytes directly to object storage without tying up application server threads and bandwidth', 'They compress video in the browser', 'They bypass authentication', 'They store blobs inside PostgreSQL'],
      answerIndex: 0,
      explanation: 'The application authenticates and authorizes the upload once, issuing a short-lived signed URL so heavy byte transfer goes straight to object storage.',
    },
  },
  18: {
    flow: ['Ingestion / Event Write', 'Hybrid Fan-Out Router', 'Realtime Gateway (WS/SSE)', 'Cursor Pagination + Ranking', 'Deduplicated Notification'],
    checks: [
      'Combine push fan-out-on-write for normal users with pull fan-out-on-read for high-follower accounts.',
      'Use keyset/cursor pagination instead of deep OFFSET.',
      'Track per-conversation monotonic sequence numbers and client acks in chat.',
    ],
    quiz: {
      question: 'Why does pure fan-out-on-write struggle when a celebrity with 50M followers posts?',
      options: ['Read latency becomes too slow', 'WebSockets stop working', 'Object storage runs out of space', 'A single post triggers 50M asynchronous timeline writes, creating massive write amplification and queue lag'],
      answerIndex: 3,
      explanation: 'Hybrid fan-out pushes to normal followers on write while merging celebrity posts on read.',
    },
  },
  19: {
    flow: ['Logical / Hybrid Clocks', 'Raft / Paxos Consensus', 'Fencing Token Lock', 'Multi-Region Routing', 'Conflict / Invariant Resolution'],
    checks: [
      'Explain why wall clocks (NTP) cannot safely order distributed events.',
      'Use Raft/etcd for control-plane metadata rather than every high-QPS data write.',
      'Include monotonic fencing tokens when distributed locks guard storage.',
    ],
    quiz: {
      question: 'How does a fencing token protect a storage resource when a lock holder experiences a long GC pause?',
      options: ['It prevents garbage collection', 'It synchronizes NTP clocks', 'Storage rejects any write carrying a token lower than the highest token already seen', 'It disables lock expiration'],
      answerIndex: 2,
      explanation: 'If Client 1 pauses past its lease expiry and Client 2 acquires token 34, storage rejects Client 1’s delayed write carrying stale token 33.',
    },
  },
  20: {
    flow: ['Clarify Entities & Rules', 'Define Interfaces / Strategy', 'Explicit State Machine', 'Thread Safety & Idempotency', 'Edge-Case Unit Tests'],
    checks: [
      'Model domain entities, responsibilities, and explicit state transitions.',
      'Apply Strategy, Factory, or Decorator only where variation exists.',
      'Guard concurrent mutations with fine-grained locks or atomic compare-and-swap.',
    ],
    quiz: {
      question: 'In a Low-Level Design (LLD) interview for a booking or payment component, what prevents invalid lifecycle transitions?',
      options: ['An explicit state machine enforcing allowed transitions and invariants', 'Global mutable booleans', 'Adding more threads', 'Storing everything as untyped strings'],
      answerIndex: 0,
      explanation: 'Explicit state machines define legal transitions (e.g., CREATED -> AUTHORIZED -> CAPTURED) and reject out-of-order or duplicate events.',
    },
  },
  21: {
    flow: ['Clarify', 'Estimate', 'API + data', 'Baseline design', 'Deep dive + trade-offs'],
    checks: [
      'Run the 45-minute sequence without notes.',
      'For each component, state the requirement it serves.',
      'Name an alternative and cost for your most important decision.',
    ],
    quiz: {
      question: 'What should happen before drawing architecture?',
      options: ['Choose a database vendor', 'Add a message queue', 'Clarify scope and quality requirements', 'Optimise for one billion users'],
      answerIndex: 2,
      explanation: 'Requirements define what architecture must achieve; estimates and design follow.',
    },
  },
  22: {
    flow: ['Requirements + invariant', 'Critical path', 'Storage + messaging', 'Scale + failure design', 'Trade-off summary'],
    checks: [
      'Sketch URL shortener write and redirect paths.',
      'Explain a hybrid feed strategy.',
      'Name the correctness invariant for payments and seat booking.',
    ],
    quiz: {
      question: 'Which concern is central to payment design?',
      options: ['Only low-latency reads', 'A CDN for every write', 'Eventual consistency for balances', 'Idempotency, durable ledger, and reconciliation'],
      answerIndex: 3,
      explanation: 'Financial workflows need duplicate protection, auditable records, and reconciliation with payment rails.',
    },
  },
  23: {
    flow: ['Requirement', 'Primitive', 'Candidate tool', 'Prototype + measure', 'ADR + operate'],
    checks: [
      'Map each tool to the problem it solves.',
      'Explain why technologies increase operating cost.',
      'Write a one-page ADR for a design choice.',
    ],
    quiz: {
      question: 'Best reason to add Kafka?',
      options: ['Need retained events, replay, or decoupled consumers', 'Make architecture look scalable', 'Every backend needs Kafka', 'Remove database transactions'],
      answerIndex: 0,
      explanation: 'Choose technology after a requirement; Kafka is useful when its log, partition, and consumer model solve a real problem.',
    },
  },
  24: {
    flow: ['Study', 'Recall', 'Design / build', 'Measure / break', 'Explain + revise'],
    checks: [
      'Complete one design without notes.',
      'Add a measurable load test to a project.',
      'Write an ADR and a failure runbook.',
    ],
    quiz: {
      question: 'Strongest evidence you understand a design?',
      options: ['You watched the full playlist', 'You memorised a company diagram', 'You can adapt it when requirements change and defend the trade-off', 'You know every cloud product name'],
      answerIndex: 2,
      explanation: 'Transfer and adaptation reveal understanding much better than diagram recall.',
    },
  },
  25: {
    flow: ['Clarify + align', 'Choose + justify', 'Deep dive', 'Challenge assumptions', 'Summarise + validate'],
    checks: [
      'Explain one choice with reason, cost, and revisit trigger.',
      'Name the two highest-risk failure modes.',
      'Summarise a 45-minute design in two minutes.',
    ],
    quiz: {
      question: 'Which statement demonstrates design judgement?',
      options: ['I always use microservices', 'This is how a famous company does it', 'We can scale infinitely', 'I choose this for the requirement; this is the cost and revisit condition'],
      answerIndex: 3,
      explanation: 'Strong answers connect constraints to choices, state costs, and identify what would change the decision.',
    },
  },
};

export type Flashcard = [term: string, definition: string];

export const FLASHCARD_DECK: Flashcard[] = [
  ['Latency vs throughput', 'Latency is time per operation; throughput is completed work per unit time. Measure percentiles because tail latency reveals queueing and dependency problems.'],
  ['Availability vs durability', 'Availability is whether a service responds; durability is whether acknowledged data survives defined failures. A service can be available but lose data, or durable but temporarily unavailable.'],
  ['CAP theorem', 'During a network partition, a distributed data system cannot provide both linearizable consistency and availability for every operation. Decide which operations reject, defer, or serve stale data.'],
  ['Idempotency', 'Repeating an operation has the same intended effect as performing it once. Use durable idempotency keys for retryable side effects such as payments.'],
  ['Cache stampede', 'Many callers miss one expired hot key and hit the source simultaneously. Use single-flight/request coalescing, TTL jitter, or early refresh.'],
  ['Read replica lag', 'A replica may not yet contain a recent write. Use read-your-writes routing or stronger consistency for flows that require it.'],
  ['Kafka ordering', 'Kafka ordering is per partition. Key related events to the same partition when their relative order matters.'],
  ['At-least-once delivery', 'Messages may arrive more than once. Make consumer side effects idempotent or deduplicate by stable event ID.'],
  ['RPO vs RTO', 'RPO is the acceptable data-loss window. RTO is the target time to restore service. Test both through actual recovery procedures.'],
  ['SLO vs SLA', 'SLO is an internal reliability target; SLA is an external customer commitment that may include remedies. SLI is the measured indicator.'],
  ['L4 vs L7 load balancing', 'L4 routes using network/transport information; L7 understands application protocols and can route by host, path, or headers.'],
  ['SQL vs NoSQL', 'Choose from access patterns, invariants, transactions, partitioning, consistency, and operational capability—not slogans about scale.'],
  ['Outbox pattern', 'Write business state and an event row in one local transaction; publish later. Consumers still handle duplicates.'],
  ['Circuit breaker', 'Closed allows calls; open fails fast after a threshold; half-open probes recovery. Use with timeouts and bulkheads.'],
  ['Fan-out on write', 'Precompute recipients’ feeds when a post arrives: fast reads, expensive writes for high-follower accounts.'],
  ['Fan-out on read', 'Fetch/merge content when a user opens the feed: cheap writes, more read-time work. Hybrid is common for skewed follower counts.'],
  ['Strong vs eventual consistency', 'Strong consistency gives a current ordered view under a defined model; eventual consistency allows temporary staleness but replicas converge if updates stop.'],
  ['Presigned URL', 'A short-lived, scoped bearer capability lets a client transfer bytes directly to object storage. Verify the object after upload.'],
  ['Backpressure', 'Slow or reject producers when downstream consumers cannot keep up, preventing unbounded queues and resource exhaustion.'],
  ['Design interview signal', 'For every choice: state the requirement, why the choice fits, its cost, and what changed assumption would make you revisit it.'],
  ['Raft consensus', 'A leader-based consensus algorithm providing linearizable distributed state replication. Tolerates up to (N-1)/2 node failures by requiring a majority quorum (N/2 + 1) for both leader election and log entry commit.'],
  ['LSM-tree vs B+tree', 'B+trees update disk pages in-place, optimizing for fast O(log N) point and range reads. LSM-trees append writes sequentially to an in-memory MemTable and immutable disk SSTables, maximizing write throughput at the cost of background compaction and read amplification.'],
  ['Bloom filter', 'A space-efficient probabilistic bit array that tests set membership with zero false negatives and a configurable false positive rate. Used in front of disk reads (LSM SSTables, Cassandra, Redis) to skip querying keys that do not exist.'],
  ['Double-entry ledger', 'A financial accounting pattern where every transaction creates at least two immutable balancing entries (Debit and Credit) summing to exactly zero. Balances are derived by summing immutable journal entries rather than updating a mutable balance column.'],
  ['Geospatial H3 hexagons', 'Uber’s discrete global grid system that partitions the Earth into hexagonal cells. Unlike square geohashes where diagonals are 1.41x further, all 6 neighbors of an H3 hexagon share identical center distances, making radius searches uniform.'],
  ['Fencing tokens', 'A monotonically increasing counter issued by a distributed lock manager (e.g., Zookeeper/etcd). Storage systems reject stale writes from paused clients (e.g., during long GC pauses) whose fencing token is lower than the current highest token seen.'],
];

export interface StudyPlanWeek {
  wk: string;
  title: string;
  desc: string;
}

export const EIGHT_WEEK_PLAN: StudyPlanWeek[] = [
  { wk: 'WK 01', title: 'Request path + requirements', desc: 'Modules 01–04. Draw a request lifecycle; estimate QPS, storage, and bandwidth. Design a basic Pastebin.' },
  { wk: 'WK 02', title: 'Data + caching', desc: 'Modules 05–06. Model access patterns, indexes, cache-aside, invalidation, and stampede protection.' },
  { wk: 'WK 03', title: 'Traffic + distributed foundations', desc: 'Modules 07–08. Load balancing, replication, consistency, partitioning, and failure assumptions.' },
  { wk: 'WK 04', title: 'Queues + performance + resilience', desc: 'Modules 09–11. Design async workflows and explain what happens when dependencies fail.' },
  { wk: 'WK 05', title: 'Service architecture + security', desc: 'Modules 12–14. Compare modular monolith and services; model auth, boundaries, and transactions.' },
  { wk: 'WK 06', title: 'Production + data at scale', desc: 'Modules 15–19. SLOs, cloud, object storage, chat/feed design, consensus, and multi-region.' },
  { wk: 'WK 07', title: 'LLD + HLD case studies', desc: 'Modules 20–23. Implement two LLDs and design URL shortener, feed, chat, and payments.' },
  { wk: 'WK 08', title: 'Interview simulation', desc: 'Modules 24–25. Do timed mocks, record gaps, revise trade-offs, and repeat the weakest design.' },
];

export interface HldInterviewStep {
  step: string;
  title: string;
  desc: string;
}

export const HLD_INTERVIEW_LOOP: HldInterviewStep[] = [
  { step: '00–05', title: 'Clarify the problem', desc: 'Users, core flows, scope boundaries, and measurable quality goals.' },
  { step: '05–09', title: 'Estimate the load', desc: 'DAU, reads/writes, average and peak QPS, storage, bandwidth.' },
  { step: '09–14', title: 'API + data model', desc: 'Contracts, entities, keys, indexes, and access patterns.' },
  { step: '14–24', title: 'Baseline architecture', desc: 'Draw the simplest viable design; trace read and write paths end to end.' },
  { step: '24–38', title: 'Deep dive + evolve', desc: 'Pick one or two hard parts: partitioning, consistency, fan-out, rate limiting, or recovery.' },
  { step: '38–45', title: 'Trade-offs + wrap-up', desc: 'State bottlenecks, failure modes, observability, cost, and next steps.' },
];

export interface ReferenceResource {
  tag: string;
  title: string;
  desc: string;
  url: string;
  domain: string;
}

export const REFERENCE_LIBRARY: ReferenceResource[] = [
  { tag: 'Open source · Handbook', title: 'System Design Primer', desc: 'Broad topic map, interview prompts, and design exercises. Excellent for structured revision.', url: 'https://github.com/donnemartin/system-design-primer', domain: 'github.com/donnemartin/system-design-primer' },
  { tag: 'Google · Reliability', title: 'Site Reliability Engineering', desc: 'SLIs, SLOs, error budgets, monitoring, incident response, and reliable services.', url: 'https://sre.google/sre-book/table-of-contents/', domain: 'sre.google/sre-book' },
  { tag: 'AWS · Engineering', title: 'AWS Builders’ Library', desc: 'Real engineering lessons on timeouts, retries, idempotency, overload, and distributed systems.', url: 'https://aws.amazon.com/builders-library/', domain: 'aws.amazon.com/builders-library' },
  { tag: 'Apache · Streaming', title: 'Kafka Documentation', desc: 'Partitions, consumer groups, ordering, replication, offsets, and delivery guarantees.', url: 'https://kafka.apache.org/documentation/', domain: 'kafka.apache.org/documentation' },
  { tag: 'PostgreSQL · Database', title: 'PostgreSQL Documentation', desc: 'Indexes, transactions, MVCC, isolation, query plans, and operational behavior.', url: 'https://www.postgresql.org/docs/current/', domain: 'postgresql.org/docs/current' },
  { tag: 'Redis · Caching', title: 'Redis Documentation', desc: 'Data structures, eviction policies, persistence, replication, and caching primitives.', url: 'https://redis.io/docs/latest/', domain: 'redis.io/docs/latest' },
  { tag: 'MDN · Networking', title: 'HTTP Reference', desc: 'Methods, status codes, caching, headers, HTTP versions, and browser request behavior.', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', domain: 'developer.mozilla.org/en-US/docs/Web/HTTP' },
  { tag: 'OpenTelemetry · Observability', title: 'OpenTelemetry Docs', desc: 'Vendor-neutral instrumentation, traces, metrics, logs, and context propagation.', url: 'https://opentelemetry.io/docs/', domain: 'opentelemetry.io/docs' },
  { tag: 'Practice · Interview method', title: 'Hello Interview', desc: 'Structured walkthroughs and practice prompts for communicating a design under time pressure.', url: 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction', domain: 'hellointerview.com' },
];
