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
    <header className="site-header">
      <Link className="brand-lockup" to="/">
        <img src={`${import.meta.env.BASE_URL}deshride_logo_primary.png`} alt="DeshRide" />
      </Link>

      <div className="site-header__right">
        <nav className="site-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="lang-toggle" onClick={toggleLanguage}>
          <span className={`lang-toggle__opt${language === 'bn' ? ' lang-toggle__opt--active' : ''}`}>
            বাং
          </span>
          <span className={`lang-toggle__opt${language === 'en' ? ' lang-toggle__opt--active' : ''}`}>
            EN
          </span>
        </button>
      </div>
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
