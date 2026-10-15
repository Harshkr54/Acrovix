import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('src');

// Recursive file collector for source audit
function getAllSourceFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== '__tests__' && file !== 'node_modules' && file !== '.git') {
                getAllSourceFiles(fullPath, fileList);
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

test('1. Enterprise Modal sizing tokens and structural requirements', () => {
    const modalPath = path.join(SRC_DIR, 'components', 'ui', 'Modal.jsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    // Verify all 6 standard sizing tokens exist
    assert.match(content, /sm:\s*['"]max-w-md\s+w-full['"]/, 'Modal must define sm size');
    assert.match(content, /md:\s*['"]max-w-lg\s+w-full['"]/, 'Modal must define md size');
    assert.match(content, /lg:\s*['"]max-w-2xl\s+w-full['"]/, 'Modal must define lg size');
    assert.match(content, /xl:\s*['"]max-w-4xl\s+w-full['"]/, 'Modal must define xl size');
    assert.match(content, /'2xl':\s*['"]max-w-6xl\s+w-full['"]/, 'Modal must define 2xl size');
    assert.match(content, /full:\s*['"]max-w-\[calc\(100vw-32px\)\]\s+w-full['"]/, 'Modal must define full size');

    // Verify 3-part layout structure
    assert.match(content, /overflow-y-auto\s+overscroll-contain\s+flex-1\s+min-h-0/, 'Modal must have independent scrollable body container');
    assert.match(content, /bg-black\/65\s+backdrop-blur-xs/, 'Modal must use clean deep backdrop without fog');
    assert.match(content, /max-h-\[calc\(100dvh-32px\)\]\s+sm:max-h-\[calc\(100dvh-48px\)\]/, 'Modal must constrain height to viewport minus margins');
});

test('2. Scroll lock behavior preserves and restores prior body overflow', () => {
    const modalPath = path.join(SRC_DIR, 'components', 'ui', 'Modal.jsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    // Check implementation pattern in useEffect
    assert.match(content, /const previousOverflow = document\.body\.style\.overflow;/, 'Must capture previous overflow');
    assert.match(content, /document\.body\.style\.overflow = 'hidden';/, 'Must lock body scroll');
    assert.match(content, /document\.body\.style\.overflow = previousOverflow;/, 'Must restore previous overflow on unmount');
});

test('3. Escape key dismiss and backdrop dismiss with loading protection', () => {
    const modalPath = path.join(SRC_DIR, 'components', 'ui', 'Modal.jsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.match(content, /e\.key === 'Escape' && !isLoading/, 'Must ignore Escape key when isLoading');
    assert.match(content, /closeOnBackdropClick && !isLoading/, 'Must ignore backdrop clicks when isLoading');
});

test('4. ConfirmDialog component standards and accessible semantics', () => {
    const confirmPath = path.join(SRC_DIR, 'components', 'ui', 'ConfirmDialog.jsx');
    const content = fs.readFileSync(confirmPath, 'utf8');

    assert.match(content, /role="alertdialog"/, 'ConfirmDialog must have alertdialog role');
    assert.match(content, /aria-modal="true"/, 'ConfirmDialog must have aria-modal');
    assert.match(content, /bg-black\/65\s+backdrop-blur-xs/, 'ConfirmDialog backdrop must use deep dark styling without fog');
    assert.match(content, /w-full\s+max-w-sm\s+sm:max-w-md/, 'ConfirmDialog must use compact width');
});

test('5. 100% Eradication of native window.confirm() in application source code', () => {
    const files = getAllSourceFiles(SRC_DIR);
    const violations = [];

    for (const filePath of files) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // Match window.confirm( or confirm( when preceded by boundary
        if (/window\.confirm\s*\(/.test(fileContent)) {
            violations.push(path.relative(SRC_DIR, filePath));
        }
    }

    assert.equal(violations.length, 0, `Forbidden window.confirm found in: ${violations.join(', ')}`);
});

test('6. 100% Eradication of dark-mode backdrop fog (bg-text-primary/) across all source files', () => {
    const files = getAllSourceFiles(SRC_DIR);
    const violations = [];

    for (const filePath of files) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (/bg-text-primary\//.test(fileContent)) {
            violations.push(path.relative(SRC_DIR, filePath));
        }
    }

    assert.equal(violations.length, 0, `Forbidden bg-text-primary/ backdrop fog found in: ${violations.join(', ')}`);
});
