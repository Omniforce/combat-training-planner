import { useState, useCallback } from 'react';

const CORS_PROXY = 'https://corsproxy.io/?';
const HISCORES_URL = 'https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=';

// Skill indices in the hiscores response
const SKILL_INDICES = {
  attack: 1,
  defence: 2,
  strength: 3,
  hitpoints: 4,
};

function parseHiscores(csv) {
  const lines = csv.trim().split('\n');
  const skills = {};

  for (const [name, index] of Object.entries(SKILL_INDICES)) {
    if (index < lines.length) {
      const parts = lines[index].split(',');
      // Format: rank,level,xp
      const level = parseInt(parts[1]);
      if (!isNaN(level) && level >= 1) {
        skills[name] = level;
      }
    }
  }

  return skills;
}

export function useHiscores() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const lookup = useCallback(async (username) => {
    if (!username || !username.trim()) {
      setError('Please enter a username');
      return null;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const encodedName = encodeURIComponent(username.trim());
      const url = `${CORS_PROXY}${encodeURIComponent(HISCORES_URL + encodedName)}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Player not found');
        }
        throw new Error('Failed to fetch hiscores');
      }

      const text = await response.text();
      const skills = parseHiscores(text);

      if (!skills.attack) {
        throw new Error('Could not parse hiscores data');
      }

      const result = {
        attack: skills.attack || 1,
        strength: skills.strength || 1,
        defence: skills.defence || 1,
      };

      setData(result);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  return { lookup, loading, error, data };
}
