// The top-level statements of index.html's inline script, for tests/lib/select.mjs (ported from The Old Gates, 19 Oct 2026).
//   node --expose-internals --no-warnings tests/lib/toplevel.cjs < index.html
// prints {scripts: [{line, endLine}], rows: [{name, line, endLine, ids, props?}]}, in index.html's own line numbers.
// One row per declared name (a function, each declarator of a const/let/var, a class) or, for any other statement
// (`window.x = …`, `addEventListener(…)`), the name at its root. `ids` is every identifier the statement uses (strings
// included, so a scenario id or a builderFn named in quotes counts). A big object-literal const (SCENARIOS, CHARACTERS,
// GUN_SPECS, VOICE_LINES, Game …) is split by its own keys: `props` holds one row per key, so a change to one scenario's
// entry names that scenario, not SCENARIOS, which half the suites mention. Node's own acorn, so nothing needs installing.
const fs = require('fs');
let acorn; try { acorn = require('internal/deps/acorn/acorn/dist/acorn'); } catch (e) { acorn = require('acorn'); }
const SPLIT_LINES = 30;   // an object-literal const longer than this is split by its keys

function rootName(n) {
  while (n) {
    if (n.type === 'Identifier') return n.name;
    if (n.type === 'ExpressionStatement') n = n.expression;
    else if (n.type === 'CallExpression') n = n.callee;
    else if (n.type === 'MemberExpression') n = n.object;
    else if (n.type === 'AssignmentExpression') n = n.left;
    else if (n.type === 'SequenceExpression') n = n.expressions[0];
    else if (n.type === 'UnaryExpression' || n.type === 'AwaitExpression') n = n.argument;
    else return null;
  }
  return null;
}
const ids = (src, node) => [...new Set(src.slice(node.start, node.end).match(/[A-Za-z_$][\w$]*/g) || [])];
const keyName = p => p.key && (p.key.type === 'Identifier' ? p.key.name : p.key.type === 'Literal' ? String(p.key.value) : null);

const html = fs.readFileSync(0, 'utf8');
const lineAt = i => html.slice(0, i).split('\n').length;
const scripts = [], rows = [];
for (const m of html.matchAll(/(<script(?![^>]*src)[^>]*>)([\s\S]*?)<\/script>/g)) {
  const src = m[2], off = lineAt(m.index + m[1].length) - 1;
  scripts.push({ line: off + 1, endLine: off + src.split('\n').length });
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true });
  const at = n => ({ line: n.loc.start.line + off, endLine: n.loc.end.line + off });
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') rows.push({ name: st.id.name, ...at(st), ids: ids(src, st) });
    else if (st.type === 'VariableDeclaration') for (const d of st.declarations) {
      const names = d.id.type === 'Identifier' ? [d.id.name] : ids(src, d.id);
      const big = d.init && d.init.type === 'ObjectExpression' && d.loc.end.line - d.loc.start.line + 1 > SPLIT_LINES;
      for (const name of names) rows.push(big
        ? { name, ...at(d), ids: [], props: d.init.properties.filter(keyName).map(p => ({ name: keyName(p), ...at(p), ids: ids(src, p) })) }
        : { name, ...at(d), ids: ids(src, d) });
    }
    else rows.push({ name: rootName(st), ...at(st), ids: ids(src, st) });
  }
}
process.stdout.write(JSON.stringify({ scripts, rows }));
