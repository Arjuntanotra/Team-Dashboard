const { parseCSVWithQuotes, findColumnIndex, findColumnIndices, transformData } = require('./csvParser');

const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
const SHEET_NAME = "Sheet3"; // Manager/Member/Group Category data

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
    console.log("=== RAW CSV (first 500 chars) ===");
    console.log(csvText.substring(0, 500));
    console.log("\n");

    // Parse the CSV
    const rows = parseCSVWithQuotes(csvText);
    console.log(`Total rows parsed: ${rows.length}\n`);

    if (rows.length < 2) {
      throw new Error("No data rows found");
    }

    console.log("=== HEADER ROW ===");
    rows[0].forEach((col, idx) => {
      console.log(`[${idx}] "${col}"`);
    });
    console.log("\n");

    // Transform the data
    const transformedData = transformData(rows);

    console.log("\n=== TRANSFORMED DATA ===");
    transformedData.forEach((item, idx) => {
      console.log(`\nRecord ${idx}:`);
      console.log(`  Sr No: ${item.srNo}`);
      console.log(`  Manager: ${item.manager}`);
      console.log(`  Member: ${item.member}`);
      console.log(`  Group Category: ${item.groupCategory}`);
      console.log(`  No of Part Codes: ${item.noOfPartCodes}`);
      console.log(`  Avg Spent: ${item.avgSpent}`);
      console.log(`  Target Savings: ${item.targetSavings}%`);
      console.log(`  Achieved Savings: ${item.achievedSavings}%`);
      console.log(`  Vendors (${item.vendors.length}): ${item.vendors.join(', ')}`);
    });

    // Group by manager to verify
    console.log("\n=== GROUPED BY MANAGER ===");
    const byManager = {};
    transformedData.forEach(item => {
      if (!byManager[item.manager]) {
        byManager[item.manager] = [];
      }
      byManager[item.manager].push(item);
    });

    Object.entries(byManager).forEach(([manager, items]) => {
      console.log(`\n${manager} (${items.length} records):`);
      items.forEach(item => {
        console.log(`  - ${item.groupCategory} (${item.vendors.length} vendors)`);
      });
    });
  })
  .catch(err => {
    console.error("Error:", err.message);
  });
