// Le module de stockage parle au localStorage. On lui en fournit un en memoire :
// tester avec un vrai navigateur pour trois cles serait disproportionne, et
// sans rien du tout les tests ne verifieraient que les valeurs par defaut.

import { counter } from './harness.mjs';

const memoire = new Map();
globalThis.localStorage = {
    getItem: cle => (memoire.has(cle) ? memoire.get(cle) : null),
    setItem: (cle, valeur) => memoire.set(cle, String(valeur)),
    removeItem: cle => memoire.delete(cle)
};

const {
    PREFERENCES_PAR_DEFAUT, SCHEMA_PREFERENCES, chargerPreferences, enregistrerPreferences,
    chargerRecords, recordDe, enregistrerFin, effacerRecords,
    chargerPartie, enregistrerPartie, oublierPartie,
    SCHEMA_DEFI, chargerDefi, enregistrerDefi, retenirResultat, effacerDefi
} = await import('../js/storage.js');

const { check, report } = counter();
console.log('\nStockage\n');

check('sans rien d\'enregistre, les preferences sont celles par defaut',
    chargerPreferences().taille === PREFERENCES_PAR_DEFAUT.taille);

enregistrerPreferences({ ...PREFERENCES_PAR_DEFAUT, taille: 6, theme: 'arcade' });
check('les preferences se relisent', chargerPreferences().theme === 'arcade');

// Migration du palier 1 : le jeu n'avait que deux themes, ils sont devenus des
// palettes nommees. Un joueur revenu apres la mise a jour doit retrouver la
// sienne, pas retomber sur le mode systeme.
enregistrerPreferences({ taille: 4, theme: 'sombre' });
check('l\'ancien theme sombre devient la palette Nuit', chargerPreferences().theme === 'nuit');
enregistrerPreferences({ taille: 4, theme: 'clair' });
check('l\'ancien theme clair devient la palette Sable', chargerPreferences().theme === 'sable');
check('les preferences migrees portent le schema courant',
    chargerPreferences().schema === SCHEMA_PREFERENCES);

// Une preference ajoutee dans une version suivante doit prendre sa valeur par
// defaut, sans effacer ce qui etait deja enregistre.
enregistrerPreferences({ taille: 5 });
const partielles = chargerPreferences();
check('une preference absente retombe sur sa valeur par defaut',
    partielles.taille === 5 && partielles.vibration === PREFERENCES_PAR_DEFAUT.vibration);

check('une grille jamais jouee n\'a pas de record',
    recordDe(chargerRecords(), 4).score === 0);

const premier = enregistrerFin(4, 1200, 128);
check('le premier score est un record', premier.record === true && premier.ancien === 0);
check('la premiere tuile aussi', premier.nouvelleTuile === true);

const moins = enregistrerFin(4, 900, 64);
check('un score inferieur n\'est pas un record', moins.record === false && moins.ancien === 1200);
check('le record garde la meilleure valeur', recordDe(chargerRecords(), 4).score === 1200);
check('la meilleure tuile ne redescend pas', recordDe(chargerRecords(), 4).tuile === 128);
check('les parties se comptent', recordDe(chargerRecords(), 4).parties === 2);

// Le point du classement par taille : un 6x6 rapporte mecaniquement plus qu'un
// 3x3, les melanger rendrait les petites grilles definitivement decevantes.
enregistrerFin(3, 400, 64);
check('chaque taille a son propre record',
    recordDe(chargerRecords(), 3).score === 400 && recordDe(chargerRecords(), 4).score === 1200);
check('une grosse tuile ailleurs ne deteint pas',
    recordDe(chargerRecords(), 3).tuile === 64);

// Un score meilleur avec une tuile plus petite : les deux avancent separement.
const scoreSeul = enregistrerFin(4, 2000, 64);
check('le score peut battre un record sans la tuile',
    scoreSeul.record === true && scoreSeul.nouvelleTuile === false);
check('et la tuile reste celle du meilleur jour',
    recordDe(chargerRecords(), 4).tuile === 128);

effacerRecords();
check('effacer vide tous les tableaux', Object.keys(chargerRecords()).length === 0);

check('sans partie enregistree, il n\'y a rien a reprendre', chargerPartie() === null);
enregistrerPartie({ taille: 4, score: 12 });
check('la partie en cours se relit', chargerPartie().score === 12);
oublierPartie();
check('et s\'oublie', chargerPartie() === null);

// ------------------------------------------------------------------- le defi

check('sans rien releve, la serie est a zero',
    chargerDefi().serie === 0 && Object.keys(chargerDefi().resultats).length === 0);

let defi = retenirResultat(chargerDefi(), '2026-08-25', { score: 3000, tuile: 256, coups: 180 }, 1);
enregistrerDefi(defi);
check('le resultat du jour se relit', chargerDefi().resultats['2026-08-25'].score === 3000);
check('la serie et la meilleure serie suivent',
    chargerDefi().serie === 1 && chargerDefi().meilleureSerie === 1 && chargerDefi().dernierJour === '2026-08-25');

defi = retenirResultat(chargerDefi(), '2026-08-26', { score: 5000, tuile: 512, coups: 240 }, 2);
enregistrerDefi(defi);
check('un second jour allonge la serie', chargerDefi().serie === 2 && chargerDefi().meilleureSerie === 2);

// Une serie cassee ne doit pas emporter le souvenir de la precedente.
defi = retenirResultat(chargerDefi(), '2026-08-30', { score: 1000, tuile: 128, coups: 90 }, 1);
enregistrerDefi(defi);
check('la meilleure serie survit a une serie cassee',
    chargerDefi().serie === 1 && chargerDefi().meilleureSerie === 2);

// La cle ne doit pas grossir indefiniment : au-dela de trois mois, les plus
// vieux resultats tombent, les recents restent.
let ancien = chargerDefi();
for (let jour = 1; jour <= 120; jour++) {
    const date = new Date(Date.UTC(2027, 0, jour)).toISOString().slice(0, 10);
    ancien = retenirResultat(ancien, date, { score: jour, tuile: 8, coups: jour }, 1);
}
enregistrerDefi(ancien);
const gardes = Object.keys(chargerDefi().resultats).sort();
check('les resultats sont limites a trois mois', gardes.length === 90, String(gardes.length));
check('ce sont les plus recents qui restent', gardes.at(-1) === '2027-04-30');

// La partie du jour a son propre coin : reprendre une grille du jour ne doit
// pas ecraser la partie libre en cours.
enregistrerPartie({ taille: 4, score: 42 });
enregistrerDefi({ ...chargerDefi(), partie: { taille: 4, score: 900, jour: '2026-08-25' } });
check('la partie libre et celle du jour cohabitent',
    chargerPartie().score === 42 && chargerDefi().partie.score === 900);

// Un schema inconnu vaut un stockage vide : mieux vaut perdre une serie que
// nourrir le jeu avec une forme qu'il ne sait plus lire.
enregistrerPreferences({});
memoire.set('2048.defi', JSON.stringify({ schema: SCHEMA_DEFI + 7, serie: 99 }));
check('un schema inconnu repart de zero', chargerDefi().serie === 0);

memoire.set('2048.defi', '{ ceci n\'est pas du json');
check('un stockage abime ne bloque pas le jeu', chargerDefi().serie === 0);

effacerDefi();
check('effacer remet la serie a zero',
    chargerDefi().serie === 0 && Object.keys(chargerDefi().resultats).length === 0);

report();
