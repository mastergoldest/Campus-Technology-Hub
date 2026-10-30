
import { Link, NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  function getDashboardPath(role: string): string {
    switch (role) {
      case "student":
        return "/dashboard";
      case "technician":
        return "/technician/dashboard";
      case "admin":
        return "/admin/dashboard";
      default:
        return "/";
    }
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  const profileImage = user?.profilePicture?.url;

  return (
    <header className="site-header">
      <nav className="navbar container" aria-label="Main navigation">
        <Link to="/" className="brand" aria-label="Campus Tech Hub home">
          <span className="brand-mark" aria-hidden="true">
            C
          </span>

          <span className="brand-name">
            Campus<span>Tech</span>Hub
          </span>
        </Link>

        <div className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/marketplace"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            Marketplace
          </NavLink>

          <NavLink
            to="/services"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            Technicians
          </NavLink>

          <a className="nav-link" href="/#how-it-works">
            How It Works
          </a>

          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            Contact
          </NavLink>
        </div>

        <div className="nav-actions">
          <ThemeToggle />

          {!isLoading && isAuthenticated && user ? (
            <>
              <Link
                to={getDashboardPath(user.role)}
                className="button button-ghost nav-login"
              >
                Dashboard
              </Link>

              <Link
                to="/profile"
                className="nav-profile"
                aria-label="View profile"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt=""
                    className="nav-avatar"
                  />
                ) : (
                  <span className="nav-avatar nav-avatar-fallback">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}

                <span className="nav-profile-name">
                  {user.name}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="button button-primary nav-signup"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="button button-ghost nav-login"
              >
                Log in
              </Link>

              <Link
                to="/register"
                className="button button-primary nav-signup"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar