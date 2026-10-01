# Advanced Cache Memory Simulator

An interactive, web-based simulation tool designed for students, educators, and computer system architects to visualize and analyze memory hierarchy performance in real time.

## 📌 Project Overview

The **Advanced Cache Memory Simulator** provides an intuitive visual interface to model memory access patterns, cache hit/miss behavior, and cache line replacements across custom hardware configurations. By executing memory accesses step-by-step, users can observe how parameters like cache size, mapping techniques, and replacement policies directly impact Average Memory Access Time (AMAT), stall cycles, and hit ratios.

---

## ✨ Key Features

* **Flexible Hardware Configuration:**
* **Cache Sizes:** Customizable block counts (e.g., 2, 4, 8, 16, 32 blocks).
* **Block Sizes:** Support for variable word sizes (1, 2, 4, or 8 words per block).
* **Mapping Schemes:** Direct Mapped, Fully Associative, 2-Way Set Associative, and 4-Way Set Associative.
* **Replacement Policies:** LRU (Least Recently Used), FIFO (First In First Out), LFU (Least Frequently Used), and Random.
* **Write Policies:** Write-Back and Write-Through support.
* **Multi-Level Caching:** Model L1-only, L1 + L2, or L1 + L2 + L3 memory hierarchies.


* **Interactive Memory Access Patterns:**
* Pre-configured workloads: **Sequential**, **Loop**, **Random**, **Stride**, and **Mixed**.
* **Custom Access Pattern Input:** Test specific access strings (e.g., `0, 1, 2, 3, 0, 1, 4, 5`).


* **Real-Time Visualization & Analysis:**
* **Step-by-Step & Auto-Run Modes:** Step through memory requests one by one or run full simulations automatically.
* **Live Cache State Table:** View block indices, ways, valid bits, tags, data contents, dirty bits, and access counts per cache entry.
* **Performance Metrics Breakdown:** Real-time updates for Total Accesses, Hit Ratio (%), AMAT (cycles), Stall Cycles, and Power Consumption.
* **Graphical Analytics:** Access distribution charts, execution timelines, and cache size vs. hit ratio comparison graphs.



---

## 📊 Analytical Formulae Used

The simulator models memory latency using standard Computer Organization and Architecture formulas:

* **Average Memory Access Time (AMAT):**

$$\text{AMAT} = \text{Hit Time} + (\text{Miss Rate} \times \text{Miss Penalty})$$


* **Hit Ratio:**

$$\text{Hit Ratio} = \left( \frac{\text{Hits}}{\text{Total Accesses}} \right) \times 100\%$$


* **Stall Cycles:**

$$\text{Stall Cycles} = \text{Misses} \times \text{Miss Penalty}$$



---

## 🛠️ Tech Stack

* **Frontend Framework:** React / Next.js
* **Styling:** Tailwind CSS / CSS Modules
* **Charts & Visualization:** Chart.js / Recharts
* **State Management & Logic:** Custom JavaScript Simulation Engine

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your system.

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/cache-memory-simulator.git
cd cache-memory-simulator

```


2. **Install dependencies:**
```bash
npm install

```


3. **Run the development server:**
```bash
npm run dev

```


4. **Open in browser:**
Navigate to `http://localhost:3000` to access the simulator.

---

## 🎯 Example Usage

1. **Set Configuration:** Select `Cache Size = 8`, `Mapping = Direct Mapped`, and `Replacement = LRU`.
2. **Enter Memory Addresses:** Input `0,1,2,3,0,1,4,5` into the custom address field.
3. **Execute Simulation:** Click **Step** to trace tag comparisons and index placement for each request, or **Run All** to compute aggregate statistics immediately.
4. **Analyze Output:** Review the cache heatmap and AMAT breakdown to observe spatial/temporal locality effects.
