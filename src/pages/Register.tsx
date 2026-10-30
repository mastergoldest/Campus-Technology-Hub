import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type AccountType = "student" | "technician";

interface RegistrationForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
}

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<RegistrationForm>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "student",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handleAccountTypeChange(accountType: AccountType) {
    setForm((currentForm) => ({
      ...currentForm,
      accountType,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) return;

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please complete all the required fields.");
      return;
    }

    if (form.fullName.trim().length < 2) {
      setError("Your name must contain at least 2 characters.");
      return;
    }

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (form.password.length > 72) {
      setError("Your password cannot exceed 72 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await register(
        form.fullName.trim(),
        form.email.trim(),
        form.password,
        form.accountType,
      );

      setSuccess(
        "Account created successfully! Redirecting you to login...",
      );

      // Allow the user to see the success message.
      window.setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            registeredEmail: form.email.trim(),
            registrationSuccess: true,
          },
        });
      }, 1200);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
            YOUR CAMPUS, CONNECTED
          </span>

          <h1>
            Your next opportunity
            <br />
            starts <span>here.</span>
          </h1>

          <p>
            Discover useful products, connect with skilled technicians,
            and become part of a more connected campus community.
          </p>

          <div className="auth-benefit-list">
            <div className="auth-benefit">
              <span>✓</span>
              <p>Discover products from your campus community</p>
            </div>

            <div className="auth-benefit">
              <span>✓</span>
              <p>Showcase your technical skills and services</p>
            </div>

            <div className="auth-benefit">
              <span>✓</span>
              <p>Connect with people who need what you offer</p>
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
            <span className="section-kicker">GET STARTED</span>

            <h2>Create your account</h2>

            <p>
              Join the community and start exploring.
            </p>
          </div>

          <div className="account-type-label">
            I want to join as a:
          </div>

          <div className="account-type-selector">
            <button
              type="button"
              className={`account-type-option ${
                form.accountType === "student" ? "selected" : ""
              }`}
              onClick={() => handleAccountTypeChange("student")}
              aria-pressed={form.accountType === "student"}
            >
              <span className="account-type-icon">🎓</span>

              <span className="account-type-copy">
                <strong>Student</strong>
                <small>Buy and sell products</small>
              </span>

              <span className="account-type-radio" />
            </button>

            <button
              type="button"
              className={`account-type-option ${
                form.accountType === "technician" ? "selected" : ""
              }`}
              onClick={() => handleAccountTypeChange("technician")}
              aria-pressed={form.accountType === "technician"}
            >
              <span className="account-type-icon">🛠️</span>

              <span className="account-type-copy">
                <strong>Technician</strong>
                <small>Offer technical services</small>
              </span>

              <span className="account-type-radio" />
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="fullName">Full name</label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                value={form.fullName}
                onChange={handleChange}
                minLength={2}
                maxLength={80}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                maxLength={254}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>

              <div className="password-input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  maxLength={72}
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

              <small className="field-hint">
                Use at least 8 characters.
              </small>
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? "Hide" : "Show"}
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

            {success && (
              <div
                className="form-message form-message-success"
                role="status"
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              className="button button-primary auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Creating account..."
              ) : (
                <>
                  Create account <span aria-hidden="true">→</span>
                </>
              )}
            </button>

            <p className="auth-terms">
              By continuing, you agree to use the platform responsibly
              and respect other members of the campus community.
            </p>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Log in</Link>
          </p>

          <Link to="/" className="auth-back-link">
            ← Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Register;