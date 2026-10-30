
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AUTH_STORAGE_KEY = "campus-tech-hub-user";
const TOKEN_STORAGE_KEY = "campus-tech-hub-token";

export type UserRole = "student" | "technician" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePicture?: {
    url: string;
    publicId?: string;
  };
}

interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    role: "student" | "technician",
  ) => Promise<User>;
  updateUser: (updatedUser: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!storedToken) {
        localStorage.removeItem(AUTH_STORAGE_KEY);

        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Your session has expired.");
        }

        const data = await response.json();

        if (!data.success || !isValidUser(data.user)) {
          throw new Error("Invalid session information.");
        }

        if (!cancelled) {
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify(data.user),
          );

          setUser(data.user);
          setToken(storedToken);
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);

        if (!cancelled) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveSession = (userData: User, accessToken: string) => {
    if (!isValidUser(userData) || !accessToken) {
      throw new Error("The server returned invalid authentication data.");
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);

    setUser(userData);
    setToken(accessToken);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: "student" | "technician",
  ): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data: AuthResponse = await response.json();

    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.message || "Registration failed.");
    }

    return data.user;
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data: AuthResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    if (!data.success || !data.token || !data.user) {
      throw new Error("The server returned an incomplete login response.");
    }

    saveSession(data.user, data.token);

    return data.user;
  };

  const updateUser = (updatedUser: User) => {
    if (!isValidUser(updatedUser)) {
      throw new Error("The server returned invalid user information.");
    }

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(updatedUser),
    );

    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);

    setUser(null);
    setToken(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: user !== null && token !== null,
    isLoading,
    login,
    register,
    updateUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

function isValidUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    ["student", "technician", "admin"].includes(
      candidate.role as string,
    )
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}

