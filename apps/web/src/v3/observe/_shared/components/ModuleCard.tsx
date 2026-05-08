import { CroppedArt } from './CroppedArt.js';

interface ModuleCardProps {
  number: string;
  title: string;
  status: string;
  active?: boolean;
  artSrc: string;
  artClassName?: string;
}

export function ModuleCard({
  number,
  title,
  status,
  active,
  artSrc,
  artClassName = '',
}: ModuleCardProps) {
  return (
    <button className="module-card-handbuilt" type="button">
      <span className="module-number">{number}</span>
      <CroppedArt className={`module-art ${artClassName}`} src={artSrc} />
      <span className="module-copy">
        <strong>
          {title.split('\n').map((line) => (
            <span key={line}>{line}</span>
          ))}
        </strong>
        <em className={active ? 'is-active' : ''}>{status}</em>
      </span>
    </button>
  );
}
