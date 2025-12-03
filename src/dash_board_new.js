import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  FolderOpen,
  CheckCircle,
  Clock,
  RefreshCw,
  BarChart3,
  Home,
  ChevronRight,
  TrendingUp,
  Package,
  DollarSign,
  Percent,
} from "lucide-react";
import * as XLSX from "xlsx";
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
} from "recharts";

export default function TeamDashboard() {
  const [hierarchyData, setHierarchyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [fileUploaded, setFileUploaded] = useState(false);

  // Navigation state
  const [currentLevel, setCurrentLevel] = useState("topManager"); // topManager | manager | category
  const [selectedTopManager, setSelectedTopManager] = useState("Gaurav Maheswari Sir");
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
  const SHEET_NAME = "Sheet3";

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

  useEffect(() => {
    loadHierarchyData();
  }, []);

  const loadHierarchyData = async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch Google Sheet");
      }

      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log("Raw Data:", jsonData);

      if (jsonData.length === 0) {
        throw new Error("Google Sheet is empty");
      }

      // Build hierarchical structure
      const hierarchy = buildHierarchy(jsonData);
      setHierarchyData(hierarchy);
      setFileUploaded(true);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log("Loaded Excel Data:", jsonData);

        if (jsonData.length === 0) {
          throw new Error("Excel file is empty. Please add data to your sheet.");
        }

        // Build hierarchical structure
        const hierarchy = buildHierarchy(jsonData);
        setHierarchyData(hierarchy);
        setFileUploaded(true);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error("Error processing Excel file:", err);
        setError("Error reading Excel file. Please make sure it's a valid Excel file with the correct column structure.");
      }

      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Utility function to parse dates in various formats
  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === "N/A" || dateStr === "") return null;
    
    // Try parsing DD-MM-YYYY or DD/MM/YYYY format
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    // Fallback to standard parsing
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Calculate KPI based on delay
  // 100% if on time or early
  // Deduct 5% for each week of delay (7 days)
  // First week of delay: 95%
  // Second week of delay: 90%
  // etc.
  const calculateProjectKPI = (completedDate, deadline, status) => {
    // Don't calculate KPI for in-progress projects
    if (!status || status.toLowerCase().includes("progress")) return null;
    
    const completed = parseDate(completedDate);
    const due = parseDate(deadline);
    
    // If either date is missing, return null (no KPI)
    if (!completed || !due) return null;
    
    // Calculate delay in days
    const delayInDays = Math.floor((completed - due) / (1000 * 60 * 60 * 24));
    
    // If completed on time or early, KPI is 100%
    if (delayInDays <= 0) return 100;
    
    // Calculate which week the delay falls into
    // Days 1-7: Week 1 (5% deduction)
    // Days 8-14: Week 2 (10% deduction)
    // etc.
    const weekOfDelay = Math.floor((delayInDays - 1) / 7) + 1;
    const deduction = weekOfDelay * 5;
    
    // KPI cannot go below 0
    const kpi = Math.max(0, 100 - deduction);
    
    return kpi;
  };

  // Calculate average KPI from an array of KPI values
  const calculateAverageKPI = (kpiValues) => {
    const validKPIs = kpiValues.filter(kpi => kpi !== null && kpi !== undefined);
    if (validKPIs.length === 0) return null;
    
    const sum = validKPIs.reduce((acc, kpi) => acc + kpi, 0);
    return sum / validKPIs.length;
  };

  const buildHierarchy = (data) => {
    // Create top manager structure based on data
    const topManagerMap = {};

    data.forEach((row) => {
      const managerName = row.Manager || row.manager || "Unknown Manager";
      const memberName = row.Member || row.member || "";

      if (!topManagerMap[managerName]) {
        topManagerMap[managerName] = {
          name: managerName,
          role: "VP - Procurement",
          member: memberName,
          categories: [],
        };
      }
    });

    const topManagersList = Object.values(topManagerMap);

    data.forEach((row) => {
      const srNo = parseInt(row['Sr. No'] || row['Sr No'] || row.SrNo || 0);
      const managerName = row.Manager || row.manager || "Unknown Manager";
      const memberName = row.Member || row.member || "";
      const groupCategory = row['Group Category'] || row.GroupCategory || row.groupCategory || "";
      const noOfPartCodes = parseInt(row['No of part codes'] || row.NoOfPartCodes || row.noOfPartCodes || 0);
      const avgSpentInrLakhs = parseFloat(row['Average Spent per Year (INR Lakhs)'] || row.AvgSpentInrLakhs || 0);
      const targetSavings = row['Target Savings'] || "";
      const achievedSavings = row['Achieved Savings'] || "";
      const cumulativeSavingsPercent = achievedSavings; // Use achieved savings as cumulative

      if (!groupCategory) return;

      // Collect vendors dynamically
      const vendors = [];
      let vendorIndex = 1;
      while (true) {
        const vendorKey = `New Vendor -${vendorIndex}`;
        const vendorValue = row[vendorKey];
        if (vendorValue && vendorValue.trim() !== "") {
          vendors.push(vendorValue.trim());
          vendorIndex++;
        } else {
          break;
        }
      }

      const categoryData = {
        srNo,
        manager: managerName,
        member: memberName,
        groupCategory,
        noOfPartCodes,
        avgSpentInrLakhs,
        targetSavings,
        achievedSavings,
        cumulativeSavingsPercent,
        vendors,
        totalVendors: vendors.length,
      };

      // Add to the appropriate top manager
      const topManager = topManagerMap[managerName];
      if (topManager) {
        topManager.categories.push(categoryData);
        topManager.member = memberName; // Update member name
      }
    });

    // Calculate totals for each top manager
    topManagersList.forEach(topManager => {
      topManager.totalPartCodes = topManager.categories.reduce((sum, cat) => sum + cat.noOfPartCodes, 0);
      topManager.totalAvgSpend = topManager.categories.reduce((sum, cat) => sum + cat.avgSpentInrLakhs, 0);
      topManager.totalCategories = topManager.categories.length;
      topManager.totalVendors = topManager.categories.reduce((sum, cat) => sum + cat.totalVendors, 0);
      topManager.totalTargetSavings = topManager.categories.reduce((sum, cat) => sum + (parseFloat(cat.targetSavings) || 0), 0);
      topManager.totalAchievedSavings = topManager.categories.reduce((sum, cat) => sum + (parseFloat(cat.achievedSavings) || 0), 0);
    });

    return { topManagers: topManagersList };
  };

  const navigateToManager = (topManagerName) => {
    setSelectedTopManager(topManagerName);
    setSelectedManager(null);
    setSelectedCategory(null);
    setCurrentLevel("manager");
  };

  const navigateToCategory = (categoryName) => {
    setSelectedCategory(categoryName);
    setCurrentLevel("category");
  };

  const navigateToTopManager = () => {
    setCurrentLevel("topManager");
    setSelectedManager(null);
    setSelectedCategory(null);
  };

  const navigateBackToManager = () => {
    setCurrentLevel("manager");
    setSelectedCategory(null);
  };

  const navigateBackToTopManager = () => {
    setCurrentLevel("topManager");
    setSelectedManager(null);
    setSelectedCategory(null);
  };

  // Breadcrumb Component
  const Breadcrumb = () => {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
        <Link to="/" className="hover:text-blue-600 flex items-center gap-1 font-medium transition-colors">
          <Home className="w-4 h-4" />
          Home
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-semibold">
          Procurement Dashboard
        </span>
        {selectedTopManager && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span
              onClick={navigateToTopManager}
              className={`${currentLevel === "topManager" ? "text-slate-900 font-semibold" : "cursor-pointer hover:text-blue-600"} transition-colors`}
            >
              {selectedTopManager}
            </span>
          </>
        )}
        {selectedManager && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span
              onClick={navigateBackToManager}
              className={`${currentLevel === "manager" ? "text-slate-900 font-semibold" : "cursor-pointer hover:text-blue-600"} transition-colors`}
            >
              {selectedManager}
            </span>
          </>
        )}
        {selectedCategory && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-semibold">{selectedCategory}</span>
          </>
        )}
      </div>
    );
  };

  // Helper function to get KPI color and badge
  const getKPIColor = (kpi) => {
    if (kpi === null || kpi === undefined) return { bg: "bg-gray-500", text: "text-gray-100", label: "N/A" };
    if (kpi >= 80) return { bg: "bg-green-500", text: "text-green-100", label: `${kpi.toFixed(1)}%` };
    if (kpi >= 60) return { bg: "bg-yellow-500", text: "text-yellow-100", label: `${kpi.toFixed(1)}%` };
    return { bg: "bg-red-500", text: "text-red-100", label: `${kpi.toFixed(1)}%` };
  };

  // Header Component
  const Header = ({ title, subtitle }) => {
    return (
      <div className="mb-6 bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-1">
              {title}
            </h1>
            {subtitle && <p className="text-slate-600">{subtitle}</p>}
          </div>
          <div className="text-right">
            <button
              onClick={loadHierarchyData}
              disabled={isRefreshing}
              className="mb-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </button>
            {lastUpdated && (
              <div className="bg-slate-50 px-3 py-1 rounded-lg">
                <p className="text-slate-500 text-xs">Last Updated</p>
                <p className="text-slate-700 font-semibold text-sm">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-700 text-xl font-semibold">Loading Dashboard...</p>
            <p className="text-slate-500 text-sm mt-2">Fetching team data from Google Sheets</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !fileUploaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Upload Procurement Data</h2>
            <p className="text-slate-600 mb-4">
              Upload your procurement data Excel file to load the dashboard.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <h3 className="text-slate-800 font-semibold mb-2">Required Columns Structure:</h3>
              <p className="text-slate-600 text-sm">
                The file should contain columns: Sr. No, Manager, Member, Group Category, No of part codes,
                Average Spent per Year (INR Lakhs), Target Savings, Achieved Savings, New Vendor-1, New Vendor-2, New Vendor-3, New Vendor-4
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Excel File
              </label>
              <button
                onClick={loadHierarchyData}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-5 h-5" />
                Retry Google Sheets Loading
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hierarchyData) {
    return <div>No data available</div>;
  }



  const topManager = hierarchyData.topManagers[0];

  // LEVEL 1: Top Manager View - Show categories directly since we have one manager
  if (currentLevel === "topManager") {
    const chartData = topManager.categories.map((cat, idx) => ({
      name: cat.groupCategory,
      partCodes: cat.noOfPartCodes,
      avgSpend: cat.avgSpentInrLakhs,
      vendors: cat.totalVendors,
      targetSavings: parseFloat(cat.targetSavings) || 0,
      achievedSavings: parseFloat(cat.achievedSavings) || 0,
      color: COLORS[idx % COLORS.length],
    }));

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header title={`${topManager.name}'s Procurement Dashboard`} subtitle={`${topManager.member || 'Team Lead'} - ${topManager.role}`} />
          <Breadcrumb />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
              <Package className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-blue-100 text-sm">Total Part Codes</p>
              <p className="text-3xl font-bold">{topManager.totalPartCodes.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg text-white">
              <DollarSign className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-green-100 text-sm">Total Avg Spend (Cr)</p>
              <p className="text-3xl font-bold">₹{(topManager.totalAvgSpend / 100).toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg text-white">
              <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-orange-100 text-sm">Total Categories</p>
              <p className="text-3xl font-bold">{topManager.totalCategories}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 shadow-lg text-white">
              <BarChart3 className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-pink-100 text-sm">Total Vendors</p>
              <p className="text-3xl font-bold">{topManager.totalVendors}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg text-white">
              <Percent className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-purple-100 text-sm">Target Savings (L)</p>
              <p className="text-3xl font-bold">₹{topManager.totalTargetSavings.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 shadow-lg text-white">
              <BarChart3 className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-teal-100 text-sm">Achieved Savings (L)</p>
              <p className="text-3xl font-bold">₹{topManager.totalAchievedSavings.toFixed(2)}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Category Spend Comparison (Click to drill down)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} onClick={(data) => {
                  if (data && data.activePayload) {
                    navigateToCategory(data.activePayload[0].payload.name);
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "Avg Spend") {
                        return [`₹${(value / 100).toFixed(2)} Cr`, name];
                      }
                      return [value.toLocaleString(), name];
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="avgSpend" fill="#8b5cf6" name="Avg Spend" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Target vs Achieved Savings</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`₹${value.toFixed(2)}L`, ""]}
                  />
                  <Legend />
                  <Bar dataKey="targetSavings" fill="#ef4444" name="Target Savings" />
                  <Bar dataKey="achievedSavings" fill="#22c55e" name="Achieved Savings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topManager.categories.map((cat, idx) => (
              <div
                key={idx}
                onClick={() => navigateToCategory(cat.groupCategory)}
                className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{cat.groupCategory}</h3>
                    <p className="text-slate-500 text-sm">Sr. No: {cat.srNo} | Manager: {cat.manager}</p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Part Codes</span>
                    <span className="font-bold text-purple-600">{cat.noOfPartCodes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Avg Spend (Cr)</span>
                    <span className="font-bold text-green-600">₹{(cat.avgSpentInrLakhs / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Target Savings (L)</span>
                    <span className="font-bold text-red-600">₹{parseFloat(cat.targetSavings).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Achieved Savings (L)</span>
                    <span className="font-bold text-emerald-600">₹{parseFloat(cat.achievedSavings).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Vendors</span>
                    <span className="font-bold text-orange-600">{cat.totalVendors}</span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-blue-800 text-sm font-semibold text-center">View vendor details →</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // LEVEL 2: Manager View
  if (currentLevel === "manager" && selectedManager) {
    const manager = topManager.managers[selectedManager];

    if (!manager) {
      return <div>Manager not found</div>;
    }

    const categoryChartData = manager.categories.map((cat, idx) => ({
      name: cat.groupCategory,
      partCodes: cat.noOfPartCodes,
      avgSpend: cat.avgSpentInrLakhs,
      vendors: cat.totalVendors,
      color: COLORS[idx % COLORS.length],
    }));

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header title={`${manager.name}'s Categories`} subtitle={manager.role} />
          <Breadcrumb />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
              <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-blue-100 text-sm">Total Categories</p>
              <p className="text-3xl font-bold">{manager.totalCategories}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg text-white">
              <Package className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-purple-100 text-sm">Total Part Codes</p>
              <p className="text-3xl font-bold">{manager.totalPartCodes.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg text-white">
              <DollarSign className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-green-100 text-sm">Total Avg Spend (Cr)</p>
              <p className="text-3xl font-bold">₹{(manager.totalAvgSpend / 100).toFixed(2)} Cr</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg text-white">
              <BarChart3 className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-orange-100 text-sm">Total Vendors</p>
              <p className="text-3xl font-bold">{manager.totalVendors}</p>
            </div>
          </div>

          {/* Category Chart */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Category Spend Comparison (Click to drill down)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData} onClick={(data) => {
                if (data && data.activePayload) {
                  navigateToCategory(data.activePayload[0].payload.name);
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "Avg Spend") {
                      return [`₹${(value / 100).toFixed(2)} Cr`, name];
                    }
                    return [value.toLocaleString(), name];
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="avgSpend" fill="#8b5cf6" name="Avg Spend" cursor="pointer" />
                <Bar dataKey="vendors" fill="#3b82f6" name="Vendors" cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manager.categories.map((cat, idx) => (
              <div
                key={idx}
                onClick={() => navigateToCategory(cat.groupCategory)}
                className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{cat.groupCategory}</h3>
                    <p className="text-slate-500 text-sm">Sr. No: {cat.srNo}</p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Part Codes</span>
                    <span className="font-bold text-purple-600">{cat.noOfPartCodes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Avg Spend (Cr)</span>
                    <span className="font-bold text-green-600">₹{(cat.avgSpentInrLakhs / 100).toFixed(2)} Cr</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Vendors</span>
                    <span className="font-bold text-orange-600">{cat.totalVendors}</span>
                  </div>
                  {cat.cumulativeSavingsPercent && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Savings %</span>
                      <span className="font-bold text-blue-600">{cat.cumulativeSavingsPercent}</span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-blue-800 text-sm font-semibold text-center">View vendors →</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // LEVEL 3: Category View
  if (currentLevel === "category" && selectedCategory) {
    const category = topManager.categories.find((cat) => cat.groupCategory === selectedCategory);

    if (!category) {
      return <div>Category not found</div>;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header title={`${category.groupCategory} Category Details`} subtitle={`Manager: ${category.manager} | Member: ${category.member}`} />
          <Breadcrumb />

          {/* Category Details */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{category.groupCategory}</h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-slate-600 text-sm">Sr. No</p>
                <p className="text-2xl font-bold text-purple-600">{category.srNo}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-slate-600 text-sm">Part Codes</p>
                <p className="text-2xl font-bold text-blue-600">{category.noOfPartCodes.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-slate-600 text-sm">Avg Spend (Cr)</p>
                <p className="text-2xl font-bold text-green-600">₹{(category.avgSpentInrLakhs / 100).toFixed(2)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-slate-600 text-sm">Target Savings (L)</p>
                <p className="text-2xl font-bold text-red-600">₹{parseFloat(category.targetSavings).toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="text-slate-600 text-sm">Achieved Savings (L)</p>
                <p className="text-2xl font-bold text-emerald-600">₹{parseFloat(category.achievedSavings).toFixed(2)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-slate-600 text-sm">Vendors</p>
                <p className="text-2xl font-bold text-orange-600">{category.totalVendors}</p>
              </div>
            </div>
            {category.cumulativeSavingsPercent && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-slate-600 text-sm">Achieved Savings %</p>
                <p className="text-2xl font-bold text-yellow-600">{category.cumulativeSavingsPercent}%</p>
              </div>
            )}
          </div>

          {/* Vendors List */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">New Vendor Recommendations ({category.totalVendors})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.vendors.map((vendor, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-800 font-medium">{vendor}</p>
                    <span className="text-xs text-slate-500">#{idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
