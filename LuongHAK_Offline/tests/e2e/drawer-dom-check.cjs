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
load('ui/smart-filter.js');
const sf = w.HAKUI.smartFilter.create({ h, btn, storage: () => w.localStorage, toast: () => {} });
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
