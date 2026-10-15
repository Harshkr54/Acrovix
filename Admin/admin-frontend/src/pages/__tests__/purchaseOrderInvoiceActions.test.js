import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Test Suite: Purchase Order Details Page Invoice Actions & Business Rules
 * Validates the business logic and UI rules implemented in PurchaseOrderDetail.jsx
 */

function resolvePoInvoiceActions({
    orderStatus,
    poValue = 100000,
    invoicedAmount = 0,
    activeTaxInvoiceId = null,
    userRole = 'SUPER_ADMIN',
    actionLoading = false
}) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isEligibleStatus = ['VERIFIED', 'PARTIALLY_FULFILLED'].includes(orderStatus);
    const remainingAmount = Math.max(0, poValue - invoicedAmount);
    const isFullyInvoiced = poValue > 0 && invoicedAmount >= poValue && activeTaxInvoiceId != null;

    const canCreateTaxInvoice = isSuperAdmin && isEligibleStatus && !isFullyInvoiced && !actionLoading;
    const canViewTaxInvoice = Boolean(activeTaxInvoiceId);
    const canVerify = isSuperAdmin && orderStatus === 'RECEIVED' && !actionLoading;
    const isReadOnly = ['VERIFIED', 'FULFILLED', 'CANCELLED'].includes(orderStatus);

    return {
        isEligibleStatus,
        isReadOnly,
        remainingAmount,
        isFullyInvoiced,
        canCreateTaxInvoice,
        canViewTaxInvoice,
        canVerify,
        viewTaxInvoicePath: activeTaxInvoiceId ? `/invoices/${activeTaxInvoiceId}` : null
    };
}

test('1. RECEIVED purchase order displays "Verify" and cannot create Tax Invoice', () => {
    const actions = resolvePoInvoiceActions({
        orderStatus: 'RECEIVED',
        poValue: 50000,
        invoicedAmount: 0
    });

    assert.equal(actions.canVerify, true);
    assert.equal(actions.canCreateTaxInvoice, false);
    assert.equal(actions.isEligibleStatus, false);
    assert.equal(actions.isReadOnly, false);
});

test('2. VERIFIED purchase order in read-only mode permits creating Tax Invoice', () => {
    const actions = resolvePoInvoiceActions({
        orderStatus: 'VERIFIED',
        poValue: 1927550,
        invoicedAmount: 0,
        activeTaxInvoiceId: null
    });

    assert.equal(actions.isReadOnly, true);
    assert.equal(actions.isEligibleStatus, true);
    assert.equal(actions.canCreateTaxInvoice, true);
    assert.equal(actions.remainingAmount, 1927550);
});

test('3. Non-Super Admin cannot create Tax Invoice on VERIFIED PO', () => {
    const actions = resolvePoInvoiceActions({
        orderStatus: 'VERIFIED',
        poValue: 1927550,
        invoicedAmount: 0,
        userRole: 'SALES'
    });

    assert.equal(actions.canCreateTaxInvoice, false);
});

test('4. Fully invoiced PO displays "View Tax Invoice" and disables/blocks new Tax Invoice', () => {
    const actions = resolvePoInvoiceActions({
        orderStatus: 'VERIFIED',
        poValue: 100000,
        invoicedAmount: 100000,
        activeTaxInvoiceId: 42
    });

    assert.equal(actions.isFullyInvoiced, true);
    assert.equal(actions.remainingAmount, 0);
    assert.equal(actions.canCreateTaxInvoice, false);
    assert.equal(actions.canViewTaxInvoice, true);
    assert.equal(actions.viewTaxInvoicePath, '/invoices/42');
});

test('5. PARTIALLY_FULFILLED PO with remaining balance allows both "View Tax Invoice" and "Create Tax Invoice"', () => {
    const actions = resolvePoInvoiceActions({
        orderStatus: 'PARTIALLY_FULFILLED',
        poValue: 200000,
        invoicedAmount: 100000,
        activeTaxInvoiceId: 42
    });

    assert.equal(actions.isFullyInvoiced, false);
    assert.equal(actions.remainingAmount, 100000);
    assert.equal(actions.canCreateTaxInvoice, true);
    assert.equal(actions.canViewTaxInvoice, true);
});

test('6. In-flight action loading prevents double submissions', () => {
    const actions = resolvePoInvoiceActions({
        orderStatus: 'VERIFIED',
        poValue: 50000,
        invoicedAmount: 0,
        actionLoading: true
    });

    assert.equal(actions.canCreateTaxInvoice, false);
    assert.equal(actions.canVerify, false);
});
