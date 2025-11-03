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
  Filter,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function TeamDashboard() {
  const [excelData, setExcelData] = useState(null);
  const [currentView, setCurrentView] = useState("loading");
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectFilters, setSelectedProjectFilters] = useState([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState([]);
  const [selectedTimingFilters, setSelectedTimingFilters] = useState([]);
  const [selectedKpiFilters, setSelectedKpiFilters] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Google Sheet Configuration
  const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
  const SHEET_NAME = "Sheet1";

  const COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#6366f1",
    "#84cc16",
    "#f97316",
    "#14b8a6",
  ];

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
      const workbook = XLSX.read(csvText, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      console.log("Loaded JSON Data:", jsonData);

      if (jsonData.length === 0) {
        throw new Error(
          "Google Sheet is empty. Please add data to your sheet."
        );
      }

      // Debug: Show available columns and sample data
      if (jsonData.length > 0) {
        console.log("Available columns in sheet:", Object.keys(jsonData[0]));
        console.log("Sample row data:", jsonData[0]);
        console.log("Valuation column check:", {
          Valuation: jsonData[0].Valuation,
          valuation: jsonData[0].valuation,
          VALUATION: jsonData[0].VALUATION,
          hasValuation: 'Valuation' in jsonData[0],
          allKeys: Object.keys(jsonData[0])
        });
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

  const calculateKPI = (startDateStr, completionDateStr, deadlineStr) => {
    if (!completionDateStr || completionDateStr === "N/A" || completionDateStr === "-") return null;

    const start = parseDate(startDateStr);
    const completion = parseDate(completionDateStr);
    const deadline = parseDate(deadlineStr);

    if (!start || !completion || !deadline) return null;

    // Calculate delay in days from deadline
    const delayMs = completion - deadline;
    const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));

    if (delayDays <= 0) return 100; // Completed on or before deadline

    // Calculate weeks of delay (1-7 days = 1 week, 8-14 days = 2 weeks, etc.)
    const weeksDelay = Math.ceil(delayDays / 7);

    // Deduct 5% per week of delay
    const kpi = Math.max(0, 100 - (weeksDelay * 5));

    return Math.round(kpi);
  };

  const formatExcelDate = (excelDate) => {
    if (!excelDate || excelDate === "N/A" || excelDate === "-")
      return excelDate;
    if (typeof excelDate === "string" && excelDate.includes("/"))
      return excelDate;
    if (
      typeof excelDate === "string" &&
      excelDate.includes("-") &&
      excelDate.length > 5
    )
      return excelDate;

    try {
      if (typeof excelDate === "number" || !isNaN(parseFloat(excelDate))) {
        const serialNumber =
          typeof excelDate === "number" ? excelDate : parseFloat(excelDate);
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
          inProgressTasks: 0,
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
        if (
          status.includes("completed") ||
          status.includes("complete") ||
          status.includes("done")
        ) {
          managersMap[manager].completedTasks++;
        }
        // Count all non-completed tasks as in progress
        // This matches what the In Progress Tasks view does
        if (!(
          status.includes("completed") ||
          status.includes("complete") ||
          status.includes("done")
        )) {
          managersMap[manager].inProgressTasks++;
        }
      }

        if (project) {
          managersMap[manager].projects.add(project);
        }
      }
    });

    // Calculate manager KPIs as average of member KPIs
    Object.keys(managersMap).forEach(managerName => {
      const teamMembersData = getTeamMembersData(managerName);
      const memberKpis = teamMembersData.map(member => member.kpi).filter(kpi => kpi !== undefined && kpi !== null);
      const averageKpi = memberKpis.length > 0 ? Math.round(memberKpis.reduce((sum, kpi) => sum + kpi, 0) / memberKpis.length) : 0;
      managersMap[managerName].averageKpi = averageKpi;
    });

    return Object.values(managersMap).map((manager) => ({
      ...manager,
      teamCount: manager.teamMembers.size,
      projectCount: manager.projects.size,
      percentage:
        manager.totalTasks > 0
          ? Math.round((manager.completedTasks / manager.totalTasks) * 100)
          : 0,
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
            projectsMap: {},
          };
        }
        membersMap[member].totalTasks++;

        const status = (row.Status || "").toLowerCase();
        if (
          status.includes("completed") ||
          status.includes("complete") ||
          status.includes("done")
        ) {
          membersMap[member].completedTasks++;
        }

        const project = row.Project || row.ProjectName;
        if (project) {
          membersMap[member].projects.add(project);
          if (!membersMap[member].projectsMap[project]) {
            membersMap[member].projectsMap[project] = {
              totalTasks: 0,
              completedTasks: 0,
              tasks: [],
            };
          }
          membersMap[member].projectsMap[project].totalTasks++;
          if (
            status.includes("completed") ||
            status.includes("complete") ||
            status.includes("done")
          ) {
            membersMap[member].projectsMap[project].completedTasks++;
          }
          membersMap[member].projectsMap[project].tasks.push({
            status: row.Status || "Pending",
            startDate: formatExcelDate(row.StartDate || "-"),
            deadline: formatExcelDate(row.Deadline || row.DueDate || "N/A"),
            completedDate: formatExcelDate(row.CompletedDate || row.ActualDate || row.CompletionDate || "-"),
          });
        }
      }
    });

    return Object.values(membersMap).map((member) => {
      // Calculate member KPI as average of project KPIs
      const projectKpis = Object.entries(member.projectsMap).map(([projectName, projectData]) => {
        const tasks = projectData.tasks;
        const completedCount = tasks.filter(t =>
          (t.status || "").toLowerCase().includes("complete") ||
          (t.status || "").toLowerCase().includes("done")
        ).length;
        const totalTasks = tasks.length;
        let projectKpi;
        if (completedCount === totalTasks && totalTasks > 0) {
          // all completed, average of all tasks with kpi
          const kpis = tasks.filter(t => t.completedDate !== "-" && t.deadline !== "N/A")
            .map(t => calculateKPI(t.startDate, t.completedDate, t.deadline))
            .filter(k => k !== null);
          projectKpi = kpis.length > 0 ? kpis.reduce((s, k) => s + k, 0) / kpis.length : 0;
        } else if (completedCount > 0) {
          // under progress, average of completed tasks KPI
          const completedKPIs = tasks.filter(t =>
            (t.status || "").toLowerCase().includes("complete") ||
            (t.status || "").toLowerCase().includes("done")
          ).map(t => calculateKPI(t.startDate, t.completedDate, t.deadline)).filter(k => k !== null);
          projectKpi = completedKPIs.length > 0 ? completedKPIs.reduce((s, k) => s + k, 0) / completedKPIs.length : 0;
        } else {
          // not started
          projectKpi = 0;
        }
        return projectKpi;
      });
      const memberKpi = projectKpis.length > 0 ? Math.round(projectKpis.reduce((s, k) => s + k, 0) / projectKpis.length) : 0;

      return {
        ...member,
        projectCount: member.projects.size,
        percentage: member.totalTasks > 0 ? Math.round((member.completedTasks / member.totalTasks) * 100) : 0,
        kpi: memberKpi,
      };
    });
  };

  const getMemberProjectTimeline = (memberName) => {
    if (!excelData) return { timelineData: [], projects: [] };

    const projectsMap = {};

    // Collect all tasks for each project
    excelData.forEach((row) => {
      const member = row.TeamMember || row.Member || row.Name;
      const project = row.Project || row.ProjectName;
      const startDate = row.StartDate;
      const deadline = row.Deadline || row.DueDate;

      if (member === memberName && project) {
        if (!projectsMap[project]) {
          projectsMap[project] = {
            name: project,
            startDates: [],
            endDates: [],
            tasks: [],
          };
        }

        if (startDate) {
          const formattedStart = formatExcelDate(startDate);
          const parsedStart = parseDate(formattedStart);
          if (parsedStart) {
            projectsMap[project].startDates.push(parsedStart.getTime());
          }
        }

        if (deadline) {
          const formattedDeadline = formatExcelDate(deadline);
          const parsedDeadline = parseDate(formattedDeadline);
          if (parsedDeadline) {
            projectsMap[project].endDates.push(parsedDeadline.getTime());
          }
        }

        projectsMap[project].tasks.push(row.Task || row.TaskName || "Task");
      }
    });

    // Calculate project timeline bars
    const timelineData = [];
    const projects = Object.keys(projectsMap);

    // Find global min and max dates for timeline scale
    let globalMinDate = Infinity;
    let globalMaxDate = -Infinity;

    projects.forEach((project) => {
      const data = projectsMap[project];
      if (data.startDates.length > 0) {
        const minStart = Math.min(...data.startDates);
        const maxEnd = Math.max(...data.endDates);
        globalMinDate = Math.min(globalMinDate, minStart);
        globalMaxDate = Math.max(globalMaxDate, maxEnd);
      }
    });

    // Create timeline data for each project
    projects.forEach((project) => {
      const data = projectsMap[project];

      if (data.startDates.length > 0 && data.endDates.length > 0) {
        const projectStart = Math.min(...data.startDates);
        const projectEnd = Math.max(...data.endDates);

        timelineData.push({
          project: project,
          start: projectStart,
          end: projectEnd,
          startDate: new Date(projectStart),
          endDate: new Date(projectEnd),
          duration: Math.ceil(
            (projectEnd - projectStart) / (1000 * 60 * 60 * 24)
          ), // days
          taskCount: data.tasks.length,
        });
      }
    });

    return {
      timelineData: timelineData.sort((a, b) => a.start - b.start),
      projects,
      globalMinDate: new Date(globalMinDate),
      globalMaxDate: new Date(globalMaxDate),
    };
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
        const completedDate = formatExcelDate(
          row.CompletedDate || row.ActualDate || row.CompletionDate || "-"
        );

        const startDate = formatExcelDate(row.StartDate || "-");
        const kpi = calculateKPI(startDate, completedDate, deadline);

        return {
          name: row.Task || row.TaskName || "Unnamed Task",
          status: row.Status || "Pending",
          deadline,
          completedDate,
          priority: row.Priority || "Medium",
          startDate,
          kpi,
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
    if (!deadline || deadline === "N/A") return false;
    try {
      const deadlineDate = parseDate(deadline);
      const completed = parseDate(completedDate);

      // If task is completed, check if completed after deadline
      if (completed && completedDate !== "-") {
        return completed > deadlineDate;
      }
      // If task is not completed, check if current date is past deadline
      return new Date() > deadlineDate;
    } catch {
      return false;
    }
  };

  const getTaskStatus = (deadline, completedDate) => {
    if (!deadline || deadline === "N/A") return { status: "ontime", weeksOverdue: 0 };

    try {
      const deadlineDate = parseDate(deadline);
      const completed = parseDate(completedDate);

      // If task is completed
      if (completed && completedDate !== "-") {
        if (completed > deadlineDate) {
          const daysOverdue = Math.max(1, Math.ceil((completed - deadlineDate) / (1000 * 60 * 60 * 24)));
          const weeksOverdue = Math.max(1, Math.ceil(daysOverdue / 7));
          return { status: "overdue", weeksOverdue };
        }
        return { status: "ontime", weeksOverdue: 0 };
      }

      // If task is not completed (no completed date), consider it on time
      return { status: "ontime", weeksOverdue: 0 };
    } catch {
      return { status: "ontime", weeksOverdue: 0 };
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

  const navigateToAllMembers = () => {
    setCurrentView("all-members");
    setSelectedMember(null);
    setSelectedProject(null);
  };

  const navigateToAllProjects = () => {
    setCurrentView("all-projects");
  };

  const navigateToAllTasks = () => {
    setCurrentView("all-tasks");
    setSelectedMember(null);
    setSelectedProject(null);
    setSelectedProjectFilters([]);
  };

  const navigateToInProgressTasks = () => {
    setCurrentView("in-progress-tasks");
    setSelectedMember(null);
    setSelectedProject(null);
    setSelectedProjectFilters([]);
  };

  const navigateToOverdueTasks = () => {
    setCurrentView("overdue-tasks");
    setSelectedMember(null);
    setSelectedProject(null);
    setSelectedProjectFilters([]);
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

        {selectedManager &&
          currentView !== "all-members" &&
          currentView !== "all-projects" &&
          currentView !== "all-completions" &&
          currentView !== "in-progress-tasks" &&
          !(currentView === "all-tasks" && !selectedProject) && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span
                onClick={() => navigateToManager(selectedManager)}
                className={`${
                  selectedMember
                    ? "cursor-pointer hover:text-blue-600 hover:underline"
                    : "text-slate-900 font-semibold"
                } transition-colors`}
              >
                {selectedManager}
              </span>
            </>
          )}

        {selectedManager &&
          (currentView === "all-members" ||
            currentView === "all-projects" ||
            currentView === "all-completions" ||
            currentView === "overdue-tasks" ||
            (currentView === "all-tasks" && !selectedProject)) && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span
                onClick={() => navigateToManager(selectedManager)}
                className="cursor-pointer hover:text-blue-600 hover:underline text-slate-900 font-semibold transition-colors"
              >
                {selectedManager}
              </span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-900 font-semibold">
                {currentView === "all-members"
                  ? "All Members"
                  : currentView === "all-projects"
                  ? "All Projects"
                  : currentView === "all-completions"
                  ? "All Completions"
                  : currentView === "overdue-tasks"
                  ? "Overdue Tasks"
                  : currentView === "all-tasks"
                  ? "All Tasks"
                  : "View"}
              </span>
            </>
          )}

        {selectedManager && currentView === "in-progress-tasks" && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span
              onClick={() => navigateToManager(selectedManager)}
              className="cursor-pointer hover:text-blue-600 hover:underline text-slate-900 font-semibold transition-colors"
            >
              {selectedManager}
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-semibold">In Progress Tasks</span>
          </>
        )}

        {selectedMember &&
          currentView !== "all-members" &&
          currentView !== "all-projects" &&
          currentView !== "all-completions" &&
          currentView !== "all-tasks" && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span
                onClick={() => {
                  setCurrentView("member");
                  setSelectedProject(null);
                }}
                className={`${
                  selectedProject
                    ? "cursor-pointer hover:text-blue-600 hover:underline"
                    : "text-slate-900 font-semibold"
                } transition-colors`}
              >
                {selectedMember}
              </span>
            </>
          )}

        {currentView === "performance-details" && selectedManager && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-semibold">Success Metrics</span>
          </>
        )}

        {selectedProject && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-semibold">
              {selectedProject}
            </span>
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
          <div className="flex items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-1">
                {title}
              </h1>
              {subtitle && <p className="text-slate-600">{subtitle}</p>}
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
    );
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
                Required Excel Columns:
              </h3>
              <ul className="text-slate-600 space-y-1 list-disc list-inside">
                <li>
                  <strong>Manager</strong>: Manager name
                </li>
                <li>
                  <strong>ManagerRole</strong>: Manager role (DGM, GM, etc.)
                </li>
                <li>
                  <strong>TeamMember</strong>: Team member name
                </li>
                <li>
                  <strong>Role</strong>: Team member role
                </li>
                <li>
                  <strong>Project</strong>: Project name
                </li>
                <li>
                  <strong>Task</strong>: Task description
                </li>
                <li>
                  <strong>Status</strong>: Task status (Completed/In
                  Progress/Pending/Blocked)
                </li>
                <li>
                  <strong>Deadline</strong>: Task deadline date
                </li>
                <li>
                  <strong>CompletedDate</strong>: Actual completion date
                </li>
                <li>
                  <strong>Priority</strong>: Task priority (High/Medium/Low)
                </li>
                <li>
                  <strong>StartDate</strong>: Task start date (optional)
                </li>
                <li>
                  <strong>Valuation</strong>: Project valuation in rupees
                </li>
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
          <Header
            title="Team Management Dashboard"
            
          />
          <Breadcrumb />

          <div className="space-y-6">
            {managers.map((manager, idx) => {
              // Prepare data for the bar chart
              const chartData = [
                { name: 'Team Members', value: manager.teamCount, color: '#60a5fa' },
                { name: 'Projects', value: manager.projectCount, color: '#f59e0b' },
                { name: 'Total Tasks', value: manager.totalTasks, color: '#10b981' },
                { name: 'Team KPI', value: manager.averageKpi, color: '#8b5cf6' },
              ];

              return (
                <div key={idx} className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Manager Card - Left Side */}
                    <div
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
                      <h3 className="text-2xl font-bold text-white mb-4">
                        {manager.name}
                      </h3>

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
                        <div className="flex items-center justify-between text-blue-50">
                          <span className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Team KPI
                          </span>
                          <span className="font-bold">{manager.averageKpi}%</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center justify-between text-white mb-2">
                          <span className="text-sm">Progress & Avg KPI</span>
                        </div>
                        <div className="space-y-1">
                          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-white h-2 rounded-full transition-all"
                              style={{ width: `${manager.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-white/80 text-center">
                            Progress: {manager.percentage}% | KPI: {manager.averageKpi}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bar Chart - Right Side */}
                    <div className="flex flex-col justify-center">
                      <h4 className="text-lg font-semibold text-slate-800 mb-4 text-center">
                        Team Summary
                      </h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: '#374151' }}
                              interval={0}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: '#374151' }}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const value = payload[0].value;
                                  return (
                                    <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
                                      <p className="font-bold text-slate-800 mb-2">
                                        {manager.name} - {label}
                                      </p>
                                      <div className="space-y-1 text-sm">
                                        {label === 'Team Members' && (
                                          <>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Role:</span> {manager.role}
                                            </p>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Team Size:</span> {manager.teamCount} members
                                            </p>
                                          </>
                                        )}
                                        {label === 'Projects' && (
                                          <>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Active Projects:</span> {manager.projectCount}
                                            </p>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Overall Progress:</span> {manager.percentage}%
                                            </p>
                                          </>
                                        )}
                                        {label === 'Total Tasks' && (
                                          <>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Completed:</span> {manager.completedTasks}
                                            </p>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">In Progress:</span> {manager.inProgressTasks}
                                            </p>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Total:</span> {manager.totalTasks}
                                            </p>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Completion Rate:</span> {manager.totalTasks > 0 ? Math.round((manager.completedTasks / manager.totalTasks) * 100) : 0}%
                                            </p>
                                          </>
                                        )}
                                        {label === 'Team KPI' && (
                                          <>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Average Performance:</span> {manager.averageKpi}%
                                            </p>
                                            <p className="text-slate-600">
                                              <span className="font-semibold">Rating:</span> {
                                                manager.averageKpi >= 90 ? 'Excellent' :
                                                manager.averageKpi >= 80 ? 'Very Good' :
                                                manager.averageKpi >= 70 ? 'Good' :
                                                manager.averageKpi >= 60 ? 'Fair' : 'Needs Improvement'
                                              }
                                            </p>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-3 mt-4 text-sm text-slate-600 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#60a5fa' }}></div>
                          <span>Members: {manager.teamCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                          <span>Projects: {manager.projectCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                          <span>Tasks: {manager.totalTasks}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
                          <span>KPI: {manager.averageKpi}%</span>
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
    );
  }

  const teamData = getTeamMembersData(selectedManager);
  const totalTasks = teamData.reduce(
    (sum, member) => sum + member.totalTasks,
    0
  );

  // Manager Overview Page with Pie Chart
  if (currentView === "overview" && selectedManager) {
    const managerInfo = managers.find((m) => m.name === selectedManager);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title={`${selectedManager}'s Team Dashboard`}
            subtitle="Overview of all projects and team members"
          />
          <Breadcrumb />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div onClick={() => { setCurrentView("all-completions"); setSelectedMember(null); setSelectedProject(null); }} className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:scale-105 transition-all">
              <CheckCircle className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-green-100 text-sm mb-1">Completed Tasks</p>
              <p className="text-3xl font-bold">{managerInfo?.completedTasks || 0}</p>
            </div>
            <div onClick={navigateToInProgressTasks} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:scale-105 transition-all">
              <Clock className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-blue-100 text-sm mb-1">In Progress Tasks</p>
              <p className="text-3xl font-bold">{managerInfo?.inProgressTasks || 0}</p>
            </div>
            <div onClick={() => setCurrentView("team-kpi-breakdown")} className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:scale-105 transition-all">
              <BarChart3 className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-indigo-100 text-sm mb-1">Team Average KPI</p>
              <p className="text-3xl font-bold">{managerInfo?.averageKpi || 0}%</p>
              <p className="text-indigo-200 text-xs mt-2">Click to view breakdown →</p>
            </div>
            <div
              onClick={navigateToAllMembers}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:scale-105 transition-all"
            >
              <Users className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-purple-100 text-sm mb-1">Team Members</p>
              <p className="text-3xl font-bold">{teamData.length}</p>
            </div>
            <div
              onClick={navigateToAllProjects}
              className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:scale-105 transition-all"
            >
              <FolderOpen className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-orange-100 text-sm mb-1">Total Projects</p>
              <p className="text-3xl font-bold">
                {managerInfo?.projectCount || 0}
              </p>
            </div>
            <div
              onClick={navigateToAllTasks}
              className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-6 shadow-lg text-white cursor-pointer hover:scale-105 transition-all"
            >
              <BarChart3 className="w-10 h-10 mb-3 opacity-80" />
              <p className="text-slate-100 text-sm mb-1">All Tasks</p>
              <p className="text-3xl font-bold">{totalTasks}</p>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-orange-200">
              <Clock className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">Team Progress</h3>
              <p className="text-slate-600 text-sm mb-4">
                {Math.round((managerInfo?.completedTasks || 0) / Math.max(totalTasks, 1) * 100)}% overall completion rate
              </p>
              <div className="bg-slate-200 rounded-full h-3 overflow-hidden mb-4">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.round((managerInfo?.completedTasks || 0) / Math.max(totalTasks, 1) * 100)}%` }}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Completed Tasks</span>
                  <span className="font-bold text-green-600">{managerInfo?.completedTasks || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">In Progress</span>
                  <span className="font-bold text-blue-600">{managerInfo?.inProgressTasks || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Total Tasks</span>
                  <span className="font-bold text-slate-800">{totalTasks}</span>
                </div>
              </div>
            </div>
            <div
              className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-200 cursor-pointer hover:shadow-lg transition-all hover:border-red-300"
              onClick={() => navigateToOverdueTasks()}
            >
              <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-800">Overdue Tasks</h3>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-slate-600 text-sm mb-4">Tasks past their deadline that need immediate attention</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-600">Total Overdue:</span>
                <span className="text-2xl font-bold text-red-700">
                  {excelData.filter(row => {
                    if ((row.Manager || row.ManagerName) !== selectedManager) return false;
                    const deadline = formatExcelDate(row.Deadline || row.DueDate || "N/A");
                    const completedDate = formatExcelDate(row.CompletedDate || row.ActualDate || row.CompletionDate || "-");
                    const status = (row.Status || "").toLowerCase();
                    return status.includes("completed") || status.includes("complete") || status.includes("done")
                      ? completedDate !== "-" && deadline !== "N/A" && parseDate(completedDate) > parseDate(deadline)
                      : deadline !== "N/A" && new Date() > parseDate(deadline);
                  }).length}
                </span>
              </div>
              <p className="text-xs text-slate-500">Click to view detailed task list →</p>
            </div>
            <div onClick={() => setCurrentView("performance-details")} className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-green-200 cursor-pointer hover:shadow-lg transition-all hover:border-green-300">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Success Metrics</h3>
              <p className="text-slate-600 text-sm mb-4">
                {teamData.filter(member => member.kpi >= 80).length} members with high KPI scores (80%+)
                <br />
                <span className="text-xs">High: ≥80% | Good: 60-79% | Needs: &lt;60%</span>
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">High Performers</span>
                  <span className="font-bold text-green-600">{teamData.filter(member => member.kpi >= 80).length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Good Performance</span>
                  <span className="font-bold text-yellow-600">{teamData.filter(member => member.kpi >= 60 && member.kpi < 80).length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Needs Attention</span>
                  <span className="font-bold text-red-600">{teamData.filter(member => member.kpi < 60).length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pie Charts */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Task Distribution Pie Chart */}
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">
                  Team Task & Volume Distribution
                </h2>
                <div className="h-80">
                  {teamData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={teamData}
                          dataKey="totalTasks"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={30}
                          label={({ name, value, percent }) =>
                            `${name}: ${value} tasks (${(percent * 100).toFixed(1)}%)`
                          }
                          labelLine={false}
                          labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          onClick={(data) => {
                            setSelectedMember(data.name);
                            setCurrentView("member");
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {teamData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const taskVolumePercentage = ((data.totalTasks / teamData.reduce((sum, member) => sum + member.totalTasks, 0)) * 100).toFixed(1);
                              return (
                                <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
                                  <p className="font-bold text-slate-800">
                                    {data.name}
                                  </p>
                                  <p className="text-slate-600">
                                    Total Tasks:{" "}
                                    <span className="font-semibold">
                                      {data.totalTasks}
                                    </span>
                                  </p>
                                  <p className="text-slate-600">
                                    Task Volume:{" "}
                                    <span className="font-semibold text-purple-600">
                                      {taskVolumePercentage}%
                                    </span>
                                  </p>
                                  <p className="text-slate-600">
                                    Completed:{" "}
                                    <span className="font-semibold">
                                      {data.completedTasks}
                                    </span>
                                  </p>
                                  <p className="text-slate-600">
                                    Progress:{" "}
                                    <span className="font-semibold">
                                      {data.percentage}%
                                    </span>
                                  </p>
                                  <p className="text-slate-600">
                                    Projects:{" "}
                                    <span className="font-semibold">
                                      {data.projectCount}
                                    </span>
                                  </p>
                                  <p className="text-blue-600 text-sm mt-2 font-medium">
                                    Click to view details →
                                  </p>
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
              </div>

              {/* Valuation Distribution Pie Chart */}
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">
                  Team Valuation Distribution
                </h2>
                <div className="h-80">
                  {(() => {
                    // Calculate valuation per team member
                    const valuationData = teamData.map(member => {
                      let totalValuation = 0;
                      let valuationCount = 0;
                      excelData.forEach((row) => {
                        const manager = row.Manager || row.ManagerName;
                        const memberName = row.TeamMember || row.Member || row.Name;

                        if (manager === selectedManager && memberName === member.name) {
                          // Try different possible column names for valuation
                          const valuationValue = row.Valuation || row.valuation || row.VALUATION || row['valuation'] || row['VALUATION'] || 0;

                          // Parse valuation - handle various formats
                          let parsedValuation = 0;
                          if (valuationValue && valuationValue !== 'N/A' && valuationValue !== '-') {
                            // Remove currency symbols and commas
                            const cleanValue = String(valuationValue).replace(/[₹,\s]/g, '');
                            parsedValuation = parseFloat(cleanValue) || 0;
                          }

                          if (parsedValuation > 0) {
                            totalValuation += parsedValuation;
                            valuationCount++;
                          }
                        }
                      });

                      console.log(`Member ${member.name}: totalValuation=${totalValuation}, valuationCount=${valuationCount}, rawValuations=`, member.rawValuations);

                      return {
                        ...member,
                        totalValuation: Math.round(totalValuation),
                        valuationCount,
                        rawValuations: member.rawValuations || []
                      };
                    }).filter(member => member.totalValuation > 0);

                    console.log('Valuation data:', valuationData);
                    console.log('Total team valuation:', valuationData.reduce((sum, member) => sum + member.totalValuation, 0));

                    return valuationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={valuationData}
                            dataKey="totalValuation"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={30}
                            label={({ name, value, percent }) =>
                              `${name}: ₹${value.toLocaleString()} (${(percent * 100).toFixed(1)}%)`
                            }
                            labelLine={false}
                            labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                            onClick={(data) => {
                              setSelectedMember(data.name);
                              setCurrentView("member");
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {valuationData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const totalTeamValuation = valuationData.reduce((sum, member) => sum + member.totalValuation, 0);
                                const valuationPercentage = ((data.totalValuation / totalTeamValuation) * 100).toFixed(1);
                                return (
                                  <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
                                    <p className="font-bold text-slate-800">
                                      {data.name}
                                    </p>
                                    <p className="text-slate-600">
                                      Total Valuation:{" "}
                                      <span className="font-semibold text-green-600">
                                        ₹{data.totalValuation.toLocaleString()}
                                      </span>
                                    </p>
                                    <p className="text-slate-600">
                                      Valuation Share:{" "}
                                      <span className="font-semibold text-purple-600">
                                        {valuationPercentage}%
                                      </span>
                                    </p>
                                    <p className="text-slate-600">
                                      Projects:{" "}
                                      <span className="font-semibold">
                                        {data.projectCount}
                                      </span>
                                    </p>
                                    <p className="text-slate-600">
                                      KPI:{" "}
                                      <span className="font-semibold">
                                        {data.kpi}%
                                      </span>
                                    </p>
                                    <p className="text-blue-600 text-sm mt-2 font-medium">
                                      Click to view details →
                                    </p>
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
                        <p className="text-slate-500">No valuation data available</p>
                        <p className="text-slate-400 text-sm mt-2">Add Valuation column to your sheet</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Team Members Horizontal Layout */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">
                Team Members
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                        style={{
                          backgroundColor: COLORS[idx % COLORS.length],
                        }}
                      />
                      <div>
                        <h4 className="font-bold text-slate-800">
                          {member.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {member.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {member.percentage}% Complete
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                    <span>
                      {member.completedTasks} / {member.totalTasks} Tasks
                    </span>
                    <span>{member.projectCount} Projects</span>
                  </div>
                  <div className="bg-slate-200 rounded-full h-2 overflow-hidden mb-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${member.percentage}%` }}
                    />
                  </div>
                  {(() => {
                    // Calculate member valuation
                    let totalValuation = 0;
                    excelData.forEach((row) => {
                      const manager = row.Manager || row.ManagerName;
                      const memberName = row.TeamMember || row.Member || row.Name;

                      if (manager === selectedManager && memberName === member.name) {
                        const valuationValue = row.Valuation || row.valuation || row.VALUATION || row['valuation'] || row['VALUATION'] || 0;
                        let parsedValuation = 0;
                        if (valuationValue && valuationValue !== 'N/A' && valuationValue !== '-') {
                          const cleanValue = String(valuationValue).replace(/[₹,\s]/g, '');
                          parsedValuation = parseFloat(cleanValue) || 0;
                        }
                        totalValuation += parsedValuation;
                      }
                    });

                    return totalValuation > 0 ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-green-800 text-xs font-semibold">
                          Valuation: ₹{Math.round(totalValuation).toLocaleString()}
                        </p>
                      </div>
                    ) : null;
                  })()}
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
    const { timelineData, projects, globalMinDate, globalMaxDate } =
      getMemberProjectTimeline(selectedMember);
    const memberData = teamData.find((m) => m.name === selectedMember);

    // Calculate project KPIs
    const projectKpisData = projects.map(project => {
      const projectTasks = getProjectTasks(selectedMember, project);
      const completedCount = projectTasks.filter(
        (t) =>
          (t.status || "").toLowerCase().includes("complete") ||
          (t.status || "").toLowerCase().includes("done")
      ).length;
      const totalTasks = projectTasks.length;
      let projectKpi;
      if (completedCount === totalTasks && totalTasks > 0) {
        // all completed, average of all tasks with kpi
        const kpis = projectTasks.map(t => t.kpi).filter(k => k !== null);
        projectKpi = kpis.length > 0 ? kpis.reduce((s, k) => s + k, 0) / kpis.length : 0;
      } else if (completedCount > 0) {
        // under progress, average of completed tasks KPI
        const completedKPIs = projectTasks.filter(t =>
          (t.status || "").toLowerCase().includes("complete") ||
          (t.status || "").toLowerCase().includes("done")
        ).map(t => t.kpi).filter(k => k !== null);
        projectKpi = completedKPIs.length > 0 ? completedKPIs.reduce((s, k) => s + k, 0) / completedKPIs.length : 0;
      } else {
        // not started
        projectKpi = 0;
      }
      return {
        project,
        projectKpi,
        completedCount,
        totalTasks,
      };
    });

    const overallKpi = projectKpisData.length > 0 ? Math.round(projectKpisData.reduce((s, p) => s + p.projectKpi, 0) / projectKpisData.length) : 0;

    // Generate week labels for X-axis
    const generateWeekLabels = () => {
      if (!globalMinDate || !globalMaxDate) return [];

      const labels = [];
      const currentDate = new Date(globalMinDate);

      while (currentDate <= globalMaxDate) {
        const weekNum = Math.ceil(currentDate.getDate() / 7);
        const monthName = currentDate.toLocaleDateString("en-US", {
          month: "short",
        });
        labels.push(`${monthName} Wk-${weekNum}`);
        currentDate.setDate(currentDate.getDate() + 7);
      }

      return labels;
    };

    const weekLabels = generateWeekLabels();

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title={selectedMember}
            subtitle={`Team Member Profile - ${memberData?.role || ""}`}
          />
          <Breadcrumb />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-5 shadow-md border border-blue-100">
              <p className="text-blue-600 text-sm font-medium mb-1">
                Total Tasks
              </p>
              <p className="text-3xl font-bold text-blue-700">
                {memberData?.totalTasks || 0}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-5 shadow-md border border-green-100">
              <p className="text-green-600 text-sm font-medium mb-1">
                Completed
              </p>
              <p className="text-3xl font-bold text-green-700">
                {memberData?.completedTasks || 0}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-5 shadow-md border border-purple-100">
              <p className="text-purple-600 text-sm font-medium mb-1">
                Projects
              </p>
              <p className="text-3xl font-bold text-purple-700">
                {memberData?.projectCount || 0}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-5 shadow-md border border-orange-100">
              <p className="text-orange-600 text-sm font-medium mb-1">
                Progress
              </p>
              <p className="text-3xl font-bold text-orange-700">
                {memberData?.percentage || 0}%
              </p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-5 shadow-md border border-indigo-100">
              <p className="text-indigo-600 text-sm font-medium mb-1">
                Overall KPI
              </p>
              <p className="text-3xl font-bold text-indigo-700">
                {overallKpi}%
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-5 shadow-md border border-emerald-100">
              <p className="text-emerald-600 text-sm font-medium mb-1">
                Total Valuation
              </p>
              <p className="text-3xl font-bold text-emerald-700">
                {(() => {
                  let totalValuation = 0;
                  excelData.forEach((row) => {
                    const manager = row.Manager || row.ManagerName;
                    const memberName = row.TeamMember || row.Member || row.Name;

                    if (manager === selectedManager && memberName === selectedMember) {
                      const valuationValue = row.Valuation || row.valuation || row.VALUATION || row['valuation'] || row['VALUATION'] || 0;
                      let parsedValuation = 0;
                      if (valuationValue && valuationValue !== 'N/A' && valuationValue !== '-') {
                        const cleanValue = String(valuationValue).replace(/[₹,\s]/g, '');
                        parsedValuation = parseFloat(cleanValue) || 0;
                      }
                      totalValuation += parsedValuation;
                    }
                  });

                  return totalValuation > 0 ? `₹${Math.round(totalValuation).toLocaleString()}` : '₹0';
                })()}
              </p>
            </div>
          </div>

          {/* Gantt Chart Style Timeline */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Project Timeline (Gantt View)
            </h2>
            <p className="text-slate-600 mb-6">
              Horizontal timeline showing project duration - Click on any bar to
              view detailed tasks
            </p>

            {timelineData.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Timeline Header with Week Labels */}
                  <div className="flex mb-6 pb-4 border-b-2 border-slate-300">
                    <div className="w-48 flex-shrink-0 font-semibold text-slate-700">
                      Projects
                    </div>
                    <div className="flex-1 flex justify-between text-xs text-slate-600">
                      {weekLabels.map((label, idx) => (
                        <div
                          key={idx}
                          className="flex-1 text-center border-l border-slate-200 px-1"
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Project Timeline Bars */}
                  <div className="space-y-4">
                    {timelineData.map((project, idx) => {
                      const totalDuration =
                        globalMaxDate.getTime() - globalMinDate.getTime();
                      const projectStartOffset =
                        ((project.start - globalMinDate.getTime()) /
                          totalDuration) *
                        100;
                      const projectWidth =
                        ((project.end - project.start) / totalDuration) * 100;

                      return (
                        <div key={idx} className="flex items-center group">
                          <div className="w-48 flex-shrink-0 pr-4">
                            <div className="font-semibold text-slate-800 text-sm truncate">
                              {project.project}
                            </div>
                            <div className="text-xs text-slate-500">
                              {project.taskCount} tasks
                            </div>
                          </div>

                          <div className="flex-1 relative h-12">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex">
                              {weekLabels.map((_, wIdx) => (
                                <div
                                  key={wIdx}
                                  className="flex-1 border-l border-slate-100"
                                ></div>
                              ))}
                            </div>

                            {/* Project Bar */}
                            <div
                              onClick={() => {
                                setSelectedProject(project.project);
                                setCurrentView("tasks");
                              }}
                              className="absolute top-1 h-10 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                              style={{
                                left: `${projectStartOffset}%`,
                                width: `${projectWidth}%`,
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            >
                              <div className="h-full flex items-center justify-center px-2">
                                <span className="text-white text-xs font-semibold truncate">
                                  {project.startDate.toLocaleDateString(
                                    "en-GB",
                                    { day: "2-digit", month: "short" }
                                  )}{" "}
                                  -{" "}
                                  {project.endDate.toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                              </div>

                              {/* Tooltip on hover */}
                              <div className="hidden group-hover:block absolute -top-16 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-xl">
                                <div className="font-semibold">
                                  {project.project}
                                </div>
                                <div>Duration: {project.duration} days</div>
                                <div>Tasks: {project.taskCount}</div>
                                <div className="text-blue-300 mt-1">
                                  Click to view tasks →
                                </div>
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>
                  No timeline data available. Please ensure tasks have Start
                  Date and Deadline.
                </p>
              </div>
            )}
          </div>

          {/* All Projects List */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              All Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, idx) => {
                const data = projectKpisData.find(p => p.project === project);
                const isCompleted = data.completedCount === data.totalTasks;
                const avgKpi = Math.round(data.projectKpi);
                const completionPercentage = data.totalTasks > 0 ? Math.round((data.completedCount / data.totalTasks) * 100) : 0;

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
                        {data.completedCount}/{data.totalTasks} Tasks
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-3">{project}</h3>
                    <div className="bg-slate-200 rounded-full h-2 overflow-hidden mb-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            data.totalTasks > 0
                              ? (data.completedCount / data.totalTasks) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="mb-2">
                      {isCompleted ? (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                          <p className="text-purple-800 text-sm font-semibold">
                            Project KPI: {avgKpi}%
                          </p>
                          <p className="text-purple-600 text-xs">
                            Project {completionPercentage}% Complete
                          </p>
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <p className="text-blue-800 text-sm font-semibold">
                            Under Progress KPI
                          </p>
                          <p className="text-blue-600 text-xs">
                            Project {completionPercentage}% Complete
                          </p>
                        </div>
                      )}
                      {(() => {
                        // Calculate project valuation
                        let totalValuation = 0;
                        excelData.forEach((row) => {
                          const manager = row.Manager || row.ManagerName;
                          const memberName = row.TeamMember || row.Member || row.Name;
                          const projectName = row.Project || row.ProjectName;

                          if (manager === selectedManager && memberName === selectedMember && projectName === project) {
                            const valuationValue = row.Valuation || row.valuation || row.VALUATION || row['valuation'] || row['VALUATION'] || 0;
                            let parsedValuation = 0;
                            if (valuationValue && valuationValue !== 'N/A' && valuationValue !== '-') {
                              const cleanValue = String(valuationValue).replace(/[₹,\s]/g, '');
                              parsedValuation = parseFloat(cleanValue) || 0;
                            }
                            totalValuation += parsedValuation;
                          }
                        });

                        return totalValuation > 0 ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                            <p className="text-green-800 text-xs font-semibold">
                              Project Valuation: ₹{Math.round(totalValuation).toLocaleString()}
                            </p>
                          </div>
                        ) : null;
                      })()}
                    </div>
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

    // Create Gantt chart data for this project
    const ganttData = tasks.map((task, idx) => {
      const startDate = parseDate(task.startDate);
      const deadline = parseDate(task.deadline);
      const completedDate = task.completedDate !== "-" ? parseDate(task.completedDate) : null;

      if (!startDate || !deadline) return null;

      const actualEnd = completedDate || deadline;
      const isCompleted = (task.status || "").toLowerCase().includes("complete") ||
                         (task.status || "").toLowerCase().includes("done");

  return {
    task: task.name,
    start: startDate.getTime(),
    end: actualEnd.getTime(),
    startDate,
    endDate: actualEnd,
    duration: Math.ceil((actualEnd - startDate) / (1000 * 60 * 60 * 24)),
    status: task.status,
    isCompleted,
    priority: task.priority,
    kpi: task.kpi,
    formattedStartDate: task.startDate,
    formattedDeadline: task.deadline,
    formattedCompletedDate: task.completedDate,
  };
    }).filter(item => item !== null);

    // Find global min and max dates for timeline scale
    let globalMinDate = Infinity;
    let globalMaxDate = -Infinity;

    ganttData.forEach((task) => {
      globalMinDate = Math.min(globalMinDate, task.start);
      globalMaxDate = Math.max(globalMaxDate, task.end);
    });

    // Generate week labels for X-axis
    const generateWeekLabels = () => {
      if (globalMinDate === Infinity || globalMaxDate === -Infinity) return [];

      const labels = [];
      const currentDate = new Date(globalMinDate);

      while (currentDate <= new Date(globalMaxDate)) {
        const weekNum = Math.ceil(currentDate.getDate() / 7);
        const monthName = currentDate.toLocaleDateString("en-US", {
          month: "short",
        });
        labels.push(`${monthName} Wk-${weekNum}`);
        currentDate.setDate(currentDate.getDate() + 7);
      }

      return labels;
    };

    const weekLabels = generateWeekLabels();

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title={selectedProject}
            subtitle={`${selectedMember}'s Tasks`}
          />
          <Breadcrumb />

          {/* Gantt Chart Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Project Gantt Chart Timeline
            </h2>
            <p className="text-slate-600 mb-6">
              Visual timeline showing task stages and completion status
            </p>

            {ganttData.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Timeline Header with Week Labels */}
                  <div className="flex mb-6 pb-4 border-b-2 border-slate-300">
                    <div className="w-48 flex-shrink-0 font-semibold text-slate-700">
                      Tasks
                    </div>
                    <div className="flex-1 flex justify-between text-xs text-slate-600">
                      {weekLabels.map((label, idx) => (
                        <div
                          key={idx}
                          className="flex-1 text-center border-l border-slate-200 px-1"
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Task Timeline Bars */}
                  <div className="space-y-4">
                    {ganttData.map((task, idx) => {
                      const totalDuration = globalMaxDate - globalMinDate;
                      const taskStartOffset = totalDuration > 0 ?
                        ((task.start - globalMinDate) / totalDuration) * 100 : 0;
                      const taskWidth = totalDuration > 0 ?
                        ((task.end - task.start) / totalDuration) * 100 : 0;

                      return (
                        <div key={idx} className="flex items-center group">
                          <div className="w-48 flex-shrink-0 pr-4">
                            <div className="font-semibold text-slate-800 text-sm truncate">
                              {task.task}
                            </div>
                            <div className="text-xs text-slate-500">
                              {task.duration} days
                            </div>
                          </div>

                          <div className="flex-1 relative h-12">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex">
                              {weekLabels.map((_, wIdx) => (
                                <div
                                  key={wIdx}
                                  className="flex-1 border-l border-slate-100"
                                ></div>
                              ))}
                            </div>

                            {/* Task Bar */}
                            <div
                              className="absolute top-1 h-10 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                              style={{
                                left: `${taskStartOffset}%`,
                                width: `${Math.max(taskWidth, 2)}%`,
                                backgroundColor: task.isCompleted ? '#10b981' : '#3b82f6',
                              }}
                            >
                              <div className="h-full flex items-center justify-center px-2">
                                <span className="text-white text-xs font-semibold truncate">
                                  {(() => {
                                    const taskStatus = getTaskStatus(task.deadline, task.completedDate);
                                    const startDateStr = task.startDate.toLocaleDateString("en-GB", {
                                      day: "2-digit", month: "short"
                                    });
                                    const endDateStr = task.endDate.toLocaleDateString("en-GB", {
                                      day: "2-digit", month: "short"
                                    });

                                    if (taskStatus.status === "overdue") {
                                      return `${startDateStr} - ${endDateStr} (${taskStatus.weeksOverdue}w overdue)`;
                                    } else {
                                      return `${startDateStr} - ${endDateStr}`;
                                    }
                                  })()}
                                </span>
                              </div>

                              {/* Tooltip on hover */}
                              <div className="hidden group-hover:block absolute -top-16 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-xl">
                                <div className="font-semibold">{task.task}</div>
                                <div>Status: {task.status}</div>
                                {task.kpi && <div>KPI: {task.kpi}%</div>}
                                <div>Start: {task.formattedStartDate}</div>
                                <div>Deadline: {task.formattedDeadline}</div>
                                <div>Completed: {task.formattedCompletedDate}</div>
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No timeline data available. Please ensure tasks have Start Date and Deadline.</p>
              </div>
            )}
          </div>

          {/* Detailed Tasks Section */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Detailed Task Information
              </h2>
              <div className="bg-blue-50 px-6 py-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  Total:{" "}
                  <span className="font-bold text-blue-600 text-xl">
                    {tasks.length}
                  </span>{" "}
                  Tasks
                </p>
              </div>
            </div>

            {/* Timeline View */}
            <div className="mb-8">
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                <div className="space-y-6">
                  {tasks.map((task, idx) => {
                    const overdue = isOverdue(
                      task.deadline,
                      task.completedDate
                    );
                    const isCompleted =
                      (task.status || "").toLowerCase().includes("complete") ||
                      (task.status || "").toLowerCase().includes("done");

                    return (
                      <div key={idx} className="relative pl-20">
                        <div
                          className={`absolute left-6 w-5 h-5 rounded-full border-4 border-white shadow-md ${
                            isCompleted ? "bg-green-500" : "bg-blue-500"
                          }`}
                        ></div>

                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all border border-slate-200 hover:border-blue-300">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-slate-800 mb-2">
                                {task.name}
                              </h4>
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

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 bg-white rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium">
                                  Start Date
                                </p>
                                <p className="text-slate-800 font-bold text-sm">
                                  {task.startDate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="bg-orange-100 p-2 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium">
                                  Deadline
                                </p>
                                <p className="text-slate-800 font-bold text-sm">
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
                                  className={`font-bold text-sm ${
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
                              <div className="bg-purple-100 p-2 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium">
                                  KPI
                                </p>
                                <p
                                  className={`font-bold text-sm ${
                                    task.kpi === null
                                      ? "text-slate-400"
                                      : task.kpi >= 80
                                      ? "text-green-600"
                                      : task.kpi >= 60
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {task.kpi !== null ? `${task.kpi}%` : "N/A"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div
                                className={`${
                                  overdue ? "bg-red-100" : "bg-green-100"
                                } p-2 rounded-lg`}
                              >
                                {overdue ? (
                                  <AlertCircle className="w-5 h-5 text-red-600" />
                                ) : (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium">
                                  Status
                                </p>
                                <p
                                  className={`font-bold text-sm ${
                                    overdue ? "text-red-600" : "text-green-600"
                                  }`}
                                >
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

  // All Members View
  if (currentView === "all-members" && selectedManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title="All Team Members"
            subtitle={`${selectedManager}'s Team`}
          />
          <Breadcrumb />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamData.map((member, idx) => {
              const completedTasks = member.completedTasks;
              const inProgressTasks = member.totalTasks - member.completedTasks;
              const overallKpi = member.kpi;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedMember(member.name);
                    setCurrentView("member");
                  }}
                  className="bg-white rounded-xl p-6 shadow-lg cursor-pointer hover:scale-105 hover:shadow-2xl transition-all border border-slate-200 hover:border-blue-300"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    >
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        {member.name}
                      </h3>
                      <p className="text-slate-500">{member.role}</p>
                    </div>
                  </div>

                  {/* KPI Section */}
                  <div className="bg-indigo-50 rounded-lg p-3 mb-4 border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-600 font-medium text-sm">Overall KPI</span>
                      <span className={`font-bold text-lg ${
                        overallKpi >= 80 ? 'text-green-600' :
                        overallKpi >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>{overallKpi}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 text-xs font-medium">Completed</span>
                      </div>
                      <p className="text-green-700 font-bold text-lg">{completedTasks}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600 text-xs font-medium">In Progress</span>
                      </div>
                      <p className="text-blue-700 font-bold text-lg">{inProgressTasks}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Tasks</span>
                      <span className="font-bold text-slate-800">
                        {member.totalTasks}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Projects</span>
                      <span className="font-bold text-purple-600">
                        {member.projectCount}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-bold text-slate-800">
                        {member.percentage}%
                      </span>
                    </div>
                    <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                        style={{ width: `${member.percentage}%` }}
                      />
                    </div>
                  </div>
                  {(() => {
                    // Calculate member valuation
                    let totalValuation = 0;
                    excelData.forEach((row) => {
                      const manager = row.Manager || row.ManagerName;
                      const memberName = row.TeamMember || row.Member || row.Name;

                      if (manager === selectedManager && memberName === member.name) {
                        const valuationValue = row.Valuation || row.valuation || row.VALUATION || row['valuation'] || row['VALUATION'] || 0;
                        let parsedValuation = 0;
                        if (valuationValue && valuationValue !== 'N/A' && valuationValue !== '-') {
                          const cleanValue = String(valuationValue).replace(/[₹,\s]/g, '');
                          parsedValuation = parseFloat(cleanValue) || 0;
                        }
                        totalValuation += parsedValuation;
                      }
                    });

                    return totalValuation > 0 ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-green-800 text-xs font-semibold">
                          Valuation: ₹{Math.round(totalValuation).toLocaleString()}
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // All Projects View
  if (currentView === "all-projects" && selectedManager) {
    // Get all unique projects for this manager's team
    const projectsMap = {};
    teamData.forEach((member) => {
      excelData.forEach((row) => {
        const manager = row.Manager || row.ManagerName;
        const memberName = row.TeamMember || row.Member || row.Name;
        const project = row.Project || row.ProjectName;

        if (
          manager === selectedManager &&
          memberName === member.name &&
          project
        ) {
          if (!projectsMap[project]) {
            projectsMap[project] = {
              name: project,
              totalTasks: 0,
              completedTasks: 0,
              members: new Set(),
              startDates: [],
              endDates: [],
              kpis: [],
            };
          }
          projectsMap[project].totalTasks++;
          const status = (row.Status || "").toLowerCase();
          if (
            status.includes("completed") ||
            status.includes("complete") ||
            status.includes("done")
          ) {
            projectsMap[project].completedTasks++;
          }
          projectsMap[project].members.add(memberName);

          const startDate = row.StartDate;
          const deadline = row.Deadline || row.DueDate;
          const completedDate = row.CompletedDate || row.ActualDate || row.CompletionDate;

          const formattedStart = formatExcelDate(startDate);
          const formattedDeadline = formatExcelDate(deadline);
          const formattedCompleted = formatExcelDate(completedDate);

          const kpi = calculateKPI(formattedStart, formattedCompleted, formattedDeadline);

          if (kpi !== null) {
            projectsMap[project].kpis.push(kpi);
          }

          if (startDate)
            projectsMap[project].startDates.push(
              parseDate(formattedStart)
            );
          if (deadline)
            projectsMap[project].endDates.push(
              parseDate(formattedDeadline)
            );
        }
      });
    });

    const projectsData = Object.values(projectsMap).map((project) => {
      const isCompleted = project.completedTasks === project.totalTasks;
      const avgKpi = project.kpis.length > 0 ? Math.round(project.kpis.reduce((a, b) => a + b, 0) / project.kpis.length) : null;
      const completionPercentage = project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0;

      return {
        ...project,
        isCompleted,
        avgKpi,
        completionPercentage,
      };
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title="All Projects"
            subtitle={`${selectedManager}'s Team Projects`}
          />
          <Breadcrumb />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsData.map((project, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedProject(project.name);
                  setCurrentView("all-tasks");
                }}
                className="bg-white rounded-xl p-6 shadow-lg cursor-pointer hover:scale-105 hover:shadow-2xl transition-all border border-slate-200 hover:border-blue-300"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  >
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {project.name}
                    </h3>
                    <p className="text-slate-500">
                      {project.members.size} team members
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Tasks</span>
                    <span className="font-bold text-slate-800">
                      {project.totalTasks}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Completed</span>
                    <span className="font-bold text-green-600">
                      {project.completedTasks}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Progress</span>
                    <span className="font-bold text-slate-800">
                      {Math.round(
                        project.totalTasks > 0
                          ? (project.completedTasks / project.totalTasks) * 100
                          : 0
                      )}
                      %
                    </span>
                  </div>
                  {(() => {
                    // Calculate project valuation
                    let totalValuation = 0;
                    excelData.forEach((row) => {
                      const manager = row.Manager || row.ManagerName;
                      const projectName = row.Project || row.ProjectName;

                      if (manager === selectedManager && projectName === project.name) {
                        const valuationValue = row.Valuation || row.valuation || row.VALUATION || row['valuation'] || row['VALUATION'] || 0;
                        let parsedValuation = 0;
                        if (valuationValue && valuationValue !== 'N/A' && valuationValue !== '-') {
                          const cleanValue = String(valuationValue).replace(/[₹,\s]/g, '');
                          parsedValuation = parseFloat(cleanValue) || 0;
                        }
                        totalValuation += parsedValuation;
                      }
                    });

                    return totalValuation > 0 ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Project Valuation</span>
                        <span className="font-bold text-green-600">
                          ₹{Math.round(totalValuation).toLocaleString()}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="mb-4">
                  <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${
                          project.totalTasks > 0
                            ? (project.completedTasks / project.totalTasks) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  {project.isCompleted ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-purple-800 text-sm font-semibold">
                        Project KPI: {project.avgKpi !== null ? `${project.avgKpi}%` : "N/A"}
                      </p>
                      <p className="text-purple-600 text-xs mt-1">
                        Project {project.completionPercentage}% Complete
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm font-semibold">
                        Under Progress KPI
                      </p>
                      <p className="text-blue-600 text-xs mt-1">
                        Project {project.completionPercentage}% Complete
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {Array.from(project.members).map((memberName, memberIdx) => (
                    <span
                      key={memberIdx}
                      className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full"
                    >
                      {memberName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // All Completions View
  if (currentView === "all-completions" && selectedManager) {
    // Get all completed tasks with dates
    const completedTasks = excelData
      .filter((row) => {
        const manager = row.Manager || row.ManagerName;
        const status = (row.Status || "").toLowerCase();
        return (
          manager === selectedManager &&
          (status.includes("completed") ||
            status.includes("complete") ||
            status.includes("done"))
        );
      })
      .map((row) => {
        const completedDate = formatExcelDate(
          row.CompletedDate || row.ActualDate || row.CompletionDate
        );
        return {
          taskName: row.Task || row.TaskName || "Unnamed Task",
          memberName: row.TeamMember || row.Member || row.Name,
          projectName: row.Project || row.ProjectName,
          completedDate,
          priority: row.Priority || "Medium",
          startDate: formatExcelDate(row.StartDate),
          deadline: formatExcelDate(row.Deadline || row.DueDate),
        };
      })
      .sort((a, b) => {
        if (a.completedDate === "-" && b.completedDate === "-") return 0;
        if (a.completedDate === "-") return 1;
        if (b.completedDate === "-") return -1;
        const dateA = parseDate(a.completedDate);
        const dateB = parseDate(b.completedDate);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA; // Most recent first
      });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title="All Completions"
            subtitle={`${selectedManager}'s Completed Tasks`}
          />
          <Breadcrumb />

          <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Completed Tasks Timeline
              </h2>
              <div className="bg-green-50 px-6 py-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  Total Completions:{" "}
                  <span className="font-bold text-green-600 text-xl">
                    {completedTasks.length}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {completedTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-slate-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-800 mb-2">
                        {task.taskName}
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-green-500 shadow-sm">
                          ✓ Completed
                        </span>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-slate-700 shadow-sm">
                          Priority: {task.priority}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Assigned to</p>
                      <p className="font-bold text-slate-800">
                        {task.memberName}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">
                          Project
                        </p>
                        <p className="text-slate-800 font-bold text-sm">
                          {task.projectName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">
                          Team Member
                        </p>
                        <p className="text-slate-800 font-bold text-sm">
                          {task.memberName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">
                          Deadline
                        </p>
                        <p
                          className={`font-bold text-sm ${
                            task.deadline === "N/A"
                              ? "text-slate-400"
                              : "text-slate-800"
                          }`}
                        >
                          {task.deadline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">
                          Completed On
                        </p>
                        <p
                          className={`font-bold text-sm ${
                            task.completedDate === "-"
                              ? "text-slate-400"
                              : "text-green-600"
                          }`}
                        >
                          {task.completedDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {completedTasks.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                  <p className="text-slate-500 text-lg">
                    No completed tasks yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // All Tasks View
  if (currentView === "all-tasks" && selectedManager) {
    // Get all tasks for the selected manager
    let allTasks = [];
    let projectName = selectedProject;

    if (selectedProject) {
      // Show tasks for a specific project
      allTasks = excelData
        .filter((row) => {
          const manager = row.Manager || row.ManagerName;
          const project = row.Project || row.ProjectName;
          return manager === selectedManager && project === selectedProject;
        })
        .map((row) => {
          const deadline = formatExcelDate(
            row.Deadline || row.DueDate || "N/A"
          );
          const completedDate = formatExcelDate(
            row.CompletedDate || row.ActualDate || row.CompletionDate || "-"
          );
          const startDate = formatExcelDate(row.StartDate || "-");
          const kpi = calculateKPI(startDate, completedDate, deadline);

          return {
            name: row.Task || row.TaskName || "Unnamed Task",
            status: row.Status || "Pending",
            deadline,
            completedDate,
            priority: row.Priority || "Medium",
            startDate,
            kpi,
            memberName: row.TeamMember || row.Member || row.Name,
            projectName: row.Project || row.ProjectName,
          };
        });
    } else {
      // Show all tasks for all projects
      let tasksData = excelData
        .filter((row) => {
          const manager = row.Manager || row.ManagerName;
          return manager === selectedManager;
        })
        .map((row) => {
          const deadline = formatExcelDate(
            row.Deadline || row.DueDate || "N/A"
          );
          const completedDate = formatExcelDate(
            row.CompletedDate || row.ActualDate || row.CompletionDate || "-"
          );
          const startDate = formatExcelDate(row.StartDate || "-");
          const kpi = calculateKPI(startDate, completedDate, deadline);

          return {
            name: row.Task || row.TaskName || "Unnamed Task",
            status: row.Status || "Pending",
            deadline,
            completedDate,
            priority: row.Priority || "Medium",
            startDate,
            kpi,
            memberName: row.TeamMember || row.Member || row.Name,
            projectName: row.Project || row.ProjectName,
          };
        });

      // Apply all advanced filters
      if (selectedProjectFilters.length > 0) {
        tasksData = tasksData.filter(task => selectedProjectFilters.includes(task.projectName));
      }

      if (selectedStatusFilters.length > 0) {
        tasksData = tasksData.filter(task => {
          // Map UI status names to actual task status values
          return selectedStatusFilters.some(selectedStatus => {
            const taskStatus = (task.status || "").toLowerCase().trim();
            const selectedStatusLower = selectedStatus.toLowerCase();

            if (selectedStatusLower === 'completed') {
              return taskStatus.includes('complete') || taskStatus.includes('done');
            } else if (selectedStatusLower === 'pending') {
              return taskStatus.includes('pending') || taskStatus.includes('waiting') || taskStatus === '';
            } else if (selectedStatusLower === 'in progress') {
              return taskStatus.includes('progress') || taskStatus.includes('active') || taskStatus.includes('started') || taskStatus.includes('in progress');
            } else if (selectedStatusLower === 'blocked') {
              return taskStatus.includes('block');
            }
            return false;
          });
        });
      }

      if (selectedTimingFilters.length > 0) {
        tasksData = tasksData.filter(task => {
          const overdue = isOverdue(task.deadline, task.completedDate);
          return selectedTimingFilters.some(timing => {
            if (timing === 'On Time') return !overdue;
            if (timing === 'Overdue') return overdue;
            return false;
          });
        });
      }

      if (selectedKpiFilters.length > 0) {
        tasksData = tasksData.filter(task => {
          if (task.kpi === null) return false;

          return selectedKpiFilters.some(kpiRange => {
            if (kpiRange === 'Below 50%') return task.kpi < 50;
            if (kpiRange === '50-60%') return task.kpi >= 50 && task.kpi < 60;
            if (kpiRange === '60-70%') return task.kpi >= 60 && task.kpi < 70;
            if (kpiRange === '70-80%') return task.kpi >= 70 && task.kpi < 80;
            if (kpiRange === '80-90%') return task.kpi >= 80 && task.kpi < 90;
            if (kpiRange === '90%+') return task.kpi >= 90;
            return false;
          });
        });
      }

      allTasks = tasksData;
    }

    allTasks.sort((a, b) => {
      const dateA = parseDate(a.deadline);
      const dateB = parseDate(b.deadline);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB;
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title={projectName ? `All Tasks - ${projectName}` : "All Tasks"}
            subtitle={`${selectedManager}'s Team Tasks`}
          />
          <Breadcrumb />

          <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {projectName ? `${projectName} Tasks` : "All Team Tasks"}
              </h2>
              <div className="flex items-center gap-4">
                {!selectedProject && (
                  <div className="relative">
                    <button
                      onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {[...selectedProjectFilters, ...selectedStatusFilters, ...selectedTimingFilters, ...selectedKpiFilters].length > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {[...selectedProjectFilters, ...selectedStatusFilters, ...selectedTimingFilters, ...selectedKpiFilters].length}
                        </span>
                      )}
                    </button>

                    {isFiltersOpen && (
                      <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-slate-800">Advanced Filters</h4>
                            <button
                              onClick={() => setIsFiltersOpen(false)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Projects Filter */}
                          <div className="mb-4">
                            <h5 className="font-medium text-slate-700 mb-2">Projects</h5>
                            <div className="space-y-2">
                              {(() => {
                                const projectsSet = new Set();
                                excelData.forEach(row => {
                                  const manager = row.Manager || row.ManagerName;
                                  const project = row.Project || row.ProjectName;
                                  if (manager === selectedManager && project) {
                                    projectsSet.add(project);
                                  }
                                });
                                return Array.from(projectsSet).sort().map((project) => (
                                  <label key={project} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={selectedProjectFilters.includes(project)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedProjectFilters([...selectedProjectFilters, project]);
                                        } else {
                                          setSelectedProjectFilters(selectedProjectFilters.filter(p => p !== project));
                                        }
                                      }}
                                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">{project}</span>
                                  </label>
                                ));
                              })()}
                            </div>
                          </div>

                          {/* Status Filter */}
                          <div className="mb-4">
                            <h5 className="font-medium text-slate-700 mb-2">Status</h5>
                            <div className="space-y-2">
                              {['Completed', 'Pending', 'In Progress', 'Blocked'].map((status) => (
                                <label key={status} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedStatusFilters.includes(status)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStatusFilters([...selectedStatusFilters, status]);
                                      } else {
                                        setSelectedStatusFilters(selectedStatusFilters.filter(s => s !== status));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-slate-700">{status}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Time Status Filter */}
                          <div className="mb-4">
                            <h5 className="font-medium text-slate-700 mb-2">Time Status</h5>
                            <div className="space-y-2">
                              {['On Time', 'Overdue'].map((timing) => (
                                <label key={timing} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedTimingFilters.includes(timing)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedTimingFilters([...selectedTimingFilters, timing]);
                                      } else {
                                        setSelectedTimingFilters(selectedTimingFilters.filter(t => t !== timing));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-slate-700">{timing}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* KPI Range Filter */}
                          <div className="mb-4">
                            <h5 className="font-medium text-slate-700 mb-2">KPI Range</h5>
                            <div className="space-y-2">
                              {['Below 50%', '50-60%', '60-70%', '70-80%', '80-90%', '90%+'].map((kpiRange) => (
                                <label key={kpiRange} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedKpiFilters.includes(kpiRange)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedKpiFilters([...selectedKpiFilters, kpiRange]);
                                      } else {
                                        setSelectedKpiFilters(selectedKpiFilters.filter(k => k !== kpiRange));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-slate-700">{kpiRange}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4 border-t border-slate-200">
                            <button
                              onClick={() => {
                                setSelectedProjectFilters([]);
                                setSelectedStatusFilters([]);
                                setSelectedTimingFilters([]);
                                setSelectedKpiFilters([]);
                              }}
                              className="flex-1 px-4 py-2 text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              Clear All
                            </button>
                            <button
                              onClick={() => setIsFiltersOpen(false)}
                              className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              Apply Filters
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="bg-blue-50 px-6 py-3 rounded-lg">
                  <p className="text-sm text-slate-600">
                    Total Tasks:{" "}
                    <span className="font-bold text-blue-600 text-xl">
                      {allTasks.length}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {!selectedProject && [...selectedProjectFilters, ...selectedStatusFilters, ...selectedTimingFilters, ...selectedKpiFilters].length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                {selectedProjectFilters.map(filter => (
                  <span key={`project-${filter}`} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {filter}
                    <button
                      onClick={() => setSelectedProjectFilters(selectedProjectFilters.filter(f => f !== filter))}
                      className="hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedStatusFilters.map(filter => (
                  <span key={`status-${filter}`} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {filter}
                    <button
                      onClick={() => setSelectedStatusFilters(selectedStatusFilters.filter(f => f !== filter))}
                      className="hover:text-green-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedTimingFilters.map(filter => (
                  <span key={`timing-${filter}`} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    {filter}
                    <button
                      onClick={() => setSelectedTimingFilters(selectedTimingFilters.filter(f => f !== filter))}
                      className="hover:text-orange-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedKpiFilters.map(filter => (
                  <span key={`kpi-${filter}`} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {filter}
                    <button
                      onClick={() => setSelectedKpiFilters(selectedKpiFilters.filter(f => f !== filter))}
                      className="hover:text-purple-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200"></div>
              <div className="space-y-6">
                {allTasks.map((task, idx) => {
                  const overdue = isOverdue(task.deadline, task.completedDate);
                  const isCompleted =
                    (task.status || "").toLowerCase().includes("complete") ||
                    (task.status || "").toLowerCase().includes("done");

                  return (
                    <div key={idx} className="relative pl-20">
                      <div
                        className={`absolute left-6 w-5 h-5 rounded-full border-4 border-white shadow-md ${
                          isCompleted ? "bg-green-500" : "bg-blue-500"
                        }`}
                      ></div>

                      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all border border-slate-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 mb-2">
                              {task.name}
                            </h4>
                            <div className="flex gap-2 flex-wrap mb-2">
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
                            <div className="flex gap-4 text-sm">
                              <span className="text-slate-600">
                                Project:{" "}
                                <span className="font-semibold">
                                  {task.projectName}
                                </span>
                              </span>
                              <span className="text-slate-600">
                                Assigned:{" "}
                                <span className="font-semibold">
                                  {task.memberName}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 bg-white rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Start Date
                              </p>
                              <p className="text-slate-800 font-bold text-sm">
                                {task.startDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Deadline
                              </p>
                              <p className="text-slate-800 font-bold text-sm">
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
                                className={`font-bold text-sm ${
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
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <BarChart3 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                KPI
                              </p>
                              <p
                                className={`font-bold text-sm ${
                                  task.kpi === null
                                    ? "text-slate-400"
                                    : task.kpi >= 80
                                    ? "text-green-600"
                                    : task.kpi >= 60
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {task.kpi !== null ? `${task.kpi}%` : "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className={`${
                                overdue ? "bg-red-100" : "bg-green-100"
                              } p-2 rounded-lg`}
                            >
                              {overdue ? (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Status
                              </p>
                              <p
                                className={`font-bold text-sm ${
                                  overdue ? "text-red-600" : "text-green-600"
                                }`}
                              >
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

            {allTasks.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
                <p className="text-slate-500 text-lg">No tasks found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // In Progress Tasks View
  if (currentView === "in-progress-tasks" && selectedManager) {
    // Get all tasks for the selected manager that are NOT completed
    let inProgressTasks = excelData
      .filter((row) => {
        const manager = row.Manager || row.ManagerName;
        if (manager !== selectedManager) return false;

        const status = (row.Status || "").toLowerCase();
        // Include tasks that are NOT fully completed
        return !(
          status.includes("completed") ||
          status.includes("complete") ||
          status.includes("done")
        );
      })
      .map((row) => {
        const deadline = formatExcelDate(
          row.Deadline || row.DueDate || "N/A"
        );
        const completedDate = formatExcelDate(
          row.CompletedDate || row.ActualDate || row.CompletionDate || "-"
        );
        const startDate = formatExcelDate(row.StartDate || "-");
        const kpi = calculateKPI(startDate, completedDate, deadline);

        return {
          name: row.Task || row.TaskName || "Unnamed Task",
          status: row.Status || "Pending",
          deadline,
          completedDate,
          priority: row.Priority || "Medium",
          startDate,
          kpi,
          memberName: row.TeamMember || row.Member || row.Name,
          projectName: row.Project || row.ProjectName,
        };
      })
      .sort((a, b) => {
        const dateA = parseDate(a.deadline);
        const dateB = parseDate(b.deadline);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
      });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title="In Progress Tasks"
            subtitle="Tasks Not Yet Completed"
          />
          <Breadcrumb />

          <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Tasks in Progress
              </h2>
              <div className="bg-blue-50 px-6 py-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  Tasks in Progress:{" "}
                  <span className="font-bold text-blue-600 text-xl">
                    {inProgressTasks.length}
                  </span>
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200"></div>
              <div className="space-y-6">
                {inProgressTasks.map((task, idx) => {
                  const overdue = isOverdue(task.deadline, task.completedDate);
                  const isCompleted =
                    (task.status || "").toLowerCase().includes("complete") ||
                    (task.status || "").toLowerCase().includes("done");

                  return (
                    <div key={idx} className="relative pl-20">
                      <div
                        className={`absolute left-6 w-5 h-5 rounded-full border-4 border-white shadow-md ${
                          overdue ? "bg-red-500" : "bg-yellow-500"
                        }`}
                      ></div>

                      <div className="bg-gradient-to-r from-slate-50 to-yellow-50 rounded-xl p-6 hover:shadow-lg transition-all border border-slate-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 mb-2">
                              {task.name}
                            </h4>
                            <div className="flex gap-2 flex-wrap mb-2">
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
                              {overdue && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-red-500 shadow-sm">
                                  ⚠️ Overdue
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="text-slate-600">
                                Project:{" "}
                                <span className="font-semibold">
                                  {task.projectName}
                                </span>
                              </span>
                              <span className="text-slate-600">
                                Assigned:{" "}
                                <span className="font-semibold">
                                  {task.memberName}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 bg-white rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Start Date
                              </p>
                              <p className="text-slate-800 font-bold text-sm">
                                {task.startDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Deadline
                              </p>
                              <p className="text-slate-800 font-bold text-sm">
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
                                className={`font-bold text-sm ${
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
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <BarChart3 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                KPI
                              </p>
                              <p
                                className={`font-bold text-sm ${
                                  task.kpi === null
                                    ? "text-slate-400"
                                    : task.kpi >= 80
                                    ? "text-green-600"
                                    : task.kpi >= 60
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {task.kpi !== null ? `${task.kpi}%` : "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className={`${
                                overdue ? "bg-red-100" : "bg-yellow-100"
                              } p-2 rounded-lg`}
                            >
                              {overdue ? (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-yellow-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Status
                              </p>
                              <p
                                className={`font-bold text-sm ${
                                  overdue ? "text-red-600" : "text-yellow-600"
                                }`}
                              >
                                {overdue ? "⚠️ Overdue" : "⏳ In Progress"}
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

            {inProgressTasks.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                <p className="text-slate-500 text-lg">All tasks are completed!</p>
                <p className="text-slate-400 text-sm">No tasks currently in progress.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Overdue Tasks View
  if (currentView === "overdue-tasks" && selectedManager) {
    // Get all overdue tasks for the selected manager
    let overdueTasks = excelData
      .filter((row) => {
        const manager = row.Manager || row.ManagerName;
        if (manager !== selectedManager) return false;

        const deadline = formatExcelDate(row.Deadline || row.DueDate || "N/A");
        const completedDate = formatExcelDate(row.CompletedDate || row.ActualDate || row.CompletionDate || "-");
        const status = (row.Status || "").toLowerCase();

        // Include tasks that are overdue (past deadline but not completed)
        return status.includes("completed") || status.includes("complete") || status.includes("done")
          ? completedDate !== "-" && deadline !== "N/A" && parseDate(completedDate) > parseDate(deadline)
          : deadline !== "N/A" && new Date() > parseDate(deadline);
      })
      .map((row) => {
        const deadline = formatExcelDate(
          row.Deadline || row.DueDate || "N/A"
        );
        const completedDate = formatExcelDate(
          row.CompletedDate || row.ActualDate || row.CompletionDate || "-"
        );
        const startDate = formatExcelDate(row.StartDate || "-");
        const kpi = calculateKPI(startDate, completedDate, deadline);

        return {
          name: row.Task || row.TaskName || "Unnamed Task",
          status: row.Status || "Pending",
          deadline,
          completedDate,
          priority: row.Priority || "Medium",
          startDate,
          kpi,
          memberName: row.TeamMember || row.Member || row.Name,
          projectName: row.Project || row.ProjectName,
        };
      })
      .sort((a, b) => {
        const dateA = parseDate(a.deadline);
        const dateB = parseDate(b.deadline);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
      });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title="Overdue Tasks"
            subtitle={`${selectedManager}'s Team - Tasks That Need Immediate Attention`}
          />
          <Breadcrumb />

          <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-800">
                🚨 Overdue Tasks Alert
              </h2>
              <div className="bg-red-50 px-6 py-3 rounded-lg">
                <p className="text-sm text-red-700">
                  Tasks Requiring Attention:{" "}
                  <span className="font-bold text-red-900 text-xl">
                    {overdueTasks.length}
                  </span>
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-red-200"></div>
              <div className="space-y-6">
                {overdueTasks.map((task, idx) => {
                  const overdue = isOverdue(task.deadline, task.completedDate);
                  const daysOverdue = overdue ? Math.ceil((new Date() - parseDate(task.deadline)) / (1000 * 60 * 60 * 24)) : 0;
                  const isCompleted =
                    (task.status || "").toLowerCase().includes("complete") ||
                    (task.status || "").toLowerCase().includes("done");

                  return (
                    <div key={idx} className="relative pl-20">
                      <div
                        className={`absolute left-6 w-5 h-5 rounded-full border-4 border-white shadow-md ${
                          isCompleted ? "bg-red-600" : "bg-red-500"
                        }`}
                      ></div>

                      <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 hover:shadow-lg transition-all border border-red-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 mb-2">
                              {task.name}
                            </h4>
                            <div className="flex gap-2 flex-wrap mb-2">
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
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-red-600 shadow-sm">
                                ⚠️ {Math.max(1, Math.ceil(daysOverdue / 7))} weeks overdue
                              </span>
                              {isCompleted && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-red-700 shadow-sm">
                                  Completed Late
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="text-slate-600">
                                Project:{" "}
                                <span className="font-semibold">
                                  {task.projectName}
                                </span>
                              </span>
                              <span className="text-slate-600">
                                Assigned:{" "}
                                <span className="font-semibold">
                                  {task.memberName}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 bg-white rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Start Date
                              </p>
                              <p className="text-slate-800 font-bold text-sm">
                                {task.startDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Deadline
                              </p>
                              <p className="text-red-600 font-bold text-sm">
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
                                className={`font-bold text-sm ${
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
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <BarChart3 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                KPI
                              </p>
                              <p
                                className={`font-bold text-sm ${
                                  task.kpi === null
                                    ? "text-slate-400"
                                    : task.kpi >= 80
                                    ? "text-green-600"
                                    : task.kpi >= 60
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {task.kpi !== null ? `${task.kpi}%` : "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className={`${
                                overdue ? "bg-red-100" : "bg-green-100"
                              } p-2 rounded-lg`}
                            >
                              {overdue ? (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">
                                Status
                              </p>
                              <p
                                className={`font-bold text-sm ${
                                  overdue ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {overdue ? `🚨 ${Math.max(1, Math.ceil(daysOverdue / 7))} weeks overdue` : "✓ On Time"}
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

            {overdueTasks.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                <p className="text-slate-500 text-lg">No overdue tasks! 🎉</p>
                <p className="text-slate-400 text-sm">All tasks are on time or completed.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Team KPI Breakdown View
  if (currentView === "team-kpi-breakdown" && selectedManager) {
    const managerInfo = managers.find((m) => m.name === selectedManager);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title="Team KPI Breakdown"
            subtitle={`${selectedManager}'s Individual Team Member KPIs`}
          />
          <Breadcrumb />

          {/* Summary Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Team Average KPI: {managerInfo?.averageKpi}%</h2>
                <p className="text-slate-600">Calculated from {teamData.length} team members</p>
              </div>
              <div className="bg-indigo-50 px-6 py-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  Team Members:{" "}
                  <span className="font-bold text-indigo-600 text-xl">
                    {teamData.length}
                  </span>
                </p>
              </div>
            </div>

            {/* KPI Distribution Chart */}
            <div className="h-80 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={teamData.sort((a, b) => b.kpi - a.kpi)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#374151' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#374151' }}
                    label={{ value: 'KPI (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
                            <p className="font-bold text-slate-800 mb-2">
                              {data.name}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold">KPI:</span> {data.kpi}%
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold">Role:</span> {data.role}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold">Tasks:</span> {data.completedTasks}/{data.totalTasks}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold">Progress:</span> {data.percentage}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="kpi" radius={[4, 4, 0, 0]}>
                    {teamData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.kpi >= 80 ? '#10b981' :
                          entry.kpi >= 60 ? '#f59e0b' : '#ef4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Team Members KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamData
                .sort((a, b) => b.kpi - a.kpi)
                .map((member, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedMember(member.name);
                      setCurrentView("member");
                    }}
                    className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer border border-slate-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor:
                              member.kpi >= 80 ? '#10b981' :
                              member.kpi >= 60 ? '#f59e0b' : '#ef4444'
                          }}
                        >
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{member.name}</h4>
                          <p className="text-xs text-slate-500">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          member.kpi >= 80 ? 'text-green-600' :
                          member.kpi >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {member.kpi}%
                        </p>
                        <p className="text-xs text-slate-500">KPI</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Tasks Completed</span>
                        <span className="font-semibold text-slate-800">
                          {member.completedTasks}/{member.totalTasks}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-semibold text-slate-800">
                          {member.percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Projects</span>
                        <span className="font-semibold text-purple-600">
                          {member.projectCount}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${member.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        member.kpi >= 80 ? 'bg-green-100 text-green-800' :
                        member.kpi >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {member.kpi >= 80 ? 'High Performer' :
                         member.kpi >= 60 ? 'Good Performance' : 'Needs Attention'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Performance Details View
  if (currentView === "performance-details" && selectedManager) {
    // Categorize members
    const highPerformers = teamData.filter(member => member.kpi >= 80);
    const goodPerformers = teamData.filter(member => member.kpi >= 60 && member.kpi < 80);
    const needsAttention = teamData.filter(member => member.kpi < 60);

    // Prepare data for success matrix bar chart
    const successMatrixData = [
      {
        category: 'High Performers',
        count: highPerformers.length,
        percentage: teamData.length > 0 ? Math.round((highPerformers.length / teamData.length) * 100) : 0,
        color: '#10b981',
        description: '≥80% KPI'
      },
      {
        category: 'Good Performance',
        count: goodPerformers.length,
        percentage: teamData.length > 0 ? Math.round((goodPerformers.length / teamData.length) * 100) : 0,
        color: '#f59e0b',
        description: '60-79% KPI'
      },
      {
        category: 'Needs Attention',
        count: needsAttention.length,
        percentage: teamData.length > 0 ? Math.round((needsAttention.length / teamData.length) * 100) : 0,
        color: '#ef4444',
        description: '<60% KPI'
      }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Header
            title="Performance Details"
            subtitle={`${selectedManager}'s Team Performance Breakdown`}
          />
          <Breadcrumb />

          {/* Success Matrix Summary Bar Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Success Matrix Summary</h2>
                <p className="text-slate-600">Team performance distribution across KPI ranges</p>
              </div>
              <div className="bg-blue-50 px-6 py-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  Total Team Members:{" "}
                  <span className="font-bold text-blue-600 text-xl">
                    {teamData.length}
                  </span>
                </p>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={successMatrixData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  barCategoryGap="20%"
                >
                  <XAxis
                    dataKey="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#374151' }}
                    interval={0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#374151' }}
                    label={{ value: 'Number of Members', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-lg shadow-xl border border-slate-200">
                            <p className="font-bold text-slate-800 mb-2">
                              {data.category}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold">Members:</span> {data.count}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold">Percentage:</span> {data.percentage}%
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold">KPI Range:</span> {data.description}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {successMatrixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {successMatrixData.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">{item.category}</span>
                    <span className="text-lg font-bold" style={{ color: item.color }}>
                      {item.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{item.description}</span>
                    <span className="text-sm font-semibold text-slate-700">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High Performers Section */}
          {highPerformers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">High Performers (≥80% KPI)</h2>
                  <p className="text-slate-600">{highPerformers.length} team members</p>
                </div>
              </div>

              <div className="space-y-4">
                {highPerformers.map((member, idx) => {
                  // Calculate project KPIs for this member
                  const memberProjects = {};
                  excelData.forEach((row) => {
                    const manager = row.Manager || row.ManagerName;
                    const memberName = row.TeamMember || row.Member || row.Name;
                    const project = row.Project || row.ProjectName;

                    if (manager === selectedManager && memberName === member.name && project) {
                      if (!memberProjects[project]) {
                        memberProjects[project] = {
                          name: project,
                          totalTasks: 0,
                          completedTasks: 0,
                          kpis: [],
                          tasks: [],
                        };
                      }
                      memberProjects[project].totalTasks++;
                      const status = (row.Status || "").toLowerCase();
                      if (
                        status.includes("completed") ||
                        status.includes("complete") ||
                        status.includes("done")
                      ) {
                        memberProjects[project].completedTasks++;
                      }
                      const kpi = calculateKPI(
                        formatExcelDate(row.StartDate),
                        formatExcelDate(row.CompletedDate || row.ActualDate || row.CompletionDate || "-"),
                        formatExcelDate(row.Deadline || row.DueDate)
                      );
                      if (kpi !== null) {
                        memberProjects[project].kpis.push(kpi);
                      }
                    }
                  });

                  const projectsWithKPIs = Object.values(memberProjects).map(project => ({
                    ...project,
                    avgKpi: project.kpis.length > 0 ? Math.round(project.kpis.reduce((a, b) => a + b, 0) / project.kpis.length) : 0,
                    completionPercentage: project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0,
                  }));

                  return (
                    <div key={idx} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{member.name}</h3>
                            <p className="text-slate-600">{member.role}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-green-700 font-semibold">
                                Overall KPI: {member.kpi}%
                              </span>
                              <span className="text-sm text-slate-600">
                                Progress: {member.percentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projectsWithKPIs.map((project, pidx) => (
                          <div key={pidx} className="bg-white rounded-lg p-4 shadow-sm">
                            <h4 className="font-semibold text-slate-800 mb-2">{project.name}</h4>
                            <div className="space-y-1">
                              <p className="text-sm text-slate-600">Tasks: {project.completedTasks}/{project.totalTasks}</p>
                              <p className={`text-sm font-semibold ${
                                project.avgKpi >= 80 ? 'text-green-600' :
                                project.avgKpi >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                Project KPI: {project.avgKpi}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Good Performance Section */}
          {goodPerformers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Good Performance (60-79% KPI)</h2>
                  <p className="text-slate-600">{goodPerformers.length} team members</p>
                </div>
              </div>

              <div className="space-y-4">
                {goodPerformers.map((member, idx) => {
                  // Same logic as above for projects
                  const memberProjects = {};
                  excelData.forEach((row) => {
                    const manager = row.Manager || row.ManagerName;
                    const memberName = row.TeamMember || row.Member || row.Name;
                    const project = row.Project || row.ProjectName;

                    if (manager === selectedManager && memberName === member.name && project) {
                      if (!memberProjects[project]) {
                        memberProjects[project] = {
                          name: project,
                          totalTasks: 0,
                          completedTasks: 0,
                          kpis: [],
                        };
                      }
                      memberProjects[project].totalTasks++;
                      const status = (row.Status || "").toLowerCase();
                      if (
                        status.includes("completed") ||
                        status.includes("complete") ||
                        status.includes("done")
                      ) {
                        memberProjects[project].completedTasks++;
                      }
                      const kpi = calculateKPI(
                        formatExcelDate(row.StartDate),
                        formatExcelDate(row.CompletedDate || row.ActualDate || row.CompletionDate || "-"),
                        formatExcelDate(row.Deadline || row.DueDate)
                      );
                      if (kpi !== null) {
                        memberProjects[project].kpis.push(kpi);
                      }
                    }
                  });

                  const projectsWithKPIs = Object.values(memberProjects).map(project => ({
                    ...project,
                    avgKpi: project.kpis.length > 0 ? Math.round(project.kpis.reduce((a, b) => a + b, 0) / project.kpis.length) : 0,
                    completionPercentage: project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0,
                  }));

                  return (
                    <div key={idx} className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{member.name}</h3>
                            <p className="text-slate-600">{member.role}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-yellow-700 font-semibold">
                                Overall KPI: {member.kpi}%
                              </span>
                              <span className="text-sm text-slate-600">
                                Progress: {member.percentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projectsWithKPIs.map((project, pidx) => (
                          <div key={pidx} className="bg-white rounded-lg p-4 shadow-sm">
                            <h4 className="font-semibold text-slate-800 mb-2">{project.name}</h4>
                            <div className="space-y-1">
                              <p className="text-sm text-slate-600">Tasks: {project.completedTasks}/{project.totalTasks}</p>
                              <p className={`text-sm font-semibold ${
                                project.avgKpi >= 80 ? 'text-green-600' :
                                project.avgKpi >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                Project KPI: {project.avgKpi}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Needs Attention Section */}
          {needsAttention.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Needs Attention (60% KPI)</h2>
                  <p className="text-slate-600">{needsAttention.length} team members</p>
                </div>
              </div>

              <div className="space-y-4">
                {needsAttention.map((member, idx) => {
                  // Same logic as above for projects
                  const memberProjects = {};
                  excelData.forEach((row) => {
                    const manager = row.Manager || row.ManagerName;
                    const memberName = row.TeamMember || row.Member || row.Name;
                    const project = row.Project || row.ProjectName;

                    if (manager === selectedManager && memberName === member.name && project) {
                      if (!memberProjects[project]) {
                        memberProjects[project] = {
                          name: project,
                          totalTasks: 0,
                          completedTasks: 0,
                          kpis: [],
                        };
                      }
                      memberProjects[project].totalTasks++;
                      const status = (row.Status || "").toLowerCase();
                      if (
                        status.includes("completed") ||
                        status.includes("complete") ||
                        status.includes("done")
                      ) {
                        memberProjects[project].completedTasks++;
                      }
                      const kpi = calculateKPI(
                        formatExcelDate(row.StartDate),
                        formatExcelDate(row.CompletedDate || row.ActualDate || row.CompletionDate || "-"),
                        formatExcelDate(row.Deadline || row.DueDate)
                      );
                      if (kpi !== null) {
                        memberProjects[project].kpis.push(kpi);
                      }
                    }
                  });

                  const projectsWithKPIs = Object.values(memberProjects).map(project => ({
                    ...project,
                    avgKpi: project.kpis.length > 0 ? Math.round(project.kpis.reduce((a, b) => a + b, 0) / project.kpis.length) : 0,
                    completionPercentage: project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0,
                  }));

                  return (
                    <div key={idx} className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{member.name}</h3>
                            <p className="text-slate-600">{member.role}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-red-700 font-semibold">
                                Overall KPI: {member.kpi}%
                              </span>
                              <span className="text-sm text-slate-600">
                                Progress: {member.percentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projectsWithKPIs.map((project, pidx) => (
                          <div key={pidx} className="bg-white rounded-lg p-4 shadow-sm">
                            <h4 className="font-semibold text-slate-800 mb-2">{project.name}</h4>
                            <div className="space-y-1">
                              <p className="text-sm text-slate-600">Tasks: {project.completedTasks}/{project.totalTasks}</p>
                              <p className={`text-sm font-semibold ${
                                project.avgKpi >= 80 ? 'text-green-600' :
                                project.avgKpi >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                Project KPI: {project.avgKpi}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {teamData.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
              <p className="text-slate-500 text-lg">No team members found.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
