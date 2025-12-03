import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, ArrowLeft, BarChart3, PieChart, Users, Calendar, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function TotalSavingsPage() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [chartData, setChartData] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Utility function to format numbers: >= 100 lakhs as crore, else lakhs
  const formatCurrency = (value) => {
    if (value >= 100) {
      return `₹${(value / 100).toFixed(2)}Cr`;
    }
    return `₹${value.toFixed(2)}L`;
  };

  const loadTotalSavings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
      const SHEET_NAME = "Sheet2";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch data from Google Sheets. Status: ${response.status}`);
      }

      const csvText = await response.text();
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

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Process detailed transactions
      const processedData = dataRows.map((row, index) => ({
        id: index + 1,
        date: row[0] || '',
        category: row[1] || '',
        member: row[2] || '',
        savings: parseFloat(String(row[9] || '').replace(/[₹,\s]/g, '')) || 0,
        description: row[10] || '',
        vendor: row[4] || '',
        status: row[12] || 'Completed'
      })).filter(item => item.savings > 0);

      // Calculate comprehensive metrics
      const totalSavings = processedData.reduce((sum, item) => sum + item.savings, 0);
      const totalTransactions = processedData.length;
      const avgTransaction = totalSavings / totalTransactions;

      // Separate future vs realised savings based on category "Future"
      const futureSavings = processedData
        .filter(item => item.category === 'Future' || item.category?.toLowerCase().includes('future'))
        .reduce((sum, item) => sum + item.savings, 0);

      const realisedSavings = totalSavings - futureSavings;

      // Category breakdown (excluding "Future" for realised categories chart)
      const categoryData = {};
      const realisedData = processedData.filter(item => item.category !== 'Future' && !item.category?.toLowerCase().includes('future'));
      realisedData.forEach(item => {
        if (!categoryData[item.category]) {
          categoryData[item.category] = 0;
        }
        categoryData[item.category] += item.savings;
      });

      // Member breakdown
      const memberData = {};
      processedData.forEach(item => {
        if (!memberData[item.member]) {
          memberData[item.member] = 0;
        }
        memberData[item.member] += item.savings;
      });

      // Date trend removed - data parsing issues

      // Prepare chart data - only for realised savings categories
      const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
        name,
        value: Math.round(value),
        percentage: ((value / realisedSavings) * 100).toFixed(1)
      }));

      const memberChartData = Object.entries(memberData).map(([name, value]) => ({
        name,
        value: Math.round(value),
        percentage: ((value / totalSavings) * 100).toFixed(1)
      }));

      const metricsData = {
        totalSavings,
        totalTransactions,
        avgTransaction,
        futureSavings,
        realisedSavings,
        topCategory: Object.entries(categoryData).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
        topMember: Object.entries(memberData).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
      };

      setData(processedData);
      setFilteredData(processedData);
      setMetrics(metricsData);
      setChartData({
        categories: categoryChartData,
        members: memberChartData
      });

    } catch (err) {
      console.error("Error loading Google Sheets data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTotalSavings();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <p className="text-blue-700 text-xl font-semibold">Loading Total Savings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
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
              <button onClick={loadTotalSavings} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#f97316'];

  // Filter out status from data for display (since it's removed from UI)
  const displayData = filteredData.slice(0, 50).map(item => {
    const { status, ...rest } = item; // Remove status from each item
    return rest;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 bg-slate-800 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="mt-6 bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <div className="flex items-center gap-6">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-xl shadow-lg">
                <DollarSign className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Total Savings Analytics
                </h1>
             
                <div className="flex gap-4 mt-4">
               
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border border-white/50 p-6 transform hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">Total Savings</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">{formatCurrency(metrics.totalSavings || 0)}</p>
              <p className="text-slate-500 text-xs">Comprehensive savings</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border border-white/50 p-6 transform hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">Total in Realised</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">{formatCurrency(metrics.realisedSavings || 0)}</p>
              <p className="text-slate-500 text-xs">Actual achieved savings</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border border-white/50 p-6 transform hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">Total in Future</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">{formatCurrency(metrics.futureSavings || 0)}</p>
              <p className="text-slate-500 text-xs">Projected savings</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border border-white/50 p-6 transform hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">Total Transactions</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">{metrics.totalTransactions || 0}</p>
              <p className="text-slate-500 text-xs">Savings entries</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Future vs Realised Breakdown */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-8 h-8 text-green-600" />
              <h3 className="text-2xl font-bold text-gray-800">Savings Breakdown</h3>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Total Savings: {formatCurrency(metrics.totalSavings || 0)}
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPieChart>
                <Pie
                  data={[
                    {
                      name: 'Realised',
                      value: metrics.realisedSavings || 0,
                      percentage: metrics.totalSavings ? ((metrics.realisedSavings / metrics.totalSavings) * 100).toFixed(1) : '0'
                    },
                    {
                      name: 'Future',
                      value: metrics.futureSavings || 0,
                      percentage: metrics.totalSavings ? ((metrics.futureSavings / metrics.totalSavings) * 100).toFixed(1) : '0'
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  <Cell fill="#10b981" /> {/* Green for Realised */}
                  <Cell fill="#3b82f6" /> {/* Blue for Future */}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${formatCurrency(value)} (${metrics.totalSavings ? ((value / metrics.totalSavings) * 100).toFixed(1) : '0'}%)`,
                    `${name} Savings`
                  ]}
                  labelStyle={{ color: '#374151', fontWeight: '600' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Contribution */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-8 h-8 text-purple-600" />
              <h3 className="text-2xl font-bold text-gray-800">Category</h3>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Member-wise Distribution
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPieChart>
                <Pie
                  data={chartData.members || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${formatCurrency(value)} (${((value / metrics.totalSavings) * 100).toFixed(1)}%)`,
                    `${name} Savings`
                  ]}
                  labelStyle={{ color: '#374151', fontWeight: '600' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Transactions Table */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              <h3 className="text-2xl font-bold text-gray-800">Detailed Transactions</h3>
            </div>
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
              {filteredData.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Savings Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.date || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.category || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.member || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(transaction.savings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.vendor || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.description || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length > 50 && (
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Showing first 50 records of {filteredData.length} total transactions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
