import styles from './LandingFooter.module.css';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Platform', href: '#pillars' },
      { label: 'Data Layers', href: '#pillars' },
      { label: 'Changelog', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Ogden', href: '#' },
      { label: 'Covenant', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Data policy', href: '#' },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          <div className={styles.brandCol}>
            <span className={styles.wordmark}>ATLAS</span>
            <p className={styles.mission}>
              Geospatial land intelligence for farmers, landowners, and regenerative operators. Built by Ogden Agriculture.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className={styles.colTitle}>{col.title}</p>
              <ul className={styles.linkList}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className={styles.link}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.bottomBar}>
          <span>© 2026 Ogden Agriculture</span>
          <span className={styles.arabic} dir="rtl" lang="ar">
            بسم الله الرحمن الرحيم
          </span>
        </div>
      </div>
    </footer>
  );
}
