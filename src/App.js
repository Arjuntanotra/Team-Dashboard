import React, { useState, useEffect } from "react";
import {
  Users,
  ArrowLeft,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Home,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function TeamDashboard() {
  const [excelData, setExcelData] = useState(null);
  const [currentView, setCurrentView] = useState("loading");
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Google Sheet Configuration
  const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
  const SHEET_NAME = "Sheet1";

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#84cc16', '#f97316', '#14b8a6'];

  useEffect(() => {
    loadExcelData();
    const interval = setInterval(() => {
      loadExcelData();
    }, 500000);
    return () => clearInterval(interval);
  }, []);

  const loadExcelData = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch Google Sheet. Make sure the sheet is published or publicly accessible.");
      }

      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error("Google Sheet is empty. Please add data to your sheet.");
      }

      setExcelData(jsonData);
      setLastUpdated(new Date());
      setCurrentView("dashboard");
      setSelectedManager(null);
      setSelectedMember(null);
      setSelectedProject(null);
      setError(null);
    } catch (err) {
      console.error("Error loading Google Sheet data:", err);
      setError(err.message);
      setCurrentView("error");
    }

    setIsRefreshing(false);
  };

  const formatExcelDate = (excelDate) => {
    if (!excelDate || excelDate === "N/A" || excelDate === "-") return excelDate;
    if (typeof excelDate === "string" && excelDate.includes("/")) return excelDate;
    if (typeof excelDate === "string" && excelDate.includes("-") && excelDate.length > 5) return excelDate;

    try {
      if (typeof excelDate === "number" || !isNaN(parseFloat(excelDate))) {
        const serialNumber = typeof excelDate === "number" ? excelDate : parseFloat(excelDate);
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + serialNumber * 86400000);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      return excelDate;
    } catch {
      return excelDate;
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

  const getAllManagers = () => {
    if (!excelData) return [];
    const managersMap = {};
    
    excelData.forEach((row) => {
      const manager = row.Manager || row.ManagerName;
      const managerRole = row.ManagerRole || "Manager";
      
      if (manager && !managersMap[manager]) {
        managersMap[manager] = {
          name: manager,
          role: managerRole,
          teamMembers: new Set(),
          totalTasks: 0,
          completedTasks: 0,
          projects: new Set(),
        };
      }
      
      if (manager) {
        const member = row.TeamMember || row.Member || row.Name;
        const project = row.Project || row.ProjectName;
        
        if (member) {
          managersMap[manager].teamMembers.add(member);
          managersMap[manager].totalTasks++;
          
          const status = (row.Status || "").toLowerCase();
          if (status.includes("completed") || status.includes("complete") || status.includes("done")) {
            managersMap[manager].completedTasks++;
          }
        }
        
        if (project) {
          managersMap[manager].projects.add(project);
        }
      }
    });

    return Object.values(managersMap).map(manager => ({
      ...manager,
      teamCount: manager.teamMembers.size,
      projectCount: manager.projects.size,
      percentage: manager.totalTasks > 0 ? Math.round((manager.completedTasks / manager.totalTasks) * 100) : 0,
    }));
  };

  const getTeamMembersData = (managerName) => {
    if (!excelData) return [];
    
    const membersMap = {};
    
    excelData.forEach((row) => {
      const manager = row.Manager || row.ManagerName;
      const member = row.TeamMember || row.Member || row.Name;
      
      if (manager === managerName && member) {
        if (!membersMap[member]) {
          membersMap[member] = {
            name: member,
            role: row.Role || "Team Member",
            totalTasks: 0,
            completedTasks: 0,
            projects: new Set(),
          };
        }
        membersMap[member].totalTasks++;
        
        const status = (row.Status || "").toLowerCase();
        if (status.includes("completed") || status.includes("complete") || status.includes("done")) {
          membersMap[member].completedTasks++;
        }
        
        const project = row.Project || row.ProjectName;
        if (project) {
          membersMap[member].projects.add(project);
        }
      }
    });

    return Object.values(membersMap).map(member => ({
      ...member,
      projectCount: member.projects.size,
      percentage: member.totalTasks > 0 ? Math.round((member.completedTasks / member.totalTasks) * 100) : 0,
    }));
  };

  const getMemberProjectTimeline = (memberName) => {
    if (!excelData) return [];
    
    const projectsMap = {};
    
    excelData.forEach((row) => {
      const member = row.TeamMember || row.Member || row.Name;
      const project = row.Project || row.ProjectName;
      const deadline = row.Deadline || row.DueDate;
      
      if (member === memberName && project && deadline) {
        const formattedDate = formatExcelDate(deadline);
        const date = parseDate(formattedDate);
        if (date) {
          const dateKey = date.toISOString().split('T')[0];
          
          if (!projectsMap[project]) {
            projectsMap[project] = {};
          }
          
          if (!projectsMap[project][dateKey]) {
            projectsMap[project][dateKey] = 0;
          }
          
          projectsMap[project][dateKey]++;
        }
      }
    });

    const timelineData = [];
    const allDates = new Set();
    
    Object.keys(projectsMap).forEach(project => {
      Object.keys(projectsMap[project]).forEach(date => {
        allDates.add(date);
      });
    });
    
    const sortedDates = Array.from(allDates).sort();
    
    sortedDates.forEach(date => {
      const dataPoint = { date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) };
      Object.keys(projectsMap).forEach(project => {
        dataPoint[project] = projectsMap[project][date] || 0;
      });
      timelineData.push(dataPoint);
    });

    return { timelineData, projects: Object.keys(projectsMap) };
  };

  const getProjectTasks = (memberName, projectName) => {
    if (!excelData) return [];
    
    return excelData
      .filter((row) => {
        const member = row.TeamMember || row.Member || row.Name;
        const project = row.Project || row.ProjectName;
        return member === memberName && project === projectName;
      })
      .map((row) => {
        const deadline = formatExcelDate(row.Deadline || row.DueDate || "N/A");
        const completedDate = formatExcelDate(row.CompletedDate || row.ActualDate || row.CompletionDate || "-");
        
        return {
          name: row.Task || row.TaskName || "Unnamed Task",
          status: row.Status || "Pending",
          deadline,
          completedDate,
          priority: row.Priority || "Medium",
          startDate: formatExcelDate(row.StartDate || "-"),
        };
      })
      .sort((a, b) => {
        const dateA = parseDate(a.deadline);
        const dateB = parseDate(b.deadline);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
      });
  };

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("complete") || s.includes("done")) return "bg-green-500";
    if (s.includes("progress") || s.includes("active")) return "bg-blue-500";
    if (s.includes("pending") || s.includes("waiting")) return "bg-yellow-500";
    if (s.includes("block")) return "bg-red-500";
    return "bg-gray-500";
  };

  const isOverdue = (deadline, completedDate) => {
    if (!deadline || deadline === "N/A" || completedDate === "-") return false;
    try {
      const deadlineDate = parseDate(deadline);
      const completed = parseDate(completedDate);
      return completed > deadlineDate;
    } catch {
      return false;
    }
  };

  const navigateToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedManager(null);
    setSelectedMember(null);
    setSelectedProject(null);
  };

  const navigateToManager = (managerName) => {
    setCurrentView("overview");
    setSelectedManager(managerName);
    setSelectedMember(null);
    setSelectedProject(null);
  };

  // Breadcrumb Component
  const Breadcrumb = () => {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
        <span
          onClick={navigateToDashboard}
          className="cursor-pointer hover:text-blue-600 hover:underline flex items-center gap-1 font-medium transition-colors"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </span>
        
        {selectedManager && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span
              onClick={() => navigateToManager(selectedManager)}
              className={`${
                selectedMember ? "cursor-pointer hover:text-blue-600 hover:underline" : "text-slate-900 font-semibold"
              } transition-colors`}
            >
              {selectedManager}
            </span>
          </>
        )}
        
        {selectedMember && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span
              onClick={() => {
                setCurrentView("member");
                setSelectedProject(null);
              }}
              className={`${
                selectedProject ? "cursor-pointer hover:text-blue-600 hover:underline" : "text-slate-900 font-semibold"
              } transition-colors`}
            >
              {selectedMember}
            </span>
          </>
        )}
        
        {selectedProject && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-semibold">{selectedProject}</span>
          </>
        )}
      </div>
    );
  };

  // Header Component with Refresh
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
              onClick={loadExcelData}
              disabled={isRefreshing}
              className="mb-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </button>
            {lastUpdated && (
              <div className="bg-slate-50 px-3 py-1 rounded-lg">
                <p className="text-slate-500 text-xs">Last Updated</p>
                <p className="text-slate-700 font-semibold text-sm">{lastUpdated.toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (currentView === "loading") {
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

  // Error State
  if (currentView === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-xl">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">Error Loading Data</h2>
            <p className="text-red-600 text-center mb-6">{error}</p>
            <div className="bg-slate-50 rounded-lg p-6 mb-6 border border-slate-200">
              <h3 className="text-slate-800 font-semibold mb-3">Required Excel Columns:</h3>
              <ul className="text-slate-600 space-y-1 list-disc list-inside">
                <li><strong>Manager</strong>: Manager name</li>
                <li><strong>ManagerRole</strong>: Manager role (DGM, GM, etc.)</li>
                <li><strong>TeamMember</strong>: Team member name</li>
                <li><strong>Role</strong>: Team member role</li>
                <li><strong>Project</strong>: Project name</li>
                <li><strong>Task</strong>: Task description</li>
                <li><strong>Status</strong>: Task status (Completed/In Progress/Pending/Blocked)</li>
                <li><strong>Deadline</strong>: Task deadline date</li>
                <li><strong>CompletedDate</strong>: Actual completion date</li>
                <li><strong>Priority</strong>: Task priority (High/Medium/Low)</li>
                <li><strong>StartDate</strong>: Task start date (optional)</li>
              </ul>
            </div>
            <button
              onClick={loadExcelData}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const managers = getAllManagers();

  // Main Dashboard - Manager Selection
  if (currentView === "dashboard") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header title="Team Management Dashboard" subtitle="Procurement Team" />
          <Breadcrumb />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managers.map((manager, idx) => (
              <div
                key={idx}
                onClick={() => navigateToManager(manager.name)}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg cursor-pointer hover:scale-105 hover:shadow-2xl transition-all border border-blue-400"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-blue-50 text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    {manager.role}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{manager.name}</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-blue-50">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team Members
                    </span>
                    <span className="font-bold">{manager.teamCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-50">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Projects
                    </span>
                    <span className="font-bold">{manager.projectCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-50">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Total Tasks
                    </span>
                    <span className="font-bold">{manager.totalTasks}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between text-white mb-2">
                    <span className="text-sm">Progress</span>
                    <span className="text-sm font-bold">{manager.percentage}%</span>
                  </div>
                  <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ width: `${manager.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const teamData = getTeamMembersData(selectedManager);
  const totalTasks = teamData.reduce((sum, member) => sum + member.totalTasks, 0);

  // Manager Overview Page with Pie Chart
  if (currentView === "overview" && selectedManager) {
    const managerInfo = managers.find(m => m.name === selectedManager);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header title={`${selectedManager}'s Team Dashboard`} subtitle="Overview of all projects and team members" />
          <Breadcrumb />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
              <Users className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-blue-100 text-sm mb-1">Team Members</p>
              <p className="text-3xl font-bold">{teamData.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg text-white">
              <FolderOpen className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-purple-100 text-sm mb-1">Total Projects</p>
              <p className="text-3xl font-bold">{managerInfo?.projectCount || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg text-white">
              <CheckCircle className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-green-100 text-sm mb-1">Total Tasks</p>
              <p className="text-3xl font-bold">{totalTasks}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg text-white">
              <BarChart3 className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-orange-100 text-sm mb-1">Completion Rate</p>
              <p className="text-3xl font-bold">{managerInfo?.percentage || 0}%</p>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Team Task Distribution</h2>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="w-full lg:w-1/2 h-96">
                {teamData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teamData}
                        dataKey="totalTasks"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ name, totalTasks, percentage }) => `${name}: ${totalTasks} (${percentage}%)`}
                        onClick={(data) => {
                          setSelectedMember(data.name);
                          setCurrentView("member");
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {teamData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
                                <p className="font-bold text-slate-800">{data.name}</p>
                                <p className="text-slate-600">Total Tasks: <span className="font-semibold">{data.totalTasks}</span></p>
                                <p className="text-slate-600">Completed: <span className="font-semibold">{data.completedTasks}</span></p>
                                <p className="text-slate-600">Progress: <span className="font-semibold">{data.percentage}%</span></p>
                                <p className="text-slate-600">Projects: <span className="font-semibold">{data.projectCount}</span></p>
                                <p className="text-blue-600 text-sm mt-2 font-medium">Click to view details →</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-500">No team data available</p>
                  </div>
                )}
              </div>
              
              <div className="w-full lg:w-1/2 space-y-4">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">Team Members</h3>
                {teamData.map((member, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedMember(member.name);
                      setCurrentView("member");
                    }}
                    className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer border border-slate-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <div>
                          <h4 className="font-bold text-slate-800">{member.name}</h4>
                          <p className="text-xs text-slate-500">{member.role}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">{member.percentage}% Complete</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                      <span>{member.completedTasks} / {member.totalTasks} Tasks</span>
                      <span>{member.projectCount} Projects</span>
                    </div>
                    <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${member.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Member Profile Page
  if (currentView === "member" && selectedMember) {
    const { timelineData, projects } = getMemberProjectTimeline(selectedMember);
    const memberData = teamData.find(m => m.name === selectedMember);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header title={selectedMember} subtitle={`Team Member Profile - ${memberData?.role || ''}`} />
          <Breadcrumb />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-5 shadow-md border border-blue-100">
              <p className="text-blue-600 text-sm font-medium mb-1">Total Tasks</p>
              <p className="text-3xl font-bold text-blue-700">{memberData?.totalTasks || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-5 shadow-md border border-green-100">
              <p className="text-green-600 text-sm font-medium mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-700">{memberData?.completedTasks || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-5 shadow-md border border-purple-100">
              <p className="text-purple-600 text-sm font-medium mb-1">Projects</p>
              <p className="text-3xl font-bold text-purple-700">{memberData?.projectCount || 0}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-5 shadow-md border border-orange-100">
              <p className="text-orange-600 text-sm font-medium mb-1">Progress</p>
              <p className="text-3xl font-bold text-orange-700">{memberData?.percentage || 0}%</p>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Project Timeline</h2>
            <p className="text-slate-600 mb-6">Click on any bar to view detailed tasks for that project</p>
            
            {timelineData.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Number of Tasks', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {projects.map((project, idx) => (
                      <Bar
                        key={project}
                        dataKey={project}
                        fill={COLORS[idx % COLORS.length]}
                        onClick={(data) => {
                          setSelectedProject(project);
                          setCurrentView("tasks");
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No timeline data available</p>
              </div>
            )}
          </div>

          {/* All Projects List */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">All Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, idx) => {
                const projectTasks = getProjectTasks(selectedMember, project);
                const completedCount = projectTasks.filter(t => 
                  (t.status || "").toLowerCase().includes("complete") || 
                  (t.status || "").toLowerCase().includes("done")
                ).length;
                
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedProject(project);
                      setCurrentView("tasks");
                    }}
                    className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer border border-slate-200 hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div 
                        className="w-3 h-3 rounded-full mt-1" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-xs font-semibold text-slate-600">
                        {completedCount}/{projectTasks.length} Tasks
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-3">{project}</h3>
                    <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${projectTasks.length > 0 ? (completedCount / projectTasks.length) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-right">
                      {projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0}% Complete
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tasks View
  if (currentView === "tasks" && selectedProject && selectedMember) {
    const tasks = getProjectTasks(selectedMember, selectedProject);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header title={selectedProject} subtitle={`${selectedMember}'s Tasks`} />
          <Breadcrumb />

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Project Tasks Timeline</h2>
              <div className="bg-blue-50 px-6 py-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  Total: <span className="font-bold text-blue-600 text-xl">{tasks.length}</span> Tasks
                </p>
              </div>
            </div>

            {/* Timeline View */}
            <div className="mb-8">
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                <div className="space-y-6">
                  {tasks.map((task, idx) => {
                    const overdue = isOverdue(task.deadline, task.completedDate);
                    const isCompleted = (task.status || "").toLowerCase().includes("complete") || 
                                       (task.status || "").toLowerCase().includes("done");
                    
                    return (
                      <div key={idx} className="relative pl-20">
                        <div className={`absolute left-6 w-5 h-5 rounded-full border-4 border-white shadow-md ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                        
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all border border-slate-200 hover:border-blue-300">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-slate-800 mb-2">{task.name}</h4>
                              <div className="flex gap-2 flex-wrap">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-slate-700 shadow-sm">
                                  Priority: {task.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 bg-white rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium">Start Date</p>
                                <p className="text-slate-800 font-bold text-sm">{task.startDate}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="bg-orange-100 p-2 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium">Deadline</p>
                                <p className="text-slate-800 font-bold text-sm">{task.deadline}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 p-2 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium">Completed</p>
                                <p className={`font-bold text-sm ${task.completedDate === "-" ? "text-slate-400" : "text-slate-800"}`}>
                                  {task.completedDate}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className={`${overdue ? 'bg-red-100' : 'bg-green-100'} p-2 rounded-lg`}>
                                {overdue ? (
                                  <AlertCircle className="w-5 h-5 text-red-600" />
                                ) : (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium">Status</p>
                                <p className={`font-bold text-sm ${overdue ? "text-red-600" : "text-green-600"}`}>
                                  {overdue ? "⚠️ Overdue" : "✓ On Time"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}