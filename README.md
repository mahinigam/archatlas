# ArchAtlas

> Interactive FAANG System Design Knowledge Map, Live Topology Simulator, Storage Engine Workbench, and Staff-Level Concurrency Vault.

ArchAtlas bridges high-level architectural theory and low-level system physics. Instead of static diagrams and abstract advice, ArchAtlas provides executable visual models, queuing theory simulators, distributed consensus testbenches, and production concurrency primitives.

---

## Workspaces & Capabilities

### 1. Knowledge Map & Curriculum (`00` / `01`)
* **25 Connected Modules**: Spanning CS Fundamentals, Transport Protocols, Storage Engines, Caching, Event Streaming, Consensus, Distributed Sagas, and Staff-level Interview Rubrics.
* **Interactive Dependency Graph**: Live SVG swimlane map tracking upstream prerequisites and downstream architectural concepts on hover/selection.
* **Capacity & Back-of-the-Envelope Calculator**: Real-time estimations for Read/Write QPS, storage accumulation, and ingress/egress bandwidth based on DAU, access ratios, and payload sizes.
* **Mastery Tracking**: Interactive flashcards, concept quizzes, and persistent progress saved in local storage.

### 2. Whiteboard Lab & Topology Simulator (`02`)
* **Interactive Drag-and-Drop Canvas**: Freely compose and wire components (Clients, CDNs, Load Balancers, API Gateways, App Services, Redis Caches, Kafka Streams, PostgreSQL, ScyllaDB, S3).
* **Pan & Zoom Navigation**:
  * Trackpad pinch-to-zoom and cursor-centered wheel zoom (0.3x to 3.0x).
  * 1-finger drag and canvas panning with on-canvas zoom controls and 100% reset.
  * Mobile and tablet touch gesture support.
* **Queuing Theory & System Physics (`systemPhysics.ts`)**:
  * QPS propagation across directed acyclic graph (DAG) hops.
  * Little's Law concurrency tracking ($L = \lambda W$).
  * Non-linear queuing latency amplification when component utilization exceeds 85%.
  * Composite SLA calculations across replicated tiers.
* **Staff Architecture Linter**: Automated detection of Single Points of Failure (SPOFs), missing caching tiers, unbuffered relational write saturation (>15k QPS on primary SQL), and severed dependencies.
* **Chaos Mode**: Live fault injection to test hardware outages, failover routes, and traffic blackholes.
* **Interactive Algorithmic Calculators**:
  * Consistent Hashing Ring (0..2³²-1) with virtual nodes and key remap estimation.
  * Token Bucket Rate Limiter with real-time refill ticks and burst testing.
  * Dynamo-style Leaderless Quorum ($W + R > N$) consistency validator.
* **Topology Export & Import**:
  * **JSON Export/Import**: Save and restore full architecture configurations.
  * **2x Retina PNG Export**: High-resolution image export with inlined styles and theme custom properties for design reviews.

### 3. Storage & Distributed Consensus Workbench (`03`)
* **LSM-Tree vs. B+Tree Storage Engines**: Visual comparison of sequential append-only writes (RAM MemTable $\to$ L0 SSTables $\to$ Level Compaction) versus B+Tree in-place updates and random disk IOPS amplification.
* **Raft Consensus & Split-Brain Simulator**: 5-node cluster simulating network partitions (2 vs. 3 nodes), leader elections with incremented Terms, and monotonic Fencing Tokens to prevent split-brain writes.
* **Distributed Sagas vs. Two-Phase Commit (2PC)**:
  * **2PC Simulator**: Phase 1 PREPARE broadcast, unanimous voting, Phase 2 COMMIT/ABORT, and coordinator crash simulation demonstrating distributed lock blocking.
  * **Choreography Saga Simulator**: Forward execution events with automatic backward compensating transactions restoring eventual consistency without distributed locks.
  * Architectural comparison matrix for locking, consistency models, fault isolation, and throughput.
* **Bloom Filter Workbench**: Interactive 32-bit array with hash functions, bit allocation formula ($m/n \approx -1.44 \ln p$), and RAM capacity sizing.
* **Tail Latency Amplification**: Visualizes compound tail latency across $N$ fan-out microservices ($1 - (1-p)^n$) and validates hedged duplicate requests.

### 4. FAANG Interview Simulator & Concurrency Vault (`04`)
* **45-Minute Interview Timer**: Structured breakdown across Requirements, High-Level Design, Deep-Dives, and Failure Modes.
* **Production Concurrency Code Vault**:
  * Distributed Atomic Token Bucket in Redis Lua
  * Singleflight Request Coalescing in Go
  * Deadlock-Free Inventory Reservation in PostgreSQL (`SELECT ... FOR UPDATE`)
  * Consistent Hash Ring with Virtual Nodes
  * Transactional Outbox Pattern with Change Data Capture (CDC)
  * 64-Bit Time-Ordered Snowflake ID Generator
* **Staff Trade-Off Gauntlet**: Scenario-based technical challenges with instant architectural rationale.

---

## Tech Stack

* **Framework**: React 19, TypeScript
* **Build Tool**: Vite 8
* **Styling**: Tailwind CSS v4, Custom Design Tokens (Dark / Light mode)
* **Icons & Animation**: Lucide React, Motion
* **Architecture**: 100% client-side execution. Zero backend dependencies. Fully deterministic local simulation.

---

## Getting Started

### Prerequisites
* Node.js 20+

### Installation

```bash
# Clone the repository
git clone https://github.com/mahinigam/archatlas.git
cd archatlas

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Verification & Scripts

```bash
# Run unit tests (system physics, capacity math, 2PC & Saga state machines)
npm test

# Type-check TypeScript codebase
npm run lint

# Build production bundle
npm run build
```

---

## License

MIT
