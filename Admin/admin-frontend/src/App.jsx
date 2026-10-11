import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import Layout from './components/Layout';
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EnquiryList = lazy(() => import('./pages/EnquiryList'));
const QuotationBuilder = lazy(() => import('./pages/QuotationBuilder'));
const QuotationList = lazy(() => import('./pages/QuotationList'));
const UserList = lazy(() => import('./pages/UserList'));
const Settings = lazy(() => import('./pages/Settings'));
const TrashList = lazy(() => import('./pages/TrashList'));
const Activity = lazy(() => import('./pages/Activity'));
const CustomerMaster = lazy(() => import('./pages/CustomerMaster'));
const Customer360 = lazy(() => import('./pages/Customer360'));
const CatalogMaster = lazy(() => import('./pages/CatalogMaster'));
const PurchaseOrderList = lazy(() => import('./pages/PurchaseOrderList'));
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'));
const InvoiceList = lazy(() => import('./pages/InvoiceList'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const Payments = lazy(() => import('./pages/Payments'));
const Receivables = lazy(() => import('./pages/Receivables'));
const Reports = lazy(() => import('./pages/Reports'));
const CrmDashboard = lazy(() => import('./pages/CrmDashboard'));
const CrmLeads = lazy(() => import('./pages/CrmLeads'));
const CrmLeadDetails = lazy(() => import('./pages/CrmLeadDetails'));
const CrmPipeline = lazy(() => import('./pages/CrmPipeline'));
const CrmFollowUps = lazy(() => import('./pages/CrmFollowUps'));
import SessionManager from './components/SessionManager';

const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const RoleRoute = ({ children, allowedRoles, redirectTo = "/" }) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={redirectTo} replace />;
    }
    return children;
};

function NetworkStatus() {
    const { showToast } = useToast();

    useEffect(() => {
        const handleOffline = () => {
            showToast({
                type: 'warning',
                message: "You're offline. Some features may not work until your connection is restored.",
                duration: 0 // Keep until online
            });
        };

        const handleOnline = () => {
            showToast({
                type: 'success',
                message: "Connection restored."
            });
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [showToast]);

    return null;
}

function App() {
    return (
        <ToastProvider>
            <NetworkStatus />
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/" element={<ProtectedRoute><SessionManager><Layout /></SessionManager></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    <Route path="crm" element={<CrmDashboard />} />
                    <Route path="crm/leads" element={<CrmLeads />} />
                    <Route path="crm/leads/:id" element={<CrmLeadDetails />} />
                    <Route path="crm/pipeline" element={<CrmPipeline />} />
                    <Route path="crm/follow-ups" element={<CrmFollowUps />} />
                    <Route path="enquiries" element={<EnquiryList />} />
                    <Route path="quotations" element={<QuotationList />} />
                    <Route path="quotations/new/:enquiryId" element={<QuotationBuilder />} />
                    <Route path="quotations/edit/:quotationId" element={<QuotationBuilder />} />
                    <Route path="customers" element={<CustomerMaster />} />
                    <Route path="customers/:id/360" element={<Customer360 />} />
                    <Route path="catalog" element={<CatalogMaster />} />
                    <Route path="purchase-orders" element={<PurchaseOrderList />} />
                    <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
                    <Route path="invoices" element={<InvoiceList />} />
                    <Route path="invoices/:id" element={<InvoiceDetail />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="receivables" element={<RoleRoute allowedRoles={['SUPER_ADMIN']}><Receivables /></RoleRoute>} />
                    <Route path="reports" element={<RoleRoute allowedRoles={['SUPER_ADMIN']}><Reports /></RoleRoute>} />
                    <Route path="users" element={<RoleRoute allowedRoles={['SUPER_ADMIN']}><UserList /></RoleRoute>} />
                    <Route path="trash" element={<TrashList />} />
                    <Route path="activity" element={<Activity />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
            </Suspense>
        </ToastProvider>
    );
}

export default App;
