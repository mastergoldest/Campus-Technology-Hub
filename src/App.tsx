import {
  BrowserRouter,
  Link,
  Route,
  Routes,
} from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import Marketplace from "./pages/Marketplace";
import Services from "./pages/Services";
import CreateService from "./pages/CreateService";
import CreateProduct from "./pages/CreateProduct";
import StudentDashboard from "./pages/StudentDashboard";
import Profile from "./pages/Profile";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Contact from "./pages/Contact";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <>
      <Navbar />

      <main className="placeholder-page container">
        <span className="section-kicker">
          CAMPUS TECH HUB
        </span>

        <h1>{title}</h1>

        <p>{description}</p>

        <p>
          This page will be implemented in a later development phase.
        </p>

        <Link to="/" className="button button-primary">
          Back to home
        </Link>
      </main>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />

            <Route path="/register" element={<Register />} />

            {/* Public marketplace and service discovery */}
            <Route
              path="/marketplace"
              element={<Marketplace />}
            />
            <Route path="/contact" element={<Contact />} />

            <Route
              path="/services"
              element={<Services />}
            />

            {/* Protected routes: authentication required */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/profile"
                element={<Profile />}
              />

              <Route
                path="/marketplace/create"
                element={<CreateProduct />}
              />

              <Route
                path="/services/create"
                element={<CreateService />}
              />
            </Route>

            {/* Student-only dashboard */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["student"]} />
              }
            >
              <Route
                path="/dashboard"
                element={<StudentDashboard />}
              />
            </Route>

            {/* Technician-only dashboard */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["technician"]} />
              }
            >
              <Route
                path="/technician/dashboard"
                element={<TechnicianDashboard />}
              />
            </Route>

            {/* Admin-only dashboard */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["admin"]} />
              }
            >
              <Route
                path="/admin/dashboard"
                element={<AdminDashboard />}
              />
            </Route>

            {/* Unknown routes */}
            <Route
              path="*"
              element={
                <PlaceholderPage
                  title="Page not found"
                  description="The page you're looking for doesn't exist."
                />
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;