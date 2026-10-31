// Draws the screen in the <template> twice: hell and dunkel, side by side.
const tpl = document.querySelector('template');
const pair = document.createElement('div');
pair.className = 'pair';
for (const [cls, name] of [['light', 'HELL'], ['dark', 'DUNKEL']]) {
  const col = document.createElement('div');
  col.innerHTML = `<p class="label">${name}</p>`;
  const phone = document.createElement('div');
  phone.className = `phone ${cls}`;
  phone.appendChild(tpl.content.cloneNode(true));
  col.appendChild(phone);
  pair.appendChild(col);
}
document.body.appendChild(pair);
