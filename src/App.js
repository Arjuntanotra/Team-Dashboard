import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TeamDashboard from './dash_board';
import Savings from './Savings';
import VendorAddition from './VendorAddition';

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
            Team Dashboard Hub
          </h1>
          <p className="text-slate-600 text-lg">
            Choose a module to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Team Dashboard Card */}
          <Link
            to="/dashboard"
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group block"
          >
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Team Dashboard</h3>
              <p className="text-slate-600 mb-4">
                Monitor team performance, track tasks, and manage projects
              </p>
              <div className="text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
                Click to open →
              </div>
            </div>
          </Link>

          {/* Savings Card */}
          <Link
            to="/savings"
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group block"
          >
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Savings</h3>
              <p className="text-slate-600 mb-4">
                Track cost savings and financial performance metrics
              </p>
              <div className="text-green-600 font-semibold group-hover:text-green-700 transition-colors">
                Click to open →
              </div>
            </div>
          </Link>

          {/* New Vendor Addition Card */}
          <Link
            to="/vendors"
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group block"
          >
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">New Vendor Addition</h3>
              <p className="text-slate-600 mb-4">
                Manage vendor onboarding and supplier relationships
              </p>
              <div className="text-purple-600 font-semibold group-hover:text-purple-700 transition-colors">
                Click to open →
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<TeamDashboard />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/vendors" element={<VendorAddition />} />
      </Routes>
    </Router>
  );
}
