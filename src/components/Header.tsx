import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "../i18n";

const NAV_ITEMS = [
  { to: "/", labelKey: "findRide", end: true },
  { to: "/post", labelKey: "postRide", end: false },
  { to: "/rides", labelKey: "myRides", end: false },
  { to: "/profile", labelKey: "profile", end: false }
];

export function Header() {
  const { language, toggleLanguage, t } = useTranslation();

  return (
    <header className="site-header" style={{ position: 'relative' }}>
      <Link className="brand-lockup" to="/">
        <img src={`${import.meta.env.BASE_URL}deshride_logo_primary.png`} alt="DeshRide" />
      </Link>

      <nav className="site-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <button 
        onClick={toggleLanguage}
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '6px 12px',
          background: '#00D1B2',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {language === 'bn' ? 'EN' : 'BN'}
      </button>
    </header>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="bottom-nav" aria-label="Primary mobile">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className="bottom-nav__link">
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
