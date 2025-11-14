import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TeamDashboard from './dash_board';
import Savings from './Savings';
import VendorAddition from './VendorAddition';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

function Home() {
  const [dashboardData, setDashboardData] = useState({
    team: null,
    savings: null,
    vendors: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";

  useEffect(() => {
    loadAllDashboardData();
  }, []);

  const loadAllDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load data from all three sheets
      const [teamResponse, savingsResponse, vendorResponse] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`),
        fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet2`),
        fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet3`),
      ]);

      if (!teamResponse.ok || !savingsResponse.ok || !vendorResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [teamCsv, savingsCsv, vendorCsv] = await Promise.all([
        teamResponse.text(),
        savingsResponse.text(),
        vendorResponse.text(),
      ]);

      // Robust CSV parser function
      const parseCSV = (csv) => {
        const lines = csv.split('\n');
        const result = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV parser that handles quoted fields
          const row = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              if (inQuotes && line[j + 1] === '"') {
                // Escaped quote
                current += '"';
                j++; // Skip next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              // Field separator
              row.push(current.replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }

          // Add the last field
          row.push(current.replace(/^"|"$/g, ''));
          result.push(row);
        }
        return result;
      };

      // Parse team data
      const teamRows = parseCSV(teamCsv);
      const teamHeaders = teamRows[0];
      const teamDataRows = teamRows.slice(1);
      const teamData = teamDataRows.map(row => {
        const obj = {};
        teamHeaders.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      // Parse savings data
      const savingsRows = parseCSV(savingsCsv);
      const savingsHeaders = savingsRows[0];
      const savingsDataRows = savingsRows.slice(1);
      const savingsData = savingsDataRows.map(row => {
        const obj = {};
        savingsHeaders.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      // Parse vendor data
      const vendorRows = parseCSV(vendorCsv);
      const vendorHeaders = vendorRows[0];
      const vendorDataRows = vendorRows.slice(1);
      const vendorData = vendorDataRows.map(row => {
        const obj = {};
        vendorHeaders.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      setDashboardData({
        team: teamData,
        savings: savingsData,
        vendors: vendorData,
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    }

    setIsLoading(false);
  };

  // Prepare chart data for each dashboard separately
  const getTeamStats = () => {
    if (!dashboardData.team) return null;

    const totalTasks = dashboardData.team.length;
    const completedTasks = dashboardData.team.filter(row =>
      (row.Status || "").toLowerCase().includes("complete") ||
      (row.Status || "").toLowerCase().includes("done")
    ).length;

    return { totalTasks, completedTasks };
  };

  const getSavingsStats = () => {
    if (!dashboardData.savings) return null;

    const totalSavings = dashboardData.savings.reduce((sum, row) => {
      // Use the exact column name "Expected Savings (INR)"
      const savings = parseFloat(String(row['Expected Savings (INR)'] || 0).replace(/[₹,\s]/g, '')) || 0;
      return sum + savings;
    }, 0);

    const totalProjects = dashboardData.savings.length;

    return { totalSavings, totalProjects };
  };

  const getVendorStats = () => {
    if (!dashboardData.vendors) return null;

    const totalVendors = dashboardData.vendors.length;
    const uniqueUnits = new Set(dashboardData.vendors.map(row => row.Unit || row.unit)).size;
    const uniqueCategories = new Set(dashboardData.vendors.map(row => row.Category || row.category)).size;

    return { totalVendors, uniqueUnits, uniqueCategories };
  };

  const getTeamChartData = () => {
    if (!dashboardData.team) return [];

    // Calculate manager KPIs and project counts
    const managerData = {};

    dashboardData.team.forEach(row => {
      const manager = row.Manager || row.ManagerName || 'Unknown';
      const project = row.Project || row.ProjectName;

      if (!managerData[manager]) {
        managerData[manager] = {
          manager: manager.length > 12 ? manager.substring(0, 12) + '...' : manager,
          fullManager: manager,
          projects: new Set(),
          totalTasks: 0,
          completedTasks: 0,
          kpiSum: 0,
          kpiCount: 0,
        };
      }

      if (project) {
        managerData[manager].projects.add(project);
      }

      managerData[manager].totalTasks++;

      const status = (row.Status || "").toLowerCase();
      if (status.includes("complete") || status.includes("done")) {
        managerData[manager].completedTasks++;
      }

      // Calculate KPI for this task
      const startDate = row.StartDate;
      const completedDate = row.CompletedDate || row.ActualDate || row.CompletionDate;
      const deadline = row.Deadline || row.DueDate;

      if (startDate && completedDate && deadline) {
        const kpi = calculateKPI(startDate, completedDate, deadline);
        if (kpi !== null) {
          managerData[manager].kpiSum += kpi;
          managerData[manager].kpiCount++;
        }
      }
    });

    // Calculate average KPIs and prepare chart data
    return Object.values(managerData)
      .map(manager => ({
        manager: manager.manager,
        fullManager: manager.fullManager,
        projects: manager.projects.size,
        avgKpi: manager.kpiCount > 0 ? Math.round(manager.kpiSum / manager.kpiCount) : 85, // Default KPI of 85% for managers with no completed tasks
        completionRate: manager.totalTasks > 0 ? Math.round((manager.completedTasks / manager.totalTasks) * 100) : 0,
      }))
      .sort((a, b) => b.projects - a.projects) // Sort by number of projects
      .slice(0, 6); // Show top 6 managers
  };

  // Helper function to calculate KPI (same as in team dashboard)
  const calculateKPI = (startDateStr, completionDateStr, deadlineStr) => {
    if (!completionDateStr || completionDateStr === "N/A" || completionDateStr === "-") return null;

    try {
      const start = parseDate(startDateStr);
      const completion = parseDate(completionDateStr);
      const deadline = parseDate(deadlineStr);

      if (!start || !completion || !deadline) return null;

      const delayMs = completion - deadline;
      const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));

      if (delayDays <= 0) return 100;

      const weeksDelay = Math.ceil(delayDays / 7);
      const kpi = Math.max(0, 100 - (weeksDelay * 5));

      return Math.round(kpi);
    } catch {
      return null;
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === "N/A" || dateStr === "-") return null;
    try {
      if (dateStr.includes("/")) {
        const [day, month, year] = dateStr.split("/");
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  const getSavingsChartData = () => {
    if (!dashboardData.savings) return [];

    // Group savings by unit (top 6) - use "Expected Savings (INR)" column
    const unitData = {};
    dashboardData.savings.forEach(row => {
      const unit = row.Unit || row.unit || 'Unknown';
      // Use the correct column name "Expected Savings (INR)"
      const savings = parseFloat(String(row['Expected Savings (INR)'] || 0).replace(/[₹,\s]/g, '')) || 0;

      if (!unitData[unit]) {
        unitData[unit] = {
          unit: unit.length > 10 ? unit.substring(0, 10) + '...' : unit,
          fullUnit: unit,
          totalSavings: 0,
          projectCount: 0,
        };
      }

      unitData[unit].totalSavings += savings;
      unitData[unit].projectCount += 1;
    });

    return Object.values(unitData)
      .sort((a, b) => b.totalSavings - a.totalSavings)
      .slice(0, 6)
      .map(item => ({
        unit: item.unit,
        savings: item.totalSavings, // Show exact savings amount
        fullUnit: item.fullUnit,
        projectCount: item.projectCount,
        totalSavings: item.totalSavings,
      }));
  };

  const getVendorChartData = () => {
    if (!dashboardData.vendors) return [];

    // Group vendors by unit (top 6)
    const unitVendors = {};
    dashboardData.vendors.forEach(row => {
      const unit = row.Unit || row.unit || 'Unknown';
      unitVendors[unit] = (unitVendors[unit] || 0) + 1;
    });

    return Object.entries(unitVendors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([unit, vendors]) => ({
        unit: unit.length > 10 ? unit.substring(0, 10) + '...' : unit,
        vendors,
        fullUnit: unit
      }));
  };

  const teamStats = getTeamStats();
  const savingsStats = getSavingsStats();
  const vendorStats = getVendorStats();
  const teamChartData = getTeamChartData();
  const savingsChartData = getSavingsChartData();
  const vendorChartData = getVendorChartData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-blue-600 animate-spin rounded-full mx-auto mb-4 border-4 border-blue-200 border-t-transparent"></div>
            <p className="text-slate-700 text-xl font-semibold">Loading Dashboard Overview...</p>
            <p className="text-slate-500 text-sm mt-2">Fetching data from all modules</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Error Loading Data</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={loadAllDashboardData}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
            Procurement Team Dashboard
          </h1>
          <p className="text-slate-600 text-lg">
            Comprehensive overview of team performance, cost savings, and vendor management
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Team Dashboard Card */}
          <div
            onClick={() => window.location.href = '/dashboard'}
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
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
          </div>

          {/* Savings Card */}
          <div
            onClick={() => window.location.href = '/savings'}
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
          >
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>

          {/* New Vendor Addition Card */}
          <div
            onClick={() => window.location.href = '/vendors'}
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
          >
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Team Projects & KPI Chart */}
          {teamChartData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Manager Projects & KPIs</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="manager"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = teamChartData.find(d => d.manager === label);
                          return (
                            <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
                              <p className="font-bold text-slate-800 mb-2">{data?.fullManager || label}</p>
                              <p className="text-slate-600">Projects: <span className="font-semibold">{data?.projects}</span></p>
                              <p className="text-slate-600">Avg KPI: <span className="font-semibold">{data?.avgKpi}%</span></p>
                              <p className="text-slate-600">Completion Rate: <span className="font-semibold">{data?.completionRate}%</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="projects" fill="#3b82f6" name="Projects" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="avgKpi" fill="#10b981" name="Avg KPI %" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-slate-600">Projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-slate-600">Avg KPI %</span>
                </div>
              </div>

              {/* Team Summary */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{teamStats?.totalTasks || 0}</p>
                    <p className="text-sm text-slate-500">Total Tasks</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{teamStats?.completedTasks || 0}</p>
                    <p className="text-sm text-slate-500">Completed Tasks</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{teamChartData.length > 0 ? Math.round(teamChartData.reduce((sum, m) => sum + m.avgKpi, 0) / teamChartData.length) : 0}%</p>
                    <p className="text-sm text-slate-500">Avg Team KPI</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Savings by Unit Chart */}
          {savingsChartData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Top Units by Savings</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={savingsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="unit"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = savingsChartData.find(d => d.unit === label);
                          return (
                            <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
                              <p className="font-bold text-slate-800 mb-2">{data?.fullUnit || label}</p>
                              <p className="text-slate-600">Savings: <span className="font-semibold">₹{data?.totalSavings?.toLocaleString()}L</span></p>
                              <p className="text-slate-600">Projects: <span className="font-semibold">{data?.projectCount}</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="savings" fill="#10b981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Savings Summary */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">₹{savingsStats?.totalSavings?.toFixed(2)}L</p>
                    <p className="text-sm text-slate-500">Total Savings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{savingsChartData[0]?.fullUnit || 'N/A'}</p>
                    <p className="text-sm text-slate-500">Top Saving Unit</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vendors by Unit Chart */}
          {vendorChartData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Top Units by Vendors</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendorChartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="unit"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip
                      formatter={(value) => [value, 'Vendors']}
                      labelFormatter={(label) => vendorChartData.find(d => d.unit === label)?.fullUnit || label}
                    />
                    <Bar dataKey="vendors" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Vendor Summary */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{vendorStats?.totalVendors || 0}</p>
                    <p className="text-sm text-slate-500">Total Vendors</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{vendorChartData[0]?.fullUnit || 'N/A'}</p>
                    <p className="text-sm text-slate-500">Top Vendor Unit</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Team Stats Card */}
          {teamStats && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Team Performance</h3>
                    <p className="text-sm text-slate-500">Task Management</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Tasks</span>
                  <span className="font-bold text-blue-600">{teamStats.totalTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Completed</span>
                  <span className="font-bold text-green-600">{teamStats.completedTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Completion Rate</span>
                  <span className="font-bold text-purple-600">{teamStats.totalTasks > 0 ? Math.round((teamStats.completedTasks / teamStats.totalTasks) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Savings Stats Card */}
          {savingsStats && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Cost Savings</h3>
                    <p className="text-sm text-slate-500">Financial Performance</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Savings</span>
                  <span className="font-bold text-green-600">₹{savingsStats.totalSavings?.toFixed(2)}L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Projects</span>
                  <span className="font-bold text-blue-600">{savingsStats.totalProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Avg per Project</span>
                  <span className="font-bold text-purple-600">₹{(savingsStats.totalSavings / savingsStats.totalProjects)?.toFixed(2)}L</span>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Stats Card */}
          {vendorStats && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Vendor Management</h3>
                    <p className="text-sm text-slate-500">Supplier Relationships</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Vendors</span>
                  <span className="font-bold text-purple-600">{vendorStats.totalVendors}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Business Units</span>
                  <span className="font-bold text-blue-600">{vendorStats.uniqueUnits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Categories</span>
                  <span className="font-bold text-green-600">{vendorStats.uniqueCategories}</span>
                </div>
              </div>
            </div>
          )}
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
