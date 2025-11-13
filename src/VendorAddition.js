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
  };

  const navigateToCategory = (categoryName) => {
    setSelectedCategory(categoryName);
  };

  const navigateBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else if (selectedUnit) {
      setSelectedUnit(null);
    }
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
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link
              to="/"
              className="cursor-pointer hover:text-purple-600 hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-purple-700 font-semibold">Vendor Addition Dashboard</span>
          </div>

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
        </div>

        {/* Hierarchical Navigation Content */}
        {!selectedUnit && !selectedCategory && (
          /* Level 1: Units Overview */
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Building className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Total Units</p>
                    <p className="text-2xl font-bold text-purple-700">{totalUnits}</p>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-purple-800 text-xs font-semibold">Active business units</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Vendors</p>
                    <p className="text-2xl font-bold text-blue-700">{totalVendors}</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-blue-800 text-xs font-semibold">Across all units</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Tag className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-green-600 text-sm font-medium">Categories</p>
                    <p className="text-2xl font-bold text-green-700">
                      {unitsData.reduce((sum, unit) => sum + unit.categories.length, 0)}
                    </p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-green-800 text-xs font-semibold">Vendor categories</p>
                </div>
              </div>
            </div>

            {/* Units Grid */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Units Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unitsData.map((unit, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigateToUnit(unit.unit)}
                    className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-800">{unit.unit}</h3>
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Building className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>

                    <div className="space-y-4 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Total Vendors</span>
                        <span className="font-bold text-purple-600 text-lg">{unit.totalVendors}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Categories</span>
                        <span className="font-bold text-blue-600 text-lg">{unit.categories.length}</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3">
                      <p className="text-slate-700 text-sm font-semibold text-center">Click to view categories →</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedUnit && !selectedCategory && (
          /* Level 2: Categories within Selected Unit */
          <>
            <div className="mb-6">
              <button
                onClick={navigateBack}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Units
              </button>
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
              <button
                onClick={navigateBack}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Categories
              </button>
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
