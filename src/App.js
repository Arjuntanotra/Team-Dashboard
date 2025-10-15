import React, { useState, useEffect } from "react";
import {
  Users,
  ArrowLeft,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function TeamDashboard() {
  const [excelData, setExcelData] = useState(null);
  const [currentView, setCurrentView] = useState("loading");
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState(["Managers"]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Google Sheet Configuration
  const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
  const SHEET_NAME = "Sheet1";

  // Load Excel data on mount and set up auto-refresh
  useEffect(() => {
    loadExcelData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadExcelData();
    }, 500000);

    return () => clearInterval(interval);
  }, []);

  const loadExcelData = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // Construct Google Sheets CSV export URL
      const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        SHEET_NAME
      )}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          "Failed to fetch Google Sheet. Make sure the sheet is published or publicly accessible."
        );
      }

      const csvText = await response.text();

      // Parse CSV to JSON using SheetJS
      const workbook = XLSX.read(csvText, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error(
          "Google Sheet is empty. Please add data to your sheet."
        );
      }

      setExcelData(jsonData);
      setLastUpdated(new Date());

      // Reset to managers view
      setCurrentView("managers");
      setSelectedManager(null);
      setSelectedMember(null);
      setSelectedProject(null);
      setBreadcrumb(["Managers"]);
      setError(null);
    } catch (err) {
      console.error("Error loading Google Sheet data:", err);
      setError(err.message);
      setCurrentView("error");
    }

    setIsRefreshing(false);
  };

  const getManagers = () => {
    if (!excelData) return [];
    const managers = {};
    excelData.forEach((row) => {
      const manager = row.Manager || row.GM || row.ManagerName;
      if (manager && !managers[manager]) {
        managers[manager] = {
          name: manager,
          role: row.ManagerRole || "GM",
          teamMembers: new Set(),
        };
      }
      const member = row.TeamMember || row.Member || row.Name;
      if (manager && member) {
        managers[manager].teamMembers.add(member);
      }
    });

    // Convert Set to count
    return Object.values(managers).map((manager) => ({
      ...manager,
      teamCount: manager.teamMembers.size,
    }));
  };

  const getTeamMembers = (managerName) => {
    if (!excelData) return [];
    const members = {};
    excelData.forEach((row) => {
      const manager = row.Manager || row.GM || row.ManagerName;
      const member = row.TeamMember || row.Member || row.Name;

      if (manager === managerName && member) {
        if (!members[member]) {
          members[member] = {
            name: member,
            role: row.Role || row.Position || "Team Member",
            projects: new Set(),
            totalTasks: 0,
          };
        }
        const project = row.Project || row.ProjectName;
        if (project) {
          members[member].projects.add(project);
        }
        members[member].totalTasks++;
      }
    });

    return Object.values(members).map((member) => ({
      ...member,
      projectCount: member.projects.size,
    }));
  };

  const getProjects = (memberName) => {
    if (!excelData) return [];
    const projects = {};
    excelData.forEach((row) => {
      const member = row.TeamMember || row.Member || row.Name;
      const project = row.Project || row.ProjectName;

      if (member === memberName && project) {
        if (!projects[project]) {
          projects[project] = {
            name: project,
            status: row.ProjectStatus || "In Progress",
            taskCount: 0,
            completedTasks: 0,
          };
        }
      }
    });

    Object.keys(projects).forEach((project) => {
      const tasks = excelData.filter(
        (row) =>
          (row.TeamMember || row.Member || row.Name) === memberName &&
          (row.Project || row.ProjectName) === project
      );
      projects[project].taskCount = tasks.length;
      projects[project].completedTasks = tasks.filter(
        (t) =>
          (t.Status || "").toLowerCase().includes("complete") ||
          (t.Status || "").toLowerCase().includes("done")
      ).length;
    });

    return Object.values(projects);
  };

  const formatExcelDate = (excelDate) => {
    if (!excelDate || excelDate === "N/A" || excelDate === "-")
      return excelDate;

    // Check if it's already a formatted date string
    if (typeof excelDate === "string" && excelDate.includes("/"))
      return excelDate;
    if (
      typeof excelDate === "string" &&
      excelDate.includes("-") &&
      excelDate.length > 5
    )
      return excelDate;

    try {
      // If it's an Excel serial number
      if (typeof excelDate === "number" || !isNaN(parseFloat(excelDate))) {
        const serialNumber =
          typeof excelDate === "number" ? excelDate : parseFloat(excelDate);
        // Excel serial date starts from 1900-01-01
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + serialNumber * 86400000);

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      // Try parsing as regular date
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

  const getTasks = (memberName, projectName) => {
    if (!excelData) return [];
    return excelData
      .filter((row) => {
        const member = row.TeamMember || row.Member || row.Name;
        const project = row.Project || row.ProjectName;
        return member === memberName && project === projectName;
      })
      .map((row) => ({
        name: row.Task || row.TaskName || "Unnamed Task",
        status: row.Status || "Pending",
        deadline: formatExcelDate(row.Deadline || row.DueDate || "N/A"),
        completedDate: formatExcelDate(
          row.CompletedDate || row.ActualDate || row.CompletionDate || "-"
        ),
        priority: row.Priority || "Medium",
      }));
  };

  const handleBreadcrumbClick = (index) => {
    if (index === 0) {
      setCurrentView("managers");
      setSelectedManager(null);
      setSelectedMember(null);
      setSelectedProject(null);
      setBreadcrumb(["Managers"]);
    } else if (index === 1) {
      setCurrentView("team");
      setSelectedMember(null);
      setSelectedProject(null);
      setBreadcrumb(["Managers", breadcrumb[1]]);
    } else if (index === 2) {
      setCurrentView("projects");
      setSelectedProject(null);
      setBreadcrumb(["Managers", breadcrumb[1], breadcrumb[2]]);
    }
  };

  const handleBack = () => {
    if (currentView === "tasks") {
      setSelectedProject(null);
      setCurrentView("projects");
      const newBreadcrumb = [...breadcrumb];
      newBreadcrumb.pop();
      setBreadcrumb(newBreadcrumb);
    } else if (currentView === "projects") {
      setSelectedMember(null);
      setCurrentView("team");
      const newBreadcrumb = [...breadcrumb];
      newBreadcrumb.pop();
      setBreadcrumb(newBreadcrumb);
    } else if (currentView === "team") {
      setSelectedManager(null);
      setCurrentView("managers");
      setBreadcrumb(["Managers"]);
    }
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
      // Parse DD/MM/YYYY format
      const parseDate = (dateStr) => {
        if (dateStr.includes("/")) {
          const [day, month, year] = dateStr.split("/");
          return new Date(year, month - 1, day);
        }
        return new Date(dateStr);
      };

      const deadlineDate = parseDate(deadline);
      const completed = parseDate(completedDate);
      return completed > deadlineDate;
    } catch {
      return false;
    }
  };

  // Loading State
  if (currentView === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-700 text-xl font-semibold">
              Loading Dashboard...
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Fetching team data from Google Sheets
            </p>
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
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">
              Error Loading Data
            </h2>
            <p className="text-red-600 text-center mb-6">{error}</p>
            <div className="bg-slate-50 rounded-lg p-6 mb-6 border border-slate-200">
              <h3 className="text-slate-800 font-semibold mb-3">
                Setup Instructions:
              </h3>
              <ol className="text-slate-600 space-y-2 list-decimal list-inside">
                <li>
                  Open your Google Sheet and go to File → Share → Publish to web
                </li>
                <li>
                  Click "Publish" (make sure entire document or specific sheet
                  is selected)
                </li>
                <li>
                  Copy your Google Sheet ID from the URL (the long string
                  between /d/ and /edit)
                </li>
                <li>
                  Replace{" "}
                  <code className="bg-gray-200 px-2 py-1 rounded">
                    YOUR_GOOGLE_SHEET_ID_HERE
                  </code>{" "}
                  in the code with your actual Sheet ID
                </li>
                <li>
                  Update{" "}
                  <code className="bg-gray-200 px-2 py-1 rounded">
                    SHEET_NAME
                  </code>{" "}
                  if your tab name is different from "Sheet1"
                </li>
                <li>
                  Use column names: Manager, ManagerRole, TeamMember, Role,
                  Project, Task, Status, Deadline, CompletedDate, Priority
                </li>
              </ol>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                Team Status Dashboard
              </h1>
              <div className="flex items-center gap-2 text-slate-600">
                {breadcrumb.map((crumb, idx) => (
                  <span key={idx} className="flex items-center">
                    {idx > 0 && <span className="mx-2">/</span>}
                    <span
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`${
                        idx < breadcrumb.length - 1
                          ? "cursor-pointer hover:text-blue-600 hover:underline"
                          : "text-slate-900 font-semibold"
                      } transition-colors`}
                    >
                      {crumb}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <button
                onClick={loadExcelData}
                disabled={isRefreshing}
                className="mb-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto font-medium"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
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

        {/* Back Button */}
        {currentView !== "managers" && (
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 shadow-sm hover:shadow-md transition-all font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Managers View */}
        {currentView === "managers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getManagers().map((manager, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedManager(manager.name);
                  setCurrentView("team");
                  setBreadcrumb(["Managers", manager.name]);
                }}
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
                <h3 className="text-2xl font-bold text-white mb-2">
                  {manager.name}
                </h3>
                <div className="flex items-center gap-2 text-blue-50">
                  <Users className="w-4 h-4" />
                  <p>{manager.teamCount} Team Members</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team Members View */}
        {currentView === "team" && selectedManager && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getTeamMembers(selectedManager).map((member, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedMember(member.name);
                  setCurrentView("projects");
                  setBreadcrumb(["Managers", selectedManager, member.name]);
                }}
                className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <span className="text-slate-600 text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">
                    {member.role}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {member.name}
                </h3>
                <div className="flex items-center gap-1 text-slate-600">
                  <FolderOpen className="w-4 h-4" />
                  <p>{member.projectCount} Projects</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Projects View */}
        {currentView === "projects" && selectedMember && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {getProjects(selectedMember).map((project, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedProject(project.name);
                  setCurrentView("tasks");
                  setBreadcrumb([
                    "Managers",
                    selectedManager,
                    selectedMember,
                    project.name,
                  ]);
                }}
                className="bg-white rounded-xl p-6 border border-slate-200 cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all shadow-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 rounded-xl">
                    <FolderOpen className="w-8 h-8 text-slate-700" />
                  </div>
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">
                  {project.name}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span className="font-medium">Progress</span>
                    <span className="font-semibold">
                      {project.completedTasks}/{project.taskCount} Tasks
                    </span>
                  </div>
                  <div className="bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all shadow-sm"
                      style={{
                        width: `${
                          (project.completedTasks / project.taskCount) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-right">
                    {Math.round((project.completedTasks / project.taskCount) * 100)}% Complete
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks View */}
        {currentView === "tasks" && selectedProject && selectedMember && (
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Project Tasks</h2>
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-slate-600">
                  Total: <span className="font-bold text-blue-600">{getTasks(selectedMember, selectedProject).length}</span> Tasks
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {getTasks(selectedMember, selectedProject).map((task, idx) => {
                const overdue = isOverdue(task.deadline, task.completedDate);
                return (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all border border-slate-200 hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800 mb-3">
                          {task.name}
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm ${getStatusColor(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-slate-700 shadow-sm">
                            Priority: {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-white rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Deadline</p>
                          <p className="text-slate-800 font-bold">
                            {task.deadline}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">
                            Completed
                          </p>
                          <p
                            className={`font-bold ${
                              task.completedDate === "-"
                                ? "text-slate-400"
                                : "text-slate-800"
                            }`}
                          >
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
                          <p className="text-xs text-slate-500 font-medium">Delivery Status</p>
                          <p
                            className={`font-bold ${
                              overdue ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {overdue ? "⚠️ Overdue" : "✓ On Time"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
