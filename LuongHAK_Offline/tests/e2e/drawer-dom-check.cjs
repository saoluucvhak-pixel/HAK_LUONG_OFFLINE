// Supplementary DOM regression check; Electron E2E remains the runtime check.
// npm install --no-save --package-lock=false jsdom
// node tests/e2e/drawer-dom-check.cjs
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const app = path.resolve(__dirname, '../..');
const dom = new JSDOM('<button id="opener">Open</button><div id="modal"></div>', { runScripts: 'outside-only', url: 'https://test.invalid' });
const w = dom.window, d = w.document;
// jsdom has no layout; expose connected elements to the visibility filter.
w.HTMLElement.prototype.getClientRects = function () { return this.isConnected ? [{}] : []; };
function h(tag, attrs = {}, children = []) {
  const el = d.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => { if (k === 'text') el.textContent = v; else el.setAttribute(k, v); });
  children.filter(Boolean).forEach(n => el.appendChild(n)); return el;
}
const btn = (label, cls, action) => { const b = h('button', { class: cls, text: label }); b.onclick = action; return b; };
function load(file) {
  const source = process.env.DRAWER_BASELINE ? require('node:child_process').execFileSync('git', ['-c', 'safe.directory=*', 'show', 'HEAD:LuongHAK_Offline/' + file], { cwd: app, encoding: 'utf8' }) : fs.readFileSync(path.join(app, file), 'utf8');
  w.eval(source);
}
w.HAKCore = { sf: require('../../core/smart-filter.js'), validate: { normDate: x => x || '' }, formulaMaster: { forType: () => ({ KIND: { fields: [], title: 'Test', short: 'Test', code: 'Code', name: 'Name' }, parentRows: () => [{}], effectiveRow: () => ({}), summary: () => ({}), sharedWith: () => null }) } };
w.HAKUI = {};
load('ui/formula-master.js');
load('ui/filter-popover.js');
load('ui/smart-filter.js');
const sf = w.HAKUI.smartFilter.create({ h, btn, storage: () => w.localStorage, toast: () => {} });
for (const type of ['OVERTIME', 'ALLOWANCE', 'SUPPORT']) {
  d.querySelector('#opener').focus();
  const ui = w.HAKUI.formulaMaster.create({ h, btn, $: s => d.querySelector(s), db: () => ({}), st: { nam: 2026, thang: 9 }, can: () => false, render: () => {} }, type);
  ui.openModal('SYNTHETIC');
  const tab = d.querySelector('[data-ot-tab="info"]'); tab.focus(); tab.click();
  assert.equal(d.activeElement, d.querySelector('[data-ot-tab="info"]'), type + ': focus after redraw');
  d.activeElement.blur();
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(d.activeElement, d.querySelector('[data-ot-close]'), type + ': recover escaped focus');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(d.activeElement, d.querySelector('#opener'));
  console.log('PASS ' + type + ': redraw, focus recovery, Escape');
}
// Large catalog: search across pages, preserve the filter, and export exactly the matching data.
for (const type of ['OVERTIME','ALLOWANCE','SUPPORT']) {
  const codes = Array.from({length:121}, (_,i) => 'SYN'+String(i).padStart(3,'0'));
  const db = { codes };
  const snapshot = JSON.stringify(db);
  let exported;
  const summary = ma => ({ma,ten:ma === 'SYN120' ? 'Điện thoại' : ma,loaiCongThuc:'',row:{},base:{},trangThai:'Đang hiệu lực',nguonApDung:'macdinh',soPhienBan:0});
  w.HAKCore.formulaMaster.forType = () => ({KIND:{fields:[],listCols:[],title:type,short:type,noun:'mã',code:'Code',name:'Name'},parentCodes:() => db.codes,summary:(_,ma) => summary(ma),applied:() => ({bieuThuc:'1'})});
  const ui = w.HAKUI.formulaMaster.create({h,btn,esc:String,$:s=>d.querySelector(s),db:()=>db,st:{nam:2026,thang:9},
    can:p=>p === 'export',render:()=>{},sfUi:sf,saveXlsx:(_name,sheets)=>{ exported = sheets[0].rows; }},type);
  let panel = ui.masterView();
  d.body.appendChild(panel);
  assert.equal(panel.querySelectorAll('[data-ot-row]').length,50);
  [...panel.querySelectorAll('button')].find(b=>b.textContent==='Trang sau').click();
  assert.equal(panel.querySelector('[data-ot-row]').dataset.otRow,'SYN050');
  const search = panel.querySelector('.sf [data-sf-q]');
  assert.ok(search);
  search.value = 'dien thoai';
  search.dispatchEvent(new w.Event('input'));
  assert.equal(panel.querySelectorAll('[data-ot-row]').length,1);
  assert.equal(panel.querySelector('[data-ot-row]').dataset.otRow,'SYN120');
  [...panel.querySelectorAll('button')].find(b=>b.textContent.includes('Xuất Excel')).click();
  assert.deepEqual(Array.from(exported,r=>r.Code),['SYN120']);
  panel.remove();
  panel = ui.masterView();
  assert.equal(panel.querySelector('[data-sf-q]').value,'dien thoai');
  assert.equal(panel.querySelectorAll('[data-ot-row]').length,1);
  assert.equal(JSON.stringify(db),snapshot);
  console.log('PASS '+type+': paging, accent folding, persisted search, export and read-only data');
}
let state = {};
sf.components.FilterDrawer({ screenId: 'synthetic', advancedFields: ['q'], state: { get: () => state, set: v => { state = v; } } }, d.querySelector('#opener'), () => {});
d.activeElement.blur();
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
assert.ok(d.activeElement.closest('[data-sf-drawer]'), 'Smart Filter recovers escaped focus');
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert.equal(d.activeElement, d.querySelector('#opener'));
assert.equal(d.querySelector('#opener').getAttribute('aria-expanded'), 'false');
console.log('PASS Smart Filter: focus recovery, Escape, expanded state');
dom.window.close();
