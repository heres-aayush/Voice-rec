"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AuthContextType {
  isAuthenticated: boolean
  user: { email?: string; name?: string } | null
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)

  useEffect(() => {
    // Load Google Identity Services library
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    // Check if user is already logged in
    const token = sessionStorage.getItem("google_access_token")
    const userData = sessionStorage.getItem("user_data")
    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const login = () => {
    if (!window.google) {
      alert("Google API not loaded yet. Please wait a second and try again.")
      return
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      scope:
        "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      callback: (response: any) => {
        if (response && response.access_token) {
          sessionStorage.setItem("google_access_token", response.access_token)

          // Fetch user info
          fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`)
            .then((res) => res.json())
            .then((userData) => {
              setUser({ email: userData.email, name: userData.name })
              sessionStorage.setItem("user_data", JSON.stringify({ email: userData.email, name: userData.name }))
              setIsAuthenticated(true)
            })
            .catch(console.error)
        }
      },
    })

    client.requestAccessToken()
  }

  const logout = () => {
    sessionStorage.removeItem("google_access_token")
    sessionStorage.removeItem("user_data")
    setIsAuthenticated(false)
    setUser(null)
  }

  return <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
