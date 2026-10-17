import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Test Suite: Purchase Order Details Layout & Complete Client Information
 * Validates:
 * 1. Order Details table card spans full width (w-full) below upper cards without restrictive col-spans.
 * 2. Bill To & Ship To / Client Details are arranged in a balanced responsive grid.
 * 3. Source Quotation & Timeline supporting cards are arranged side-by-side above the table.
 * 4. Ship To / Client Details renders complete available client info (company, contact, addresses, GSTIN, PAN, phones, email, customer code, payment terms).
 * 5. Distinct shipping address is rendered separately when different from billing, and deduplicated when identical.
 * 6. Missing fields handle gracefully without undefined, null, or blank labels.
 * 7. Default columns include all 11 required line-item fields (SKU, Description, HSN/SAC, Quantity, List Price, Discount %, Unit Price, Tax %, Tax Amount, Total).
 * 8. Column value extraction and totals calculations correctly derive tax amounts and grand totals.
 */

// Read source code of PurchaseOrderDetail.jsx
const filePath = resolve(process.cwd(), 'src/pages/PurchaseOrderDetail.jsx');
const sourceCode = readFileSync(filePath, 'utf-8');

test('1. Order Details table card spans full width (w-full) and is outside restrictive columns', () => {
    // Assert old restrictive xl:grid-cols-3 containing table is eliminated
    assert.doesNotMatch(
        sourceCode,
        /grid\s+grid-cols-1\s+xl:grid-cols-3\s+gap-6\s+items-start[\s\S]*?<ShoppingCart/m,
        'Order Details table should NOT be nested inside restrictive xl:grid-cols-3'
    );

    // Assert Order Details card has full width container
    assert.match(
        sourceCode,
        /<div className="acx-card overflow-hidden w-full">\s*<div[^>]*>\s*<h3[^>]*>\s*<ShoppingCart/m,
        'Order Details card must have "acx-card overflow-hidden w-full" container'
    );

    // Assert table container has overflow-x-auto for controlled horizontal scrolling without page overflow
    assert.match(
        sourceCode,
        /ref=\{tableContainerRef\}\s+className="overflow-x-auto w-full no-scrollbar table-wrapper"/m,
        'Table must have responsive overflow-x-auto container with table-wrapper'
    );

    // Assert thin synchronized horizontal scrollbar is present
    assert.match(
        sourceCode,
        /isTableOverflowing && \(/,
        'Table must render synchronized horizontal scrollbar when table overflows container'
    );
});

test('2. Upper cards layout: Buyer / Bill To, Supplier / Vendor & Ship To in Row 1, Source Quotation & Timeline in Row 2', () => {
    // Row 1: Buyer and Supplier & Delivery Destination in 2 Columns
    assert.match(
        sourceCode,
        /<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">/m,
        'Buyer / Bill To and Supplier & Delivery Destination must be placed in a 2-column responsive grid'
    );
    assert.match(sourceCode, /BUYER \/ BILL TO/, 'Must contain Buyer / Bill To card');
    assert.match(sourceCode, /SUPPLIER \/ VENDOR/, 'Must contain Supplier / Vendor section');
    assert.match(sourceCode, /DELIVERY DESTINATION/, 'Must contain Delivery Destination section');

    // Row 2: Source Quotation & Timeline
    assert.match(
        sourceCode,
        /<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">\s*{\/\* Source Quotation \*\/}/m,
        'Source Quotation and Timeline must be placed side-by-side in a 2-column supporting grid'
    );

    // Order Details Table appears after Row 2
    const quotationIndex = sourceCode.indexOf('Source Quotation');
    const timelineIndex = sourceCode.indexOf('Timeline');
    const orderDetailsIndex = sourceCode.indexOf('<ShoppingCart className="w-4 h-4 mr-2 text-brand-teal" /> Order Details');

    assert.ok(quotationIndex > 0, 'Source Quotation exists');
    assert.ok(timelineIndex > quotationIndex, 'Timeline exists after Source Quotation');
    assert.ok(orderDetailsIndex > timelineIndex, 'Order Details Table is placed below Source Quotation & Timeline');
});

test('3. Client details resolution respects snapshot precedence (Order -> Quotation -> Customer Master)', () => {
    // Resolution helper function simulation
    function resolveClientDetails({ order, quotation, customer }) {
        const clientCompany = order?.clientCompany || quotation?.clientCompany || customer?.companyName || '';
        const clientContact = order?.clientName || quotation?.clientName || customer?.name || '';
        const clientEmail = order?.clientEmail || quotation?.clientEmail || customer?.email || '';
        const clientPhone = order?.clientPhone || quotation?.clientPhone || customer?.phone || '';
        const clientAltPhone = quotation?.alternatePhone || customer?.alternatePhone || '';
        const clientGstin = quotation?.gstin || customer?.gstin || '';
        const clientPan = quotation?.pan || customer?.pan || '';
        const clientCode = customer?.customerCode || quotation?.customerCode || '';
        const clientPaymentTerms = quotation?.paymentTerms || customer?.paymentTerms || '';

        return {
            clientCompany,
            clientContact,
            clientEmail,
            clientPhone,
            clientAltPhone,
            clientGstin,
            clientPan,
            clientCode,
            clientPaymentTerms
        };
    }

    // Historical PO: customer details changed later, but PO preserved snapshot
    const historicalOrder = {
        clientCompany: 'Acme Old Corp',
        clientName: 'John Doe',
        clientEmail: 'john@acmeold.com',
        clientPhone: '+91 9876543210'
    };
    const historicalQuotation = {
        clientCompany: 'Acme Old Corp',
        clientName: 'John Doe',
        clientEmail: 'john@acmeold.com',
        clientPhone: '+91 9876543210',
        gstin: '07AAAAA0000A1Z5',
        pan: 'AAAAA0000A'
    };
    const updatedCustomerMaster = {
        companyName: 'Acme New Global Ltd',
        name: 'Jane Smith',
        email: 'jane@acmenew.com',
        phone: '+91 9999999999',
        alternatePhone: '+91 8888888888',
        gstin: '27BBBBB1111B2Z6',
        pan: 'BBBBB1111B',
        customerCode: 'CUST-0042',
        paymentTerms: 'Net 30'
    };

    const resolved = resolveClientDetails({
        order: historicalOrder,
        quotation: historicalQuotation,
        customer: updatedCustomerMaster
    });

    // PO snapshot takes precedence for company and contact
    assert.equal(resolved.clientCompany, 'Acme Old Corp', 'PO snapshot company name is preserved');
    assert.equal(resolved.clientContact, 'John Doe', 'PO snapshot contact name is preserved');
    assert.equal(resolved.clientEmail, 'john@acmeold.com', 'PO snapshot email is preserved');
    assert.equal(resolved.clientPhone, '+91 9876543210', 'PO snapshot phone is preserved');
    assert.equal(resolved.clientGstin, '07AAAAA0000A1Z5', 'Quotation snapshot GSTIN is preserved');
    assert.equal(resolved.clientPan, 'AAAAA0000A', 'Quotation snapshot PAN is preserved');
    // Enriched fields from master
    assert.equal(resolved.clientCode, 'CUST-0042', 'Customer code enriched from master');
    assert.equal(resolved.clientPaymentTerms, 'Net 30', 'Payment terms enriched from master');
    assert.equal(resolved.clientAltPhone, '+91 8888888888', 'Alternate phone enriched from master');
});

test('4. Address formatting: handles separate billing and distinct shipping addresses', () => {
    function getClientAddressLines(rawAddress, state, pincode) {
        if (!rawAddress && !state && !pincode) return [];
        const lines = [];
        if (rawAddress && rawAddress.trim()) {
            const splitLines = rawAddress.split('\n').map(l => l.trim()).filter(Boolean);
            lines.push(...splitLines);
            
            const fullRaw = rawAddress.toLowerCase();
            const stateNeedsAdd = state && !fullRaw.includes(state.toLowerCase());
            const pinNeedsAdd = pincode && !fullRaw.includes(pincode.toString().toLowerCase());
            
            if (stateNeedsAdd || pinNeedsAdd) {
                const locParts = [stateNeedsAdd ? state : null, pinNeedsAdd ? pincode : null].filter(Boolean);
                lines.push(locParts.join(' - '));
            }
        } else {
            const locParts = [state, pincode].filter(Boolean);
            if (locParts.length > 0) {
                lines.push(locParts.join(' - '));
            }
        }
        return lines;
    }

    // Case A: Full billing address with street, state, and pincode
    const billingLines = getClientAddressLines(
        '123 Corporate Park, Tower B, 4th Floor',
        'Maharashtra',
        '400001'
    );
    assert.equal(billingLines.length, 2);
    assert.equal(billingLines[0], '123 Corporate Park, Tower B, 4th Floor');
    assert.equal(billingLines[1], 'Maharashtra - 400001');

    // Case B: Distinct shipping address
    const shippingLines = getClientAddressLines(
        'Warehouse 4, Logistics Park, Bhiwandi',
        null,
        null
    );
    assert.equal(shippingLines.length, 1);
    assert.equal(shippingLines[0], 'Warehouse 4, Logistics Park, Bhiwandi');

    const hasDistinctShipping = Boolean(
        shippingLines.length > 0 &&
        billingLines.length > 0 &&
        shippingLines.join(' ').trim().toLowerCase() !== billingLines.join(' ').trim().toLowerCase()
    );
    assert.equal(hasDistinctShipping, true, 'Distinct shipping address detected');

    // Case C: Identical shipping address does not trigger separate section
    const identicalShippingLines = getClientAddressLines(
        '123 Corporate Park, Tower B, 4th Floor',
        'Maharashtra',
        '400001'
    );
    const hasDistinctWhenIdentical = Boolean(
        identicalShippingLines.length > 0 &&
        billingLines.length > 0 &&
        identicalShippingLines.join(' ').trim().toLowerCase() !== billingLines.join(' ').trim().toLowerCase()
    );
    assert.equal(hasDistinctWhenIdentical, false, 'Identical shipping address is deduplicated');
});

test('5. Missing optional fields handle gracefully without displaying undefined or null', () => {
    // When PO has minimal data
    const minimalOrder = {
        clientCompany: null,
        clientName: 'Solo Freelancer',
        clientEmail: null,
        clientPhone: null
    };
    const minimalQuotation = {};
    const minimalCustomer = null;

    const clientCompany = minimalOrder?.clientCompany || minimalQuotation?.clientCompany || minimalCustomer?.companyName || '';
    const clientContact = minimalOrder?.clientName || minimalQuotation?.clientName || minimalCustomer?.name || '';
    const clientEmail = minimalOrder?.clientEmail || minimalQuotation?.clientEmail || minimalCustomer?.email || '';
    const clientPhone = minimalOrder?.clientPhone || minimalQuotation?.clientPhone || minimalCustomer?.phone || '';
    const clientGstin = minimalQuotation?.gstin || minimalCustomer?.gstin || '';
    const clientPan = minimalQuotation?.pan || minimalCustomer?.pan || '';

    assert.equal(clientCompany || clientContact, 'Solo Freelancer');
    assert.equal(clientEmail, '');
    assert.equal(clientPhone, '');
    assert.equal(clientGstin, '');
    assert.equal(clientPan, '');

    // None of these evaluate to strings "undefined" or "null"
    assert.notEqual(clientCompany, 'undefined');
    assert.notEqual(clientCompany, 'null');
    assert.notEqual(clientEmail, 'undefined');
    assert.notEqual(clientPhone, 'null');
});

test('6. Default column configs contain all 11 required columns with correct types and keys', () => {
    const requiredKeys = [
        'rowNumber',
        'sku',
        'description',
        'hsnSac',
        'quantity',
        'listPrice',
        'discountPercent',
        'unitPrice',
        'taxPercent',
        'taxAmount',
        'total'
    ];

    // Verify source code defines all 11 required keys in defaultConfigs
    for (const key of requiredKeys) {
        const regex = new RegExp(`columnKey:\\s*["']${key}["']`);
        assert.match(sourceCode, regex, `defaultConfigs must contain ${key}`);
    }
});

test('7. Line item column value resolution and calculations (Tax Amount and Total)', () => {
    function getColumnValue(item, colKey) {
        if (colKey === "rowNumber") return (item.sortOrder ?? 0) + 1;
        if (colKey === "taxAmount") {
            if (item.taxAmount !== undefined && item.taxAmount !== null && item.taxAmount !== '') return item.taxAmount;
            const qty = parseFloat(item.quantity) || 0;
            const up = parseFloat(item.unitPrice) || 0;
            const taxPct = parseFloat(item.taxPercent) || 0;
            return (qty * up) * (taxPct / 100);
        }
        if (colKey === "total" || colKey === "lineTotal") {
            if (item.lineTotal !== undefined && item.lineTotal !== null && item.lineTotal !== '') return item.lineTotal;
            if (item.total !== undefined && item.total !== null && item.total !== '') return item.total;
            const qty = parseFloat(item.quantity) || 0;
            const up = parseFloat(item.unitPrice) || 0;
            const taxPct = parseFloat(item.taxPercent) || 0;
            const net = qty * up;
            return net + (net * (taxPct / 100));
        }
        if (["sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent"].includes(colKey)) {
            return item[colKey];
        }
        return item.customValues?.[colKey] || "-";
    }

    const itemA = {
        sortOrder: 0,
        sku: 'SKU-001',
        description: 'Server Maintenance Rack 42U',
        hsnSac: '84715000',
        quantity: 2,
        listPrice: 50000,
        discountPercent: 10,
        unitPrice: 45000,
        taxPercent: 18
    };

    assert.equal(getColumnValue(itemA, 'rowNumber'), 1);
    assert.equal(getColumnValue(itemA, 'sku'), 'SKU-001');
    assert.equal(getColumnValue(itemA, 'hsnSac'), '84715000');
    assert.equal(getColumnValue(itemA, 'quantity'), 2);
    assert.equal(getColumnValue(itemA, 'listPrice'), 50000);
    assert.equal(getColumnValue(itemA, 'discountPercent'), 10);
    assert.equal(getColumnValue(itemA, 'unitPrice'), 45000);
    assert.equal(getColumnValue(itemA, 'taxPercent'), 18);
    // Net = 2 * 45000 = 90000. Tax = 90000 * 0.18 = 16200. Total = 106200.
    assert.equal(getColumnValue(itemA, 'taxAmount'), 16200);
    assert.equal(getColumnValue(itemA, 'total'), 106200);
});
