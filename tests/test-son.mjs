// Le son. Tout ce qui se teste sans oreille : la hauteur des fusions, qui est
// la seule partie du module a porter une regle plutot qu'un reglage.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { counter } from './harness.mjs';
import { hauteurDe } from '../js/son.js';

const { check, report } = counter();
console.log('\nSon\n');

// La promesse du timbre : plus la tuile est grosse, plus la note est haute.
const echelle = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192].map(hauteurDe);
check('la hauteur monte avec la valeur',
    echelle.every((frequence, rang) => rang === 0 || frequence > echelle[rang - 1]));

check('le premier 4 donne le mi de reference', Math.round(hauteurDe(4)) === 330);
check('la tuile 2048 sonne trois octaves plus haut',
    hauteurDe(2048) > hauteurDe(4) * 3 && hauteurDe(2048) < hauteurDe(4) * 4);

// Le plancher, et la raison d'etre de ce test.
//
// La premiere version partait de 165 Hz : sur un ordinateur elle s'entendait
// tres bien, sur un telephone les fusions courantes n'existaient tout
// simplement pas. Un haut-parleur de telephone ne restitue a peu pres rien sous
// 300 Hz, et l'oreille y est de surcroit bien moins sensible a faible volume.
// Rien ne leve d'erreur : le son part, il n'arrive pas. Le jeu se voulant
// « mobile d'abord », c'est un defaut, pas un reglage.
const PLANCHER = 300;

const trop = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]
    .filter(valeur => hauteurDe(valeur) < PLANCHER);
check('aucune fusion ne passe sous le plancher du haut-parleur',
    trop.length === 0, trop.map(v => `${v} (${Math.round(hauteurDe(v))} Hz)`).join(' '));

// Les autres timbres portent leurs frequences en clair dans le module : on les
// releve a la source, faute de pouvoir les jouer en Node.
const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'son.js'), 'utf8');
const ecrites = [
    ...[...source.matchAll(/note\((\d+)/g)].map(trouve => Number(trouve[1])),
    ...[...source.matchAll(/vers:\s*(\d+)/g)].map(trouve => Number(trouve[1])),
    ...[...source.matchAll(/^\s*\[([\d,\s]+)\]\.forEach/gm)]
        .flatMap(trouve => trouve[1].split(',').map(Number))
];
const basses = ecrites.filter(frequence => frequence < PLANCHER);
check('aucun timbre fixe ne passe sous le plancher non plus',
    basses.length === 0, basses.join(' '));
check('les frequences fixes ont bien ete relevees', ecrites.length >= 6, String(ecrites.length));

// L'echelle est pentatonique : deux fusions du meme coup doivent tomber juste
// ensemble. Un doublement de valeur ne vaut donc jamais un demi-ton isole.
const demiTons = echelle.map(frequence => Math.round(12 * Math.log2(frequence / echelle[0])));
check('les degres suivent la pentatonique mineure',
    demiTons.join(' ') === '0 3 5 7 10 12 15 17 19 22 24 27', demiTons.join(' '));

// La raison d'etre de la pentatonique : deux tuiles voisines fusionnant dans
// le meme coup ne doivent jamais sonner a un demi-ton l'une de l'autre.
const ecarts = demiTons.slice(1).map((degre, rang) => degre - demiTons[rang]);
check('deux degres voisins ne frottent jamais', ecarts.every(ecart => ecart >= 2), ecarts.join(' '));

// Une valeur au-dela de la rampe ne doit ni sortir de l'echelle ni planter.
check('une tuile hors barème reste dans l\'echelle',
    Number.isFinite(hauteurDe(65536)) && hauteurDe(65536) > hauteurDe(8192));
check('une valeur absurde ne casse rien',
    Number.isFinite(hauteurDe(2)) && Number.isFinite(hauteurDe(1)));

report();
