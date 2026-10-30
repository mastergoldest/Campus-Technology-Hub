import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isAuthenticated, user, isLoading } = useAuth();

  const [email, setEmail] = useState(
    location.state?.registeredEmail ?? "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    location.state?.registrationSuccess
      ? "Your account was created successfully. Please log in."
      : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const authenticatedUser = await login(email.trim(), password);

      navigate(getDashboardPath(authenticatedUser.role), {
        replace: true,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your details and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // If the user is already logged in, send them to their dashboard.
  if (!isLoading && isAuthenticated && user) {
    navigate(getDashboardPath(user.role), { replace: true });
    return null;
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">C</span>

          <span className="brand-name">
            Campus<span>Tech</span>Hub
          </span>
        </Link>

        <div className="auth-visual-content">
          <span className="section-kicker">
            WELCOME BACK
          </span>

          <h1>
            Your campus
            <br />
            community is
            <br />
            <span>waiting.</span>
          </h1>

          <p>
            Sign in to manage your listings, discover products,
            and connect with technical service providers.
          </p>

          <div className="auth-benefit-list">
            <div className="auth-benefit">
              <span>✓</span>
              <p>Keep track of your marketplace activity</p>
            </div>

            <div className="auth-benefit">
              <span>✓</span>
              <p>Manage your products and services</p>
            </div>

            <div className="auth-benefit">
              <span>✓</span>
              <p>Stay connected to your campus community</p>
            </div>
          </div>
        </div>

        <p className="auth-visual-footer">
          Built for campus communities.
        </p>
      </section>

      <section className="auth-form-section">
        <div className="auth-form-wrapper">
          <div className="auth-mobile-brand">
            <Link to="/" className="brand">
              <span className="brand-mark">C</span>

              <span className="brand-name">
                Campus<span>Tech</span>Hub
              </span>
            </Link>
          </div>

          <div className="auth-heading">
            <span className="section-kicker">
              YOUR ACCOUNT
            </span>

            <h2>Welcome back</h2>

            <p>
              Enter your details to continue.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="loginEmail">Email address</label>

              <input
                id="loginEmail"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                  setMessage("");
                }}
                required
              />
            </div>

            <div className="form-field">
              <div className="label-row">
                <label htmlFor="loginPassword">Password</label>

                <span className="password-note">
                  Keep it private
                </span>
              </div>

              <div className="password-input-wrapper">
                <input
                  id="loginPassword"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="form-message form-message-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                className="form-message form-message-success"
                role="status"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="button button-primary auth-submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                "Signing in..."
              ) : (
                <>
                  Log in <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/register">Create an account</Link>
          </p>

          <Link to="/" className="auth-back-link">
            ← Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Login;