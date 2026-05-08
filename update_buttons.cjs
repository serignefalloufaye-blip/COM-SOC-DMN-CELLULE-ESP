const fs = require('fs');

const editBtnRegex = /className="p-2(?:\.5)? bg-(?:amber|orange|yellow)-50(?:[/0-9]*)? text-(?:amber|orange|yellow)-(?:500|600) rounded-(?:lg|xl|2xl) hover:bg-(?:amber|orange|yellow)-(?:100|500[/0-9]*) transition-(?:colors|all)(?: flex items-center gap-2 text-xs font-bold)?"/g;
const editBtnReplacement = 'className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 hover:text-orange-700 transition-all active:scale-95 shadow-sm"';

const deleteBtnRegex = /className="p-2(?:\.5)? bg-red-50(?:[/0-9]*)? text-red-(?:500|600) rounded-(?:lg|xl|2xl) hover:bg-red-(?:100|500[/0-9]*) transition-(?:colors|all)(?: flex items-center gap-2 text-xs font-bold)?"/g;
const deleteBtnReplacement = 'className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 hover:text-red-700 transition-all active:scale-95 shadow-sm"';

// App.tsx specific ones:
const appPrimaryBtn = /className="bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"/g;
const appPrimaryBtnRep = 'className="h-10 px-5 bg-dmn-green-600 text-white rounded-xl hover:bg-dmn-green-700 flex items-center justify-center gap-2 text-sm font-bold shadow-[0_8px_16px_-6px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none"';

const appPrimaryBtn2 = /className="flex-1 sm:flex-none bg-dmn-gold-light hover:bg-dmn-gold text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"/g;
const appPrimaryBtnRep2 = 'className="flex-1 sm:flex-none h-10 px-5 bg-dmn-green-600 text-white rounded-xl hover:bg-dmn-green-700 flex items-center justify-center gap-2 text-sm font-bold shadow-[0_8px_16px_-6px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all outline-none"';

const mobileCardsEdit = /className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"/g;
const mobileCardsDelete = /className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"/g;

const files = [
  'src/App.tsx',
  'src/components/Tickets.tsx',
  'src/components/cafe/CafeModule.tsx',
  'src/components/StatsAndReports.tsx',
  'src/components/PremiumDashboard.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(editBtnRegex, editBtnReplacement);
    content = content.replace(deleteBtnRegex, deleteBtnReplacement);
    content = content.replace(mobileCardsEdit, editBtnReplacement);
    content = content.replace(mobileCardsDelete, deleteBtnReplacement);
    content = content.replace(appPrimaryBtn, appPrimaryBtnRep);
    content = content.replace(appPrimaryBtn2, appPrimaryBtnRep2);
    
    // Convert remaining basic edit/delete styles
    content = content.replace(/className="p-3 text-gray-300 hover:text-amber-500"/g, 'className="p-2 text-gray-400 hover:text-orange-500 transition-colors active:scale-95"');
    content = content.replace(/className="p-3 text-gray-300 hover:text-red-500 hover:bg-gray-50 rounded-xl transition-all"/g, 'className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"');
    content = content.replace(/className="p-2 text-gray-300 hover:text-amber-500"/g, 'className="p-2 text-gray-400 hover:text-orange-500 transition-colors active:scale-95"');
    content = content.replace(/className="p-3 text-gray-300 hover:text-red-500 hover:bg-white rounded-xl transition-all"/g, 'className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"');

    content = content.replace(/className="p-2 text-gray-400 hover:text-red-500"/g, 'className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"');
    content = content.replace(/className="p-2 text-gray-400 hover:text-amber-500"/g, 'className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all active:scale-95"');

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
