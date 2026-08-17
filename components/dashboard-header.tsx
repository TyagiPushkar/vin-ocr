'use client';

import React, { useState } from "react"
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Home,
  Package,
  Settings,
  ChevronDown,
  Search
} from 'lucide-react';

export const DashboardHeader: React.FC = () => {
  const { user, logout, getUserInitials } = useAuth();
  const router = useRouter();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Package, label: 'Dockets', path: '/docket/list' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-[#002d62] text-white z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              {showMobileMenu ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <img
                src="https://vinworldexpress.com/assets/img/resource/logo-4.png"
                alt="VIN WORLD Logo"
                className="h-8"
                onClick={() => router.push("/dashboard")}
              />
              <h1 className="text-lg font-bold text-[#f7931d]">VIN WORLD</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/docket/add')}
              className="p-2 bg-[#f7931d] rounded-lg hover:bg-[#e67e00] transition"
              title="Add Docket"
            >
              <Package className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="relative"
            >
              <div className="w-9 h-9 rounded-full bg-[#f7931d] flex items-center justify-center font-bold text-sm">
                {getUserInitials()}
              </div>
            </button>
          </div>
        </div>

        {/* Mobile User Menu */}
        {showUserMenu && (
          <div className="absolute top-full right-4 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 min-w-48 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="font-semibold text-[#002d62]">{user?.EmpName}</div>
              <div className="text-sm text-gray-500">{user?.RoleName}</div>
            </div>
            <button
              onClick={() => {
                handleLogout();
                setShowUserMenu(false);
              }}
              className="w-full p-4 text-left text-red-600 hover:bg-red-50 flex items-center gap-3"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-16">
          <div className="bg-white h-full w-64 shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#f7931d] flex items-center justify-center font-bold text-white">
                  {getUserInitials()}
                </div>
                <div>
                  <div className="font-bold text-[#002d62]">{user?.EmpName}</div>
                  <div className="text-sm text-gray-500">{user?.RoleName}</div>
                </div>
              </div>
            </div>

            <nav className="p-4">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-[#002d62]/5 hover:text-[#002d62] rounded-lg transition mb-2"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 text-center">
                VIN WORLD EXPRESS © 2024
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <header className="hidden lg:block bg-[#002d62] text-white px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-4" onClick={() => router.push("/dashboard")} style={{ cursor: "pointer" }}>
            <img
              src="https://vinworldexpress.com/assets/img/resource/logo-4.png"
              alt="VIN WORLD Logo"
              className="h-10"
            />
            <div className="h-6 w-px bg-white/30"></div>
            <h1 className="text-xl font-bold text-white">DOCKET MANAGEMENT SYSTEM</h1>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {/* <button
              onClick={() => router.push('/docket/add')}
              className="bg-[#f7931d] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#e67e00] transition flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Add Docket
            </button> */}

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition"
              >
                <div className="text-right">
                  <div className="font-semibold text-sm">{user?.EmpName}</div>
                  <div className="text-xs opacity-75">{user?.RoleName}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#f7931d] flex items-center justify-center font-bold text-sm">
                  {getUserInitials()}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Desktop User Menu */}
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 min-w-48 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="font-semibold text-[#002d62]">{user?.EmpName}</div>
                    <div className="text-sm text-gray-500">{user?.RoleName}</div>
                    <div className="text-xs text-gray-400 mt-1">{user?.EmpCode}</div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        router.push('/profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 rounded flex items-center gap-3"
                    >
                      <User className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded flex items-center gap-3 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-16"></div>
    </>
  );
};