// Le son. Tout ce qui se teste sans oreille : la hauteur des fusions, qui est
// la seule partie du module a porter une regle plutot qu'un reglage.

import { counter } from './harness.mjs';
import { hauteurDe } from '../js/son.js';

const { check, report } = counter();
console.log('\nSon\n');

// La promesse du timbre : plus la tuile est grosse, plus la note est haute.
const echelle = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192].map(hauteurDe);
check('la hauteur monte avec la valeur',
    echelle.every((frequence, rang) => rang === 0 || frequence > echelle[rang - 1]));

check('le premier 4 sonne grave', Math.round(hauteurDe(4)) === 165);
check('la tuile 2048 sonne trois octaves plus haut',
    hauteurDe(2048) > hauteurDe(4) * 3 && hauteurDe(2048) < hauteurDe(4) * 4);

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
