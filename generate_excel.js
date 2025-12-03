const XLSX = require('xlsx');
const path = require('path');

const data = [
  ["EmployeeID", "Name", "Title", "ManagerID", "Department"],
  [100, "Sarah Jenkins", "Chief Procurement Officer", "", "Executive"],
  [101, "Michael Chen", "Head of Direct Procurement", 100, "Direct Procurement"],
  [102, "Jessica Williams", "Head of Indirect Procurement", 100, "Indirect Procurement"],
  [103, "David Rodriguez", "Head of Logistics", 100, "Logistics"],
  [104, "Emily Thompson", "Head of Strategy & Analytics", 100, "Strategy"],
  [201, "Robert Kim", "Manager - Raw Materials", 101, "Direct Procurement"],
  [202, "Lisa Garcia", "Manager - Components", 101, "Direct Procurement"],
  [203, "James Wilson", "Manager - Packaging", 101, "Direct Procurement"],
  [204, "Karen Davis", "Manager - IT Services", 102, "Indirect Procurement"],
  [205, "Thomas Brown", "Manager - Facilities", 102, "Indirect Procurement"],
  [301, "John Doe", "Senior Buyer", 201, "Direct Procurement"],
  [302, "Jane Smith", "Analyst", 201, "Direct Procurement"]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);

// Adjust column widths
ws['!cols'] = [
  { wch: 12 }, // EmployeeID
  { wch: 20 }, // Name
  { wch: 30 }, // Title
  { wch: 12 }, // ManagerID
  { wch: 20 }  // Department
];

XLSX.utils.book_append_sheet(wb, ws, "TeamData");

const outputPath = path.join(__dirname, 'sample_team_data.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Excel file created at: ${outputPath}`);
