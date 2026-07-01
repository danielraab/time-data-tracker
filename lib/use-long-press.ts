import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  threshold?: number;
}

/**
 * Detects long-press gestures via pointer events.
 *
 * Returns `handlers` to spread onto the target element, and `isLongPress` ref
 * that click handlers can inspect (and reset) to suppress the immediate action
 * when a long press was detected.
 *
 * @example
 * const { isLongPress, handlers } = useLongPress(() => openModal());
 *
 * function handleClick() {
 *   if (isLongPress.current) { isLongPress.current = false; return; }
 *   doImmediateAction();
 * }
 *
 * return <button onClick={handleClick} {...handlers}>…</button>;
 */
export function useLongPress(
  onLongPress: () => void,
  { threshold = 500 }: UseLongPressOptions = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    isLongPress,
    handlers: {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
  };
}

/**
 * Pure helper — exported for unit tests.
 *
 * Returns true when a click event should be suppressed because a long-press
 * was just detected. Resets the ref as a side-effect so subsequent clicks are
 * not blocked.
 */
export function consumeLongPress(
  isLongPress: React.MutableRefObject<boolean>,
): boolean {
  if (isLongPress.current) {
    isLongPress.current = false;
    return true;
  }
  return false;
}
