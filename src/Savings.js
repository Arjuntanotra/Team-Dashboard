import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as XLSX from 'xlsx';
import {
  DollarSign,
  TrendingUp,
  Home,
  ChevronRight,
  RefreshCw,
  BarChart3,
  PieChart,
  Target,
} from "lucide-react";

export default function Savings() {
  const [isLoading, setIsLoading] = useState(true);
  const [savingsData, setSavingsData] = useState([]);
  const [error, setError] = useState(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const loadDataFromGoogleSheets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Google Sheets API configuration
      const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
      const SHEET_NAME = "Sheet2";

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

      console.log("Loaded Google Sheets Data:", { headers, dataRows });

      // Transform the data to match our expected format
      // Use only the first 8 columns as specified by the user
      const transformedData = dataRows.map((row, index) => {
        if (!row || row.length < 8) return null; // Skip incomplete rows

        // Use standard column mapping for the first 8 columns
        const unit = String(row[0] || '').trim() || "Unknown Unit";
        const projectDetail = String(row[1] || '').trim() || "";
        const orderType = String(row[2] || '').trim() || "";
        const lppQuotedPrice = parseFloat(String(row[3] || '').replace(/[₹,\s]/g, '')) || 0;
        const cqp = parseFloat(String(row[4] || '').replace(/[₹,\s]/g, '')) || 0;
        const savingPercentageRaw = String(row[5] || '').replace(/[%\s]/g, '');
        const expectedSavingsRaw = String(row[6] || '').replace(/[₹,\s]/g, '');
        const remarks = String(row[7] || '').trim() || "";

        // Parse saving percentage (remove % and convert to decimal)
        const savingPercentageFromSheet = parseFloat(savingPercentageRaw) / 100 || 0;

        // ALWAYS calculate expected savings: (LPP - CQP) - ignore sheet values as they may be incorrect
        const expectedSavings = lppQuotedPrice - cqp;

        // Calculate saving percentage based on actual savings
        const savingPercentage = lppQuotedPrice > 0 && lppQuotedPrice !== cqp ?
          Math.abs(expectedSavings) / lppQuotedPrice : savingPercentageFromSheet;

        return {
          unit: unit,
          projectDetail: projectDetail,
          orderType: orderType,
          lppQuotedPrice: lppQuotedPrice,
          cqp: cqp,
          savingPercentage: savingPercentage, // Store as decimal
          expectedSavings: expectedSavings,
          remarks: remarks,
        };
      }).filter(item => item !== null && item.unit !== "Unknown Unit"); // Remove null entries and invalid data

      if (transformedData.length === 0) {
        throw new Error("No valid data found in the Google Sheet.");
      }

      // Calculate percentages based on expected savings
      const totalAllSavings = transformedData.reduce((sum, unit) => sum + unit.expectedSavings, 0);
      const finalData = transformedData.map(unit => ({
        ...unit,
        percentage: totalAllSavings > 0 ? Math.round((unit.expectedSavings / totalAllSavings) * 100) : 0,
      }));

      setSavingsData(finalData);
      setFileUploaded(true);
      setError(null);
    } catch (err) {
      console.error("Error loading Google Sheets data:", err);
      setError(err.message);
    }

    setIsLoading(false);
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

        // Transform the data to match our expected format
        const transformedData = jsonData.map((row) => {
          const lppQuotedPrice = parseFloat(String(row['LPP/ quoted price(INR)'] || row['LPP/quoted price(INR)'] || row.LPPQuotedPrice || row.lppQuotedPrice || row.LPP_QUOTED_PRICE || 0).replace(/[₹,\s]/g, '')) || 0;
          const cqp = parseFloat(String(row['CQP (INR)'] || row.CQP || row.cqp || row.CQP_INR || 0).replace(/[₹,\s]/g, '')) || 0;

          // Calculate expected savings: (LPP - CQP)
          const expectedSavings = lppQuotedPrice - cqp;

          // Calculate saving percentage: ((LPP - CQP) / LPP) * 100, stored as decimal
          const savingPercentage = lppQuotedPrice > 0 ? (expectedSavings / lppQuotedPrice) : 0;

          return {
            unit: row.Unit || row.unit || row.UNIT || "Unknown Unit",
            projectDetail: row['Project Detail'] || row.ProjectDetail || row.projectDetail || row.PROJECTDETAIL || row.Project_Detail || "",
            orderType: row['Order type'] || row.OrderType || row.orderType || row.ORDERTYPE || row.Order_Type || "",
            lppQuotedPrice: lppQuotedPrice,
            cqp: cqp,
            savingPercentage: savingPercentage, // Store as decimal (0.2 for 20%)
            expectedSavings: expectedSavings,
            remarks: row.Remarks || row.remarks || row.REMARKS || "",
          };
        });

        // Calculate percentages based on expected savings
        const totalAllSavings = transformedData.reduce((sum, unit) => sum + unit.expectedSavings, 0);
        const finalData = transformedData.map(unit => ({
          ...unit,
          percentage: totalAllSavings > 0 ? Math.round((unit.expectedSavings / totalAllSavings) * 100) : 0,
        }));

        setSavingsData(finalData);
        setFileUploaded(true);
        setError(null);
      } catch (err) {
        console.error("Error processing Excel file :", err);
        setError("Error reading Excel file. Please make sure it's a valid Excel file with the correct column structure.");
      }

      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    loadDataFromGoogleSheets();
  }, []);

  const totalSavings = savingsData.reduce((sum, unit) => sum + unit.expectedSavings, 0);
  const totalChatSavings = savingsData.reduce((sum, unit) => sum + unit.expectedSavings, 0); // Using expectedSavings as the main metric

  // Group data by units
  const getUnitsData = () => {
    const unitsMap = {};
    savingsData.forEach((item) => {
      const unitName = item.unit;
      if (!unitsMap[unitName]) {
        unitsMap[unitName] = {
          unit: unitName,
          projects: [],
          totalExpectedSavings: 0,
          totalLPPValue: 0,
          totalCQPValue: 0,
          avgSavingPercentage: 0,
          projectCount: 0,
        };
      }
      unitsMap[unitName].projects.push(item);
      unitsMap[unitName].totalExpectedSavings += item.expectedSavings;
      unitsMap[unitName].totalLPPValue += item.lppQuotedPrice;
      unitsMap[unitName].totalCQPValue += item.cqp;
      unitsMap[unitName].projectCount++;
    });

    // Calculate average saving percentage for each unit
    Object.keys(unitsMap).forEach(unitName => {
      const unit = unitsMap[unitName];
      unit.avgSavingPercentage = unit.projects.reduce((sum, project) => sum + project.savingPercentage, 0) / unit.projects.length;
    });

    return Object.values(unitsMap);
  };

  // Navigation functions
  const navigateToUnit = (unitName) => {
    setSelectedUnit(unitName);
    setSelectedProject(null);
  };

  const navigateToProject = (projectDetail) => {
    setSelectedProject(projectDetail);
  };

  const navigateBack = () => {
    if (selectedProject) {
      setSelectedProject(null);
    } else if (selectedUnit) {
      setSelectedUnit(null);
    }
  };

  const unitsData = getUnitsData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-green-700 text-xl font-semibold">Processing</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
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
                  <li>• Make sure your file is a valid Excel file (.xlsx or .xls)</li>
                  <li>• Check that your Excel file has data in the first sheet</li>
                  <li>• Verify column names include: Unit, Project Detail, Order type, LPP/ quoted price(INR), CQP (INR), Saving %, Expected Savings (INR), Remarks</li>
                  <li>• Ensure the file is not corrupted or password-protected</li>
                </ul>
              </div>
              <button
                onClick={() => document.getElementById('file-upload').click()}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Different File
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link
              to="/"
              className="cursor-pointer hover:text-green-600 hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span
              onClick={() => {
                setSelectedUnit(null);
                setSelectedProject(null);
              }}
              className="cursor-pointer hover:text-green-600 hover:underline font-medium transition-colors"
            >
              Savings Dashboard
            </span>
            {selectedUnit && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span
                  onClick={() => navigateToUnit(selectedUnit)}
                  className="cursor-pointer hover:text-green-600 hover:underline font-medium transition-colors"
                >
                  {selectedUnit}
                </span>
              </>
            )}
            {selectedProject && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-green-700 font-semibold">{selectedProject}</span>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
            <div className="text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-2">
                Cost Savings Dashboard
              </h1>
              <p className="text-slate-600">Track savings from each unit and chat interactions</p>
            </div>
          </div>
        </div>

        {/* File Upload Status */}
        {!fileUploaded && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-800">Upload Your Savings Excel File</h3>
                <p className="text-amber-700">Select your "Savings.xlsx" file to load the data. The file should contain columns: Unit, Project Detail, Order type, LPP/ quoted price(INR), CQP (INR), Saving %, Expected Savings (INR), Remarks</p>
              </div>
            </div>
          </div>
        )}





        {/* Main Content - Hierarchical Navigation */}
        {!selectedUnit && !selectedProject && (
          /* Units Overview */
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Units Overview</h2>

            {/* Enhanced Summary Bar Chart */}
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl p-8 border border-slate-200 mb-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-center mb-8">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-full shadow-lg">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent ml-4">
                    Units Savings Summary
                  </h3>
                </div>

                <div className="space-y-8">
                  {unitsData.map((unit, idx) => {
                    const maxSavings = Math.max(...unitsData.map(u => u.totalExpectedSavings));
                    const barWidth = maxSavings > 0 ? (unit.totalExpectedSavings / maxSavings) * 100 : 0;
                    const totalSavings = savingsData.reduce((sum, item) => sum + item.expectedSavings, 0);
                    const percentage = totalSavings > 0 ? (unit.totalExpectedSavings / totalSavings) * 100 : 0;

                    return (
                      <div key={idx} className="group">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="w-28 text-base font-semibold text-slate-700 truncate" title={unit.unit}>
                            {unit.unit}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-bold text-slate-600">
                              ₹{unit.totalExpectedSavings.toFixed(2)}L
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden shadow-inner">
                            <div
                              className="bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 h-8 rounded-full transition-all duration-1000 ease-out shadow-lg group-hover:shadow-xl relative overflow-hidden"
                              style={{ width: `${barWidth}%` }}
                            >
                              {/* Animated shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>

                              {/* Bar content */}
                              <div className="flex items-center justify-between h-full px-4">
                                <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                                <span className="text-white text-sm font-bold drop-shadow-lg">
                                  ₹{unit.totalExpectedSavings.toFixed(2)}L
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-white text-xs font-semibold bg-black bg-opacity-20 px-2 py-1 rounded-full">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hover tooltip */}
                          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-20 whitespace-nowrap">
                            <div className="font-semibold">{unit.unit}</div>
                            <div className="text-emerald-300">₹{unit.totalExpectedSavings.toFixed(2)}L • {percentage.toFixed(1)}% of total</div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary stats */}
                <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">₹{savingsData.reduce((sum, item) => sum + item.expectedSavings, 0).toFixed(2)}L</div>
                    <div className="text-sm text-slate-500">Total Savings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{unitsData.length}</div>
                    <div className="text-sm text-slate-500">Active Units</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{savingsData.length}</div>
                    <div className="text-sm text-slate-500">Total Projects</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unitsData.map((unit, idx) => {
                const maxSavings = Math.max(...unitsData.map(u => u.totalExpectedSavings));
                const barWidth = maxSavings > 0 ? (unit.totalExpectedSavings / maxSavings) * 100 : 0;

                return (
                  <div
                    key={idx}
                    onClick={() => navigateToUnit(unit.unit)}
                    className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-800">{unit.unit}</h3>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">₹{unit.totalExpectedSavings.toFixed(2)}L</p>
                        <p className="text-sm text-slate-500">Total Expected Savings</p>
                      </div>
                    </div>

                    {/* Bar Graph */}
                    <div className="mb-4">
                      <div className="bg-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-600">Expected Savings</span>
                          <span className="text-sm font-bold text-green-600">₹{unit.totalExpectedSavings.toFixed(2)}L</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${barWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Projects</span>
                      <span className="font-semibold text-blue-600">{unit.projectCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Avg Saving %</span>
                      <span className="font-semibold text-green-600">{(unit.avgSavingPercentage * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total LPP Value</span>
                      <span className="font-semibold text-purple-600">₹{unit.totalLPPValue.toFixed(2)}L</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total CQP Value</span>
                      <span className="font-semibold text-orange-600">₹{unit.totalCQPValue.toFixed(2)}L</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-blue-800 text-sm font-semibold text-center">Click to view projects →</p>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {selectedUnit && !selectedProject && (
          /* Projects in Selected Unit */
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{selectedUnit} - Projects</h2>

            {/* Enhanced Project Bar Chart */}
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl shadow-xl p-8 border border-slate-200 mb-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-center mb-8">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-full shadow-lg">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent ml-4">
                    Project Savings Overview - {selectedUnit}
                  </h3>
                </div>

                <div className="space-y-8">
                  {unitsData.find(u => u.unit === selectedUnit)?.projects.map((project, idx) => {
                    const maxSavings = Math.max(...unitsData.find(u => u.unit === selectedUnit).projects.map(p => p.expectedSavings));
                    const barWidth = maxSavings > 0 ? (project.expectedSavings / maxSavings) * 100 : 0;
                    const projectName = project.projectDetail || 'Unnamed Project';
                    const unitTotal = unitsData.find(u => u.unit === selectedUnit).totalExpectedSavings;
                    const percentage = unitTotal > 0 ? (project.expectedSavings / unitTotal) * 100 : 0;

                    return (
                      <div key={idx} className="group">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="w-40 text-base font-semibold text-slate-700 truncate" title={projectName}>
                            {projectName}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-bold text-slate-600">
                              ₹{project.expectedSavings.toFixed(2)}L
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden shadow-inner">
                            <div
                              className="bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600 h-8 rounded-full transition-all duration-1000 ease-out shadow-lg group-hover:shadow-xl relative overflow-hidden cursor-pointer"
                              style={{ width: `${barWidth}%` }}
                              onClick={() => navigateToProject(project.projectDetail)}
                            >
                              {/* Animated shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>

                              {/* Bar content */}
                              <div className="flex items-center justify-between h-full px-4">
                                <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                                <span className="text-white text-sm font-bold drop-shadow-lg">
                                  ₹{project.expectedSavings.toFixed(2)}L
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-white text-xs font-semibold bg-black bg-opacity-20 px-2 py-1 rounded-full">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hover tooltip */}
                          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-20 whitespace-nowrap">
                            <div className="font-semibold">{projectName}</div>
                            <div className="text-blue-300">₹{project.expectedSavings.toFixed(2)}L • {percentage.toFixed(1)}% of unit total</div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Unit summary stats */}
                <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{unitsData.find(u => u.unit === selectedUnit)?.totalExpectedSavings.toFixed(2)}L
                    </div>
                    <div className="text-sm text-slate-500">Unit Total Savings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {unitsData.find(u => u.unit === selectedUnit)?.projects.length}
                    </div>
                    <div className="text-sm text-slate-500">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {((unitsData.find(u => u.unit === selectedUnit)?.avgSavingPercentage || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-slate-500">Avg Saving %</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {unitsData.find(u => u.unit === selectedUnit)?.projects.map((project, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateToProject(project.projectDetail)}
                  className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl hover:border-green-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{project.projectDetail || 'Unnamed Project'}</h3>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">₹{project.expectedSavings.toFixed(2)}L</p>
                      <p className="text-sm text-slate-500">Expected Savings</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Order Type</span>
                      <span className="font-semibold text-blue-600">{project.orderType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">LPP/Quoted Price</span>
                      <span className="font-semibold text-purple-600">₹{project.lppQuotedPrice.toFixed(2)}L</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">CQP</span>
                      <span className="font-semibold text-orange-600">₹{project.cqp.toFixed(2)}L</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Saving %</span>
                      <span className="font-semibold text-red-600">{(project.savingPercentage * 100).toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-green-800 text-sm font-semibold text-center">Click to view details →</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedUnit && selectedProject && (
          /* Project Details */
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{selectedProject} - Details</h2>

            {(() => {
              const project = savingsData.find(p => p.projectDetail === selectedProject && p.unit === selectedUnit);
              if (!project) return <p className="text-slate-500">Project not found.</p>;

              return (
                <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-6">Project Information</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Unit</span>
                          <span className="font-semibold text-slate-800">{project.unit}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Project Detail</span>
                          <span className="font-semibold text-slate-800">{project.projectDetail}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Order Type</span>
                          <span className="font-semibold text-blue-600">{project.orderType || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Remarks</span>
                          <span className="font-semibold text-slate-600">{project.remarks || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-6">Financial Details</h3>
                      <div className="space-y-4">
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-green-700 font-medium">Expected Savings</span>
                            <span className="text-2xl font-bold text-green-600">₹{project.expectedSavings.toFixed(2)}L</span>
                          </div>
                          <p className="text-green-600 text-sm">Potential cost savings</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-blue-700 text-sm font-medium mb-1">LPP/Quoted Price</p>
                            <p className="text-xl font-bold text-blue-600">₹{project.lppQuotedPrice.toFixed(2)}L</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <p className="text-purple-700 text-sm font-medium mb-1">CQP</p>
                            <p className="text-xl font-bold text-purple-600">₹{project.cqp.toFixed(2)}L</p>
                          </div>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-orange-700 font-medium">Saving Percentage</span>
                            <span className="text-2xl font-bold text-orange-600">{(project.savingPercentage * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}


      </div>
    </div>
  );
}
