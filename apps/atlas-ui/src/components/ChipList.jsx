export function ChipList({ items, className = "", removable = false }) {
  return (
    <div className={`chip-list ${className}`}>
      {items.map((item) => (
        <span className={item.tone ? `chip ${item.tone}` : "chip"} key={item.label ?? item}>
          {item.icon ? <item.icon aria-hidden="true" /> : null}
          {item.label ?? item}
          {removable ? <button type="button" aria-label={`Remove ${item.label ?? item}`}>x</button> : null}
        </span>
      ))}
    </div>
  );
}
