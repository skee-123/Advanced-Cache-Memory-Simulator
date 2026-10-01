import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Area, AreaChart } from 'recharts';
import { Play, RotateCcw, Download, Sun, Moon, Info, StepForward, Zap } from 'lucide-react';

// Cache Core Logic
class CacheSimulator {
  constructor(config) {
    this.config = config;

    this.cache = [];
    this.l2Cache = [];
    this.l3Cache = [];

    this.stats = {
      hits: 0,
      misses: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      memoryAccesses: 0,
      writeHits: 0,
      writeMisses: 0,
      memoryWrites: 0,
      totalAccesses: 0,
      stallCycles: 0,
      totalAccessTime: 0,
      powerConsumption: 0
    };

    this.accessHistory = [];
    this.replacementHistory = [];

    this.initializeCache();
  }

  getLevelParameters(capacity) {
    const { associativity } = this.config;

    if (associativity === 'direct') {
      return {
        sets: capacity,
        ways: 1
      };
    }

    if (associativity === 'full') {
      return {
        sets: 1,
        ways: capacity
      };
    }

    const ways = parseInt(associativity.split('-')[0], 10);
    const sets = Math.max(1, Math.floor(capacity / ways));

    return {
      sets,
      ways
    };
  }

  createCache(capacity) {
    const { sets, ways } = this.getLevelParameters(capacity);

    return Array.from({ length: sets }, () =>
      Array.from({ length: ways }, () => ({
        valid: false,
        tag: null,
        data: null,
        dirty: false,
        lastAccess: 0,
        accessCount: 0,
        insertTime: 0
      }))
    );
  }

  initializeCache() {
    const { cacheSize, levels } = this.config;

    // L1 = configured cache size.
    this.cache = this.createCache(cacheSize);

    /*
     * Educational hierarchy:
     * L2 has 4x the L1 capacity.
     * L3 has 16x the L1 capacity.
     *
     * These are simulator assumptions, not measurements
     * of a real processor.
     */
    if (levels >= 2) {
      this.l2Cache = this.createCache(cacheSize * 4);
    } else {
      this.l2Cache = [];
    }
    if (levels >= 3) {
      this.l3Cache = this.createCache(cacheSize * 16);
    } else {
      this.l3Cache = [];
    }
  }

  getAddressParts(address, cache) {
    const { blockSize } = this.config;

    const blockAddress = Math.floor(address / blockSize);

    if (!cache || cache.length === 0) {
      return {
        blockAddress,
        index: 0,
        tag: blockAddress
      };
    }

    const index = blockAddress % cache.length;
    const tag = Math.floor(blockAddress / cache.length);

    return {
      blockAddress,
      index,
      tag
    };
  }

  findBlock(cache, address) {
    if (!cache || cache.length === 0) {
      return {
        index: 0,
        tag: null,
        blockIndex: -1
      };
    }

    const { index, tag } = this.getAddressParts(address, cache);
    const set = cache[index] || [];

    const blockIndex = set.findIndex(
      block => block && block.valid && block.tag === tag
    );

    return {
      index,
      tag,
      blockIndex
    };
  }

  access(address, type = 'read', currentTime = 0) {
    this.stats.totalAccesses++;

    const { levels, writePolicy } = this.config;

    let hit = false;
    let level = 0;
    let accessTime = 0;

    // -------------------------
    // L1 lookup
    // -------------------------
    const l1Result = this.findBlock(this.cache, address);

    if (l1Result.blockIndex !== -1) {
      const block = this.cache[l1Result.index][l1Result.blockIndex];

      hit = true;
      level = 1;
      accessTime = 1;

      this.stats.hits++;
      this.stats.l1Hits++;

      block.lastAccess = currentTime;
      block.accessCount++;

      this.applyWrite(block, type, writePolicy);
    }

    // -------------------------
    // L2 lookup
    // -------------------------
    if (!hit && levels >= 2) {
      const l2Result = this.findBlock(this.l2Cache, address);

      if (l2Result.blockIndex !== -1) {
        const block = this.l2Cache[l2Result.index][l2Result.blockIndex];

        hit = true;
        level = 2;
        accessTime = 10;

        this.stats.hits++;
        this.stats.l2Hits++;

        block.lastAccess = currentTime;
        block.accessCount++;

        // Promote the block to L1.
        this.loadBlock(
          this.cache,
          address,
          currentTime,
          false
        );

        const l1ResultAfterLoad = this.findBlock(this.cache, address);

        if (l1ResultAfterLoad.blockIndex !== -1) {
          const l1Block =
            this.cache[l1ResultAfterLoad.index][l1ResultAfterLoad.blockIndex];

          this.applyWrite(l1Block, type, writePolicy);
        }
      }
    }

    // -------------------------
    // L3 lookup
    // -------------------------
    if (!hit && levels >= 3) {
      const l3Result = this.findBlock(this.l3Cache, address);

      if (l3Result.blockIndex !== -1) {
        const block = this.l3Cache[l3Result.index][l3Result.blockIndex];

        hit = true;
        level = 3;
        accessTime = 30;

        this.stats.hits++;
        this.stats.l3Hits++;

        block.lastAccess = currentTime;
        block.accessCount++;

        // Promote L3 -> L2 -> L1.
        this.loadBlock(
          this.l2Cache,
          address,
          currentTime,
          false
        );

        this.loadBlock(
          this.cache,
          address,
          currentTime,
          false
        );

        const l1ResultAfterLoad = this.findBlock(this.cache, address);

        if (l1ResultAfterLoad.blockIndex !== -1) {
          const l1Block =
            this.cache[l1ResultAfterLoad.index][l1ResultAfterLoad.blockIndex];

          this.applyWrite(l1Block, type, writePolicy);
        }
      }
    }

    // -------------------------
    // Main memory
    // -------------------------
    if (!hit) {
      this.stats.misses++;
      this.stats.memoryAccesses++;

      level = 0;
      accessTime = 100;

      // Write-allocate:
      // On a write miss, first load the block into the cache,
      // then perform the write on the cached block.
      this.loadBlock(
        this.cache,
        address,
        currentTime,
        false
      );

      if (levels >= 2) {
        this.loadBlock(
          this.l2Cache,
          address,
          currentTime,
          false
        );
      }

      if (levels >= 3) {
        this.loadBlock(
          this.l3Cache,
          address,
          currentTime,
          false
        );
      }

      const l1ResultAfterLoad = this.findBlock(this.cache, address);

      if (l1ResultAfterLoad.blockIndex !== -1) {
        const l1Block =
          this.cache[l1ResultAfterLoad.index][l1ResultAfterLoad.blockIndex];

        this.applyWrite(l1Block, type, writePolicy);
      }
    }

    // -------------------------
    // Write statistics
    // -------------------------
    if (type === 'write') {
      if (hit) {
        this.stats.writeHits++;
      } else {
        this.stats.writeMisses++;
      }
    }

    // -------------------------
    // Timing
    // -------------------------
    const stallCycles = Math.max(0, accessTime - 1);

    this.stats.stallCycles += stallCycles;
    this.stats.totalAccessTime += accessTime;

    /*
     * Simplified educational power model.
     * These are arbitrary simulator units, not watts.
     */
    this.stats.powerConsumption += hit ? 0.5 : 5;

    this.accessHistory.push({
      address,
      type,
      hit,
      level,
      accessTime,
      index: l1Result.index,
      tag: l1Result.tag,
      timestamp: currentTime
    });

    return {
      hit,
      level,
      accessTime,
      index: l1Result.index,
      tag: l1Result.tag
    };
  }

  applyWrite(block, type, writePolicy) {
    if (!block || type !== 'write') {
      return;
    }

    if (writePolicy === 'write-back') {
      // Write-back: modify cache and mark it dirty.
      block.dirty = true;
    } else if (writePolicy === 'write-through') {
      // Write-through: memory is updated immediately.
      block.dirty = false;
      this.stats.memoryWrites++;
    }
  }

  loadBlock(cache, address, currentTime, dirty = false) {
    if (!cache || cache.length === 0) {
      return;
    }

    const { index, tag } = this.getAddressParts(address, cache);
    const set = cache[index] || [];

    let targetIndex = set.findIndex(
      block => block && !block.valid
    );

    if (targetIndex === -1) {
      targetIndex = this.selectVictim(set, this.config.replacement);

      const victim = set[targetIndex];

      if (victim && victim.valid) {
        /*
         * Only L1 dirty evictions are counted as simulated
         * memory write-backs. L2/L3 are treated as lower-level
         * cache copies in this educational model.
         */
        if (cache === this.cache && victim.dirty) {
          this.stats.memoryWrites++;
        }

        this.replacementHistory.push({
          index,
          tag: victim.tag,
          newTag: tag,
          policy: this.config.replacement,
          timestamp: currentTime
        });
      }
    }

    if (!cache[index]) {
      cache[index] = [];
    }

    cache[index][targetIndex] = {
      valid: true,
      tag,
      data: address,
      dirty,
      lastAccess: currentTime,
      accessCount: 1,
      insertTime: currentTime
    };
  }

  selectVictim(set, policy) {
    if (!set || set.length === 0) {
      return 0;
    }

    const validBlocks = set.filter(
      block => block && block.valid
    );

    if (validBlocks.length === 0) {
      return 0;
    }

    switch (policy) {
      case 'lru':
        return set.reduce((minIdx, block, idx, arr) => {
          if (!block || !block.valid) {
            return minIdx;
          }

          if (
            !arr[minIdx] ||
            !arr[minIdx].valid ||
            block.lastAccess < arr[minIdx].lastAccess
          ) {
            return idx;
          }

          return minIdx;
        }, 0);

      case 'fifo':
        return set.reduce((minIdx, block, idx, arr) => {
          if (!block || !block.valid) {
            return minIdx;
          }

          if (
            !arr[minIdx] ||
            !arr[minIdx].valid ||
            block.insertTime < arr[minIdx].insertTime
          ) {
            return idx;
          }

          return minIdx;
        }, 0);

      case 'lfu':
        return set.reduce((minIdx, block, idx, arr) => {
          if (!block || !block.valid) {
            return minIdx;
          }

          if (
            !arr[minIdx] ||
            !arr[minIdx].valid ||
            block.accessCount < arr[minIdx].accessCount
          ) {
            return idx;
          }

          return minIdx;
        }, 0);

      case 'random':
        return Math.floor(Math.random() * set.length);

      default:
        return 0;
    }
  }

  getHitRatio() {
    if (this.stats.totalAccesses === 0) {
      return '0.00';
    }

    return (
      (this.stats.hits / this.stats.totalAccesses) *
      100
    ).toFixed(2);
  }

  getAMAT() {
    if (this.stats.totalAccesses === 0) {
      return '0.00';
    }

    /*
     * Exact average latency for this simulator's
     * simplified hierarchy:
     *
     * L1 hit = 1
     * L2 hit = 10
     * L3 hit = 30
     * Memory = 100
     */
    return (
      this.stats.totalAccessTime /
      this.stats.totalAccesses
    ).toFixed(2);
  }
}

// Predefined access patterns
const patterns = {
  sequential: (size) => Array.from({ length: size }, (_, i) => i),
  loop: (size) => Array.from({ length: size }, (_, i) => i % 16),
  random: (size) => Array.from({ length: size }, () => Math.floor(Math.random() * 100)),
  stride: (size) => Array.from({ length: size }, (_, i) => i * 4),
  mixed: (size) => {
    const arr = [];
    for (let i = 0; i < size; i++) {
      if (i % 10 === 0) arr.push(Math.floor(Math.random() * 100));
      else arr.push(i);
    }
    return arr;
  }
};

const App = () => {
  const [config, setConfig] = useState({
    cacheSize: 8,
    blockSize: 1,
    associativity: 'direct',
    replacement: 'lru',
    writePolicy: 'write-back',
    levels: 1
  });
  
  const [simulator, setSimulator] = useState(null);
  const [addresses, setAddresses] = useState('0,1,2,3,0,1,4,5,0,1,2,3,6,7');
  const [pattern, setPattern] = useState('custom');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [showTooltip, setShowTooltip] = useState(null);
  const [autoRun, setAutoRun] = useState(false);

  useEffect(() => {
    const sim = new CacheSimulator(config);
    setSimulator(sim);
    setCurrentStep(0);
  }, [config]);
  const initSimulator = () => {
    const sim = new CacheSimulator(config);
    setSimulator(sim);
    setCurrentStep(0);
  };

  const handlePatternChange = (newPattern) => {
    setPattern(newPattern);
    if (newPattern !== 'custom') {
      const patternAddresses = patterns[newPattern](50);
      setAddresses(patternAddresses.join(','));
    }
  };

const runSimulation = () => {
  if (!simulator) return;

  const addrList = addresses
    .split(',')
    .map(a => parseInt(a.trim(), 10))
    .filter(a => !isNaN(a));

  if (currentStep < addrList.length) {
    const addr = addrList[currentStep];
    const type = Math.random() > 0.7 ? 'write' : 'read';

    simulator.access(addr, type, currentStep);

    setCurrentStep(currentStep + 1);
    setSimulator(simulator);
  } else {
    setIsRunning(false);
  }
};

const runAll = () => {
  if (!simulator) return;

  const addrList = addresses
    .split(',')
    .map(a => parseInt(a.trim(), 10))
    .filter(a => !isNaN(a));

  addrList.forEach((addr, idx) => {
    const type = Math.random() > 0.7 ? 'write' : 'read';
    simulator.access(addr, type, idx);
  });

  setCurrentStep(addrList.length);
  setSimulator(simulator);
  setIsRunning(false);
};

  const reset = () => {
    initSimulator();
    setIsRunning(false);
  };

  const exportResults = () => {
    if (!simulator) return;
    
    const data = {
      configuration: config,
      stats: simulator.stats,
      hitRatio: simulator.getHitRatio(),
      amat: simulator.getAMAT(),
      accessHistory: simulator.accessHistory
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cache_simulation_results.json';
    a.click();
  };
  useEffect(() => {
  if (!autoRun || !isRunning || !simulator) {
    return undefined;
  }

  const timer = setTimeout(() => {
    const addrList = addresses
      .split(',')
      .map(a => parseInt(a.trim(), 10))
      .filter(a => !isNaN(a));

    if (currentStep < addrList.length) {
      const addr = addrList[currentStep];
      const type = Math.random() > 0.7 ? 'write' : 'read';

      simulator.access(addr, type, currentStep);
      setCurrentStep(currentStep + 1);
      setSimulator(simulator);
    } else {
      setIsRunning(false);
    }
  }, 500);

  return () => clearTimeout(timer);
}, [
  autoRun,
  isRunning,
  currentStep,
  simulator,
  addresses
]);

  if (!simulator) return <div className="flex items-center justify-center h-screen">Loading...</div>;

const hitMissData = [
  {
    name: 'L1 Hits',
    value: simulator.stats.l1Hits,
    fill: '#10b981'
  },
  {
    name: 'L2 Hits',
    value: simulator.stats.l2Hits,
    fill: '#3b82f6'
  },
  {
    name: 'L3 Hits',
    value: simulator.stats.l3Hits,
    fill: '#8b5cf6'
  },
  {
    name: 'Misses',
    value: simulator.stats.misses,
    fill: '#ef4444'
  }
];
  const timelineData = simulator.accessHistory.slice(-20).map((access, idx) => ({
    step: access.timestamp,
    time: access.accessTime,
    type: access.hit ? 'Hit' : 'Miss',
    level: access.level
  }));

  const cacheSizeData = [2, 4, 8, 16, 32].map(size => {
    const testSim = new CacheSimulator({ ...config, cacheSize: size });
    const testAddrs = addresses.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a));
    testAddrs.forEach((addr, idx) => testSim.access(addr, 'read', idx));
    return {
      size,
      hitRatio: parseFloat(testSim.getHitRatio())
    };
  });

  const bgClass = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const inputClass = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className={`min-h-screen ${bgClass} p-6 transition-colors duration-300`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Zap className="text-yellow-500" />
              Advanced Cache Memory Simulator
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Multi-level cache simulation with real-time performance analysis
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-lg ${cardClass} border`}
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className={`max-w-7xl mx-auto mb-6 ${cardClass} border rounded-lg p-6`}>
        <h2 className="text-2xl font-bold mb-4">🚀 Quick Start Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className={`p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="text-lg font-bold mb-2">1️⃣ Configure Cache</div>
            <p className="opacity-75">Set cache size (start with 8), choose mapping type (Direct is simplest), and select replacement policy (LRU is most common)</p>
          </div>
          <div className={`p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="text-lg font-bold mb-2">2️⃣ Choose Pattern</div>
            <p className="opacity-75">Select "Sequential" for demo, or enter custom addresses like: 0,1,2,3,0,1,4,5</p>
          </div>
          <div className={`p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="text-lg font-bold mb-2">3️⃣ Run & Analyze</div>
            <p className="opacity-75">Click "Auto Run" to watch it work, or "Run All" for instant results. Check graphs and hit ratio!</p>
          </div>
        </div>
        
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className={`${cardClass} border rounded-lg p-6 lg:col-span-1`}>
          <h2 className="text-2xl font-bold mb-4">Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Cache Size (blocks)
                <button 
                  onMouseEnter={() => setShowTooltip('cacheSize')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="ml-2 inline-flex"
                >
                  <Info size={14} />
                </button>
              </label>
              {showTooltip === 'cacheSize' && (
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Number of cache blocks/lines available
                </div>
              )}
              <input
                type="number"
                value={config.cacheSize}
                onChange={(e) => setConfig({...config, cacheSize: parseInt(e.target.value) || 8})}
                className={`w-full px-3 py-2 rounded border ${inputClass}`}
                min="2"
                max="64"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Block Size (words)</label>
              <select
                value={config.blockSize}
                onChange={(e) => setConfig({...config, blockSize: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 rounded border ${inputClass}`}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mapping Technique</label>
              <select
                value={config.associativity}
                onChange={(e) => setConfig({...config, associativity: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${inputClass}`}
              >
                <option value="direct">Direct Mapped</option>
                <option value="full">Fully Associative</option>
                <option value="2-way">2-Way Set Associative</option>
                <option value="4-way">4-Way Set Associative</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Replacement Policy</label>
              <select
                value={config.replacement}
                onChange={(e) => setConfig({...config, replacement: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${inputClass}`}
              >
                <option value="lru">LRU (Least Recently Used)</option>
                <option value="fifo">FIFO (First In First Out)</option>
                <option value="lfu">LFU (Least Frequently Used)</option>
                <option value="random">Random</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Write Policy</label>
              <select
                value={config.writePolicy}
                onChange={(e) => setConfig({...config, writePolicy: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${inputClass}`}
              >
                <option value="write-through">Write Through</option>
                <option value="write-back">Write Back</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cache Levels</label>
              <select
                value={config.levels}
                onChange={(e) => setConfig({...config, levels: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 rounded border ${inputClass}`}
              >
                <option value="1">L1 Only</option>
                <option value="2">L1 + L2</option>
                <option value="3">L1 + L2 + L3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Access Pattern</label>
              <select
                value={pattern}
                onChange={(e) => handlePatternChange(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${inputClass}`}
              >
                <option value="custom">Custom</option>
                <option value="sequential">Sequential</option>
                <option value="loop">Loop (0-15)</option>
                <option value="random">Random</option>
                <option value="stride">Stride (×4)</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Memory Addresses</label>
              <textarea
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${inputClass} font-mono text-sm`}
                rows="3"
                placeholder="0,1,2,3,0,1,4,5..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAutoRun(true);
                  setIsRunning(true);
                }}
                disabled={isRunning}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={16} />
                Auto Run
              </button>
              <button
                onClick={runSimulation}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
              >
                <StepForward size={16} />
                Step
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={runAll}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
              >
                Run All
              </button>
              <button
                onClick={reset}
                className={`flex-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'} px-4 py-2 rounded flex items-center justify-center gap-2`}
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>

            <button
              onClick={exportResults}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Export Results
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`${cardClass} border rounded-lg p-4`}>
              <div className="text-sm opacity-75">Total Accesses</div>
              <div className="text-3xl font-bold">{simulator.stats.totalAccesses}</div>
            </div>
            <div className={`${cardClass} border rounded-lg p-4`}>
              <div className="text-sm opacity-75">Hit Ratio</div>
              <div className="text-3xl font-bold text-green-500">{simulator.getHitRatio()}%</div>
            </div>
            <div className={`${cardClass} border rounded-lg p-4`}>
              <div className="text-sm opacity-75">AMAT (cycles)</div>
              <div className="text-3xl font-bold text-blue-500">{simulator.getAMAT()}</div>
            </div>
            <div className={`${cardClass} border rounded-lg p-4`}>
              <div className="text-sm opacity-75">Stall Cycles</div>
              <div className="text-3xl font-bold text-orange-500">{simulator.stats.stallCycles}</div>
            </div>
          </div>

          {/* AMAT Breakdown */}
          <div className={`${cardClass} border rounded-lg p-6`}>
            <h3 className="text-xl font-bold mb-4">AMAT Breakdown</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="text-sm">
  AMAT = Average access time across L1, L2, L3, and memory
</div>
              <div>AMAT = 1 + {(simulator.stats.misses / (simulator.stats.totalAccesses || 1)).toFixed(4)} × 100</div>
              <div className="text-2xl font-bold text-blue-500">AMAT = {simulator.getAMAT()} cycles</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="opacity-75">Hit Time</div>
                <div className="text-xl font-bold">1 cycle</div>
              </div>
              <div>
                <div className="opacity-75">Miss Rate</div>
                <div className="text-xl font-bold">{(simulator.stats.misses / (simulator.stats.totalAccesses || 1) * 100).toFixed(2)}%</div>
              </div>
              <div>
                <div className="opacity-75">Miss Penalty</div>
                <div className="text-xl font-bold">100 cycles</div>
              </div>
            </div>
          </div>

          {/* Hit/Miss Distribution */}
          <div className={`${cardClass} border rounded-lg p-6`}>
            <h3 className="text-xl font-bold mb-4">Access Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hitMissData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Bar dataKey="value">
                  {hitMissData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Access Timeline */}
          <div className={`${cardClass} border rounded-lg p-6`}>
            <h3 className="text-xl font-bold mb-4">Access Timeline (Last 20)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="step" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} label={{ value: 'Cycles', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="time" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Cache Size vs Hit Ratio */}
          <div className={`${cardClass} border rounded-lg p-6`}>
            <h3 className="text-xl font-bold mb-4">Cache Size Impact</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={cacheSizeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="size" stroke={darkMode ? '#9ca3af' : '#6b7280'} label={{ value: 'Cache Size (blocks)', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} label={{ value: 'Hit Ratio (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Area type="monotone" dataKey="hitRatio" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Cache State Table */}
          <div className={`${cardClass} border rounded-lg p-6`}>
            <h3 className="text-xl font-bold mb-4">L1 Cache State</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                    <th className="text-left p-2">Index</th>
                    <th className="text-left p-2">Way</th>
                    <th className="text-left p-2">Valid</th>
                    <th className="text-left p-2">Tag</th>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Dirty</th>
                    <th className="text-left p-2">Accesses</th>
                  </tr>
                </thead>
                <tbody>
                  {simulator.cache.map((set, setIdx) => 
                    set.map((block, wayIdx) => (
                      <tr 
                        key={`${setIdx}-${wayIdx}`}
                        className={`${darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'} ${
                          !block.valid ? 'opacity-50' : 
                          block.accessCount > 5 ? 'bg-red-500 bg-opacity-20' : 
                          block.accessCount > 2 ? 'bg-yellow-500 bg-opacity-20' : 
                          'bg-green-500 bg-opacity-20'
                        }`}
                      >
                        <td className="p-2">{setIdx}</td>
                        <td className="p-2">{wayIdx}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            block.valid ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                          }`}>
                            {block.valid ? '1' : '0'}
                          </span>
                        </td>
                        <td className="p-2 font-mono">{block.valid ? block.tag : '-'}</td>
                        <td className="p-2 font-mono">{block.valid ? block.data : '-'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            block.dirty ? 'bg-orange-600 text-white' : 'bg-gray-600 text-gray-300'
                          }`}>
                            {block.dirty ? 'D' : '-'}
                          </span>
                        </td>
                        <td className="p-2">{block.accessCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 bg-opacity-20 rounded"></div>
                <span>Cold (1-2 accesses)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 bg-opacity-20 rounded"></div>
                <span>Warm (3-5 accesses)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 bg-opacity-20 rounded"></div>
                <span>Hot (6+ accesses)</span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className={`${cardClass} border rounded-lg p-6`}>
            <h3 className="text-xl font-bold mb-4">Detailed Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm opacity-75">L1 Hits</div>
                <div className="text-2xl font-bold text-green-500">{simulator.stats.l1Hits}</div>
              </div>
              {config.levels >= 2 && (
                <div className="space-y-1">
                  <div className="text-sm opacity-75">L2 Hits</div>
                  <div className="text-2xl font-bold text-blue-500">{simulator.stats.l2Hits}</div>
                </div>
              )}
              {config.levels >= 3 && (
                <div className="space-y-1">
                  <div className="text-sm opacity-75">L3 Hits</div>
                  <div className="text-2xl font-bold text-purple-500">{simulator.stats.l3Hits}</div>
                </div>
              )}
              <div className="space-y-1">
                <div className="text-sm opacity-75">Memory Accesses</div>
                <div className="text-2xl font-bold text-red-500">{simulator.stats.memoryAccesses}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm opacity-75">Write Hits</div>
                <div className="text-2xl font-bold">{simulator.stats.writeHits}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm opacity-75">Write Misses</div>
                <div className="text-2xl font-bold">{simulator.stats.writeMisses}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm opacity-75">Power (arbitrary units)</div>
                <div className="text-2xl font-bold text-yellow-500">{simulator.stats.powerConsumption.toFixed(1)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm opacity-75">Execution Time</div>
                <div className="text-2xl font-bold">
                  {simulator.stats.totalAccesses + simulator.stats.stallCycles} cycles
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm opacity-75">Speedup vs No Cache</div>
                <div className="text-2xl font-bold text-cyan-500">
                  {(simulator.stats.totalAccesses * 100 / (simulator.stats.totalAccesses + simulator.stats.stallCycles)).toFixed(1)}×
                </div>
              </div>
            </div>
          </div>

          {/* Recent Replacements */}
          {simulator.replacementHistory.length > 0 && (
            <div className={`${cardClass} border rounded-lg p-6`}>
              <h3 className="text-xl font-bold mb-4">Recent Replacements</h3>
              <div className="space-y-2">
                {simulator.replacementHistory.slice(-5).reverse().map((rep, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono">Index {rep.index}:</span>
                        <span className="text-red-500 mx-2">Tag {rep.tag}</span>
                        <span>→</span>
                        <span className="text-green-500 mx-2">Tag {rep.newTag}</span>
                      </div>
                      <span className="text-xs opacity-75">
                        {rep.policy.toUpperCase()} • Step {rep.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Educational Info */}
          <div className={`${cardClass} border rounded-lg p-6`}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Info size={20} />
              Understanding Your Results
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Hit Ratio:</strong> Percentage of memory accesses found in cache. Higher is better. Higher hit ratios generally indicate better cache effectiveness.
              </div>
              <div>
                <strong>AMAT (Average Memory Access Time):</strong> Average cycles to access data. Lower is better. Combines hit time and miss penalty.
              </div>
              <div>
                <strong>Stall Cycles:</strong> CPU cycles wasted waiting for memory. Caused by cache misses.
              </div>
              <div>
                <strong>Mapping Techniques:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• <strong>Direct:</strong> Each block maps to exactly one cache location</li>
                  <li>• <strong>Fully Associative:</strong> Block can go anywhere in cache</li>
                  <li>• <strong>Set Associative:</strong> Block maps to a set, can go in any way within that set</li>
                </ul>
              </div>
              <div>
                <strong>Cache Heatmap:</strong> Colors show access frequency. Red = frequently accessed (hot), Yellow = moderately accessed (warm), Green = rarely accessed (cold).
              </div>
            </div>
          </div>

          {/* Configuration Guide */}
          <div className={`${cardClass} border rounded-lg p-6`}>
            <h3 className="text-xl font-bold mb-4">⚙️ Configuration Guide</h3>
            <div className="space-y-4 text-sm">
              <div className={`p-3 rounded ${darkMode ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-100'}`}>
                <strong>Cache Size:</strong> Number of storage blocks in cache
                <div className="mt-1 opacity-75">Small (4-8) = More misses, Large (16-32) = Fewer misses but costly</div>
              </div>
              <div className={`p-3 rounded ${darkMode ? 'bg-green-900 bg-opacity-30' : 'bg-green-100'}`}>
                <strong>Block Size:</strong> How many words stored together
                <div className="mt-1 opacity-75">1 = Store individual words, 4-8 = Store nearby data together (spatial locality)</div>
              </div>
              <div className={`p-3 rounded ${darkMode ? 'bg-purple-900 bg-opacity-30' : 'bg-purple-100'}`}>
                <strong>Replacement Policy:</strong> Which block to remove when cache is full
                <div className="mt-1 opacity-75">LRU = Remove least recently used (most common), FIFO = Remove oldest, Random = Remove random block</div>
              </div>
              <div className={`p-3 rounded ${darkMode ? 'bg-orange-900 bg-opacity-30' : 'bg-orange-100'}`}>
                <strong>Write Policy:</strong> How to handle write operations
                <div className="mt-1 opacity-75">Write-back = Fast (write to cache only), Write-through = Slower but safer (write to memory immediately)</div>
              </div>
              <div className={`p-3 rounded ${darkMode ? 'bg-pink-900 bg-opacity-30' : 'bg-pink-100'}`}>
                <strong>Access Patterns:</strong>
                <div className="mt-1 space-y-1 opacity-75">
                  • Sequential (0,1,2,3...) = Often benefits from spatial locality<br/>
                  • Loop (0-15 repeating) = Good hit ratio if cache ≥ 16<br/>
                  • Random = Often has poorer hit ratio<br/>
                  • Custom = Enter your own: e.g., 0,1,2,3,0,1,4,5
                </div>
              </div>
            </div>
          </div>

         

          


        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-8 text-center text-sm opacity-75">
        <p>Advanced Cache Memory Simulator • Computer Organization & Architecture</p>
        <p className="mt-1">Step: {currentStep} / {addresses.split(',').filter(a => a.trim()).length}</p>
      </div>
    </div>
  );
};

export default App;


