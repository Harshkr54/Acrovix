import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getIssueDateStr,
    calculateValidUntilDate,
    getDaysBetweenDates,
    determineValidityPeriod,
    isDateBeforeIssueDate,
    VALIDITY_PERIOD_OPTIONS
} from './validityUtils.js';

test('VALIDITY_PERIOD_OPTIONS contains all required options', () => {
    const values = VALIDITY_PERIOD_OPTIONS.map(o => o.value);
    assert.deepEqual(values, ['30', '45', '60', '90', 'custom']);
    assert.equal(VALIDITY_PERIOD_OPTIONS.find(o => o.value === '30').label, '30 Days');
    assert.equal(VALIDITY_PERIOD_OPTIONS.find(o => o.value === '45').label, '45 Days');
    assert.equal(VALIDITY_PERIOD_OPTIONS.find(o => o.value === '60').label, '60 Days');
    assert.equal(VALIDITY_PERIOD_OPTIONS.find(o => o.value === '90').label, '90 Days');
    assert.equal(VALIDITY_PERIOD_OPTIONS.find(o => o.value === 'custom').label, 'Custom Date');
});

test('getIssueDateStr formats strings, Date objects, and fallbacks', () => {
    assert.equal(getIssueDateStr('2026-03-15T10:30:00Z'), '2026-03-15');
    assert.equal(getIssueDateStr('2026-11-05'), '2026-11-05');
    assert.equal(getIssueDateStr(new Date(2026, 4, 20)), '2026-05-20');
    // Fallback creates today's date in YYYY-MM-DD
    const today = getIssueDateStr(null);
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test('calculateValidUntilDate handles all 4 predefined periods accurately', () => {
    const base = '2026-01-01';
    assert.equal(calculateValidUntilDate(base, 30), '2026-01-31');
    assert.equal(calculateValidUntilDate(base, 45), '2026-02-15');
    assert.equal(calculateValidUntilDate(base, 60), '2026-03-02');
    assert.equal(calculateValidUntilDate(base, 90), '2026-04-01');
});

test('calculateValidUntilDate handles leap year (2028)', () => {
    // 2028 is a leap year (Feb 29 exists)
    const feb1 = '2028-02-01';
    assert.equal(calculateValidUntilDate(feb1, 30), '2028-03-02');
    
    // Non-leap year 2026
    const feb1_2026 = '2026-02-01';
    assert.equal(calculateValidUntilDate(feb1_2026, 30), '2026-03-03');
});

test('calculateValidUntilDate handles year boundary', () => {
    const dec15 = '2026-12-15';
    assert.equal(calculateValidUntilDate(dec15, 30), '2027-01-14');
    assert.equal(calculateValidUntilDate(dec15, 45), '2027-01-29');
    assert.equal(calculateValidUntilDate(dec15, 60), '2027-02-13');
    assert.equal(calculateValidUntilDate(dec15, 90), '2027-03-15');
});

test('getDaysBetweenDates and determineValidityPeriod calculate accurately', () => {
    const issueDate = '2026-05-10';
    const plus30 = calculateValidUntilDate(issueDate, 30);
    const plus45 = calculateValidUntilDate(issueDate, 45);
    const plus60 = calculateValidUntilDate(issueDate, 60);
    const plus90 = calculateValidUntilDate(issueDate, 90);
    const customDate = '2026-05-25'; // 15 days

    assert.equal(getDaysBetweenDates(issueDate, plus30), 30);
    assert.equal(getDaysBetweenDates(issueDate, plus45), 45);
    assert.equal(getDaysBetweenDates(issueDate, plus60), 60);
    assert.equal(getDaysBetweenDates(issueDate, plus90), 90);
    assert.equal(getDaysBetweenDates(issueDate, customDate), 15);

    assert.equal(determineValidityPeriod(issueDate, plus30), '30');
    assert.equal(determineValidityPeriod(issueDate, plus45), '45');
    assert.equal(determineValidityPeriod(issueDate, plus60), '60');
    assert.equal(determineValidityPeriod(issueDate, plus90), '90');
    assert.equal(determineValidityPeriod(issueDate, customDate), 'custom');
    assert.equal(determineValidityPeriod(issueDate, ''), 'custom');
});

test('isDateBeforeIssueDate correctly detects dates before base date', () => {
    const issue = '2026-06-15';
    assert.equal(isDateBeforeIssueDate('2026-06-14', issue), true);
    assert.equal(isDateBeforeIssueDate('2026-06-15', issue), false);
    assert.equal(isDateBeforeIssueDate('2026-06-16', issue), false);
    assert.equal(isDateBeforeIssueDate('', issue), false);
});
