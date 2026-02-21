const SLOT_ORDER = ['head', 'neck', 'cape', 'body', 'legs', 'shield', 'gloves', 'boots', 'ring'];

export default function GearLoadout({ gear, weapon, prevGear, prevWeapon }) {
  const items = [];

  if (weapon) {
    items.push({ slot: 'weapon', name: weapon, changed: prevWeapon != null && weapon !== prevWeapon });
  }

  for (const slot of SLOT_ORDER) {
    if (gear[slot]) {
      items.push({ slot, name: gear[slot], changed: prevGear ? gear[slot] !== prevGear[slot] : false });
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="gear-loadout">
      {items.map(({ slot, name, changed }) => (
        <span key={slot} className={`gear-piece${changed ? ' gear-changed has-tooltip' : ''}`} data-tooltip={changed ? 'Changed since previous step' : undefined}>
          {name}
        </span>
      ))}
    </div>
  );
}
