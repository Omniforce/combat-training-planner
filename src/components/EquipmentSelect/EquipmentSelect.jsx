import { useState, useMemo, useRef, useEffect } from 'react';
import weapons from '../../data/weapons.json';
import armor from '../../data/armor.json';
import './EquipmentSelect.css';

const ALL_ITEMS = (() => {
  const items = [];
  for (const w of weapons) {
    items.push({ name: w.name, slot: w.twoHanded ? '2H Weapon' : 'Weapon' });
  }
  const slotLabels = {
    head: 'Head', body: 'Body', legs: 'Legs', boots: 'Boots',
    gloves: 'Gloves', cape: 'Cape', neck: 'Neck', ring: 'Ring', shield: 'Shield',
  };
  for (const [slot, list] of Object.entries(armor)) {
    for (const item of list) {
      items.push({ name: item.name, slot: slotLabels[slot] || slot });
    }
  }
  return items;
})();

export default function EquipmentSelect({ selectedEquipment, onToggle }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const lower = search.toLowerCase();
    return ALL_ITEMS
      .filter(item => !selectedEquipment.has(item.name) && item.name.toLowerCase().includes(lower))
      .slice(0, 12);
  }, [search, selectedEquipment]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAdd = (name) => {
    onToggle(name);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) {
      // Open on arrow down even when closed
      if (e.key === 'ArrowDown' && results.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => (i <= 0 ? results.length - 1 : i - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleAdd(results[activeIndex].name);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex];
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleClear = () => {
    selectedEquipment.forEach(name => onToggle(name));
  };

  const selectedBySlot = useMemo(() => {
    const groups = {};
    for (const item of ALL_ITEMS) {
      if (!selectedEquipment.has(item.name)) continue;
      if (!groups[item.slot]) groups[item.slot] = [];
      groups[item.slot].push(item);
    }
    return groups;
  }, [selectedEquipment]);

  const slotOrder = ['Weapon', '2H Weapon', 'Head', 'Neck', 'Cape', 'Body', 'Legs', 'Shield', 'Gloves', 'Boots', 'Ring'];
  const hasSelected = selectedEquipment.size > 0;

  return (
    <div className="section-card">
      <h2>Available Equipment</h2>
      <p className="equip-description">Add the gear you own or plan to use. You can add multiple items for the same slot — the optimizer will figure out the best piece to equip at each stage of training.</p>

      <div className="equip-toolbar">
        <div className="equip-search-wrap" ref={wrapperRef}>
          <input
            type="text"
            placeholder="Search to add gear..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="equip-search"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls="equip-listbox"
            aria-activedescendant={activeIndex >= 0 ? `equip-option-${activeIndex}` : undefined}
            aria-autocomplete="list"
          />
          {open && results.length > 0 && (
            <ul className="equip-dropdown" role="listbox" id="equip-listbox" ref={listRef}>
              {results.map((item, i) => (
                <li
                  key={item.name}
                  id={`equip-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`equip-dropdown-item${i === activeIndex ? ' equip-dropdown-active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAdd(item.name); }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className="equip-dropdown-name">{item.name}</span>
                  <span className="equip-dropdown-slot">{item.slot}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="btn-small" onClick={handleClear}>Clear</button>
      </div>

      {!hasSelected ? (
        <p className="equip-empty">No equipment selected. Search above to add gear.</p>
      ) : (
        <div className="equip-slots">
          {slotOrder.map(slot => {
            const items = selectedBySlot[slot];
            if (!items) return null;
            return (
              <div key={slot} className="equip-slot-group">
                <span className="equip-slot-label">{slot}</span>
                <div className="equip-slot-tags">
                  {items.map(item => (
                    <span key={item.name} className="equip-tag">
                      {item.name}
                      <button className="equip-tag-remove" onClick={() => onToggle(item.name)} aria-label={`Remove ${item.name}`}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
