const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const submitBtnRegex = /className="px-5 py-2\.5 bg-dmn-green-600 text-white rounded-xl text-sm font-semibold hover:bg-dmn-green-700 transition-all shadow-sm hover:shadow-md active:scale-95"/g;
const submitBtnReplacement = 'className="px-6 py-3 bg-dmn-green-600 text-white rounded-xl text-sm font-bold shadow-[0_8px_16px_-6px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none"';

content = content.replace(submitBtnRegex, submitBtnReplacement);

const cancelBtnRegex = /className="px-5 py-2\.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"/g;
const cancelBtnReplacement = 'className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:shadow hover:bg-gray-200 active:scale-95 transition-all outline-none"';

content = content.replace(cancelBtnRegex, cancelBtnReplacement);

fs.writeFileSync('src/App.tsx', content);

let tickets = fs.readFileSync('src/components/Tickets.tsx', 'utf8');
tickets = tickets.replace(/className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"/g, 'className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-[0_8px_16px_-6px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none"');
tickets = tickets.replace(/className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"/g, 'className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-[0_8px_16px_-6px_rgba(249,115,22,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(249,115,22,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none"');
fs.writeFileSync('src/components/Tickets.tsx', tickets);

let cafe = fs.readFileSync('src/components/cafe/CafeModule.tsx', 'utf8');
cafe = cafe.replace(/hover:bg-blue-700 transition-all/g, 'hover:bg-blue-700 shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none');
cafe = cafe.replace(/hover:bg-emerald-700 transition-all/g, 'hover:bg-emerald-700 shadow-[0_8px_16px_-6px_rgba(5,150,105,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(5,150,105,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none');
cafe = cafe.replace(/hover:bg-amber-700 transition-all/g, 'hover:bg-amber-700 shadow-[0_8px_16px_-6px_rgba(217,119,6,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(217,119,6,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none');
cafe = cafe.replace(/hover:bg-red-600 transition-all/g, 'hover:bg-red-600 shadow-[0_8px_16px_-6px_rgba(220,38,38,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(220,38,38,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none');
cafe = cafe.replace(/hover:bg-brown-700 transition-all/g, 'hover:bg-brown-700 shadow-[0_8px_16px_-6px_rgba(120,53,15,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(120,53,15,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none');
cafe = cafe.replace(/hover:bg-white transition-all/g, 'hover:bg-white shadow-[0_8px_16px_-6px_rgba(245,158,11,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(245,158,11,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none');

fs.writeFileSync('src/components/cafe/CafeModule.tsx', cafe);

console.log('updated buttons');
