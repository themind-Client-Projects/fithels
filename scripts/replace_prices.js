const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../components');

// Regex to match patterns like: ${product.price.toFixed(2)}, ${product.oldPrice}, ${elm.price.toFixed(2)}, ${totalPrice.toFixed(2)}, etc.
const priceRegex = /\$\{?([a-zA-Z0-9_.]*(?:price|Price|totalPrice|oldPrice)[a-zA-Z0-9_().]*)\}?/gi;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We only replace if we find the exact matches
  let replaced = false;

  // Function to replace the specific match
  content = content.replace(priceRegex, (match, p1) => {
    replaced = true;
    // p1 is the variable name, e.g., product.price.toFixed(2)
    // We strip .toFixed(2) if it exists
    const cleanVar = p1.replace(/\.toFixed\(\d+\)/g, '');
    return `<CurrencyFormatter price={${cleanVar}} />`;
  });

  if (replaced) {
    // Add import statement if not already there
    if (!content.includes('CurrencyFormatter')) {
      // Find the last import statement or "use client"
      const lines = content.split('\n');
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ') || lines[i].startsWith('"use client"')) {
          insertIndex = i + 1;
        }
      }
      lines.splice(insertIndex, 0, 'import CurrencyFormatter from "@/components/common/CurrencyFormatter";');
      content = lines.join('\n');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
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
console.log('Price replacement complete.');
