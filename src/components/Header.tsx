import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "../i18n";
import { Icon, type IconName } from "./Icons";
import { useStoreValue, unreadCount } from "../lib/store";

const NAV_ITEMS: { to: string; labelKey: string; icon: IconName; end: boolean; emphasis?: boolean }[] = [
  { to: "/", labelKey: "findRide", icon: "search", end: true },
  { to: "/post", labelKey: "postRide", icon: "plus", end: false, emphasis: true },
  { to: "/rides", labelKey: "myRides", icon: "ticket", end: false },
  { to: "/profile", labelKey: "profile", icon: "user", end: false }
];

function LanguageToggle() {
  const { language, toggleLanguage } = useTranslation();
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={toggleLanguage}
      aria-label="বাংলা / English"
    >
      <span className={`lang-toggle__opt${language === "bn" ? " lang-toggle__opt--active" : ""}`}>বাং</span>
      <span className={`lang-toggle__opt${language === "en" ? " lang-toggle__opt--active" : ""}`}>EN</span>
    </button>
  );
}

function NotificationBell() {
  const { t } = useTranslation();
  const unread = useStoreValue(unreadCount);
  return (
    <Link className="bell" to="/notifications" aria-label={`${t("notifications")}${unread ? ` (${unread})` : ""}`}>
      <Icon name="bell" size={20} />
      {unread > 0 && <span className="bell__count">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="site-header">
      <Link className="brand-lockup" to="/">
        <img src={`${import.meta.env.BASE_URL}deshride_logo_primary.png`} alt="DeshRide" />
      </Link>

      <div className="site-header__right">
        <nav className="site-nav" aria-label={t("primaryNav")}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`nav-link${item.emphasis ? " nav-link--cta" : ""}`}
            >
              <Icon name={item.icon} size={18} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <NotificationBell />
        <LanguageToggle />
      </div>
    </header>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const unread = useStoreValue(unreadCount);
  return (
    <nav className="bottom-nav" aria-label={t("primaryNav")}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={`bottom-nav__link${item.emphasis ? " bottom-nav__link--cta" : ""}`}
        >
          <span className="bottom-nav__icon">
            <Icon name={item.icon} size={22} />
            {item.to === "/rides" && unread > 0 && <i className="bottom-nav__dot" aria-hidden="true" />}
          </span>
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
