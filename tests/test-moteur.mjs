import { rangees, tasserRangee, deplacer, coupsPossibles, casesLibres, meilleureTuile, grilleVide } from '../js/moteur.js';
import { counter, compteur, grilleDepuis, valeursDe } from './harness.mjs';

const { check, report } = counter();
console.log('\nMoteur\n');

// Les quatre directions partagent le meme code de fusion : tout repose sur
// l'ordre dans lequel les indices sont enfiles.
check('vers la gauche, chaque rangee se lit de gauche a droite',
    JSON.stringify(rangees(3, 'gauche')) === JSON.stringify([[0, 1, 2], [3, 4, 5], [6, 7, 8]]));
check('vers la droite, elle se lit a l\'envers',
    JSON.stringify(rangees(3, 'droite')) === JSON.stringify([[2, 1, 0], [5, 4, 3], [8, 7, 6]]));
check('vers le haut, ce sont les colonnes',
    JSON.stringify(rangees(3, 'haut')) === JSON.stringify([[0, 3, 6], [1, 4, 7], [2, 5, 8]]));
check('vers le bas, les colonnes a l\'envers',
    JSON.stringify(rangees(3, 'bas')) === JSON.stringify([[6, 3, 0], [7, 4, 1], [8, 5, 2]]));

const tasser = valeurs => tasserRangee(grilleDepuis(valeurs), compteur());

check('les trous se referment', valeursDe(tasser([0, 2, 0, 4]).cases).join() === '2,4,0,0');

const deuxPaires = tasser([2, 2, 4, 4]);
check('deux paires fusionnent en un seul coup', valeursDe(deuxPaires.cases).join() === '4,8,0,0');
check('le gain vaut la somme des tuiles nees', deuxPaires.gain === 12);

// La regle qui tient tout l'equilibre du jeu : sans elle, une rangee entiere
// s'effondrerait en une tuile et le plateau ne se remplirait jamais.
check('une tuile ne fusionne qu\'une fois par coup',
    valeursDe(tasser([2, 2, 2, 0]).cases).join() === '4,2,0,0');
check('quatre identiques donnent deux paires, pas une tuile',
    valeursDe(tasser([4, 4, 4, 4]).cases).join() === '8,8,0,0');
check('la fusion se fait du cote ou l\'on pousse',
    valeursDe(tasser([0, 2, 2, 2]).cases).join() === '4,2,0,0');
check('des voisines differentes ne fusionnent pas',
    valeursDe(tasser([2, 4, 2, 4]).cases).join() === '2,4,2,4');

const suivie = tasser([0, 0, 8, 0]);
check('une tuile qui glisse garde son identite',
    suivie.deplacements.length === 1 && suivie.deplacements[0].depuis === 2 && suivie.deplacements[0].vers === 0);

const fusionnee = tasser([2, 2, 0, 0]);
check('la tuile nee sait de qui elle vient',
    fusionnee.fusions.length === 1 && fusionnee.fusions[0].absorbees.length === 2
    && fusionnee.fusions[0].absorbees.every(id => [1, 2].includes(id)));
check('les deux absorbees marchent jusqu\'a la case de fusion',
    fusionnee.deplacements.length === 2 && fusionnee.deplacements.every(pas => pas.vers === 0));

// Le plateau complet
const grille = grilleDepuis([
    2, 2, 0, 0,
    4, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 8
]);
const depart = valeursDe(grille).join();

const gauche = deplacer(grille, 4, 'gauche', compteur());
check('un coup ne touche pas la grille qu\'on lui donne', valeursDe(grille).join() === depart);
check('vers la gauche, tout se colle au bord',
    valeursDe(gauche.grille).join() === '4,0,0,0,4,0,0,0,0,0,0,0,8,0,0,0');
check('le score du coup est celui des fusions', gauche.gain === 4);

const droite = deplacer(grille, 4, 'droite', compteur());
check('vers la droite aussi',
    valeursDe(droite.grille).join() === '0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,8');

const bas = deplacer(grilleDepuis([2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 4, 'bas', compteur());
check('les colonnes fusionnent comme les lignes',
    valeursDe(bas.grille).join() === '0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0');

// Un coup qui ne bouge rien ne doit ni marquer ni faire naitre de tuile :
// sinon pousser contre un mur remplirait le plateau tout seul.
const mur = deplacer(grilleDepuis([2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 4, 'gauche', compteur());
check('pousser contre un mur ne bouge rien', mur.bouge === false && mur.gain === 0);
check('un coup qui bouge le dit', gauche.bouge === true);

// Fin de partie
const morte = grilleDepuis([
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2
]);
check('un damier complet n\'offre plus aucun coup', coupsPossibles(morte, 4) === false);

const respire = grilleDepuis([
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 4
]);
check('deux voisines identiques suffisent a continuer', coupsPossibles(respire, 4) === true);
check('une case libre aussi', coupsPossibles(grilleVide(4), 4) === true);

check('les cases libres sont comptees',
    casesLibres(grilleDepuis([2, 0, 0, 4])).join() === '1,2');
check('la meilleure tuile est trouvee',
    meilleureTuile(grilleDepuis([2, 512, 0, 64])) === 512);
check('une grille vide n\'a pas de meilleure tuile', meilleureTuile(grilleVide(3)) === 0);

report();
