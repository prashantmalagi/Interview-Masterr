import React, { createContext, useState, useEffect } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => { 
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const data = await getMe()
                if (data && data.user) {
                    setUser(data.user)
                } else {
                    setUser(null)
                    localStorage.removeItem("token")
                    localStorage.removeItem("user")
                }
            } catch (err) {
                console.error("Auth initialization failed:", err)
                setUser(null)
                localStorage.removeItem("token")
                localStorage.removeItem("user")
            } finally {
                setLoading(false)
            }
        }
        initializeAuth()
    }, [])

    return (
        <AuthContext.Provider value={{user, setUser, loading, setLoading}} >
            {children}
        </AuthContext.Provider>
    )
}