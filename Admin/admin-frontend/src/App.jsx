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
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="enquiries" element={<EnquiryList />} />
                <Route path="quotations" element={<QuotationList />} />
                <Route path="quotations/new/:enquiryId" element={<QuotationBuilder />} />
                <Route path="quotations/edit/:quotationId" element={<QuotationBuilder />} />
                <Route path="users" element={<UserList />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

export default App;
