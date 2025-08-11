import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

    return (
        <div className="d-flex">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
            <div 
                className="flex-grow-1" 
                style={{ 
                    marginLeft: sidebarCollapsed ? '80px' : '250px',
                    transition: 'margin-left 0.3s ease',
                    minHeight: '100vh',
                    backgroundColor: '#f8f9fa'
                }}
            >
                <Outlet />
            </div>
        </div>
    );
};

export default MainLayout;