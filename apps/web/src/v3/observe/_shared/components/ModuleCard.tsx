import { CroppedArt } from './CroppedArt.js';
import styles from './ModuleCard.module.css';

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
    <button className={styles.card} type="button">
      <span className={styles.number}>{number}</span>
      <CroppedArt className={`${styles.art} ${artClassName}`} src={artSrc} />
      <span className={styles.copy}>
        <strong>
          {title.split('\n').map((line) => (
            <span key={line}>{line}</span>
          ))}
        </strong>
        <em className={active ? styles.active : ''}>{status}</em>
      </span>
    </button>
  );
}
