const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace {userRole === 'admin' ? ... with {hasPermission(userRole, 'caisse.update') ? for cotisations
// Well, it's safer to just replace them manually or semi-manually where they belong to the UI.

// Actually, let's just create a function to parse and print surrounding lines of userRole === 'admin'
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes("userRole === 'admin'")) {
     console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
