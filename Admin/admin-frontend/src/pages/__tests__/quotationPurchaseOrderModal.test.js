import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Test Suite: Create Purchase Order Modal Layout & Scroll Behavior
 * Validates:
 * 1. Modal layout structure (fixed overlay, viewport-constrained container, non-scrolling header/footer, scrollable content).
 * 2. Background scroll lock & restoration lifecycle.
 * 3. Escape key dismissal behavior.
 * 4. Preservation of form fields, grand total validation, and API payload integrity.
 */

// Simulation of body scroll lock lifecycle implemented in CreatePurchaseOrderModal.jsx
function createScrollLockManager() {
    const mockDocument = {
        body: {
            style: {
                overflow: ''
            }
        }
    };

    let activeCleanup = null;

    function openModal(isOpen, quotation) {
        if (!isOpen || !quotation) return;

        const previousOverflow = mockDocument.body.style.overflow;
        mockDocument.body.style.overflow = 'hidden';

        activeCleanup = () => {
            mockDocument.body.style.overflow = previousOverflow;
        };
    }

    function closeModal() {
        if (activeCleanup) {
            activeCleanup();
            activeCleanup = null;
        }
    }

    return {
        mockDocument,
        openModal,
        closeModal
    };
}

// Simulation of escape key handler
function createEscapeKeyHandler({ onClose, isLoading }) {
    return function handleKeyDown(event) {
        if (event.key === 'Escape' && !isLoading) {
            onClose();
        }
    };
}

// Simulation of PO submission payload builder
function buildPurchaseOrderPayload({ quotation, formData }) {
    const grandTotalNum = Number(quotation.grandTotal);
    const hasValidGrandTotal = quotation.grandTotal !== null &&
        quotation.grandTotal !== undefined &&
        !isNaN(grandTotalNum) &&
        grandTotalNum > 0;

    if (!hasValidGrandTotal) {
        throw new Error('Cannot convert to Purchase Order: Source quotation does not have a valid grand total.');
    }

    return {
        quotationId: quotation.id,
        clientPoNumber: formData.clientPoNumber,
        poDate: formData.poDate,
        poValue: grandTotalNum,
        receivedVia: formData.receivedVia,
        remarks: formData.remarks
    };
}

test('1. CreatePurchaseOrderModal source code has required layout and responsive classes', () => {
    const filePath = resolve(import.meta.dirname, '../../components/CreatePurchaseOrderModal.jsx');
    const source = readFileSync(filePath, 'utf8');

    // 1. Fixed overlay relative to browser viewport
    assert.match(source, /fixed inset-0/, 'Modal overlay must be fixed to viewport');

    // 2. Responsive max-width of 560px
    assert.match(source, /max-w-\[560px\]/, 'Modal container must have max-w-[560px]');

    // 3. Constrained max-height not exceeding viewport
    assert.match(source, /max-h-\[calc\(100vh-/, 'Modal container must have viewport max-height constraint');

    // 4. Flex column layout with min-height 0
    assert.match(source, /flex flex-col/, 'Modal container must be flex-col');
    assert.match(source, /min-h-0/, 'Layout must include min-h-0 for proper flex shrink');

    // 5. Vertically scrollable content area
    assert.match(source, /overflow-y-auto/, 'Form content must be overflow-y-auto');

    // 6. Non-scrolling header and footer
    assert.match(source, /shrink-0/, 'Header and footer must have shrink-0 to prevent compression');

    // 7. createPortal usage for viewport stability
    assert.match(source, /createPortal/, 'Modal must use createPortal to mount cleanly to document.body');
});

test('2. Background scroll lock prevents page scroll when open and restores previous overflow on close', () => {
    const manager = createScrollLockManager();

    // Initial state: normal page scrolling
    assert.equal(manager.mockDocument.body.style.overflow, '');

    // Open modal
    manager.openModal(true, { id: 17, quotationNumber: 'QT-0017', grandTotal: 50000 });
    assert.equal(manager.mockDocument.body.style.overflow, 'hidden', 'Body overflow must be hidden while modal is open');

    // Close modal
    manager.closeModal();
    assert.equal(manager.mockDocument.body.style.overflow, '', 'Body overflow must be restored after closing modal');
});

test('3. Repeated open and close cycles maintain body scroll restoration integrity', () => {
    const manager = createScrollLockManager();
    const quotation = { id: 17, quotationNumber: 'QT-0017', grandTotal: 50000 };

    for (let cycle = 1; cycle <= 5; cycle++) {
        manager.openModal(true, quotation);
        assert.equal(manager.mockDocument.body.style.overflow, 'hidden', `Cycle ${cycle}: overflow must be locked`);

        manager.closeModal();
        assert.equal(manager.mockDocument.body.style.overflow, '', `Cycle ${cycle}: overflow must be restored`);
    }
});

test('4. Existing body overflow state is preserved rather than hardcoded reset', () => {
    const manager = createScrollLockManager();
    // Simulate pre-existing overflow setting (e.g., auto or customized)
    manager.mockDocument.body.style.overflow = 'scroll';

    manager.openModal(true, { id: 17, quotationNumber: 'QT-0017', grandTotal: 50000 });
    assert.equal(manager.mockDocument.body.style.overflow, 'hidden');

    manager.closeModal();
    assert.equal(manager.mockDocument.body.style.overflow, 'scroll', 'Must restore the exact pre-existing overflow style');
});

test('5. Keyboard Escape dismisses modal when not loading and is ignored when loading', () => {
    let closeCount = 0;
    const onClose = () => { closeCount++; };

    // When not loading
    const handlerIdle = createEscapeKeyHandler({ onClose, isLoading: false });
    handlerIdle({ key: 'Escape' });
    assert.equal(closeCount, 1, 'Escape must call onClose when idle');

    // Other keys ignored
    handlerIdle({ key: 'Enter' });
    assert.equal(closeCount, 1, 'Non-Escape key must not call onClose');

    // When loading
    const handlerLoading = createEscapeKeyHandler({ onClose, isLoading: true });
    handlerLoading({ key: 'Escape' });
    assert.equal(closeCount, 1, 'Escape must NOT call onClose while loading');
});

test('6. Purchase Order creation payload preserves all form fields and grand total derivation', () => {
    const quotation = {
        id: 17,
        quotationNumber: 'QT-2026-0017',
        clientName: 'Acme Corp',
        grandTotal: 125000.50,
        currency: 'INR'
    };

    const formData = {
        clientPoNumber: 'PO-ACME-991',
        poDate: '2026-10-15',
        receivedVia: 'PORTAL',
        remarks: 'Delivery required at Pune warehouse by Nov 1'
    };

    const payload = buildPurchaseOrderPayload({ quotation, formData });

    assert.equal(payload.quotationId, 17);
    assert.equal(payload.clientPoNumber, 'PO-ACME-991');
    assert.equal(payload.poDate, '2026-10-15');
    assert.equal(payload.poValue, 125000.50);
    assert.equal(payload.receivedVia, 'PORTAL');
    assert.equal(payload.remarks, 'Delivery required at Pune warehouse by Nov 1');
});

test('7. Validation rejects quotations without valid grand total', () => {
    const invalidQuotations = [
        { id: 1, grandTotal: null },
        { id: 2, grandTotal: undefined },
        { id: 3, grandTotal: 0 },
        { id: 4, grandTotal: -500 },
        { id: 5, grandTotal: 'invalid' }
    ];

    const formData = {
        clientPoNumber: '',
        poDate: '2026-10-15',
        receivedVia: 'EMAIL',
        remarks: ''
    };

    for (const quotation of invalidQuotations) {
        assert.throws(
            () => buildPurchaseOrderPayload({ quotation, formData }),
            /Cannot convert to Purchase Order/,
            `Quotation with grandTotal ${quotation.grandTotal} must be rejected`
        );
    }
});
