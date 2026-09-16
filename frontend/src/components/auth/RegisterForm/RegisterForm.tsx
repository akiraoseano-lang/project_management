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
            setError(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <h1>Create account</h1>

                <div className={styles.field}>
                    <label htmlFor="name">Name</label>
                    <input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button className={styles.submit} type="submit" disabled={loading}>
                    {loading ? "Creating account..." : "Register"}
                </button>

                <div className={styles.divider}>or continue with</div>

                <div className={styles.oauth}>
                    <OAuthButton provider="google" />
                    <OAuthButton provider="github" />
                    <OAuthButton provider="discord" />
                </div>

                <button
                    className={styles.login}
                    type="button"
                    onClick={() => navigate("/login")}
                >
                    Already have an account? <span>Log in</span>
                </button>
            </form>
        </div>
    );
};

export default RegisterForm;