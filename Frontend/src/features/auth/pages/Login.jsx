import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Login = () => {
    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ error, setError ] = useState("")

    useEffect(() => {
        document.title = "AI Interview Master | Login";
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        try {
            const user = await handleLogin({ email, password })
            if (user) {
                navigate('/')
            } else {
                setError("Authentication failed. Please check your credentials.")
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Invalid email or password")
        }
    }

    if (loading) {
        return (
            <main className="auth-loading">
                <h1>Loading...</h1>
            </main>
        )
    }

    return (
        <main>
            <div className="form-container">
                <h1>Login</h1>
                {error && <div className="error-message" style={{ color: '#ff6b6b', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email" id="email" name='email' placeholder='Enter email address' required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" id="password" name='password' placeholder='Enter password' required />
                    </div>
                    <button className='button primary-button'>Login</button>
                </form>
                <p>Don't have an account? <Link to={"/register"}>Register</Link></p>
            </div>
        </main>
    )
}

export default Login