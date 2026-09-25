import { NavLink } from "react-router-dom";

/**
 * Primary navigation between the Trading terminal and the Price Chart page.
 *
 * The router owns active state: each NavLink derives its own active styling from
 * the className callback, so there are no active/onNavigate props and no local
 * state to keep in sync with the URL. Sits between the persistent header strip
 * and the routed body.
 */
export function Navbar() {
    return (
        <nav className="nav" aria-label="Primary">
            <NavLink
                to="/trading"
                className={({ isActive }) =>
                    isActive ? "nav__link nav__link--active" : "nav__link"
                }
            >
                Trading
            </NavLink>
            <NavLink
                to="/chart"
                className={({ isActive }) =>
                    isActive ? "nav__link nav__link--active" : "nav__link"
                }
            >
                Price Chart
            </NavLink>
        </nav>
    );
}