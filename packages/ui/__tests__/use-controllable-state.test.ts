import { describe, expect, it, vi } from 'vitest';

/**
 * Pure contract tests for controllable state semantics
 * (mirrors useControllableState without React test renderer).
 */
function simulateControllableState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
) {
  let internal = defaultValue;
  const isControlled = () => controlledValue !== undefined;
  const get = () => (isControlled() ? (controlledValue as T) : internal);
  const set = (next: T) => {
    if (!isControlled()) internal = next;
    onChange?.(next);
  };
  return { get, set, setControlled: (v: T | undefined) => { controlledValue = v; } };
}

describe('useControllableState contract', () => {
  it('updates internal state when uncontrolled', () => {
    const onChange = vi.fn();
    const state = simulateControllableState(undefined, 'a', onChange);
    expect(state.get()).toBe('a');
    state.set('b');
    expect(state.get()).toBe('b');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('does not mutate internal when controlled; still notifies', () => {
    const onChange = vi.fn();
    const state = simulateControllableState('x', 'default', onChange);
    expect(state.get()).toBe('x');
    state.set('y');
    expect(state.get()).toBe('x');
    expect(onChange).toHaveBeenCalledWith('y');
  });
});
