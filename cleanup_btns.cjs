const fs = require('fs');

let content = fs.readFileSync('src/components/PremiumDashboard.tsx', 'utf8');

// Replace standard active scaling
content = content.replace(/active:scale-95 disabled:/g, 'active:scale-95 outline-none disabled:');
content = content.replace(/className="text-\[10px\] font-black text-dmn-green-600 hover:text-dmn-green-700 transition-colors uppercase tracking-widest flex items-center gap-1"/g, 'className="text-[10px] font-black text-dmn-green-600 hover:text-dmn-green-700 transition-all uppercase tracking-widest flex items-center gap-1 active:scale-95 outline-none"');

content = content.replace(/className="w-full mt-10 py-4 bg-white\/10 hover:bg-white\/20 transition-all rounded-2xl flex items-center justify-center gap-3 text-\[10px\] font-black uppercase tracking-widest border border-white\/10"/g, 'className="w-full mt-10 py-4 bg-white/10 hover:bg-white/20 transition-all rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest border border-white/10 active:scale-95 outline-none"');

content = content.replace(/className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white\/10 transition-all group\/btn whitespace-nowrap"/g, 'className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition-all group/btn whitespace-nowrap active:scale-95 outline-none"');

fs.writeFileSync('src/components/PremiumDashboard.tsx', content);

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

appContent = appContent.replace(/className="flex-shrink-0 bg-dmn-green-600 text-white p-2.5 rounded-xl hover:bg-dmn-green-700 transition-colors"/g, 'className="flex-shrink-0 bg-dmn-green-600 text-white p-2.5 rounded-xl hover:bg-dmn-green-700 active:scale-95 outline-none transition-all shadow-sm"');
appContent = appContent.replace(/className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"/g, 'className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 active:scale-95 outline-none transition-all text-sm"');
appContent = appContent.replace(/className="px-6 py-2.5 bg-dmn-green-600 text-white font-bold rounded-xl hover:bg-dmn-green-700 transition-colors text-sm"/g, 'className="px-6 py-2.5 bg-dmn-green-600 text-white font-bold rounded-xl hover:bg-dmn-green-700 active:scale-95 outline-none transition-all text-sm shadow-sm"');
appContent = appContent.replace(/className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm"/g, 'className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:scale-95 outline-none transition-all text-sm shadow-sm"');

fs.writeFileSync('src/App.tsx', appContent);

console.log('done dashboard fixes');
