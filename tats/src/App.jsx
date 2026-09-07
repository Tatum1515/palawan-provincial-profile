import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Dashboard from "./pages/Dashboard.jsx";
import Documents from "./pages/Documents.jsx";
import Employees from "./pages/Employees.jsx";
import Settings from "./pages/Settings.jsx";
import Timeline from "./pages/Timeline.jsx";
import PhysicalReport from "./pages/PhysicalReport.jsx";
import RouteErrorBoundary from "./components/RouteErrorBoundary.jsx";
import MonitoringSummary from "./pages/MonitoringSummary.jsx";
import OfficePerformance from "./pages/OfficePerformance.jsx";
import PerformanceHub from "./pages/PerformanceHub.jsx";
import AdminMonitoring from "./pages/AdminMonitoring.jsx";
import PhysicalReportControlCenter from "./pages/PhysicalReportControlCenter.jsx";
import Calendar from "./pages/Calendar.jsx";
import DepartmentHeadApprovals from "./pages/DepartmentHeadApprovals.jsx";

import LoginForm from "./components/LoginForm.jsx";
import LoginLanding from "./pages/LoginLanding.jsx";
import Layout from "./pages/Layout.jsx";
import {
    RoleHome,
    RoleRoute,
} from "./components/RoleRoute.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";

export default function App() {
    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3500,
                }}
            />

            <Routes>
                <Route
                    path="/login"
                    element={
                        <LoginLanding />
                    }
                />

                <Route
                    path="/login/admin"
                    element={
                        <LoginForm
                            role="admin"
                            title="Admin Portal"
                            subtitle="Please enter your credentials to access the admin panel"
                        />
                    }
                />

                <Route
                    path="/login/employee"
                    element={
                        <LoginForm
                            role="employee"
                            title="User Portal"
                            subtitle="Encoder and Department Head access"
                        />
                    }
                />

                <Route element={<Layout />}>
                    {/*
                     * All authenticated roles can use the dashboard and profile/settings.
                     */}
                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={[
                                    "ADMIN",
                                    "EMPLOYEE",
                                    "DEPARTMENT_HEAD",
                                ]}
                            />
                        }
                    >
                        <Route
                            path="/dashboard"
                            element={<Dashboard />}
                        />

                        <Route
                            path="/settings"
                            element={<Settings />}
                        />

                        <Route
                            path="/physical-report"
                            element={
                                <RouteErrorBoundary>
                                    <PhysicalReport />
                                </RouteErrorBoundary>
                            }
                        />
                        <Route
                            path="/physical-reports"
                            element={
                                <Navigate to="/physical-report" replace />
                            }
                        />

                        <Route
                            path="/performance"
                            element={
                                <OfficePerformance />
                            }
                        />

                        <Route
                            path="/calendar"
                            element={<Calendar />}
                        />
                    </Route>

                    {/*
                     * MAIN ADMIN / PPDO.
                     * These are monitoring and management pages.
                     */}
                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={["ADMIN"]}
                            />
                        }
                    >
                        <Route
                            path="/documents"
                            element={<Documents />}
                        />

                        <Route
                            path="/admin-monitoring"
                            element={
                                <AdminMonitoring />
                            }
                        />

                        <Route
                            path="/performance-monitoring"
                            element={<OfficePerformance />}
                        />

                        <Route
                            path="/analytics"
                            element={<MonitoringSummary />}
                        />

                        <Route
                            path="/reports"
                            element={
                                <RouteErrorBoundary>
                                    <PhysicalReport />
                                </RouteErrorBoundary>
                            }
                        />

                        <Route
                            path="/physical-report-control"
                            element={
                                <RouteErrorBoundary>
                                    <PhysicalReportControlCenter />
                                </RouteErrorBoundary>
                            }
                        />

                        <Route
                            path="/admin/*"
                            element={<AdminMonitoring />}
                        />

                        <Route
                            path="/employees"
                            element={<Employees />}
                        />

                        <Route
                            path="/monitoring-summary"
                            element={
                                <MonitoringSummary />
                            }
                        />

                        <Route
                            path="/performance-summary"
                            element={
                                <PerformanceHub />
                            }
                        />
                    </Route>

                    {/*
                     * Office users / Encoders.
                     */}
                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={[
                                    "EMPLOYEE",
                                ]}
                            />
                        }
                    >
                        <Route
                            path="/submissions"
                            element={<Documents />}
                        />

                        <Route
                            path="/timeline"
                            element={<Timeline />}
                        />

                        <Route
                            path="/my-performance-summary"
                            element={
                                <MonitoringSummary />
                            }
                        />

                        <Route
                            path="/task-board"
                            element={
                                <Navigate
                                    to="/submissions"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="/document-submit"
                            element={
                                <Navigate
                                    to="/submissions"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="/submit-document"
                            element={
                                <Navigate
                                    to="/submissions"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="/account"
                            element={
                                <Navigate
                                    to="/settings"
                                    replace
                                />
                            }
                        />
                    </Route>

                    {/*
                     * Department Head.
                     * Same office records as their Encoder,
                     * plus approval responsibility.
                     */}
                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={[
                                    "DEPARTMENT_HEAD",
                                ]}
                            />
                        }
                    >
                        <Route path="/submissions" element={<DepartmentHeadApprovals />} />
                        <Route path="/approval" element={<DepartmentHeadApprovals />} />
                    </Route>

                    <Route
                        path="/unauthorized"
                        element={
                            <Unauthorized />
                        }
                    />

                    <Route
                        path="*"
                        element={<RoleHome />}
                    />
                </Route>
            </Routes>
        </>
    );
}
