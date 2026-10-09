import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCommunication from "./pages/AdminCommunication";
import AdminSecurity from "./pages/AdminSecurity";
import AdminSettings from "./pages/AdminSettings";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherAttendance from "./pages/TeacherAttendance";
import TeacherSchedule from "./pages/TeacherSchedule";
import TeacherGrades from "./pages/TeacherGrades";
import TeacherGradesManagement from "./pages/TeacherGradesManagement";
import TeacherMessages from "./pages/TeacherMessages";
import TeacherSettings from "./pages/TeacherSettings";
import ParentDashboard from "./pages/ParentDashboard";
import ParentSettings from "./pages/ParentSettings";
import UserManagement from "./pages/UserManagement";
import SchoolReports from "./pages/SchoolReports";
import GeneralSchedule from "./pages/GeneralSchedule";
import { SocketProvider } from "./socket/SocketContext";
import SocketManager from "./socket/SocketManager";

import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <SocketProvider>
    <SocketManager />
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* Admin Routes */}
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute requiredRole="administration">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-communication"
                element={
                  <ProtectedRoute requiredRole="administration">
                    <AdminCommunication />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-security"
                element={
                  <ProtectedRoute requiredRole="administration">
                    <AdminSecurity />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-settings"
                element={
                  <ProtectedRoute requiredRole="administration">
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-user-management"
                element={
                  <ProtectedRoute requiredRole="administration">
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-school-reports"
                element={
                  <ProtectedRoute requiredRole="administration">
                    <SchoolReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-general-schedule"
                element={
                  <ProtectedRoute requiredRole="administration">
                    <GeneralSchedule />
                  </ProtectedRoute>
                }
              />

              {/* Teacher Routes */}
              <Route
                path="/teacher-dashboard"
                element={
                  <ProtectedRoute requiredRole="professeur">
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher-attendance"
                element={
                  <ProtectedRoute requiredRole="professeur">
                    <TeacherAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher-schedule"
                element={
                  <ProtectedRoute requiredRole="professeur">
                    <TeacherSchedule />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher-grades"
                element={
                  <ProtectedRoute requiredRole="professeur">
                    <TeacherGrades />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher-messages"
                element={
                  <ProtectedRoute requiredRole="professeur">
                    <TeacherMessages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher-settings"
                element={
                  <ProtectedRoute requiredRole="professeur">
                    <TeacherSettings />
                  </ProtectedRoute>
                }
              />

              {/* Parent Routes */}
              <Route
                path="/parent-dashboard"
                element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/parent-settings"
                element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentSettings />
                  </ProtectedRoute>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </SocketProvider>
);

export default App;
