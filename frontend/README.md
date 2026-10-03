# Advanced Cache Memory Simulator

An interactive educational simulator for exploring cache memory behavior, cache mapping, replacement policies, multi-level caches, and memory-access performance.

The simulator provides a visual way to experiment with different cache configurations and observe how they affect hit/miss behavior, access time, AMAT, stall cycles, and cache contents.

> **Note:** This is an educational cache simulator. It models cache behavior using simplified assumptions and is not intended to reproduce the exact behavior or timing of a physical CPU cache.

---

## Features

### Cache Configuration
Configure the simulator using:
* Cache size
* Block size
* Mapping strategy
* Replacement policy
* Write policy
* Number of cache levels
* Memory access sequence
* Predefined access patterns

### Cache Mapping
The simulator supports:
* Direct mapped
* Set-associative mapping
  * 2-way
  * 4-way
* Fully associative mapping

### Replacement Policies
Supported replacement policies include:
* **LRU** — Least Recently Used
* **FIFO** — First In, First Out
* **LFU** — Least Frequently Used
* **Random**

### Multi-Level Cache
The simulator can model:
* L1 cache
* L1 + L2 cache
* L1 + L2 + L3 cache

A cache miss at one level causes the simulator to check the next available level before accessing main memory.

### Write Policies
The simulator supports:
* Write-back
* Write-through

The educational model also tracks dirty cache blocks and simulated memory writes.

### Access Patterns
Built-in patterns include:
* Sequential
* Loop
* Random
* Stride
* Mixed
* Custom address sequences

---

## Performance Metrics

The simulator reports several cache-performance metrics.

### Hit Ratio
The percentage of total memory accesses satisfied by the cache hierarchy. Higher hit ratios generally indicate better cache effectiveness for the tested workload.

### AMAT
Average Memory Access Time is calculated from the simulated access times of the cache hierarchy. 

The simulator uses the following simplified latency assumptions:

| Level | Simulated Access Time |
| :--- | ---: |
| L1 | 1 cycle |
| L2 | 10 cycles |
| L3 | 30 cycles |
| Main Memory | 100 cycles |

These values are fixed assumptions of the educational model and are not measurements of a specific processor.

### Stall Cycles
Stall cycles represent the simulated cycles spent waiting beyond the 1-cycle L1 baseline.

### Speedup
The simulator provides a simplified speedup comparison against the assumed 100-cycle memory-access baseline.

### Power
Power consumption is represented using arbitrary simulator units to provide a relative comparison between cache hits and misses. It should not be interpreted as physical power consumption in watts.

---

## Visualization

The interface provides visual feedback including:
* Access distribution
* Access timeline
* Cache-size impact
* L1 cache state
* Valid bits
* Tags
* Data
* Dirty bits
* Access counts
* Replacement history
* Performance statistics

The simulator also supports:
* Step-by-step execution
* Automatic execution
* Run All
* Reset
* JSON result export
* Dark mode

---

## How the Simulator Works

For an address access, the simulator:
1. Converts the address into a block address using the configured block size.
2. Determines the appropriate cache set.
3. Calculates the tag for that cache level.
4. Searches the cache for a valid matching block.
5. Records a hit if the block is found.
6. Otherwise checks the next cache level when available.
7. If the block is not found in the cache hierarchy, it accesses simulated main memory.
8. The fetched block is inserted into the cache hierarchy.
9. Replacement policies determine which block is evicted when a set is full.
10. Performance statistics are updated after each access.

---

## Cache Hierarchy

The simulator follows the general lookup sequence:

```text
Memory Request
     |
     v
    L1
     |
     | Miss
     v
    L2
     |
     | Miss
     v
    L3
     |
     | Miss
     v
Main Memory
```

A hit at any cache level avoids accessing the lower levels. When a block is found at L2 or L3, it can be promoted toward L1 in the simulator.

### Address Mapping
For each cache level, the simulator derives:
* \(\text{Block Address} = \lfloor\text{Address} / \text{Block Size}\rfloor\)
* \(\text{Index} = \text{Block Address} \pmod{\text{Number of Sets}}\)
* \(\text{Tag} = \lfloor\text{Block Address} / \text{Number of Sets}\rfloor\)

The number of sets and ways depends on the selected mapping strategy.

### Write Policies
* **Write-back:** A write updates the cached block. The block is marked dirty. A dirty L1 block can generate a simulated memory write when it is evicted.
* **Write-through:** A write updates the cached block. A simulated memory write is recorded immediately. The cache block does not remain dirty because the memory copy is considered updated.

The simulator uses a simplified write-allocate behavior for write misses.

### Replacement Policies
* **LRU:** Evicts the valid block that has not been accessed for the longest time.
* **FIFO:** Evicts the block that has been present in the set for the longest time.
* **LFU:** Evicts the block with the lowest access count.
* **Random:** Selects a cache way randomly for replacement.

---

## Technology Stack
* React
* JavaScript
* Recharts
* Lucide React
* Tailwind CSS
* Create React App

The simulator runs entirely in the browser and does not require a backend.

---

## Running Locally

### Requirements
* Node.js
* npm

### Installation
1. Clone the repository and enter the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

The application will normally be available at: `http://localhost:3000`

### Production Build
To create a production build:
```bash
npm run build
```
The generated production files are placed in the `build/` directory.

---

## Example Experiment

A simple experiment can use:
* **Cache Size:** 8
* **Block Size:** 1
* **Mapping:** Direct
* **Replacement:** LRU
* **Cache Levels:** 1

With the following address sequence:
`0, 1, 2, 3, 0, 1, 4, 5, 0, 1, 2, 3, 6, 7`

This allows repeated accesses to demonstrate the difference between initial misses and later cache hits.

---

## Educational Scope and Limitations

This project is designed to demonstrate cache-memory concepts rather than emulate a particular processor. 

The simulator uses simplified assumptions for:
* Cache latency
* Main-memory latency
* L2/L3 capacity relationships
* Power consumption
* Speedup calculations

It does **not** model:
* A real CPU pipeline
* Hardware cache coherence
* Real processor-specific cache organization
* Hardware prefetchers
* TLB behavior
* Out-of-order execution
* Real physical memory timing
* Hardware-level power consumption

Therefore, the numerical results should be interpreted as results from the simulator's educational model.

### Purpose
The project was developed as a hands-on Computer Organization and Architecture learning tool for understanding:
* Cache organization
* Locality of reference
* Address mapping
* Cache replacement
* Multi-level cache hierarchy
* Cache hits and misses
* Memory access latency
* AMAT
* Stall cycles
* Write policies

---

## Project Structure

```text
Advanced-Cache-Memory-Simulator/
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   │
│   ├── package.json
│   └── README.md
│
├── .gitignore
└── README.md
```

The application logic and user interface are implemented inside the frontend React application.

---

## System Architecture

### Browser-Based Architecture
The simulator is a client-side educational application. No backend server or database is required for the simulation.

```text
User
 |
 v
React Interface
 |
 v
Cache Simulation Logic
 |
 +-------------------+

 |                   |
 v                   v
Cache State       Statistics

 |                   |
 v                   v
L1/L2/L3         Hit Ratio
Mapping          AMAT
Replacement      Stall Cycles
Write Policy     Speedup
 |
 v
Visualizations
```

### Simulation Flow
A typical access follows this process:

```text
Address Input
     |
     v
Convert Address to Block
     |
     v
Calculate Index and Tag
     |
     v
Check L1
     |
   Hit? ---- Yes ----> Record L1 Hit
     |
     No
     |
     v
Check L2
     |
   Hit? ---- Yes ----> Record L2 Hit
     |
     No
     |
     v
Check L3
     |
   Hit? ---- Yes ----> Record L3 Hit
     |
     No
     |
     v
Main Memory
     |
     v
Load Block into Cache
     |
     v
Update Statistics
```

---

## Mapping Strategy

### Direct Mapping
Each memory block maps to exactly one cache set. The simulator determines the set using:
\[\text{Index} = \text{Block Address} \pmod{\text{Number of Sets}}\]

This makes direct mapping simple but can result in conflict misses when multiple blocks map to the same set.

### Set-Associative Mapping
A set can contain multiple cache ways. The simulator supports:
* 2-way set associativity
* 4-way set associativity

When a set is full, the selected replacement policy determines which block is replaced.

### Fully Associative Mapping
A memory block can be placed in any cache location. The simulator searches the available cache entries for a matching tag and uses the selected replacement policy when replacement is required.

---

## Cache Replacement Behavior

When a cache set is full, the simulator selects a victim block according to the configured replacement policy. The replacement history is recorded so that cache eviction behavior can be inspected through the interface.

For example:

```text
Cache Set
+---------+---------+

| Block A | Block B |
+---------+---------+
     |
     | New block arrives
     v
Replacement Policy
     |
     v
Select Victim
     |
     v
Insert New Block
```

---

## Multi-Level Cache Behavior

For multi-level configurations, the simulator models progressively larger cache levels. The educational model uses:
* **L1 Capacity** = Configured Cache Size
* **L2 Capacity** = 4 × L1 Capacity
* **L3 Capacity** = 16 × L1 Capacity

These relationships are simulator assumptions and do not represent the cache sizes of a particular physical CPU.

The simulated access latencies are:
* **L1:** 1 cycle
* **L2:** 10 cycles
* **L3:** 30 cycles
* **Main Memory:** 100 cycles

---

## Performance Calculations

### AMAT Calculation
The simulator calculates AMAT from the total simulated access time divided by the number of accesses. 

\[\text{AMAT} = \frac{\text{Total Simulated Access Time}}{\text{Total Accesses}}\]

* **Example:** If Total Accesses = 10 and Total Access Time = 500 cycles, then AMAT = 500 / 10 = 50 cycles.

The result represents the average simulated access time for the selected workload.

### Stall Cycle Calculation
The simulator uses the L1 access time of 1 cycle as the baseline. For each access:

\[\text{Stall Cycles} = \text{Access Time} - 1\]

Therefore:
* **L1 Hit:** 1 cycle → 0 stall cycles
* **L2 Hit:** 10 cycles → 9 stall cycles
* **L3 Hit:** 30 cycles → 29 stall cycles
* **Memory Miss:** 100 cycles → 99 stall cycles

The total stall cycles are accumulated across the simulated workload.

### Speedup Calculation
The simulator provides a simplified comparison between the cache-enabled simulation and an assumed memory-only baseline.

\[\text{Baseline Time} = \text{Total Accesses} \times 100\]
\[\text{Speedup} = \frac{\text{Baseline Time}}{\text{Simulated Execution Time}}\]

This is an educational comparison based on the simulator's fixed latency assumptions. It should not be interpreted as the real speedup of a physical processor.

### Power Model
The simulator maintains a simplified power-consumption metric. The value is intended only for relative comparison between different simulated access patterns and cache configurations.

It is **NOT**:
* Measured electrical power
* CPU package power
* Cache power in watts
* Hardware energy consumption

The displayed value should therefore be treated as an arbitrary simulation unit.

---

## Access Patterns

The simulator provides several predefined access patterns to demonstrate different forms of memory locality.

* **Sequential:** Addresses are accessed in an increasing sequence. Sequential accesses can benefit from spatial locality because nearby memory blocks are accessed.
* **Loop:** A smaller group of addresses is repeatedly accessed. Loop-style access can demonstrate temporal locality when the working set fits within the cache.
* **Random:** Addresses are selected without a predictable sequential order. Random access patterns can produce less predictable cache behavior.
* **Stride:** Addresses are accessed with a fixed gap between consecutive accesses. Stride patterns can be useful for observing how different block sizes and cache mappings affect locality.
* **Mixed:** Combines different access behaviors to create a varied workload.
* **Custom:** Allows the user to provide a comma-separated sequence of addresses (e.g., `0,1,2,3,0,1,4,5,0,1`).

---

## User Interface & Controls

### Controls
The interface provides controls for:
* Cache size
* Block size
* Mapping strategy
* Replacement policy
* Write policy
* Cache levels
* Access pattern
* Address sequence

Execution controls include:
* **Auto Run:** Automatically processes the address sequence.
* **Step:** Processes the next address.
* **Run All:** Processes the complete address sequence.
* **Reset:** Resets the simulation.
* **Export Results:** Exports simulation results as JSON.

### JSON Export
The simulator provides an export option for saving simulation results. The exported information can be used for:
* Reviewing experiments
* Comparing configurations
* Keeping experiment records
* Inspecting simulation statistics

The export is generated on the client side and does not require a backend server.

### Dark Mode
The interface includes a dark-mode option for viewing the simulator in a darker visual theme. The simulation logic and results remain the same regardless of the selected interface theme.

---

## Example Multi-Level Experiment

To observe multi-level cache behavior, configure:
* **Cache Size:** 2
* **Block Size:** 1
* **Mapping:** Direct
* **Replacement:** LRU
* **Cache Levels:** 2
* **Address Sequence:** `0,1,2,3,0,1`

The initial accesses can reach main memory, while later accesses may be satisfied by a lower cache level rather than going all the way to memory. For three cache levels, the simulator can similarly demonstrate L1, L2, L3, and main-memory outcomes.

---

## Educational Scope and Limitations

### Educational Use Cases
This simulator can be used to understand:
* **Computer Organization:** Cache organization, memory hierarchy, address decomposition, cache mapping, and associativity.
* **Performance Analysis:** Hit ratio, miss behavior, AMAT, stall cycles, access latency, and simplified speedup.
* **Cache Policies:** LRU, FIFO, LFU, and Random replacement, alongside write-back and write-through choices.
* **Memory Locality:** Temporal locality, spatial locality, sequential access, loop access, strided access, and random access.

### Limitations
The simulator is intentionally simplified. It does **not** attempt to reproduce the exact implementation of a modern processor cache. In particular, it does not model:
* CPU microarchitecture or pipeline stages
* Instruction-level execution or out-of-order execution
* Branch prediction or TLBs
* Hardware prefetching
* Cache coherence protocols or NUMA behavior
* Real DRAM timing
* Processor-specific cache inclusivity/exclusivity
* Real hardware energy measurements or processor cache latency

The results should therefore be used to understand cache concepts and compare simulated configurations rather than as measurements of real hardware.

---

## Technology Details

### Architecture Components
* **Frontend:** The user interface is implemented using React.
* **Charts:** Recharts is used for visualizing simulation statistics and performance data.
* **Icons:** Lucide React is used for interface icons.
* **Styling:** Tailwind CSS is loaded through the frontend HTML entry point.
* **Runtime:** The simulator executes locally in the browser and does not require a backend API.

### Development & Deployment
The frontend uses Create React App. To start development:
```bash
cd frontend
npm install
npm start
```

For a production build:
```bash
npm run build
```
The build output is generated in `frontend/build/`. Generated build files are ignored by Git.

### Git and Repository Hygiene
The repository ignores common generated and local-development files such as:
* `__pycache__/` and `*.pyc`
* `node_modules/`
* `build/`
* `.env` and `.env.*`
* `.DS_Store`

This keeps generated files, dependencies, environment files, and local editor artifacts out of version control.

---

## Project Goal

The goal of this project is to provide an interactive and visual way to learn how cache memory behaves under different configurations. Instead of only studying cache concepts theoretically, users can change configuration parameters, execute memory-access sequences, and observe the resulting cache state and performance metrics. The project is intended as an educational Computer Organization and Architecture tool.

---

## License

No formal open-source license is currently specified for this repository.

