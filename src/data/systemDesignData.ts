import { WhiteboardNode, WhiteboardEdge } from '../utils/systemPhysics';

export interface KnowledgeModule {
  id: number;
  cat: 1 | 2 | 3 | 4;
  catName: string;
  code: string;
  title: string;
  x: number;
  y: number;
  deps: number[];
  mental: string;
  diagram: string;
  points: { label: string; text: string }[];
  table: string[][];
  signal: string;
}

export const MODULES: KnowledgeModule[] = [
  {
    id: 1,
    cat: 1,
    catName: 'Foundation',
    code: '01',
    title: 'CS Fundamentals',
    x: 50,
    y: 45,
    deps: [],
    mental: 'Every high-level distributed bottleneck eventually reduces to CPU cycles, memory bandwidth, disk IOPS, or network packets.',
    diagram: `Browser ──DNS(UDP:53)──► IP
  └──TCP SYN/SYN-ACK/ACK (1 RTT)
       └──TLS 1.3 Handshake (1 RTT / 0-RTT)
            └──HTTP/2 Multiplexed Streams ──► Kernel Socket Buffer`,
    points: [
      {
        label: 'TCP vs UDP vs QUIC',
        text: 'TCP guarantees order and reliability but suffers from Head-of-Line (HoL) blocking. HTTP/3 uses QUIC over UDP to multiplex streams without TCP HoL blocking.',
      },
      {
        label: 'L4 vs L7 Proxying',
        text: 'L4 (Transport) routes by IP and Port (NAT/TCP fast packet forwarding). L7 (Application) terminates TLS and parses HTTP headers, cookies, and URI paths.',
      },
      {
        label: 'Threads vs Event Loop',
        text: 'OS threads share heap memory (context switch ~1–2µs). Event loops (Node/Nginx) use non-blocking epoll/kqueue to handle 100k+ concurrent sockets on a single thread.',
      },
    ],
    table: [
      ['Protocol', 'Transport', 'Best For'],
      ['HTTP/1.1', 'TCP', 'Legacy REST APIs'],
      ['HTTP/2', 'TCP', 'Multiplexed internal APIs'],
      ['HTTP/3 (QUIC)', 'UDP', 'Mobile & lossy edge networks'],
      ['WebRTC', 'UDP', 'P2P low-latency video/audio'],
    ],
    signal: 'Mentioning TCP Head-of-Line blocking versus HTTP/3 QUIC and kernel epoll/kqueue immediately distinguishes you from junior candidates.',
  },
  {
    id: 2,
    cat: 1,
    catName: 'Foundation',
    code: '02',
    title: 'System Design Paradigms',
    x: 50,
    y: 145,
    deps: [1],
    mental: 'Architecture is the art of choosing which problems you want to have. Everything is an explicit trade-off.',
    diagram: `[Client] ──► [Stateless App Tier (Auto-scaled)]
                  │                   │
          (Sync RPC/REST)      (Async Event Bus)
                  ▼                   ▼
           [Primary DB]        [Worker Fleet]`,
    points: [
      {
        label: 'Modular Monolith vs Microservices',
        text: 'Start with a Modular Monolith (single deployment, strict domain boundaries). Split into microservices only when team scaling or independent compute scaling demands it.',
      },
      {
        label: 'Stateless Compute Tier',
        text: 'Never store session state in local process memory. Push session state to Redis or PostgreSQL so any instance can serve any request.',
      },
      {
        label: 'Sync vs Async Decoupling',
        text: 'Synchronous calls multiply tail latencies across hops. Use asynchronous queues to decouple slow downstream work from user-facing HTTP responses.',
      },
    ],
    table: [
      ['Style', 'Strength', 'Hidden Cost'],
      ['Modular Monolith', 'ACID joins, zero network overhead', 'Deployment contention at >50 engineers'],
      ['Microservices', 'Independent scale & fault isolation', 'Distributed sagas, network serialization'],
      ['Serverless', 'Scale to zero, minimal ops', 'Cold starts, expensive at steady high QPS'],
    ],
    signal: 'Never jump straight to 15 microservices. State: "We start with a stateless service tier and split only along high-load or organizational boundaries."',
  },
  {
    id: 3,
    cat: 1,
    catName: 'Foundation',
    code: '03',
    title: 'Requirements & Estimation',
    x: 50,
    y: 245,
    deps: [2],
    mental: 'Estimation is not about exact precision—it is about identifying whether your bottleneck is CPU, Bandwidth, IOPS, or Storage.',
    diagram: `100M DAU × 20 reads/day = 2B reads/day
2,000,000,000 / 100,000 sec = 20,000 Read QPS (Peak ~60k QPS)
1 Single Postgres Node ≈ 5k–12k QPS ──► Needs Cache + Read Replicas`,
    points: [
      {
        label: 'Functional vs Non-Functional',
        text: 'Functional defines user behaviors. Non-Functional defines Latency (P99 < 100ms), Availability (99.99%), Consistency (Linearizable vs Eventual), and Durability.',
      },
      {
        label: "Little's Law (L = λW)",
        text: 'Concurrency (L) = Arrival Rate (λ) × Wait Time (W). At 10,000 QPS with 500ms downstream latency, you hold 5,000 concurrent open connections.',
      },
      {
        label: 'Tail Latency Amplification',
        text: 'If a request fans out to 10 services each with a 1% chance of slow P99, the user sees a slow response 1 - (0.99)^10 ≈ 9.6% of the time.',
      },
    ],
    table: [
      ['Component', 'Rough Single-Node Max', 'Primary Bottleneck'],
      ['Redis (1 shard)', '~100,000+ QPS', 'Single-core CPU / NIC'],
      ['PostgreSQL (1 leader)', '~10,000–15,000 QPS', 'Disk IOPS / Lock contention'],
      ['Kafka (1 broker)', '~150,000+ msg/sec', 'Sequential disk / NIC bandwidth'],
    ],
    signal: 'Translate raw QPS into concrete hardware decisions: "At 40k write QPS, a single SQL leader will hit a disk IOPS wall—we must shard or buffer via Kafka."',
  },
  {
    id: 4,
    cat: 1,
    catName: 'Foundation',
    code: '04',
    title: 'Networking & APIs',
    x: 50,
    y: 345,
    deps: [1, 2],
    mental: 'Choose the wire protocol based on payload frequency, schema strictness, and directionality.',
    diagram: `Polling:      Client ──(req every 2s)──► Server (High header overhead)
SSE:          Client ◄══(HTTP Stream)═══ Server (1-way: AI tokens, tickers)
WebSocket:    Client ◄══(TCP Duplex)════► Server (2-way: Chat, Multiplayer)
gRPC:         Service A ◄═(Protobuf/HTTP2)═► Service B (East-West RPC)`,
    points: [
      {
        label: 'Idempotency Keys',
        text: 'Mutating POST/PATCH requests must carry an Idempotency-Key: UUID header stored in Redis/DB so client retries never double-charge.',
      },
      {
        label: 'REST vs GraphQL vs gRPC',
        text: 'Public CRUD uses REST. Mobile clients with nested graphs use GraphQL (solve N+1 with DataLoader). Internal East-West microservices use gRPC (Protobuf binary is ~5x faster).',
      },
      {
        label: 'Connection Pooling & mTLS',
        text: 'Opening TCP+TLS takes ~2 RTTs. Use persistent connection pools (PgBouncer/Envoy) to avoid exhausting ephemeral ports.',
      },
    ],
    table: [
      ['Pattern', 'Direction', 'Primary Use Case'],
      ['Long Polling', 'Simulated Push', 'Simple notification fallback'],
      ['SSE (Server-Sent Events)', 'Server → Client', 'LLM token streaming, live scores'],
      ['WebSockets', 'Bi-directional', 'Real-time chat, collaborative canvas'],
    ],
    signal: 'For LLM token streaming or stock tickers, propose Server-Sent Events (SSE) over WebSockets—SSE runs over standard HTTP/2 and load-balances effortlessly.',
  },
  {
    id: 5,
    cat: 2,
    catName: 'Building Blocks',
    code: '05',
    title: 'Database Internals',
    x: 235,
    y: 45,
    deps: [1, 3],
    mental: 'B+Trees optimize for reads (page-aligned disk seeks). LSM-Trees optimize for writes (append-only sequential I/O).',
    diagram: `B+Tree (Postgres/MySQL):  In-place 8KB page updates + WAL (Fast Reads)
LSM-Tree (Cassandra/RocksDB):
[Write] ──► MemTable (RAM) + WAL ──flush──► SSTables (Disk) ──► Compaction`,
    points: [
      {
        label: 'B+Tree vs LSM-Tree',
        text: 'B+Trees update 8KB/16KB disk pages in-place (ideal for point/range reads). LSM-Trees append to an in-memory MemTable and flush immutable SSTables to disk, using Bloom Filters to skip missing keys.',
      },
      {
        label: 'MVCC & Isolation Levels',
        text: 'Databases avoid read-locks using Multi-Version Concurrency Control. Know Dirty Read, Non-Repeatable Read, Phantom Read, and Write Skew (prevented by Serializable / SELECT FOR UPDATE).',
      },
      {
        label: 'Write-Ahead Log (WAL)',
        text: 'Every transaction is appended to a sequential disk log fsynced before acknowledging the client, enabling crash recovery.',
      },
    ],
    table: [
      ['Engine', 'Storage Structure', 'Sweet Spot'],
      ['PostgreSQL', 'B+Tree + Heap MVCC', 'ACID, complex joins, geospatial (PostGIS)'],
      ['Scylla / Cassandra', 'LSM-Tree (Leaderless)', 'Massive write throughput, chat, time-series'],
      ['DynamoDB', 'B-Tree + Partitioned KV', 'Predictable single-digit ms latency at scale'],
    ],
    signal: 'When designing high-ingestion systems (IoT, Chat, Logs), explicitly choose an LSM-Tree DB (Cassandra/Scylla) over B+Tree SQL to avoid random disk I/O amplification.',
  },
  {
    id: 6,
    cat: 2,
    catName: 'Building Blocks',
    code: '06',
    title: 'Caching Strategies',
    x: 235,
    y: 110,
    deps: [5],
    mental: 'The fastest database query is the one you never make. But cache invalidation and stampedes bring down production.',
    diagram: `Cache-Aside: App ──1.Read──► Redis (MISS) ──2.Query──► DB ──3.Populate──► Redis
Stampede Fix: 10,000 reqs hit expired key ──► Singleflight Mutex acquires 1 DB query`,
    points: [
      {
        label: 'Read/Write Cache Patterns',
        text: 'Cache-Aside (lazy, resilient to cache down), Write-Through (stronger consistency, slower writes), Write-Back (write to Redis, async batch flush to DB—used for like/view counters).',
      },
      {
        label: 'Cache Stampede (Thundering Herd)',
        text: 'When a hot celebrity key expires, 50k concurrent requests miss Redis and crush Postgres. Fix with Singleflight request coalescing, logical expiry, or jittered TTL.',
      },
      {
        label: 'Cache Penetration',
        text: 'Attackers query non-existent IDs (id=-999), bypassing cache. Fix with a Bloom Filter or caching NULL tombstones with a short TTL.',
      },
    ],
    table: [
      ['Anomaly', 'Root Cause', 'Architectural Fix'],
      ['Stampede', 'Hot key TTL expires under load', 'Singleflight request coalescing + logical expiry'],
      ['Penetration', 'Queries for non-existent keys', 'Bloom Filter in front of cache / cache NULLs'],
      ['Avalanche', 'Many keys expire at exact same second', 'Add random jitter to all TTLs'],
    ],
    signal: 'Never just say "put Redis in front of the DB." Specify the pattern (Cache-Aside), eviction policy (allkeys-lru), and how you prevent Cache Stampede.',
  },
  {
    id: 7,
    cat: 2,
    catName: 'Building Blocks',
    code: '07',
    title: 'Load Balancing & Proxies',
    x: 235,
    y: 175,
    deps: [4],
    mental: 'Load balancers are the shock absorbers of your architecture—routing traffic across DNS, Anycast L4, and L7 Envoy tiers.',
    diagram: `[User] ──► Geo-DNS / Anycast BGP
              └──► L4 LB (Maglev / AWS NLB - Fast Packet Forwarding)
                     └──► L7 LB (Envoy / Nginx - TLS Term, Rate Limit)
                            └──► App Pods`,
    points: [
      {
        label: 'Two-Tier Load Balancing',
        text: 'Hyperscalers use L4 LBs at the edge (ECMP + Consistent Hashing like Google Maglev) forwarding to L7 Reverse Proxies (Envoy/HAProxy) that terminate TLS and inspect HTTP.',
      },
      {
        label: 'Power of Two Random Choices (P2C)',
        text: 'Pick 2 random backend nodes and send the request to the one with fewer active connections—avoiding herd behavior of strict least-connections.',
      },
      {
        label: 'Active vs Passive Health Checks',
        text: 'Passive health checking trips a circuit breaker when 5xx errors spike; Active health checking pings /healthz out-of-band.',
      },
    ],
    table: [
      ['Layer', 'Inspects', 'Trade-Off'],
      ['L4 (NLB / Maglev)', 'IP + TCP/UDP Port', 'Millions of packets/sec, zero TLS overhead'],
      ['L7 (ALB / Envoy)', 'HTTP Headers, URI, Cookies', 'Smart routing, gRPC-aware, higher CPU cost'],
    ],
    signal: 'Mentioning "Power of Two Random Choices" (used by Nginx and Envoy) for load balancing across stateless workers shows deep systems awareness.',
  },
  {
    id: 8,
    cat: 2,
    catName: 'Building Blocks',
    code: '08',
    title: 'Distributed Systems Core',
    x: 235,
    y: 240,
    deps: [5, 7],
    mental: 'Physical clocks drift, networks partition, and processes pause for GC. Design assuming everything fails concurrently.',
    diagram: `PACELC Theorem:
If Partition (P) ──► Choose Availability (A) or Consistency (C)
Else (Normal E)  ──► Choose Latency (L) or Consistency (C)
Quorum (N=3): Write W=2 [N1,N2] + Read R=2 [N2,N3] ──► N2 Overlap!`,
    points: [
      {
        label: 'CAP & PACELC Theorems',
        text: 'During a partition, choose CP (fail requests to prevent split-brain—Payments/Inventory) or AP (serve available data—Feeds). Even without partitions, PACELC trades Latency vs Consistency.',
      },
      {
        label: 'Replication Topologies',
        text: 'Single-Leader (Postgres—simple, write bottleneck), Multi-Leader (multi-region active-active—needs CRDTs/LWW), Leaderless (Dynamo/Cassandra—uses W + R > N quorums).',
      },
      {
        label: 'Split-Brain & Fencing Tokens',
        text: 'If a leader pauses for a 10s JVM GC, Raft elects a new leader. When the old leader wakes up, storage rejects its writes using monotonically increasing Fencing Tokens.',
      },
    ],
    table: [
      ['Consistency Model', 'Guarantee', 'Production Example'],
      ['Linearizability', 'Real-time recency (strongest)', 'etcd / Raft / Spanner TrueTime'],
      ['Read-Your-Writes', 'User always sees own updates', 'Route user reads to leader for 5s after write'],
      ['Eventual', 'Replicas converge asynchronously', 'DNS, Cassandra with R=1, W=1'],
    ],
    signal: 'Explain Read-Your-Own-Writes consistency: after a user posts a comment, pin their reads to the Leader DB (or cache) for a few seconds while async replicas catch up.',
  },
  {
    id: 9,
    cat: 2,
    catName: 'Building Blocks',
    code: '09',
    title: 'Queues & Event Streaming',
    x: 235,
    y: 305,
    deps: [8],
    mental: 'Queues turn spiky traffic into flat, predictable throughput and decouple producer uptime from consumer uptime.',
    diagram: `Kafka Topic: "orders" (Partition Key = user_id -> strict per-user order)
  ├── Partition 0: [m1][m4][m7] ──► Consumer A (Group 1)
  ├── Partition 1: [m2][m5][m8] ──► Consumer B (Group 1)
  └── Partition 2: [m3][m6][m9] ──► Consumer C (Group 1)`,
    points: [
      {
        label: 'RabbitMQ vs Apache Kafka',
        text: 'RabbitMQ is a smart broker (AMQP exchange routing, per-message acks, ideal for task queues). Kafka is an append-only distributed commit log using sequential disk I/O and OS zero-copy sendfile.',
      },
      {
        label: 'Partition Ordering Guarantee',
        text: 'Kafka only guarantees ordering within a single partition. Always shard partitions by entity ID (user_id, ride_id) so causally related events land in the same partition.',
      },
      {
        label: 'Effective Exactly-Once',
        text: 'Real-world "exactly-once" = At-Least-Once broker delivery + Idempotent Consumer deduplicating via a unique event_id in a database transaction.',
      },
    ],
    table: [
      ['Broker', 'Architecture', 'Best Use Case'],
      ['Kafka / Redpanda', 'Partitioned append-only log', 'Event sourcing, CDC, high-throughput stream'],
      ['RabbitMQ / SQS', 'Message queue (delete on ack)', 'Background worker jobs, delayed retries'],
      ['Redis Streams', 'In-memory log', 'Low-latency ephemeral pub/sub + consumer groups'],
    ],
    signal: 'Always specify the Partition Key when drawing Kafka, and address the Hot Partition problem if a celebrity user_id generates 50% of events.',
  },
  {
    id: 10,
    cat: 2,
    catName: 'Building Blocks',
    code: '10',
    title: 'Scalability & Performance',
    x: 235,
    y: 370,
    deps: [5, 6, 8, 9],
    mental: 'Scale reads with caches and replicas; scale writes by sharding, batching, and write-back buffering.',
    diagram: `Pagination at 100M rows:
BAD:  OFFSET 1000000 LIMIT 20  ──► DB scans & discards 1,000,000 rows! O(N)
GOOD: WHERE created_at < :cursor_ts AND id < :cursor_id LIMIT 20 ──► O(log N)`,
    points: [
      {
        label: 'Hash vs Range Sharding',
        text: 'Hash Sharding gives uniform distribution but ruins range queries. Range Sharding enables fast scans but risks hot-spotting on the latest timestamp. Combine both via Compound Keys (user_id + timestamp).',
      },
      {
        label: 'Hot Key Salting',
        text: 'To prevent a celebrity key from melting a single shard, append a random suffix 0..9 (key#0..key#9) on writes to spread load across 10 shards, and scatter-gather on reads.',
      },
      {
        label: 'Keyset (Cursor) Pagination',
        text: 'Never use OFFSET on large tables. Use an indexed cursor (created_at, id) for constant O(log N) B+Tree seek latency.',
      },
    ],
    table: [
      ['Bottleneck', 'Symptom', 'Architectural Cure'],
      ['Read Heavy (100:1)', 'DB CPU at 95%', 'Redis Cache-Aside + Read Replicas + CDN'],
      ['Write Heavy', 'Disk IOPS / Lock wait', 'Sharding + LSM Engine + Kafka Write Buffering'],
      ['Hot Shard', '1 node at 100%, 9 idle', 'Key salting (0..N suffix) + local L1 cache'],
    ],
    signal: 'Proactively proposing Key Salting for celebrity hot shards and Keyset Cursor Pagination over OFFSET shows you have operated systems at scale.',
  },
  {
    id: 11,
    cat: 2,
    catName: 'Building Blocks',
    code: '11',
    title: 'Reliability & Fault Tolerance',
    x: 430,
    y: 45,
    deps: [7, 8],
    mental: 'Failures cascade when callers block on dead dependencies. Fail fast, shed load, and randomize retries.',
    diagram: `Circuit Breaker States:
[CLOSED (Normal)] ──(Error rate > 50%)──► [OPEN (Fail Fast 0ms)]
       ▲                                          │ (After 30s sleep)
       └────────(Probe succeeds)──────── [HALF-OPEN (Allow 1 test req)]`,
    points: [
      {
        label: 'Exponential Backoff + Full Jitter',
        text: 'If a service blips and 10,000 clients retry at t = 2s, 4s, 8s, they create synchronized retry waves. Always randomize: sleep = random(0, min(cap, base * 2^attempt)).',
      },
      {
        label: 'Circuit Breakers & Bulkheads',
        text: 'Circuit breakers fail fast when a downstream service is dying. Bulkheads isolate connection pools per dependency so one slow API cannot exhaust all worker threads.',
      },
      {
        label: 'Load Shedding & Graceful Degradation',
        text: 'When CPU hits 90%, drop low-priority requests (analytics, recommendations) so core checkout and authentication survive.',
      },
    ],
    table: [
      ['Metric', 'Definition', 'Tier-0 Financial Target'],
      ['RPO (Recovery Point)', 'Max tolerable data loss window', '0 sec (Synchronous quorum replication)'],
      ['RTO (Recovery Time)', 'Max tolerable recovery downtime', '< 30 sec (Automated health-checked failover)'],
    ],
    signal: 'Warn the interviewer about Retry Storms and explain how Exponential Backoff with Full Jitter plus retry budgets prevent cascading outages.',
  },
  {
    id: 12,
    cat: 3,
    catName: 'Architecture & Ops',
    code: '12',
    title: 'Microservices & Sagas',
    x: 430,
    y: 115,
    deps: [8, 9, 11],
    mental: 'Avoid distributed 2-Phase Commit (2PC) across microservices—it holds locks across networks. Use Sagas with compensating actions.',
    diagram: `Saga Pattern (Order Checkout):
[Order Svc] ──► [Payment Svc] ──► [Inventory Svc (FAILS!)]
     ◄──Compensate: Refund──┘            │
     ◄──Compensate: Cancel Order─────────┘`,
    points: [
      {
        label: '2PC vs Saga Pattern',
        text: '2PC blocks if the coordinator crashes. Sagas execute a sequence of local ACID transactions and trigger idempotent Compensating Transactions (semantic undo) on failure.',
      },
      {
        label: 'Orchestration vs Choreography',
        text: 'Choreography uses events (clean for 2–3 steps, chaotic at 8 steps). Orchestration uses a central state machine (Temporal / Step Functions) to manage timeouts and retries.',
      },
      {
        label: 'CQRS Pattern',
        text: 'Write to normalized ACID PostgreSQL; stream changes via CDC (Debezium) to Elasticsearch or Redis for denormalized sub-10ms read views.',
      },
    ],
    table: [
      ['Saga Style', 'Mechanism', 'Best When'],
      ['Choreography', 'Services emit/listen to Kafka events', 'Simple 2–3 service flows, loose coupling'],
      ['Orchestration', 'Central coordinator (Temporal.io)', 'Complex payment state machines, audit visibility'],
    ],
    signal: 'Mentioning Temporal.io (durable execution) or Saga Orchestration with idempotent compensating transactions is the gold standard for multi-service workflows.',
  },
  {
    id: 13,
    cat: 3,
    catName: 'Architecture & Ops',
    code: '13',
    title: 'Distributed Design Patterns',
    x: 430,
    y: 185,
    deps: [9, 12],
    mental: 'Dual-writing to a Database and Kafka in application code is a bug. If the process crashes in between, state diverges.',
    diagram: `Transactional Outbox Pattern:
BEGIN TXN;
  INSERT INTO orders (id, status) VALUES (101, 'PAID');
  INSERT INTO outbox_events (id, payload) VALUES (uuid, '{order:101}');
COMMIT; ──► [Debezium CDC reads DB WAL] ──► Publishes to Kafka`,
    points: [
      {
        label: 'Transactional Outbox + CDC',
        text: 'Never call db.save() then kafka.send(). Write both the business row and an outbox row inside the same local ACID transaction, and tail the DB WAL with Debezium to publish to Kafka.',
      },
      {
        label: 'Strangler Fig Migration',
        text: 'Migrate legacy monoliths incrementally by routing specific URI paths at the API Gateway to new microservices.',
      },
      {
        label: 'Sidecar Proxy / Service Mesh',
        text: 'Offload mTLS, distributed tracing, circuit breaking, and retries out of application code into a co-located Envoy proxy container.',
      },
    ],
    table: [
      ['Anti-Pattern', 'Failure Mode', 'Pattern Solution'],
      ['Dual Write (DB + Kafka)', 'App crashes after DB commit, before Kafka', 'Transactional Outbox + CDC (Debezium)'],
      ['Big-Bang Rewrite', 'Multi-year freeze, high regression risk', 'Strangler Fig routing at API Gateway'],
    ],
    signal: 'Spotting a Dual-Write bug in your own diagram and fixing it with the Transactional Outbox + CDC pattern is a strong-hire signal.',
  },
  {
    id: 14,
    cat: 3,
    catName: 'Architecture & Ops',
    code: '14',
    title: 'Security & Access Control',
    x: 430,
    y: 255,
    deps: [4, 7],
    mental: 'Authenticate at the edge gateway, authorize at the resource layer, and assume the internal network is untrusted (Zero Trust).',
    diagram: `[Client] ──(Short-lived JWT 5m + HttpOnly Refresh Token)──► [API Gateway (EdDSA Verify)]
                                                                   └──► [Internal Svc (mTLS + RBAC)]`,
    points: [
      {
        label: 'The JWT Revocation Dilemma',
        text: 'Stateless JWTs avoid DB lookups on every call but cannot be easily revoked if stolen. Keep Access JWTs short-lived (5–15 min) and pair with stateful Refresh Token Rotation.',
      },
      {
        label: 'OAuth2, OIDC & Secret Storage',
        text: 'OAuth2 is Authorization; OIDC is Authentication. Hash passwords with Argon2id. Store encryption keys in KMS/Vault using Envelope Encryption.',
      },
      {
        label: 'RBAC vs ABAC vs Zanzibar',
        text: 'Role-Based (Admin/Editor), Attribute-Based (IAM policies), or Google Zanzibar (Relationship-Based graph ACLs used by Google Drive and Carta).',
      },
    ],
    table: [
      ['Token Type', 'Validation Cost', 'Revocation Strategy'],
      ['Opaque Session ID', 'Redis lookup on every call', 'Instant (DEL session:id)'],
      ['Stateless JWT', 'Local public-key signature check', 'Short TTL (5m) + Redis deny-list for emergencies'],
    ],
    signal: 'Explain the JWT revocation dilemma and solve it with short-lived Access Tokens plus Refresh Token Rotation.',
  },
  {
    id: 15,
    cat: 3,
    catName: 'Architecture & Ops',
    code: '15',
    title: 'Observability & SRE',
    x: 430,
    y: 325,
    deps: [11, 12],
    mental: 'Average latency is a lie. If P50 is 10ms and P99 is 4 seconds, your highest-value power users have a broken experience.',
    diagram: `OpenTelemetry Context Propagation:
[API Gateway] ──(traceparent: 00-4bf92f3577b34da6-01)──► [Order Svc] ──► [Payment Svc]
   ├── Metrics (Prometheus Histograms: Four Golden Signals)
   ├── Logs    (Structured JSON indexed by trace_id)
   └── Traces  (Tempo Waterfall Span Flamegraph)`,
    points: [
      {
        label: 'Three Pillars + Trace Correlation',
        text: 'Metrics tell you that something is broken (Prometheus histograms); Traces tell you where (OpenTelemetry Span IDs); Structured Logs tell you why (correlated by trace_id).',
      },
      {
        label: 'Four Golden Signals',
        text: 'Latency (P50, P95, P99), Traffic (QPS), Errors (5xx rate), and Saturation (CPU, memory, thread pool queue depth).',
      },
      {
        label: 'SLI, SLO & Error Budgets',
        text: 'SLI is the measurement (99.92% requests < 200ms). SLO is the target (99.9%). Error Budget is the 0.1% allowed failure window before feature freezes.',
      },
    ],
    table: [
      ['Term', 'Meaning', 'Concrete Example'],
      ['SLI (Indicator)', 'Actual measured telemetry', 'P99 checkout latency = 142ms'],
      ['SLO (Objective)', 'Internal engineering target', '99.95% of requests < 200ms over 30d'],
      ['SLA (Agreement)', 'Contract with financial penalty', '99.9% uptime or 10% customer credit'],
    ],
    signal: 'Wrap up your system design by defining 2 concrete SLIs/SLOs and where you place Dead-Letter Queue (DLQ) depth alerts.',
  },
  {
    id: 16,
    cat: 3,
    catName: 'Architecture & Ops',
    code: '16',
    title: 'Cloud, K8s & Deployments',
    x: 625,
    y: 45,
    deps: [7, 15],
    mental: 'Treat servers like stateless cattle, not pets. Deployments must be progressive, automated, and instantaneously reversible.',
    diagram: `Canary Deployment Pipeline:
[L7 Envoy Mesh] ──┬── 98% Traffic ──► [v1.4 Stable Fleet (50 Pods)]
                  └──  2% Traffic ──► [v1.5 Canary (1 Pod)] ──(Auto-rollback if P99 spikes)`,
    points: [
      {
        label: 'Kubernetes Scaling Primitives',
        text: 'Pods run ephemeral containers; HPA (Horizontal Pod Autoscaler) scales replicas based on CPU or custom Prometheus metrics like Kafka consumer lag.',
      },
      {
        label: 'Progressive Delivery',
        text: 'Blue-Green switches 100% traffic across duplicate environments; Canary routes 1–2% of real traffic to the new build and auto-rolls back if error rate or P99 degrades.',
      },
      {
        label: 'Expand-and-Contract DB Migrations',
        text: 'Never run breaking ALTER TABLE during a deploy. Add nullable column → dual-write → backfill → switch reads → drop old column.',
      },
    ],
    table: [
      ['Strategy', 'Infra Overhead', 'Rollback Speed'],
      ['Rolling Update', 'Low (1x)', 'Slow (must re-roll pods)'],
      ['Blue-Green', 'High (2x capacity)', 'Instant (flip LB target group)'],
      ['Canary + Feature Flag', 'Low (~1.05x)', 'Instant (kill flag / route 0%)'],
    ],
    signal: 'Mentioning the Expand-and-Contract pattern for zero-downtime database schema migrations proves production maturity.',
  },
  {
    id: 17,
    cat: 3,
    catName: 'Architecture & Ops',
    code: '17',
    title: 'Blob & Storage Systems',
    x: 625,
    y: 115,
    deps: [5, 10],
    mental: 'Never stream multi-megabyte files through stateless API servers. Offload byte transfers directly to Object Storage via Presigned URLs.',
    diagram: `Direct Multipart Upload Pattern:
1. Client ──(Req Upload)──► API Svc ──► Returns S3 Presigned URL + upload_id
2. Client ══(PUT 5MB Chunks directly in parallel)══► Amazon S3 / GCS
3. S3 ──(Event Notification)──► Kafka ──► Media Transcoder / Metadata DB`,
    points: [
      {
        label: 'Metadata vs Blob Separation',
        text: 'Store file metadata (file_id, owner_id, chunk_hashes, ACLs) in SQL/NoSQL, and raw immutable bytes in Object Storage (S3) fronted by a CDN.',
      },
      {
        label: 'Content-Addressable Chunking',
        text: 'Split large files on the client into 4MB chunks using Rabin Fingerprinting. Hash each chunk (SHA-256) and upload only chunks not already present in S3.',
      },
      {
        label: 'Reed-Solomon Erasure Coding',
        text: 'Object stores avoid 3x full replication cost by splitting objects into 10 data shards + 4 parity shards (1.4x overhead with 11 nines of durability).',
      },
    ],
    table: [
      ['Storage Tier', 'Typical Latency', 'Ideal Workload'],
      ['Block (NVMe / EBS)', '< 1ms', 'Relational & NoSQL Database volumes'],
      ['File (NFS / EFS)', '~2–5ms', 'Shared POSIX directories across pods'],
      ['Object (S3 / GCS)', '~15–50ms', 'Videos, images, backups, Parquet lakes'],
    ],
    signal: 'Always draw Presigned URLs + Multipart Upload for any system involving photos, videos, or documents (YouTube, Instagram, Dropbox).',
  },
  {
    id: 18,
    cat: 3,
    catName: 'Architecture & Ops',
    code: '18',
    title: 'Real-Time & Fan-Out Systems',
    x: 625,
    y: 185,
    deps: [4, 6, 9],
    mental: 'Celebrity fan-out breaks naive push architectures. Combine Fan-Out-on-Write for regular users with Fan-Out-on-Read for mega-influencers.',
    diagram: `Hybrid Fan-Out (News Feed):
Regular User Posts   ──(Fan-out on Write)──► Push post_id to 400 followers' Redis Lists
Celebrity (50M) Posts ──(Write to own list)─► Followers pull & merge celebrity posts on Read!`,
    points: [
      {
        label: 'Hybrid Fan-Out (Twitter/Instagram)',
        text: 'Pushing a post to 50M follower timelines causes massive write amplification. Use Fan-out on Write for users <50k followers, and Fan-out on Read for celebrities.',
      },
      {
        label: 'Stateful WebSocket Routing',
        text: 'Maintain a fast Session Registry in Redis (user_B -> gateway_node_42) so any chat gateway can route messages to the exact server holding the recipient TCP socket.',
      },
      {
        label: 'Collaborative Editing (CRDTs)',
        text: 'For Google Docs or Figma, use Conflict-Free Replicated Data Types (CRDTs) or Operational Transformation (OT) for lock-free convergence.',
      },
    ],
    table: [
      ['Pattern', 'Write Cost', 'Read Cost'],
      ['Fan-Out on Write (Push)', 'O(N followers) - Heavy', 'O(1) from Redis timeline cache'],
      ['Fan-Out on Read (Pull)', 'O(1) - Cheap', 'O(F followed accounts) - Slow'],
      ['Hybrid Fan-Out', 'Bounded', 'Fast O(1) + merge top followed celebrities'],
    ],
    signal: 'Immediately contrasting Fan-out-on-Write vs Fan-out-on-Read and proposing the Hybrid approach is essential for any Feed or Timeline prompt.',
  },
  {
    id: 19,
    cat: 3,
    catName: 'Architecture & Ops',
    code: '19',
    title: 'Advanced Distributed Algorithms',
    x: 625,
    y: 255,
    deps: [8, 10],
    mental: 'These core data structures power DynamoDB, Cassandra, Kafka, and Redis Cluster under the hood.',
    diagram: `Consistent Hashing Ring (0 .. 2^32 - 1):
      [vNode A1] ──► [vNode B1]
       ▲                     │
  [vNode C1] ◄── [vNode A2] ◄┘   (Adding a node only moves ~1/N keys!)`,
    points: [
      {
        label: 'Consistent Hashing + Virtual Nodes',
        text: 'Maps servers and keys onto a 0..2^32-1 ring. Using 150+ Virtual Nodes per physical server ensures uniform load and moves only 1/N keys when scaling.',
      },
      {
        label: 'Probabilistic Data Structures',
        text: 'Bloom Filter (set membership in O(1) RAM, zero false negatives), Count-Min Sketch (streaming heavy-hitters), HyperLogLog (1B unique visitors in 12 KB of RAM).',
      },
      {
        label: 'Consensus & Anti-Entropy',
        text: 'Raft/Paxos for strong leader election and replicated state machines. Gossip Protocol + Merkle Trees for leaderless replica synchronization.',
      },
    ],
    table: [
      ['Algorithm', 'Memory / Cost', 'Solved Problem'],
      ['Consistent Hashing', 'O(log(N*V)) lookup', 'Elastic cache/DB scaling without full rehashing'],
      ['HyperLogLog', '12 KB per counter', 'Counting unique video/page views at scale'],
      ['Merkle Tree', 'O(log N) hash tree diff', 'Detecting out-of-sync keys between replicas'],
    ],
    signal: 'Proposing HyperLogLog for unique view counting or Count-Min Sketch for Top-K trending topics demonstrates strong algorithmic depth.',
  },
  {
    id: 20,
    cat: 4,
    catName: 'FAANG Interview',
    code: '20',
    title: 'Low-Level Design & Concurrency',
    x: 625,
    y: 325,
    deps: [2, 13],
    mental: 'Great LLD combines clean domain modeling with explicit concurrency control on shared state.',
    diagram: `Seat Booking Concurrency Defense (BookMyShow / Ticketmaster):
Option A (Pessimistic): SELECT * FROM seats WHERE id=55 FOR UPDATE NOWAIT;
Option B (Optimistic):  UPDATE seats SET user=9, version=2 WHERE id=55 AND version=1;
Option C (Distributed): Redis SET seat:55 user_9 NX EX 300 (5-min payment hold TTL)`,
    points: [
      {
        label: 'Concurrency Control in LLD',
        text: 'Use Optimistic Locking (version column) for low contention, SELECT FOR UPDATE NOWAIT/SKIP LOCKED for high contention, or Redis SET NX EX for temporary holds.',
      },
      {
        label: 'High-Yield Design Patterns',
        text: 'Strategy (swappable pricing/matching algorithms), State (Order/Ticket lifecycle), Observer (event notifications), Factory/Builder.',
      },
      {
        label: 'Financial Precision',
        text: 'Always represent currency as integer cents/paise (BIGINT) or exact Decimal types—never IEEE-754 floating point.',
      },
    ],
    table: [
      ['Classic LLD Prompt', 'Core Pattern', 'Concurrency / Edge Case'],
      ['Ticketmaster / BookMyShow', 'State + Strategy', 'Double-booking race condition (SET NX EX 300)'],
      ['Parking Lot', 'Strategy (Spot Assignment)', 'Concurrent entry at multiple gates'],
      ['Splitwise', 'Graph Debt Simplification', 'Integer cent rounding invariants'],
    ],
    signal: 'In any financial or booking problem, explicitly state: "We store money as integer cents (BIGINT), never IEEE-754 floats."',
  },
  {
    id: 21,
    cat: 4,
    catName: 'FAANG Interview',
    code: '21',
    title: 'FAANG 45-Min HLD Framework',
    x: 800,
    y: 65,
    deps: [3, 4, 15],
    mental: 'Drive the interview proactively. Never wait for the interviewer to pull architecture out of you.',
    diagram: `[00-05m] 1. Clarify FR / NFR & Scope          [15-25m] 4. High-Level End-to-End Diagram
[05-08m] 2. Back-of-Envelope Math             [25-40m] 5. Deep Dive (Sharding, Race Conditions)
[08-15m] 3. API Contracts & Data Schema       [40-45m] 6. Failure Modes, Bottlenecks & SLOs`,
    points: [
      {
        label: 'Phase 1: Scope & Math (8 min)',
        text: 'Lock down 3 core Functional Requirements and 3 Non-Functional Requirements (Read:Write ratio, P99 latency, CP vs AP). Compute QPS to justify sharding/caching.',
      },
      {
        label: 'Phase 2: API & Schema (7 min)',
        text: 'Write 3 clean REST/gRPC signatures (with cursor pagination and idempotency keys) and sketch core tables with partition and sort keys.',
      },
      {
        label: 'Phase 3: HLD to Deep Dive (25 min)',
        text: 'Draw the end-to-end flow first, then proactively identify the 2 hardest bottlenecks (hot shard, SPOF, race condition) and solve them deeply.',
      },
    ],
    table: [
      ['Common Mistake', 'Why It Fails', 'Staff-Level Correction'],
      ['Jumping straight to drawing', 'Solves the wrong problem', 'Spend 4 mins locking down FR & NFR constraints'],
      ['Drawing a generic box "DB"', 'Zero signal on internals', 'Specify engine (Postgres vs Scylla) + Partition Key'],
      ['Waiting to be poked', 'Reads as L3/L4 junior', 'Proactively point out bottlenecks in your own design'],
    ],
    signal: 'At minute 25, say: "Now that the baseline works, here are the 3 places this breaks at 100x scale—which one would you like me to dive into first?"',
  },
  {
    id: 22,
    cat: 4,
    catName: 'FAANG Interview',
    code: '22',
    title: '12 Classic Case Studies Matrix',
    x: 800,
    y: 140,
    deps: [17, 18, 19, 21],
    mental: 'Every system design interview is a remix of 4 archetypes: Read-Heavy KV, Real-Time Fan-Out, Geospatial Stream, or Strong ACID Ledger.',
    diagram: `Archetype 1: Read-Heavy KV     ──► TinyURL, Pastebin (Base62 + Redis + NoSQL)
Archetype 2: Real-Time Fanout  ──► WhatsApp, Twitter, Notification Service
Archetype 3: Geospatial Stream ──► Uber, Yelp, DoorDash (H3 Hex / Geohash + Redis)
Archetype 4: Strong Ledger     ──► Stripe Payments, Ticketmaster, Robinhood`,
    points: [
      {
        label: 'Geospatial (Uber / DoorDash)',
        text: 'Index the Earth into Uber H3 Hexagons or Geohashes in Redis so proximity queries inspect only the center cell plus 6 adjacent neighbors in O(1).',
      },
      {
        label: 'Rate Limiter (Stripe / Cloudflare)',
        text: 'Execute Token Bucket or Sliding Window Counter atomically inside a single Redis Lua script to eliminate read-modify-write race conditions.',
      },
      {
        label: 'Snowflake ID Generator',
        text: '64-bit integer: 1 sign bit + 41 bits timestamp ms + 10 bits node_id + 12 bits sequence = 4,096 time-sortable IDs/ms per node without coordination.',
      },
    ],
    table: [
      ['System', 'Core Data Structure / Engine', 'Hardest Bottleneck'],
      ['Uber / Lyft', 'Uber H3 Hexagons in Redis + Kafka', 'High-frequency 4-sec driver location writes'],
      ['YouTube / Netflix', 'S3 + DAG Transcoding + Edge CDN', 'Egress bandwidth & adaptive bitrate (HLS/DASH)'],
      ['Web Crawler', 'URL Frontier + Bloom Filter + SimHash', 'Politeness per-host throttling & spider traps'],
    ],
    signal: 'Map any unfamiliar interview prompt back to one of the 4 core archetypes within the first 3 minutes.',
  },
  {
    id: 23,
    cat: 4,
    catName: 'FAANG Interview',
    code: '23',
    title: 'Production Tech Stack Reference',
    x: 800,
    y: 215,
    deps: [5, 6, 9, 16],
    mental: 'Know the exact internal data structures, throughput numbers, and failure modes of every tool you name-drop.',
    diagram: `Edge/Proxy: Cloudflare Anycast ──► Envoy / Nginx
Compute:    Go / Rust / JVM on Kubernetes
State:      PostgreSQL (ACID) │ ScyllaDB (LSM Wide-Column) │ Redis (In-Mem)
Stream/Search: Apache Kafka │ Apache Flink (Stream) │ Elasticsearch (Inverted Index)`,
    points: [
      {
        label: 'PostgreSQL',
        text: 'B+Tree, ACID, MVCC, rich extensions (PostGIS, pgvector). Scale reads to ~50k QPS with replicas; shard via Citus if writes exceed single-leader disk IOPS.',
      },
      {
        label: 'Redis',
        text: 'Single-threaded event loop in RAM (~100k+ QPS, <1ms latency). Supports Strings, Hashes, Sorted Sets (ZSET for live leaderboards), HyperLogLog, Streams, and Lua scripts.',
      },
      {
        label: 'Elasticsearch / OpenSearch',
        text: 'Lucene Inverted Index (term -> [doc1, doc9]) + BM25 ranking. Never use as primary source of truth—keep synced via Kafka CDC.',
      },
    ],
    table: [
      ['Requirement', 'Go-To Production Tool', 'Why This Over Alternatives'],
      ['Real-Time Leaderboard', 'Redis Sorted Set (ZADD / ZREVRANK)', 'O(log N) rank updates & lookups in RAM'],
      ['Full-Text / Fuzzy Search', 'Elasticsearch / OpenSearch', 'Inverted index + BM25 + token analyzers'],
      ['Stateful Stream Windows', 'Apache Flink + Kafka', 'Exactly-once tumbling/sliding windows'],
    ],
    signal: 'Whenever an interview asks for a live gaming leaderboard or Top-K window, reach for Redis ZSET (under 10M items) or Flink + Count-Min Sketch (for billions).',
  },
  {
    id: 24,
    cat: 4,
    catName: 'FAANG Interview',
    code: '24',
    title: '8-Week FAANG Mastery Roadmap',
    x: 800,
    y: 290,
    deps: [21, 22],
    mental: 'Passive reading creates an illusion of competence. You master system design by drawing on a blank canvas under a 40-minute timer.',
    diagram: `Active Recall Loop (3x / week):
1. Pick Prompt (e.g., "Design WhatsApp") ──► 2. Set 40-min Timer on Blank Canvas
3. Write Math, APIs, Schema, & Diagram   ──► 4. Audit against Staff Rubric & Patch Gaps`,
    points: [
      {
        label: 'Weeks 1–2: Primitives & Storage',
        text: 'Master Modules 01–08 and read Kleppmann’s DDIA Chapters 3 (Storage Engines), 5 (Replication), 6 (Partitioning), and 7 (Transactions).',
      },
      {
        label: 'Weeks 3–5: Building Blocks & Core 6',
        text: 'Master Modules 09–19. Practice TinyURL, Rate Limiter, Notification Service, News Feed, WhatsApp, and Typeahead from a blank page.',
      },
      {
        label: 'Weeks 6–8: High-Contention & Mocks',
        text: 'Practice Uber, YouTube, Stripe Ledger, Ticketmaster, Web Crawler, and Google Drive under timed 45-minute mock conditions.',
      },
    ],
    table: [
      ['Resource', 'Primary Value', 'Priority'],
      ['Kleppmann DDIA Book', 'Deep mental models on DB internals & consensus', 'Mandatory (Ch 3, 5, 6, 7, 9)'],
      ['ArchAtlas Whiteboard Lab', 'Live queueing math, SPOF linting & chaos drills', 'Active Practice'],
      ['Engineering Blogs', 'Discord (ScyllaDB), Uber (H3), Stripe (Idempotency)', 'High Signal'],
    ],
    signal: 'Use the Mark Mastered toggle on each module card to track your readiness across all 25 domains.',
  },
  {
    id: 25,
    cat: 4,
    catName: 'FAANG Interview',
    code: '25',
    title: 'Staff-Level Bar & Trade-Off Rubric',
    x: 800,
    y: 365,
    deps: [21, 22, 24],
    mental: 'Mid-level engineers draw boxes that work on the happy path. Senior and Staff engineers design for partial failures, migrations, and operational simplicity.',
    diagram: `The Staff-Level Trade-Off Formula:
"We choose [Technology X] over [Alternative Y] because our workload requires [Constraint Z].
The downside is [Trade-off W], which we mitigate by [Mitigation M]."`,
    points: [
      {
        label: 'Articulate Both Sides of Every Choice',
        text: 'Never give binary answers. Every architectural choice has a downside—state the trade-off explicitly before committing.',
      },
      {
        label: 'Proactively Analyze Failure Modes',
        text: 'Ask: What happens if Redis crashes cold? (Cache warm-up + Singleflight). What if a Kafka partition lags? What if two users book the same seat within 2ms?',
      },
      {
        label: 'Cost & Operational Simplicity',
        text: 'Over-engineering a 500 QPS internal tool with 12 microservices and multi-region Paxos fails the Staff bar. Match complexity to the QPS math.',
      },
    ],
    table: [
      ['Mid-Level Answer (L4)', 'Senior / Staff Answer (L5 / L6)'],
      ['"We will use Kafka and Redis."', '"We partition Kafka by user_id for ordering and use Redis Cache-Aside with Singleflight to prevent stampedes."'],
      ['"We will use NoSQL because it scales."', '"Our access pattern is append-heavy chat_id + timestamp with zero joins, making ScyllaDB LSM-trees ideal."'],
    ],
    signal: 'Use the Staff Trade-Off Formula whenever you introduce a database, cache, or queue into your whiteboard diagram.',
  },
];

export interface CaseBlueprint {
  name: string;
  scale: string;
  arch: string;
  decisions: { title: string; detail: string }[];
}

export const CASE_BLUEPRINTS: CaseBlueprint[] = [
  {
    name: '01. TinyURL Shortener',
    scale: '100M new URLs/mo · 10:1 Read:Write · ~40k Read QPS · <10ms P99',
    arch: `[Client] ──POST /urls──► [API Svc] ──► [Snowflake ID Gen] ──Base62──► "a9Zx21p"
[Client] ──GET /a9Zx21p─► [CDN/Edge] ──► [Redis Cache (90% hit)] ──► [DynamoDB / Cassandra]`,
    decisions: [
      {
        title: 'Base62 Snowflake IDs over Raw Hashing',
        detail: 'MD5/SHA256 truncation risks collisions requiring DB retry loops. Use a 64-bit Snowflake ID or Redis range ticket server encoded in Base62 (7 chars = 62^7 = 3.5 trillion URLs).',
      },
      {
        title: '301 vs 302 Redirect Trade-off',
        detail: 'HTTP 301 caches permanently in the browser (lowest server load, blinds click analytics). HTTP 302 hits your edge every time so you can stream click telemetry to Kafka.',
      },
    ],
  },
  {
    name: '02. Distributed Rate Limiter',
    scale: '1M RPS at API Gateway · <2ms overhead · Atomic across edge fleet',
    arch: `[Client] ──► [Envoy / API Gateway] ◄══(Atomic Lua Script: Token Bucket)══► [Redis Cluster]
                    └──If 429 Too Many Requests: Return Retry-After Header`,
    decisions: [
      {
        title: 'Token Bucket vs Sliding Window Counter',
        detail: 'Token Bucket permits controlled traffic bursts while enforcing average rate. Sliding Window Counter smooths boundary spikes using just two integers per user.',
      },
      {
        title: 'Atomic Redis Lua Execution',
        detail: 'Never run GET then SET from application code (TOCTOU race condition under concurrency). Execute the token refill and decrement inside a single atomic Redis Lua script.',
      },
    ],
  },
  {
    name: '03. WhatsApp Real-Time Chat',
    scale: '2B Users · 100B msgs/day · E2E Encrypted · Stateful WebSockets',
    arch: `[User A] ◄═WebSocket═► [Chat GW 1] ──Lookup B──► [Redis Session Registry]
                            │ (gRPC route)
                            ▼
[User B] ◄═WebSocket═► [Chat GW 9] ──Persist──► [ScyllaDB (Partition: chat_id, Cluster: msg_id)]`,
    decisions: [
      {
        title: 'Stateful Socket Routing via Session Registry',
        detail: 'Chat Gateways hold persistent WebSockets. Redis maps user_id -> gateway_host. Offline recipients get messages queued and dispatched via APNs/FCM push.',
      },
      {
        title: 'LSM-Tree Storage (ScyllaDB / Cassandra)',
        detail: 'Chat is write-heavy with sequential time-slice reads (fetch last 50 msgs in chat_id). LSM-trees absorb 1M+ writes/sec without random B+Tree disk seeks.',
      },
    ],
  },
  {
    name: '04. Twitter / Instagram News Feed',
    scale: '300M DAU · 500k Read QPS · <150ms timeline generation',
    arch: `[Post Svc] ──► [Kafka] ──► [Fan-Out Workers]
                             ├── Normal User (<50k): Push post_id to Followers' Redis ZSET
                             └── Celebrity (>50k):   Append only to Celebrity's own Redis ZSET
[Feed Read] ──► Fetch User Redis ZSET + Merge Followed Celebrities ──► Hydrate from Cache`,
    decisions: [
      {
        title: 'Hybrid Fan-Out (Push + Pull)',
        detail: 'Pushing a post to 50M followers causes severe write amplification. Push post IDs only for regular users; for mega-influencers, pull and merge their posts at read time.',
      },
      {
        title: 'Two-Tier Timeline Hydration',
        detail: 'Store only compact (post_id, author_id, timestamp) tuples in Redis timeline ZSETs, then batch-hydrate full post and user metadata from a sharded object cache.',
      },
    ],
  },
  {
    name: '05. Uber H3 Geospatial Dispatch',
    scale: '10M active drivers pinging GPS every 4s = 2.5M location writes/sec',
    arch: `[Driver App] ══(WS GPS every 4s)══► [Location Ingestion] ──► [Redis H3 Hexagonal Index]
[Rider Req]  ──► [Matching Svc] ──Query center + 6 neighbor H3 cells──► [Distributed Driver Lock]`,
    decisions: [
      {
        title: 'Uber H3 Hexagonal Spatial Index',
        detail: 'Quantize Earth into H3 hexagons in Redis with a 15-second TTL. All 6 neighbor hexagons share uniform center distance, avoiding square Geohash diagonal distortion.',
      },
      {
        title: 'Atomic Driver Dispatch Lock',
        detail: 'Prevent two riders from matching the same driver simultaneously using an atomic Redis lock (SET driver_lock:99 rider_1 NX EX 15) while awaiting driver acceptance.',
      },
    ],
  },
  {
    name: '06. YouTube / Netflix Video CDN',
    scale: '1B hrs watched/day · Massive egress bandwidth · Global device matrix',
    arch: `[Creator] ══(Presigned Multipart Upload)══► [S3 Raw Bucket] ──► [DAG Video Transcoder]
   └──Splits into 4s GOP Chunks ──► Encodes 360p..4K (HLS/DASH) ──► [ISP Edge CDN]`,
    decisions: [
      {
        title: 'Segmented Parallel DAG Transcoding',
        detail: 'Split raw uploads along keyframes into 4-second GOP chunks and transcode in parallel across spot instances into H.264, HEVC, and AV1 renditions.',
      },
      {
        title: 'Adaptive Bitrate Streaming (HLS / DASH)',
        detail: 'Client players fetch an .m3u8 manifest and dynamically switch 4-second segment quality based on real-time client bandwidth.',
      },
    ],
  },
  {
    name: '07. Stripe Double-Entry Ledger',
    scale: 'Zero data loss (RPO=0) · Strict idempotency · Immutable accounting',
    arch: `[Checkout] ──(Idempotency-Key)──► [Payment Orchestrator (Temporal Saga)]
                                        ├──► [ACID Ledger DB (Double-Entry: Debit/Credit)]
                                        └──► [External PSP Gateway (Visa/Mastercard)]`,
    decisions: [
      {
        title: 'End-to-End Idempotency Keys',
        detail: 'Every mutating call requires a client UUID Idempotency-Key locked in ACID storage so network retries return the exact cached response without double-charging.',
      },
      {
        title: 'Immutable Double-Entry Bookkeeping',
        detail: 'Never run UPDATE balance = balance - 100. Every transfer appends two immutable ledger rows (Debit -$100, Credit +$100) summing to zero.',
      },
    ],
  },
  {
    name: '08. Ticketmaster Flash Sale',
    scale: '10M users competing for 50,000 concert seats at 10:00:00 AM',
    arch: `[Users] ──► [Edge Virtual Waiting Room (Fair FIFO Token Queue)]
               └──► [Seat Map Cache] ──Select Seat──► [Redis Atomic Hold (SET NX EX 300)]
                                                            └──► [Payment] ──► [Postgres ACID Commit]`,
    decisions: [
      {
        title: 'Edge Virtual Waiting Room',
        detail: 'Absorb the 10M thundering herd at the CDN edge by queueing users in a fair FIFO waiting room and admitting controlled batches with signed lease tokens.',
      },
      {
        title: 'Two-Phase Seat Hold with Grace Buffer',
        detail: 'Lock selected seats atomically in Redis (SET seat:A12 user_88 NX EX 330) while displaying a 270s UI timer so late payment webhooks never race seat expiration.',
      },
    ],
  },
];

export interface WhiteboardPreset {
  id: string;
  name: string;
  ingressQps: number;
  cacheHitPct: number;
  readRatioPct: number;
  nodes: WhiteboardNode[];
  edges: WhiteboardEdge[];
}

export const WHITEBOARD_PRESETS: Record<string, WhiteboardPreset> = {
  whatsapp: {
    id: 'whatsapp',
    name: '01. WhatsApp Real-Time Chat',
    ingressQps: 65000,
    cacheHitPct: 85,
    readRatioPct: 60,
    nodes: [
      { id: 'n1', type: 'client', label: '2B Mobile Clients', x: 35, y: 210, replicas: 1, down: false },
      { id: 'n2', type: 'lb', label: 'Anycast L4/L7 LB', x: 225, y: 210, replicas: 2, down: false },
      { id: 'n3', type: 'gateway', label: 'WebSocket Gateways', x: 425, y: 210, replicas: 3, down: false },
      { id: 'n4', type: 'cache', label: 'Redis Session Reg', x: 645, y: 75, replicas: 2, down: false },
      { id: 'n5', type: 'nosql', label: 'ScyllaDB Chat Log', x: 645, y: 210, replicas: 3, down: false },
      { id: 'n6', type: 'queue', label: 'Kafka Push Stream', x: 645, y: 345, replicas: 2, down: false },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n3', to: 'n5' },
      { from: 'n3', to: 'n6' },
    ],
  },
  ticketmaster: {
    id: 'ticketmaster',
    name: '02. Ticketmaster Flash Sale',
    ingressQps: 85000,
    cacheHitPct: 92,
    readRatioPct: 85,
    nodes: [
      { id: 'n1', type: 'client', label: 'Flash Sale Buyers', x: 35, y: 210, replicas: 1, down: false },
      { id: 'n2', type: 'cdn', label: 'Edge Waiting Room', x: 215, y: 125, replicas: 2, down: false },
      { id: 'n3', type: 'gateway', label: 'API Gateway', x: 215, y: 295, replicas: 2, down: false },
      { id: 'n4', type: 'app', label: 'Booking Service', x: 430, y: 210, replicas: 4, down: false },
      { id: 'n5', type: 'cache', label: 'Redis Seat Hold', x: 655, y: 80, replicas: 2, down: false },
      { id: 'n6', type: 'sql', label: 'Postgres ACID DB', x: 655, y: 210, replicas: 2, down: false },
      { id: 'n7', type: 'queue', label: 'Outbox CDC Kafka', x: 655, y: 345, replicas: 2, down: false },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
      { from: 'n4', to: 'n6' },
      { from: 'n6', to: 'n7' },
    ],
  },
  uber: {
    id: 'uber',
    name: '03. Uber H3 Geo-Dispatch',
    ingressQps: 95000,
    cacheHitPct: 88,
    readRatioPct: 50,
    nodes: [
      { id: 'n1', type: 'client', label: 'Drivers & Riders', x: 35, y: 210, replicas: 1, down: false },
      { id: 'n2', type: 'gateway', label: 'Envoy gRPC Edge', x: 235, y: 210, replicas: 3, down: false },
      { id: 'n3', type: 'app', label: 'Location & Match', x: 440, y: 210, replicas: 5, down: false },
      { id: 'n4', type: 'cache', label: 'Redis H3 Hex Index', x: 655, y: 115, replicas: 2, down: false },
      { id: 'n5', type: 'queue', label: 'Kafka GPS Stream', x: 655, y: 295, replicas: 2, down: false },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n3', to: 'n5' },
    ],
  },
  naive: {
    id: 'naive',
    name: '04. Naive 3-Tier (Overloaded)',
    ingressQps: 45000,
    cacheHitPct: 0,
    readRatioPct: 70,
    nodes: [
      { id: 'n1', type: 'client', label: 'Users (45k QPS)', x: 60, y: 210, replicas: 1, down: false },
      { id: 'n2', type: 'app', label: 'Single App Server', x: 345, y: 210, replicas: 1, down: false },
      { id: 'n3', type: 'sql', label: 'Unsharded Postgres', x: 625, y: 210, replicas: 1, down: false },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
    ],
  },
};

export interface MockInterviewScenario {
  id: string;
  title: string;
  phases: {
    time: string;
    name: string;
    signal: string;
    interviewer: string;
    candidate: string;
    diagram: string;
    chaos: { btn: string; ans: string }[];
  }[];
}

export const MOCK_INTERVIEWS: MockInterviewScenario[] = [
  {
    id: 'ticketmaster',
    title: 'Ticketmaster Flash Sale (High-Contention ACID)',
    phases: [
      {
        time: '00:00 - 05:00',
        name: '01. Requirements & Scope',
        signal: 'Lock down CP consistency (zero double-booking) and flash-sale waiting room.',
        interviewer: 'Design an online ticketing platform like Ticketmaster that sells seats for high-demand concerts.',
        candidate: 'Let us align on scope first. Functional Requirements: (1) View event and live seat map, (2) Select and hold seats for 5 minutes during checkout, (3) Complete payment via Stripe. Non-Functional Requirements: Strict Consistency (CP) on seat booking—zero double-bookings allowed, High Availability (99.99%) for browsing, and surviving flash-sale spikes where 10M users compete for 50,000 seats.',
        diagram: `FUNCTIONAL SCOPE:                    NON-FUNCTIONAL TARGETS:
1. View Event & Interactive Seat Map  ├── Zero Double-Booking (Strict ACID / CP)
2. 5-Min Temporary Seat Hold (TTL)    ├── 10M Concurrent Users during Flash Drop
3. Idempotent Payment & Ticket Issue  └── Seat Map Read P99 < 150ms`,
        chaos: [
          {
            btn: 'Probe: Why not eventual consistency?',
            ans: 'With eventual consistency on seat state, two buyers on different database replicas will both see Seat A12 as AVAILABLE, pay $500, and receive confirmation. Refunding after payment destroys user trust and incurs payment processor fees.',
          },
        ],
      },
      {
        time: '05:00 - 15:00',
        name: '02. Scale Math, APIs & Schema',
        signal: 'Include Idempotency-Key header, compact bitmask seat map, and sharding by event_id.',
        interviewer: 'What does the traffic math look like, and how do you structure the APIs and database schema?',
        candidate: 'Normal traffic is trivial, but during a Flash Drop 10M users refresh one event_id in 10 seconds (~1M Read QPS). We compress the 50,000-seat availability map into a 50KB bitmask cached at the edge, and shard PostgreSQL by event_id so multi-seat holds execute in a single-node ACID transaction.',
        diagram: `// Hold Seats (Atomic 5-min lock)
POST /v1/events/{event_id}/holds
Headers: { "Idempotency-Key": "uuid-v4" }
Body:    { "seat_ids": ["SEC1-A12", "SEC1-A13"], "user_id": "u_889" }

CREATE TABLE seats (
  event_id   BIGINT,
  seat_id    VARCHAR(32),
  status     SMALLINT, -- 0: AVAILABLE, 1: HELD, 2: BOOKED
  held_by    BIGINT NULL,
  hold_until TIMESTAMPTZ NULL,
  version    INT NOT NULL DEFAULT 1,
  PRIMARY KEY (event_id, seat_id)
);`,
        chaos: [
          {
            btn: 'Probe: Why shard by event_id?',
            ans: 'All seats in a checkout belong to the same event_id. Sharding by event_id guarantees multi-seat bookings (A12, A13) execute inside a single PostgreSQL shard without cross-shard 2-Phase Commit.',
          },
        ],
      },
      {
        time: '15:00 - 45:00',
        name: '03. Deep Dive: Race Conditions & Late Webhooks',
        signal: 'Lexicographical seat sorting + 5m30s backend TTL vs 4m30s UI countdown.',
        interviewer: 'What if User A requests [A1, A2] and User B requests [A2, A3] at the exact same millisecond? And what if Stripe finishes payment at 5:01 after the 5-minute hold expired?',
        candidate: 'For overlapping multi-seat holds [A1, A2] vs [A2, A3], locking in arbitrary order causes deadlocks or partial holds. We sort seat IDs lexicographically (A1 then A2) and execute an all-or-nothing Redis Lua script (or Postgres SELECT FOR UPDATE NOWAIT). For the 5:01 late payment webhook, we show a 4:30 countdown in the client UI while setting the backend Redis TTL to 5:30—giving a 60-second grace window for payment settlement.',
        diagram: `MULTI-SEAT ATOMIC LUA SCRIPT:
1. Sort keys lexicographically: ["seat:E1:A1", "seat:E1:A2"]
2. Loop all keys: if ANY key exists in Redis -> ABORT & return 409 Conflict
3. Loop all keys: SET key user_id EX 330 (5m30s backend TTL vs 4m30s UI timer)`,
        chaos: [
          {
            btn: 'Chaos: Redis Leader crashes right after hold!',
            ans: 'If Redis fails over before async replication completes, PostgreSQL serves as our final ACID safety net: UPDATE seats SET status = BOOKED WHERE status != BOOKED. If a duplicate slip occurs, Postgres rejects the second commit and triggers an automated Stripe refund.',
          },
        ],
      },
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp / Discord (2B Users Real-Time Chat)',
    phases: [
      {
        time: '00:00 - 15:00',
        name: '01. Scale Math & Stateful Routing',
        signal: '1.15M Write QPS · Epoll WebSocket Gateways · Redis Session Registry.',
        interviewer: 'Design WhatsApp supporting 1-on-1 chat, group chat up to 1,000 members, and read receipts for 2 Billion users.',
        candidate: '2B DAU sending 50 messages/day equals 100B messages/day (~1.15M write QPS, peak 3M QPS). Each Chat Gateway holds 50k concurrent TCP WebSockets tuned via Linux epoll. A Redis Session Registry maps user_id -> gateway_host so Gateway 1 can route messages to Gateway 42 over internal gRPC.',
        diagram: `[User A] ══WS══► [Gateway 01] ──1. Lookup B──► [Redis Session Registry]
                      │
                      ├──2. Persist──► [ScyllaDB: PRIMARY KEY ((chat_id), msg_id DESC)]
                      └──3. gRPC Push─► [Gateway 42] ══WS══► [User B (Online)]`,
        chaos: [
          {
            btn: 'Chaos: 1M users reconnect after network blip!',
            ans: 'A synchronized reconnection storm will overload Auth and Redis. Clients must use Exponential Backoff with Full Jitter on WebSocket reconnects, and Gateways shed non-critical Presence ("last seen") updates first.',
          },
        ],
      },
      {
        time: '15:00 - 45:00',
        name: '02. Storage Engine & Group Fan-Out',
        signal: 'ScyllaDB LSM-Trees for append-heavy chat + Snowflake time-ordered clustering key.',
        interviewer: 'Which database stores 100B messages/day and how do you order messages reliably across clocks?',
        candidate: 'B+Tree SQL databases suffer severe random I/O amplification at 1.15M writes/sec. We use ScyllaDB/Cassandra (LSM-Tree append-only MemTable + SSTables) with composite primary key ((chat_id), message_id DESC) where message_id is a 64-bit Snowflake ID so messages sort chronologically on disk without secondary indexes.',
        diagram: `ScyllaDB Wide-Column Layout:
Partition Key: chat_id (Hashes chat to owning shard ring node)
Clustering Key: message_id DESC (64-bit Snowflake -> contiguous disk range scan)`,
        chaos: [
          {
            btn: 'Probe: Why cap WhatsApp groups at 1,000 members?',
            ans: 'Because WhatsApp uses End-to-End Encryption (Signal Protocol) with Fan-Out-on-Write per recipient device. Discord supports 500k-user servers because channels are not E2EE per-device and use Fan-Out-on-Read for passive members.',
          },
        ],
      },
    ],
  },
  {
    id: 'uber',
    title: 'Uber / Lyft (Real-Time Geospatial Dispatch)',
    phases: [
      {
        time: '00:00 - 45:00',
        name: '01. Uber H3 Hexagonal Indexing & Dispatch Lock',
        signal: 'Why H3 Hexagons beat SQL Lat/Lng and Quadtrees for 2.5M GPS writes/sec.',
        interviewer: '10M active drivers send GPS pings every 4 seconds. How do you ingest 2.5M writes/sec and match riders within 2km in under 100ms?',
        candidate: 'SQL lat/lng range scans and dynamic Quadtree rebalancing choke at 2.5M writes/sec. Instead, we quantize the Earth into Uber H3 Hexagons (Resolution 8 ≈ 0.7 km²). Every GPS ping maps in O(1) math to an h3_cell_id and writes to an in-memory Redis cluster with a 15-second TTL. Matching queries the center hexagon plus its 6 equidistant neighbor rings in parallel.',
        diagram: `Driver GPS (37.7749, -122.4194) ──O(1) Math──► H3 Hex ID: "8828308281fffff"
Match Query: K-Ring(center_hex, k=1) ──► Queries center hex + 6 neighbor hexagons in O(1)`,
        chaos: [
          {
            btn: 'Probe: Why Hexagons over Square Geohashes?',
            ans: 'In a square grid, diagonal neighbors are √2 (1.41x) further from the center than edge neighbors. In a hexagonal grid, all 6 neighbors are the exact same Euclidean distance from the center, making ETA radius searches uniform.',
          },
        ],
      },
    ],
  },
];

export interface CodeVaultItem {
  tag: string;
  title: string;
  sub: string;
  why: string;
  code: string;
}

export const CODE_VAULT: CodeVaultItem[] = [
  {
    tag: '01. Rate Limiting (Redis Lua)',
    title: 'Atomic Distributed Token Bucket',
    sub: 'Eliminates TOCTOU race conditions at 1M+ RPS inside API Gateways',
    why: 'Running GET tokens in application code followed by SET tokens - 1 creates a Time-of-Check to Time-of-Use race condition under concurrent traffic. Redis executes Lua scripts atomically on its single-threaded event loop.',
    code: `-- KEYS[1]: rate_limit:{user_id}
-- ARGV[1]: capacity (e.g. 100 tokens)
-- ARGV[2]: refill_rate_per_ms (e.g. 0.01 tokens/ms = 10 req/sec)
-- ARGV[3]: current_timestamp_ms
-- ARGV[4]: requested_tokens (1)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local data = redis.call("HMGET", key, "tokens", "last_updated")
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  last_updated = now
else
  local elapsed = math.max(0, now - last_updated)
  tokens = Math.min(capacity, tokens + (elapsed * refill_rate))
  last_updated = now
end

if tokens >= requested then
  tokens = tokens - requested
  redis.call("HMSET", key, "tokens", tokens, "last_updated", last_updated)
  redis.call("PEXPIRE", key, math.ceil((capacity / refill_rate) * 2))
  return {1, math.floor(tokens)} -- ALLOWED (HTTP 200)
else
  redis.call("HMSET", key, "tokens", tokens, "last_updated", last_updated)
  return {0, math.floor(tokens)} -- REJECTED (HTTP 429)
end`,
  },
  {
    tag: '02. Cache Stampede Defense (Go)',
    title: 'Singleflight Request Coalescing',
    sub: 'Collapses 50,000 concurrent cache misses on an expired hot key into 1 DB query',
    why: 'When a celebrity profile key expires in Redis, 50,000 concurrent requests get a CACHE MISS simultaneously and stampede PostgreSQL. Singleflight ensures only the first caller queries the DB while the other 49,999 callers wait on the shared in-memory result.',
    code: `package cache

import "sync"

type call struct {
	wg  sync.WaitGroup
	val any
	err error
}

type SingleflightGroup struct {
	mu sync.Mutex
	m  map[string]*call
}

// Do ensures only ONE execution of fn runs per key concurrently in this process.
func (g *SingleflightGroup) Do(key string, fn func() (any, error)) (any, error) {
	g.mu.Lock()
	if g.m == nil {
		g.m = make(map[string]*call)
	}
	if c, inFlight := g.m[key]; inFlight {
		g.mu.Unlock()
		c.wg.Wait() // 49,999 concurrent callers wait here for the single DB query
		return c.val, c.err
	}
	c := new(call)
	c.wg.Add(1)
	g.m[key] = c
	g.mu.Unlock()

	c.val, c.err = fn() // Only 1 caller hits PostgreSQL
	c.wg.Done()

	g.mu.Lock()
	delete(g.m, key)
	g.mu.Unlock()

	return c.val, c.err
}`,
  },
  {
    tag: '03. High-Contention Locking (PostgreSQL)',
    title: 'Deadlock-Free Seat & Inventory Booking',
    sub: 'Deterministic lock ordering + FOR UPDATE NOWAIT and SKIP LOCKED',
    why: 'In Ticketmaster or Flash Sales, you must prevent Lost Updates and AB/BA Deadlocks. Sorting seat IDs before locking prevents circular waits, and FOR UPDATE NOWAIT fails fast in 0ms instead of queueing 10,000 connections.',
    code: `-- PATTERN A: Specific Seat Selection (Fail fast if another user grabbed it)
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Sort seat_ids ('A1', 'A2') lexicographically to prevent AB/BA Deadlocks
SELECT seat_id, status
FROM event_seats
WHERE event_id = 9001
  AND seat_id IN ('A1', 'A2')
  AND status = 'AVAILABLE'
ORDER BY seat_id ASC
FOR UPDATE NOWAIT; -- Fails immediately if locked by a concurrent transaction

UPDATE event_seats
SET status = 'HELD', held_by = 4421, hold_until = NOW() + INTERVAL '5 minutes'
WHERE event_id = 9001 AND seat_id IN ('A1', 'A2');

COMMIT;

-- PATTERN B: Best-Available Seat / Job Queue Claiming (SKIP LOCKED)
UPDATE event_seats
SET status = 'HELD', held_by = 4421
WHERE seat_id = (
  SELECT seat_id FROM event_seats
  WHERE event_id = 9001 AND section = 'VIP' AND status = 'AVAILABLE'
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING seat_id;`,
  },
  {
    tag: '04. Distributed Systems (Python)',
    title: 'Consistent Hash Ring with Virtual Nodes',
    sub: 'Powers DynamoDB, Cassandra, and Sharded Caches with 1/N key movement',
    why: 'Modulo hashing (hash(key) % N) remaps 90%+ of keys when a node crashes. Consistent Hashing with 150 Virtual Nodes per physical server guarantees uniform distribution and moves only 1/N keys on scale events.',
    code: `import hashlib
from bisect import bisect_right, insort

class ConsistentHashRing:
    def __init__(self, vnodes_per_node: int = 150):
        self.vnodes = vnodes_per_node
        self.ring_keys: list[int] = []
        self.ring_map: dict[int, str] = {}

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, physical_node: str) -> None:
        for i in range(self.vnodes):
            vnode_hash = self._hash(f"{physical_node}#vnode{i}")
            insort(self.ring_keys, vnode_hash)
            self.ring_map[vnode_hash] = physical_node

    def get_node(self, item_key: str) -> str:
        if not self.ring_keys:
            raise RuntimeError("Hash ring is empty")
        h = self._hash(item_key)
        idx = bisect_right(self.ring_keys, h) % len(self.ring_keys)
        return self.ring_map[self.ring_keys[idx]]`,
  },
  {
    tag: '05. Microservices Integrity (SQL + Kafka)',
    title: 'Transactional Outbox & Idempotent Consumer',
    sub: 'Eliminates Dual-Write inconsistency between PostgreSQL and Kafka',
    why: 'Never write to a DB and publish to Kafka in two separate network calls. Commit the business row and the Outbox event in one atomic DB transaction, and deduplicate on the consumer using a unique event_id.',
    code: `-- 1. PRODUCER SIDE: Atomic Local Transaction
BEGIN;
  INSERT INTO payments (payment_id, user_id, amount_cents, status)
  VALUES ('pay_991', 'usr_42', 4999, 'CAPTURED');

  INSERT INTO outbox_events (event_id, aggregate_type, aggregate_id, payload)
  VALUES ('evt_772', 'PAYMENT', 'pay_991', '{"payment_id":"pay_991","amount":4999}');
COMMIT;
-- (Debezium CDC tails Postgres WAL and publishes outbox_events to Kafka)

-- 2. CONSUMER SIDE: Idempotent Event Deduplication
BEGIN;
  INSERT INTO processed_events (event_id, processed_at)
  VALUES ('evt_772', NOW())
  ON CONFLICT (event_id) DO NOTHING;

  -- Apply side-effect only if INSERT succeeded (row count == 1)
  UPDATE user_ledgers SET balance_cents = balance_cents + 4999 WHERE user_id = 'usr_42';
COMMIT;`,
  },
  {
    tag: '06. Distributed ID Generation (TypeScript)',
    title: '64-Bit Time-Ordered Snowflake ID Generator',
    sub: '4,096 time-sortable 64-bit IDs per millisecond per node with zero coordination',
    why: 'UUIDv4 is 128-bit and completely random, causing severe B+Tree page fragmentation on inserts. Snowflake IDs fit in a 64-bit BIGINT and sort chronologically, keeping B+Tree index inserts sequential.',
    code: `// 64-Bit Layout: [1 bit sign][41 bits timestamp ms][10 bits node_id][12 bits sequence]
export class SnowflakeIDGenerator {
  private lastTimestamp = -1n;
  private sequence = 0n;
  private readonly epoch = 1704067200000n; // Custom Epoch (Jan 1, 2024)

  constructor(private readonly nodeId: bigint) {
    if (nodeId < 0n || nodeId > 1023n) throw new Error("Node ID must be 0..1023");
  }

  public nextId(): bigint {
    let now = BigInt(Date.now());
    if (now < this.lastTimestamp) {
      throw new Error("NTP Clock moved backwards! Refusing to generate IDs");
    }
    if (now === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & 4095n; // 12-bit mask (0..4095)
      if (this.sequence === 0n) {
        while (now <= this.lastTimestamp) now = BigInt(Date.now());
      }
    } else {
      this.sequence = 0n;
    }
    this.lastTimestamp = now;
    return ((now - this.epoch) << 22n) | (this.nodeId << 12n) | this.sequence;
  }
}`,
  },
];

export interface GauntletQuestion {
  id: number;
  q: string;
  opts: { title: string; desc: string; ok: boolean }[];
  verdict: string;
}

export const GAUNTLET_QUESTIONS: GauntletQuestion[] = [
  {
    id: 1,
    q: 'You are designing Instagram’s Like Counter for celebrity posts receiving 50,000 likes/second. Executing UPDATE posts SET likes = likes + 1 WHERE post_id = 99 in PostgreSQL on every click causes severe lock contention. How do you fix it?',
    opts: [
      {
        title: 'A. Add 20 PostgreSQL Read Replicas',
        desc: 'Scale out the database cluster with read replicas and PgBouncer connection pooling.',
        ok: false,
      },
      {
        title: 'B. Write-Back In-Memory Aggregation (Sharded Redis / Kafka Batching)',
        desc: 'Increment atomic counters in sharded Redis (INCRBY) and flush aggregated deltas to PostgreSQL every 2 seconds.',
        ok: true,
      },
      {
        title: 'C. Distributed 2-Phase Commit across SQL Shards',
        desc: 'Split the post row across 10 SQL shards using synchronous 2PC.',
        ok: false,
      },
    ],
    verdict:
      'Read replicas only scale reads—every replica still replays every write, and updating the same row 50,000 times/sec causes row-level lock contention and MVCC dead-tuple bloat. Buffering increments in Redis and flushing likes = likes + 48210 every 2 seconds collapses 50,000 disk writes into 1.',
  },
  {
    id: 2,
    q: 'In an Order Checkout service, an engineer writes db.save(order) and on the next line calls kafkaProducer.send(orderCreatedEvent). Why will a Principal Engineer reject this in an architecture review?',
    opts: [
      {
        title: 'A. Dual-Write Partial Failure Bug',
        desc: 'If the pod crashes or network drops after db.save() commits but before kafka.send() succeeds, the order is stored in DB but fulfillment never runs.',
        ok: true,
      },
      {
        title: 'B. Kafka is too slow for synchronous calls',
        desc: 'Kafka takes >500ms per write so you should use RabbitMQ instead.',
        ok: false,
      },
      {
        title: 'C. Call kafka.send() first, then db.save()',
        desc: 'Publishing to Kafka first guarantees eventual consistency.',
        ok: false,
      },
    ],
    verdict:
      'Calling kafka.send() first has the exact inverse bug (if db.save() fails on a constraint violation, you emitted a phantom order event). Use the Transactional Outbox Pattern: commit both orders and outbox_events in one local ACID transaction and stream the outbox table to Kafka via Debezium CDC.',
  },
  {
    id: 3,
    q: 'You are designing Uber. Drivers send GPS coordinates every 4 seconds (2.5M writes/sec). Why does storing live driver coordinates in PostgreSQL with a B+Tree index on (latitude, longitude) fail at scale?',
    opts: [
      {
        title: 'A. PostgreSQL does not support 64-bit floats',
        desc: 'Lat/Lng coordinates require GPU vector databases.',
        ok: false,
      },
      {
        title: 'B. 2D B+Tree Range Scans + Massive MVCC Write Amplification',
        desc: 'A standard B+Tree only narrows 1 dimension efficiently, while 2.5M updates/sec thrash disk IOPS and VACUUM.',
        ok: true,
      },
      {
        title: 'C. TCP packet overhead between mobile and Postgres',
        desc: 'GPS coordinates exceed the Ethernet MTU frame size.',
        ok: false,
      },
    ],
    verdict:
      'Ephemeral high-frequency location data belongs in an in-memory spatial index (Redis with Uber H3 hexagonal cells and a 15-second TTL), while historical trip breadcrumbs are batched asynchronously to Kafka and ScyllaDB/S3.',
  },
  {
    id: 4,
    q: 'Your team is building an AI assistant that streams generated tokens back to the browser while the user only sends a prompt once a minute. Which transport protocol is optimal?',
    opts: [
      {
        title: 'A. Server-Sent Events (SSE) over HTTP/2',
        desc: 'Standard HTTP request with Accept: text/event-stream—unidirectional streaming over stateless HTTP/2 load balancers.',
        ok: true,
      },
      {
        title: 'B. Full-Duplex WebSockets with custom L4 Gateways',
        desc: 'Maintain stateful persistent WebSocket connections for every reader.',
        ok: false,
      },
      {
        title: 'C. Short Polling every 100ms',
        desc: 'Have the browser call GET /tokens 10 times per second.',
        ok: false,
      },
    ],
    verdict:
      'LLM token streaming is strictly unidirectional (Server → Client) after the prompt is submitted. Server-Sent Events (SSE) work natively over standard HTTP/2, support automatic reconnection (Last-Event-ID), and avoid stateful WebSocket gateway sticky sessions.',
  },
  {
    id: 5,
    q: 'A transactions table has 500 Million rows. Executing SELECT * FROM transactions WHERE user_id = 42 ORDER BY created_at DESC OFFSET 100000 LIMIT 20 takes 4.2 seconds at P99. How do you make it sub-5ms?',
    opts: [
      {
        title: 'A. Reduce LIMIT 20 to LIMIT 5',
        desc: 'Transferring 20 rows over the network is the bottleneck.',
        ok: false,
      },
      {
        title: 'B. Replace OFFSET with Keyset Cursor Pagination',
        desc: 'Query WHERE user_id = 42 AND (created_at, id) < (:last_ts, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20.',
        ok: true,
      },
      {
        title: 'C. Move the entire 500M table into Memcached',
        desc: 'Store all historical financial rows in volatile RAM.',
        ok: false,
      },
    ],
    verdict:
      'OFFSET 100000 is O(N)—the database walks and discards 100,000 index entries before returning 20 rows. Keyset Cursor Pagination jumps directly to the composite B+Tree index position (user_id, created_at DESC, id DESC) in O(log N) time (< 2ms).',
  },
];
