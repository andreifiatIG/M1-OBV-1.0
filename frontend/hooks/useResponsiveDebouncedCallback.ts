import { useRef, useEffect, useCallback } from 'react';

/**
 * Debounced callback that clears timers on unmount and toggles typing state.
 */
export const useResponsiveDebouncedCallback = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  onTypingStateChange?: (isTyping: boolean) => void
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        onTypingStateChange?.(false);
      }
    };
  }, [onTypingStateChange]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      onTypingStateChange?.(true);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
        onTypingStateChange?.(false);
      }, delay);
    },
    [delay, onTypingStateChange]
  );
};
