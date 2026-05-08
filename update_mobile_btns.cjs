const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex1 = /className="flex flex-col items-center justify-center gap-1\.5 py-3 bg-dmn-green-50 hover:bg-dmn-green-100 rounded-2xl text-dmn-green-700 transition-all border border-dmn-green-100\/50"/g;
content = content.replace(regex1, 'className="flex flex-col items-center justify-center gap-1.5 py-3 bg-dmn-green-50 hover:bg-dmn-green-100 rounded-2xl text-dmn-green-700 active:scale-95 transition-all outline-none border border-dmn-green-100/50"');

const regex2 = /className="flex flex-col items-center justify-center gap-1\.5 py-3 bg-blue-50 hover:bg-blue-100 rounded-2xl text-blue-700 transition-all border border-blue-100\/50"/g;
content = content.replace(regex2, 'className="flex flex-col items-center justify-center gap-1.5 py-3 bg-blue-50 hover:bg-blue-100 rounded-2xl text-blue-700 active:scale-95 transition-all outline-none border border-blue-100/50"');

const regex3 = /className="flex flex-col items-center justify-center gap-1\.5 py-3 bg-amber-50 hover:bg-amber-100 rounded-2xl text-amber-700 transition-all border border-amber-100\/50"/g;
content = content.replace(regex3, 'className="flex flex-col items-center justify-center gap-1.5 py-3 bg-orange-50 hover:bg-orange-100 rounded-2xl text-orange-700 active:scale-95 transition-all outline-none border border-orange-100/50"');

const regex4 = /className="flex flex-col items-center justify-center gap-1\.5 py-3 bg-red-50 hover:bg-red-100 rounded-2xl text-red-700 transition-all border border-red-100\/50"/g;
content = content.replace(regex4, 'className="flex flex-col items-center justify-center gap-1.5 py-3 bg-red-50 hover:bg-red-100 rounded-2xl text-red-700 active:scale-95 transition-all outline-none border border-red-100/50"');

fs.writeFileSync('src/App.tsx', content);

console.log('done mobile apps actions');
