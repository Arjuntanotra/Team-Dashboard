import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from 'xlsx';
import {
  Users,
  Home,
  ChevronRight,
  RefreshCw,
  Building,
  Tag,
  ArrowLeft,
  Search,
  TrendingUp,
  Package,
} from "lucide-react";
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

export default function VendorAddition() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [vendorData, setVendorData] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#6366f1", "#84cc16"];

  const loadDataFromGoogleSheets = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
      const SHEET_NAME = "Sheet3";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

      const response = await fetch(csvUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data from Google Sheets. Status: ${response.status}`);
      }

      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '')));

      if (rows.length <= 1) {
        throw new Error("Google Sheet is empty or has no data rows.");
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const transformedData = dataRows.map((row, index) => {
        if (row.length < headers.length) return null;

        const rowData = {};
        headers.forEach((header, idx) => {
          rowData[header] = row[idx] || '';
        });

        return {
          sNo: rowData['S No'] || rowData.SNo || rowData.sNo || index + 1,
          unit: rowData.Unit || rowData.unit || rowData.UNIT || "Unknown Unit",
          category: rowData.Category || rowData.category || rowData.CATEGORY || "Unknown Category",
          vendor: rowData.Vendor || rowData.vendor || rowData.VENDOR || "Unknown Vendor",
          introductionTime: rowData['Introduction Time'] || rowData.IntroductionTime || rowData.introductionTime || "",
        };
      }).filter(item => item !== null);

      if (transformedData.length === 0) {
        throw new Error("No valid data found in the Google Sheet.");
      }

      setVendorData(transformedData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Error loading Google Sheets data:", err);
      setError(err.message);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadDataFromGoogleSheets();
  }, []);

  const getUnitsData = () => {
    const unitsMap = {};
    vendorData.forEach((item) => {
      const unitName = item.unit;
      if (!unitsMap[unitName]) {
        unitsMap[unitName] = {
          unit: unitName,
          categories: {},
          totalVendors: 0,
        };
      }

      const categoryName = item.category;
      if (!unitsMap[unitName].categories[categoryName]) {
        unitsMap[unitName].categories[categoryName] = {
          category: categoryName,
          vendors: [],
          vendorCount: 0,
        };
      }

      unitsMap[unitName].categories[categoryName].vendors.push(item);
      unitsMap[unitName].categories[categoryName].vendorCount++;
      unitsMap[unitName].totalVendors++;
    });

    Object.keys(unitsMap).forEach(unitName => {
      unitsMap[unitName].categories = Object.values(unitsMap[unitName].categories);
    });

    return Object.values(unitsMap);
  };

  const unitsData = getUnitsData();
  const totalVendors = vendorData.length;
  const totalUnits = unitsData.length;
  const totalCategories = unitsData.reduce((sum, unit) => sum + unit.categories.length, 0);

  const navigateToUnit = (unitName) => {
    setSelectedUnit(unitName);
    setSelectedCategory(null);
    setViewMode(null);
  };

  const navigateToCategory = (categoryName) => {
    setSelectedCategory(categoryName);
    setViewMode(null);
  };

  const navigateBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else if (selectedUnit) {
      setSelectedUnit(null);
    }
    setViewMode(null);
  };

  const navigateToHome = () => {
    setSelectedUnit(null);
    setSelectedCategory(null);
    setViewMode(null);
  };

  // Breadcrumb Component
  const Breadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
      <Link to="/" className="hover:text-purple-600 flex items-center gap-1 font-medium transition-colors">
        <Home className="w-4 h-4" />
        Home
      </Link>
      <ChevronRight className="w-4 h-4" />
      <span
        onClick={navigateToHome}
        className={`${!selectedUnit && !viewMode ? "text-slate-900 font-semibold" : "cursor-pointer hover:text-purple-600"} transition-colors`}
      >
        Vendor Addition
      </span>
      {viewMode === 'all-vendors' && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-semibold">All Vendors</span>
        </>
      )}
      {viewMode === 'all-units' && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-semibold">All Units</span>
        </>
      )}
      {viewMode === 'all-categories' && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-semibold">All Categories</span>
        </>
      )}
      {selectedUnit && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span
            onClick={() => { setSelectedCategory(null); setViewMode(null); }}
            className={`${!selectedCategory ? "text-slate-900 font-semibold" : "cursor-pointer hover:text-purple-600"} transition-colors`}
          >
            {selectedUnit}
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

  // Header Component
  const Header = () => (
    <div className="mb-6 bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-1">
            Vendor Addition Dashboard
          </h1>
          <p className="text-slate-600">Track vendor onboarding and supplier relationships by unit</p>
        </div>
        <div className="text-right">
          <button
            onClick={loadDataFromGoogleSheets}
            disabled={isRefreshing}
            className="mb-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto font-medium"
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <RefreshCw className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-700 text-xl font-semibold">Loading Dashboard...</p>
            <p className="text-slate-500 text-sm mt-2">Fetching vendor data from Google Sheets</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-8">
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
              onClick={loadDataFromGoogleSheets}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Overview Page
  if (!selectedUnit && !selectedCategory && !viewMode) {
    const unitChartData = unitsData.map((unit, idx) => ({
      name: unit.unit,
      vendors: unit.totalVendors,
      categories: unit.categories.length,
      color: COLORS[idx % COLORS.length],
    }));

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header />
          <Breadcrumb />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div 
              onClick={() => setViewMode('all-units')}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:shadow-xl transition-all"
            >
              <Building className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-purple-100 text-sm">Total Units</p>
              <p className="text-3xl font-bold">{totalUnits}</p>
              <p className="text-purple-100 text-xs mt-2">Click to view all →</p>
            </div>
            <div 
              onClick={() => setViewMode('all-vendors')}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:shadow-xl transition-all"
            >
              <Users className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-blue-100 text-sm">Total Vendors</p>
              <p className="text-3xl font-bold">{totalVendors}</p>
              <p className="text-blue-100 text-xs mt-2">Click to view all →</p>
            </div>
            <div 
              onClick={() => setViewMode('all-categories')}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:shadow-xl transition-all"
            >
              <Tag className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-green-100 text-sm">Total Categories</p>
              <p className="text-3xl font-bold">{totalCategories}</p>
              <p className="text-green-100 text-xs mt-2">Click to view all →</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Vendors by Unit</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={unitChartData} onClick={(data) => {
                  if (data && data.activePayload) {
                    navigateToUnit(data.activePayload[0].payload.name);
                    
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                  <Legend />
                  <Bar dataKey="vendors" fill="#8b5cf6" name="Vendors" cursor="pointer" />
                  <Bar dataKey="categories" fill="#3b82f6" name="Categories" cursor="pointer" />
                  
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Vendor Distribution (Click to drill down)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={unitChartData}
                    dataKey="vendors"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.vendors}`}
                    onClick={(data) => navigateToUnit(data.name)}
                    cursor="pointer"
                  >
                    {unitChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Unit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unitsData.map((unit, idx) => (
              <div
                key={idx}
                onClick={() => navigateToUnit(unit.unit)}
                className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{unit.unit}</h3>
                    <p className="text-slate-500 text-sm">Business Unit</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <Building className="w-6 h-6 text-purple-600" />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Vendors</span>
                    <span className="font-bold text-purple-600">{unit.totalVendors}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Categories</span>
                    <span className="font-bold text-blue-600">{unit.categories.length}</span>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-purple-800 text-sm font-semibold text-center">View details →</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // All Units View
  if (viewMode === 'all-units') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header />
          <Breadcrumb />

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">All Units ({totalUnits})</h2>
            <button
              onClick={() => setViewMode(null)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </button>
          </div>

          {/* Unit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unitsData.map((unit, idx) => (
              <div
                key={idx}
                onClick={() => navigateToUnit(unit.unit)}
                className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{unit.unit}</h3>
                    <p className="text-slate-500 text-sm">Business Unit</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <Building className="w-6 h-6 text-purple-600" />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Vendors</span>
                    <span className="font-bold text-purple-600">{unit.totalVendors}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Categories</span>
                    <span className="font-bold text-blue-600">{unit.categories.length}</span>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-purple-800 text-sm font-semibold text-center">View details →</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // All Categories View
  if (viewMode === 'all-categories') {
    const allCategories = [];
    unitsData.forEach(unit => {
      unit.categories.forEach(category => {
        allCategories.push({
          ...category,
          unit: unit.unit,
        });
      });
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header />
          <Breadcrumb />

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">All Categories ({allCategories.length})</h2>
            <button
              onClick={() => setViewMode(null)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </button>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCategories.map((category, idx) => (
              <div
                key={idx}
                onClick={() => {
                  navigateToUnit(category.unit);
                  setTimeout(() => navigateToCategory(category.category), 0);
                }}
                className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-green-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{category.category}</h3>
                    <p className="text-slate-500 text-sm">{category.unit}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Tag className="w-6 h-6 text-green-600" />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Vendors</span>
                    <span className="font-bold text-green-600 text-xl">{category.vendorCount}</span>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-green-800 text-sm font-semibold text-center">View vendors →</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // All Vendors View
  if (viewMode === 'all-vendors') {
    const filteredVendors = vendorData.filter(v =>
      v.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header />
          <Breadcrumb />

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">All Vendors ({filteredVendors.length})</h2>
            <button
              onClick={() => setViewMode(null)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
            >
              <ArrowLeft className="w-4 arh-4" />
              Back to Overview
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search vendors, units, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Vendors Table */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Vendor Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Introduction Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredVendors.map((vendor, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{vendor.vendor}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {vendor.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {vendor.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {vendor.introductionTime || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unit View - Show categories
  if (selectedUnit && !selectedCategory) {
    const unitData = unitsData.find(u => u.unit === selectedUnit);
    
    if (!unitData) return <div>Unit not found</div>;

    const categoryChartData = unitData.categories.map((cat, idx) => ({
      name: cat.category,
      vendors: cat.vendorCount,
      color: COLORS[idx % COLORS.length],
    }));

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header />
          <Breadcrumb />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg text-white">
              <Users className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-purple-100 text-sm">Total Vendors</p>
              <p className="text-3xl font-bold">{unitData.totalVendors}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
              <Tag className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-blue-100 text-sm">Total Categories</p>
              <p className="text-3xl font-bold">{unitData.categories.length}</p>
            </div>
          </div>

          {/* Category Chart */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Vendors by Category (Click to drill down)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData} onClick={(data) => {
                if (data && data.activePayload) {
                  navigateToCategory(data.activePayload[0].payload.name);
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                <Legend />
                <Bar dataKey="vendors" fill="#8b5cf6" name="Vendors" cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unitData.categories.map((category, idx) => (
              <div
                key={idx}
                onClick={() => navigateToCategory(category.category)}
                className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{category.category}</h3>
                    <p className="text-slate-500 text-sm">Category</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <Tag className="w-6 h-6 text-blue-600" />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Vendors</span>
                    <span className="font-bold text-purple-600 text-xl">{category.vendorCount}</span>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-purple-800 text-sm font-semibold text-center">View vendors →</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Category View - Show vendors
  if (selectedCategory) {
    const unitData = unitsData.find(u => u.unit === selectedUnit);
    const categoryData = unitData?.categories.find(c => c.category === selectedCategory);

    if (!categoryData) return <div>Category not found</div>;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header />
          <Breadcrumb />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{selectedCategory}</h2>
              <p className="text-slate-600">{categoryData.vendorCount} vendors in this category</p>
            </div>
            <button
              onClick={navigateBack}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Categories
            </button>
          </div>

          {/* Vendor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryData.vendors.map((vendor, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-xs text-slate-500">#{vendor.sNo}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-2">{vendor.vendor}</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Unit</span>
                    <span className="text-slate-800 font-medium text-sm">{vendor.unit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Introduction</span>
                    <span className="text-slate-800 font-medium text-sm">{vendor.introductionTime || "N/A"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
