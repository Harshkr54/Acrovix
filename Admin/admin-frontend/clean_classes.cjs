const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.css')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);
let totalFilesAffected = 0;
let totalOccurrences = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Replace bg-bg-acx-acx-...-card with bg-bg-card
    content = content.replace(/bg-bg-(acx-)+card/g, match => {
        totalOccurrences++;
        return 'bg-bg-card';
    });
    
    // Replace acx-acx-...-card with acx-card
    content = content.replace(/(?<!bg-bg-)(acx-){2,}card/g, match => {
        totalOccurrences++;
        return 'acx-card';
    });
    
    // Replace acx-acx-...-btn with acx-btn
    content = content.replace(/(acx-){2,}btn/g, match => {
        totalOccurrences++;
        return 'acx-btn';
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        totalFilesAffected++;
        console.log(`Updated: ${file}`);
    }
});

console.log(`\nCleanup Complete.`);
console.log(`Total files affected: ${totalFilesAffected}`);
console.log(`Total occurrences replaced: ${totalOccurrences}`);
