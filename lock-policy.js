#!/usr/bin/env node
/* BB BRAIN LOCK POLICY (2026-09-18, Fable mould). ONE definition of a strong passphrase, used by
   the builder, the verifier and the cloud build. The Brain ships on a PUBLIC address, so the
   file can be downloaded and guessed at offline for ever. 8 digits is 100 million guesses, about
   an afternoon on one gaming card at 310k PBKDF2 rounds. Five random words is out of reach.

   STRONG means all of:  20 characters or more, not only digits, and either four or more words
   or three or more kinds of character. Nothing here ever prints or stores a passphrase.

     node lock-policy.js --selftest        proves the rule on fixed cases
     node lock-policy.js --check-file F    says strong or weak for the phrase in file F, never echoes it */
const fs = require('fs');
function classes(p) { return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9\s]/].filter(r => r.test(p)).length; }
function words(p) { return p.split(/[\s\-_.]+/).filter(w => w.length >= 3).length; }
function strength(p) {
  p = String(p || '').trim();
  const why = [];
  if (p.length < 20) why.push('shorter than 20 characters');
  if (/^\d+$/.test(p)) why.push('digits only');
  if (words(p) < 4 && classes(p) < 3) why.push('needs four words or three kinds of character');
  if (/^(.)\1+$/.test(p)) why.push('one character repeated');
  return { strong: why.length === 0, why, klass: /^\d+$/.test(p) ? 'digits' : why.length ? 'weak-text' : 'passphrase' };
}
module.exports = { strength };
if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === '--check-file') {
    let p = ''; try { p = fs.readFileSync(a[1], 'utf8'); } catch (e) { console.log('missing'); process.exit(2); }
    const s = strength(p); console.log(s.strong ? 'strong' : 'weak: ' + s.why.join(', ')); process.exit(s.strong ? 0 : 1);
  }
  if (a[0] === '--selftest') {
    const cases = [
      ['12345678', false], ['20001231', false], ['00000000000000000000000000', false], ['password', false],
      ['aaaaaaaaaaaaaaaaaaaaaaaa', false], ['short four word one', false], ['Tr0ub4dor&3', false],
      ['copper lantern river monsoon kite', true], ['mango-train-seven-harbour-quiet', true],
      ['Kandy2026!railway_Blue-umbrella', true], ['correct horse battery staple', true],
      ['onelongwordwithoutanyspacesatall', false],
    ];
    let pass = 0; for (const [p, want] of cases) { const got = strength(p).strong; if (got === want) pass++; else console.log('XX case', cases.findIndex(c => c[0] === p), 'wanted', want); }
    console.log('lock-policy selftest: ' + pass + ' of ' + cases.length); process.exit(pass === cases.length ? 0 : 1);
  }
}
