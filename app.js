/* TrueReach — turns a spreadsheet into a branded report that counts people correctly.
 *
 * Everything runs in this browser. The spreadsheet is never uploaded or saved; brand kits and
 * templates are kept in this browser's storage only. PDF-Lib (MIT) is vendored next to this file.
 *
 *   1. Audience packs ........ vocabulary, sample data and report formats for each audience
 *   2. Helpers ............... numbers, wording, periods, goals
 *   3. Reading data .......... CSV / TSV / pasted rows and Excel (.xlsx)
 *   4. Column detection ...... which columns hold groups, people IDs, values and time
 *   5. Analysis .............. analyze(): every number and sentence in the report, no page access
 *   6. Rendering ............. the live preview and charts
 *   7. Exports ............... PDF, HTML, CSV, SVG
 *   8. Brand kits and templates
 *   9. Feedback
 *  10. Wiring and start-up
 */
'use strict';

/* ───────────────────────── 1. Audience packs ───────────────────────── */

/* Small deterministic random generator so the samples look the same on every load. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const pickWeighted = (rand, items) => { let r = rand(), acc = 0; for (const [v, w] of items) { acc += w; if (r < acc) return v; } return items[items.length - 1][0]; };
const csvLine = r => r.map(v => /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',');
const usDate = d => `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
function daysBetween(start, end, weekdays) {
  const out = [];
  for (let t = Date.UTC(...start); t <= Date.UTC(...end); t += 86400000) { const d = new Date(t); if (weekdays.includes(d.getUTCDay())) out.push(d); }
  return out;
}

/* A pantry sign-in sheet typed into a spreadsheet: no IDs, names and phones written several ways. */
function pantrySample() {
  const rand = seeded(5), rows = [];
  const first = ['Keisha', 'Maria', 'James', 'Linda', 'Tyrone', 'Ana', 'Robert', 'Fatima', 'Darnell', 'Mei', 'Carlos', 'Patricia', 'Andre', 'Rosa', 'Kevin', 'Aisha', 'Luis', 'Barbara', 'Marcus', 'Grace', 'Jose', 'Denise', 'Samuel', 'Yolanda', 'Hector', 'Tanya', 'Omar', 'Gloria', 'Derek', 'Ivy'];
  const last = ['Brown', 'Garcia', 'Johnson', 'Williams', 'Lopez', 'Davis', 'Nguyen', 'Jackson', 'Martinez', 'Thomas', 'Robinson', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green'];
  const days = daysBetween([2026, 6, 1], [2026, 8, 30], [2, 6]);
  const writeName = (f, l) => { const r = rand(); if (r < .12) return `${l}, ${f}`; if (r < .24) return `${f} ${l}`.toUpperCase(); if (r < .32) return `${f} ${l}`.toLowerCase(); if (r < .4) return `${f} ${String.fromCharCode(65 + Math.floor(rand() * 26))}. ${l}`; if (r < .46) return `${f}  ${l} `; return `${f} ${l}`; };
  const writePhone = p => { const r = rand(); if (r < .06) return ''; if (r < .3) return `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`; if (r < .55) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`; if (r < .7) return `${p.slice(0, 3)}.${p.slice(3, 6)}.${p.slice(6)}`; return p; };
  for (let h = 0; h < 165; h++) {
    const f = first[Math.floor(rand() * first.length)], l = last[Math.floor(rand() * last.length)];
    const phone = '202555' + String(1000 + Math.floor(rand() * 9000)), size = 1 + Math.floor(rand() * rand() * 7);
    const zip = pickWeighted(rand, [['20019', .32], ['20020', .25], ['20032', .2], ['20002', .13], ['20011', .1]]);
    const site = pickWeighted(rand, [['Main pantry', .6], ['Mobile pantry – Eastside', .3], ['Home delivery', .1]]);
    const visits = 1 + Math.floor(rand() * rand() * 12), start = Math.floor(rand() * days.length * .7);
    for (let v = 0; v < visits; v++) {
      const d = days[Math.min(days.length - 1, start + Math.floor(rand() * (days.length - start)))];
      rows.push([d, site, writeName(f, l), writePhone(phone), String(size), zip]);
    }
  }
  rows.sort((a, b) => a[0] - b[0]);
  return [['Visit Date', 'Site', 'Name', 'Phone', 'Household Size', 'Zip Code'], ...rows.map(r => [usDate(r[0]), ...r.slice(1)])].map(csvLine).join('\n');
}

/* A city-funded (CDBG) public services log: client IDs with income band, race and ethnicity. */
function cdbgSample() {
  const rand = seeded(21), rows = [];
  const days = daysBetween([2026, 6, 1], [2026, 8, 30], [1, 2, 3, 4, 5]);
  const races = [['Black/African American', .52], ['White', .2], ['Asian', .06], ['American Indian/Alaska Native', .02], ['Native Hawaiian/Other Pacific Islander', .01], ['Black/African American & White', .04], ['Asian & White', .02], ['American Indian/Alaska Native & Black/African American', .02], ['Other multi-racial', .11]];
  const incomes = [['Extremely low (0–30% AMI)', .46], ['Low (31–50% AMI)', .3], ['Moderate (51–80% AMI)', .19], ['Above 80% AMI', .05]];
  const programs = [['Senior Meals', .36], ['Youth Services', .3], ['Fair Housing Counseling', .19], ['Financial Coaching', .15]];
  for (let c = 1; c <= 236; c++) {
    const id = 'C-' + (1000 + c), race = pickWeighted(rand, races), income = pickWeighted(rand, incomes), hispanic = rand() < .19 ? 'Yes' : 'No';
    const program = pickWeighted(rand, programs), visits = 1 + Math.floor(rand() * rand() * 8);
    for (let v = 0; v < visits; v++) rows.push([days[Math.floor(rand() * days.length)], id, rand() < .1 ? pickWeighted(rand, programs) : program, income, race, hispanic]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  return [['Service Date', 'Client ID', 'Program', 'Household Income', 'Race', 'Hispanic/Latino'], ...rows.map(r => [usDate(r[0]), ...r.slice(1)])].map(csvLine).join('\n');
}

/* A harm reduction contact log: anonymous participant codes, age group and gender, some very small groups. */
function confidentialSample() {
  const rand = seeded(13), rows = [], months = ['Jul', 'Aug', 'Sep'];
  const services = [['Syringe services', .46], ['Naloxone distribution', .3], ['Peer recovery support', .19], ['HIV/HCV testing', .05]];
  const ages = [['18–24', .1], ['25–34', .34], ['35–44', .3], ['45–54', .16], ['55+', .1]];
  const genders = [['Man', .6], ['Woman', .34], ['Non-binary', .03], ['Not reported', .03]];
  for (let p = 0; p < 184; p++) {
    const code = String.fromCharCode(65 + Math.floor(rand() * 26), 65 + Math.floor(rand() * 26)) + String(1 + Math.floor(rand() * 12)).padStart(2, '0') + String(1 + Math.floor(rand() * 28)).padStart(2, '0') + String.fromCharCode(65 + Math.floor(rand() * 26));
    const age = pickWeighted(rand, ages), gender = pickWeighted(rand, genders), service = pickWeighted(rand, services), start = Math.floor(rand() * 3);
    for (let m = start; m < 3; m++) {
      const contacts = 1 + Math.floor(rand() * rand() * 5);
      for (let v = 0; v < contacts; v++) rows.push([months[m], code, rand() < .15 ? pickWeighted(rand, services) : service, age, gender]);
      if (rand() < .35) break;
    }
  }
  rows.sort((a, b) => months.indexOf(a[0]) - months.indexOf(b[0]));
  return [['Month', 'Participant Code', 'Service', 'Age Group', 'Gender'], ...rows].map(csvLine).join('\n');
}

/* A campus check-in export: student IDs, class year and first-generation status. */
function campusSample() {
  const rand = seeded(31), rows = [];
  const days = daysBetween([2026, 7, 24], [2026, 9, 2], [1, 2, 3, 4, 5]);
  const years = [['First-year', .3], ['Sophomore', .24], ['Junior', .21], ['Senior', .18], ['Graduate', .07]];
  const services = [['Basic Needs Pantry', .45], ['Tutoring Center', .36], ['Career Closet', .19]];
  for (let s = 0; s < 310; s++) {
    const id = String(2040000 + Math.floor(rand() * 60000)), year = pickWeighted(rand, years), firstGen = rand() < .38 ? 'Yes' : 'No', service = pickWeighted(rand, services);
    const visits = 1 + Math.floor(rand() * rand() * 9);
    for (let v = 0; v < visits; v++) rows.push([days[Math.floor(rand() * days.length)], id, rand() < .12 ? pickWeighted(rand, services) : service, year, firstGen]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  return [['Check-in Date', 'Student ID', 'Service', 'Class Year', 'First-Generation'], ...rows.map(r => [usDate(r[0]), ...r.slice(1)])].map(csvLine).join('\n');
}

/* A general program sign-in log: one row per visit, with a participant ID. */
function nonprofitSample() {
  const rand = seeded(42), months = ['Jan', 'Feb', 'Mar'], rows = [];
  const programs = [['Food Distribution', .34, .8, 3], ['Youth Workshops', .2, .85, 2], ['Housing Navigation', .16, .55, 1], ['Health Education', .15, .45, 1], ['Community Outreach', .15, .35, 1]];
  const pick = () => { let r = rand(), acc = 0; for (const p of programs) { acc += p[1]; if (r < acc) return p; } return programs[0]; };
  for (let n = 1; n <= 140; n++) {
    const id = 'P-' + String(n).padStart(4, '0'), mine = [pick()];
    if (rand() < .22) { const second = pick(); if (second !== mine[0]) mine.push(second); }
    const start = Math.floor(rand() * 3);
    for (const [name, , stay, most] of mine) {
      for (let m = start; m < 3; m++) {
        const visits = 1 + Math.floor(rand() * most);
        for (let v = 0; v < visits; v++) rows.push([id, name, months[m]]);
        if (rand() >= stay) break;
      }
    }
  }
  rows.sort((a, b) => months.indexOf(a[2]) - months.indexOf(b[2]) || a[1].localeCompare(b[1]));
  return [['Participant ID', 'Program', 'Month'], ...rows].map(csvLine).join('\n');
}

/* A field contact log, kept for organizers but not shown in the menu (hidden: true). */
function campaignSample() {
  const rand = seeded(7), rows = [];
  const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
  const tactics = [['Door knocks', .32], ['Phone bank', .18], ['Text bank', .09]];
  for (let v = 1; v <= 420; v++) {
    const id = 'V-' + (10000 + v), turf = 'Ward ' + (1 + Math.floor(rand() * 4)), attempts = 1 + Math.floor(rand() * 3);
    for (let a = 0; a < attempts; a++) {
      const [tactic, rate] = tactics[Math.floor(rand() * 3)], week = weeks[Math.floor(rand() * 4)];
      rows.push([id, tactic, turf, week, rand() < rate ? 'Contacted' : rand() < .75 ? 'No answer' : 'Refused']);
    }
  }
  rows.sort((a, b) => a[3].localeCompare(b[3]));
  return [['Voter ID', 'Program', 'Turf', 'Week', 'Result'], ...rows].map(csvLine).join('\n');
}

const STAYS_LOCAL = 'Your file stays in this browser. Nothing is uploaded or saved.';
const PACKS = {
  pantry: {
    name: 'Food pantries',
    note: STAYS_LOCAL + ' No client IDs? TrueReach matches households by name and phone.',
    sample: { build: pantrySample, source: 'Sample pantry sign-in sheet', note: "Illustrative sample data · not an actual pantry's results" },
    person: 'household', row: 'visit', verb: ['visited', 'visited'], households: true, bucket: 'month', suppress: 0, whoTitle: 'Households served',
    groupNames: /^(site|location|distribution( site)?|pantry|program|service|visit type)$/i,
    valueNames: /^(pounds|lbs|pounds distributed|meals|bags|boxes)$/i,
    breakdowns: [/zip|postal|county|ward/i, /age group|age range/i],
    org: 'Example Community Pantry', period: 'July–September 2026', recipientHint: 'e.g. Regional Food Bank', sendTo: 'your food bank or board',
    contextHint: 'Add notes for the food bank: distribution changes, shortages, volunteer news.',
    formats: {
      service: { label: 'Monthly service report', docid: 'Service report', title: 'Pantry Service Report', context: 'Notes for the food bank' },
      board: { label: 'Board update', docid: 'Board update', title: 'Pantry Board Update', context: 'Context and next steps' },
      grant: { label: 'Grant progress report', docid: 'Grant progress report', title: 'Grant Progress Report', context: 'Progress, context and next steps' },
    },
  },
  cdbg: {
    name: 'City-funded services (CDBG)',
    note: STAYS_LOCAL + ' Breakdowns by income and race are ready to copy into a quarterly report.',
    sample: { build: cdbgSample, source: 'Sample public services log', note: "Illustrative sample data · not an actual subrecipient's results" },
    person: 'client', row: 'visit', verb: ['was served', 'were served'], bucket: 'month', suppress: 0, whoTitle: 'Beneficiary characteristics',
    groupNames: /^(programs?|activity|service|site|project)$/i,
    valueNames: /^(amount|hours|units|meals)$/i,
    breakdowns: [/income|ami|income level|income band/i, /^race$|race\/ethnicity|^race /i, /hispanic|latin|ethnicity/i],
    org: 'Example Neighborhood Services', period: 'Quarter 1 · July–September 2026', recipientHint: 'e.g. City Community Development Office', sendTo: 'the city or your board',
    contextHint: 'Add accomplishments, challenges and any changes to the program this quarter.',
    formats: {
      quarterly: { label: 'Quarterly progress report', docid: 'Quarterly progress report', title: 'CDBG Quarterly Progress Report', context: 'Accomplishments and challenges' },
      annual: { label: 'Annual summary', docid: 'Annual summary', title: 'Program Year Summary', context: 'Accomplishments and challenges' },
      board: { label: 'Board update', docid: 'Board update', title: 'Quarterly Board Update', context: 'Context and next steps' },
    },
  },
  confidential: {
    name: 'Confidential services',
    note: 'Your file stays in this browser and is never uploaded or saved, so it can hold participant codes and sensitive fields. Counts under 11 are hidden by default.',
    sample: { build: confidentialSample, source: 'Sample contact log', note: "Illustrative sample data · not an actual program's results" },
    person: 'participant', row: 'contact', verb: ['was served', 'were served'], bucket: 'month', suppress: 11, whoTitle: 'Who we served',
    groupNames: /^(service|services|program|activity|site|location|contact type)$/i,
    valueNames: /^(kits|units|naloxone kits|syringes|supplies|hours)$/i,
    breakdowns: [/age group|age range/i, /gender/i, /race|ethnicity/i],
    org: 'Example Health Outreach Program', period: 'July–September 2026', recipientHint: 'e.g. County Health Department', sendTo: 'your funder or health department',
    contextHint: 'Add context for the numbers, program changes or next steps.',
    formats: {
      program: { label: 'Program services report', docid: 'Program services report', title: 'Program Services Report', context: 'Context' },
      grant: { label: 'Grant progress report', docid: 'Grant progress report', title: 'Grant Progress Report', context: 'Progress, context and next steps' },
      board: { label: 'Board update', docid: 'Board update', title: 'Quarterly Board Update', context: 'Context and next steps' },
    },
  },
  campus: {
    name: 'Campus student services',
    note: STAYS_LOCAL + ' Student IDs are counted once each, however often students come in.',
    sample: { build: campusSample, source: 'Sample check-in export', note: "Illustrative sample data · not an actual campus's results" },
    person: 'student', row: 'visit', verb: ['came in', 'came in'], bucket: 'month', suppress: 0, whoTitle: 'Students served',
    groupNames: /^(service|services|center|office|program|location|site)$/i,
    valueNames: /^(hours|items|pounds)$/i,
    breakdowns: [/class|year|level|standing/i, /first.?gen/i, /pell|transfer|residen/i],
    org: 'Example University Student Services', period: 'Fall 2026 · through October 2', recipientHint: 'e.g. Dean of Students', sendTo: 'your director or dean',
    contextHint: 'Add context: staffing, hours, outreach, or what students asked for.',
    formats: {
      term: { label: 'Semester report', docid: 'Semester report', title: 'Student Services Semester Report', context: 'Context and next steps' },
      leadership: { label: 'Leadership update', docid: 'Leadership update', title: 'Student Services Update', context: 'Context' },
      assessment: { label: 'Assessment report', docid: 'Assessment report', title: 'Service Use Assessment', context: 'What we learned' },
    },
  },
  nonprofit: {
    name: 'Other nonprofit programs',
    note: STAYS_LOCAL,
    sample: { build: nonprofitSample, source: 'Sample program sign-in log', note: "Illustrative sample data · not an actual organization's results" },
    person: 'participant', row: 'visit', verb: ['took part', 'took part'], bucket: 'month', suppress: 0, whoTitle: 'Who was served',
    groupNames: /^(programs?|services?|category|group|site|location|activity|type|channel|region)$/i,
    valueNames: /^(participants|attendance|served|people served|amount|total|count|hours|volunteer hours|meals|donations|revenue|value)$/i,
    breakdowns: [/age group|age range/i, /zip|county|ward/i, /gender/i, /race|ethnicity/i],
    org: 'Example Community Organization', period: 'January–March 2026', recipientHint: 'e.g. Community Foundation', sendTo: 'a funder or your board',
    contextHint: 'Add progress toward a grant goal, context for the numbers, or next steps.',
    formats: {
      impact: { label: 'Impact overview', docid: 'Program overview', title: 'Community Program Overview', context: 'Organization context' },
      board: { label: 'Board update', docid: 'Board update', title: 'Quarterly Board Update', context: 'Organization context' },
      grant: { label: 'Grant progress report', docid: 'Grant progress report', title: 'Grant Progress Report', context: 'Progress, context and next steps' },
    },
  },
  campaign: {
    name: 'Campaigns and organizing', hidden: true,
    note: STAYS_LOCAL,
    sample: { build: campaignSample, source: 'Sample field contact log', note: "Illustrative sample data · not an actual campaign's results", filter: ['Result', 'Contacted'] },
    person: 'voter', row: 'contact', verb: ['was reached', 'were reached'], bucket: 'auto', suppress: 0, whoTitle: 'Who we reached',
    groupNames: /^(programs?|tactic|turf|team|region|precinct|ward|district|canvasser|organizer|site|channel|county)$/i,
    valueNames: /^(doors|doors knocked|calls|calls made|texts|texts sent|shifts|hours|contacts|attempts|amount|donations|total|count)$/i,
    breakdowns: [/ward|precinct|district|county/i],
    org: 'Example Organizing Campaign', period: 'September 2026', recipientHint: 'e.g. Field director, coalition partners', sendTo: 'your director or partners',
    contextHint: 'Add what changed this week, context for the numbers, or next steps.',
    formats: {
      field: { label: 'Field program update', docid: 'Field program update', title: 'Field Program Update', context: 'Context and next steps' },
      partner: { label: 'Coalition partner report', docid: 'Partner report', title: 'Coalition Partner Report', context: 'Context' },
    },
  },
};
const DEFAULT_PACK = 'pantry';

/* ───────────────────────── 2. Helpers ───────────────────────── */

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pretty = n => Number.isFinite(n) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n) : '—';
const pct = n => Number.isFinite(n) ? `${(n * 100).toFixed(1).replace(/\.0$/, '')}%` : '—';
const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/* Read a spreadsheet cell as a number: handles $, commas, %, spaces and accounting negatives like (4). */
function num(v) {
  let s = String(v ?? '').trim();
  if (!s) return NaN;
  const negative = /^\(.*\)$/.test(s);
  s = s.replace(/[$€£,%\s()]/g, '');
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return NaN;
  const x = Number(s);
  return negative ? -Math.abs(x) : x;
}

/* Lowercase a label for use mid-sentence, but keep acronyms such as SNAP or GED intact. */
const soft = s => String(s).split(/(\s+)/).map(w => /[A-Z].*[A-Z]/.test(w) ? w : w.toLowerCase()).join('');

function plural(word) {
  const w = String(word);
  if (/person$/i.test(w)) return w.replace(/person$/i, m => m[0] === 'P' ? 'People' : 'people');
  if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/i.test(w)) return w + 'es';
  return w + 's';
}
const count = (n, word) => `${pretty(n)} ${n === 1 ? word : plural(word)}`;

/* Group names that differ only in capitals, spacing, punctuation or "&" vs "and" share one key. */
const normName = s => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const PERIOD_RE = /^(month|quarter|qtr|week|week of|date|period|year|fy|fiscal year|reporting period|service month|month of service|visit date|service date|contact date)$/i;
const PEOPLE_RE = /participant|client|people|person|student|attendee|member|served|enrol|youth|famil|household|patient|resident|individual|visitor|learner|camper|mentee|voter|volunteer(?!.*hour)|supporter|donor/i;
const ID_RE = /(^|[\s_\-#])(id|ids|vanid|identifier)$|^(id|vanid)([\s_\-#]|$)|\bid\b|#$/i;
const NOT_PERSON_ID_RE = /visit|record|row|transaction|order|response|survey|entry|event|attempt|form|submission|zip|phone|session|case note|invoice|line/i;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIODLY = { month: 'monthly', quarter: 'quarterly', week: 'weekly', year: 'yearly', qtr: 'quarterly' };

/* Recognize common period labels (Jan, March 2026, Q2 2026, 2026-03, 2025) so "latest" means latest in time.
 * Anything unrecognized falls back to the order periods first appear in the file. */
function periodKey(p) {
  const s = p.trim().toLowerCase(), yr = y => y ? Number(y.length === 2 ? '20' + y : y) : 0;
  let m;
  if ((m = s.match(/^([a-z]{3})[a-z]*\.?,?\s*'?(\d{2}|\d{4})?$/)) && MONTHS.includes(m[1])) return yr(m[2]) * 12 + MONTHS.indexOf(m[1]);
  if ((m = s.match(/^q([1-4])[\s-]*(?:fy)?'?(\d{2}|\d{4})?$/))) return yr(m[2]) * 4 + Number(m[1]);
  if ((m = s.match(/^(?:fy)?\s*(\d{4})[\s-]*q([1-4])$/))) return Number(m[1]) * 4 + Number(m[2]);
  if (/^\d{4}$/.test(s)) return Number(s);
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) { const t = Date.parse(s); if (Number.isFinite(t)) return t; }
  return NaN;
}
function orderPeriods(list) {
  const keys = list.map(periodKey);
  if (list.length && keys.every(Number.isFinite)) return { order: list.map((p, i) => [p, keys[i]]).sort((a, b) => a[1] - b[1]).map(x => x[0]), sorted: true };
  return { order: list, sorted: false };
}

/* Full dates (2026-03-14, 3/14/2026) → {y, m, d}; anything else → null. */
function parseDate(p) {
  let m = String(p).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { y: +m[1], m: +m[2] - 1, d: +m[3] };
  m = String(p).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:[\sT].*)?$/);
  if (m) return { y: m[3].length === 2 ? 2000 + +m[3] : +m[3], m: +m[1] - 1, d: +m[2] };
  return null;
}
/* How a period reads in a sentence: 2026-09-28 → Sep 28, 2026; 2026-03 → Mar 2026. */
function periodLabel(p) {
  const d = parseDate(p);
  if (d) return `${MONTH_NAMES[d.m]} ${d.d}, ${d.y}`;
  const m = String(p).match(/^(\d{4})-(\d{2})$/);
  return m ? `${MONTH_NAMES[+m[2] - 1]} ${m[1]}` : p;
}

/* Goals by group: one per line as "Group: 100", "Group = 100", "Group<tab>100" or "Group 100". */
function parseGoals(text) {
  const goals = new Map(), bad = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.*\S)\s*[:=\t]\s*(\S.*)$/) || line.match(/^(.*\S)\s+([$\d][\d$.,]*)$/);
    const goal = m ? num(m[2]) : NaN;
    if (!m || !(goal > 0)) { bad.push(line.length > 40 ? line.slice(0, 39) + '…' : line); continue; }
    goals.set(normName(m[1]), { name: m[1].trim(), goal });
  }
  return { goals, bad };
}

/* "Participant ID" → "participant", "Voter ID" → "voter". Falls back to the pack's word for a bare "ID". */
function personNoun(idColumn, pack) {
  if (String(idColumn || '').startsWith('@match:')) return pack.person;
  const word = String(idColumn || '').replace(/(^|[\s_\-])(id|ids|vanid|identifier|number|no\.?|code)(?=$|[\s_\-#])/gi, ' ').replace(/#/g, ' ').replace(/[\s_\-]+/g, ' ').trim();
  if (!word || word.split(' ').length > 2) return pack.person;
  return soft(word.replace(/s$/i, ''));
}

/* ───────────────────────── 3. Reading data ───────────────────────── */

/* CSV or tab-separated text → rows of cells. The delimiter is whichever appears more in the header line. */
function parseDelimited(text) {
  if (text.length > 5 * 1024 * 1024) throw Error('Please use a file smaller than 5 MB.');
  text = text.replace(/^﻿/, '');
  let inQuotes = false, commas = 0, tabs = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (inQuotes && text[i + 1] === '"') i++; else inQuotes = !inQuotes; }
    else if (!inQuotes) { if (c === '\n' || c === '\r') break; if (c === ',') commas++; if (c === '\t') tabs++; }
  }
  const delimiter = tabs > commas ? '\t' : ',', lines = [];
  let row = [], cell = '', quotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quotes && text[i + 1] === '"') { cell += '"'; i++; } else quotes = !quotes; }
    else if (c === delimiter && !quotes) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quotes) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(x => x.trim())) lines.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (quotes) throw Error('A quoted field is not closed. Check the CSV.');
  row.push(cell); if (row.some(x => x.trim())) lines.push(row);
  const bad = lines.findIndex((r, i) => i > 0 && r.length !== lines[0].length);
  if (bad >= 0) throw Error(`Row ${bad + 1} has ${lines[bad].length} fields; expected ${lines[0].length}. Check delimiters or missing cells.`);
  return lines;
}

/* Rows of cells → {cols, rows}, with the checks every source shares. */
function toTable(lines) {
  if (lines.length < 2) throw Error('Include a header and at least one data row.');
  if (lines.length > 25001) throw Error('This prototype supports up to 25,000 rows.');
  const cols = lines[0].map((x, i) => String(x).trim() || `Column ${i + 1}`);
  if (cols.length < 2) throw Error('Include at least two columns.');
  if (new Set(cols).size !== cols.length) throw Error('Column names must be unique. Rename duplicate headers.');
  return { cols, rows: lines.slice(1).map(r => Object.fromEntries(cols.map((c, i) => [c, String(r[i] ?? '').trim()]))) };
}

/* A small .xlsx reader: unzips the workbook with the browser's own decompressor and reads the sheet XML.
 * Dates come out as "Mar 2026" or 2026-03-14, currency cells keep their $, percent cells their %. */
async function readXlsx(buffer) {
  if (typeof DecompressionStream === 'undefined') throw Error('This browser cannot read Excel files. Save the sheet as CSV and upload that instead.');
  const bytes = new Uint8Array(buffer), view = new DataView(buffer), utf8 = new TextDecoder();
  const notWorkbook = () => Error('This file is not a readable .xlsx workbook. Save it as .xlsx or CSV and try again.');
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw notWorkbook();
  const files = new Map();
  for (let n = 0, p = view.getUint32(end + 16, true), total = view.getUint16(end + 10, true); n < total; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const nameLength = view.getUint16(p + 28, true);
    files.set(utf8.decode(bytes.subarray(p + 46, p + 46 + nameLength)), { method: view.getUint16(p + 10, true), size: view.getUint32(p + 20, true), offset: view.getUint32(p + 42, true) });
    p += 46 + nameLength + view.getUint16(p + 30, true) + view.getUint16(p + 32, true);
  }
  async function read(name) {
    const f = files.get(name.replace(/^\//, ''));
    if (!f) return null;
    const start = f.offset + 30 + view.getUint16(f.offset + 26, true) + view.getUint16(f.offset + 28, true), raw = bytes.subarray(start, start + f.size);
    if (f.method === 0) return utf8.decode(raw);
    if (f.method !== 8) throw Error('This workbook uses compression this page cannot read. Save it as CSV and try again.');
    return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const all = (node, tag) => [...node.getElementsByTagNameNS('*', tag)];
  const workbookText = await read('xl/workbook.xml');
  if (!workbookText) throw notWorkbook();
  const workbook = xml(workbookText), relsText = await read('xl/_rels/workbook.xml.rels'), targets = new Map();
  if (relsText) for (const r of all(xml(relsText), 'Relationship')) targets.set(r.getAttribute('Id'), r.getAttribute('Target'));
  const sharedText = await read('xl/sharedStrings.xml');
  const strings = sharedText ? all(xml(sharedText), 'si').map(si => all(si, 't').filter(t => t.parentNode.localName !== 'rPh').map(t => t.textContent).join('')) : [];
  const stylesText = await read('xl/styles.xml'), formats = [], custom = new Map();
  if (stylesText) {
    const styles = xml(stylesText);
    for (const f of all(styles, 'numFmt')) custom.set(Number(f.getAttribute('numFmtId')), f.getAttribute('formatCode') || '');
    const xfs = all(styles, 'cellXfs')[0];
    if (xfs) for (const xf of [...xfs.children].filter(e => e.localName === 'xf')) formats.push(Number(xf.getAttribute('numFmtId') || 0));
  }
  const BUILT_IN = { 5: '$#,##0', 6: '$#,##0', 7: '$#,##0.00', 8: '$#,##0.00', 9: '0%', 10: '0.00%', 14: 'm/d/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 18: 'h:mm', 19: 'h:mm:ss', 20: 'h:mm', 21: 'h:mm:ss', 22: 'm/d/yyyy h:mm', 42: '$#,##0', 44: '$#,##0.00', 45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mm:ss.0' };
  const codeFor = style => { const id = formats[style] ?? 0; return custom.get(id) ?? BUILT_IN[id] ?? ''; };
  function cellText(value, code) {
    const bare = code.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '');
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    if (/[dmyh]/i.test(bare) && !/^general$/i.test(bare)) {
      const d = new Date(Math.round((n - 25569) * 86400000));
      if (!/d/i.test(bare) && /y/i.test(bare)) return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      return d.toISOString().slice(0, 10);
    }
    if (bare.includes('%')) return `${Math.round(n * 10000) / 100}%`;
    const symbol = (code.match(/[$€£]/) || [])[0];
    return symbol ? symbol + value : value;
  }
  const columnIndex = ref => { let n = 0; for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const sheets = [];
  for (const sheet of all(workbook, 'sheet')) {
    if (sheet.getAttribute('state') && sheet.getAttribute('state') !== 'visible') continue;
    const rid = sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let target = targets.get(rid);
    if (!target) continue;
    target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    const text = await read(target);
    if (!text) continue;
    const matrix = [];
    for (const row of all(xml(text), 'row')) {
      const cells = [];
      let next = 0;
      for (const c of row.children) {
        if (c.localName !== 'c') continue;
        const ref = c.getAttribute('r'), index = ref ? columnIndex(ref) : next, type = c.getAttribute('t');
        const v = all(c, 'v')[0]?.textContent ?? '';
        let value = '';
        if (type === 's') value = strings[Number(v)] ?? '';
        else if (type === 'inlineStr') value = all(c, 't').map(t => t.textContent).join('');
        else if (type === 'str') value = v;
        else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
        else if (type === 'd') value = v.slice(0, 10);
        else if (type !== 'e' && v !== '') value = cellText(v, codeFor(Number(c.getAttribute('s') || 0)));
        cells[index] = value; next = index + 1;
      }
      if (cells.some(x => String(x ?? '').trim())) matrix.push(Array.from(cells, x => x ?? ''));
    }
    let width = 0;
    for (const r of matrix) for (let i = r.length - 1; i >= 0; i--) if (String(r[i]).trim()) { width = Math.max(width, i + 1); break; }
    sheets.push({ name: sheet.getAttribute('name') || `Sheet ${sheets.length + 1}`, matrix: matrix.map(r => Array.from({ length: width }, (_, i) => r[i] ?? '')) });
  }
  if (!sheets.length) throw Error('No readable sheets were found in this workbook.');
  return sheets;
}

/* ───────────────────────── 4. Column detection and matching people ───────────────────────── */

/* Person codes count as IDs too: "Participant Code", "Client #", "Case Number", "Member No." */
const PERSON_CODE_RE = /(participant|client|patient|member|student|case|unique|person|household|voter|customer|guest|resident|youth|family)[\s_\-]*(code|number|no\.?|#)$/i;
const isPersonId = col => typeof col === 'string' && (col.startsWith('@match:') || ((ID_RE.test(col.trim()) || PERSON_CODE_RE.test(col.trim())) && !NOT_PERSON_ID_RE.test(col)));

const FIRST_RE = /^(first|first name|firstname|given name)$/i, LAST_RE = /^(last|last name|lastname|surname|family name)$/i;
const NAME_RE = /^((client|participant|guest|student|customer|patron|member|household|head of household|full|resident|visitor|recipient)\s*)?name$/i;
const SIZE_RE = /^(household size|hh size|family size|people in household|household members|# in household|number in household|persons in household|size of household|people in family)$/i;

/* How each kind of contact detail is compared: formatting is ignored, the substance must match. */
function addressKey(v) {
  const words = { street: 'st', avenue: 'ave', road: 'rd', boulevard: 'blvd', drive: 'dr', place: 'pl', court: 'ct', lane: 'ln', terrace: 'ter', apartment: 'apt', unit: 'apt', north: 'n', south: 's', east: 'e', west: 'w', northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw' };
  return normName(String(v || '').replace(/#/g, ' apt ')).split(' ').map(w => words[w] || w).join(' ');
}
const CONTACTS = [
  { kind: 'email', test: /e-?mail/i, key: v => String(v || '').trim().toLowerCase() },
  { kind: 'phone', test: /phone|cell|mobile|\btel\b/i, key: v => { let d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length >= 7 ? d.slice(-10) : ''; } },
  { kind: 'birth date', test: /birth|\bdob\b/i, key: v => { const d = parseDate(v); return d ? `${d.y}-${d.m + 1}-${d.d}` : normName(v); } },
  { kind: 'address', test: /address|street/i, key: addressKey },
];
const contactFor = col => CONTACTS.find(c => c.test.test(col));

/* Names compare without capitals, punctuation, word order ("Brown, Keisha") or middle initials. Misspellings still differ. */
function nameKey(v) {
  let s = String(v || '').trim();
  if (s.includes(',')) { const [lastPart, rest] = s.split(/,(.*)/s); s = `${rest} ${lastPart}`; }
  return normName(s).split(' ').filter(t => t.length > 1 || /\d/.test(t)).sort().join(' ');
}
const matchSpec = cols => '@match:' + JSON.stringify(cols);
const matchCols = spec => { try { return JSON.parse(spec.slice(7)); } catch { return []; } };
function matchLabel(spec) {
  const cols = matchCols(spec), contact = cols.map(contactFor).find(Boolean);
  return `Match by name${contact ? ' + ' + contact.kind : ' only'}`;
}

/* Which person (or household) each row belongs to. With an ID column that's the ID; otherwise a name + contact match.
 * A row with a name but no phone joins the person with that name only when exactly one phone is on record for it. */
function unitKeys(rows, spec) {
  if (!String(spec).startsWith('@match:')) return { keys: rows.map(r => String(r[spec] ?? '').trim().toUpperCase().replace(/\s+/g, '') || null), info: null };
  const cols = matchCols(spec), nameCols = cols.filter(c => !contactFor(c)), contactCol = cols.find(c => contactFor(c)), contact = contactCol && contactFor(contactCol);
  const rawName = r => nameCols.map(c => String(r[c] ?? '').trim()).join(' ').replace(/\s+/g, ' ').trim();
  const contactOf = r => contact ? contact.key(r[contactCol]) : '';
  const known = new Map();
  for (const r of rows) { const n = nameKey(rawName(r)), c = contactOf(r); if (n && c) { if (!known.has(n)) known.set(n, new Set()); known.get(n).add(c); } }
  let attached = 0, nameOnly = 0, noName = 0;
  const spellings = new Map();
  const keys = rows.map(r => {
    const raw = rawName(r), n = nameKey(raw);
    if (!n) { noName++; return null; }
    let key = n;
    if (contact) {
      let c = contactOf(r);
      if (!c) { const set = known.get(n); if (set && set.size === 1) { c = [...set][0]; attached++; } else nameOnly++; }
      key = c ? `${n}|${c}` : `${n}|?`;
    }
    if (!spellings.has(key)) spellings.set(key, new Set());
    spellings.get(key).add(raw);
    return key;
  });
  const variants = [...spellings.values()].filter(s => s.size > 1);
  return { keys, info: { nameCols, contactCol, contactKind: contact?.kind || '', attached, nameOnly, noName, variants: variants.length, example: variants.sort((a, b) => b.size - a.size)[0] ? [...variants[0]].slice(0, 3) : [] } };
}

function detectColumns(cols, rows, pack) {
  const numeric = c => { let ok = 0, seen = 0; for (const r of rows.slice(0, 200)) { if (!r[c]) continue; seen++; if (Number.isFinite(num(r[c]))) ok++; } return seen > 0 && ok / seen > .8; };
  const looksLikePeriods = c => { let ok = 0, seen = 0; for (const r of rows.slice(0, 200)) { if (!r[c]) continue; seen++; if (parseDate(r[c]) || Number.isFinite(periodKey(r[c]))) ok++; } return seen > 0 && ok / seen > .8; };
  const id = cols.find(c => isPersonId(c) && !/^household/i.test(c) === !pack.households) || cols.find(isPersonId) || '';
  const time = cols.find(c => PERIOD_RE.test(c.trim())) || cols.find(c => /\b(date|month|week|quarter|period|timestamp|time|check.?in|submitted|created)\b/i.test(c) && !/birth|dob/i.test(c) && looksLikePeriods(c)) || '';
  const first = cols.find(c => FIRST_RE.test(c.trim())), last = cols.find(c => LAST_RE.test(c.trim()));
  const names = first && last ? [first, last] : (cols.find(c => NAME_RE.test(c.trim())) ? [cols.find(c => NAME_RE.test(c.trim()))] : []);
  const contacts = ['phone', 'birth date', 'email', 'address'].map(kind => cols.find(c => contactFor(c)?.kind === kind && !names.includes(c))).filter(Boolean);
  const matches = names.length ? [...contacts.map(c => matchSpec([...names, c])), matchSpec(names)] : [];
  const size = cols.find(c => SIZE_RE.test(c.trim())) || '';
  const skip = new Set([id, time, size, ...names, ...contacts]);
  const category = cols.find(c => pack.groupNames.test(c.trim()) && !skip.has(c))
    || cols.find(c => !skip.has(c) && !numeric(c)) || cols[0];
  const value = cols.find(c => pack.valueNames.test(c.trim()) && c !== category) || cols.find(c => c !== category && !skip.has(c) && numeric(c) && !/zip|postal|code/i.test(c)) || '';
  const breakdowns = [];
  for (const re of pack.breakdowns || []) { const c = cols.find(col => re.test(col) && col !== category && !skip.has(col) && !breakdowns.includes(col)); if (c) breakdowns.push(c); if (breakdowns.length === 2) break; }
  return { id, time, category, value, matches, size, breakdowns };
}

/* ───────────────────────── 5. Analysis ───────────────────────── */

/* Every number and sentence in the report comes from here. It reads only its input, so it can be tested on its own. */
function analyze(o) {
  const { rows, category, value: val, pack } = o;
  const metric = o.metric, unique = metric === 'unique';
  const useTime = (metric === 'sum' || unique) && !!o.timecol && o.timecol !== category && o.timecol !== val;
  const timecol = useTime ? o.timecol : '';

  /* Full dates are grouped: by month for packs that report monthly, otherwise by week (short spans) or month. */
  const rawPeriods = useTime ? [...new Set(rows.map(row => String(row[timecol] ?? '').trim()).filter(Boolean))] : [];
  const allDates = rawPeriods.length > 0 && rawPeriods.every(parseDate);
  const stamp = v => { const d = parseDate(v); return Date.UTC(d.y, d.m, d.d); };
  const span = allDates ? (Math.max(...rawPeriods.map(stamp)) - Math.min(...rawPeriods.map(stamp))) / 86400000 : 0;
  const bucket = !allDates ? '' : pack.bucket === 'month' ? 'month' : rawPeriods.length <= 12 ? '' : span <= 120 ? 'week' : 'month';
  const periodOf = raw => {
    const v = String(raw ?? '').trim();
    if (!v) return '(No period)';
    if (!bucket) return v;
    const d = parseDate(v);
    if (bucket === 'month') return `${MONTH_NAMES[d.m]} ${d.y}`;
    const t = Date.UTC(d.y, d.m, d.d);
    return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
  };
  const tword = bucket || soft(timecol);
  const across = metric === 'sum' && useTime ? o.across : 'sum';

  const group = soft(category).replace(/s$/i, '') || 'group', groups = plural(group);
  const person = unique ? personNoun(val, pack) : pack.person, people = plural(person);
  const households = unique && /household|family|hh/i.test(person) && !!o.sizeCol;
  const rowWord = pack.row;
  const label = o.label || (metric === 'count' ? 'Rows' : unique ? cap(people) : val);
  const lab = unique ? people : soft(label);
  const r = { unique, across, useTime, person, people, group, groups, label, findings: [], warnings: [], breakdowns: [] };

  /* Small counts: with a threshold set, counts from 1 up to it are shown as "<5" or "fewer than 5". */
  const limit = Number(o.suppress) || 0, counted = unique || metric === 'count';
  const small = n => counted && limit > 0 && n > 0 && n < limit;
  const shortN = n => small(n) ? `<${limit}` : pretty(n);
  const countN = (n, word) => small(n) ? `fewer than ${limit} ${plural(word)}` : count(n, word);
  const shareN = (n, d) => small(n) ? '—' : pct(n / d);
  r.limit = limit;

  /* Filter, then work out which person each row belongs to. */
  const filtered = o.filterCol ? rows.filter(row => String(row[o.filterCol] ?? '').trim() === o.filterVal) : rows;
  r.filtered = filtered.length;
  const units = unique ? unitKeys(filtered, val) : { keys: [], info: null };
  r.match = units.info;

  /* Group names: optionally combine spellings that differ only in capitals, spacing or punctuation. */
  const spellings = new Map();
  const keyOf = row => {
    const name = String(row[category] ?? '').trim().replace(/\s+/g, ' ') || '(Unspecified)';
    const key = o.merge ? normName(name) || name : name;
    if (!spellings.has(key)) spellings.set(key, new Map());
    const m = spellings.get(key); m.set(name, (m.get(name) || 0) + 1);
    return key;
  };

  let symbolCount = 0, numericCount = 0, valid = 0, skipped = 0, hasNegative = false, percentInput = false;
  const totals = new Map(), cells = new Map(), periodsSeen = [], periodSet = new Set();
  const idGroups = new Map(), idRows = new Map(), idPeriods = new Map(), periodIds = new Map(), idSize = new Map();
  const breakCols = (o.breakdowns || []).filter(c => c && c !== category);
  const idTraits = breakCols.map(() => new Map()), rowTraits = breakCols.map(() => new Map());
  filtered.forEach((row, i) => {
    const key = keyOf(row);
    const period = useTime ? periodOf(row[timecol]) : '';
    if (useTime && !periodSet.has(period)) { periodSet.add(period); periodsSeen.push(period); }
    if (unique) {
      const id = units.keys[i];
      if (!id) { skipped++; return; }
      if (!totals.has(key)) totals.set(key, new Set());
      totals.get(key).add(id);
      if (!idGroups.has(id)) idGroups.set(id, new Set());
      idGroups.get(id).add(key);
      idRows.set(id, (idRows.get(id) || 0) + 1);
      if (households) { const s = num(row[o.sizeCol]); if (Number.isFinite(s) && s > 0) idSize.set(id, s); }
      breakCols.forEach((c, b) => { const v = String(row[c] ?? '').trim(); if (v) idTraits[b].set(id, v); else if (!idTraits[b].has(id)) idTraits[b].set(id, ''); });
      if (useTime) {
        if (!idPeriods.has(id)) idPeriods.set(id, new Set());
        idPeriods.get(id).add(period);
        if (!periodIds.has(period)) periodIds.set(period, new Set());
        periodIds.get(period).add(id);
      }
      valid++;
      return;
    }
    const x = metric === 'count' ? 1 : num(row[val]);
    if (!Number.isFinite(x)) { skipped++; return; }
    if (metric === 'sum') { numericCount++; if (/[$€£]/.test(row[val])) symbolCount++; if (String(row[val]).includes('%')) percentInput = true; }
    if (x < 0) hasNegative = true;
    totals.set(key, (totals.get(key) || 0) + x);
    breakCols.forEach((c, b) => { const v = String(row[c] ?? '').trim(); rowTraits[b].set(v, (rowTraits[b].get(v) || 0) + x); });
    valid++;
    if (useTime) { if (!cells.has(key)) cells.set(key, new Map()); const c = cells.get(key); c.set(period, (c.get(period) || 0) + x); }
  });

  /* Money: when most values in the column carry a currency symbol, figures are shown as money. */
  const currency = metric === 'sum' && numericCount > 0 && symbolCount / numericCount >= .5;
  const symbol = currency ? (filtered.map(x => String(x[val]).match(/[$€£]/)).find(Boolean) || ['$'])[0] : '';
  const money = n => { const whole = Number.isInteger(n) || Math.abs(n) >= 1000; return (n < 0 ? '-' : '') + symbol + new Intl.NumberFormat('en-US', { maximumFractionDigits: whole ? 0 : 2, minimumFractionDigits: whole ? 0 : 2 }).format(Math.abs(n)); };
  const fmt = currency ? money : counted ? shortN : pretty;
  r.fmt = fmt;
  const amount = v => unique ? countN(v, person) : currency ? `${fmt(v)} in ${lab}` : `${fmt(v)} ${lab}`;
  const display = key => [...spellings.get(key)].sort((a, b) => b[1] - a[1])[0][0];
  r.merged = o.merge ? [...spellings.values()].filter(m => m.size > 1).map(m => [...m].sort((a, b) => b[1] - a[1]).map(x => x[0])) : [];

  /* Periods and the per-group value the report shows. */
  const { order: periods, sorted: periodSorted } = orderPeriods(periodsSeen), latestKey = periods[periods.length - 1], latest = periodLabel(latestKey ?? '');
  r.latest = latest; r.periods = periods;
  let maxRepeat = 0, missingLatest = 0;
  for (const c of cells.values()) maxRepeat = Math.max(maxRepeat, c.size);
  const values = new Map();
  if (unique) for (const [k, set] of totals) values.set(k, set.size);
  else if (across === 'latest') { for (const [k, c] of cells) { if (c.has(latestKey)) values.set(k, c.get(latestKey)); else missingLatest++; } }
  else if (across === 'avg') { for (const [k, c] of cells) { let t = 0; for (const v of c.values()) t += v; values.set(k, t / c.size); } }
  else for (const [k, v] of totals) values.set(k, v);
  const grand = unique ? idGroups.size : [...values.values()].reduce((a, b) => a + b, 0);
  if (!Number.isFinite(grand) || [...values.values()].some(x => !Number.isFinite(x))) return { error: 'The total exceeds the supported numeric range. Choose another measure.' };
  const individuals = households ? [...idGroups.keys()].reduce((t, id) => t + (idSize.get(id) || 0), 0) : 0;
  const missingSize = households ? [...idGroups.keys()].filter(id => !idSize.has(id)).length : 0;

  const desc = [...values].map(([key, value]) => ({ key, name: display(key), value, suppressed: small(value) })).sort((a, b) => b.value - a.value);
  const all = [...desc];
  if (o.sort === 'asc') all.reverse();
  if (o.sort === 'alpha') all.sort((a, b) => a.name.localeCompare(b.name));
  r.all = all; r.shown = all.slice(0, Number(o.limit) || 5); r.grand = grand; r.valid = valid; r.skipped = skipped;
  const shares = !unique && !hasNegative && grand > 0 && !(limit && counted);
  const say = t => r.findings.push(t);
  const what = metric === 'count' ? 'row count' : { sum: 'total', latest: `${latest} figure`, avg: `average per ${tword}` }[across];
  const perUnit = across === 'avg' ? ` per ${tword}` : across === 'latest' ? ` in ${latest}` : '';

  /* Goals: compared with the same figure the report shows. */
  const goalRaw = String(o.goal || '').trim(), overallGoal = num(goalRaw), hasGoal = overallGoal > 0;
  const { goals, bad: badGoals } = parseGoals(o.groupGoals), byName = new Map(desc.map(d => [normName(d.name), d])), unmatched = [];
  for (const [k, g] of goals) { const d = byName.get(k); if (d) d.goal = g.goal; else unmatched.push(g.name); }
  const periodly = PERIODLY[tword] || `per-${tword}`;
  r.goalHint = metric === 'count' ? 'Goals are compared with the number of rows.' : unique ? `Goals are compared with the number of unique ${people}.` : {
    sum: `Goals are compared with the total for everything included${useTime ? ` (all ${tword} values added together)` : ''}. Use a goal for this reporting period, not a full-year target.`,
    avg: `Goals are compared with the average per ${tword}. Enter ${periodly} goals.`,
    latest: `Goals are compared with ${latest} only. Enter goals for a single ${tword}.` }[across];
  r.goalIssues = [goalRaw && !hasGoal ? 'The overall goal must be a positive number.' : '',
    badGoals.length ? `Could not read ${badGoals.slice(0, 3).map(x => `"${x}"`).join(', ')}. Use the format Group: 100.` : '',
    unmatched.length ? `No ${group} named ${unmatched.slice(0, 3).map(n => `"${n}"`).join(', ')}${unmatched.length > 3 ? ` and ${unmatched.length - 3} more` : ''} in this view.` : ''].filter(Boolean).join(' ');
  if (hasGoal) {
    const g = grand / overallGoal, figure = unique ? countN(grand, person) : `${fmt(grand)}${currency ? '' : ' ' + lab}${perUnit}`;
    say(grand >= overallGoal ? `Goal met: ${figure} against a goal of ${pretty(overallGoal)} (${pct(g)}).` : `${pct(g)} of goal: ${figure} against a goal of ${pretty(overallGoal)}, ${pretty(overallGoal - grand)} short.`);
  }
  const withGoal = desc.filter(d => d.goal), noGoal = desc.length - withGoal.length;
  if (withGoal.length === 1) {
    const d = withGoal[0];
    say(d.value >= d.goal ? `${d.name} has reached its goal: ${fmt(d.value)} of ${pretty(d.goal)} (${pct(d.value / d.goal)}).` : `${d.name} is at ${pct(d.value / d.goal)} of its goal: ${fmt(d.value)} of ${pretty(d.goal)}.`);
  } else if (withGoal.length > 1) {
    const met = withGoal.filter(d => d.value >= d.goal), behind = withGoal.filter(d => d.value < d.goal).sort((a, b) => a.value / a.goal - b.value / b.goal);
    say(`${met.length === withGoal.length ? `All ${withGoal.length}` : `${met.length} of ${withGoal.length}`} ${groups} with a goal have reached it${noGoal ? `; ${count(noGoal, group)} ${noGoal === 1 ? 'has' : 'have'} no goal set` : ''}.`);
    if (behind.length) { const d = behind[0]; say(`${d.name} is furthest from its goal: ${fmt(d.value)} of ${pretty(d.goal)} (${pct(d.value / d.goal)}).`); }
  }

  /* People: how many, household members, how often they came, overlap between groups, new versus returning. */
  if (unique && idGroups.size) {
    const n = idGroups.size, perPerson = valid / n;
    r.perPerson = perPerson; r.individuals = individuals;
    say(`${cap(countN(n, person))} account for ${count(valid, rowWord)}, an average of ${pretty(perPerson)} each.`);
    if (households) say(`These ${plural(person)} include ${countN(individuals, 'individual')}, using each ${person}'s most recently reported size${missingSize ? `; ${countN(missingSize, person)} with no size on record ${missingSize === 1 ? 'is' : 'are'} not included` : ''}.`);
    let once = 0, often = 0;
    for (const c of idRows.values()) { if (c === 1) once++; if (c >= 5) often++; }
    if (valid > n) say(`${cap(countN(once, person))} (${shareN(once, n)}) ${once === 1 ? 'has' : 'have'} one ${rowWord} on record${often ? `; ${small(often) ? `fewer than ${limit}` : pretty(often)} (${shareN(often, n)}) ${often === 1 ? 'has' : 'have'} five or more` : ''}.`);
    const multi = [...idGroups.values()].filter(g => g.size > 1).length;
    if (desc.length > 1) say(multi ? `${cap(countN(multi, person))} ${multi === 1 ? 'is' : 'are'} counted under more than one ${group}, so the ${group} counts add up to more than ${pretty(n)}.` : `No ${person} is counted under more than one ${group}.`);
    if (useTime && periods.length > 1 && periodIds.has(latestKey)) {
      const inLatest = periodIds.get(latestKey), firstIndex = id => Math.min(...[...idPeriods.get(id)].map(p => periods.indexOf(p)));
      let fresh = 0;
      for (const id of inLatest) if (firstIndex(id) === periods.length - 1) fresh++;
      const verb = (pack.verb || ['took part', 'took part'])[inLatest.size === 1 ? 0 : 1];
      say(`In the latest ${tword} (${latest}), ${countN(inLatest.size, person)} ${verb}: ${shortN(fresh)} new and ${shortN(inLatest.size - fresh)} returning from an earlier ${tword}.`);
    }
  }

  /* Largest and smallest groups. */
  if (desc.length > 1 && desc[0].value === desc[desc.length - 1].value) say(`All ${desc.length} ${groups} have the same ${unique ? `number of ${people}` : what}: ${amount(desc[0].value)} each.`);
  else if (desc.length) {
    const top = desc[0], low = desc[desc.length - 1];
    say(unique ? `${top.name} served the most ${people}: ${shortN(top.value)}.` : `${top.name} has the largest ${what}: ${amount(top.value)}${shares ? ` (${pct(top.value / grand)} of the total)` : ''}.`);
    if (desc.length >= 3 && shares) say(`The top two ${groups} together account for ${pct((desc[0].value + desc[1].value) / grand)} of the total.`);
    if (desc.length >= 3) say(unique ? `${low.name} served the fewest: ${shortN(low.value)}.` : `${low.name} has the smallest ${what}: ${amount(low.value)}.`);
  } else say('No valid values were found in the selected column. Choose another measure.');

  /* Breakdowns: each person is counted once, under the value on their most recent row. */
  breakCols.forEach((col, b) => {
    const tally = new Map();
    if (unique) for (const v of idTraits[b].values()) tally.set(v, (tally.get(v) || 0) + 1);
    else for (const [v, x] of rowTraits[b]) tally.set(v, x);
    const named = [...tally].filter(([v]) => v), blank = tally.get('') || 0;
    const lead = v => { const m = v.match(/\d+/); return m ? Number(m[0]) : NaN; };
    const ordered = named.length > 1 && named.every(([v]) => Number.isFinite(lead(v)) || /^(above|over|under|less|more)/i.test(v))
      ? named.sort((a, b) => (Number.isFinite(lead(a[0])) ? lead(a[0]) : 1e9) - (Number.isFinite(lead(b[0])) ? lead(b[0]) : 1e9))
      : named.sort((a, b) => b[1] - a[1]);
    const total = [...tally.values()].reduce((a, v) => a + v, 0);
    const rowsOut = ordered.slice(0, 40).map(([v, n]) => ({ name: v, value: n, shown: fmt(n), share: unique || metric === 'count' ? shareN(n, total) : pct(n / total) }));
    if (ordered.length > 40) { const rest = ordered.slice(40).reduce((a, [, n]) => a + n, 0); rowsOut.push({ name: `${ordered.length - 40} more`, value: rest, shown: fmt(rest), share: shareN(rest, total), muted: true }); }
    if (blank) rowsOut.push({ name: 'Not reported', value: blank, shown: fmt(blank), share: shareN(blank, total), muted: true });
    /* If exactly one count is hidden, the total would reveal it, so the next smallest count is hidden too. */
    let note = '';
    if (counted && limit) {
      const hidden = rowsOut.filter(x => small(x.value));
      if (hidden.length === 1 && rowsOut.length > 2) {
        const next = rowsOut.filter(x => !small(x.value)).sort((a, b) => a.value - b.value)[0];
        if (next) { next.shown = '—'; next.share = '—'; note = `— hidden so the count under ${limit} can't be worked out from the total.`; }
      }
    }
    r.breakdowns.push({ column: col, unit: unique ? cap(people) : metric === 'count' ? 'Rows' : label, rows: rowsOut, total: fmt(total), note });
  });

  /* How the figures were made, when that changes how to read them. */
  if (across === 'latest') say(`Figures show ${latest}, the latest ${tword} ${periodSorted ? 'by date' : 'in file order'}.${missingLatest ? ` ${count(missingLatest, group)} ${missingLatest === 1 ? 'has' : 'have'} no ${latest} data and ${missingLatest === 1 ? 'is' : 'are'} not shown.` : ''}`);
  if (across === 'avg') say(`Each ${group}'s figure is its average across the ${tword} values in which it appears (${periods.length} in the data). The total is the sum of those averages, which approximates a typical ${tword}.`);
  const dedupRisk = useTime && across === 'sum' && maxRepeat > 1 && PEOPLE_RE.test(label + ' ' + val);
  if (dedupRisk) say(`${cap(groups)} appear in up to ${maxRepeat} ${tword} values. If the same people take part in more than one ${tword}, this sum counts them once per ${tword}. Setting Across periods to "Average" or "Latest only" avoids that, and counting unique people removes it.`);
  if (skipped) say(`${count(skipped, 'row')} ${skipped === 1 ? 'was' : 'were'} excluded because ${unique ? (r.match ? 'no name was given' : 'the ID was blank') : 'the selected value was blank or not a number'}.`);
  if (hasNegative) say('Percentage shares are omitted because the source includes negative values.');
  if (percentInput) say('Source percentages were treated as numbers. Adding up percentages may be inappropriate; confirm the measure.');

  if (dedupRisk) r.warnings.push('This sum may count returning people more than once. See Across periods.');
  if (skipped) r.warnings.push(`${count(skipped, 'row')} excluded from the selected measure.`);
  if (percentInput) r.warnings.push('Percentage values detected. Confirm whether adding them up makes sense.');
  if (!valid) r.warnings.push('No valid values found; select another column.');

  /* Headline cards: always four. */
  const goalCard = hasGoal ? { value: pct(grand / overallGoal), label: `of goal (${pretty(overallGoal)}${perUnit})`, progress: grand / overallGoal } : null;
  const rowsLabel = `${cap(plural(rowWord))} recorded`, perLabel = `${cap(plural(rowWord))} per ${person}`;
  r.totalLabel = metric === 'count' ? 'Rows counted' : unique ? `${label} (unique)` : { sum: `${label}${currency ? '' : ' (sum)'}`, avg: `${label} (avg. per ${tword})`, latest: `${label} · ${latest}` }[across];
  r.metrics = !unique
    ? [{ value: fmt(grand), label: r.totalLabel }, { value: pretty(values.size), label: `${cap(groups)} represented` }, { value: shares && desc.length ? pct(desc[0].value / grand) : 'n/a', label: `Largest ${group}'s share` }, goalCard || { value: pretty(valid), label: 'Rows included' }]
    : households
      ? [{ value: shortN(grand), label: r.totalLabel }, { value: shortN(individuals), label: 'Individuals in these households' }, { value: pretty(valid), label: rowsLabel }, goalCard || { value: pretty(r.perPerson ?? NaN), label: perLabel }]
      : [{ value: shortN(grand), label: r.totalLabel }, { value: pretty(valid), label: rowsLabel }, { value: pretty(r.perPerson ?? NaN), label: perLabel }, goalCard || { value: pretty(values.size), label: `${cap(groups)} represented` }];

  /* Chart and method text. */
  const filterNote = o.filterCol ? ` · Only rows where ${o.filterCol} is “${o.filterVal}”` : '';
  r.chartTitle = `${label} by ${group}`;
  r.chartSub = (metric === 'count' ? `Rows by ${category}` : unique ? `Unique ${people} by ${category}. Anyone in two ${groups} is counted in each.` : { sum: `${currency ? 'Total' : 'Summed'} ${val} by ${category}`, avg: `Average ${val} per ${timecol}, by ${category}`, latest: `${val} in ${latest} (latest ${bucket || timecol}), by ${category}` }[across]) + filterNote;
  const m = r.match;
  const how = metric === 'count' ? 'Row count'
    : unique ? (m ? `Unique ${people}, matched by ${m.nameCols.join(' + ')}${m.contactCol ? ' and ' + m.contactCol : ''}` : `Count of unique ${val} values`)
    : { sum: `Sum of ${val}`, avg: `Average of ${val} per ${timecol}`, latest: `${val} in ${latest} (latest ${bucket || timecol})` }[across];
  const matchMethod = m ? `Names were compared without capitals, punctuation, word order or middle initials; misspellings were not matched.${m.contactCol ? ` Rows without a ${m.contactKind} were matched by name when that name had only one ${m.contactKind} on record (${pretty(m.attached)} rows); ${pretty(m.nameOnly)} could not be and were counted by name alone.` : ''} ` : '';
  const caveat = unique ? `Each ${person} is counted once in the total and once in each ${group} where they appear. ${breakCols.length ? `Breakdowns use each ${person}'s most recent value. ` : ''}`
    : metric !== 'sum' ? '' : across === 'sum' ? 'Totals add up rows; repeated people are not deduplicated. ' : `Per-${tword} figures avoid adding up periods; people in more than one ${group} are still counted in each. `;
  const filterMethod = o.filterCol ? `Only rows where ${o.filterCol} is “${o.filterVal}” (${pretty(filtered.length)} of ${pretty(rows.length)}). ` : '';
  const mergeMethod = r.merged.length ? `${count(r.merged.length, group)} spelled more than one way ${r.merged.length === 1 ? 'was' : 'were'} combined. ` : '';
  const dateMethod = bucket ? `Dates in ${timecol} were grouped by ${bucket}${bucket === 'week' ? ' (weeks start Monday)' : ''}. ` : '';
  const limitMethod = limit && counted ? `Counts from 1 to ${limit - 1} are shown as “<${limit}” to protect privacy. ` : '';
  r.method = `Source: ${o.source}. Method: ${how}, grouped by ${category}. ${filterMethod}${dateMethod}${pretty(valid)} rows included${skipped ? `; ${pretty(skipped)} excluded` : ''}. ${matchMethod}${mergeMethod}${caveat}${limitMethod}Descriptive summary; no causal inference.`;
  return r;
}

/* ───────────────────────── 6. Rendering ───────────────────────── */

const state = { cols: [], rows: [], source: '', sample: false, pack: DEFAULT_PACK, sheets: null, matches: [], result: null, chartSvg: '', logo: '', kit: [], templates: [], report: {}, autoLabel: '' };
const fonts = { sans: 'system-ui, -apple-system, "Segoe UI", sans-serif', serif: 'Georgia, "Times New Roman", serif', humanist: '"Trebuchet MS", Arial, sans-serif' };
const pack = () => PACKS[state.pack] || PACKS[DEFAULT_PACK];

function toast(s) { $('toast').textContent = s; $('toast').style.display = 'block'; clearTimeout(window.__to); window.__to = setTimeout(() => $('toast').style.display = 'none', 4000); }
function warn(s) { $('warn').style.display = s ? 'block' : 'none'; $('warn').textContent = s; }

function rgb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
function luminance(hex) { const c = rgb(hex).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
/* Header text on a primary-color background: whichever of white or dark ink reads better. */
function inkFor(hex) { return contrast(hex, '#ffffff') >= contrast(hex, '#26332c') ? '#ffffff' : '#26332c'; }
/* Brand color used as text on white: only when it meets WCAG AA (4.5:1) against white. */
function reportInk(hex) { return contrast(hex, '#ffffff') >= 4.5 ? hex : '#26332c'; }
function getBrand() { return { org: $('org').value, primary: $('primaryColor').value, accent: $('accentColor').value, font: $('font').value, style: $('style').value, logo: state.logo }; }

/* The label the app would choose for the current measure; replaced only while the person hasn't typed their own. */
function defaultLabel() {
  const m = $('metric').value, v = $('value').value;
  return m === 'count' ? 'Rows' : m === 'unique' ? cap(plural(personNoun(v, pack()))) : v;
}
function refreshLabel() {
  const current = $('metriclabel').value;
  if (!current || current === state.autoLabel) $('metriclabel').value = defaultLabel();
  state.autoLabel = defaultLabel();
}

function render() {
  const b = getBrand(), rep = $('report');
  rep.style.setProperty('--report-primary', b.primary); rep.style.setProperty('--report-accent', b.accent);
  rep.style.setProperty('--report-font', fonts[b.font]); rep.style.setProperty('--report-ink', reportInk(b.primary));
  rep.style.setProperty('--header-ink', inkFor(b.primary)); rep.dataset.style = b.style;
  $('logoout').hidden = !b.logo; $('logoout').src = b.logo || '';
  $('logothumb').replaceChildren();
  if (b.logo) { const img = new Image(); img.src = b.logo; img.alt = 'Uploaded organization logo'; $('logothumb').append(img); } else $('logothumb').textContent = 'LOGO';
  $('removeLogo').hidden = !b.logo;
  if (!state.rows.length) return;

  const metric = $('metric').value, unique = metric === 'unique', p = pack();
  $('value').disabled = metric === 'count';
  const unitWord = personNoun($('value').value, p);
  $('valueLabel').textContent = unique ? `Identify ${plural(unitWord)} by` : 'Value column';
  $('sizeField').hidden = !(unique && (/household|family/i.test(unitWord)));
  $('packNote').textContent = p.note;
  $('periodRow').hidden = metric === 'count';
  $('acrossField').hidden = unique;
  $('across').disabled = !$('timecol').value;
  const idCol = state.cols.find(isPersonId), canMatch = state.matches.length > 0, matching = String($('value').value).startsWith('@match:');
  $('idHint').textContent = unique
    ? (matching ? `No ID column, so ${plural(unitWord)} are matched by name. Capitals, punctuation, word order and middle initials are ignored; misspellings are not.` : isPersonId($('value').value) ? `Each ${unitWord} is counted once, however many rows they have.` : 'Choose the column that identifies each person, such as a client ID, or match by name.')
    : idCol ? `This file has an ID column (${idCol}). Choose “Unique people” to count each person once.` : canMatch ? 'This file has names. Choose “Unique people” to count each person once.' : '';

  const res = analyze({
    rows: state.rows, source: state.source, pack: p, category: $('category').value, metric, value: $('value').value,
    timecol: $('timecol').value, across: $('across').value, merge: $('mergeNames').checked,
    filterCol: $('filterCol').value, filterVal: $('filterVal').value, label: $('metriclabel').value,
    goal: $('goal').value, groupGoals: $('groupGoals').value, sort: $('sort').value, limit: $('limit').value,
    sizeCol: $('sizeCol').value, breakdowns: [$('break1').value, $('break2').value].filter((c, i, a) => c && a.indexOf(c) === i), suppress: $('suppress').value,
  });
  if (res.error) { warn(res.error); return; }
  state.result = res; state.summary = res.all; state.shown = res.shown; state.insights = res.findings; state.fmt = res.fmt;

  $('mergeInfo').textContent = res.merged.length ? `Combined ${res.merged.length === 1 ? 'one name' : `${res.merged.length} names`} spelled more than one way: ${res.merged.slice(0, 2).map(v => v.map(x => `“${x}”`).join(' + ')).join('; ')}${res.merged.length > 2 ? '; …' : ''}.` : '';
  $('goalHint').textContent = res.goalHint; $('goalIssues').textContent = res.goalIssues;
  const m = res.match;
  $('matchInfo').textContent = m ? [`Matched ${pretty(res.valid)} ${plural(p.row)} to ${count(res.grand, res.person)}.`,
    m.variants ? `${count(m.variants, res.person)} ${m.variants === 1 ? 'was' : 'were'} written more than one way, such as ${m.example.map(x => `“${x}”`).join(' and ')}.` : '',
    m.nameOnly ? `${count(m.nameOnly, 'row')} had no ${m.contactKind} and a name shared by more than one ${res.person}; ${m.nameOnly === 1 ? 'it was' : 'they were'} counted by name alone.` : ''].filter(Boolean).join(' ') : '';

  const title = $('reporttitle').value || 'Report', org = b.org || 'Your organization', period = $('period').value, funder = $('funder').value, narrative = $('narrative').value;
  const prepared = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date());
  const format = p.formats[$('preset').value] || Object.values(p.formats)[0];
  $('titleout').textContent = title; $('byline').textContent = `${org} · Prepared ${prepared}`; $('periodout').textContent = period;
  $('recipient').textContent = `Prepared for ${funder}`; $('recipient').hidden = !funder;
  $('docid').textContent = format.docid.toUpperCase();

  $('metricsSection').replaceChildren(...res.metrics.map(m => {
    const card = document.createElement('div'); card.className = 'metric';
    const n = document.createElement('div'); n.className = 'number'; n.textContent = m.value; card.append(n);
    if (m.progress != null) { const bar = document.createElement('div'); bar.className = 'goalbar'; bar.setAttribute('aria-hidden', 'true'); const fill = document.createElement('span'); fill.style.width = `${Math.max(0, Math.min(1, m.progress)) * 100}%`; bar.append(fill); card.append(bar); }
    const l = document.createElement('div'); l.className = 'lbl'; l.textContent = m.label; card.append(l);
    return card;
  }));
  $('charttitle').textContent = res.chartTitle; $('chartcount').textContent = `${res.shown.length} OF ${res.all.length} ${res.groups.toUpperCase()}`; $('chartsub').textContent = res.chartSub;
  $('findings').replaceChildren(...res.findings.map(t => { const el = document.createElement('p'); el.textContent = t; return el; }));
  $('method').textContent = res.method; $('method').hidden = !$('showMethod').checked; $('credit').hidden = $('whiteLabel').checked;
  $('sampleNote').hidden = !state.sample; $('sampleNote').textContent = p.sample.note;
  $('breakdownTitle').textContent = p.whoTitle;
  $('breakdowns').replaceChildren(...res.breakdowns.map(bd => {
    const table = document.createElement('table'); table.className = 'breakdown';
    table.innerHTML = `<thead><tr><th scope="col">${esc(bd.column)}</th><th scope="col" class="num">${esc(bd.unit)}</th><th scope="col" class="num">Share</th></tr></thead>`
      + `<tbody>${bd.rows.map(row => `<tr${row.muted ? ' class="muted"' : ''}><td>${esc(row.name)}</td><td class="num">${esc(row.shown)}</td><td class="num">${esc(row.share)}</td></tr>`).join('')}</tbody>`
      + `<tfoot><tr><td>Total</td><td class="num">${esc(bd.total)}</td><td class="num">100%</td></tr>${bd.note ? `<tr><td colspan="3" class="table-note">${esc(bd.note)}</td></tr>` : ''}</tfoot>`;
    return table;
  }));
  $('breakdownSection').hidden = !$('showBreakdowns').checked || !res.breakdowns.length;
  $('metricsSection').hidden = !$('showMetrics').checked; $('chartSection').hidden = !$('showChart').checked; $('findingsSection').hidden = !$('showFindings').checked;
  $('contextSection').hidden = !$('showContext').checked || !narrative;
  $('contextTitle').textContent = format.context; $('contextout').textContent = narrative;

  state.chartSvg = chart(res.shown, res.label, b.primary, res.fmt);
  const width = $('chart').clientWidth;
  $('chart').innerHTML = width && width < 600 ? chartCompact(res.shown, res.label, b.primary, res.fmt, width) : state.chartSvg;
  state.report = { title, org, period, funder, narrative, prepared, method: res.method, label: res.label, category: $('category').value, preset: $('preset').value, metrics: res.metrics, breakdowns: res.breakdowns, whoTitle: p.whoTitle };
  warn(res.warnings.join(' '));
}

const chartFont = 'font-family="system-ui,sans-serif"';
const describe = (data, label, fmt) => `${label} by group. ` + data.slice(0, 30).map(r => `${r.name}: ${fmt(r.value)}${r.goal ? ` of ${fmt(r.goal)} goal` : ''}`).join('; ');
const scale = data => { const min = Math.min(0, ...data.map(r => r.suppressed ? 0 : r.value)), max = Math.max(0, ...data.map(r => Math.max(r.suppressed ? 0 : r.value, r.goal || 0))); return { min, span: max - min || 1 }; };

/* Narrow screens: label above each bar, drawn at the container's real width so text stays readable on phones.
 * The downloadable SVG always uses the full-width layout. */
function chartCompact(data, label, color, fmt, width) {
  const w = Math.max(280, Math.round(width)), goals = data.some(r => r.goal), row = 60, base = 8 + data.length * row, h = Math.max(90, base + (goals ? 34 : 10));
  if (!data.length) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 60" role="img" aria-label="No valid data" class="chart-svg"><text x="0" y="36" fill="#56635c" ${chartFont} font-size="15">No valid data to display</text></svg>`;
  const { min, span } = scale(data), at = v => (v - min) / span * w, zero = at(0);
  let out = data.map((r, i) => {
    const y = 8 + i * row, valueText = r.goal ? `${fmt(r.value)} / ${fmt(r.goal)}` : fmt(r.value);
    const room = Math.max(8, Math.floor((w - valueText.length * 9 - 16) / 8)), short = r.name.length > room ? r.name.slice(0, room - 1) + '…' : r.name, end = r.suppressed ? zero : at(r.value);
    return `<text x="0" y="${y + 16}" fill="#34483c" ${chartFont} font-size="15"><title>${esc(r.name)}</title>${esc(short)}</text>`
      + `<text x="${w}" y="${y + 16}" text-anchor="end" fill="#26332c" ${chartFont} font-size="15" font-weight="700">${esc(valueText)}</text>`
      + `<rect x="0" y="${y + 26}" width="${w}" height="18" rx="3" fill="#f0f3ee"/><rect x="${Math.min(zero, end)}" y="${y + 26}" width="${Math.abs(end - zero)}" height="18" rx="3" fill="${color}"/>`
      + (r.goal ? `<rect x="${Math.min(w - 3, Math.max(0, at(r.goal) - 1.5))}" y="${y + 21}" width="3" height="28" fill="#26332c" stroke="#ffffff" stroke-width="1.5"/>` : '');
  }).join('');
  if (goals) out += `<rect x="0" y="${base + 8}" width="3" height="16" fill="#26332c"/><text x="10" y="${base + 21}" fill="#56635c" ${chartFont} font-size="13">Goal · figures shown as value / goal</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${esc(describe(data, label, fmt))}" class="chart-svg"><title>${esc(label)} by group</title>${out}</svg>`;
}

function chart(data, label, color, fmt = pretty) {
  const goals = data.some(r => r.goal), w = 870, left = 240, right = goals ? 175 : 100, plot = w - left - right, base = 24 + data.length * 55, h = Math.max(130, base + (goals ? 62 : 36));
  const { min, span } = scale(data), at = v => left + (v - min) / span * plot, zero = at(0);
  let bars = data.map((r, i) => {
    const y = 24 + i * 55, end = r.suppressed ? zero : at(r.value), short = r.name.length > 29 ? r.name.slice(0, 28) + '…' : r.name, valueText = r.goal ? `${fmt(r.value)} / ${fmt(r.goal)}` : fmt(r.value);
    return `<text x="${left - 16}" y="${y + 23}" text-anchor="end" fill="#34483c" ${chartFont} font-size="16"><title>${esc(r.name)}</title>${esc(short)}</text>`
      + `<rect x="${left}" y="${y + 3}" width="${plot}" height="30" rx="3" fill="#f0f3ee"/><rect x="${Math.min(zero, end)}" y="${y + 3}" width="${Math.abs(end - zero)}" height="30" rx="3" fill="${color}"/>`
      + (r.goal ? `<rect x="${at(r.goal) - 1.5}" y="${y - 3}" width="3" height="42" fill="#26332c" stroke="#ffffff" stroke-width="1.5"><title>Goal: ${esc(fmt(r.goal))}</title></rect>` : '')
      + `<text x="${left + plot + 14}" y="${y + 23}" fill="#26332c" ${chartFont} font-size="16" font-weight="700">${esc(valueText)}</text>`;
  }).join('');
  if (data.length) {
    bars += `<line x1="${zero}" y1="18" x2="${zero}" y2="${base + 14}" stroke="#9eaea2"/>`;
    if (goals) bars += `<rect x="${left}" y="${base + 28}" width="3" height="18" fill="#26332c"/><text x="${left + 12}" y="${base + 42}" fill="#56635c" ${chartFont} font-size="14">Goal</text><text x="${left + plot + 14}" y="${base + 42}" fill="#56635c" ${chartFont} font-size="14">value / goal</text>`;
  } else bars = `<text x="30" y="72" fill="#56635c" ${chartFont} font-size="18">No valid data to display</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(describe(data, label, fmt))}" class="chart-svg"><title>${esc(label)} by group</title>${bars}</svg>`;
}

/* ───────────────────────── 7. Exports ───────────────────────── */

/* Hosted on claude.ai, the page asks the viewer to confirm each save through the downloads capability.
 * Anywhere else (a local server, a static host) it uses a normal browser download. Returns true when saved. */
const hosted = !!(window.claude && window.claude.use);
const use = name => hosted ? Promise.resolve(window.claude.use(name)).catch(() => null) : Promise.resolve(null);
const saver = use('downloads');
async function download(content, name, type) {
  const dl = await saver;
  if (dl) {
    try { await dl.save({ filename: name, data: content instanceof Blob || content instanceof Uint8Array ? content : String(content) }); return true; }
    catch (e) { toast({ declined: 'Save cancelled.', rate_limited: 'A save prompt is already open.', too_large: 'This file is too large to save here.' }[e && e.code] || 'This file could not be saved here.'); return false; }
  }
  const blob = content instanceof Blob ? content : new Blob([content], { type }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
const slug = () => ($('reporttitle').value || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'report';
function csvCell(s) { s = String(s ?? ''); if (/^[=+@\-]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

function imageFrom(src) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('The image could not be read. Try a PNG or JPG.')); img.src = src; }); }

/* Canvas-backed PDFs keep the chosen system fonts and any language's text.
 * Each page is drawn at 3x resolution; text in the PDF is not selectable. */
async function exportPDF() {
  if (state.shown.length > 200 && $('showChart').checked) throw Error('For PDF reports, choose up to 200 chart groups or hide the chart. The CSV includes all groups.');
  const { PDFDocument } = PDFLib, pdf = await PDFDocument.create(), b = getBrand(), r = state.report, fmt = state.fmt || pretty;
  const W = 612, H = 792, M = 38, CW = W - M * 2, bottom = 744, pages = [], face = fonts[b.font];
  let canvas, ctx, y, pageNo = 0;
  const setFont = (size = 11, bold = false) => { ctx.font = `${bold ? 'bold ' : ''}${size}px ${face}`; ctx.fillStyle = '#26332c'; ctx.textBaseline = 'top'; };
  function wrapped(text, width, size = 11, bold = false) {
    setFont(size, bold);
    const result = [];
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (ctx.measureText((line ? line + ' ' : '') + word).width <= width) { line += (line ? ' ' : '') + word; continue; }
        if (line) { result.push(line); line = ''; }
        if (ctx.measureText(word).width <= width) { line = word; continue; }
        for (const c of word) { if (ctx.measureText(line + c).width > width && line) { result.push(line); line = ''; } line += c; }
      }
      result.push(line);
    }
    return result;
  }
  function newPage(first = false) {
    if (canvas) pages.push(canvas);
    canvas = document.createElement('canvas'); canvas.width = W * 3; canvas.height = H * 3;
    ctx = canvas.getContext('2d'); ctx.scale(3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    pageNo++; y = M;
    setFont(9); ctx.fillStyle = '#647067';
    ctx.fillText(`${state.sample ? 'Illustrative sample data · ' : ''}${$('whiteLabel').checked ? '' : 'TrueReach · '}Page ${pageNo}`, M, H - 28);
    if (!first) { setFont(10, true); ctx.fillStyle = reportInk(b.primary); ctx.fillText(r.org, M, y); y += 18; ctx.fillStyle = '#e0e6df'; ctx.fillRect(M, y, CW, 1); y += 22; }
  }
  const ensure = h => { if (y + h > bottom) newPage(); };
  function textBlock(text, { size = 11, bold = false, color = '#26332c', gap = 12, width = CW, x = M, lineHeight = size * 1.55 } = {}) {
    for (const line of wrapped(text, width, size, bold)) { ensure(lineHeight); setFont(size, bold); ctx.fillStyle = color; ctx.fillText(line, x, y); y += lineHeight; }
    y += gap;
  }
  const heading = text => { ensure(55); y += 8; textBlock(text, { size: 14, bold: true, color: reportInk(b.primary), gap: 13 }); };

  newPage(true);
  const bold = b.style === 'bold', headerText = bold ? inkFor(b.primary) : reportInk(b.primary);
  const logo = b.logo ? await imageFrom(b.logo) : null;
  const lines = (t, s, w = false) => t ? wrapped(t, CW, s, w).length : 0;
  const headerHeight = 30 + (logo ? 60 : 0) + 22 + lines(r.title, 25, true) * 31 + lines(`${r.org} · Prepared ${r.prepared}`, 11) * 17 + lines(r.period, 11) * 17 + lines(r.funder && 'Prepared for ' + r.funder, 11) * 17;
  if (bold) { ctx.fillStyle = b.primary; ctx.fillRect(0, 0, W, headerHeight + M); ctx.fillStyle = b.accent; ctx.fillRect(0, 0, W, 7); }
  else if (b.style !== 'minimal') { ctx.fillStyle = b.primary; ctx.fillRect(0, 0, W, 7); }
  if (logo) { const s = Math.min(140 / logo.width, 48 / logo.height); ctx.drawImage(logo, M, y, logo.width * s, logo.height * s); y += 60; }
  textBlock($('docid').textContent, { size: 9, bold: true, color: headerText, gap: 14 });
  textBlock(r.title, { size: 25, bold: true, color: headerText, gap: 12, lineHeight: 31 });
  textBlock(`${r.org} · Prepared ${r.prepared}`, { size: 11, color: headerText, gap: 4, lineHeight: 17 });
  if (r.period) textBlock(r.period, { size: 11, color: headerText, gap: 4, lineHeight: 17 });
  if (r.funder) textBlock('Prepared for ' + r.funder, { size: 11, color: headerText, gap: 4, lineHeight: 17 });
  y = bold ? Math.max(y + 20, headerHeight + M + 22) : y + 24;
  if (state.sample) textBlock(pack().sample.note, { size: 10, color: '#6a6146', gap: 20 });

  if ($('showMetrics').checked) {
    ensure(165);
    const width = (CW - 14) / 2;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const item = r.metrics[row * 2 + col], x = M + col * (width + 14);
        if (!item) continue;
        ctx.fillStyle = b.style === 'minimal' ? '#fff' : '#f4f6f1'; ctx.fillRect(x, y, width, 72);
        ctx.fillStyle = b.accent; ctx.fillRect(x, y, width, 3);
        setFont(22, true); ctx.fillStyle = reportInk(b.primary);
        let size = 22;
        while (ctx.measureText(item.value).width > width - 20 && size > 12) setFont(--size, true);
        ctx.fillStyle = reportInk(b.primary); ctx.fillText(item.value, x + 12, y + 13);
        if (item.progress != null) { ctx.fillStyle = '#e1e6de'; ctx.fillRect(x + 12, y + 39, width - 24, 4); ctx.fillStyle = b.primary; ctx.fillRect(x + 12, y + 39, (width - 24) * Math.max(0, Math.min(1, item.progress)), 4); }
        setFont(10); ctx.fillStyle = '#56635c'; ctx.fillText(item.label, x + 12, y + 46);
      }
      y += 84;
    }
    y += 8;
  }
  if ($('showChart').checked) {
    heading($('charttitle').textContent);
    textBlock($('chartsub').textContent + ` · ${state.shown.length} of ${state.summary.length} groups`, { size: 10, color: '#56635c', gap: 15 });
    if (!state.shown.length) textBlock('No valid data to display.');
    const goals = state.shown.some(s => s.goal), { min, span } = scale(state.shown), z = (-min / span) * CW;
    if (goals && state.shown.length) { ctx.fillStyle = '#26332c'; ctx.fillRect(M, y - 12, 2, 12); setFont(9); ctx.fillStyle = '#56635c'; ctx.fillText('Goal marker  ·  figures shown as value / goal', M + 8, y - 11); y += 8; }
    for (const row of state.shown) {
      const nameLines = wrapped(row.name, CW - (goals ? 140 : 105), 11);
      ensure(nameLines.length * 16 + 39);
      nameLines.forEach((line, i) => { setFont(11); ctx.fillText(line, M, y + i * 16); });
      setFont(11, true); ctx.textAlign = 'right'; ctx.fillText(row.goal ? `${fmt(row.value)} / ${fmt(row.goal)}` : fmt(row.value), W - M, y); ctx.textAlign = 'left';
      y += nameLines.length * 16 + 7;
      ctx.fillStyle = '#edf1ea'; ctx.fillRect(M, y, CW, 14);
      const end = row.suppressed ? z : (row.value - min) / span * CW;
      ctx.fillStyle = b.primary; ctx.fillRect(M + Math.min(z, end), y, Math.abs(end - z), 14);
      ctx.fillStyle = '#718578'; ctx.fillRect(M + z, y, 1, 14);
      if (row.goal) { const gx = M + (row.goal - min) / span * CW; ctx.fillStyle = '#ffffff'; ctx.fillRect(gx - 2.5, y - 4, 5, 22); ctx.fillStyle = '#26332c'; ctx.fillRect(gx - 1, y - 3, 2, 20); }
      y += 31;
    }
    y += 8;
  }
  if ($('showBreakdowns').checked && r.breakdowns?.length) {
    ensure(150);
    heading(r.whoTitle);
    for (const bd of r.breakdowns) {
      ensure(40 + Math.min(bd.rows.length, 4) * 19);
      setFont(11, true); ctx.fillText(bd.column, M, y); y += 20;
      const countX = W - M - 70, shareX = W - M;
      setFont(9, true); ctx.fillStyle = '#56635c'; ctx.textAlign = 'right'; ctx.fillText(bd.unit, countX, y); ctx.fillText('Share', shareX, y); ctx.textAlign = 'left';
      y += 14; ctx.fillStyle = '#d9ded6'; ctx.fillRect(M, y, CW, 1); y += 6;
      for (const row of [...bd.rows, { name: 'Total', shown: bd.total, share: '100%', total: true }]) {
        const nameLines = wrapped(row.name, CW - 170, 10, !!row.total);
        ensure(nameLines.length * 14 + 9);
        const ink = row.muted ? '#7a857d' : '#26332c';
        nameLines.forEach((line, i) => { setFont(10, !!row.total); ctx.fillStyle = ink; ctx.fillText(line, M, y + i * 14); });
        setFont(10, !!row.total); ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.fillText(row.shown, countX, y); ctx.fillText(row.share, shareX, y); ctx.textAlign = 'left';
        y += nameLines.length * 14 + 4; ctx.fillStyle = '#eceee9'; ctx.fillRect(M, y, CW, 1); y += 5;
      }
      if (bd.note) { setFont(9); ctx.fillStyle = '#56635c'; ctx.fillText(bd.note, M, y); y += 14; }
      y += 12;
    }
  }
  if ($('showFindings').checked) { heading('What the data says'); for (const t of state.insights) textBlock('• ' + t, { size: 11, gap: 10 }); }
  if ($('showContext').checked && r.narrative) { heading($('contextTitle').textContent); textBlock(r.narrative, { size: 11, gap: 16 }); }
  if ($('showMethod').checked) { heading('Source and method'); textBlock(r.method, { size: 9, color: '#56635c', gap: 0 }); }
  if (canvas) pages.push(canvas);
  for (const c of pages) { const png = await pdf.embedPng(c.toDataURL('image/png')); const page = pdf.addPage([W, H]); page.drawImage(png, { x: 0, y: 0, width: W, height: H }); c.width = 1; c.height = 1; }
  pdf.setTitle(r.title); pdf.setAuthor(r.org); pdf.setSubject(r.period || 'Report'); pdf.setCreator(r.org);
  const saved = await download(await pdf.save(), slug() + '.pdf', 'application/pdf');
  return { pages: pages.length, saved };
}

/* ───────────────────────── 8. Brand kits and templates ───────────────────────── */

/* Saved items from before the rename (quickbrief-*) are picked up once and kept under the new key. */
function storageRead(key) { try { const v = JSON.parse(localStorage.getItem(key) || localStorage.getItem(key.replace('truereach-', 'quickbrief-')) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function saveLocal(key, items) { try { localStorage.setItem(key, JSON.stringify(items)); return true; } catch { toast('Could not save on this browser. Storage may be full or unavailable.'); return false; } }
function listSaved(kind) {
  const isKit = kind === 'kit', select = $(isKit ? 'savedKits' : 'savedTemplates');
  select.replaceChildren(new Option(isKit ? 'Choose a brand kit' : 'Choose a template', ''));
  state[isKit ? 'kit' : 'templates'].forEach(i => select.add(new Option(i.name, i.id)));
}
function brandApply(b) {
  if (!b || !/^#[a-f\d]{6}$/i.test(b.primary) || !/^#[a-f\d]{6}$/i.test(b.accent) || !fonts[b.font] || !['classic', 'bold', 'minimal'].includes(b.style)) throw Error('Invalid saved brand kit.');
  $('org').value = String(b.org || '').slice(0, 80);
  $('primaryColor').value = $('primaryHex').value = b.primary; $('accentColor').value = $('accentHex').value = b.accent;
  $('font').value = b.font; $('style').value = b.style;
  state.logo = typeof b.logo === 'string' && b.logo.startsWith('data:image/png;base64,') ? b.logo : '';
}
const configIds = ['pack', 'reporttitle', 'period', 'funder', 'narrative', 'preset', 'metric', 'metriclabel', 'limit', 'sort', 'category', 'value', 'sizeCol', 'break1', 'break2', 'suppress', 'showBreakdowns', 'timecol', 'across', 'mergeNames', 'filterCol', 'filterVal', 'goal', 'groupGoals', 'showMetrics', 'showChart', 'showFindings', 'showContext', 'showMethod', 'whiteLabel'];
function getConfig() { return Object.fromEntries(configIds.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value])); }
function applyConfig(c) {
  if (c.pack && PACKS[c.pack] && c.pack !== state.pack) applyPack(c.pack, { reloadSample: false });
  for (const id of configIds) {
    if (!(id in c) || id === 'pack') continue;
    const el = $(id);
    if (el.type === 'checkbox') { if (typeof c[id] === 'boolean') el.checked = c[id]; }
    else if (el.tagName === 'SELECT') { if (id === 'value') fillValueOptions(); if ([...el.options].some(o => o.value === c[id])) el.value = c[id]; if (id === 'filterCol') fillFilterValues(); }
    else el.value = String(c[id]).slice(0, el.maxLength > 0 ? el.maxLength : 4000);
  }
  state.autoLabel = '';
}
function saveItem(kind) {
  const kit = kind === 'kit', name = $(kit ? 'kitName' : 'templateName').value.trim() || $('org').value.trim();
  if (!name) { toast('Give your saved item a name.'); return; }
  const key = kit ? 'truereach-brand-kits-v1' : 'truereach-report-templates-v1', items = state[kit ? 'kit' : 'templates'], existing = items.find(i => i.name === name);
  const item = { id: existing?.id || crypto.randomUUID(), name, brand: getBrand(), ...(kit ? {} : { config: getConfig() }) };
  const updated = existing ? items.map(i => i.id === existing.id ? item : i) : [...items, item];
  if (updated.length > 20) { toast('This prototype supports 20 saved items. Delete an unused item first.'); return; }
  if (saveLocal(key, updated)) { state[kit ? 'kit' : 'templates'] = updated; listSaved(kind); $(kit ? 'savedKits' : 'savedTemplates').value = item.id; toast(`${kit ? 'Brand kit' : 'Template'} saved on this device.`); }
}
function applyItem(kind) {
  const kit = kind === 'kit', id = $(kit ? 'savedKits' : 'savedTemplates').value, item = state[kit ? 'kit' : 'templates'].find(i => i.id === id);
  if (!item) { toast('Choose a saved item first.'); return; }
  try { brandApply(item.brand); if (!kit) applyConfig(item.config); render(); toast(`${kit ? 'Brand kit' : 'Template'} applied.`); } catch (e) { toast(e.message); }
}
function deleteItem(kind) {
  const kit = kind === 'kit', id = $(kit ? 'savedKits' : 'savedTemplates').value;
  if (!id) { toast('Choose a saved item first.'); return; }
  const key = kit ? 'truereach-brand-kits-v1' : 'truereach-report-templates-v1', updated = state[kit ? 'kit' : 'templates'].filter(i => i.id !== id);
  if (saveLocal(key, updated)) { state[kit ? 'kit' : 'templates'] = updated; listSaved(kind); toast('Saved item deleted.'); }
}
async function uploadLogo(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) throw Error('Choose a logo smaller than 2 MB.');
  let url;
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    const text = await file.text(), doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw Error('The SVG is invalid.');
    if (doc.querySelector('script,foreignObject,iframe,image,use,style,animate,animateTransform,set') || /\bon\w+\s*=|(?:href|src)\s*=|url\s*\(|<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('Use a plain SVG without linked assets, styles or interactive content, or upload a PNG.');
    url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  } else if (['image/png', 'image/jpeg'].includes(file.type) || /\.(png|jpe?g)$/i.test(file.name)) url = URL.createObjectURL(file);
  else throw Error('Choose a PNG, JPG or SVG.');
  try {
    const img = await imageFrom(url);
    if (!img.width || !img.height || img.width * img.height > 25000000) throw Error('The logo dimensions are too large.');
    const s = Math.min(1, 600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    state.logo = c.toDataURL('image/png'); render(); toast('Logo added to your report.');
  } finally { URL.revokeObjectURL(url); }
}

/* ───────────────────────── 9. Feedback ───────────────────────── */

/* On the hosted page, each tester's answers are saved to feedback/<their id>, readable only by the owner.
 * Testers need Contributor access or above to save; otherwise the form offers the text to copy instead. */
const feedbackStore = hosted ? Promise.all([use('db'), use('user')]).then(async ([db, user]) => { if (!db || !user) return null; const id = await user.id(); return id ? { db, id } : null; }).catch(() => null) : Promise.resolve(null);

function feedbackEntry() {
  const picked = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  return {
    at: new Date().toISOString(), useful: Number(picked('fbUseful')) || null, wouldSend: picked('fbSend'),
    stuck: $('fbStuck').value.trim(), useFor: $('fbUse').value.trim(), name: $('fbName').value.trim(),
    pack: state.pack, measure: $('metric').value, usedSample: state.sample, rows: state.rows.length,
  };
}
function feedbackText(e) {
  return [`TrueReach feedback${e.name ? ' from ' + e.name : ''}`, `Useful (1–5): ${e.useful ?? 'not answered'}`, `Would send the report: ${e.wouldSend || 'not answered'}`,
    `Stuck or wrong: ${e.stuck || '—'}`, `Would use it for: ${e.useFor || '—'}`, `Tried: ${PACKS[e.pack].name}, ${e.usedSample ? 'sample data' : `own data (${e.rows} rows)`}`].join('\n');
}
async function sendFeedback(event) {
  event.preventDefault();
  const entry = feedbackEntry();
  if (!entry.useful && !entry.wouldSend && !entry.stuck && !entry.useFor) { $('fbResult').textContent = 'Answer at least one question before sending.'; return; }
  $('fbSubmit').disabled = true; $('fbResult').textContent = 'Sending…';
  const store = await feedbackStore;
  if (store) {
    try {
      const ref = store.db.doc('feedback/' + store.id), snap = await ref.get().catch(() => null);
      const entries = snap && snap.exists && Array.isArray(snap.data().entries) ? [...snap.data().entries] : [];
      entries.push(entry);
      await ref.set({ updatedAt: entry.at, entries: entries.slice(-20) });
      $('fbResult').textContent = 'Thank you. Your feedback was sent.'; $('fbCopyBox').hidden = true; $('fbSubmit').disabled = false;
      $('feedbackForm').reset();
      return;
    } catch { /* fall through to copy */ }
  }
  $('fbResult').textContent = '';
  $('fbCopyText').value = feedbackText(entry); $('fbCopyBox').hidden = false; $('fbSubmit').disabled = false;
}

/* ───────────────────────── 10. Wiring and start-up ───────────────────────── */

function fillFilterValues() {
  const col = $('filterCol').value, select = $('filterVal'), old = select.value;
  select.replaceChildren(); select.disabled = !col;
  if (!col) return;
  const counts = new Map();
  for (const r of state.rows) { const v = String(r[col] ?? '').trim(); counts.set(v, (counts.get(v) || 0) + 1); }
  [...counts].sort((a, b) => b[1] - a[1]).slice(0, 200).forEach(([v, n]) => select.add(new Option(`${v || '(blank)'} (${pretty(n)})`, v)));
  if ([...select.options].some(o => o.value === old)) select.value = old;
}

/* New data: pick sensible columns. People are counted by ID whenever the file has an ID column. */
/* The "Identify by" / "Value column" list: in Unique people mode, ID columns and name matches come first. */
function fillValueOptions() {
  const el = $('value'), old = el.value, unique = $('metric').value === 'unique';
  el.replaceChildren();
  if (unique) {
    const ids = state.cols.filter(isPersonId);
    if (ids.length) { const g = document.createElement('optgroup'); g.label = 'ID columns'; ids.forEach(c => g.append(new Option(c, c))); el.append(g); }
    if (state.matches.length) { const g = document.createElement('optgroup'); g.label = 'No ID? Match by name'; state.matches.forEach(m => g.append(new Option(matchLabel(m), m))); el.append(g); }
    const g = document.createElement('optgroup'); g.label = 'Other columns'; state.cols.filter(c => !ids.includes(c)).forEach(c => g.append(new Option(c, c))); el.append(g);
  } else state.cols.forEach(c => el.add(new Option(c, c)));
  if ([...el.options].some(o => o.value === old)) el.value = old;
  else if (unique) el.value = state.cols.find(isPersonId) || state.matches[0] || state.cols[0];
  else el.value = state.detected?.value || state.cols.find(c => Number.isFinite(num(state.rows[0]?.[c]))) || state.cols[1] || state.cols[0];
}

/* New data: pick sensible columns. People are counted once by ID, or matched by name, whenever the file allows. */
function fillSelects() {
  const p = pack(), d = detectColumns(state.cols, state.rows, p);
  state.detected = d; state.matches = d.matches;
  for (const id of ['category', 'timecol', 'filterCol', 'sizeCol', 'break1', 'break2']) {
    const el = $(id); el.replaceChildren();
    if (id === 'timecol' || id === 'sizeCol' || id === 'break1' || id === 'break2') el.add(new Option('None', ''));
    if (id === 'filterCol') el.add(new Option('All rows', ''));
    state.cols.forEach(c => el.add(new Option(c, c)));
  }
  $('category').value = d.category; $('timecol').value = d.time; $('filterCol').value = ''; fillFilterValues();
  $('sizeCol').value = d.size; $('break1').value = d.breakdowns[0] || ''; $('break2').value = d.breakdowns[1] || '';
  $('metric').value = d.id || d.matches.length ? 'unique' : d.value ? 'sum' : 'count';
  $('value').replaceChildren(); fillValueOptions();
  if (d.id) $('value').value = d.id; else if (d.matches.length) $('value').value = d.matches[0];
  $('metriclabel').value = ''; state.autoLabel = ''; refreshLabel();
  acrossDefault();
}
/* People counts usually should not be added across periods; hours, meals and dollars usually should. */
function acrossDefault() { $('across').value = $('timecol').value && PEOPLE_RE.test($('value').value) ? 'avg' : 'sum'; }

function loadTable(table, source, sample = false) {
  Object.assign(state, table, { source, sample });
  fillSelects();
  $('fileinfo').textContent = `${source} · ${table.rows.length.toLocaleString()} rows · ${table.cols.length} columns`;
  warn(''); render();
}
function load(text, source, sample = false) {
  try { state.sheets = null; $('sheetField').hidden = true; loadTable(toTable(parseDelimited(text)), source, sample); toast('Data loaded. Report updated.'); return { rows: state.rows.length, columns: state.cols.length }; }
  catch (e) { warn(e.message); toast('Could not load data.'); return { error: e.message }; }
}
function loadSheet(index, fileName) {
  const sheet = state.sheets[index];
  loadTable(toTable(sheet.matrix), state.sheets.length > 1 ? `${fileName} · ${sheet.name}` : fileName);
}
function loadSample() {
  const p = pack();
  load(p.sample.build(), p.sample.source, true);
  if (p.sample.filter) { $('filterCol').value = p.sample.filter[0]; fillFilterValues(); $('filterVal').value = p.sample.filter[1]; refreshLabel(); render(); }
  render();
}
async function loadFile(f) {
  if (!f) return;
  try {
    if (/\.xls$/i.test(f.name)) throw Error('Older .xls files are not supported. In Excel, save the file as an Excel Workbook (.xlsx) or CSV.');
    if (/\.xlsx$/i.test(f.name) || f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      if (f.size > 15 * 1024 * 1024) throw Error('Please use a workbook smaller than 15 MB.');
      const sheets = await readXlsx(await f.arrayBuffer());
      state.sheets = sheets; state.sheetFile = f.name;
      const first = Math.max(0, sheets.findIndex(s => s.matrix.length >= 2));
      $('sheet').replaceChildren(...sheets.map((s, i) => new Option(`${s.name} (${Math.max(0, s.matrix.length - 1)} rows)`, String(i))));
      $('sheet').value = String(first); $('sheetField').hidden = sheets.length < 2;
      loadSheet(first, f.name); toast('Workbook loaded. Report updated.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) throw Error('Please use a file smaller than 5 MB.');
    load(await f.text(), f.name);
  } catch (e) { warn(e.message); toast('Could not load that file.'); }
}

function applyPack(id, { reloadSample = state.sample } = {}) {
  const old = pack(), p = PACKS[id] || PACKS[DEFAULT_PACK];
  state.pack = PACKS[id] ? id : DEFAULT_PACK; $('pack').value = state.pack;
  $('suppress').value = String(p.suppress || 0);
  $('preset').replaceChildren(...Object.entries(p.formats).map(([k, f]) => new Option(f.label, k)));
  const first = Object.values(p.formats)[0];
  /* Replace a field only while it still holds some pack's default; anything the person typed stays. */
  const defaults = key => Object.values(PACKS).flatMap(x => key === 'title' ? Object.values(x.formats).map(f => f.title) : [x[key]]);
  if (!$('reporttitle').value || defaults('title').includes($('reporttitle').value)) $('reporttitle').value = first.title;
  if (!$('org').value || defaults('org').includes($('org').value)) $('org').value = p.org;
  if (!$('period').value || defaults('period').includes($('period').value)) $('period').value = p.period;
  $('funder').placeholder = p.recipientHint; $('narrative').placeholder = p.contextHint;
  $('fbSendLegend').textContent = `Would you send the report it made to ${p.sendTo} as is?`;
  if (reloadSample) loadSample(); else render();
}

function selectTab(key) { ['data', 'brand', 'report'].forEach(k => { const active = k === key; $('tab-' + k).setAttribute('aria-selected', String(active)); $('tab-' + k).tabIndex = active ? 0 : -1; $('pane-' + k).hidden = !active; }); }
['data', 'brand', 'report'].forEach((k, i) => {
  $('tab-' + k).onclick = () => selectTab(k);
  $('tab-' + k).onkeydown = e => {
    const n = { ArrowRight: (i + 1) % 3, ArrowLeft: (i + 2) % 3, Home: 0, End: 2 }[e.key];
    if (n !== undefined) { e.preventDefault(); const next = ['data', 'brand', 'report'][n]; selectTab(next); $('tab-' + next).focus(); }
  };
});

$('pack').replaceChildren(...Object.entries(PACKS).filter(([, p]) => !p.hidden).map(([k, p]) => new Option(p.name, k)));
$('pack').onchange = () => applyPack($('pack').value);
$('file').onchange = e => { loadFile(e.target.files[0]); e.target.value = ''; };
$('demo').onclick = loadSample;
$('sheet').onchange = () => { try { loadSheet(Number($('sheet').value), state.sheetFile); } catch (e) { warn(e.message); } };
$('pasteToggle').onclick = () => { const open = $('pastebox').classList.toggle('open'); $('pasteToggle').setAttribute('aria-expanded', String(open)); };
$('usePaste').onclick = () => load($('pastearea').value, 'Pasted spreadsheet');
const drop = $('drop');
['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

$('metric').addEventListener('change', () => {
  fillValueOptions(); refreshLabel(); acrossDefault();
});
$('value').addEventListener('change', () => { refreshLabel(); if ($('timecol').value) acrossDefault(); });
$('timecol').addEventListener('change', acrossDefault);
$('filterCol').addEventListener('change', fillFilterValues);
['category', 'value', 'metric', 'timecol', 'across', 'mergeNames', 'filterCol', 'filterVal', 'sizeCol', 'break1', 'break2', 'suppress', 'showBreakdowns', 'goal', 'groupGoals', 'limit', 'sort', 'metriclabel', 'reporttitle', 'org', 'period', 'funder', 'narrative', 'preset', 'font', 'style', 'showMetrics', 'showChart', 'showFindings', 'showContext', 'showMethod', 'whiteLabel']
  .forEach(id => $(id).addEventListener(['INPUT', 'TEXTAREA'].includes($(id).tagName) && $(id).type !== 'checkbox' ? 'input' : 'change', render));
['primary', 'accent'].forEach(k => {
  $(k + 'Color').oninput = e => { $(k + 'Hex').value = e.target.value; render(); };
  $(k + 'Hex').oninput = e => { const ok = /^#[a-f\d]{6}$/i.test(e.target.value); e.target.setCustomValidity(ok ? '' : 'Use a six-digit color such as #183d31.'); if (ok) { $(k + 'Color').value = e.target.value; render(); } };
  $(k + 'Hex').onblur = e => { if (!/^#[a-f\d]{6}$/i.test(e.target.value)) { e.target.value = $(k + 'Color').value; e.target.setCustomValidity(''); } };
});
document.querySelectorAll('[data-colors]').forEach(el => el.onclick = () => { const [p, a] = el.dataset.colors.split(','); $('primaryColor').value = $('primaryHex').value = p; $('accentColor').value = $('accentHex').value = a; render(); });
$('logo').onchange = async e => { try { await uploadLogo(e.target.files[0]); } catch (err) { toast(err.message); } finally { e.target.value = ''; } };
$('removeLogo').onclick = () => { state.logo = ''; render(); };
$('saveKit').onclick = () => saveItem('kit'); $('loadKit').onclick = () => applyItem('kit'); $('deleteKit').onclick = () => deleteItem('kit');
$('saveTemplate').onclick = () => saveItem('template'); $('loadTemplate').onclick = () => applyItem('template'); $('deleteTemplate').onclick = () => deleteItem('template');
$('preset').addEventListener('change', () => {
  const f = pack().formats[$('preset').value];
  if (f) $('reporttitle').value = f.title;
  ['showMetrics', 'showChart', 'showFindings', 'showContext', 'showMethod'].forEach(id => $(id).checked = true);
  render();
});

$('copy').onclick = async () => { try { await navigator.clipboard.writeText(state.insights.join('\n\n')); toast('Findings copied.'); } catch { toast('Clipboard unavailable. Select the findings in the report to copy them.'); } };
$('csv').onclick = async () => {
  const g = state.summary.some(r => r.goal);
  const lines = [[csvCell($('category').value), csvCell(state.report.label), ...(g ? ['Goal', 'Percent of goal'] : [])].join(','),
    ...state.summary.map(r => [csvCell(r.name), r.suppressed ? csvCell(state.fmt(r.value)) : Math.round(r.value * 100) / 100, ...(g ? [r.goal ?? '', r.goal && !r.suppressed ? Math.round(r.value / r.goal * 1000) / 10 : ''] : [])].join(','))];
  for (const bd of state.report.breakdowns || []) {
    lines.push('', [csvCell(bd.column), csvCell(bd.unit), 'Share'].join(','));
    for (const row of bd.rows) lines.push([csvCell(row.name), csvCell(row.shown), csvCell(row.share)].join(','));
    lines.push(['Total', csvCell(bd.total), '100%'].join(','));
    if (bd.note) lines.push(csvCell(bd.note));
  }
  if (await download('﻿' + lines.join('\r\n'), slug() + '-summary.csv', 'text/csv;charset=utf-8')) toast('Summary CSV downloaded.');
};
$('svg').onclick = async () => { if (await download(state.chartSvg, slug() + '-chart.svg', 'image/svg+xml')) toast('Chart SVG downloaded.'); };
$('print').onclick = () => window.print();
if (hosted) $('print').hidden = true;
$('htmlExport').onclick = async () => {
  try {
    const response = await fetch('styles.css');
    if (!response.ok) throw Error('Styles unavailable.');
    const css = await response.text(), body = $('report').outerHTML;
    const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.report.title)}</title><style>${css}\nbody{background:white;padding:24px}.report{max-width:950px;margin:auto}.reportinner{padding:0}</style></head><body>${body}</body></html>`;
    if (await download(page, slug() + '.html', 'text/html;charset=utf-8')) toast('Standalone report downloaded.');
  } catch { toast('Could not export HTML. Try PDF instead.'); }
};
$('pdf').onclick = async () => {
  const btn = $('pdf'); btn.disabled = true; btn.textContent = 'Preparing PDF…';
  try { const result = await exportPDF(); if (result.saved) toast(`Report downloaded · ${result.pages} page${result.pages === 1 ? '' : 's'}.`); }
  catch (e) { toast(e.message || (hosted ? 'Could not create a PDF. Try Report HTML instead.' : 'Could not create a PDF. Use Print report as a fallback.')); }
  finally { btn.disabled = false; btn.textContent = 'Download PDF'; }
};

let sourceFile = 'app.js', sourceText = '';
async function showCode(file) {
  try { const res = await fetch(file); if (!res.ok) throw Error(); sourceText = await res.text(); sourceFile = file; $('codeout').textContent = sourceText; }
  catch { $('codeout').textContent = 'Could not load source. Try again while online.'; sourceText = ''; }
}
$('source').onclick = () => { $('sourceDialog').showModal(); showCode('app.js'); };
$('closeSource').onclick = () => $('sourceDialog').close();
document.querySelectorAll('[data-code]').forEach(el => el.onclick = () => showCode(el.dataset.code));
$('downloadCode').onclick = async () => {
  if (!sourceText) return;
  const name = sourceFile.split('/').pop();
  if (await download(sourceText, hosted && !/\.html$/.test(name) ? name + '.txt' : name, 'text/plain;charset=utf-8')) toast('Source file downloaded.');
};

$('feedbackBtn').onclick = () => { $('fbResult').textContent = ''; $('fbCopyBox').hidden = true; $('feedbackDialog').showModal(); };
$('closeFeedback').onclick = () => $('feedbackDialog').close();
$('feedbackForm').addEventListener('submit', sendFeedback);
$('fbCopy').onclick = async () => {
  try { await navigator.clipboard.writeText($('fbCopyText').value); toast('Feedback copied.'); }
  catch { $('fbCopyText').select(); toast('Press Ctrl+C or ⌘C to copy.'); }
};

let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });

state.kit = storageRead('truereach-brand-kits-v1'); state.templates = storageRead('truereach-report-templates-v1');
listSaved('kit'); listSaved('template');
applyPack(DEFAULT_PACK, { reloadSample: true });

/* Progressive enhancement for browsers that support page-scoped WebMCP. */
if (document.modelContext?.registerTool) {
  const context = document.modelContext;
  const register = tool => { try { Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch {} };
  register({ name: 'read_report_summary', title: 'Read report summary', description: 'Read the current report totals, grouped values, source and descriptive findings.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => ({ report: state.report, groups: state.summary, findings: state.insights, sample: state.sample }) });
  register({ name: 'configure_report', title: 'Configure report', description: 'Change the report title, organization, recipient, period and optional context using the same fields as the report editor.', inputSchema: { type: 'object', properties: { title: { type: 'string', maxLength: 95 }, organization: { type: 'string', maxLength: 80 }, period: { type: 'string', maxLength: 70 }, recipient: { type: 'string', maxLength: 100 }, context: { type: 'string', maxLength: 4000 } }, additionalProperties: false }, annotations: { readOnlyHint: false },
    execute: input => {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Expected report fields.');
      const mapping = { title: 'reporttitle', organization: 'org', period: 'period', recipient: 'funder', context: 'narrative' };
      for (const [k, v] of Object.entries(input)) if (!mapping[k] || typeof v !== 'string' || v.length > $(mapping[k]).maxLength) throw Error('Invalid report field: ' + k);
      for (const [k, v] of Object.entries(input)) $(mapping[k]).value = v;
      render();
      return { title: state.report.title, organization: state.report.org, period: state.report.period, recipient: state.report.funder };
    } });
}
