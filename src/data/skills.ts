import type { ConstellationArt, Point, Skill } from "@/lib/types";

/*
 * All skill tree content lives here.
 *
 * - Perk `position` and `art` points use a 0–100 box (x right, y down).
 *   Roots usually sit near the bottom, like stars rising out of the horizon.
 * - `skyPosition` places the constellation in the sky (0–1000 × 0–625).
 * - Perk ORDER within a skill and skill ORDER in this array are used by
 *   share links. Appending is safe; reordering or removing invalidates
 *   old links (they will show a warning instead of loading wrong perks).
 * - At most 3 ranks per perk.
 */

// ---- small helpers for constellation outline art ----------------------

function polyline(points: Point[], closed = false): ConstellationArt {
  const lines: [number, number][] = points.slice(1).map((_, i) => [i, i + 1]);
  if (closed) lines.push([points.length - 1, 0]);
  return { points, lines };
}

function ellipse(cx: number, cy: number, rx: number, ry: number, steps: number, from = 0, to = 360): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    out.push({ x: +(cx + rx * Math.cos(a)).toFixed(2), y: +(cy + ry * Math.sin(a)).toFixed(2) });
  }
  return out;
}

function merge(...parts: ConstellationArt[]): ConstellationArt {
  const points: Point[] = [];
  const lines: [number, number][] = [];
  for (const part of parts) {
    const offset = points.length;
    points.push(...part.points);
    lines.push(...part.lines.map(([a, b]) => [a + offset, b + offset] as [number, number]));
  }
  return { points, lines };
}

const p = (x: number, y: number): Point => ({ x, y });

// ---- skills -------------------------------------------------------------

export const SKILLS: Skill[] = [
  {
    id: "algorithms",
    name: "Algorithms",
    description:
      "The craft of turning problems into precise, efficient procedures. Higher skill makes every solution leaner and every proof sharper.",
    color: "#ffcf6b",
    skyPosition: p(200, 190),
    // A binary tree.
    art: merge(
      polyline([p(50, 100), p(50, 82)]),
      polyline([p(14, 30), p(26, 56), p(50, 82), p(74, 56), p(86, 30)]),
      polyline([p(26, 56), p(38, 30)]),
      polyline([p(74, 56), p(62, 30)]),
    ),
    perks: [
      {
        id: "asymptotic-insight",
        name: "Asymptotic Insight",
        description: "You see the shape of a loop before it runs.",
        ranks: [
          { requiredSkillLevel: 15, description: "Spot O(n²) at a glance." },
          { requiredSkillLevel: 40, description: "Amortised costs no longer surprise you." },
          { requiredSkillLevel: 70, description: "You think in recurrences." },
        ],
        parents: [],
        position: p(50, 92),
      },
      {
        id: "divide-and-conquer",
        name: "Divide and Conquer",
        description: "Split the problem, solve the halves, merge the answers.",
        ranks: [{ requiredSkillLevel: 25 }],
        parents: ["asymptotic-insight"],
        position: p(30, 74),
      },
      {
        id: "greedy-choice",
        name: "Greedy Choice",
        description: "Take the best option now — and know when that is provably fine.",
        ranks: [{ requiredSkillLevel: 30 }],
        parents: ["asymptotic-insight"],
        position: p(70, 74),
      },
      {
        id: "memoization",
        name: "Memoization",
        description: "Never compute the same answer twice.",
        ranks: [{ requiredSkillLevel: 40 }],
        parents: ["divide-and-conquer"],
        position: p(20, 55),
      },
      {
        id: "dynamic-programming",
        name: "Dynamic Programming",
        description: "Build optimal answers from optimal sub-answers.",
        ranks: [
          { requiredSkillLevel: 55, description: "Tabulate one-dimensional problems." },
          { requiredSkillLevel: 75, description: "Interval and bitmask DP feel natural." },
        ],
        parents: ["memoization"],
        position: p(16, 34),
      },
      {
        id: "graph-traversal",
        name: "Graph Traversal",
        description: "Breadth-first, depth-first, and the patience to know which.",
        ranks: [{ requiredSkillLevel: 40 }],
        parents: ["greedy-choice"],
        position: p(78, 55),
      },
      {
        id: "shortest-paths",
        name: "Shortest Paths",
        description: "Dijkstra in your sleep; Bellman-Ford when the edges turn negative.",
        ranks: [{ requiredSkillLevel: 60 }],
        parents: ["graph-traversal"],
        position: p(86, 36),
      },
      {
        id: "max-flow",
        name: "Max Flow",
        description: "Push as much as the network will carry, and find the cut that stops it.",
        ranks: [{ requiredSkillLevel: 80 }],
        parents: ["shortest-paths"],
        position: p(78, 17),
      },
      {
        id: "las-vegas-gambit",
        name: "Las Vegas Gambit",
        description: "Randomised algorithms: always correct, usually fast.",
        ranks: [{ requiredSkillLevel: 50 }],
        parents: ["divide-and-conquer", "greedy-choice"],
        position: p(50, 56),
      },
      {
        id: "good-enough",
        name: "Good Enough",
        description: "Approximation algorithms with a guaranteed bound.",
        ranks: [{ requiredSkillLevel: 70 }],
        parents: ["las-vegas-gambit"],
        position: p(46, 32),
      },
      {
        id: "p-versus-np",
        name: "P Versus NP",
        description: "You have stared into the open problem, and it blinked first.",
        ranks: [{ requiredSkillLevel: 100 }],
        parents: ["dynamic-programming", "good-enough", "max-flow"],
        position: p(50, 7),
      },
    ],
  },
  {
    id: "systems",
    name: "Systems",
    description:
      "Mastery of the machine beneath the program: processes, memory, and the kernel that arbitrates them.",
    color: "#ff9a5c",
    skyPosition: p(500, 150),
    // A microchip with pins.
    art: merge(
      polyline([p(22, 22), p(78, 22), p(78, 78), p(22, 78)], true),
      polyline([p(36, 22), p(36, 8)]),
      polyline([p(64, 22), p(64, 8)]),
      polyline([p(36, 78), p(36, 92)]),
      polyline([p(64, 78), p(64, 92)]),
      polyline([p(22, 40), p(8, 40)]),
      polyline([p(22, 60), p(8, 60)]),
      polyline([p(78, 40), p(92, 40)]),
      polyline([p(78, 60), p(92, 60)]),
    ),
    perks: [
      {
        id: "fork-and-exec",
        name: "Fork and Exec",
        description: "Every program starts as a copy of another.",
        ranks: [
          { requiredSkillLevel: 15, description: "Spawn processes without fear." },
          { requiredSkillLevel: 35, description: "Signals and exit codes are your friends." },
          { requiredSkillLevel: 60, description: "Zombie processes are reaped on sight." },
        ],
        parents: [],
        position: p(50, 93),
      },
      {
        id: "round-robin",
        name: "Round Robin",
        description: "Everyone gets a turn on the CPU.",
        ranks: [{ requiredSkillLevel: 25 }],
        parents: ["fork-and-exec"],
        position: p(28, 76),
      },
      {
        id: "virtual-memory",
        name: "Virtual Memory",
        description: "Each process believes it owns the whole machine. You know better.",
        ranks: [{ requiredSkillLevel: 30 }],
        parents: ["fork-and-exec"],
        position: p(72, 76),
      },
      {
        id: "syscall",
        name: "Syscall",
        description: "Cross the boundary into the kernel and back, cleanly.",
        ranks: [{ requiredSkillLevel: 35 }],
        parents: ["round-robin", "virtual-memory"],
        position: p(50, 64),
      },
      {
        id: "thread-pool",
        name: "Thread Pool",
        description: "A crew of workers, ready before the work arrives.",
        ranks: [
          { requiredSkillLevel: 40, description: "Fixed-size pools." },
          { requiredSkillLevel: 65, description: "Work stealing between queues." },
        ],
        parents: ["round-robin"],
        position: p(20, 56),
      },
      {
        id: "mutual-exclusion",
        name: "Mutual Exclusion",
        description: "One at a time, please. Deadlocks become rare.",
        ranks: [{ requiredSkillLevel: 50 }],
        parents: ["thread-pool"],
        position: p(14, 36),
      },
      {
        id: "lock-free",
        name: "Lock-Free",
        description: "Compare-and-swap your way past contention.",
        ranks: [{ requiredSkillLevel: 80 }],
        parents: ["mutual-exclusion"],
        position: p(24, 16),
      },
      {
        id: "page-fault-whisperer",
        name: "Page Fault Whisperer",
        description: "You hear the TLB miss before the profiler does.",
        ranks: [{ requiredSkillLevel: 45 }],
        parents: ["virtual-memory"],
        position: p(80, 56),
      },
      {
        id: "cache-line-sense",
        name: "Cache Line Sense",
        description: "Lay data out the way the hardware wants to read it.",
        ranks: [
          { requiredSkillLevel: 50, description: "Avoid false sharing." },
          { requiredSkillLevel: 75, description: "Structure-of-arrays becomes instinct." },
        ],
        parents: ["page-fault-whisperer"],
        position: p(86, 36),
      },
      {
        id: "async-io",
        name: "Async I/O",
        description: "Never block a thread on a disk or a socket again.",
        ranks: [{ requiredSkillLevel: 55 }],
        parents: ["syscall"],
        position: p(52, 42),
      },
      {
        id: "ring-zero",
        name: "Ring Zero",
        description: "You write the code that every other program trusts.",
        ranks: [{ requiredSkillLevel: 90 }],
        parents: ["lock-free", "cache-line-sense", "async-io"],
        position: p(52, 9),
      },
    ],
  },
  {
    id: "networks",
    name: "Networks",
    description:
      "The art of getting bytes from here to there, reliably, quickly, and in the right order.",
    color: "#5ce1ff",
    skyPosition: p(800, 190),
    // A globe: outline, equator and a meridian.
    art: merge(
      polyline(ellipse(50, 50, 42, 42, 16).slice(0, 16), true),
      polyline(ellipse(50, 50, 42, 12, 10, 0, 180)),
      polyline(ellipse(50, 50, 16, 42, 12, 0, 360).slice(0, 12), true),
    ),
    perks: [
      {
        id: "packet-sense",
        name: "Packet Sense",
        description: "You read a hex dump like a newspaper.",
        ranks: [
          { requiredSkillLevel: 15, description: "Headers make sense." },
          { requiredSkillLevel: 40, description: "Spot retransmits in a capture." },
          { requiredSkillLevel: 65, description: "Diagnose MTU issues by feel." },
        ],
        parents: [],
        position: p(50, 93),
      },
      {
        id: "three-way-handshake",
        name: "Three-Way Handshake",
        description: "SYN, SYN-ACK, ACK. Reliable streams on demand.",
        ranks: [{ requiredSkillLevel: 25 }],
        parents: ["packet-sense"],
        position: p(30, 75),
      },
      {
        id: "fire-and-forget",
        name: "Fire and Forget",
        description: "UDP: fast, light, and unapologetic about loss.",
        ranks: [{ requiredSkillLevel: 25 }],
        parents: ["packet-sense"],
        position: p(70, 75),
      },
      {
        id: "name-resolver",
        name: "Name Resolver",
        description: "It's always DNS — and now you can prove it.",
        ranks: [{ requiredSkillLevel: 35 }],
        parents: ["three-way-handshake"],
        position: p(16, 56),
      },
      {
        id: "stateless-charm",
        name: "Stateless Charm",
        description: "HTTP requests that stand on their own.",
        ranks: [{ requiredSkillLevel: 40 }],
        parents: ["three-way-handshake"],
        position: p(40, 57),
      },
      {
        id: "edge-of-the-world",
        name: "Edge of the World",
        description: "Content served from a city near every user.",
        ranks: [{ requiredSkillLevel: 60 }],
        parents: ["name-resolver"],
        position: p(14, 32),
      },
      {
        id: "open-channel",
        name: "Open Channel",
        description: "WebSockets and streams that stay alive.",
        ranks: [{ requiredSkillLevel: 50 }],
        parents: ["stateless-charm", "fire-and-forget"],
        position: p(58, 44),
      },
      {
        id: "multicast",
        name: "Multicast",
        description: "Say it once; everyone who's listening hears it.",
        ranks: [{ requiredSkillLevel: 45 }],
        parents: ["fire-and-forget"],
        position: p(84, 56),
      },
      {
        id: "congestion-control",
        name: "Congestion Control",
        description: "Back off gracefully when the pipes are full.",
        ranks: [
          { requiredSkillLevel: 55, description: "Slow start and AIMD." },
          { requiredSkillLevel: 80, description: "Model-based control on lossy links." },
        ],
        parents: ["open-channel", "multicast"],
        position: p(76, 26),
      },
      {
        id: "byzantine-accord",
        name: "Byzantine Accord",
        description: "Agreement among nodes, even when some of them lie.",
        ranks: [{ requiredSkillLevel: 90 }],
        parents: ["congestion-control", "edge-of-the-world"],
        position: p(44, 10),
      },
    ],
  },
  {
    id: "databases",
    name: "Databases",
    description:
      "Keeping data correct, durable, and fast to find — across one disk or a thousand.",
    color: "#6dffb0",
    skyPosition: p(200, 450),
    // A database cylinder.
    art: merge(
      polyline(ellipse(50, 20, 34, 10, 16).slice(0, 16), true),
      polyline(ellipse(50, 50, 34, 10, 8, 0, 180)),
      polyline(ellipse(50, 80, 34, 10, 8, 0, 180)),
      polyline([p(16, 20), p(16, 80)]),
      polyline([p(84, 20), p(84, 80)]),
    ),
    perks: [
      {
        id: "select-wisdom",
        name: "SELECT Wisdom",
        description: "Ask for exactly the rows you need, and nothing more.",
        ranks: [
          { requiredSkillLevel: 15, description: "Filters and projections." },
          { requiredSkillLevel: 35, description: "Window functions." },
          { requiredSkillLevel: 60, description: "Recursive CTEs." },
        ],
        parents: [],
        position: p(50, 94),
      },
      {
        id: "b-tree-index",
        name: "B-Tree Index",
        description: "Find one row among billions in a handful of reads.",
        ranks: [
          { requiredSkillLevel: 25, description: "Single-column indexes." },
          { requiredSkillLevel: 50, description: "Covering and partial indexes." },
        ],
        parents: ["select-wisdom"],
        position: p(28, 77),
      },
      {
        id: "third-normal-form",
        name: "Third Normal Form",
        description: "Every fact in exactly one place.",
        ranks: [{ requiredSkillLevel: 25 }],
        parents: ["select-wisdom"],
        position: p(72, 77),
      },
      {
        id: "join-planner",
        name: "Join Planner",
        description: "Nested loop, hash, or merge — you pick before the planner does.",
        ranks: [{ requiredSkillLevel: 40 }],
        parents: ["b-tree-index"],
        position: p(18, 58),
      },
      {
        id: "vector-search",
        name: "Vector Search",
        description: "Find rows by meaning, not just by value.",
        ranks: [{ requiredSkillLevel: 75 }],
        parents: ["join-planner"],
        position: p(36, 44),
      },
      {
        id: "acid-oath",
        name: "ACID Oath",
        description: "All or nothing, isolated and durable.",
        ranks: [{ requiredSkillLevel: 40 }],
        parents: ["third-normal-form"],
        position: p(78, 58),
      },
      {
        id: "write-ahead-log",
        name: "Write-Ahead Log",
        description: "Write down what you'll do before you do it. Crashes lose nothing.",
        ranks: [{ requiredSkillLevel: 50 }],
        parents: ["acid-oath"],
        position: p(62, 42),
      },
      {
        id: "snapshot-isolation",
        name: "Snapshot Isolation",
        description: "Readers never wait for writers.",
        ranks: [{ requiredSkillLevel: 60 }],
        parents: ["acid-oath"],
        position: p(88, 36),
      },
      {
        id: "read-replicas",
        name: "Read Replicas",
        description: "Copies that share the load of every SELECT.",
        ranks: [{ requiredSkillLevel: 55 }],
        parents: ["join-planner"],
        position: p(12, 34),
      },
      {
        id: "sharding",
        name: "Sharding",
        description: "Split the data so no single machine has to hold it all.",
        ranks: [
          { requiredSkillLevel: 70, description: "Hash-based shards." },
          { requiredSkillLevel: 85, description: "Live resharding without downtime." },
        ],
        parents: ["read-replicas", "write-ahead-log"],
        position: p(30, 20),
      },
      {
        id: "copy-on-write-branch",
        name: "Copy-on-Write Branch",
        description: "Clone a whole database in an instant; pay only for what changes.",
        ranks: [{ requiredSkillLevel: 80 }],
        parents: ["write-ahead-log"],
        position: p(68, 20),
      },
      {
        id: "planet-scale",
        name: "Planet-Scale",
        description: "One logical database spanning continents.",
        ranks: [{ requiredSkillLevel: 100 }],
        parents: ["sharding", "copy-on-write-branch", "snapshot-isolation"],
        position: p(50, 6),
      },
    ],
  },
  {
    id: "security",
    name: "Security",
    description:
      "Thinking like the attacker so the defender always wins. Trust nothing; verify everything.",
    color: "#ff6b9a",
    skyPosition: p(500, 480),
    // A padlock.
    art: merge(
      polyline(ellipse(50, 38, 22, 24, 10, 180, 360)),
      polyline([p(28, 38), p(28, 46)]),
      polyline([p(72, 38), p(72, 46)]),
      polyline([p(18, 46), p(82, 46), p(82, 92), p(18, 92)], true),
      polyline([p(50, 62), p(50, 76)]),
    ),
    perks: [
      {
        id: "threat-model",
        name: "Threat Model",
        description: "Know who you're defending against, and what they want.",
        ranks: [
          { requiredSkillLevel: 15, description: "List your assets." },
          { requiredSkillLevel: 40, description: "Map trust boundaries." },
          { requiredSkillLevel: 65, description: "Attack trees for every feature." },
        ],
        parents: [],
        position: p(50, 94),
      },
      {
        id: "salted-hash",
        name: "Salted Hash",
        description: "Passwords stored so even you can't read them.",
        ranks: [{ requiredSkillLevel: 25 }],
        parents: ["threat-model"],
        position: p(28, 77),
      },
      {
        id: "sanitize-inputs",
        name: "Sanitize Inputs",
        description: "All input is hostile until proven otherwise.",
        ranks: [{ requiredSkillLevel: 25 }],
        parents: ["threat-model"],
        position: p(72, 77),
      },
      {
        id: "least-privilege",
        name: "Least Privilege",
        description: "Grant only what is needed, only for as long as it's needed.",
        ranks: [{ requiredSkillLevel: 45 }],
        parents: ["salted-hash", "sanitize-inputs"],
        position: p(50, 62),
      },
      {
        id: "public-key",
        name: "Public Key",
        description: "Share one key with the world; guard the other with your life.",
        ranks: [
          { requiredSkillLevel: 40, description: "Sign and verify." },
          { requiredSkillLevel: 65, description: "Key rotation without downtime." },
        ],
        parents: ["salted-hash"],
        position: p(20, 56),
      },
      {
        id: "tls-handshake",
        name: "TLS Handshake",
        description: "Private conversations over a public wire.",
        ranks: [{ requiredSkillLevel: 50 }],
        parents: ["public-key"],
        position: p(14, 34),
      },
      {
        id: "escape-artist",
        name: "Escape Artist",
        description: "Every output encoded for exactly where it lands.",
        ranks: [{ requiredSkillLevel: 40 }],
        parents: ["sanitize-inputs"],
        position: p(80, 56),
      },
      {
        id: "sandbox",
        name: "Sandbox",
        description: "Let untrusted code run, inside walls it can't climb.",
        ranks: [{ requiredSkillLevel: 60 }],
        parents: ["least-privilege"],
        position: p(52, 40),
      },
      {
        id: "fuzzer",
        name: "Fuzzer",
        description: "Throw a million malformed inputs and watch what breaks.",
        ranks: [{ requiredSkillLevel: 55 }],
        parents: ["escape-artist"],
        position: p(86, 34),
      },
      {
        id: "zero-day-hunter",
        name: "Zero-Day Hunter",
        description: "Find the flaw before anyone else knows it exists.",
        ranks: [{ requiredSkillLevel: 80 }],
        parents: ["fuzzer", "sandbox"],
        position: p(70, 14),
      },
      {
        id: "zero-knowledge",
        name: "Zero Knowledge",
        description: "Prove you know the secret without revealing it.",
        ranks: [{ requiredSkillLevel: 90 }],
        parents: ["tls-handshake"],
        position: p(30, 12),
      },
    ],
  },
  {
    id: "compilers",
    name: "Compilers",
    description:
      "Translating human intent into machine instructions — and making the result faster than you wrote it.",
    color: "#b98cff",
    skyPosition: p(800, 450),
    // Angle brackets with a slash: < / >
    art: merge(
      polyline([p(30, 22), p(8, 50), p(30, 78)]),
      polyline([p(70, 22), p(92, 50), p(70, 78)]),
      polyline([p(58, 16), p(42, 84)]),
    ),
    perks: [
      {
        id: "tokenizer",
        name: "Tokenizer",
        description: "Characters become words.",
        ranks: [
          { requiredSkillLevel: 15, description: "Keywords and literals." },
          { requiredSkillLevel: 35, description: "Unicode identifiers and escapes." },
          { requiredSkillLevel: 60, description: "Incremental re-lexing." },
        ],
        parents: [],
        position: p(50, 94),
      },
      {
        id: "recursive-descent",
        name: "Recursive Descent",
        description: "Words become sentences, one function per rule.",
        ranks: [{ requiredSkillLevel: 25 }],
        parents: ["tokenizer"],
        position: p(50, 78),
      },
      {
        id: "abstract-syntax",
        name: "Abstract Syntax",
        description: "Strip away the punctuation; keep the meaning.",
        ranks: [{ requiredSkillLevel: 30 }],
        parents: ["recursive-descent"],
        position: p(32, 64),
      },
      {
        id: "scope-resolver",
        name: "Scope Resolver",
        description: "Every name bound to exactly the thing it means.",
        ranks: [{ requiredSkillLevel: 35 }],
        parents: ["recursive-descent"],
        position: p(68, 64),
      },
      {
        id: "type-inference",
        name: "Type Inference",
        description: "The compiler figures out the types so you don't have to write them.",
        ranks: [
          { requiredSkillLevel: 45, description: "Local inference." },
          { requiredSkillLevel: 70, description: "Full unification with generics." },
        ],
        parents: ["abstract-syntax"],
        position: p(18, 46),
      },
      {
        id: "ssa-form",
        name: "SSA Form",
        description: "Every variable assigned exactly once. Optimisations fall out.",
        ranks: [{ requiredSkillLevel: 50 }],
        parents: ["abstract-syntax", "scope-resolver"],
        position: p(50, 48),
      },
      {
        id: "constant-folding",
        name: "Constant Folding",
        description: "Do the maths at compile time, not run time.",
        ranks: [{ requiredSkillLevel: 45 }],
        parents: ["scope-resolver"],
        position: p(82, 46),
      },
      {
        id: "garbage-collector",
        name: "Garbage Collector",
        description: "Memory that cleans up after itself.",
        ranks: [{ requiredSkillLevel: 60 }],
        parents: ["type-inference"],
        position: p(22, 24),
      },
      {
        id: "register-allocator",
        name: "Register Allocator",
        description: "Colour the interference graph; spill as little as possible.",
        ranks: [{ requiredSkillLevel: 65 }],
        parents: ["ssa-form"],
        position: p(58, 30),
      },
      {
        id: "just-in-time",
        name: "Just-in-Time",
        description: "Compile the hot paths while the program is running.",
        ranks: [{ requiredSkillLevel: 75 }],
        parents: ["register-allocator", "constant-folding"],
        position: p(80, 20),
      },
      {
        id: "self-hosting",
        name: "Self-Hosting",
        description: "Your compiler compiles itself.",
        ranks: [{ requiredSkillLevel: 100 }],
        parents: ["garbage-collector", "just-in-time"],
        position: p(48, 7),
      },
    ],
  },
];
