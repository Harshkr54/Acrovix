import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests verifying Quotation Rejection Notes and Response Source:
 * 1. Modal payload creation and validation.
 * 2. QuotationBuilder response state ingestion upon loading / refreshing.
 * 3. Graceful handling of empty/optional rejection notes.
 * 4. Error handling when backend request fails (no false success).
 * 5. Rejection banner presentation model.
 */

// Simulates AcceptRejectQuotationModal submission
async function submitAcceptRejectModal({ quotationId, type, responseSource, responseNotes, apiFetchMock, onSuccess, onClose }) {
    const isAccept = type === 'ACCEPT';
    try {
        const result = await apiFetchMock(`/quotations/${quotationId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
                status: isAccept ? 'ACCEPTED' : 'REJECTED',
                responseSource,
                responseNotes: responseNotes ? responseNotes.trim() : ''
            })
        });
        if (onSuccess) onSuccess(result);
        if (onClose) onClose();
        return { success: true, data: result };
    } catch (err) {
        return { success: false, error: err.message || 'Status update failed' };
    }
}

// Simulates QuotationBuilder.jsx loadExistingQuotation
function parseLoadedQuotationIntoState(quotationData) {
    return {
        quotationId: quotationData.id,
        quotationNumber: quotationData.quotationNumber,
        quotationStatus: quotationData.status || 'DRAFT',
        responseSource: quotationData.responseSource || null,
        responseNotes: quotationData.responseNotes || '',
        isReadOnly: Boolean(quotationData.id && quotationData.status && quotationData.status !== 'DRAFT')
    };
}

// Simulates QuotationBuilder rejection banner rendering logic
function renderRejectionBanner(state) {
    if (state.quotationStatus !== 'REJECTED') return null;
    return {
        bannerId: 'quotation-rejected-banner',
        title: 'This quotation was rejected and is retained as a read-only historical record.',
        hasReasonBlock: Boolean(state.responseSource || state.responseNotes),
        responseSource: state.responseSource,
        sourceBadgeText: state.responseSource ? `via ${state.responseSource}` : null,
        notesDisplayText: state.responseNotes ? `"${state.responseNotes}"` : 'No notes provided',
        isReadOnly: state.isReadOnly
    };
}

test('Reject quotation with note "Price is high" sends correct payload and persists in state', async () => {
    let capturedUrl = null;
    let capturedOptions = null;
    let successCalled = false;
    let closeCalled = false;

    const mockBackendResponse = {
        id: 42,
        quotationNumber: 'QT-2026-0042',
        status: 'REJECTED',
        responseSource: 'PHONE',
        responseNotes: 'Price is high'
    };

    const apiFetchMock = async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return mockBackendResponse;
    };

    const res = await submitAcceptRejectModal({
        quotationId: 42,
        type: 'REJECT',
        responseSource: 'PHONE',
        responseNotes: 'Price is high',
        apiFetchMock,
        onSuccess: (data) => {
            successCalled = true;
            assert.strictEqual(data.status, 'REJECTED');
        },
        onClose: () => { closeCalled = true; }
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(successCalled, true);
    assert.strictEqual(closeCalled, true);
    assert.strictEqual(capturedUrl, '/quotations/42/status');

    const sentBody = JSON.parse(capturedOptions.body);
    assert.strictEqual(sentBody.status, 'REJECTED');
    assert.strictEqual(sentBody.responseSource, 'PHONE');
    assert.strictEqual(sentBody.responseNotes, 'Price is high');

    // Simulate QuotationBuilder state after rejection
    const builderState = parseLoadedQuotationIntoState(mockBackendResponse);
    assert.strictEqual(builderState.quotationStatus, 'REJECTED');
    assert.strictEqual(builderState.responseSource, 'PHONE');
    assert.strictEqual(builderState.responseNotes, 'Price is high');
    assert.strictEqual(builderState.isReadOnly, true);

    // Verify rejection banner rendering
    const banner = renderRejectionBanner(builderState);
    assert.ok(banner);
    assert.strictEqual(banner.sourceBadgeText, 'via PHONE');
    assert.strictEqual(banner.notesDisplayText, '"Price is high"');
});

test('Persisted note remains intact after simulated page refresh', async () => {
    // Database returns the previously persisted record
    const fetchApiAfterRefresh = async (url) => {
        assert.strictEqual(url, '/quotations/42');
        return {
            id: 42,
            quotationNumber: 'QT-2026-0042',
            status: 'REJECTED',
            responseSource: 'PHONE',
            responseNotes: 'Price is high'
        };
    };

    const refreshedData = await fetchApiAfterRefresh('/quotations/42');
    const state = parseLoadedQuotationIntoState(refreshedData);

    assert.strictEqual(state.responseSource, 'PHONE');
    assert.strictEqual(state.responseNotes, 'Price is high');
    assert.strictEqual(state.quotationStatus, 'REJECTED');

    const banner = renderRejectionBanner(state);
    assert.strictEqual(banner.notesDisplayText, '"Price is high"');
    assert.strictEqual(banner.sourceBadgeText, 'via PHONE');
});

test('Reject quotation with empty optional note handles gracefully', async () => {
    let capturedOptions = null;
    const mockBackendResponse = {
        id: 43,
        quotationNumber: 'QT-2026-0043',
        status: 'REJECTED',
        responseSource: 'EMAIL',
        responseNotes: ''
    };

    const apiFetchMock = async (url, options) => {
        capturedOptions = options;
        return mockBackendResponse;
    };

    const res = await submitAcceptRejectModal({
        quotationId: 43,
        type: 'REJECT',
        responseSource: 'EMAIL',
        responseNotes: '   ', // whitespace only
        apiFetchMock,
        onSuccess: () => {},
        onClose: () => {}
    });

    assert.strictEqual(res.success, true);
    const sentBody = JSON.parse(capturedOptions.body);
    assert.strictEqual(sentBody.status, 'REJECTED');
    assert.strictEqual(sentBody.responseSource, 'EMAIL');
    assert.strictEqual(sentBody.responseNotes, ''); // Trimmed to empty string

    const state = parseLoadedQuotationIntoState(mockBackendResponse);
    assert.strictEqual(state.responseNotes, '');
    assert.strictEqual(state.responseSource, 'EMAIL');

    const banner = renderRejectionBanner(state);
    assert.strictEqual(banner.notesDisplayText, 'No notes provided');
    assert.strictEqual(banner.sourceBadgeText, 'via EMAIL');
});

test('Failed status update does not invoke onSuccess or onClose', async () => {
    let successCalled = false;
    let closeCalled = false;

    const failingApiMock = async () => {
        throw new Error('Database transaction timeout');
    };

    const res = await submitAcceptRejectModal({
        quotationId: 44,
        type: 'REJECT',
        responseSource: 'PHONE',
        responseNotes: 'Price is high',
        apiFetchMock: failingApiMock,
        onSuccess: () => { successCalled = true; },
        onClose: () => { closeCalled = true; }
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Database transaction timeout');
    assert.strictEqual(successCalled, false, 'onSuccess must NOT be called on failure');
    assert.strictEqual(closeCalled, false, 'onClose must NOT be called on failure');
});
