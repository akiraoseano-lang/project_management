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
        } catch (error) {
            setError(error instanceof Error ? error.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <h1>Welcome back</h1>

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
                    {loading ? "Logging in..." : "Login"}
                </button>

                <div className={styles.divider}>or continue with</div>

                <div className={styles.oauth}>
                    <OAuthButton provider="google" />
                    <OAuthButton provider="github" />
                    <OAuthButton provider="discord" />
                </div>

                <button
                    className={styles.register}
                    type="button"
                    onClick={() => navigate("/register")}
                >
                    Don't have an account? <span>Create one</span>
                </button>
            </form>
        </div>
    );
};

export default LoginForm;