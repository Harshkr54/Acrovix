import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Quotation Read-Only Mode & Lifecycle Frontend State Logic
 * mirrors QuotationBuilder.jsx logic for:
 * - Persisted status evaluation (isReadOnly)
 * - Lock banners and status alerts
 * - Action button visibility (Save Draft, Send, Create Revision, Downstream links)
 * - Submission guard preventing accidental mutation when read-only
 */

function computeQuotationUiState({ currentQuotationId, persistedStatus }) {
    const isReadOnly = Boolean(currentQuotationId && persistedStatus && persistedStatus !== 'DRAFT');
    const isAccepted = persistedStatus === 'ACCEPTED';
    const isDraft = !persistedStatus || persistedStatus === 'DRAFT';
    const isSent = persistedStatus === 'SENT';
    const isTerminal = ['REJECTED', 'EXPIRED', 'CONVERTED', 'REVISED'].includes(persistedStatus);

    // Banners
    let banner = null;
    if (isAccepted) {
        banner = {
            type: 'LOCK_BANNER',
            title: 'Quotation Locked',
            message: 'This quotation has been accepted and is locked against editing.'
        };
    } else if (isSent) {
        banner = {
            type: 'INFO_BANNER',
            title: 'Quotation Sent (Read-Only)',
            message: 'This quotation has been dispatched to the client.'
        };
    } else if (isTerminal) {
        banner = {
            type: 'ARCHIVE_BANNER',
            title: `Quotation ${persistedStatus}`,
            message: 'This quotation is archived and cannot be edited.'
        };
    }

    // Action buttons visible
    const canSaveDraft = !isReadOnly;
    const canSendQuotation = !isReadOnly;
    const canCreateRevision = isReadOnly && Boolean(currentQuotationId);
    const canViewPurchaseOrders = isAccepted;
    const canViewInvoices = isAccepted;
    const canPreviewOrDownload = true; // Always preserved

    return {
        isReadOnly,
        isDraft,
        isAccepted,
        isSent,
        isTerminal,
        banner,
        actions: {
            canSaveDraft,
            canSendQuotation,
            canCreateRevision,
            canViewPurchaseOrders,
            canViewInvoices,
            canPreviewOrDownload
        }
    };
}

/**
 * Guarded handlers mimicking QuotationBuilder's handleSaveDraft and executeSendQuotation
 */
async function simulateSaveDraft({ isReadOnly, saveApiMock }) {
    if (isReadOnly) {
        return { blocked: true, reason: 'QUOTATION_READ_ONLY' };
    }
    return { blocked: false, result: await saveApiMock() };
}

async function simulateSendQuotation({ isReadOnly, sendApiMock }) {
    if (isReadOnly) {
        return { blocked: true, reason: 'QUOTATION_READ_ONLY' };
    }
    return { blocked: false, result: await sendApiMock() };
}

/**
 * Revision creator simulation
 */
async function simulateCreateRevision({ currentQuotationId, revisionApiMock, navigateMock }) {
    if (!currentQuotationId) {
        throw new Error('No quotation selected to revise.');
    }
    const response = await revisionApiMock(currentQuotationId);
    if (response && response.id) {
        navigateMock(`/quotations/edit/${response.id}`);
    }
    return response;
}

test('DRAFT quotation is fully editable with Save Draft and Send available', () => {
    const state = computeQuotationUiState({ currentQuotationId: '101', persistedStatus: 'DRAFT' });
    assert.strictEqual(state.isReadOnly, false);
    assert.strictEqual(state.actions.canSaveDraft, true);
    assert.strictEqual(state.actions.canSendQuotation, true);
    assert.strictEqual(state.actions.canCreateRevision, false);
    assert.strictEqual(state.banner, null);
});

test('SENT quotation is read-only, hides Save/Send, enables Revision and preserves Preview', () => {
    const state = computeQuotationUiState({ currentQuotationId: '102', persistedStatus: 'SENT' });
    assert.strictEqual(state.isReadOnly, true);
    assert.strictEqual(state.actions.canSaveDraft, false);
    assert.strictEqual(state.actions.canSendQuotation, false);
    assert.strictEqual(state.actions.canCreateRevision, true);
    assert.strictEqual(state.actions.canPreviewOrDownload, true);
    assert.strictEqual(state.banner?.type, 'INFO_BANNER');
});

test('ACCEPTED quotation is locked, displays exact lock banner and enables downstream shortcuts', () => {
    const state = computeQuotationUiState({ currentQuotationId: '103', persistedStatus: 'ACCEPTED' });
    assert.strictEqual(state.isReadOnly, true);
    assert.strictEqual(state.isAccepted, true);
    assert.strictEqual(state.actions.canSaveDraft, false);
    assert.strictEqual(state.actions.canSendQuotation, false);
    assert.strictEqual(state.actions.canCreateRevision, true);
    assert.strictEqual(state.actions.canViewPurchaseOrders, true);
    assert.strictEqual(state.actions.canViewInvoices, true);
    assert.strictEqual(state.actions.canPreviewOrDownload, true);
    assert.strictEqual(state.banner?.type, 'LOCK_BANNER');
    assert.strictEqual(
        state.banner?.message,
        'This quotation has been accepted and is locked against editing.'
    );
});

test('REJECTED and EXPIRED quotations are read-only historical records', () => {
    for (const status of ['REJECTED', 'EXPIRED']) {
        const state = computeQuotationUiState({ currentQuotationId: '104', persistedStatus: status });
        assert.strictEqual(state.isReadOnly, true);
        assert.strictEqual(state.actions.canSaveDraft, false);
        assert.strictEqual(state.actions.canSendQuotation, false);
        assert.strictEqual(state.actions.canCreateRevision, true);
        assert.strictEqual(state.banner?.type, 'ARCHIVE_BANNER');
    }
});

test('Guarded Save and Send handlers block submissions when quotation is read-only', async () => {
    let apiCalled = false;
    const saveMock = async () => { apiCalled = true; return { success: true }; };
    const sendMock = async () => { apiCalled = true; return { success: true }; };

    const saveResult = await simulateSaveDraft({ isReadOnly: true, saveApiMock: saveMock });
    assert.strictEqual(saveResult.blocked, true);
    assert.strictEqual(saveResult.reason, 'QUOTATION_READ_ONLY');
    assert.strictEqual(apiCalled, false);

    const sendResult = await simulateSendQuotation({ isReadOnly: true, sendApiMock: sendMock });
    assert.strictEqual(sendResult.blocked, true);
    assert.strictEqual(sendResult.reason, 'QUOTATION_READ_ONLY');
    assert.strictEqual(apiCalled, false);
});

test('Revision creation flow calls revision endpoint and navigates to new revision', async () => {
    let navigatedTo = null;
    const navigateMock = (url) => { navigatedTo = url; };
    const revisionApiMock = async (id) => ({
        id: 205,
        quotationNumber: 'QT-2026-0001-R1',
        parentQuotationId: Number(id),
        status: 'DRAFT'
    });

    const result = await simulateCreateRevision({
        currentQuotationId: '103',
        revisionApiMock,
        navigateMock
    });

    assert.strictEqual(result.id, 205);
    assert.strictEqual(result.parentQuotationId, 103);
    assert.strictEqual(navigatedTo, '/quotations/edit/205');
});
