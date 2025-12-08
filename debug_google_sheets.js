// Enhanced debug script to check what the actual Google Sheets returns

const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
const SHEET_NAME = "Sheet1"; // Change this to the correct sheet

const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

console.log(`Fetching from: ${csvUrl}\n`);

fetch(csvUrl)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  })
  .then(csvText => {
    console.log("=== RAW CSV OUTPUT ===");
    console.log(csvText);
    console.log("\n");

    // Split by lines while preserving quoted strings
    const lines = csvText.split('\n');
    console.log(`Total lines: ${lines.length}`);
    console.log("");

    // Parse with quote awareness
    const parseCSVRow = (row) => {
      const result = [];
      let current = '';
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
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
        i++;
      }

      result.push(current.trim());
      return result;
    };

    const rows = [];
    let currentRow = '';

    for (let line of lines) {
      currentRow += line;
      const quoteCount = (currentRow.split('"').length - 1);

      if (quoteCount % 2 === 0 && currentRow.trim()) {
        const parsedRow = parseCSVRow(currentRow);
        if (parsedRow.length >= 1 && parsedRow[0]) {
          rows.push(parsedRow);
        }
        currentRow = '';
      } else {
        currentRow += '\n';
      }
    }

    console.log("=== PARSED ROWS ===");
    console.log(`Total parsed rows: ${rows.length}`);
    console.log("");

    if (rows.length > 0) {
      console.log("=== HEADER ROW ===");
      const header = rows[0];
      header.forEach((col, idx) => {
        console.log(`[${idx}] "${col}"`);
      });
      console.log("");

      console.log("=== DATA ROWS ===");
      rows.slice(1, 5).forEach((row, idx) => {
        console.log(`\nRow ${idx}:`);
        row.forEach((cell, colIdx) => {
          console.log(`  [${colIdx}] "${cell}"`);
        });
      });

      // Check for Group Category or similar columns
      console.log("\n=== SEARCHING FOR KEY COLUMNS ===");
      const header0 = rows[0];
      const groupCatIdx = header0.findIndex(h => h.toLowerCase().includes('group') || h.toLowerCase().includes('category'));
      const vendorIdxes = header0
        .map((h, i) => h.toLowerCase().includes('vendor') ? i : -1)
        .filter(i => i !== -1);

      console.log(`Group Category column index: ${groupCatIdx} (${groupCatIdx >= 0 ? header0[groupCatIdx] : 'NOT FOUND'})`);
      console.log(`Vendor columns: ${vendorIdxes.map(i => `${i}:${header0[i]}`).join(', ')}`);

      if (groupCatIdx >= 0) {
        console.log("\n=== GROUP CATEGORIES IN DATA ===");
        rows.slice(1, 5).forEach((row, idx) => {
          console.log(`Row ${idx}: "${row[groupCatIdx]}"`);
        });
      }

      if (vendorIdxes.length > 0) {
        console.log("\n=== VENDORS IN DATA ===");
        rows.slice(1, 5).forEach((row, idx) => {
          console.log(`Row ${idx}:`);
          vendorIdxes.forEach(vIdx => {
            console.log(`  ${header0[vIdx]}: "${row[vIdx]}"`);
          });
        });
      }
    }
  })
  .catch(err => {
    console.error("Error:", err);
  });
