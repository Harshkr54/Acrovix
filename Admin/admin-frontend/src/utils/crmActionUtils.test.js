import test from 'node:test';
import assert from 'node:assert/strict';
import { 
    sanitizePhoneNumber, 
    createTelUri, 
    createMailtoUri, 
    validateActivityPayload, 
    VALID_ACTIVITY_TYPES 
} from './crmActionUtils.js';

test('sanitizePhoneNumber strips invalid characters and preserves valid prefix', () => {
    assert.equal(sanitizePhoneNumber('+91 98765 43210'), '+919876543210');
    assert.equal(sanitizePhoneNumber('(022) 2345-6789'), '02223456789');
    assert.equal(sanitizePhoneNumber('+1 (800) 555-0199'), '+18005550199');
    assert.equal(sanitizePhoneNumber(''), '');
    assert.equal(sanitizePhoneNumber(null), '');
    assert.equal(sanitizePhoneNumber('no-digits-here'), '');
});

test('createTelUri produces correct tel: URI or null for invalid inputs', () => {
    assert.equal(createTelUri('+91 98765 43210'), 'tel:+919876543210');
    assert.equal(createTelUri('9876543210'), 'tel:9876543210');
    assert.equal(createTelUri(''), null);
    assert.equal(createTelUri(null), null);
});

test('createMailtoUri produces encoded mailto URI with custom or default subject', () => {
    const uri1 = createMailtoUri('client@example.com', 'LEAD-2026-001');
    assert.equal(uri1, 'mailto:client@example.com?subject=ACROVIX%20Enquiry%20Follow-up%3A%20LEAD-2026-001');

    const uri2 = createMailtoUri('client@example.com', '', 'Custom Quote Review');
    assert.equal(uri2, 'mailto:client@example.com?subject=Custom%20Quote%20Review');

    assert.equal(createMailtoUri('invalid-email'), null);
    assert.equal(createMailtoUri(''), null);
    assert.equal(createMailtoUri(null), null);
});

test('VALID_ACTIVITY_TYPES matches supported backend interaction types', () => {
    assert.deepEqual(VALID_ACTIVITY_TYPES, ['CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'NOTE', 'OTHER']);
});

test('validateActivityPayload validates required fields and types', () => {
    // Valid CALL payload
    const validCall = validateActivityPayload({
        type: 'CALL',
        subject: 'Introductory discussion with CXO',
        performedAt: '2026-10-13T10:00:00'
    });
    assert.equal(validCall.isValid, true);
    assert.deepEqual(validCall.errors, {});

    // Missing subject
    const missingSubject = validateActivityPayload({
        type: 'EMAIL',
        subject: '   '
    });
    assert.equal(missingSubject.isValid, false);
    assert.ok(missingSubject.errors.subject);

    // Invalid activity type
    const invalidType = validateActivityPayload({
        type: 'UNKNOWN_TYPE',
        subject: 'Valid Subject'
    });
    assert.equal(invalidType.isValid, false);
    assert.ok(invalidType.errors.type);

    // Empty object
    const empty = validateActivityPayload({});
    assert.equal(empty.isValid, false);
    assert.ok(empty.errors.type);
    assert.ok(empty.errors.subject);

    // Invalid performedAt date
    const badDate = validateActivityPayload({
        type: 'NOTE',
        subject: 'Important notes',
        performedAt: 'invalid-date-string'
    });
    assert.equal(badDate.isValid, false);
    assert.ok(badDate.errors.performedAt);
});
