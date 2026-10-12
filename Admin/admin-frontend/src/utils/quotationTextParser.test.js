import { parseQuotationText, extractJsonFromText, normalizeLineItem, parseCleanNumber } from './quotationTextParser.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${message}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${message}`);
    }
}

console.log('--- Testing quotationTextParser ---');

// Test 1: Exact format from screenshot (pipe-delimited table)
console.log('\nTest 1: Exact format from screenshot (pipe-delimited table)');
const screenshotInput = `
3 | ITM-003 | Item Description for 3 that might be somewhat long to cause wrapping and wrapping and wrapping. | 998314 | 2 | 10000 | 0 | 10000 | 18 | 3600.00 (18%) | 23600
4 | ITM-004 | Item Description for 4 that might be somewhat long to cause wrapping and wrapping and wrapping. | 998314 | 2 | 10000 | 0 | 10000 | 18 | 3600.00 (18%) | 23600
5 | ITM-005 | Item Description for 5 that might be somewhat long to cause wrapping and wrapping and wrapping. | 998314 | 2 | 10000 | 0 | 10000 | 18 | 3600.00 (18%) | 23600
`;
const res1 = parseQuotationText(screenshotInput);
assert(res1.success === true, 'Parsed screenshot rows successfully');
assert(res1.items.length === 3, 'Extracted exactly 3 items');
assert(res1.items[0].sku === 'ITM-003', 'Row 1 SKU is ITM-003');
assert(res1.items[0].description.includes('Item Description for 3'), 'Row 1 description preserved');
assert(res1.items[0].hsnSac === '998314', 'Row 1 HSN/SAC is 998314');
assert(res1.items[0].quantity === 2, 'Row 1 Qty is 2');
assert(res1.items[0].listPrice === 10000, 'Row 1 List Price is 10000');
assert(res1.items[0].discountPercent === 0, 'Row 1 Disc % is 0');
assert(res1.items[0].unitPrice === 10000, 'Row 1 Unit Price is 10000');
assert(res1.items[0].taxPercent === 18, 'Row 1 Tax % is 18');

// Test 2: Tab-separated table with header row (e.g. copied from Excel / Web)
console.log('\nTest 2: Tab-separated table with header row');
const tsvInput = `#\tSKU\tDESCRIPTION\tHSN / SAC\tQTY\tLIST PRICE\tDISC %\tUNIT PRICE\tTAX %\tTAX AMT.\tTOTAL
1\tITM-001\tDell PowerEdge Server R750\t84713010\t2\t60,000.00\t5%\t57,000.00\t18%\t20,520.00\t1,34,520.00
2\tITM-002\tCisco Catalyst 2960 Switch\t85176290\t1\t25,000.00\t0%\t25,000.00\t18%\t4,500.00\t29,500.00`;
const res2 = parseQuotationText(tsvInput);
assert(res2.success === true, 'Parsed TSV with headers successfully');
assert(res2.items.length === 2, 'Extracted 2 items');
assert(res2.items[0].sku === 'ITM-001', 'Item 1 SKU is ITM-001');
assert(res2.items[0].quantity === 2, 'Item 1 Qty is 2');
assert(res2.items[0].listPrice === 60000, 'Item 1 List Price is 60000 (cleaned commas)');
assert(res2.items[0].discountPercent === 5, 'Item 1 Discount is 5%');
assert(res2.items[0].unitPrice === 57000, 'Item 1 Unit Price is 57000');
assert(res2.items[0].taxPercent === 18, 'Item 1 Tax % is 18');

// Test 3: Numbered items with multiple spaces
console.log('\nTest 3: Numbered items with spaces');
const numberedInput = `
1. ITM-001 Dell PowerEdge Server R750 84713010 2 60,000 5% 18%
2. ITM-002 Cisco Catalyst 2960 Switch 85176290 1 25,000 0% 18%
`;
const res3 = parseQuotationText(numberedInput);
assert(res3.success === true, 'Parsed numbered items successfully');
assert(res3.items.length === 2, 'Extracted 2 items');
assert(res3.items[0].sku === 'ITM-001', 'Extracted SKU ITM-001');
assert(res3.items[0].description === 'Dell PowerEdge Server R750', `Extracted Description: "${res3.items[0].description}"`);
assert(res3.items[0].hsnSac === '84713010', 'Extracted HSN 84713010');
assert(res3.items[0].quantity === 2, 'Extracted Qty 2');
assert(res3.items[0].listPrice === 60000, 'Extracted List Price 60000');
assert(res3.items[0].discountPercent === 5, 'Extracted Disc 5%');
assert(res3.items[0].taxPercent === 18, 'Extracted Tax 18%');

// Test 4: Commas in prices, currency symbols, and optional fields
console.log('\nTest 4: Commas, currency symbols, optional fields');
const commaInput = `
1. Enterprise Cloud Hosting 1 ₹1,50,000.00 18%
2. Technical Support Annual 998314 1 50,000
`;
const res4 = parseQuotationText(commaInput);
assert(res4.success === true, 'Parsed items with commas & currency symbols');
assert(res4.items.length === 2, 'Extracted 2 items');
assert(res4.items[0].listPrice === 150000, 'Handled ₹1,50,000.00 price properly');
assert(res4.items[0].taxPercent === 18, 'Handled 18% tax');
assert(res4.items[1].hsnSac === '998314', 'Extracted HSN 998314');
assert(res4.items[1].listPrice === 50000, 'Handled 50,000 list price');
assert(res4.items[1].taxPercent === 18, 'Default tax 18 applied when omitted');

// Test 5: Key-value labeled text
console.log('\nTest 5: Key-value labeled text');
const kvInput = `
1. SKU: DELL-R750, Item: Dell PowerEdge R750 Server, HSN: 84713010, Qty: 2, List Price: 60,000, Disc: 5%, GST: 18%
2. SKU: CISCO-2960, Item: Cisco Catalyst Switch, Qty: 1, Price: 25,000, GST: 18%
`;
const res5 = parseQuotationText(kvInput);
assert(res5.success === true, 'Parsed key-value items');
assert(res5.items.length === 2, 'Extracted 2 items');
assert(res5.items[0].sku === 'DELL-R750', 'SKU is DELL-R750');
assert(res5.items[0].description === 'Dell PowerEdge R750 Server', 'Item description parsed');
assert(res5.items[0].quantity === 2, 'Qty is 2');
assert(res5.items[0].listPrice === 60000, 'List Price is 60000');
assert(res5.items[0].discountPercent === 5, 'Disc is 5%');

// Test 6: JSON wrapped in Markdown code fences
console.log('\nTest 6: JSON in Markdown code fences');
const fenceJson = `\`\`\`json
[
  {
    "sku": "ITM-003",
    "description": "Item Description for 3",
    "hsnSac": "998314",
    "quantity": 2,
    "listPrice": 10000,
    "discountPercent": 0,
    "unitPrice": 10000,
    "taxPercent": 18
  }
]
\`\`\``;
const res6 = parseQuotationText(fenceJson);
assert(res6.success === true, 'Parsed JSON inside markdown fences');
assert(res6.items.length === 1, 'Extracted 1 item');
assert(res6.items[0].sku === 'ITM-003', 'SKU is ITM-003');
assert(res6.items[0].quantity === 2, 'Qty is 2');
assert(res6.items[0].listPrice === 10000, 'List price is 10000');

// Test 7: Blank lines and empty input
console.log('\nTest 7: Blank lines and empty input');
const emptyInput = '   \n\n  \t ';
const res7 = parseQuotationText(emptyInput);
assert(res7.success === false, 'Empty input correctly returned false');
assert(res7.items.length === 0, 'No items generated for empty input');

// Test 8: Genuinely malformed input
console.log('\nTest 8: Genuinely malformed input');
const malformedInput = `
random nonsensical text here
another line of garbage without any numbers or products
`;
const res8 = parseQuotationText(malformedInput);
assert(res8.success === false, 'Malformed input rejected without inventing items');
assert(res8.items.length === 0, 'Zero items created for malformed input');
assert(res8.error.length > 0, 'Clear error message returned for malformed input');

// Test 9: Blank lines interspersed between rows
console.log('\nTest 9: Blank lines interspersed between rows');
const interspersedInput = `

1. ITM-001 First Item 998314 1 5000 0% 18%


2. ITM-002 Second Item 998314 2 8000 10% 18%

`;
const res9 = parseQuotationText(interspersedInput);
assert(res9.success === true, 'Parsed items with empty lines interspersed');
assert(res9.items.length === 2, 'Extracted exactly 2 items');

// Test 10: JSON object format with { items: [...] }
console.log('\nTest 10: JSON object format with { items: [...] }');
const jsonObj = `\`\`\`json
{
  "items": [
    {
      "sku": "SRV-01",
      "name": "Server Maintenance",
      "qty": 5,
      "rate": 2000,
      "taxRate": 18
    }
  ]
}
\`\`\``;
const res10 = parseQuotationText(jsonObj);
assert(res10.success === true, 'Parsed JSON object with items array');
assert(res10.items.length === 1, 'Extracted 1 item from object wrapper');
assert(res10.items[0].sku === 'SRV-01', 'Extracted SKU SRV-01');
assert(res10.items[0].description === 'Server Maintenance', 'Mapped name to description');
assert(res10.items[0].quantity === 5, 'Mapped qty to quantity 5');
assert(res10.items[0].listPrice === 2000, 'Mapped rate to listPrice 2000');

console.log(`\n========================================`);
console.log(`Tests finished: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
