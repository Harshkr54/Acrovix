/**
 * ACROVIX ERP - Quotation Text Parser
 * 
 * Supports parsing quotation line items from:
 * 1. Multiline plain-text tables with tab, pipe, or multi-space delimiters.
 * 2. Numbered items with SKU, Description, HSN/SAC, Qty, List Price, Disc %, Tax % / GST rate.
 * 3. Key-value labeled lines (e.g., SKU: ..., Description: ..., Qty: ..., Price: ...).
 * 4. Raw JSON arrays or objects (with or without Markdown code fences).
 * 5. Robust cleanup for currency symbols, commas in numbers, and percentage signs.
 */

/**
 * Cleanly parses a numeric value from string or number.
 * Strips commas (e.g. 10,000 -> 10000), currency symbols (₹, $, INR), % signs, and whitespace.
 * Returns defaultVal if value is invalid or cannot be parsed.
 */
export function parseCleanNumber(val, defaultVal = 0) {
    if (val === null || val === undefined || val === '') return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;

    const cleaned = String(val)
        .replace(/[₹$,\s]/g, '')
        .replace(/INR/gi, '')
        .replace(/%/g, '')
        .trim();

    if (!cleaned) return defaultVal;
    const num = parseFloat(cleaned);
    return isNaN(num) ? defaultVal : num;
}

/**
 * Safely extracts JSON from a string, handling:
 * - Markdown code fences: ```json ... ``` or ``` ... ```
 * - Direct JSON arrays: [...]
 * - JSON objects containing an items/rows/data array
 */
export function extractJsonFromText(text) {
    if (!text || typeof text !== 'string') return null;
    let cleaned = text.trim();

    // Strip markdown code fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // Direct JSON attempt
    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') {
            const arr = parsed.items || parsed.rows || parsed.data || parsed.quotationItems;
            if (Array.isArray(arr)) return arr;
        }
    } catch {
        // Not clean direct JSON, try finding brackets
    }

    // Search for array [ ... ]
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
        try {
            const arraySub = cleaned.substring(firstBracket, lastBracket + 1);
            const parsed = JSON.parse(arraySub);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // continue
        }
    }

    // Search for object { ... }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            const objSub = cleaned.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(objSub);
            if (parsed && typeof parsed === 'object') {
                const arr = parsed.items || parsed.rows || parsed.data || parsed.quotationItems;
                if (Array.isArray(arr)) return arr;
            }
        } catch {
            // continue
        }
    }

    return null;
}

/**
 * Normalizes an extracted raw object into the standard ACROVIX quotation item model.
 */
export function normalizeLineItem(raw, defaultTax = 18) {
    if (!raw || typeof raw !== 'object') return null;

    const sku = (raw.sku || raw.itemCode || raw.code || '').toString().trim();
    const description = (raw.description || raw.name || raw.itemDescription || raw.title || '').toString().trim();
    const hsnSac = (raw.hsnSac || raw.hsn || raw.sac || raw.hsnCode || '').toString().trim();

    // Must have at least a description or a sku to constitute a valid quotation item
    if (!description && !sku) {
        return null;
    }

    const quantity = parseCleanNumber(raw.quantity ?? raw.qty, 1);
    const listPrice = parseCleanNumber(raw.listPrice ?? raw.price ?? raw.rate, 0);
    const discountPercent = parseCleanNumber(raw.discountPercent ?? raw.discount ?? raw.disc, 0);

    let unitPrice = raw.unitPrice !== undefined && raw.unitPrice !== null && raw.unitPrice !== ''
        ? parseCleanNumber(raw.unitPrice, 0)
        : null;

    // Derive unitPrice or listPrice if one is missing
    if (unitPrice === null || unitPrice === undefined) {
        if (listPrice > 0) {
            unitPrice = parseFloat((listPrice * (1 - (discountPercent || 0) / 100)).toFixed(2));
        } else {
            unitPrice = 0;
        }
    }

    const finalUnitPrice = unitPrice >= 0 ? unitPrice : 0;
    const finalListPrice = listPrice > 0 ? listPrice : finalUnitPrice;

    const taxPercent = raw.taxPercent !== undefined && raw.taxPercent !== null && raw.taxPercent !== ''
        ? parseCleanNumber(raw.taxPercent ?? raw.taxRate ?? raw.gstRate ?? raw.gst, defaultTax)
        : defaultTax;

    return {
        id: Date.now() + Math.random(),
        productServiceId: null,
        sku,
        description: description || sku,
        hsnSac,
        quantity: quantity <= 0 ? 1 : quantity,
        listPrice: finalListPrice,
        unitPrice: finalUnitPrice,
        discountPercent: discountPercent >= 0 ? discountPercent : 0,
        taxPercent: taxPercent >= 0 ? taxPercent : defaultTax,
        sourceText: raw.sourceText || raw.raw || '',
        customValues: raw.customValues || {}
    };
}

/**
 * Detects if a line is a table header row and extracts column mapping.
 */
export function detectHeaderRow(line) {
    let delimiter = null;
    if (line.includes('\t')) delimiter = '\t';
    else if (line.includes('|')) delimiter = '|';
    else if (/\s{2,}/.test(line)) delimiter = /\s{2,}/;

    if (!delimiter) return null;

    const rawCells = line.split(delimiter)
        .map(c => c.trim())
        .filter(c => c.length > 0 && c !== '|');

    if (rawCells.length < 2) return null;

    let matchCount = 0;
    const colMap = {};

    rawCells.forEach((cell, idx) => {
        const lower = cell.toLowerCase().replace(/[^a-z0-9%\/ ]/g, '').trim();

        if (lower === '#' || lower === 'no' || lower === 'sl' || lower === 'sl no' || lower === 's no' || lower === 'item no') {
            colMap.index = idx;
            matchCount++;
        } else if (lower.includes('sku') || lower === 'item code' || lower === 'code') {
            colMap.sku = idx;
            matchCount++;
        } else if (lower.includes('desc') || lower.includes('particular') || lower === 'product' || lower === 'item' || lower === 'title') {
            colMap.description = idx;
            matchCount++;
        } else if (lower.includes('hsn') || lower.includes('sac')) {
            colMap.hsnSac = idx;
            matchCount++;
        } else if (lower === 'qty' || lower.includes('quant') || lower === 'units' || lower === 'nos') {
            colMap.quantity = idx;
            matchCount++;
        } else if (lower.includes('list price') || lower === 'mrp' || lower === 'list rate') {
            colMap.listPrice = idx;
            matchCount++;
        } else if (lower.includes('disc') || lower === 'discount %') {
            colMap.discountPercent = idx;
            matchCount++;
        } else if (lower.includes('unit price') || lower.includes('selling') || lower.includes('net price')) {
            colMap.unitPrice = idx;
            matchCount++;
        } else if (colMap.listPrice === undefined && (lower === 'price' || lower === 'rate' || lower === 'cost')) {
            colMap.listPrice = idx;
            matchCount++;
        } else if (lower.includes('tax %') || lower.includes('gst %') || lower === 'tax' || lower === 'gst' || lower.includes('gst rate') || lower === 'vat') {
            colMap.taxPercent = idx;
            matchCount++;
        } else if (lower.includes('tax amt') || lower.includes('tax amount')) {
            colMap.taxAmount = idx;
            matchCount++;
        } else if (lower === 'total' || lower.includes('amount') || lower === 'total amt') {
            colMap.total = idx;
            matchCount++;
        }
    });

    if (matchCount >= 2 && (colMap.description !== undefined || colMap.sku !== undefined || colMap.quantity !== undefined)) {
        return { delimiter, colMap };
    }

    return null;
}

/**
 * Checks if a string looks like an SKU (alphanumeric code with letters, digits, and optional dash/underscore).
 */
function isSkuPattern(str) {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.length < 2 || trimmed.length > 25) return false;
    // Common SKU patterns: ITM-001, SKU123, DELL-R750, PROD_99
    return /^[A-Z0-9]+[_\-][A-Z0-9_\-]+$/i.test(trimmed) || /^(ITM|SKU|PROD|ITEM|PART)\d+$/i.test(trimmed);
}

/**
 * Checks if a string looks like an HSN or SAC code (4 to 8 digits).
 */
function isHsnSacPattern(str) {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    return /^\d{4,8}$/.test(trimmed);
}

/**
 * Parses a single delimited row using column map or positional heuristics.
 */
function parseDelimitedCells(cells, headerMap, defaultTax = 18, rawLine = '') {
    if (!cells || cells.length === 0) return null;

    if (headerMap && headerMap.colMap) {
        const { colMap } = headerMap;
        const sku = colMap.sku !== undefined ? (cells[colMap.sku] || '').trim() : '';
        const description = colMap.description !== undefined ? (cells[colMap.description] || '').trim() : '';
        const hsnSac = colMap.hsnSac !== undefined ? (cells[colMap.hsnSac] || '').trim() : '';
        const qty = colMap.quantity !== undefined ? cells[colMap.quantity] : 1;
        const listPrice = colMap.listPrice !== undefined ? cells[colMap.listPrice] : 0;
        const disc = colMap.discountPercent !== undefined ? cells[colMap.discountPercent] : 0;
        const unitPrice = colMap.unitPrice !== undefined ? cells[colMap.unitPrice] : null;
        const tax = colMap.taxPercent !== undefined ? cells[colMap.taxPercent] : defaultTax;

        return normalizeLineItem({
            sku,
            description,
            hsnSac,
            quantity: qty,
            listPrice,
            discountPercent: disc,
            unitPrice,
            taxPercent: tax,
            sourceText: rawLine
        }, defaultTax);
    }

    // Positional / Heuristic parsing for delimited row without header
    // Filter out leading row number if present (e.g. 1, 3., #3)
    let working = [...cells];
    if (working.length > 2 && /^#?\s*\d+[\.\)]?$/.test(working[0])) {
        working.shift();
    }

    if (working.length === 0) return null;

    let sku = '';
    let description = '';
    let hsnSac = '';
    let quantity = 1;
    let listPrice = 0;
    let discountPercent = 0;
    let unitPrice = null;
    let taxPercent = defaultTax;

    // Check if working[0] is SKU
    if (working.length >= 2 && (isSkuPattern(working[0]) || (!working[0].includes(' ') && working[0].length <= 15 && working[1].length > working[0].length))) {
        sku = working[0];
        description = working[1];
        working = working.slice(2);
    } else {
        description = working[0];
        working = working.slice(1);
    }

    // Now classify the trailing cells (numeric values)
    // Common sequence after description: [HSN/SAC], Qty, List Price, [Disc %], [Unit Price], [Tax %], [Tax Amt], [Total]
    if (working.length > 0 && isHsnSacPattern(working[0])) {
        hsnSac = working[0];
        working.shift();
    }

    if (working.length > 0) {
        // Next is usually Quantity
        quantity = parseCleanNumber(working[0], 1);
        working.shift();
    }

    if (working.length > 0) {
        // Next is List Price
        listPrice = parseCleanNumber(working[0], 0);
        working.shift();
    }

    if (working.length > 0) {
        // Can be Discount %, Unit Price, or Tax %
        const val = working[0];
        if (val.includes('%') || (working.length >= 2 && parseCleanNumber(val) <= 100)) {
            discountPercent = parseCleanNumber(val, 0);
            working.shift();
        }
    }

    if (working.length > 0) {
        // Could be Unit Price or Tax %
        const val = working[0];
        if (working.length >= 2 && !val.includes('%') && parseCleanNumber(val) > 100) {
            unitPrice = parseCleanNumber(val, 0);
            working.shift();
        }
    }

    if (working.length > 0) {
        // Tax % (e.g. 18, 18%, 12)
        const val = working[0];
        const num = parseCleanNumber(val, -1);
        if (num >= 0 && num <= 100) {
            taxPercent = num;
            working.shift();
        }
    }

    return normalizeLineItem({
        sku,
        description,
        hsnSac,
        quantity,
        listPrice,
        discountPercent,
        unitPrice,
        taxPercent,
        sourceText: rawLine
    }, defaultTax);
}

/**
 * Parses key-value formatted text (e.g., SKU: ITM-001, Description: Dell Server, Qty: 2, Price: 50000, Tax: 18%)
 */
function parseKeyValueLine(line, defaultTax = 18) {
    const skuMatch = line.match(/\b(?:sku|code)[:\s]+([A-Za-z0-9_\-]+)/i);
    const descMatch = line.match(/\b(?:item|desc(?:ription)?|name|title)[:\s]+([^,;\n]+)/i);
    const hsnMatch = line.match(/\b(?:hsn(?:\/sac)?|sac)[:\s]+(\d+)/i);
    const qtyMatch = line.match(/\b(?:qty|quantity|units)[:\s]+([\d\.,]+)/i);
    const priceMatch = line.match(/\b(?:list\s*price|price|rate|mrp|cost)[:\s]+([₹\$\d\.,]+)/i);
    const discMatch = line.match(/\b(?:disc(?:ount)?(?:\s*percent)?|disc\s*%)[:\s]+([\d\.,]+)%?/i);
    const taxMatch = line.match(/\b(?:tax|gst|vat)(?:\s*rate|\s*%)?[:\s]+([\d\.,]+)%?/i);

    // If at least 2 distinct key-value pairs are found
    const matchesFound = [skuMatch, descMatch, hsnMatch, qtyMatch, priceMatch, discMatch, taxMatch].filter(Boolean).length;
    if (matchesFound >= 2) {
        let desc = descMatch ? descMatch[1].trim() : '';
        if (!desc) {
            // Strip matched key-values to find leftover description
            const cleaned = line
                .replace(/\b(?:sku|code)[:\s]+[A-Za-z0-9_\-]+/i, '')
                .replace(/\b(?:hsn(?:\/sac)?|sac)[:\s]+\d+/i, '')
                .replace(/\b(?:qty|quantity|units)[:\s]+[\d\.,]+/i, '')
                .replace(/\b(?:list\s*price|price|rate|mrp|cost)[:\s]+[₹\$\d\.,]+/i, '')
                .replace(/\b(?:disc(?:ount)?(?:\s*percent)?|disc\s*%)[:\s]+[\d\.,]+%?/i, '')
                .replace(/\b(?:tax|gst|vat)(?:\s*rate|\s*%)?[:\s]+[\d\.,]+%?/i, '')
                .replace(/^[#\d\.\-\)\s,;]+/, '')
                .replace(/[,;]+$/, '')
                .trim();
            if (cleaned) desc = cleaned;
        }

        return normalizeLineItem({
            sku: skuMatch ? skuMatch[1].trim() : '',
            description: desc,
            hsnSac: hsnMatch ? hsnMatch[1].trim() : '',
            quantity: qtyMatch ? parseCleanNumber(qtyMatch[1], 1) : 1,
            listPrice: priceMatch ? parseCleanNumber(priceMatch[1], 0) : 0,
            discountPercent: discMatch ? parseCleanNumber(discMatch[1], 0) : 0,
            taxPercent: taxMatch ? parseCleanNumber(taxMatch[1], defaultTax) : defaultTax,
            sourceText: line
        }, defaultTax);
    }

    return null;
}

/**
 * Parses a free-form line using right-to-left tail token analysis for numeric fields.
 * Example: "1. ITM-003 Item Description for 3 998314 2 10,000 0% 18%"
 */
function parseFreeFormLine(line, defaultTax = 18) {
    let text = line.trim();

    // 1. Check for key-value formatting
    const kv = parseKeyValueLine(text, defaultTax);
    if (kv) return kv;

    // 2. Check for leading item number: e.g. "1.", "3)", "#3", "[1]"
    const leadingNumMatch = text.match(/^#?\s*(\d+)[\.\)\-\:\s]\s*/);
    if (leadingNumMatch) {
        text = text.substring(leadingNumMatch[0].length).trim();
    }

    // 3. Check for leading SKU: e.g. "ITM-003", "SKU_123"
    let sku = '';
    const skuMatch = text.match(/^([A-Za-z0-9]+[_\-][A-Za-z0-9_\-]+)\s+/i) || text.match(/^(ITM\d+|SKU\d+|PROD\d+)\s+/i);
    if (skuMatch) {
        sku = skuMatch[1].trim();
        text = text.substring(skuMatch[0].length).trim();
    }

    // 4. Tokenize the remainder to find the trailing numeric columns
    // We split by whitespace, preserving potential multi-word description in front
    const tokens = text.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;

    // Analyze tokens from right to left
    // Trailing tokens can include:
    // [Total, Tax Amt], Tax %, Disc %, Unit Price, List Price, Qty, HSN/SAC
    let taxPercent = null;
    let discountPercent = null;
    let unitPrice = null;
    let listPrice = null;
    let quantity = null;
    let hsnSac = '';

    let endIdx = tokens.length - 1;

    // Extract right-to-left numeric values
    const isNumericToken = (tok) => {
        if (!tok) return false;
        let s = tok.replace(/^(?:INR|₹|\$)\s*/i, '').trim();
        s = s.replace(/\s*\(\d+%\)$/, '').replace(/%$/, '').trim();
        s = s.replace(/,/g, '');
        return s.length > 0 && /^-?\d+(?:\.\d+)?$/.test(s);
    };

    const numericTail = [];
    while (endIdx >= 0) {
        const token = tokens[endIdx];
        if (!isNumericToken(token)) {
            break;
        }
        numericTail.unshift({ token, index: endIdx });
        endIdx--;
    }

    if (numericTail.length > 0) {
        let tailCursor = numericTail.length - 1;

        // Skip total / tax amt if present in full table lines (e.g. 3600.00 (18%) 23600)
        if (numericTail.length >= 6) {
            const lastToken = numericTail[tailCursor].token;
            const secondLastToken = numericTail[tailCursor - 1].token;
            if (lastToken.includes(')') || secondLastToken.includes(')')) {
                tailCursor -= 2;
            }
        }

        // Tax % (if ends with % or is a recognized tax rate like 0, 5, 12, 18, 28)
        if (tailCursor >= 0 && taxPercent === null) {
            const tok = numericTail[tailCursor].token;
            if (tok.includes('%') || [0, 5, 12, 18, 28].includes(parseCleanNumber(tok))) {
                taxPercent = parseCleanNumber(tok, defaultTax);
                tailCursor--;
            }
        }

        // Discount % (if ends with % or if numericTail has multiple values and is <= 100)
        if (tailCursor >= 0 && discountPercent === null) {
            const tok = numericTail[tailCursor].token;
            if (tok.includes('%') || (tailCursor >= 2 && parseCleanNumber(tok) <= 100)) {
                discountPercent = parseCleanNumber(tok, 0);
                tailCursor--;
            }
        }

        // Price (List Price or Unit Price)
        if (tailCursor >= 0 && listPrice === null) {
            listPrice = parseCleanNumber(numericTail[tailCursor].token, 0);
            tailCursor--;
        }

        // Quantity
        if (tailCursor >= 0 && quantity === null) {
            quantity = parseCleanNumber(numericTail[tailCursor].token, 1);
            tailCursor--;
        }

        // HSN/SAC
        if (tailCursor >= 0 && isHsnSacPattern(numericTail[tailCursor].token)) {
            hsnSac = numericTail[tailCursor].token.trim();
            tailCursor--;
        }

        // Remaining tokens before the numeric tail form the description
        const descTokens = tokens.slice(0, endIdx + 1);
        const description = descTokens.join(' ').trim();

        if (description || sku) {
            return normalizeLineItem({
                sku,
                description,
                hsnSac,
                quantity: quantity ?? 1,
                listPrice: listPrice ?? 0,
                discountPercent: discountPercent ?? 0,
                unitPrice,
                taxPercent: taxPercent ?? defaultTax,
                sourceText: line
            }, defaultTax);
        }
    }

    return null;
}

/**
 * Main parser entry point.
 * Parses input text and returns structured line items, validation status, and diagnostic messages.
 */
export function parseQuotationText(text, defaultTax = 18) {
    if (!text || !text.trim()) {
        return {
            success: false,
            items: [],
            error: 'Input text is empty. Please enter or paste quotation requirements.',
            format: 'empty'
        };
    }

    const trimmed = text.trim();

    // 1. Check for JSON format first (including Markdown code fences)
    const jsonItems = extractJsonFromText(trimmed);
    if (jsonItems && jsonItems.length > 0) {
        const normalized = jsonItems
            .map(item => normalizeLineItem(item, defaultTax))
            .filter(Boolean);

        if (normalized.length > 0) {
            return {
                success: true,
                items: normalized,
                format: 'json'
            };
        }
    }

    // 2. Multiline plain-text parsing
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        return {
            success: false,
            items: [],
            error: 'No content found to parse.',
            format: 'empty'
        };
    }

    // Check for header row
    let startIndex = 0;
    let headerMap = null;
    if (lines.length > 1) {
        headerMap = detectHeaderRow(lines[0]);
        if (headerMap) {
            startIndex = 1;
        }
    }

    const parsedItems = [];
    const errors = [];

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];

        // Skip divider lines (e.g., |---|---| or -------)
        if (/^[\-\|\+\=\s]+$/.test(line)) continue;

        let item = null;

        // Try delimited parsing if line contains tabs or pipes
        if (line.includes('\t') || line.includes('|')) {
            const delimiter = line.includes('\t') ? '\t' : '|';
            const cells = line.split(delimiter)
                .map(c => c.trim())
                .filter(c => c.length > 0 && c !== '|');

            if (cells.length > 1) {
                item = parseDelimitedCells(cells, headerMap, defaultTax, line);
            }
        }

        // If not delimited or delimiter produced nothing, try free-form / key-value parsing
        if (!item) {
            item = parseFreeFormLine(line, defaultTax);
        }

        if (item) {
            parsedItems.push(item);
        } else {
            errors.push(`Line ${i + 1}: "${line.length > 40 ? line.substring(0, 37) + '...' : line}"`);
        }
    }

    if (parsedItems.length > 0) {
        return {
            success: true,
            items: parsedItems,
            errors: errors.length > 0 ? errors : undefined,
            format: headerMap ? 'delimited-table' : 'plain-text'
        };
    }

    return {
        success: false,
        items: [],
        error: errors.length > 0
            ? `Could not parse lines:\n${errors.slice(0, 3).join('\n')}\nPlease check that each line has an item description and price or quantity.`
            : 'Could not extract quotation items. Please ensure each item includes a description and price or quantity.',
        format: 'unstructured'
    };
}
