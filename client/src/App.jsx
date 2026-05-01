import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Tasks from "./pages/Tasks";
import Activities from "./pages/Activities";
import TaskDetail from "./pages/TaskDetail";
import Weekly from "./pages/Weekly";
import Settings from "./pages/Settings";
import CreateCourse from "./pages/CreateCourse";
import NoteEditor from "./pages/NoteEditor";
import Friends from "./pages/Friends";
import FriendChat from "./pages/FriendChat";
import Statistics from "./pages/Statistics";

function ViewportSizeSync() {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef(null);
  const wasMobile = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const isMobileViewport = () => window.matchMedia("(max-width: 980px)").matches;

    function syncViewportSize() {
      const viewport = window.visualViewport;
      const height = viewport?.height || window.innerHeight;
      const width = viewport?.width || window.innerWidth;
      document.documentElement.style.setProperty("--app-vh", `${height * 0.01}px`);
      document.documentElement.style.setProperty("--app-vw", `${width * 0.01}px`);
    }

    function handleViewportChange() {
      window.requestAnimationFrame(syncViewportSize);
      const isMobile = isMobileViewport();
      if (isMobile && !wasMobile.current) {
        setVisible(true);
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => {
          syncViewportSize();
          setVisible(false);
        }, 520);
      }
      wasMobile.current = isMobile;
    }

    syncViewportSize();
    wasMobile.current = isMobileViewport();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);

    return () => {
      window.clearTimeout(hideTimer.current);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="mobile-setup-screen" role="status" aria-live="polite" aria-label="Setting up mobile screen">
      <div className="mobile-setup-card">
        <div className="mobile-setup-spinner" aria-hidden="true" />
        <div>
          <div className="mobile-setup-title">Setting up screen</div>
          <div className="mobile-setup-subtitle">Adjusting the mobile layout...</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ViewportSizeSync />
      <Routes>
        <Route path="/" element={<Landing />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <ProtectedRoute>
            <TaskDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <Courses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses/new"
        element={
          <ProtectedRoute>
            <CreateCourse />
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses/:id"
        element={
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes/:noteId"
        element={
          <ProtectedRoute>
            <NoteEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/activities"
        element={
          <ProtectedRoute>
            <Activities />
          </ProtectedRoute>
        }
      />
      <Route
        path="/week"
        element={
          <ProtectedRoute>
            <Weekly />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        }
      />

      <Route
        path="/statistics"
        element={
          <ProtectedRoute>
            <Statistics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <FriendChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:friendId"
        element={
          <ProtectedRoute>
            <FriendChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/conversations/:chatId"
        element={
          <ProtectedRoute>
            <FriendChat />
          </ProtectedRoute>
        }
      />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
