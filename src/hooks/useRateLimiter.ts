import { useRef, useCallback } from 'react';

interface RateLimiterConfig {
  maxCalls: number;
  timeWindow: number; // in milliseconds
}

interface QueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export const useRateLimiter = (config: RateLimiterConfig) => {
  const queue = useRef<QueueItem[]>([]);
  const callTimes = useRef<number[]>([]);
  const isProcessing = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessing.current || queue.current.length === 0) return;

    isProcessing.current = true;

    while (queue.current.length > 0) {
      const now = Date.now();
      
      // Remove old call times outside the time window
      callTimes.current = callTimes.current.filter(
        time => now - time < config.timeWindow
      );

      // Check if we can make another call
      if (callTimes.current.length >= config.maxCalls) {
        // Wait until we can make the next call
        const oldestCall = Math.min(...callTimes.current);
        const waitTime = config.timeWindow - (now - oldestCall);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Process the next item in queue
      const item = queue.current.shift();
      if (!item) break;

      try {
        callTimes.current.push(Date.now());
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }

      // Small delay between calls to be respectful
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    isProcessing.current = false;
  }, [config.maxCalls, config.timeWindow]);

  const enqueue = useCallback(<T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queue.current.push({ fn, resolve, reject });
      processQueue();
    });
  }, [processQueue]);

  const getQueueLength = useCallback(() => queue.current.length, []);

  const getCurrentCalls = useCallback(() => {
    const now = Date.now();
    return callTimes.current.filter(time => now - time < config.timeWindow).length;
  }, [config.timeWindow]);

  return {
    enqueue,
    getQueueLength,
    getCurrentCalls
  };
};