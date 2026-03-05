// Bundle optimization utilities

// Lazy import helper
export const lazyImport = <T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T
) => {
  return React.lazy(() =>
    factory().then((module) => ({ default: module[name] }))
  );
};

// Memory cleanup for unmounted components
export const useCleanup = (callback: () => void) => {
  React.useEffect(() => {
    return callback;
  }, []);
};

// Optimized state manager for large datasets
export class OptimizedStateManager<T> {
  private data = new Map<string, T>();
  private listeners = new Set<() => void>();

  set(key: string, value: T) {
    this.data.set(key, value);
    this.notifyListeners();
  }

  get(key: string): T | undefined {
    return this.data.get(key);
  }

  delete(key: string) {
    this.data.delete(key);
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  clear() {
    this.data.clear();
    this.listeners.clear();
  }
}

// Memory-efficient array operations
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Optimized object deep clone (faster than JSON parse/stringify)
export const fastClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => fastClone(item)) as any;
  if (typeof obj === "object") {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = fastClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

// Performance monitoring
export const performanceMonitor = {
  startTiming: (label: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-start`);
    }
  },
  
  endTiming: (label: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      if (process.env.NODE_ENV === 'development') {
        const measure = performance.getEntriesByName(label)[0];
        console.log(`⏱️ ${label}: ${Math.round(measure.duration)}ms`);
      }
    }
  }
};