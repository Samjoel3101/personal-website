import { describe, expect, it, vi } from 'vitest';
import { createEmitter } from '../src/core/emitter.js';

describe('event emitter', () => {
  it('delivers to every subscriber', () => {
    const emitter = createEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on('ping', a);
    emitter.on('ping', b);
    emitter.emit('ping', 42);
    expect(a).toHaveBeenCalledWith(42);
    expect(b).toHaveBeenCalledWith(42);
  });

  it('ignores events nobody listens for', () => {
    expect(() => createEmitter().emit('nothing')).not.toThrow();
  });

  it('unsubscribes via the returned function and via off', () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    const unsubscribe = emitter.on('ping', handler);
    unsubscribe();
    emitter.emit('ping');
    expect(handler).not.toHaveBeenCalled();

    emitter.on('pong', handler);
    emitter.off('pong', handler);
    emitter.emit('pong');
    expect(handler).not.toHaveBeenCalled();
  });

  it('lets a handler unsubscribe itself mid-emit', () => {
    const emitter = createEmitter();
    const calls = [];
    const first = () => {
      calls.push('first');
      emitter.off('ping', first);
    };
    emitter.on('ping', first);
    emitter.on('ping', () => calls.push('second'));

    expect(() => emitter.emit('ping')).not.toThrow();
    expect(calls).toEqual(['first', 'second']);
    emitter.emit('ping');
    expect(calls).toEqual(['first', 'second', 'second']);
  });

  it('clears everything', () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.on('ping', handler);
    emitter.clear();
    emitter.emit('ping');
    expect(handler).not.toHaveBeenCalled();
  });
});
