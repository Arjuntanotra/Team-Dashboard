import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  Package,
  TrendingUp,
  Users,
  Target,
  ArrowLeft,
  User,
} from "lucide-react";
import Savings from "./Savings";
import TotalSavingsPage from "./TotalSavingsPage";

const GauravDashboard = () => {
  // Utility function to format numbers: >= 100 lakhs as crore, else lakhs
  const formatCurrency = (value) => {
    if (value >= 100) {
      return `₹${(value / 100).toFixed(2)}Cr`;
    }
    return `₹${value.toFixed(2)}L`;
  };
  const [data, setData] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [vendorTargetsData, setVendorTargetsData] = useState({
    maninder: { domestic: 160, global: 0, total: 160 },
    navneet: { domestic: 32, global: 20, total: 52 },
    mukti: { domestic: 50, global: 30, total: 80 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard"); // 'dashboard', 'profile', 'categories-overview', 'spend-analysis', 'savings-analysis', 'savings', 'vendors-overview', 'total-savings'
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filterMember, setFilterMember] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
  const SHEET_NAME = "Sheet3";
  const COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#ef4444",
    "#f97316",
  ];

  useEffect(() => {
    loadData();
    fetchTotalSavings().catch(console.error);
    loadVendorTargets().catch(console.error);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        SHEET_NAME
      )}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch Google Sheet");
      }

      const csvText = await response.text();

      // Parse CSV with support for multi-line quoted headers
      const lines = csvText.split("\n");

      function parseCSVRow(row) {
        const result = [];
        let current = "";
        let inQuotes = false;
        let i = 0;

        while (i < row.length) {
          const char = row[i];
          if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
          i++;
        }
        result.push(current.trim());
        return result;
      }

      // Parse all rows, handling multi-line quoted fields
      const rows = [];
      let currentRow = "";

      for (let line of lines) {
        currentRow += line;
        const quoteCount = currentRow.split('"').length - 1;

        if (quoteCount % 2 === 0 && currentRow.trim()) {
          const parsedRow = parseCSVRow(currentRow);
          if (parsedRow.length > 0) {
            rows.push(parsedRow);
          }
          currentRow = "";
        } else {
          currentRow += "\n";
        }
      }

      console.log("✓ Total parsed rows:", rows.length);

      if (rows.length < 2) {
        throw new Error("Sheet is empty or has insufficient data");
      }

      // Extract headers and find column indices dynamically
      const headers = rows[0];
      console.log("Headers:", headers);

      // Helper function to find column index by searching header names
      const findColumnIndex = (searchTerms) => {
        const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
        for (const term of terms) {
          const idx = headers.findIndex((h) =>
            h.toLowerCase().includes(term.toLowerCase())
          );
          if (idx !== -1) return idx;
        }
        return -1;
      };

      // Find all vendor columns
      const vendorIndices = headers
        .map((h, i) => (h.toLowerCase().includes("vendor") ? i : -1))
        .filter((i) => i !== -1);

      const colMap = {
        srNo: findColumnIndex(["sr. no", "sr no", "sno"]),
        manager: findColumnIndex("manager"),
        member: findColumnIndex(["member", "team member"]),
        groupCategory: findColumnIndex(["group category", "group", "category"]),
        noOfPartCodes: findColumnIndex(["no of part codes", "part codes"]),
        avgSpent: findColumnIndex(["average spent", "avg spent"]),
        targetSavings: findColumnIndex(["target savings", "target"]),
        achievedSavings: findColumnIndex(["achieved savings", "achieved"]),
      };

      console.log("✓ Column mapping:", colMap);
      console.log("✓ Vendor column indices:", vendorIndices);

      const parsedData = rows
        .slice(1)
        .filter((row) => row.length > 0 && row[0])
        .map((row) => {
          const vendors = [];
          vendorIndices.forEach((idx) => {
            if (idx < row.length && row[idx] && row[idx].trim()) {
              vendors.push(row[idx].trim());
            }
          });

          const item = {
            srNo: colMap.srNo >= 0 ? row[colMap.srNo] : "",
            manager: colMap.manager >= 0 ? row[colMap.manager] : "",
            member: colMap.member >= 0 ? row[colMap.member] : "",
            group: colMap.groupCategory >= 0 ? row[colMap.groupCategory] : "",
            category:
              colMap.groupCategory >= 0 ? row[colMap.groupCategory] : "",
            noOfPartCodes:
              colMap.noOfPartCodes >= 0
                ? parseInt(row[colMap.noOfPartCodes]) || 0
                : 0,
            avgSpent:
              colMap.avgSpent >= 0 ? parseFloat(row[colMap.avgSpent]) || 0 : 0,
            targetSavings:
              colMap.targetSavings >= 0
                ? parseFloat(
                    String(row[colMap.targetSavings] || "").replace("%", "")
                  ) || 20
                : 20,
            cumulativeSavings:
              colMap.achievedSavings >= 0
                ? parseFloat(
                    String(row[colMap.achievedSavings] || "").replace("%", "")
                  ) || 0
                : 0,
            vendors: vendors,
          };

          console.log(
            `[${item.srNo}] ${item.manager} > ${item.member} | Group: "${item.group}" | Vendors: ${item.vendors.length}`
          );

          return item;
        })
        .filter((item) => item.manager === "Gaurav Maheshwari");

      setData(parsedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const calculateMetrics = () => {
    const totalCategories = data.length;
    const totalAvgSpend = data.reduce((sum, item) => sum + item.avgSpent, 0);

    // Calculate total vendor entries (not unique vendors)
    let totalVendorEntries = 0;
    data.forEach((item) => {
      totalVendorEntries += item.vendors.length;
    });
    const totalNewVendors = totalVendorEntries;

    return { totalCategories, totalSavings, totalNewVendors, totalAvgSpend };
  };

  const fetchTotalSavings = async () => {
    try {
      const savingsSheetId = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
      const savingsSheetName = "Sheet2";
      const url = `https://docs.google.com/spreadsheets/d/${savingsSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        savingsSheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch savings data");
      }

      const csvText = await response.text();
      const rows = csvText.split("\n").map((row) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        let i = 0;

        while (i < row.length) {
          const char = row[i];
          if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            result.push(current.replace(/^"|"$/g, "").trim());
            current = "";
          } else {
            current += char;
          }
          i++;
        }
        result.push(current.replace(/^"|"$/g, "").trim());
        return result;
      });

      // Parse savings data (same logic as TotalSavingsPage)
      const headers = rows[0];
      const dataRows = rows.slice(1);
      console.log("App.js Total rows:", rows.length);
      console.log("App.js Headers:", headers);
      console.log("App.js First few data rows:", dataRows.slice(0, 3));

      const processedData = dataRows
        .filter((row) => row.length > 0 && row[0])
        .map((row, index) => ({
          savings: parseFloat(String(row[9] || "").replace(/[₹,\s]/g, "")) || 0,
        }))
        .filter((item) => item.savings > 0);

      const totalSavingsAmount = processedData.reduce(
        (sum, item) => sum + item.savings,
        0
      );
      console.log("App.js Data rows after filtering:", dataRows.length);
      console.log("App.js Processed Data length:", processedData.length);
      console.log(
        "App.js Sample processed savings:",
        processedData.slice(0, 5)
      );
      console.log("App.js Total Savings Calculation:", totalSavingsAmount);
      setTotalSavings(totalSavingsAmount);
    } catch (err) {
      console.error("Error fetching total savings:", err);
    }
  };

  const loadVendorTargets = async () => {
    try {
      const sheetId = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
      const sheetName = "Sheet5";
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch vendor targets from Sheet5");
      }

      const csvText = await response.text();
      const rows = csvText.split("\n").map((row) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        let i = 0;

        while (i < row.length) {
          const char = row[i];
          if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            result.push(current.replace(/^"|"$/g, "").trim());
            current = "";
          } else {
            current += char;
          }
          i++;
        }
        result.push(current.replace(/^"|"$/g, "").trim());
        return result;
      });

      console.log("Sheet5 vendor targets rows:", rows.length);

      if (rows.length < 2) {
        console.warn(
          "Sheet5 is empty or has insufficient data, using defaults"
        );
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1).filter((row) => row.length > 0 && row[0]);

      // Find column indices
      const findColIndex = (searchTerms) => {
        const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
        for (const term of terms) {
          const idx = headers.findIndex((h) =>
            h.toLowerCase().includes(term.toLowerCase())
          );
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const nameCol = findColIndex(["name"]);
      const domesticCol = findColIndex(["domestic"]);
      const globalCol = findColIndex(["global"]);
      const totalCol = findColIndex(["total"]);

      console.log(
        "Sheet5 column indices - Name:",
        nameCol,
        "Domestic:",
        domesticCol,
        "Global:",
        globalCol,
        "Total:",
        totalCol
      );

      const updatedTargets = { ...vendorTargetsData };

      dataRows.forEach((row) => {
        const name = row[nameCol]?.toLowerCase().trim() || "";
        const domestic = domesticCol >= 0 ? parseInt(row[domesticCol] || "0") || 0 : 0;
        const global = globalCol >= 0 ? parseInt(row[globalCol] || "0") || 0 : 0;
        const total = totalCol >= 0 ? parseInt(row[totalCol] || "0") || (domestic + global) : (domestic + global);

        console.log(`Processing row: name="${name}", domestic=${domestic}, global=${global}, total=${total}`);

        if (name.includes("maninder")) {
          updatedTargets.maninder = { domestic, global, total };
          console.log("✓ Updated Maninder targets:", updatedTargets.maninder);
        } else if (name.includes("navneet")) {
          updatedTargets.navneet = { domestic, global, total };
          console.log("✓ Updated Navneet targets:", updatedTargets.navneet);
        } else if (name.includes("mukti")) {
          updatedTargets.mukti = { domestic, global, total };
          console.log("✓ Updated Mukti targets:", updatedTargets.mukti);
        }
      });

      console.log("Final updatedTargets:", updatedTargets);
      setVendorTargetsData(updatedTargets);
    } catch (err) {
      console.error("Error loading vendor targets from Sheet5:", err);
    }
  };

  const getMemberData = () => {
    const maninder = data.filter((item) => item.member === "Maninder");
    const navneet = data.filter((item) => item.member === "Navneet");
    const mukti = data.filter((item) => item.member === "Mukti");

    return {
      categories: [
        { name: "Maninder", value: maninder.length, color: "#3b82f6" },
        { name: "Navneet", value: navneet.length, color: "#8b5cf6" },
        { name: "Mukti", value: mukti.length, color: "#ec4899" },
      ],
      spend: [
        {
          name: "Maninder",
          value: maninder.reduce((sum, item) => sum + item.avgSpent, 0),
          color: "#3b82f6",
        },
        {
          name: "Navneet",
          value: navneet.reduce((sum, item) => sum + item.avgSpent, 0),
          color: "#8b5cf6",
        },
        {
          name: "Mukti",
          value: mukti.reduce((sum, item) => sum + item.avgSpent, 0),
          color: "#ec4899",
        },
      ],
    };
  };

  const getVendorTargetData = () => {
    const maninder = data.filter((item) => item.member === "Maninder");
    const navneet = data.filter((item) => item.member === "Navneet");
    const mukti = data.filter((item) => item.member === "Mukti");

    const maninderVendors = new Set();
    maninder.forEach((item) => {
      item.vendors.forEach((vendor) => maninderVendors.add(vendor));
    });

    const navneetVendors = new Set();
    navneet.forEach((item) => {
      item.vendors.forEach((vendor) => navneetVendors.add(vendor));
    });

    const muktiVendors = new Set();
    mukti.forEach((item) => {
      item.vendors.forEach((vendor) => muktiVendors.add(vendor));
    });

    const maninderTarget = vendorTargetsData.maninder.total;
    const navneetTarget = vendorTargetsData.navneet.total;
    const muktiTarget = vendorTargetsData.mukti.total;

    return {
      maninder: {
        target: maninderTarget,
        achieved: maninderVendors.size,
        domestic: vendorTargetsData.maninder.domestic,
        global: vendorTargetsData.maninder.global,
        data: [
          { name: "Achieved", value: maninderVendors.size, color: "#10b981" },
          {
            name: "Remaining",
            value: Math.max(0, maninderTarget - maninderVendors.size),
            color: "#e5e7eb",
          },
        ],
      },
      navneet: {
        target: navneetTarget,
        achieved: navneetVendors.size,
        domestic: vendorTargetsData.navneet.domestic,
        global: vendorTargetsData.navneet.global,
        data: [
          { name: "Achieved", value: navneetVendors.size, color: "#10b981" },
          {
            name: "Remaining",
            value: Math.max(0, navneetTarget - navneetVendors.size),
            color: "#e5e7eb",
          },
        ],
      },
      mukti: {
        target: muktiTarget,
        achieved: muktiVendors.size,
        domestic: vendorTargetsData.mukti.domestic,
        global: vendorTargetsData.mukti.global,
        data: [
          { name: "Achieved", value: muktiVendors.size, color: "#10b981" },
          {
            name: "Remaining",
            value: Math.max(0, muktiTarget - muktiVendors.size),
            color: "#e5e7eb",
          },
        ],
      },
    };
  };

  const getSavingsData = () => {
    const maninder = data.filter((item) => item.member === "Maninder");
    const navneet = data.filter((item) => item.member === "Navneet");
    const mukti = data.filter((item) => item.member === "Mukti");

    const maninderSavings = maninder.map((item) => {
      const avgSpentLakhs = item.avgSpent || 0;
      const targetValueLakhs = (avgSpentLakhs * item.targetSavings) / 100;
      const achievedValueLakhs = (avgSpentLakhs * item.cumulativeSavings) / 100;
      return {
        category: item.category,
        target: item.targetSavings,
        achieved: item.cumulativeSavings,
        targetValueLakhs: parseFloat(targetValueLakhs.toFixed(2)),
        achievedValueLakhs: parseFloat(achievedValueLakhs.toFixed(2)),
        vendors: item.vendors.length,
      };
    });

    const navneetSavings = navneet.map((item) => {
      const avgSpentLakhs = item.avgSpent || 0;
      const targetValueLakhs = (avgSpentLakhs * item.targetSavings) / 100;
      const achievedValueLakhs = (avgSpentLakhs * item.cumulativeSavings) / 100;
      return {
        category: item.category,
        target: item.targetSavings,
        achieved: item.cumulativeSavings,
        targetValueLakhs: parseFloat(targetValueLakhs.toFixed(2)),
        achievedValueLakhs: parseFloat(achievedValueLakhs.toFixed(2)),
        vendors: item.vendors.length,
      };
    });

    const muktiSavings = mukti.map((item) => {
      const avgSpentLakhs = item.avgSpent || 0;
      const targetValueLakhs = (avgSpentLakhs * item.targetSavings) / 100;
      const achievedValueLakhs = (avgSpentLakhs * item.cumulativeSavings) / 100;
      return {
        category: item.category,
        target: item.targetSavings,
        achieved: item.cumulativeSavings,
        targetValueLakhs: parseFloat(targetValueLakhs.toFixed(2)),
        achievedValueLakhs: parseFloat(achievedValueLakhs.toFixed(2)),
        vendors: item.vendors.length,
      };
    });

    return { maninderSavings, navneetSavings, muktiSavings };
  };

  const metrics = calculateMetrics();
  const memberData = getMemberData();
  const vendorTargets = getVendorTargetData();
  const savingsData = getSavingsData();

  // Custom label renderer for bar charts showing lakhs value
  const renderCustomizedLabel = (props) => {
    const { x, y, width, height, value, dataKey } = props;
    const payload = props.payload;

    if (!payload) return null;

    let displayValue = "";
    let percentValue = "";
    let labelColor = "#059669"; // green for achieved

    if (dataKey === "target") {
      displayValue = `₹${payload.targetValueLakhs || 0}L`;
      percentValue = `${payload.target}%`;
      labelColor = "#f59e0b"; // orange for target
    } else if (dataKey === "achieved") {
      displayValue = `₹${payload.achievedValueLakhs || 0}L`;
      percentValue = `${payload.achieved}%`;
      labelColor = "#059669"; // green for achieved
    }

    const labelY = y - 25;

    return (
      <g>
        {/* Background box for visibility */}
        <rect
          x={x + width / 2 - 35}
          y={labelY - 14}
          width="70"
          height="28"
          fill="white"
          stroke={labelColor}
          strokeWidth="1.5"
          rx="4"
          opacity="0.95"
        />
        {/* Lakhs value */}
        <text
          x={x + width / 2}
          y={labelY}
          fill={labelColor}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          dominantBaseline="middle"
        >
          {displayValue}
        </text>
        {/* Percentage value */}
        <text
          x={x + width / 2}
          y={labelY + 12}
          fill="#6b7280"
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          dominantBaseline="middle"
        >
          {percentValue}
        </text>
      </g>
    );
  };

  const showPersonProfile = (personName) => {
    setSelectedPerson(personName);
    setSelectedCategory(null);
    setCurrentView("profile");
  };

  const showCategoryVendors = (categoryName, personName) => {
    setSelectedPerson(personName);
    setSelectedCategory(categoryName);
    setCurrentView("vendors");
  };

  const backToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedPerson(null);
    setSelectedCategory(null);
  };

  const backToProfile = () => {
    setCurrentView("profile");
    setSelectedCategory(null);
  };

  // New navigation functions for metric cards
  const showCategoriesOverview = () => {
    setCurrentView("categories-overview");
  };

  const showSpendAnalysis = () => {
    setCurrentView("spend-analysis");
  };

  const showSavingsAnalysis = () => {
    setCurrentView("savings-analysis");
  };

  const showVendorsOverview = () => {
    setCurrentView("vendors-overview");
  };

  const showSavings = () => {
    setCurrentView("savings");
  };

  const showTotalSavings = () => {
    setCurrentView("total-savings");
  };

  // Categories Overview View
  if (currentView === "categories-overview") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={backToDashboard}
            className="flex items-center gap-2 bg-slate-800 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="mt-6 bg-white rounded-lg shadow-md p-8 border border-gray-200">
            <div className="flex items-center gap-6">
              <div className="bg-slate-100 p-4 rounded-lg">
                <Package className="w-12 h-12 text-slate-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Categories Overview
                </h1>
                <p className="text-slate-600 mt-2">
                  Complete breakdown of all procurement categories
                </p>
                <div className="flex gap-4 mt-4">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    {metrics.totalCategories} Categories
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    {data.length} Records
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Package className="w-8 h-8 text-green-600" />
            All Procurement Categories
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((item, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 p-6 cursor-pointer"
                onClick={() => showCategoryVendors(item.category, item.member)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-gray-800">
                    {item.category}
                  </h4>
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                    #{item.srNo}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-700 font-medium text-sm">
                      Member
                    </span>
                    <span className="font-bold text-blue-800">
                      {item.member}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-green-50 rounded-lg">
                    <span className="text-green-700 font-medium text-sm">
                      Spend Value
                    </span>
                    <span className="font-bold text-green-800">
                      {formatCurrency(item.avgSpent)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-purple-50 rounded-lg">
                    <span className="text-purple-700 font-medium text-sm">
                      Vendors
                    </span>
                    <span className="font-bold text-purple-800">
                      {item.vendors.length}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-amber-50 rounded-lg">
                    <span className="text-amber-700 font-medium text-sm">
                      Target Savings
                    </span>
                    <span className="font-bold text-amber-800">
                      {item.targetSavings}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-center text-sm text-gray-600 hover:text-blue-600">
                  Click to view category details →
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Spend Analysis View
  if (currentView === "spend-analysis") {
    const maninderSpend = data
      .filter((item) => item.member === "Maninder")
      .reduce((sum, item) => sum + item.avgSpent, 0);
    const navneetSpend = data
      .filter((item) => item.member === "Navneet")
      .reduce((sum, item) => sum + item.avgSpent, 0);
    const muktiSpend = data
      .filter((item) => item.member === "Mukti")
      .reduce((sum, item) => sum + item.avgSpent, 0);

    const spendByCategory = data
      .map((item) => ({
        category: item.category,
        member: item.member,
        spend: item.avgSpent,
      }))
      .sort((a, b) => b.spend - a.spend);

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={backToDashboard}
            className="flex items-center gap-2 bg-slate-800 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="mt-6 bg-white rounded-lg shadow-md p-8 border border-gray-200">
            <div className="flex items-center gap-6">
              <div className="bg-green-100 p-4 rounded-lg">
                <TrendingUp className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Spending Analysis
                </h1>
                <p className="text-slate-600 mt-2">
                  Detailed spending breakdown across all categories
                </p>
                <div className="flex gap-4 mt-4">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    Total: {formatCurrency(metrics.totalAvgSpend)}
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    {data.length} Categories
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spending Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Member-wise Spend */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Spend by Team Member
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Maninder",
                      value: maninderSpend,
                      color: "#3b82f6",
                    },
                    { name: "Navneet", value: navneetSpend, color: "#8b5cf6" },
                    { name: "Mukti", value: muktiSpend, color: "#ec4899" },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#8b5cf6" />
                  <Cell fill="#ec4899" />
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(value), "Spend Value"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Aggregated Spend Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Spend Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  fontSize={11}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), "Spend Value"]}
                  labelFormatter={(label) => `Category: ${label}`}
                />
                <Bar dataKey="spend" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category-wise Spend Table */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Detailed Category Spending
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spend Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Savings Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Achieved Savings
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {spendByCategory.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.member}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(item.spend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.find((d) => d.category === item.category)
                        ?.targetSavings || 0}
                      %
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {data.find((d) => d.category === item.category)
                        ?.cumulativeSavings || 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Savings Analysis View
  if (currentView === "savings-analysis") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={backToDashboard}
            className="flex items-center gap-2 bg-slate-800 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="mt-6 bg-white rounded-lg shadow-md p-8 border border-gray-200">
            <div className="flex items-center gap-6">
              <div className="bg-blue-100 p-4 rounded-lg">
                <Target className="w-12 h-12 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Savings Analysis
                </h1>
                <p className="text-slate-600 mt-2">
                  Comprehensive savings performance and targets
                </p>
                <div className="flex gap-4 mt-4">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    {data.length} Categories
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    Target vs Achieved
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Charts - Same as dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Maninder - Savings by Category
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={savingsData.maninderSavings}
                margin={{ top: 60, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  fontSize={11}
                />
                <YAxis
                  label={{
                    value: "Savings %",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="font-semibold text-gray-800 mb-2">
                            {label}
                          </p>
                          {payload.map((entry, index) => (
                            <div key={index} className="text-sm mb-1">
                              <p
                                style={{ color: entry.color }}
                                className="font-medium"
                              >
                                {entry.dataKey === "target"
                                  ? "Target"
                                  : "Achieved"}
                                : {entry.value}%
                              </p>
                              <p
                                style={{ color: entry.color }}
                                className="text-xs"
                              >
                                {entry.dataKey === "target"
                                  ? `₹${data.targetValueLakhs}L`
                                  : `₹${data.achievedValueLakhs}L`}
                              </p>
                            </div>
                          ))}
                          <p className="text-sm text-blue-600 mt-2 pt-2 border-t border-gray-200 font-medium">
                            Vendors Added: {data.vendors}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="target"
                  fill="#f59e0b"
                  name="Target %"
                  cursor="pointer"
                  label={renderCustomizedLabel}
                  onClick={(data, index) => {
                    const categoryData = savingsData.maninderSavings[index];
                    if (categoryData && categoryData.category) {
                      showCategoryVendors(categoryData.category, "Maninder");
                    }
                  }}
                />
                <Bar
                  dataKey="achieved"
                  fill="#10b981"
                  name="Achieved %"
                  cursor="pointer"
                  label={renderCustomizedLabel}
                  onClick={(data, index) => {
                    const categoryData = savingsData.maninderSavings[index];
                    if (categoryData && categoryData.category) {
                      showCategoryVendors(categoryData.category, "Maninder");
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Navneet - Savings by Category
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={savingsData.navneetSavings}
                margin={{ top: 60, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  fontSize={11}
                />
                <YAxis
                  label={{
                    value: "Savings %",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="font-semibold text-gray-800 mb-2">
                            {label}
                          </p>
                          {payload.map((entry, index) => (
                            <div key={index} className="text-sm mb-1">
                              <p
                                style={{ color: entry.color }}
                                className="font-medium"
                              >
                                {entry.dataKey === "target"
                                  ? "Target"
                                  : "Achieved"}
                                : {entry.value}%
                              </p>
                              <p
                                style={{ color: entry.color }}
                                className="text-xs"
                              >
                                {entry.dataKey === "target"
                                  ? `₹${data.targetValueLakhs}L`
                                  : `₹${data.achievedValueLakhs}L`}
                              </p>
                            </div>
                          ))}
                          <p className="text-sm text-blue-600 mt-2 pt-2 border-t border-gray-200 font-medium">
                            Vendors Added: {data.vendors}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="target"
                  fill="#f59e0b"
                  name="Target %"
                  cursor="pointer"
                  label={renderCustomizedLabel}
                  onClick={(data, index) => {
                    const categoryData = savingsData.navneetSavings[index];
                    if (categoryData && categoryData.category) {
                      showCategoryVendors(categoryData.category, "Navneet");
                    }
                  }}
                />
                <Bar
                  dataKey="achieved"
                  fill="#10b981"
                  name="Achieved %"
                  cursor="pointer"
                  label={renderCustomizedLabel}
                  onClick={(data, index) => {
                    const categoryData = savingsData.navneetSavings[index];
                    if (categoryData && categoryData.category) {
                      showCategoryVendors(categoryData.category, "Navneet");
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Vendors Overview View
  if (currentView === "vendors-overview") {
    // Create a map to track vendors and their category assignments (unique by vendor name)
    const vendorMap = new Map();

    data.forEach((item) => {
      item.vendors.forEach((vendor) => {
        const key = vendor.trim(); // Use vendor name as unique key
        if (vendorMap.has(key)) {
          const vendorData = vendorMap.get(key);
          if (!vendorData.categories.includes(item.category)) {
            vendorData.categories.push(item.category);
          }
        } else {
          vendorMap.set(key, {
            name: vendor.trim(),
            member: item.member,
            count: 1, // Number of category assignments this vendor has
            categories: [item.category],
          });
        }
      });
    });

    // Update count after collecting all assignments (actual usage count)
    vendorMap.forEach((vendorData) => {
      vendorData.count = vendorData.categories.length;
    });

    // Convert map to array for display
    const allVendors = Array.from(vendorMap.values());

    const filteredVendors = allVendors.filter((vendor) => {
      const matchesMember = !filterMember || vendor.member === filterMember;
      const matchesCategory =
        !filterCategory || vendor.categories.includes(filterCategory);
      return matchesMember && matchesCategory;
    });

    const vendorStats = {
      maninderVendors: allVendors.filter((v) => v.member === "Maninder").length,
      navneetVendors: allVendors.filter((v) => v.member === "Navneet").length,
      muktiVendors: allVendors.filter((v) => v.member === "Mukti").length,
      uniqueVendors: allVendors.length,
    };

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={backToDashboard}
            className="flex items-center gap-2 bg-slate-800 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="mt-6 bg-white rounded-lg shadow-md p-8 border border-gray-200">
            <div className="flex items-center gap-6">
              <div className="bg-purple-100 p-4 rounded-lg">
                <Users className="w-12 h-12 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Vendors Overview
                </h1>
                <p className="text-slate-600 mt-2">
                  Complete vendor network and distribution
                </p>
                <div className="flex gap-4 mt-4">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    {vendorStats.uniqueVendors} Vendor Entries
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    {allVendors.reduce((sum, v) => sum + v.count, 0)} Category
                    Assignments
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-10 h-10 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">
                {vendorStats.maninderVendors}
              </span>
            </div>
            <p className="text-slate-600 text-sm font-medium mb-1">
              Maninder's Vendors
            </p>
            <p className="text-slate-500 text-sm">Active supplier vendors</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">
                {vendorStats.navneetVendors}
              </span>
            </div>
            <p className="text-slate-600 text-sm font-medium mb-1">
              Navneet's Vendors
            </p>
            <p className="text-slate-500 text-sm">Active supplier vendors</p>
          </div>
        </div>

        {/* Vendor Distribution Table */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Vendor Distribution
          </h2>

          {/* Filters */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Filter by Member:
                </label>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFilterMember(e.target.value)}
                  defaultValue=""
                >
                  <option value="">All Members</option>
                  <option value="Maninder">Maninder</option>
                  <option value="Navneet">Navneet</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Filter by Category:
                </label>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFilterCategory(e.target.value)}
                  defaultValue=""
                >
                  <option value="">All Categories</option>
                  {Array.from(
                    new Set(allVendors.flatMap((v) => v.categories))
                  ).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filters display */}
            {(filterMember || filterCategory) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 border-t border-gray-200 pt-3">
                <span className="font-medium">Active Filters:</span>
                {filterMember && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    Member: {filterMember}
                  </span>
                )}
                {filterCategory && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    Category: {filterCategory}
                  </span>
                )}
                <span className="text-gray-500">
                  ({filteredVendors.length} results)
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categories
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVendors.map((vendor, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vendor.member}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vendor.count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {vendor.categories.map((cat, catIndex) => (
                          <span
                            key={catIndex}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredVendors.length === 0 && (filterMember || filterCategory) && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No vendors found matching the selected filters.
              </p>
              <button
                onClick={() => {
                  setFilterMember("");
                  setFilterCategory("");
                  const selectMember =
                    document.querySelector("select:first-child");
                  const selectCategory =
                    document.querySelector("select:last-child");
                  if (selectMember) selectMember.value = "";
                  if (selectCategory) selectCategory.value = "";
                }}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Savings View
  if (currentView === "savings") {
    return <Savings />;
  }

  // Total Savings View
  if (currentView === "total-savings") {
    return <TotalSavingsPage />;
  }

  // Vendors View for selected category
  if (currentView === "vendors" && selectedCategory && selectedPerson) {
    const categoryData = data.find(
      (item) =>
        item.member === selectedPerson && item.category === selectedCategory
    );

    if (!categoryData) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg">Category or person not found</p>
            <button
              onClick={backToProfile}
              className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Profile
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={backToProfile}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to {selectedPerson} Profile
          </button>

          <div className="mt-6 bg-white rounded-2xl shadow-xl p-8 border border-indigo-100">
            <div className="flex items-center gap-6">
              <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4 rounded-full shadow-lg">
                <Users className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                  {selectedCategory} Vendors
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Complete vendor list for {selectedPerson}'s {selectedCategory}{" "}
                  category
                </p>
                <div className="flex gap-4 mt-4">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {categoryData.vendors.length} Vendors
                  </span>
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium">
                    Target: {categoryData.targetSavings}% Savings
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <Package className="w-10 h-10 text-blue-600 mb-3" />
            <p className="text-blue-600 text-sm font-medium mb-1">Part Codes</p>
            <p className="text-3xl font-bold text-gray-800">
              {categoryData.noOfPartCodes.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <TrendingUp className="w-10 h-10 text-green-600 mb-3" />
            <p className="text-green-600 text-sm font-medium mb-1">
              Annual Spend
            </p>
            <p className="text-3xl font-bold text-gray-800">
              {formatCurrency(categoryData.avgSpent)}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <Target className="w-10 h-10 text-amber-600 mb-3" />
            <p className="text-amber-600 text-sm font-medium mb-1">
              Target Savings
            </p>
            <p className="text-3xl font-bold text-gray-800">
              {categoryData.targetSavings}%
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <Package className="w-10 h-10 text-purple-600 mb-3" />
            <p className="text-purple-600 text-sm font-medium mb-1">
              Achieved Savings
            </p>
            <p className="text-3xl font-bold text-gray-800">
              {categoryData.cumulativeSavings}%
            </p>
          </div>
        </div>

        {/* All Vendors List */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
            <Users className="w-10 h-10 text-green-600" />
            All Vendors for {selectedCategory}
          </h2>

          {categoryData.vendors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                No vendors found for this category
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categoryData.vendors.map((vendor, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-white via-gray-50 to-green-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 group"
                >
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-full shadow-lg inline-block mb-4">
                      <span className="text-white font-bold text-lg">
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-gray-800 mb-2 leading-tight">
                      {vendor}
                    </h3>

                    <p className="text-gray-600 text-sm mb-3">
                      Vendor #{index + 1}
                    </p>

                    <div className="flex items-center justify-center gap-2">
                      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                        Active Supplier
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-700 text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 max-w-md">
          <div className="text-red-600 text-center mb-4">
            <p className="text-xl font-semibold mb-2">Error Loading Data</p>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="w-full bg-slate-800 text-white py-2 px-4 rounded hover:bg-slate-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Profile View
  if (currentView === "profile" && selectedPerson) {
    const personData = data.filter((item) => item.member === selectedPerson);
    const personMetrics = {
      totalCategories: personData.length,
      avgSpend: personData.reduce((sum, item) => sum + item.avgSpent, 0),
      uniqueVendors: new Set(),
      totalTargetSavings: personData.reduce(
        (sum, item) => sum + item.targetSavings,
        0
      ),
      totalAchievedSavings: personData.reduce(
        (sum, item) => sum + item.cumulativeSavings,
        0
      ),
    };

    personData.forEach((item) => {
      item.vendors.forEach((vendor) => personMetrics.uniqueVendors.add(vendor));
    });
    personMetrics.uniqueVendors = personMetrics.uniqueVendors.size;

    const avgTargetSavings =
      personMetrics.totalCategories > 0
        ? personMetrics.totalTargetSavings / personMetrics.totalCategories
        : 0;
    const avgAchievedSavings =
      personMetrics.totalCategories > 0
        ? personMetrics.totalAchievedSavings / personMetrics.totalCategories
        : 0;

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header with Enhanced Design */}
        <div className="mb-8">
          <button
            onClick={backToDashboard}
            className="flex items-center gap-2 bg-slate-800 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="mt-6 bg-white rounded-lg shadow-md p-8 border border-gray-200">
            <div className="flex items-center gap-6">
              <div className="bg-slate-100 p-4 rounded-lg">
                <User className="w-12 h-12 text-slate-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {selectedPerson} Profile
                </h1>
                <p className="text-slate-600 mt-2">
                  Procurement Team Member Performance Overview
                </p>
                <div className="flex gap-4 mt-4">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    {personMetrics.totalCategories} Categories
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                    {personMetrics.uniqueVendors} Vendors
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Package className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium mb-1">
              Categories Managed
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {personMetrics.totalCategories}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Active responsibilities
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium mb-1">
              Total Spend Value
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(personMetrics.avgSpend)}
            </p>
            <p className="text-slate-500 text-sm mt-1">Annual procurement</p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium mb-1">
              Avg Target Savings
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {avgTargetSavings.toFixed(1)}%
            </p>
            <p className="text-slate-500 text-sm mt-1">Efficiency target</p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium mb-1">
              Vendor Network
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {personMetrics.uniqueVendors}
            </p>
            <p className="text-slate-500 text-sm mt-1">Suppliers onboarded</p>
          </div>
        </div>

        {/* Detailed Categories Grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Package className="w-8 h-8 text-green-600" />
            Handled Categories Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {personData.map((item, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 p-6 cursor-pointer"
                onClick={() =>
                  showCategoryVendors(item.category, selectedPerson)
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-gray-800">
                    {item.category}
                  </h4>
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                    #{item.srNo}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-700 font-medium text-sm">
                      Part Codes
                    </span>
                    <span className="font-bold text-blue-800">
                      {item.noOfPartCodes.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-green-50 rounded-lg">
                    <span className="text-green-700 font-medium text-sm">
                      Annual Spend
                    </span>
                    <span className="font-bold text-green-800">
                      {formatCurrency(item.avgSpent)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-amber-50 rounded-lg">
                    <span className="text-amber-700 font-medium text-sm">
                      Target Savings
                    </span>
                    <span className="font-bold text-amber-800">
                      {item.targetSavings}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-3 bg-emerald-50 rounded-lg">
                    <span className="text-emerald-700 font-medium text-sm">
                      Achieved Savings
                    </span>
                    <span className="font-bold text-emerald-800">
                      {item.cumulativeSavings}%
                    </span>
                  </div>
                </div>

                {item.vendors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Associated Vendors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.vendors.slice(0, 4).map((vendor, vIndex) => (
                        <span
                          key={vIndex}
                          className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm"
                        >
                          {vendor}
                        </span>
                      ))}
                      {item.vendors.length > 4 && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full font-medium">
                          +{item.vendors.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div className="animate-fade-in">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Gaurav Maheshwari's Dashboard
          </h1>
        </div>
        <button
          onClick={loadData}
          disabled={isRefreshing}
          className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl font-medium"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          <RefreshCw
            className={`w-5 h-5 mr-2 inline ${
              isRefreshing ? "animate-spin" : ""
            }`}
          />
          Refresh Data
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <div
          className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border border-white/50 p-6 cursor-pointer transform hover:scale-105 transition-all duration-500 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50 hover:border-emerald-200 animate-slide-in-left stagger-1 professional-card"
          onClick={showCategoriesOverview}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <ArrowLeft className="w-5 h-5 text-emerald-400 rotate-180 opacity-60 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
            </div>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
              Total Categories
            </p>
            <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              {metrics.totalCategories}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Active procurement categories
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>
        </div>

        <div
          className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border border-white/50 p-6 cursor-pointer transform hover:scale-105 transition-all duration-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-200 animate-slide-in-left stagger-2 professional-card"
          onClick={showSpendAnalysis}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <ArrowLeft className="w-5 h-5 text-blue-400 rotate-180 opacity-60 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
            </div>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
              Average Annual Spend
            </p>
            <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              {formatCurrency(metrics.totalAvgSpend)}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Total annual procurement spend
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>
        </div>

        <div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 cursor-pointer transform hover:scale-105 transition-all duration-500 hover:bg-gradient-to-br hover:from-purple-50 hover:to-violet-50 hover:border-purple-200"
          onClick={showTotalSavings}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <ArrowLeft className="w-5 h-5 text-purple-400 rotate-180 opacity-60 group-hover:opacity-100 transition-all duration-300 transform hover:translate-x-1" />
            </div>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
              Total Savings
            </p>
            <p className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              {formatCurrency(metrics.totalSavings)}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Click to view detailed savings →
            </p>
          </div>
        </div>

        <div
          className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border border-white/50 p-6 cursor-pointer transform hover:scale-105 transition-all duration-500 hover:bg-gradient-to-br hover:from-orange-50 hover:to-red-50 hover:border-orange-200 animate-slide-in-right stagger-4 professional-card"
          onClick={showVendorsOverview}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <ArrowLeft className="w-5 h-5 text-orange-400 rotate-180 opacity-60 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
            </div>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
              New Vendors
            </p>
            <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              {metrics.totalNewVendors}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Active supplier vendors
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </div>
        </div>
      </div>

      {/* Member Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-600" />
            Categories per Member
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={memberData.categories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                cursor="pointer"
                onClick={(data, index) => {
                  if (data && data.name) {
                    showPersonProfile(data.name);
                  }
                }}
              >
                {memberData.categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, props) => [
                  `${value} categories`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontWeight: "500",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-slate-600 text-sm mt-4">
            Click on any segment to view member profile →
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            Average Annual Spend per Member
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={memberData.spend}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(
                    0
                  )}%)`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                cursor="pointer"
                onClick={(data, index) => {
                  if (data && data.name) {
                    showPersonProfile(data.name);
                  }
                }}
              >
                {memberData.spend.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatCurrency(value), "Spend Value"]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontWeight: "500",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-slate-600 text-sm mt-4">
            Click on any segment to view member profile →
          </p>
        </div>
      </div>

      {/* Target vs Achieved Section */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
            <Target className="w-8 h-8 text-emerald-600" />
            Vendor Target vs Achievement
          </h2>
          <p className="text-slate-600 text-lg">
            Performance tracking and goal progress
          </p>
        </div>

        {/* Target Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Maninder Card */}
          <div
            onClick={() => showPersonProfile("Maninder")}
            className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 rounded-2xl shadow-xl hover:shadow-2xl border border-indigo-200 p-8 cursor-pointer transform hover:scale-105 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-900 to-blue-900 bg-clip-text text-transparent">
                    Maninder
                  </h3>
                  <p className="text-indigo-600 text-sm font-medium">
                     Vendor Network
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center shadow-sm border border-white/50">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                    <p className="text-indigo-700 text-sm font-semibold uppercase tracking-wide">
                      Total Target
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-indigo-900 mb-2">
                    {vendorTargets.maninder.target}
                  </p>
                  <p className="text-indigo-600 text-xs font-medium">
                    {vendorTargets.maninder.domestic}D +{" "}
                    {vendorTargets.maninder.global}G
                  </p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center shadow-sm border border-white/50">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                    <p className="text-emerald-700 text-sm font-semibold uppercase tracking-wide">
                      Achieved
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-emerald-900 mb-2">
                    {vendorTargets.maninder.achieved}
                  </p>
                  <p className="text-emerald-600 text-xs font-medium">
                    {(
                      (vendorTargets.maninder.achieved /
                        vendorTargets.maninder.target) *
                      100
                    ).toFixed(1)}
                    % Completed
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full text-indigo-600 text-sm font-medium border border-white/50">
                  <span>View Detailed Profile</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Navneet Card */}
          <div
            onClick={() => showPersonProfile("Navneet")}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 rounded-2xl shadow-xl hover:shadow-2xl border border-purple-200 p-8 cursor-pointer transform hover:scale-105 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-900 to-pink-900 bg-clip-text text-transparent">
                    Navneet
                  </h3>
                  <p className="text-purple-600 text-sm font-medium">
                     Vendor Network
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center shadow-sm border border-white/50">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <p className="text-purple-700 text-sm font-semibold uppercase tracking-wide">
                      Total Target
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-purple-900 mb-2">
                    {vendorTargets.navneet.total || (vendorTargets.navneet.domestic + vendorTargets.navneet.global)}
                  </p>
                  <p className="text-purple-600 text-xs font-medium">
                    {vendorTargets.navneet.domestic}D + {vendorTargets.navneet.global}G
                  </p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center shadow-sm border border-white/50">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                    <p className="text-emerald-700 text-sm font-semibold uppercase tracking-wide">
                      Achieved
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-emerald-900 mb-2">
                    {vendorTargets.navneet.achieved}
                  </p>
                  <p className="text-emerald-600 text-xs font-medium">
                    {(((vendorTargets.navneet.achieved) / (vendorTargets.navneet.total || (vendorTargets.navneet.domestic + vendorTargets.navneet.global))) * 100).toFixed(1)}
                    % Completed
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full text-purple-600 text-sm font-medium border border-white/50">
                  <span>View Detailed Profile</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Mukti Card */}
          <div
            onClick={() => showPersonProfile("Mukti")}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 rounded-2xl shadow-xl hover:shadow-2xl border border-emerald-200 p-8 cursor-pointer transform hover:scale-105 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-900 to-teal-900 bg-clip-text text-transparent">
                    Mukti
                  </h3>
                  <p className="text-emerald-600 text-sm font-medium">
                     Vendor Network
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center shadow-sm border border-white/50">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                    <p className="text-emerald-700 text-sm font-semibold uppercase tracking-wide">
                      Total Target
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-emerald-900 mb-2">
                    {vendorTargets.mukti.total || (vendorTargets.mukti.domestic + vendorTargets.mukti.global)}
                  </p>
                  <p className="text-emerald-600 text-xs font-medium">
                    {vendorTargets.mukti.domestic}D + {vendorTargets.mukti.global}G
                  </p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center shadow-sm border border-white/50">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <p className="text-green-700 text-sm font-semibold uppercase tracking-wide">
                      Achieved
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-green-900 mb-2">
                    {vendorTargets.mukti.achieved}
                  </p>
                  <p className="text-green-600 text-xs font-medium">
                    {(((vendorTargets.mukti.achieved) / (vendorTargets.mukti.total || (vendorTargets.mukti.domestic + vendorTargets.mukti.global))) * 100).toFixed(1)}
                    % Completed
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full text-emerald-600 text-sm font-medium border border-white/50">
                  <span>View Detailed Profile</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Savings Target vs Achieved */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-900 to-orange-900 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
            <Target className="w-8 h-8 text-amber-600" />
            Savings Analysis by Category
          </h2>
          <p className="text-slate-600 text-lg">
            Target vs Achieved Savings Performance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Maninder Savings Chart */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl shadow-xl hover:shadow-2xl border border-amber-200 p-8 transform hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-900 to-orange-900 bg-clip-text text-transparent">
                    Maninder
                  </h3>
                  <p className="text-amber-600 text-sm font-medium">
                    Savings Performance by Category
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={savingsData.maninderSavings}
                  margin={{ top: 60, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="url(#gridGradientManinder)"
                    strokeOpacity={0.4}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="category"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    fontSize={10}
                    stroke="url(#axisGradientManinder)"
                    fontWeight="600"
                    tick={{ fill: "#92400e" }}
                    axisLine={{ stroke: "#f59e0b", strokeWidth: 2 }}
                  />
                  <YAxis
                    label={{
                      value: "Savings %",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        textAnchor: "middle",
                        fill: "#92400e",
                        fontWeight: "700",
                        fontSize: "12px",
                      },
                    }}
                    stroke="url(#axisGradientManinder)"
                    fontWeight="600"
                    tick={{ fill: "#92400e" }}
                    axisLine={{ stroke: "#f59e0b", strokeWidth: 2 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(245, 158, 11, 0.1)" }}
                    contentStyle={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251, 191, 36, 0.05) 100%)",
                      border: "2px solid #f59e0b",
                      borderRadius: "16px",
                      backdropFilter: "blur(20px)",
                      boxShadow:
                        "0 20px 40px rgba(245, 158, 11, 0.15), 0 0 20px rgba(245, 158, 11, 0.1)",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                    labelStyle={{
                      color: "#92400e",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6 rounded-xl border-2 border-amber-300 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"></div>
                              <p className="font-bold text-amber-900 text-xl">
                                {label}
                              </p>
                            </div>
                            <div className="space-y-3">
                              {payload.map((entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3"
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full ${
                                      entry.dataKey === "target"
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                        : "bg-gradient-to-r from-emerald-500 to-green-500"
                                    }`}
                                  ></div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700">
                                      {entry.dataKey === "target"
                                        ? "Target Savings"
                                        : "Achieved Savings"}
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                      {entry.value}%
                                    </p>
                                    <p
                                      className="text-sm font-semibold"
                                      style={{ color: entry.color }}
                                    >
                                      {entry.dataKey === "target"
                                        ? `₹${data.targetValueLakhs}L`
                                        : `₹${data.achievedValueLakhs}L`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-amber-300">
                              <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Vendors Added:{" "}
                                <span className="font-bold">
                                  {data.vendors}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontWeight: "600",
                      fontSize: "12px",
                    }}
                    iconType="rect"
                  />
                  <Bar
                    dataKey="target"
                    fill="url(#targetGradientManinder)"
                    name="Target Savings %"
                    cursor="pointer"
                    radius={[6, 6, 0, 0]}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    label={renderCustomizedLabel}
                    onClick={(data, index) => {
                      const categoryData = savingsData.maninderSavings[index];
                      if (categoryData && categoryData.category) {
                        showCategoryVendors(categoryData.category, "Maninder");
                      }
                    }}
                  />
                  <Bar
                    dataKey="achieved"
                    fill="url(#achievedGradientManinder)"
                    name="Achieved Savings %"
                    cursor="pointer"
                    radius={[6, 6, 0, 0]}
                    animationBegin={500}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    label={renderCustomizedLabel}
                    onClick={(data, index) => {
                      const categoryData = savingsData.maninderSavings[index];
                      if (categoryData && categoryData.category) {
                        showCategoryVendors(categoryData.category, "Maninder");
                      }
                    }}
                  />

                  <defs>
                    <linearGradient
                      id="gridGradientManinder"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop
                        offset="100%"
                        stopColor="#f59e0b"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="axisGradientManinder"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#92400e" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient
                      id="targetGradientManinder"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                      <stop
                        offset="25%"
                        stopColor="#f59e0b"
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="50%"
                        stopColor="#d97706"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="#92400e"
                        stopOpacity={0.85}
                      />
                    </linearGradient>
                    <linearGradient
                      id="achievedGradientManinder"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop
                        offset="25%"
                        stopColor="#10b981"
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="50%"
                        stopColor="#059669"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="#047857"
                        stopOpacity={0.85}
                      />
                    </linearGradient>
                    <filter id="glowManinder">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Navneet Savings Chart */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 rounded-2xl shadow-xl hover:shadow-2xl border border-rose-200 p-8 transform hover:scale-105 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-rose-900 to-pink-900 bg-clip-text text-transparent">
                    Navneet
                  </h3>
                  <p className="text-rose-600 text-sm font-medium">
                    Savings Performance by Category
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={savingsData.navneetSavings}
                  margin={{ top: 60, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="url(#gridGradientNavneet)"
                    strokeOpacity={0.4}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="category"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    fontSize={10}
                    stroke="url(#axisGradientNavneet)"
                    fontWeight="600"
                    tick={{ fill: "#be185d" }}
                    axisLine={{ stroke: "#ec4899", strokeWidth: 2 }}
                  />
                  <YAxis
                    label={{
                      value: "Savings %",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        textAnchor: "middle",
                        fill: "#be185d",
                        fontWeight: "700",
                        fontSize: "12px",
                      },
                    }}
                    stroke="url(#axisGradientNavneet)"
                    fontWeight="600"
                    tick={{ fill: "#be185d" }}
                    axisLine={{ stroke: "#ec4899", strokeWidth: 2 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(236, 72, 153, 0.1)" }}
                    contentStyle={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(236, 72, 153, 0.05) 100%)",
                      border: "2px solid #ec4899",
                      borderRadius: "16px",
                      backdropFilter: "blur(20px)",
                      boxShadow:
                        "0 20px 40px rgba(236, 72, 153, 0.15), 0 0 20px rgba(236, 72, 153, 0.1)",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                    labelStyle={{
                      color: "#be185d",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 p-6 rounded-xl border-2 border-rose-300 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500"></div>
                              <p className="font-bold text-rose-900 text-xl">
                                {label}
                              </p>
                            </div>
                            <div className="space-y-3">
                              {payload.map((entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3"
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full ${
                                      entry.dataKey === "target"
                                        ? "bg-gradient-to-r from-rose-500 to-pink-500"
                                        : "bg-gradient-to-r from-emerald-500 to-green-500"
                                    }`}
                                  ></div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700">
                                      {entry.dataKey === "target"
                                        ? "Target Savings"
                                        : "Achieved Savings"}
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                      {entry.value}%
                                    </p>
                                    <p
                                      className="text-sm font-semibold"
                                      style={{ color: entry.color }}
                                    >
                                      {entry.dataKey === "target"
                                        ? `₹${data.targetValueLakhs}L`
                                        : `₹${data.achievedValueLakhs}L`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-rose-300">
                              <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Vendors Added:{" "}
                                <span className="font-bold">
                                  {data.vendors}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontWeight: "600",
                      fontSize: "12px",
                    }}
                    iconType="rect"
                  />
                  <Bar
                    dataKey="target"
                    fill="url(#targetGradientNavneet)"
                    name="Target Savings %"
                    cursor="pointer"
                    radius={[6, 6, 0, 0]}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    label={renderCustomizedLabel}
                    onClick={(data, index) => {
                      const categoryData = savingsData.navneetSavings[index];
                      if (categoryData && categoryData.category) {
                        showCategoryVendors(categoryData.category, "Navneet");
                      }
                    }}
                  />
                  <Bar
                    dataKey="achieved"
                    fill="url(#achievedGradientNavneet)"
                    name="Achieved Savings %"
                    cursor="pointer"
                    radius={[6, 6, 0, 0]}
                    animationBegin={500}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    label={renderCustomizedLabel}
                    onClick={(data, index) => {
                      const categoryData = savingsData.navneetSavings[index];
                      if (categoryData && categoryData.category) {
                        showCategoryVendors(categoryData.category, "Navneet");
                      }
                    }}
                  />

                  <defs>
                    <linearGradient
                      id="gridGradientNavneet"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop
                        offset="100%"
                        stopColor="#ec4899"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="axisGradientNavneet"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#be185d" />
                      <stop offset="100%" stopColor="#db2777" />
                    </linearGradient>
                    <linearGradient
                      id="targetGradientNavneet"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#fdba74" stopOpacity={1} />
                      <stop
                        offset="25%"
                        stopColor="#f97316"
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="50%"
                        stopColor="#ea580c"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="#c2410c"
                        stopOpacity={0.85}
                      />
                    </linearGradient>
                    <linearGradient
                      id="achievedGradientNavneet"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop
                        offset="25%"
                        stopColor="#10b981"
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="50%"
                        stopColor="#059669"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="#047857"
                        stopOpacity={0.85}
                      />
                    </linearGradient>
                    <filter id="glowNavneet">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GauravDashboard;
