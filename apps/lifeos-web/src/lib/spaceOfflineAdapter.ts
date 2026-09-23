import { restoreSpace, type OfflineSpaceAdapter, type SpaceDefinition } from './space-runtime';

/** A catalog URL or watched flag does not prove offline media bytes exist. */
export function createSpaceOfflineAdapter(space: SpaceDefinition): OfflineSpaceAdapter {
  return {
    async restoreCachedSpace() {
      try {
        const saved = restoreSpace(localStorage.getItem('space-contract-v1:' + space.id), space);
        return saved ? { status: 'SUPPORTED', value: saved } : { status: 'UNAVAILABLE', reason: 'No valid saved Space preferences' };
      } catch { return { status: 'UNAVAILABLE', reason: 'Storage unavailable' }; }
    },
    async restoreCachedExperience(id) {
      return space.experiences.some(entry => entry.id === id)
        ? { status: 'NOT_IMPLEMENTED', reason: 'No verified per-Space playback cursor adapter' }
        : { status: 'UNSUPPORTED', reason: 'Experience not registered' };
    },
    async getAvailableMedia() {
      return { status: 'NOT_IMPLEMENTED', reason: 'Catalog metadata does not establish durable media cache availability' };
    },
    getConnectivityState: () => navigator.onLine ? 'online' : 'offline',
    getTransportCapabilities: () => ({ status: 'NOT_IMPLEMENTED', reason: 'Offline calling transport is not established' }),
    validateOfflineSession: () => ({ status: 'NOT_IMPLEMENTED', reason: 'Cached content is not offline identity validation' }),
  };
}
