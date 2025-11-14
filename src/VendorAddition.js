import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from 'xlsx';
import {
  Users,
  Plus,
  Home,
  ChevronRight,
  RefreshCw,
  Building,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  Tag,
  Calendar,
  ArrowLeft,
} from "lucide-react";

export default function VendorAddition() {
  const [isLoading, setIsLoading] = useState(true);
  const [vendorData, setVendorData] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState(null); // null for overview, 'all-vendors' for vendor list
  const [searchTerm, setSearchTerm] = useState('');

  const loadDataFromGoogleSheets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Google Sheets API configuration
      const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
      const SHEET_NAME = "Sheet3";

      // For client-side access, we'll use the public CSV export URL
      // Note: This works for publicly shared sheets
      const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

      const response = await fetch(csvUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data from Google Sheets. Status: ${response.status}`);
      }

      const csvText = await response.text();

      // Parse CSV data
      const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '')));

      if (rows.length <= 1) {
        throw new Error("Google Sheet is empty or has no data rows.");
      }

      // Remove header row and process data
      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log("Loaded Google Sheets Vendor Data:", { headers, dataRows });

      // Transform the data to match our expected format
      const transformedData = dataRows.map((row, index) => {
        if (row.length < headers.length) return null; // Skip incomplete rows

        const rowData = {};
        headers.forEach((header, idx) => {
          rowData[header] = row[idx] || '';
        });

        return {
          sNo: rowData['S No'] || rowData.SNo || rowData.sNo || index + 1,
          unit: rowData.Unit || rowData.unit || rowData.UNIT || "Unknown Unit",
          category: rowData.Category || rowData.category || rowData.CATEGORY || "Unknown Category",
          vendor: rowData.Vendor || rowData.vendor || rowData.VENDOR || "Unknown Vendor",
          introductionTime: rowData['Introduction Time'] || rowData.IntroductionTime || rowData.introductionTime || rowData.INTRODUCTION_TIME || "",
        };
      }).filter(item => item !== null); // Remove null entries

      if (transformedData.length === 0) {
        throw new Error("No valid data found in the Google Sheet.");
      }

      setVendorData(transformedData);
      setError(null);
    } catch (err) {
      console.error("Error loading Google Sheets data:", err);
      setError(err.message);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadDataFromGoogleSheets();
  }, []);

  // Process data for hierarchical display
  const getUnitsData = () => {
    const unitsMap = {};
    vendorData.forEach((item) => {
      const unitName = item.unit;
      if (!unitsMap[unitName]) {
        unitsMap[unitName] = {
          unit: unitName,
          categories: {},
          totalVendors: 0,
          vendorCount: 0,
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
      unitsMap[unitName].vendorCount++;
    });

    // Convert categories object to array
    Object.keys(unitsMap).forEach(unitName => {
      unitsMap[unitName].categories = Object.values(unitsMap[unitName].categories);
    });

    return Object.values(unitsMap);
  };

  const unitsData = getUnitsData();
  const totalVendors = vendorData.length;
  const totalUnits = unitsData.length;

  // Navigation functions
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-purple-700 text-xl font-semibold">Processing</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Error Loading Data</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h3 className="text-slate-800 font-semibold mb-2">Troubleshooting Steps:</h3>
                <ul className="text-slate-600 text-sm space-y-1 text-left">
                  <li>• Make sure Add_Vendor.xlsx exists in the public folder</li>
                  <li>• Check that your Excel file has data in the first sheet</li>
                  <li>• Verify column names: S No, Unit, Category, Vendor, Introduction Time</li>
                  <li>• Ensure the file is not corrupted or password-protected</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-2">
                  Vendor Addition Dashboard
                </h1>
                <p className="text-slate-600">Track vendor onboarding costs and supplier relationships by unit</p>
              </div>
              <div className="text-right">
                <div className="bg-purple-50 px-4 py-2 rounded-lg">
                  <p className="text-purple-600 text-sm font-medium">Total Vendors</p>
                  <p className="text-purple-700 font-bold text-xl">{totalVendors}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600 mt-4">
            <Link
              to="/"
              className="cursor-pointer hover:text-purple-600 hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span
              onClick={() => {
                setSelectedUnit(null);
                setSelectedCategory(null);
                setViewMode(null);
              }}
              className="cursor-pointer hover:text-purple-600 hover:underline font-medium transition-colors"
            >
              Vendor Addition Dashboard
            </span>
            {viewMode === 'all-vendors' && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-purple-700 font-semibold">All Vendors</span>
              </>
            )}
            {viewMode === 'all-categories' && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-purple-700 font-semibold">All Categories</span>
              </>
            )}
            {selectedUnit && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span
                  onClick={() => {
                    setSelectedCategory(null);
                    setViewMode(null);
                  }}
                  className="cursor-pointer hover:text-purple-600 hover:underline font-medium transition-colors"
                >
                  {selectedUnit}
                </span>
              </>
            )}
            {selectedCategory && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-purple-700 font-semibold">{selectedCategory}</span>
              </>
            )}
          </div>


        </div>

        {/* Hierarchical Navigation Content */}
        {!selectedUnit && !selectedCategory && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div
                onClick={() => {
                  setSelectedUnit(null);
                  setSelectedCategory(null);
                  setViewMode(null);
                }}
                className="relative bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 shadow-2xl border border-purple-200 hover:shadow-3xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="bg-purple-500 p-4 rounded-xl shadow-lg">
                      <Building className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-purple-600 text-sm font-semibold uppercase tracking-wide">Total Units</p>
                      <p className="text-4xl font-bold text-purple-800">{totalUnits}</p>
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-purple-200">
                    <p className="text-purple-800 text-sm font-semibold text-center">Click to explore all business units</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setViewMode('all-vendors')}
                className="relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 shadow-2xl border border-blue-200 hover:shadow-3xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="bg-blue-500 p-4 rounded-xl shadow-lg">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-blue-600 text-sm font-semibold uppercase tracking-wide">Total Vendors</p>
                      <p className="text-4xl font-bold text-blue-800">{totalVendors}</p>
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-200">
                    <p className="text-blue-800 text-sm font-semibold text-center">Click to view complete vendor directory</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setViewMode('all-categories')}
                className="relative bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 shadow-2xl border border-green-200 hover:shadow-3xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="bg-green-500 p-4 rounded-xl shadow-lg">
                      <Tag className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 text-sm font-semibold uppercase tracking-wide">Categories</p>
                      <p className="text-4xl font-bold text-green-800">
                        {unitsData.reduce((sum, unit) => sum + unit.categories.length, 0)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-green-200">
                    <p className="text-green-800 text-sm font-semibold text-center">Click to explore vendor categories</p>
                  </div>
                </div>
              </div>
            </div>

            {viewMode === 'all-vendors' ? (
              /* All Vendors Table */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">All Vendors</h2>
                  <button
                    onClick={() => setViewMode(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Overview
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white"
                    />
                  </div>
                </div>

                {/* Vendors Table */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Vendor Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Unit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Timeline
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {vendorData
                          .filter(vendor =>
                            vendor.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            vendor.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            vendor.category.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((vendor, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                {vendor.vendor}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {vendor.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {vendor.category}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {vendor.introductionTime || 'N/A'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : viewMode === 'all-categories' ? (
              /* All Categories with Vendors */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">All Categories</h2>
                  <button
                    onClick={() => setViewMode(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Overview
                  </button>
                </div>

                {/* Filter for Categories */}
                <div className="mb-6">
                  <div className="relative max-w-md">
                    <select
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white appearance-none"
                    >
                      <option value="">All Categories</option>
                      {Object.keys(
                        vendorData.reduce((acc, vendor) => {
                          acc[vendor.category] = true;
                          return acc;
                        }, {})
                      ).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {(() => {
                  const categoriesMap = {};
                  vendorData.forEach(vendor => {
                    if (!categoriesMap[vendor.category]) categoriesMap[vendor.category] = [];
                    categoriesMap[vendor.category].push(vendor);
                  });

                  const filteredCategories = Object.entries(categoriesMap).filter(([category]) =>
                    category.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  return filteredCategories.map(([category, vendors]) => (
                    <div key={category} className="mb-8">
                      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-green-600" />
                        {category} ({vendors.length} vendors)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vendors.map((vendor, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-lg p-4 shadow-md border border-slate-200 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-semibold text-slate-800">{vendor.vendor}</h4>
                              <div className="bg-green-100 p-1 rounded">
                                <Users className="w-4 h-4 text-green-600" />
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Unit:</span>
                                <span className="font-medium text-purple-600">{vendor.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Timeline:</span>
                                <span className="font-medium text-blue-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {vendor.introductionTime || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              /* Units Overview */
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Units Overview</h2>
                <div className="flex gap-8 items-start">
                  {/* Vertical Unit Cards */}
                  <div className="w-80 space-y-3">
                    {unitsData.map((unit, idx) => (
                      <div
                        key={idx}
                        onClick={() => navigateToUnit(unit.unit)}
                        className="bg-white rounded-lg p-3 shadow-md border border-slate-200 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-bold text-slate-800 truncate" title={unit.unit}>{unit.unit}</h3>
                          <div className="bg-purple-100 p-1.5 rounded">
                            <Building className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 text-xs">Vendors</span>
                            <span className="font-bold text-purple-600 text-sm">{unit.totalVendors}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 text-xs">Categories</span>
                            <span className="font-bold text-blue-600 text-sm">{unit.categories.length}</span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded p-1.5">
                          <p className="text-slate-700 text-xs font-semibold text-center">View categories →</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pie Chart */}
                  <div className="flex-1 max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Vendor Distribution by Unit</h3>
                      <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                          <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-lg">
                            {(() => {
                              const total = unitsData.reduce((sum, unit) => sum + unit.totalVendors, 0);
                              let currentAngle = 0;
                              const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

                              return unitsData.map((unit, idx) => {
                                const percentage = unit.totalVendors / total;
                                const angle = percentage * 360;
                                const startAngle = currentAngle;
                                const endAngle = currentAngle + angle;

                                // Convert angles to radians
                                const startRad = (startAngle * Math.PI) / 180;
                                const endRad = (endAngle * Math.PI) / 180;

                                // Calculate path
                                const x1 = 100 + 80 * Math.cos(startRad);
                                const y1 = 100 + 80 * Math.sin(startRad);
                                const x2 = 100 + 80 * Math.cos(endRad);
                                const y2 = 100 + 80 * Math.sin(endRad);

                                const largeArcFlag = angle > 180 ? 1 : 0;

                                const pathData = [
                                  `M 100 100`,
                                  `L ${x1} ${y1}`,
                                  `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                  `Z`
                                ].join(' ');

                                currentAngle = endAngle;

                                return (
                                  <path
                                    key={idx}
                                    d={pathData}
                                    fill={colors[idx % colors.length]}
                                    stroke="white"
                                    strokeWidth="2"
                                    className="hover:opacity-70 hover:scale-105 transition-all duration-200 cursor-pointer"
                                    onClick={() => navigateToUnit(unit.unit)}
                                    title={`Click to view ${unit.unit} details`}
                                  />
                                );
                              });
                            })()}
                            {/* Center circle for donut effect */}
                            <circle cx="100" cy="100" r="40" fill="white" />
                          </svg>
                        </div>

                        {/* Legend */}
                        <div className="space-y-2 w-full">
                          {unitsData.map((unit, idx) => {
                            const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
                            const total = unitsData.reduce((sum, u) => sum + u.totalVendors, 0);
                            const percentage = ((unit.totalVendors / total) * 100).toFixed(1);

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"
                                onClick={() => navigateToUnit(unit.unit)}
                                title={`Click to view ${unit.unit} details`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`}></div>
                                  <span className="font-medium text-slate-800 truncate" title={unit.unit}>
                                    {unit.unit}
                                  </span>
                                </div>
                                <span className="text-slate-500 font-semibold">{percentage}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {selectedUnit && !selectedCategory && (
          /* Level 2: Categories within Selected Unit */
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{selectedUnit} - Categories</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unitsData.find(u => u.unit === selectedUnit)?.categories.map((category, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateToCategory(category.category)}
                  className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{category.category}</h3>
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Tag className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>

                  <div className="space-y-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Vendors in Category</span>
                      <span className="font-bold text-blue-600 text-lg">{category.vendorCount}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
                    <p className="text-slate-700 text-sm font-semibold text-center">Click to view vendors →</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedUnit && selectedCategory && (
          /* Level 3: Vendors within Selected Category */
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{selectedUnit} → {selectedCategory} - Vendors</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {unitsData.find(u => u.unit === selectedUnit)?.categories
                .find(c => c.category === selectedCategory)?.vendors.map((vendor, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{vendor.vendor}</h3>
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">S No</span>
                      <span className="font-semibold text-slate-800">{vendor.sNo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Unit</span>
                      <span className="font-semibold text-purple-600">{vendor.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Category</span>
                      <span className="font-semibold text-blue-600">{vendor.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Introduction Time</span>
                      <span className="font-semibold text-green-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {vendor.introductionTime || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
                    <p className="text-green-800 text-sm font-semibold text-center">Vendor Details</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
