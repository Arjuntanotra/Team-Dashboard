const axios = require('axios');

async function debugVendors() {
  try {
    const spreadsheetId = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
    const sheetName = "Sheet3";

    console.log('Fetching data from Google Sheet...');
    // Fetch the CSV data
    const response = await axios.get(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
    );

    const csvText = response.data;
    console.log('Raw CSV text length:', csvText.length);

    // Parse CSV manually like in the app
    const rows = csvText.split('\n').map(row => {
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
          result.push(current.replace(/^"|"$/g, '').trim());
          current = '';
        } else if (char === '\t' && !inQuotes) {
          result.push(current.replace(/^"|"$/g, '').trim());
          current = '';
        } else {
          current += char;
        }
        i++;
      }

      result.push(current.replace(/^"|"$/g, '').trim());
      return result;
    });

    console.log(`Total rows parsed: ${rows.length}`);
    console.log('First row (headers):', rows[0]);

    // Process data rows
    const allRows = rows.slice(1)
      .filter(row => row.length > 0 && row[0]);

    console.log(`\n=== FULL ANALYSIS ===`);
    console.log(`Total data rows (all managers): ${allRows.length}`);

    const allManagers = {};
    allRows.forEach(row => {
      const manager = row[1] || 'UNKNOWN';
      if (!allManagers[manager]) {
        allManagers[manager] = [];
      }
      allManagers[manager].push(row[3] || 'UNKNOWN');
    });

    Object.keys(allManagers).forEach(manager => {
      console.log(`${manager}: ${allManagers[manager].length} categories`);
    });

    const allCategories = allRows
      .filter(row => row[1] === 'Gaurav Maheshwari')
      .map(row => {
        const category = row[3] || 'UNKNOWN';

        // Collect vendor columns (from index 8 onwards)
        const vendors = [];
        for (let i = 8; i < row.length; i++) {
          if (row[i] && row[i].trim()) {
            vendors.push(row[i].trim());
          }
        }

        return {
          category,
          vendorCount: vendors.length,
          vendors,
          rowLength: row.length,
          vendorColumns: row.slice(8)
        };
      });

    console.log('\n=== GAURAV CATEGORIES ANALYSIS ===');
    console.log(`Found ${allCategories.length} categories for Gaurav Maheshwari`);

    allCategories.forEach(cat => {
      console.log(`\n========================================`);
      console.log(`CATEGORY: "${cat.category}"`);
      console.log(`Row length: ${cat.rowLength}`);
      console.log(`Vendor count: ${cat.vendorCount}`);
    });

    const gauravVendors = allCategories.reduce((sum, cat) => sum + cat.vendorCount, 0);

    // Now check all rows for complete data
    const totalAllVendors = allRows.reduce((sum, row) => {
      let count = 0;
      for (let i = 8; i < row.length; i++) {
        if (row[i] && row[i].trim()) {
          count++;
        }
      }
      return sum + count;
    }, 0);

    console.log(`\n======= SUMMARY =======`);
    console.log(`Total categories across all managers: ${allRows.length}`);
    console.log(`Gaurav's categories: ${allCategories.length}`);
    console.log(`Gaurav's vendor entries: ${gauravVendors}`);
    console.log(`Total vendor entries across entire sheet: ${totalAllVendors}`);
    console.log(`Expected vs Actual: 278 expected, ${gauravVendors} found for Gaurav`);

    // Check for potential issue - are there duplicate categories with different row lengths?
    const categoryStats = {};
    allCategories.forEach(cat => {
      if (!categoryStats[cat.category]) {
        categoryStats[cat.category] = { count: 0, rowLengths: [] };
      }
      categoryStats[cat.category].count++;
      categoryStats[cat.category].rowLengths.push(cat.rowLength);
    });

    console.log(`\n=== CATEGORY DUPLICATES ANALYSIS ===`);
    Object.entries(categoryStats).forEach(([catName, stats]) => {
      if (stats.count > 1) {
        console.log(`"${catName}" appears ${stats.count} times with row lengths: [${stats.rowLengths.join(', ')}]`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugVendors();
