const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

const prefixCounts = {};

files.sort();

files.forEach(file => {
    const parts = file.split('_');
    const prefix = parts[0];

    if (prefix.length === 14) return;

    if (prefix.length === 8) {
        if (!prefixCounts[prefix]) {
            prefixCounts[prefix] = 1;
            console.log(`Keeping ${file} unchanged as original 8-digit prefix.`);
            return;
        }

        prefixCounts[prefix]++;
        const sequence = String(prefixCounts[prefix] - 1).padStart(6, '0');
        // We make a 14 digit out of the 8 digit. Since 20260205 + 000001 = 14 chars.
        const newPrefix = `${prefix}${sequence}`;
        const newFileName = file.replace(prefix, newPrefix);

        console.log(`Renaming ${file} to ${newFileName}`);
        fs.renameSync(path.join(migrationsDir, file), path.join(migrationsDir, newFileName));
    }
});

console.log('Renaming completed safely.');
