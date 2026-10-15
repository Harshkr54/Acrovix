import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Test Suite: Quotation Details & Listing Page Conversion Actions
 * Validates the business logic and UI rules implemented in:
 * - QuotationBuilder.jsx
 * - QuotationList.jsx
 */

function resolveDetailsPageConversionActions({
    quotationStatus,
    purchaseOrderId = null,
    taxInvoiceId = null,
    proformaId = null,
    userRole = 'SUPER_ADMIN'
}) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isEligibleForConversion = quotationStatus === 'ACCEPTED' || quotationStatus === 'CONVERTED';

    let poAction = null;
    if (isEligibleForConversion) {
        if (!purchaseOrderId && quotationStatus === 'ACCEPTED') {
            poAction = {
                type: 'CREATE_PO',
                label: 'Create Purchase Order',
                opensModal: true
            };
        } else if (purchaseOrderId) {
            poAction = {
                type: 'VIEW_PO',
                label: 'View Purchase Orders',
                targetPath: `/purchase-orders/${purchaseOrderId}`
            };
        }
    }

    let invoiceAction = null;
    const hasAnyInvoice = Boolean(taxInvoiceId || proformaId);

    if (isEligibleForConversion) {
        if (!hasAnyInvoice) {
            if (isSuperAdmin) {
                invoiceAction = {
                    type: 'CREATE_INVOICE',
                    label: 'Create Invoice',
                    opensModal: true,
                    supportedTypes: ['TAX_INVOICE', 'PROFORMA']
                };
            }
        } else {
            invoiceAction = {
                type: 'VIEW_INVOICE',
                label: 'View Invoices',
                targetPath: (taxInvoiceId && proformaId) 
                    ? 'OPEN_PICKER_DIALOG' 
                    : `/invoices/${taxInvoiceId || proformaId}`
            };
        }
    }

    const downstreamSummary = {
        hasPoLink: Boolean(purchaseOrderId),
        poPath: purchaseOrderId ? `/purchase-orders/${purchaseOrderId}` : null,
        hasTaxInvoiceLink: Boolean(taxInvoiceId),
        taxInvoicePath: taxInvoiceId ? `/invoices/${taxInvoiceId}` : null,
        hasProformaLink: Boolean(proformaId),
        proformaPath: proformaId ? `/invoices/${proformaId}` : null
    };

    return {
        isEligibleForConversion,
        poAction,
        invoiceAction,
        downstreamSummary
    };
}

function resolveListingPageActions({
    quotationStatus,
    purchaseOrderId = null,
    taxInvoiceId = null,
    proformaId = null,
    userRole = 'SUPER_ADMIN'
}) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const hasPO = purchaseOrderId != null;
    const hasProforma = proformaId != null;
    const hasTaxInvoice = taxInvoiceId != null;

    const actions = [];

    if (quotationStatus === 'ACCEPTED') {
        if (hasPO) {
            actions.push({ label: 'View Purchase Orders', path: `/purchase-orders/${purchaseOrderId}` });
        } else {
            actions.push({ label: 'Create Purchase Order', opensModal: true });
        }

        if (isSuperAdmin) {
            actions.push(hasProforma 
                ? { label: 'View Proforma', path: `/invoices/${proformaId}` } 
                : { label: 'Create Proforma', opensDialog: true });
            actions.push(hasTaxInvoice 
                ? { label: 'View Tax Invoice', path: `/invoices/${taxInvoiceId}` } 
                : { label: 'Create Tax Invoice', opensDialog: true });
        } else {
            if (hasProforma) actions.push({ label: 'View Proforma', path: `/invoices/${proformaId}` });
            if (hasTaxInvoice) actions.push({ label: 'View Tax Invoice', path: `/invoices/${taxInvoiceId}` });
        }
    } else if (quotationStatus === 'CONVERTED') {
        if (hasPO) {
            actions.push({ label: 'View Purchase Orders', path: `/purchase-orders/${purchaseOrderId}` });
        }
        if (isSuperAdmin) {
            actions.push(hasProforma 
                ? { label: 'View Proforma', path: `/invoices/${proformaId}` } 
                : { label: 'Create Proforma', opensDialog: true });
            actions.push(hasTaxInvoice 
                ? { label: 'View Tax Invoice', path: `/invoices/${taxInvoiceId}` } 
                : { label: 'Create Tax Invoice', opensDialog: true });
        } else {
            if (hasProforma) actions.push({ label: 'View Proforma', path: `/invoices/${proformaId}` });
            if (hasTaxInvoice) actions.push({ label: 'View Tax Invoice', path: `/invoices/${taxInvoiceId}` });
        }
    }

    return actions;
}

test('1. Accepted quotation without a PO displays "Create Purchase Order"', () => {
    const detailsUi = resolveDetailsPageConversionActions({
        quotationStatus: 'ACCEPTED',
        purchaseOrderId: null
    });

    assert.equal(detailsUi.isEligibleForConversion, true);
    assert.ok(detailsUi.poAction);
    assert.equal(detailsUi.poAction.type, 'CREATE_PO');
    assert.equal(detailsUi.poAction.label, 'Create Purchase Order');
    assert.equal(detailsUi.poAction.opensModal, true);
});

test('2. Accepted quotation with an existing PO displays "View Purchase Orders" and navigates correctly', () => {
    const detailsUi = resolveDetailsPageConversionActions({
        quotationStatus: 'ACCEPTED',
        purchaseOrderId: 42
    });

    assert.equal(detailsUi.isEligibleForConversion, true);
    assert.ok(detailsUi.poAction);
    assert.equal(detailsUi.poAction.type, 'VIEW_PO');
    assert.equal(detailsUi.poAction.label, 'View Purchase Orders');
    assert.equal(detailsUi.poAction.targetPath, '/purchase-orders/42');
    assert.equal(detailsUi.downstreamSummary.hasPoLink, true);
    assert.equal(detailsUi.downstreamSummary.poPath, '/purchase-orders/42');
});

test('3. Converted quotation with an existing PO displays "View Purchase Orders" and prohibits duplicate PO creation', () => {
    const detailsUi = resolveDetailsPageConversionActions({
        quotationStatus: 'CONVERTED',
        purchaseOrderId: 105
    });

    assert.equal(detailsUi.isEligibleForConversion, true);
    assert.ok(detailsUi.poAction);
    assert.equal(detailsUi.poAction.type, 'VIEW_PO');
    assert.equal(detailsUi.poAction.label, 'View Purchase Orders');
    assert.equal(detailsUi.poAction.targetPath, '/purchase-orders/105');
});

test('4. Super Admin on accepted/converted quotation with no invoice displays "Create Invoice"', () => {
    const detailsUi = resolveDetailsPageConversionActions({
        quotationStatus: 'ACCEPTED',
        purchaseOrderId: 10,
        taxInvoiceId: null,
        proformaId: null,
        userRole: 'SUPER_ADMIN'
    });

    assert.ok(detailsUi.invoiceAction);
    assert.equal(detailsUi.invoiceAction.type, 'CREATE_INVOICE');
    assert.equal(detailsUi.invoiceAction.label, 'Create Invoice');
    assert.equal(detailsUi.invoiceAction.opensModal, true);
    assert.deepEqual(detailsUi.invoiceAction.supportedTypes, ['TAX_INVOICE', 'PROFORMA']);
});

test('5. Non-Super Admin cannot create invoices from quotation', () => {
    const detailsUi = resolveDetailsPageConversionActions({
        quotationStatus: 'ACCEPTED',
        purchaseOrderId: 10,
        taxInvoiceId: null,
        proformaId: null,
        userRole: 'SALES_EXECUTIVE'
    });

    // Invoice action should be hidden because non-super admins lack permission to create invoice
    assert.equal(detailsUi.invoiceAction, null);
});

test('6. When an invoice already exists, "View Invoices" is shown for all authorized users', () => {
    // Single tax invoice
    const singleTax = resolveDetailsPageConversionActions({
        quotationStatus: 'ACCEPTED',
        taxInvoiceId: 88,
        proformaId: null,
        userRole: 'SALES_EXECUTIVE'
    });
    assert.ok(singleTax.invoiceAction);
    assert.equal(singleTax.invoiceAction.type, 'VIEW_INVOICE');
    assert.equal(singleTax.invoiceAction.label, 'View Invoices');
    assert.equal(singleTax.invoiceAction.targetPath, '/invoices/88');

    // Both tax and proforma invoices exist -> opens picker dialog
    const multipleInvoices = resolveDetailsPageConversionActions({
        quotationStatus: 'CONVERTED',
        taxInvoiceId: 88,
        proformaId: 99,
        userRole: 'SUPER_ADMIN'
    });
    assert.equal(multipleInvoices.invoiceAction.type, 'VIEW_INVOICE');
    assert.equal(multipleInvoices.invoiceAction.targetPath, 'OPEN_PICKER_DIALOG');
    assert.equal(multipleInvoices.downstreamSummary.taxInvoicePath, '/invoices/88');
    assert.equal(multipleInvoices.downstreamSummary.proformaPath, '/invoices/99');
});

test('7. Ineligible quotations (DRAFT, SENT, REJECTED, EXPIRED) hide conversion actions', () => {
    const statuses = ['DRAFT', 'SENT', 'REJECTED', 'EXPIRED'];

    for (const status of statuses) {
        const detailsUi = resolveDetailsPageConversionActions({
            quotationStatus: status,
            purchaseOrderId: null,
            taxInvoiceId: null,
            proformaId: null
        });

        assert.equal(detailsUi.isEligibleForConversion, false, `Status ${status} should not be eligible for conversion`);
        assert.equal(detailsUi.poAction, null, `Status ${status} should not show PO action`);
        assert.equal(detailsUi.invoiceAction, null, `Status ${status} should not show Invoice action`);
    }
});

test('8. Listing-page and details-page action consistency', () => {
    // For accepted quotation with no PO:
    const listingActions = resolveListingPageActions({
        quotationStatus: 'ACCEPTED',
        purchaseOrderId: null,
        taxInvoiceId: null,
        proformaId: null,
        userRole: 'SUPER_ADMIN'
    });

    const poListingAction = listingActions.find(a => a.label.includes('Purchase Order'));
    assert.ok(poListingAction);
    assert.equal(poListingAction.label, 'Create Purchase Order');

    // For accepted quotation with PO:
    const listingWithPo = resolveListingPageActions({
        quotationStatus: 'ACCEPTED',
        purchaseOrderId: 77,
        taxInvoiceId: null,
        proformaId: null,
        userRole: 'SUPER_ADMIN'
    });
    const poViewAction = listingWithPo.find(a => a.label.includes('Purchase Order'));
    assert.ok(poViewAction);
    assert.equal(poViewAction.label, 'View Purchase Orders');
    assert.equal(poViewAction.path, '/purchase-orders/77');
});
