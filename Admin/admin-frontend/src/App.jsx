import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnquiryList from './pages/EnquiryList';
import QuotationBuilder from './pages/QuotationBuilder';
import QuotationList from './pages/QuotationList';
import UserList from './pages/UserList';
import Settings from './pages/Settings';
import TrashList from './pages/TrashList';
import Activity from './pages/Activity';
import CustomerMaster from './pages/CustomerMaster';
import Customer360 from './pages/Customer360';
import CatalogMaster from './pages/CatalogMaster';
import PurchaseOrderList from './pages/PurchaseOrderList';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import InvoiceList from './pages/InvoiceList';
import InvoiceDetail from './pages/InvoiceDetail';
import Payments from './pages/Payments';
import Receivables from './pages/Receivables';
import Reports from './pages/Reports';
import CrmDashboard from './pages/CrmDashboard';
import CrmLeads from './pages/CrmLeads';
import CrmLeadDetails from './pages/CrmLeadDetails';
import CrmPipeline from './pages/CrmPipeline';
import CrmFollowUps from './pages/CrmFollowUps';
import SessionManager from './components/SessionManager';

const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
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
                <Route path="receivables" element={<Receivables />} />
                <Route path="reports" element={<Reports />} />
                <Route path="users" element={<UserList />} />
                <Route path="trash" element={<TrashList />} />
                <Route path="activity" element={<Activity />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

export default App;
