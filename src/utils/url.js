import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';

function parseParams(params) {
  const currentLevels = {
    attack: parseInt(params.get('ca')) || 1,
    strength: parseInt(params.get('cs')) || 1,
    defence: parseInt(params.get('cd')) || 1,
  };

  const goalLevels = {
    attack: parseInt(params.get('ga')) || 99,
    strength: parseInt(params.get('gs')) || 99,
    defence: parseInt(params.get('gd')) || 99,
  };

  const eqStr = params.get('eq');
  const equipment = eqStr ? eqStr.split('|') : [];

  return { currentLevels, goalLevels, equipment };
}

export function encodeState({ currentLevels, goalLevels, equipment }) {
  const params = new URLSearchParams();

  if (currentLevels) {
    params.set('ca', currentLevels.attack);
    params.set('cs', currentLevels.strength);
    params.set('cd', currentLevels.defence);
  }

  if (goalLevels) {
    params.set('ga', goalLevels.attack);
    params.set('gs', goalLevels.strength);
    params.set('gd', goalLevels.defence);
  }

  if (equipment && equipment.length > 0) {
    params.set('eq', equipment.join('|'));
  }

  const raw = params.toString();
  const compressed = 'z=' + compressToEncodedURIComponent(raw);

  return compressed.length < raw.length ? compressed : raw;
}

export function decodeState(search) {
  const params = new URLSearchParams(search);
  const compressed = params.get('z');

  if (compressed) {
    try {
      const inner = decompressFromEncodedURIComponent(compressed);
      if (inner) {
        return parseParams(new URLSearchParams(inner));
      }
    } catch {
      // fall through to legacy parsing
    }
  }

  return parseParams(params);
}
