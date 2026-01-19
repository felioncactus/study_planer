import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiLogin, apiMe, apiRegister } from "../api/auth.api";
import { setAuthToken } from "../api/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem("token") || "";
    // Guard: if an old JWT accidentally contains huge payload (e.g., base64 avatar), Vite may return 431.
    // Typical JWTs are well under a few KB.
    if (t && t.length > 4000) {
      localStorage.removeItem("token");
      return "";
    }
    return t;
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function applySession(data) {
    setToken(data?.token || "");
    setUser(data?.user || null);
  }

  // keep axios auth header in sync
  useEffect(() => {
    setAuthToken(token);
    if (token && token.length <= 4000) localStorage.setItem("token", token);
    else if (token && token.length > 4000) localStorage.removeItem("token");
    else localStorage.removeItem("token");
  }, [token]);

  // on load, if token exists, fetch /me
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (token) {
          const data = await apiMe();
          if (!cancelled) setUser(data.user);
        }
      } catch {
        if (!cancelled) applySession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function register(payload) {
    const data = await apiRegister(payload);
    applySession(data);
    return data.user;
  }

  async function login(payload) {
    const data = await apiLogin(payload);
    applySession(data);
    return data.user;
  }

  function logout() {
    applySession(null);
  }

  // Used by Account Settings after profile updates
  function updateSession(data) {
    applySession(data);
  }

  const value = useMemo(
    () => ({ token, user, loading, register, login, logout, updateSession }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
