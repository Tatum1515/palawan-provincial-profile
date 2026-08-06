
import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Employees from './pages/Employees.jsx'
import Attendance from './pages/Attendance.jsx'
import Leave from './pages/Leave.jsx'
import Payslip from './pages/Payslip.jsx'
import Settings from './pages/Settings.jsx'
import PrintPaySlip from './pages/PrintPayslip.jsx'
import LoginForm from './components/LoginForm.jsx'
import { Toaster } from "react-hot-toast"
import LoginLanding from "./pages/LoginLanding"
import Layout from './pages/Layout.jsx'

const App = () => {
  return (
    <>
    <Toaster/>
    <Routes>
    <Route path="/login" element={<LoginLanding />} />

     <Route path="/login/admin" element={<LoginForm role="admin" 
     title="Admin Portal" subtitle="Please enter your credentials to access the admin panel" />} />
     
     <Route path="/login/employee" element={<LoginForm role="employee"
    title="Employee Portal" subtitle="Please enter your credentials to access your employee account" />} />
    
    <Route element={<Layout />}>
    <Route path="/dashboard" element={<Dashboard />} />
         <Route path="/employees" element={<Employees />} />
         <Route path="/attendance" element={<Attendance />} />
         <Route path="/leave" element={<Leave />} />
         <Route path="/payslip" element={<Payslip />} />
         <Route path="/settings" element={<Settings />} />
       </Route>
       <Route path="/print/payslips/:id" element={<PrintPaySlip />} />
       <Route path="*" element={<Navigate to="/dashboard" replace />} />   
    </Routes>
    </>
  )
}

export default App