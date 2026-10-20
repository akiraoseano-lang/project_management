import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../api/client";
import OAuthButton from "../OAuthButton";
import styles from "./RegisterForm.module.css";

const RegisterForm = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
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
              YOUR NEXT CHAPTER STARTS HERE
            </span>

            <h1>
              Make room
              <br />
              for <span>great work.</span>
            </h1>

            <p>
              Bring your ideas to life with a workspace designed
              to help you and your team do your best work together.
            </p>

            <div className={styles.featureList}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Organize projects in one place</span>
              </div>

              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Collaborate with your team</span>
              </div>

              <div className={styles.feature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Track progress from start to finish</span>
              </div>
            </div>
          </div>

          <div className={styles.brandFooter}>
            <span className={styles.footerDot} />
            Your ideas deserve a great workspace.
          </div>
        </div>

        <div className={styles.decorCircle} aria-hidden="true" />
        <div className={styles.decorCircleSmall} aria-hidden="true" />
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileLogo}>
          <span className={styles.logoIcon}>N</span>
          <span>NEXUS</span>
        </div>

        <div className={styles.formWrapper}>
          <div className={styles.formHeading}>
            <span className={styles.welcomeLabel}>GET STARTED</span>
            <h2>Create your account</h2>
            <p>
              Set up your account and start building something great.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
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
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                placeholder="Create a password"
                autoComplete="new-password"
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
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span>Or sign up with</span>
          </div>

          <div className={styles.oauth}>
            <OAuthButton provider="google" />
            <OAuthButton provider="github" />
            <OAuthButton provider="discord" />
          </div>

          <p className={styles.login}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </p>

          <p className={styles.terms}>
            By creating an account, you agree to use NEXUS responsibly.
          </p>
        </div>
      </section>
    </div>
  );
};

export default RegisterForm;