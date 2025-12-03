import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Home,
  ChevronRight,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function Savings() {
  // Utility function to format numbers: >= 100 lakhs as crore, else lakhs
  const formatCurrency = (value) => {
    if (value >= 100) {
      return `₹${(value / 100).toFixed(2)}Cr`;
    }
    return `₹${value.toFixed(2)}L`;
  };

  const [isLoading, setIsLoading] = useState(true);
  const [savingsData, setSavingsData] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('realised');

  const loadDataFromGoogleSheets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Google Sheets API configuration
      const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
      const SHEET_NAME = "Sheet2";

      // For client-side access, we'll use the public CSV export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

      const response = await fetch(csvUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data from Google Sheets. Status: ${response.status}`);
      }

      const csvText = await response.text();

      // Parse CSV data
      const parseCSV = (csv) => {
        const lines = csv.split('\n');
        const result = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const row = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              if (inQuotes && line[j + 1] === '"') {
                current += '"';
                j++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              row.push(current.replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }

          row.push(current.replace(/^"|"$/g, ''));
          result.push(row);
        }
        return result;
      };

      const rows = parseCSV(csvText);

      if (rows.length <= 1) {
        throw new Error("Google Sheet is empty or has no data rows.");
      }

      // Remove header row and process data
      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log("Loaded Google Sheets Data:", { headers, dataRows });

      // Transform the data according to new column structure:
      // Sl No | Savings Type | Category | Item description | Vendor name | Order type | LPP/ quoted price(INR) | CQP (INR) | Saving % | Savings (INR) | Remarks
      const transformedData = dataRows.map((row, index) => {
        if (!row || row.length < 11) return null;

        return {
          slNo: parseInt(row[0]) || 0,
          savingsType: String(row[1] || '').trim(),
          category: String(row[2] || '').trim(),
          itemDescription: String(row[3] || '').trim(),
          vendorName: String(row[4] || '').trim(),
          orderType: String(row[5] || '').trim(),
          lppQuotedPrice: parseFloat(String(row[6] || '').replace(/[₹,\s]/g, '')) || 0,
          cqp: parseFloat(String(row[7] || '').replace(/[₹,\s]/g, '')) || 0,
          savingPercentage: parseFloat(String(row[8] || '').replace(/[%\s]/g, '')) || 0,
          savings: parseFloat(String(row[9] || '').replace(/[₹,\s]/g, '')) || 0,
          remarks: String(row[10] || '').trim(),
        };
      }).filter(item => item !== null);

      if (transformedData.length === 0) {
        throw new Error("No valid data found in the Google Sheet.");
      }

      console.log("Transformed savings data:", transformedData);

      setSavingsData(transformedData);
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

  // Separate realised and future savings
  const realisedSavings = savingsData.filter(item => item.savingsType.toLowerCase() === 'realised');
  const futureSavings = savingsData.filter(item => item.savingsType.toLowerCase() === 'future');

  // Calculate totals
  const getTotalSavings = (data) => data.reduce((sum, item) => sum + item.savings, 0);
  const totalRealised = getTotalSavings(realisedSavings);
  const totalFuture = getTotalSavings(futureSavings);
  const totalSavings = totalRealised + totalFuture;

  // Group by category
  const getSavingsByCategory = (data) => {
    const categories = {};
    data.forEach(item => {
      const category = item.category;
      if (!categories[category]) {
        categories[category] = {
          category,
          totalSavings: 0,
          count: 0,
          items: []
        };
      }
      categories[category].totalSavings += item.savings;
      categories[category].count += 1;
      categories[category].items.push(item);
    });
    return Object.values(categories).sort((a, b) => b.totalSavings - a.totalSavings);
  };

  const realisedByCategory = getSavingsByCategory(realisedSavings);
  const futureByCategory = getSavingsByCategory(futureSavings);

  // Chart data
  const chartData = [
    {
      name: 'Realised Savings',
      value: totalRealised,
      color: '#10b981',
    },
    {
      name: 'Future Savings',
      value: totalFuture,
      color: '#f59e0b',
    },
  ];

  const categoryChartData = realisedByCategory.slice(0, 8).map(cat => ({
    name: cat.category.length > 15 ? cat.category.substring(0, 15) + '...' : cat.category,
    savings: cat.totalSavings,
    count: cat.count,
  }));

  // Get percentage data
  const getCategoryPercentage = () => {
    return realisedByCategory.map((cat, index) => ({
      ...cat,
      percentageOfRealised: totalRealised > 0 ? (cat.totalSavings / totalRealised) * 100 : 0,
    }));
  };

  const categoryPercentageData = getCategoryPercentage();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-green-700 text-xl font-semibold">Loading Savings Data...</p>
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
              <button onClick={loadDataFromGoogleSheets} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg">
                Try Again
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
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 bg-slate-800 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Back to Dashboard
          </button>

          <div className="mt-6 bg-white rounded-2xl shadow-lg p-8 border border-green-200">
            <div className="flex items-center gap-6">
              <div className="bg-green-100 p-4 rounded-lg">
                <DollarSign className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Cost Savings Tracker
                </h1>
                <p className="text-slate-600 mt-2 text-lg">Comprehensive view of realised and potential savings</p>
                <div className="flex gap-4 mt-4">
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                    {totalSavings > 100 ? (totalSavings / 100).toFixed(2) + ' Cr' : totalSavings.toFixed(2) + ' L'} Total Savings
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {realisedByCategory.length} Categories
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-2 border border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('realised')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'realised'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CheckCircle className="w-5 h-5 inline mr-2" />
              Realised Savings ({realisedSavings.length})
            </button>
            <button
              onClick={() => setActiveTab('future')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'future'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-5 h-5 inline mr-2" />
              Future Savings ({futureSavings.length})
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm font-medium">
                Realised
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-1">{formatCurrency(totalRealised)}</p>
            <p className="text-gray-600 text-sm">Savings Already Realised</p>
            <div className="mt-2 text-xs text-gray-500">
              {totalSavings > 0 ? ((totalRealised / totalSavings) * 100).toFixed(1) : 0}% of total savings
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-medium">
                Future
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-1">{formatCurrency(totalFuture)}</p>
            <p className="text-gray-600 text-sm">Potential Future Savings</p>
            <div className="mt-2 text-xs text-gray-500">
              {totalSavings > 0 ? ((totalFuture / totalSavings) * 100).toFixed(1) : 0}% of total savings
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                Total
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-1">{formatCurrency(totalSavings)}</p>
            <p className="text-gray-600 text-sm">Combined Savings</p>
            <div className="mt-2 text-xs text-gray-500">
              Across {savingsData.length} initiatives
            </div>
          </div>
        </div>

        {activeTab === 'realised' && (
          <>
            {/* Realised Savings Summary Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-emerald-600" />
                  Realised Savings Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.filter(d => d.name === 'Realised Savings')}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ value, percent }) => `${formatCurrency(value)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Realised Savings']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  Savings by Category (Top 8)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={11}
                    />
                    <YAxis tickFormatter={(value) => value >= 100 ? (value/100).toFixed(1) + 'M' : value.toString()} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Savings']}
                      labelFormatter={(label) => `Category: ${label}`}
                    />
                    <Bar dataKey="savings" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Realised Savings Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Realised Savings Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saving %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {realisedSavings.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.slNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={item.itemDescription}>
                          {item.itemDescription}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.vendorName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">{formatCurrency(item.savings)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.savingPercentage}%</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.remarks}>{item.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'future' && (
          <>
            {/* Future Savings Summary Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-amber-600" />
                  Future Savings Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.filter(d => d.name === 'Future Savings')}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ value, percent }) => `${formatCurrency(value)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Future Savings']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  Future Savings by Category
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={futureByCategory.map(cat => ({
                    name: cat.category.length > 15 ? cat.category.substring(0, 15) + '...' : cat.category,
                    savings: cat.totalSavings,
                    count: cat.count,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={11}
                    />
                    <YAxis tickFormatter={(value) => value >= 100 ? (value/100).toFixed(1) + 'M' : value.toString()} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Savings']}
                      labelFormatter={(label) => `Category: ${label}`}
                    />
                    <Bar dataKey="savings" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Future Savings Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Future Savings Pipeline</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saving %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {futureSavings.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.slNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={item.itemDescription}>
                          {item.itemDescription}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.vendorName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-600">{formatCurrency(item.savings)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.savingPercentage}%</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.remarks}>{item.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
