import { Link, NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Find a ride", end: true },
  { to: "/post", label: "Post a ride", end: false },
  { to: "/rides", label: "My rides", end: false },
  { to: "/profile", label: "Profile", end: false }
];

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand-lockup" to="/">
        <img src={`${import.meta.env.BASE_URL}deshride_logo_primary.png`} alt="DeshRide" />
      </Link>

      <nav className="site-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary mobile">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className="bottom-nav__link">
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
