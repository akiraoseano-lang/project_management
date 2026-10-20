import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import OAuthButton from "../OAuthButton";
import styles from "./LoginForm.module.css";

const LoginForm = () => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Panel branding kiri */}
      <section className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <button
            type="button"
            className={styles.brandLogo}
            onClick={() => navigate("/")}
            aria-label="NEXUS home"
          >
            <span className={styles.logoIcon}>N</span>
            <span>NEXUS</span>
          </button>

          <div className={styles.brandMessage}>
            <span className={styles.eyebrow}>
              YOUR WORKSPACE, CONNECTED
            </span>

            <h1>
              Great things
              <br />
              happen <span>together.</span>
            </h1>

            <p>
              Bring your team, projects, and ideas into one place.
              Plan better, collaborate effortlessly, and make
              progress together.
            </p>

            <div className={styles.featureList}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>All your projects in one workspace</span>
              </div>

              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Keep your team on the same page</span>
              </div>

              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Turn plans into real progress</span>
              </div>
            </div>
          </div>

          <div className={styles.brandFooter}>
            <span className={styles.footerDot} />
            One workspace. Endless possibilities.
          </div>
        </div>

        <div className={styles.decorCircle} aria-hidden="true" />
        <div className={styles.decorCircleSmall} aria-hidden="true" />
      </section>

      {/* Panel form kanan */}
      <section className={styles.formPanel}>
        <div className={styles.mobileLogo}>
          <span className={styles.logoIcon}>N</span>
          <span>NEXUS</span>
        </div>

        <div className={styles.formWrapper}>
          <div className={styles.formHeading}>
            <span className={styles.welcomeLabel}>WELCOME BACK</span>
            <h2>Sign in to NEXUS</h2>
            <p>Enter your details to access your workspace.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <div className={styles.passwordLabel}>
                <label htmlFor="login-password">Password</label>
              </div>

              <input
                id="login-password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <button
              className={styles.submit}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span>Or continue with</span>
          </div>

          <div className={styles.oauth}>
            <OAuthButton provider="google" />
            <OAuthButton provider="github" />
            <OAuthButton provider="discord" />
          </div>

          <p className={styles.register}>
            Don't have an account?{" "}
            <button type="button" onClick={() => navigate("/register")}>
              Create account
            </button>
          </p>

          <p className={styles.terms}>
            By continuing, you agree to use NEXUS responsibly.
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginForm;