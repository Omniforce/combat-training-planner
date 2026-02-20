import { useState } from 'react';
import { useHiscores } from '../../hooks/useHiscores.js';

export default function UsernameLookup({ onImport }) {
  const [username, setUsername] = useState('');
  const [pendingData, setPendingData] = useState(null);
  const { lookup, loading, error } = useHiscores();

  const handleLookup = async () => {
    const result = await lookup(username);
    if (result) {
      setPendingData(result);
    }
  };

  const handleConfirm = () => {
    if (pendingData) {
      onImport(pendingData);
      setPendingData(null);
      setUsername('');
    }
  };

  const handleCancel = () => {
    setPendingData(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLookup();
  };

  return (
    <div className="username-lookup">
      <div className="lookup-row">
        <input
          type="text"
          placeholder="RSN lookup..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
          className="lookup-input"
        />
        <button onClick={handleLookup} disabled={loading || !username.trim()}>
          {loading ? 'Loading...' : 'Lookup'}
        </button>
      </div>
      {error && <p className="lookup-error">{error}</p>}
      {pendingData && (
        <div className="lookup-confirm">
          <p className="lookup-result">
            Atk: {pendingData.attack} / Str: {pendingData.strength} / Def: {pendingData.defence}
          </p>
          <div className="lookup-actions">
            <button className="btn-confirm" onClick={handleConfirm}>Import</button>
            <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
