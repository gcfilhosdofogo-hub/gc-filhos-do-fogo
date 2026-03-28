import fs from 'fs';
import path from 'path';

function findFilesMissingUseLanguage(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            /* Recurse into a subdirectory */
            results = results.concat(findFilesMissingUseLanguage(file));
        } else { 
            /* Is a file */
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                const content = fs.readFileSync(file, 'utf8');
                if (!content.includes('useLanguage') && !file.includes('translations.ts') && !file.includes('LanguageContext.tsx')) {
                    results.push(file);
                }
            }
        }
    });
    return results;
}

const compFiles = findFilesMissingUseLanguage('components');
const viewFiles = findFilesMissingUseLanguage('views');
const srcFiles = findFilesMissingUseLanguage('src/components').concat(findFilesMissingUseLanguage('src/pages'));

console.log('Components missing useLanguage:', compFiles);
console.log('Views missing useLanguage:', viewFiles);
console.log('Src missing useLanguage:', srcFiles);
