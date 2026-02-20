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

  return params.toString();
}

export function decodeState(search) {
  const params = new URLSearchParams(search);

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
