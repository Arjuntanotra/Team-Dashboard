// Debug script to test CSV parsing with the user's data format

const sampleCSV = `Sr. No,Manager,Member,Group Category,No of part codes,"Average Spent per Year 
(INR Lakhs)",Target Savings,Achieved Savings,New Vendor-1,New Vendor-2,New Vendor-3
1,Gaurav Maheshwari,Maninder,Switchgear,254,175,20%,25%,Eaton,General Electric,L&T
2,Gaurav Maheshwari,Maninder,Lugs & Glands,202,46,20%,,ABHISHEK ENTERPRISES,GLOBAL BRASS & ALLOY (INDIA),CABLEGRIP INDUSTRIES`;

console.log("=== ORIGINAL CSV ===");
console.log(sampleCSV);
console.log("\n");

// Test 1: Basic split parsing
console.log("=== TEST 1: Basic Split Parsing ===");
const lines = sampleCSV.split('\n');
console.log(`Total lines: ${lines.length}`);
lines.forEach((line, idx) => {
  console.log(`Line ${idx}: "${line}"`);
});
console.log("\n");

// Test 2: Simple CSV parsing (naive)
console.log("=== TEST 2: Naive Split by Comma ===");
const naiveRows = lines.map(line => line.split(','));
naiveRows.forEach((row, idx) => {
  console.log(`Row ${idx}: [${row.map((cell, i) => `${i}:"${cell.trim()}"`).join(', ')}]`);
});
console.log("\n");

// Test 3: Robust CSV parser (handles quotes)
console.log("=== TEST 3: Robust CSV Parser (with quotes) ===");
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
          // Escaped quote
          current += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        row.push(current.replace(/^"|"$/g, '').trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    row.push(current.replace(/^"|"$/g, '').trim());
    result.push(row);
  }
  return result;
};

const parsedRows = parseCSV(sampleCSV);
console.log(`Total rows parsed: ${parsedRows.length}`);
parsedRows.forEach((row, idx) => {
  console.log(`Row ${idx}: [${row.map((cell, i) => `${i}:"${cell}"`).join(', ')}]`);
});
console.log("\n");

// Test 4: Extract headers and data
console.log("=== TEST 4: Headers & Data Extraction ===");
const headers = parsedRows[0];
const dataRows = parsedRows.slice(1);

console.log("Headers:");
headers.forEach((header, idx) => {
  console.log(`  [${idx}] "${header}"`);
});
console.log("\n");

// Test 5: Map data rows to objects
console.log("=== TEST 5: Data Row to Object Mapping ===");
const transformedData = dataRows.map((row, rowIdx) => {
  const obj = {};
  headers.forEach((header, colIdx) => {
    obj[header] = row[colIdx] || '';
  });
  return obj;
});

transformedData.forEach((item, idx) => {
  console.log(`Record ${idx}:`);
  console.log(JSON.stringify(item, null, 2));
  console.log("\n");
});

// Test 6: Try to extract Group Category specifically
console.log("=== TEST 6: Extract Group Category ===");
transformedData.forEach((item, idx) => {
  const groupCategory = item['Group Category'] || item['group category'] || item.groupcategory;
  console.log(`Record ${idx} - Group Category: "${groupCategory}"`);
});
console.log("\n");

// Test 7: Extract vendor columns
console.log("=== TEST 7: Extract Vendor Columns ===");
transformedData.forEach((item, idx) => {
  console.log(`Record ${idx} - Vendors:`);
  const vendorCols = headers.filter(h => h.includes('Vendor') || h.includes('vendor'));
  console.log(`  Found ${vendorCols.length} vendor columns: ${vendorCols.join(', ')}`);
  vendorCols.forEach(col => {
    console.log(`    ${col}: "${item[col]}"`);
  });
});
console.log("\n");

// Test 8: Check for extra fields
console.log("=== TEST 8: All Field Values ===");
transformedData.forEach((item, idx) => {
  console.log(`Record ${idx}:`);
  Object.entries(item).forEach(([key, value]) => {
    console.log(`  ${key}: "${value}"`);
  });
  console.log("");
});
