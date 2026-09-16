import LoginForm from "../../components/auth/LoginForm";

import styles from "./Login.module.css";

const Login = () => {
    return (
        <main className={styles.page}>
            <LoginForm />
        </main>
    )
}

export default Login;