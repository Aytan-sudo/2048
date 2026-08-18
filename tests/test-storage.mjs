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
    PREFERENCES_PAR_DEFAUT, chargerPreferences, enregistrerPreferences,
    chargerRecords, recordDe, enregistrerFin, effacerRecords,
    chargerPartie, enregistrerPartie, oublierPartie
} = await import('../js/storage.js');

const { check, report } = counter();
console.log('\nStockage\n');

check('sans rien d\'enregistre, les preferences sont celles par defaut',
    chargerPreferences().taille === PREFERENCES_PAR_DEFAUT.taille);

enregistrerPreferences({ ...PREFERENCES_PAR_DEFAUT, taille: 6, theme: 'sombre' });
check('les preferences se relisent', chargerPreferences().theme === 'sombre');

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

report();
