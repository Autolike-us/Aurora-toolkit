'use strict';
const $ = (s) => document.querySelector(s);
chrome.runtime.sendMessage({ aurora: 'reply', type: 'getState' }, (s) => {
  s = s || {};
  const u = s.usage;
  $('#st').innerHTML = !s.hasKey ? '<span class="pill warn">Add your key in settings to start</span>' : `<span class="pill ok">Ready</span> ${u ? `<span style="margin-left:6px">${u.used} of ${u.limit} drafts used this month</span>` : ''}${s.voiceReady ? '' : '<div style="margin-top:8px">💡 Teach it your voice in settings for better replies.</div>'}`;
});
$('#opts').addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close(); });
