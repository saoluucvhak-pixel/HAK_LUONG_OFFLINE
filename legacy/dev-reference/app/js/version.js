(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  HAK.VERSION = '0.1.0';
  HAK.APP_NAME = 'HAK · TÍNH LƯƠNG';
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-hak-version]').forEach((e) => { e.textContent = 'v' + HAK.VERSION; }));
})(typeof window !== 'undefined' ? window : globalThis);
