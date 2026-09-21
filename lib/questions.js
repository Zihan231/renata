export const BANK = [
  { q: 'Bioequivalence primarily compares which characteristics between a test and reference product?',
    o: ['Color and shape', 'Rate and extent of absorption', 'Packaging and shelf life', 'Manufacturing location'], a: 1 },
  { q: 'Which pharmacokinetic parameters are commonly used to assess bioequivalence?',
    o: ['AUC & Cmax', 'BMI & BSA', 'BP & heart rate', 'Creatinine & ALT'], a: 0 },
  { q: 'Which combination correctly represents Renata’s global presence highlighted in the leaflet?',
    o: ['22 Global Destinations & 69 Regulated Markets', '100 bioequivalent products, 69 Global Destinations & 22 Regulated Markets', '100 Global Destinations & 69 Regulated Markets', '69 Global Destinations & 100 Regulated Markets'], a: 1 },
  { q: 'Which of the following includes existing bioequivalent products from Renata Oncology?',
    o: ['Rosimer, Tyrokin, Sofenib & Pazoren', 'Rosimer, Renaclib, Sofenib & Pazoren', 'Renaclib, Tyrokin, Sofenib & Pazoren', 'Rosimer, Tyrokin, Renaclib & Pazoren'], a: 0 },
  { q: 'Which of the following correctly matches the Renata products highlighted for achieving the f2 value with their generics?',
    o: ['Paltab – Eltrombopag & R-Pag – Palbociclib', 'Paltab – Palbociclib & R-Pag – Eltrombopag', 'Paltab – Abemaciclib & R-Pag – Imatinib', 'Paltab – Osimertinib & R-Pag – Sorafenib'], a: 1 },
  { q: 'Which statement correctly identifies Renata’s upcoming bioequivalent brand?',
    o: ['Paltab — Abemaciclib', 'R-Pag — Abemaciclib', 'Rosimer — Abemaciclib', 'Renaclib — Abemaciclib'], a: 3 },
];

export const TOTAL = 3;

export const BRANDS = [
  ['Rosimer', '#7a3a8f'], ['Tyrokin', '#ef2b3a'], ['Sofenib', '#1a7f88'],
  ['Pazoren', '#00b4b0'], ['Paltab', '#a878c8'], ['R-Pag', '#ee2a2a'],
];

export const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
