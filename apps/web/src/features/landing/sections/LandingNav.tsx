import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '../../../components/ui/Button.js';
import styles from './LandingNav.module.css';

const NAV_LINKS = [
  { label: 'Platform', href: '#pillars' },
  { label: 'Data Layers', href: '#pillars' },
  { label: 'Use Cases', href: '#cta' },
  { label: 'Pricing', href: '#cta', disabled: true },
  { label: 'Docs', href: '#', disabled: true },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav aria-label="Primary" className={styles.nav} data-scrolled={scrolled ? 'true' : 'false'}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo} aria-label="Atlas home">
          ATLAS<span>Land Intelligence</span>
        </a>
        <div className={styles.links}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.disabled ? undefined : l.href}
              className={styles.link}
              aria-disabled={l.disabled ? 'true' : undefined}
              tabIndex={l.disabled ? -1 : 0}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className={styles.right}>
          <Link to="/login" className={styles.signIn}>
            Sign in
          </Link>
          <Link to="/login">
            <Button variant="primary" size="sm">
              Request access →
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
