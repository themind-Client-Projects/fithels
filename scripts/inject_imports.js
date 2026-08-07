const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../components');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('<CurrencyFormatter') && !content.includes('import CurrencyFormatter')) {
    const lines = content.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('"use client"')) {
        insertIndex = i + 1;
      }
    }
    lines.splice(insertIndex, 0, 'import CurrencyFormatter from "@/components/common/CurrencyFormatter";');
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Injected import: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.tsx')) {
      if (!fullPath.includes('CurrencyFormatter.jsx') && !fullPath.includes('CurrencySelect.jsx')) {
        processFile(fullPath);
      }
    }
  }
}

walkDir(directoryPath);
