const XLSX = require('xlsx');

// Provided data from the user
const data = [
  ["Sr. No", "Manager", "Member", "Group Category", "No of part codes", "Average Spent per Year (INR Lakhs)", "Target Savings", "Achieved Savings", "New Vendor-1", "New Vendor-2", "New Vendor-3", "New Vendor-4"],
  ["1", "Gaurav Maheshwari", "Maninder", "Switchgear", "254", "175", "20%", "25%", "Eaton", "General Electric", "L&T", "C&S"],
  ["2", "Gaurav Maheshwari", "Maninder", "Lugs & Glands", "202", "46", "20%", "", "ABHISHEK ENTERPRISES", "GLOBAL BRASS & ALLOY (INDIA)", "CABLEGRIP INDUSTRIES", "SWASTIK LUGS"],
  ["3", "Gaurav Maheshwari", "Maninder", "RTD & Thermocouples", "18", "2", "20%", "", "DIGITEK SOLUTION\n Mr.Pratik\n 877 704 3166", "SIGNATURE TECHNOLOGY\n Mr.89810 07044", "THERMAL INSTRUMENT INDIA PVT.LTD.\n Mr.Arindam Chatterjee(sales manager)\n 90078 50198", "TOSHNIWAL INDUSTRIES\n Mr.Rajesh(sales manager)\n 9116635035"],
  ["4", "Gaurav Maheshwari", "Maninder", "Cables & Wires", "71", "1525", "20%", "23%", "POLYVION CABLES\n Noida", "Havells india\n Bhiwadi", "", ""],
  ["5", "Gaurav Maheshwari", "Maninder", "Motors", "59", "181", "20%", "", "M/S HEM", "M/S WEG", "M/S CG POWER AND INDUSTRIAL SOLUTIONS LIMITED", "M/S ABB INDIA LTD"]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);

// Adjust column widths for better readability
ws['!cols'] = [
  { wch: 10 }, // Sr. No
  { wch: 20 }, // Manager
  { wch: 15 }, // Member
  { wch: 25 }, // Group Category
  { wch: 18 }, // No of part codes
  { wch: 35 }, // Average Spent per Year (INR Lakhs)
  { wch: 15 }, // Target Savings
  { wch: 18 }, // Achieved Savings
  { wch: 30 }, // New Vendor-1
  { wch: 30 }, // New Vendor-2
  { wch: 30 }, // New Vendor-3
  { wch: 30 }  // New Vendor-4
];

XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

const outputPath = './procurement_data.xlsx';
XLSX.writeFile(wb, outputPath);

console.log(`Procurement data Excel file created at: ${outputPath}`);
