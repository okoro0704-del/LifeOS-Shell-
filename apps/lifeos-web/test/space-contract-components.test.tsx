import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpaceControls } from '../src/lib/SpaceControls';
import { useSpaceRuntime } from '../src/lib/useSpaceRuntime';
import type { SpaceDefinition } from '../src/lib/space-runtime';

const spaces: SpaceDefinition[] = ['fixture.one', 'fixture.two'].map(id => ({
  id, owner: id, defaultExperienceId: 'APP',
  experiences: ['APP', 'TV'].map(id => ({ id, title: id, type: id, lifecyclePolicy: 'retained', offlinePolicy: 'cached' })),
}));
const activate = vi.fn();
let runtime: ReturnType<typeof useSpaceRuntime>;
function Harness({ enabled = true }: { enabled?: boolean }) {
  runtime = useSpaceRuntime(spaces[0], activate, enabled, spaces);
  return <><video data-testid="retained-media" /><SpaceControls {...runtime} />
    <output data-testid="state">{runtime.state.presentationState}</output></>;
}
const event = (type: Parameters<typeof runtime.dispatch>[0]) => act(() => runtime.dispatch(type));
const reveal = () => event({ type: 'DOUBLE_TAP_CANVAS' });
const summon = () => { reveal(); event({ type: 'TAP_HANDLE' }); };
const settle = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

describe('Space Contract V1 component adapter (fixture Spaces only)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    activate.mockReset();
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('temporary handle expires without replacing the media node', () => {
    render(<Harness />);
    const media = screen.getByTestId('retained-media');
    reveal();
    expect(screen.getByRole('button', { name: 'Open Space controls' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('button', { name: 'Open Space controls' })).toBeNull();
    expect(screen.getByTestId('retained-media')).toBe(media);
  });
  it('arbitrates single vs double clicks and pins without summoning', () => {
    render(<Harness />); reveal();
    const handle = screen.getByRole('button', { name: 'Open Space controls' });
    fireEvent.click(handle, { detail: 1 });
    fireEvent.click(handle, { detail: 2 });
    act(() => vi.advanceTimersByTime(5000));
    expect(runtime.state.handlePinned).toBe(true);
    expect(runtime.state.presentationState).toBe('REVEAL_HANDLE');
    expect(screen.queryByRole('navigation')).toBeNull();
    fireEvent.click(handle, { detail: 1 });
    act(() => vi.advanceTimersByTime(320));
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
  it('supports keyboard-style activation without a pointer delay', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal Space handle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Space controls' }), { detail: 0 });
    expect(runtime.state.presentationState).toBe('SUMMONED_UI');
  });
  it('keeps preference flags separate and restores them after remount', () => {
    const view = render(<Harness />); summon();
    fireEvent.click(screen.getByRole('button', { name: 'Keep UI' }));
    expect(runtime.state.handlePinned).toBe(false);
    view.unmount(); render(<Harness />);
    expect(runtime.state.persistentUI).toBe(true);
    expect(runtime.state.handlePinned).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Hide UI' }));
    expect(runtime.state.presentationState).toBe('GLASS');
  });
  it('interaction overlays retain media node and Experience identity', () => {
    render(<Harness />); summon();
    const media = screen.getByTestId('retained-media');
    fireEvent.click(screen.getByRole('button', { name: 'Interactions' }));
    expect(runtime.state.currentExperienceId).toBe('APP');
    expect(runtime.state.presentationState).toBe('INTERACTION');
    expect(screen.getByTestId('retained-media')).toBe(media);
    fireEvent.click(screen.getByRole('button', { name: 'Close interactions' }));
    expect(runtime.state.presentationState).toBe('GLASS');
  });
  it('Switch invokes the registered activation boundary without changing Space', async () => {
    render(<Harness />); summon();
    fireEvent.click(screen.getByRole('button', { name: 'TV', exact: true }));
    expect(runtime.state.presentationState).toBe('SWITCHING');
    await settle();
    expect(activate).toHaveBeenLastCalledWith('TV', 'fixture.one');
    expect(runtime.state.currentSpaceId).toBe('fixture.one');
    expect(runtime.state.currentExperienceId).toBe('TV');
  });
  it('Revolve activates a different fixture Space and restores TV on return', async () => {
    render(<Harness />); summon();
    event({ type: 'SELECT_EXPERIENCE', experienceId: 'TV' }); await settle(); summon();
    event({ type: 'REVOLVE', spaceId: 'fixture.two' }); await settle();
    expect(runtime.state.currentSpaceId).toBe('fixture.two');
    expect(runtime.state.currentExperienceId).toBe('APP');
    summon(); event({ type: 'REVOLVE', spaceId: 'fixture.one' }); await settle();
    expect(runtime.state.currentExperienceId).toBe('TV');
    expect(JSON.parse(localStorage.getItem('space-contract-v1:fixture.one')!).lastActiveExperienceId).toBe('TV');
  });
  it('activation failure keeps the previous experience and exposes an error', async () => {
    render(<Harness />); summon();
    activate.mockRejectedValueOnce(new Error('unavailable'));
    event({ type: 'SELECT_EXPERIENCE', experienceId: 'TV' }); await settle();
    expect(runtime.state.currentExperienceId).toBe('APP');
    expect(screen.getByRole('alert')).toHaveTextContent('Activation failed');
  });
  it('disabled App-mode adapter does not activate or write Space state', () => {
    render(<Harness enabled={false} />);
    expect(activate).not.toHaveBeenCalled();
    expect(localStorage.getItem('space-contract-v1:fixture.one')).toBeNull();
  });
  it('storage failure degrades to Glass rather than crashing', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    render(<Harness />);
    expect(runtime.state.presentationState).toBe('GLASS');
  });
});
