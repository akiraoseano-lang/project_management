import RegisterForm from "../../components/auth/RegisterForm";

import styles from "./Register.module.css";

const Register = () => {
    return (
        <main className={styles.page}>
            <RegisterForm />
        </main>
    )
}

export default Register;