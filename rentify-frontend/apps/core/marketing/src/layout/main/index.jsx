import React from 'react';
import { NavBar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Outlet } from 'react-router-dom';
const MainLayout = () => {
  return (
    <div
      style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}
    >
      {/* Navbar */}
      <NavBar />

      {/* Main Content */}
      <div style={{ flex: 1, }}>
        <Outlet /> {/* Render nested route content */}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
