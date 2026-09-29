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
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin-communication" element={<AdminCommunication />} />
              <Route path="/admin-security" element={<AdminSecurity />} />
              <Route path="/admin-settings" element={<AdminSettings />} />
              <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher-attendance" element={<TeacherAttendance />} />
              <Route path="/teacher-schedule" element={<TeacherSchedule />} />
              <Route path="/teacher-grades" element={<TeacherGrades />} />
              <Route path="/teacher-messages" element={<TeacherMessages />} />
              <Route path="/teacher-settings" element={<TeacherSettings />} />
              <Route path="/parent-dashboard" element={<ParentDashboard />} />
              <Route path="/parent-settings" element={<ParentSettings />} />
              <Route path="/admin-user-management" element={<UserManagement />} />
              <Route path="/admin-school-reports" element={<SchoolReports />} />
              <Route path="/admin-general-schedule" element={<GeneralSchedule />} />
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
