const SLOT_ORDER = ['head', 'neck', 'cape', 'body', 'legs', 'shield', 'gloves', 'boots', 'ring'];

export default function GearLoadout({ gear }) {
  const equipped = SLOT_ORDER
    .filter(slot => gear[slot])
    .map(slot => ({ slot, name: gear[slot] }));

  if (equipped.length === 0) return null;

  return (
    <div className="gear-loadout">
      {equipped.map(({ slot, name }) => (
        <span key={slot} className="gear-piece" title={slot}>
          {name}
        </span>
      ))}
    </div>
  );
}
