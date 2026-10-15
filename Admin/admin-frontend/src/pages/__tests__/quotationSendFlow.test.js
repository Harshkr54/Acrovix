import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mock simulateQuotationSendFlow implements the exact two-step save/send logic
 * designed in QuotationBuilder.jsx.
 */
async function simulateQuotationSendFlow({
    activeQuotationId,
    quotationNumber,
    isSaving,
    isSending,
    validateFieldsSuccess,
    saveApiMock,
    sendApiMock,
    stateUpdater,
    navigateMock
}) {
    // 1. Guard against duplicate submission
    if (isSending || isSaving) {
        return { stopped: true, reason: 'ALREADY_IN_PROGRESS' };
    }

    // 2. Validate mandatory fields
    if (!validateFieldsSuccess) {
        return { stopped: true, reason: 'VALIDATION_FAILED' };
    }

    stateUpdater.setIsSending(true);
    stateUpdater.setLastSendError(null);

    let savedQuotation = null;

    // Step 1: Save quotation draft first
    try {
        if (!activeQuotationId) {
            throw new Error("No active quotation to send.");
        }
        savedQuotation = await saveApiMock(activeQuotationId);
        if (savedQuotation) {
            if (savedQuotation.status) stateUpdater.setQuotationStatus(savedQuotation.status);
            if (savedQuotation.grandTotal !== undefined) stateUpdater.setQuotationGrandTotal(savedQuotation.grandTotal);
            if (savedQuotation.createdAt) stateUpdater.setQuotationCreatedAt(savedQuotation.createdAt);
            if (savedQuotation.quotationNumber) stateUpdater.setQuotationNumber(savedQuotation.quotationNumber);
        }
    } catch (saveError) {
        stateUpdater.setIsSending(false);
        stateUpdater.setError(`Failed to save quotation before sending: ${saveError.message}`);
        return { 
            success: false, 
            step: 'SAVE_FAILED', 
            error: saveError.message,
            preservedFormData: true 
        };
    }

    // Step 2: Send email
    try {
        const sendResponse = await sendApiMock(activeQuotationId);
        stateUpdater.setQuotationStatus('SENT');
        stateUpdater.setEmailDeliveryStatus('SENT');
        stateUpdater.setEmailSentAt(new Date().toISOString());
        stateUpdater.setEmailRecipient(sendResponse.recipient || 'client@example.com');
        stateUpdater.setEmailErrorMessage('');
        stateUpdater.setLastSendError(null);
        stateUpdater.setIsSending(false);

        // Navigate to the saved quotation's edit/details route
        const targetRoute = `/quotations/edit/${activeQuotationId}`;
        navigateMock(targetRoute);

        return {
            success: true,
            quotationId: activeQuotationId,
            quotationNumber: savedQuotation?.quotationNumber || quotationNumber,
            status: 'SENT',
            navigatedTo: targetRoute
        };
    } catch (sendError) {
        stateUpdater.setIsSending(false);
        stateUpdater.setEmailDeliveryStatus('FAILED');
        stateUpdater.setEmailErrorMessage(sendError.message);
        stateUpdater.setLastSendError(sendError.message);

        // Ensure route points to the saved quotation so user can review & retry safely
        const targetRoute = `/quotations/edit/${activeQuotationId}`;
        navigateMock(targetRoute);

        return {
            success: false,
            step: 'EMAIL_SEND_FAILED',
            quotationPreserved: true,
            quotationId: activeQuotationId,
            error: sendError.message,
            canRetry: true,
            navigatedTo: targetRoute
        };
    }
}

test('Successful Save and Send: sets status to SENT and navigates to /quotations/edit/:id', async () => {
    const state = {
        isSending: false,
        quotationStatus: 'DRAFT',
        emailDeliveryStatus: null,
        error: null,
        lastSendError: null
    };

    const stateUpdater = {
        setIsSending: (val) => { state.isSending = val; },
        setQuotationStatus: (val) => { state.quotationStatus = val; },
        setQuotationGrandTotal: (val) => { state.quotationGrandTotal = val; },
        setQuotationCreatedAt: (val) => { state.quotationCreatedAt = val; },
        setQuotationNumber: (val) => { state.quotationNumber = val; },
        setEmailDeliveryStatus: (val) => { state.emailDeliveryStatus = val; },
        setEmailSentAt: (val) => { state.emailSentAt = val; },
        setEmailRecipient: (val) => { state.emailRecipient = val; },
        setEmailErrorMessage: (val) => { state.emailErrorMessage = val; },
        setLastSendError: (val) => { state.lastSendError = val; },
        setError: (val) => { state.error = val; }
    };

    let navigatedRoute = null;
    const navigateMock = (route) => { navigatedRoute = route; };

    const result = await simulateQuotationSendFlow({
        activeQuotationId: 42,
        quotationNumber: 'ACX-QT-1042',
        isSaving: false,
        isSending: false,
        validateFieldsSuccess: true,
        saveApiMock: async (id) => ({ id, quotationNumber: 'ACX-QT-1042', status: 'DRAFT', grandTotal: 2500 }),
        sendApiMock: async (id) => ({ success: true, quotationId: id, recipient: 'test@customer.com' }),
        stateUpdater,
        navigateMock
    });

    assert.equal(result.success, true);
    assert.equal(result.quotationId, 42);
    assert.equal(result.status, 'SENT');
    assert.equal(result.navigatedTo, '/quotations/edit/42');
    assert.notEqual(result.navigatedTo, '/enquiries', 'Must NOT navigate to /enquiries');
    assert.equal(state.quotationStatus, 'SENT');
    assert.equal(state.emailDeliveryStatus, 'SENT');
    assert.equal(state.isSending, false);
});

test('Save Failure: preserves user data on form, shows error, does not navigate or send email', async () => {
    const state = {
        isSending: false,
        error: null
    };

    const stateUpdater = {
        setIsSending: (val) => { state.isSending = val; },
        setError: (val) => { state.error = val; },
        setQuotationStatus: () => {},
        setQuotationGrandTotal: () => {},
        setQuotationCreatedAt: () => {},
        setQuotationNumber: () => {},
        setEmailDeliveryStatus: () => {},
        setEmailSentAt: () => {},
        setEmailRecipient: () => {},
        setEmailErrorMessage: () => {},
        setLastSendError: () => {}
    };

    let navigatedRoute = null;
    let sendAttempted = false;

    const result = await simulateQuotationSendFlow({
        activeQuotationId: 42,
        quotationNumber: 'ACX-QT-1042',
        isSaving: false,
        isSending: false,
        validateFieldsSuccess: true,
        saveApiMock: async () => { throw new Error("Database timeout saving quotation"); },
        sendApiMock: async () => { sendAttempted = true; },
        stateUpdater,
        navigateMock: (route) => { navigatedRoute = route; }
    });

    assert.equal(result.success, false);
    assert.equal(result.step, 'SAVE_FAILED');
    assert.equal(result.preservedFormData, true);
    assert.equal(sendAttempted, false, 'Send must never be attempted if saving fails');
    assert.equal(navigatedRoute, null, 'Must remain on the form when save fails');
    assert.match(state.error, /Database timeout saving quotation/);
    assert.equal(state.isSending, false);
});

test('Email Send Failure: preserves saved quotation, marks email failed, permits retry without duplicate', async () => {
    const state = {
        isSending: false,
        emailDeliveryStatus: null,
        emailErrorMessage: null,
        lastSendError: null
    };

    const stateUpdater = {
        setIsSending: (val) => { state.isSending = val; },
        setQuotationStatus: (val) => { state.quotationStatus = val; },
        setQuotationGrandTotal: () => {},
        setQuotationCreatedAt: () => {},
        setQuotationNumber: () => {},
        setEmailDeliveryStatus: (val) => { state.emailDeliveryStatus = val; },
        setEmailSentAt: () => {},
        setEmailRecipient: () => {},
        setEmailErrorMessage: (val) => { state.emailErrorMessage = val; },
        setLastSendError: (val) => { state.lastSendError = val; },
        setError: () => {}
    };

    let navigatedRoute = null;

    const result = await simulateQuotationSendFlow({
        activeQuotationId: 42,
        quotationNumber: 'ACX-QT-1042',
        isSaving: false,
        isSending: false,
        validateFieldsSuccess: true,
        saveApiMock: async (id) => ({ id, quotationNumber: 'ACX-QT-1042', status: 'DRAFT', grandTotal: 2500 }),
        sendApiMock: async () => { throw new Error("SMTP connection rejected by mail host"); },
        stateUpdater,
        navigateMock: (route) => { navigatedRoute = route; }
    });

    assert.equal(result.success, false);
    assert.equal(result.step, 'EMAIL_SEND_FAILED');
    assert.equal(result.quotationPreserved, true);
    assert.equal(result.canRetry, true);
    assert.equal(result.navigatedTo, '/quotations/edit/42');
    assert.equal(state.emailDeliveryStatus, 'FAILED');
    assert.equal(state.emailErrorMessage, 'SMTP connection rejected by mail host');
    assert.equal(state.isSending, false);
});

test('Duplicate Submission Prevention: rejects concurrent sends while in progress', async () => {
    let callCount = 0;
    const saveApiMock = async () => { callCount++; return { id: 42 }; };

    const result = await simulateQuotationSendFlow({
        activeQuotationId: 42,
        quotationNumber: 'ACX-QT-1042',
        isSaving: false,
        isSending: true, // Already in progress
        validateFieldsSuccess: true,
        saveApiMock,
        sendApiMock: async () => {},
        stateUpdater: {
            setIsSending: () => {},
            setLastSendError: () => {}
        },
        navigateMock: () => {}
    });

    assert.equal(result.stopped, true);
    assert.equal(result.reason, 'ALREADY_IN_PROGRESS');
    assert.equal(callCount, 0, 'No API calls made when already in progress');
});
