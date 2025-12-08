/**
 * CSV Parser Module - Handles multi-line quoted fields in Google Sheets exports
 * Automatically detects and maps columns based on header names
 */

const parseCSVWithQuotes = (csvText) => {
  const lines = csvText.split('\n');
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

  return rows;
};

/**
 * Find column index by matching various possible column names
 * @param {Array} headers - Array of header strings
 * @param {String|Array} searchTerms - Single string or array of search terms
 * @param {Boolean} partialMatch - If true, do partial matching (default: true)
 */
const findColumnIndex = (headers, searchTerms, partialMatch = true) => {
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
  
  for (const term of terms) {
    const termLower = term.toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      const headerLower = headers[i].toLowerCase();
      if (partialMatch) {
        if (headerLower.includes(termLower)) {
          return i;
        }
      } else {
        if (headerLower === termLower) {
          return i;
        }
      }
    }
  }
  return -1;
};

/**
 * Find all column indices matching a pattern
 * @param {Array} headers - Array of header strings
 * @param {String} pattern - Search pattern
 */
const findColumnIndices = (headers, pattern) => {
  const patternLower = pattern.toLowerCase();
  return headers
    .map((h, i) => h.toLowerCase().includes(patternLower) ? i : -1)
    .filter(i => i !== -1);
};

/**
 * Transform raw CSV rows into structured data objects
 * @param {Array} rows - Parsed CSV rows (first row is headers)
 * @param {Object} config - Column mapping configuration
 */
const transformData = (rows, config = {}) => {
  if (rows.length < 2) {
    throw new Error("No data rows found");
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices for known fields
  const colMap = {
    srNo: findColumnIndex(headers, ['sr. no', 'sr no', 'sno', 'no']),
    manager: findColumnIndex(headers, ['manager']),
    member: findColumnIndex(headers, ['member', 'team member', 'assignee']),
    groupCategory: findColumnIndex(headers, ['group category', 'group', 'category']),
    noOfPartCodes: findColumnIndex(headers, ['no of part codes', 'part codes', 'codes']),
    avgSpent: findColumnIndex(headers, ['average spent', 'avg spent', 'average spend']),
    targetSavings: findColumnIndex(headers, ['target savings', 'target']),
    achievedSavings: findColumnIndex(headers, ['achieved savings', 'achieved', 'realised']),
    vendorStartIndex: findColumnIndex(headers, ['new vendor', 'vendor']) || 8, // Default to column 8 if not found
  };

  // All vendor columns (any column with "vendor" in the name)
  const vendorIndices = findColumnIndices(headers, 'vendor');

  console.log("\n=== COLUMN MAPPING ===");
  console.log("Headers found:", headers);
  console.log("Column indices:", colMap);
  console.log("Vendor column indices:", vendorIndices);
  console.log("");

  // Transform data
  const transformedData = dataRows
    .filter(row => row.length > 0 && row[0])
    .map((row, idx) => {
      const groupCat = colMap.groupCategory >= 0 ? row[colMap.groupCategory] : '';
      const vendors = [];

      // Extract vendors from all vendor columns
      if (vendorIndices.length > 0) {
        vendorIndices.forEach(vIdx => {
          if (vIdx < row.length && row[vIdx] && row[vIdx].trim()) {
            vendors.push(row[vIdx].trim());
          }
        });
      }

      return {
        srNo: colMap.srNo >= 0 ? row[colMap.srNo] : '',
        manager: colMap.manager >= 0 ? row[colMap.manager] : '',
        member: colMap.member >= 0 ? row[colMap.member] : '',
        groupCategory: groupCat,
        noOfPartCodes: colMap.noOfPartCodes >= 0 ? parseInt(row[colMap.noOfPartCodes]) || 0 : 0,
        avgSpent: colMap.avgSpent >= 0 ? parseFloat(row[colMap.avgSpent]) || 0 : 0,
        targetSavings: colMap.targetSavings >= 0 ? parseFloat(String(row[colMap.targetSavings] || '').replace('%', '')) || 0 : 0,
        achievedSavings: colMap.achievedSavings >= 0 ? parseFloat(String(row[colMap.achievedSavings] || '').replace('%', '')) || 0 : 0,
        vendors: vendors,
      };
    });

  console.log("\n=== SAMPLE TRANSFORMED DATA ===");
  if (transformedData.length > 0) {
    console.log(JSON.stringify(transformedData.slice(0, 3), null, 2));
  }

  return transformedData;
};

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCSVWithQuotes,
    findColumnIndex,
    findColumnIndices,
    transformData,
  };
}
