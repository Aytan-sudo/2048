import { creerPartie, jouer, annuler, serialiser, relire, tuileMax, peutAnnuler, ANNULATIONS, objectifDe } from '../js/partie.js';
import { counter, poserGrille, valeursDe, hasardFixe } from './harness.mjs';

const { check, report } = counter();
console.log('\nPartie\n');

const depart = creerPartie(4, 12345);
check('une partie commence avec deux tuiles',
    depart.grille.filter(Boolean).length === 2);
check('elles valent 2 ou 4',
    depart.grille.filter(Boolean).every(tuile => tuile.valeur === 2 || tuile.valeur === 4));
check('le score part de zero', depart.score === 0 && depart.coups === 0);
check('les annulations sont pleines', depart.annulations === ANNULATIONS);
check('on ne peut pas annuler avant d\'avoir joue', peutAnnuler(depart) === false);

// Meme graine, meme partie : c'est ce qui permet de reprendre une partie
// interrompue sans que le hasard reparte de zero.
check('la meme graine donne la meme grille de depart',
    valeursDe(creerPartie(4, 777).grille).join() === valeursDe(creerPartie(4, 777).grille).join());

const objectifs = [3, 4, 5, 6].map(objectifDe);
check('chaque taille a son objectif, croissant',
    objectifs.every((valeur, rang) => rang === 0 || valeur > objectifs[rang - 1]));

// Un coup impossible ne consomme rien
const bloquee = creerPartie(4, 42);
poserGrille(bloquee, [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const avantBlocage = valeursDe(bloquee.grille).join();
check('un coup qui ne bouge rien est refuse', jouer(bloquee, 'gauche') === null);
check('et ne fait apparaitre aucune tuile', valeursDe(bloquee.grille).join() === avantBlocage);
check('et ne compte pas un tour', bloquee.coups === 0);

// Un coup normal
const partie = creerPartie(4, 999);
poserGrille(partie, [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const coup = jouer(partie, 'gauche');
check('le coup rend le detail de ce qui a bouge', coup !== null && coup.fusions.length === 1);
check('le score suit le gain', partie.score === 4);
check('une tuile neuve apparait a chaque coup',
    partie.grille.filter(Boolean).length === 2 && coup.naissance !== null);
check('le tour est compte', partie.coups === 1);
check('l\'annulation devient possible', peutAnnuler(partie) === true);

// L'annulation repose la grille, le score et le hasard : rejouer le meme coup
// doit refaire tomber la meme tuile, sinon annuler devient une relance de des.
const rejouee = creerPartie(4, 20240);
const premier = jouer(rejouee, 'gauche') ?? jouer(rejouee, 'haut');
const apresPremier = valeursDe(rejouee.grille).join();
const scoreApres = rejouee.score;
const direction = premier === null ? null : 'gauche';
annuler(rejouee);
const rejoue = jouer(rejouee, direction ?? 'haut');
check('annuler puis rejouer redonne exactement la meme grille',
    valeursDe(rejouee.grille).join() === apresPremier && rejouee.score === scoreApres && rejoue !== null);

const compteAnnulations = creerPartie(4, 55);
for (let tour = 0; tour < 6; tour++) {
    for (const direction of ['gauche', 'haut', 'droite', 'bas']) {
        if (jouer(compteAnnulations, direction)) break;
    }
}
let annulees = 0;
while (annuler(compteAnnulations)) annulees++;
check(`l'annulation s'arrete au budget de ${ANNULATIONS}`, annulees === ANNULATIONS);
check('le budget epuise se voit', peutAnnuler(compteAnnulations) === false);

// Fin de partie : la grille ci-dessous est morte des que la derniere case est
// prise, quelle que soit la tuile qui y tombe.
const finie = creerPartie(4, 1);
finie.hasard = hasardFixe();
poserGrille(finie, [
    2, 4, 8, 4,
    4, 8, 2, 8,
    8, 2, 4, 16,
    4, 8, 8, 8
]);
const dernier = jouer(finie, 'gauche');
check('le dernier coup se joue normalement', dernier !== null && dernier.gain === 16);
check('la partie se declare terminee', finie.terminee === true);
check('et refuse tout coup supplementaire', jouer(finie, 'haut') === null);
check('la meilleure tuile est celle du plateau', tuileMax(finie) === 16);

// L'objectif depend de la grille : 256 sur un 3x3.
const petite = creerPartie(3, 7);
poserGrille(petite, [128, 128, 0, 0, 0, 0, 0, 0, 0]);
const victoire = jouer(petite, 'gauche');
check('atteindre l\'objectif est signale une fois', victoire.objectif === true);
check('et retenu dans la partie', petite.objectifAtteint === true);
poserGrille(petite, [256, 256, 0, 0, 0, 0, 0, 0, 0]);
check('il n\'est pas signale deux fois', jouer(petite, 'gauche').objectif === false);

// Serialisation
const sauvee = creerPartie(5, 4321);
jouer(sauvee, 'gauche') ?? jouer(sauvee, 'haut');
const reprise = relire(JSON.parse(JSON.stringify(serialiser(sauvee))));
check('une partie relue retrouve sa grille',
    valeursDe(reprise.grille).join() === valeursDe(sauvee.grille).join());
check('son score et sa taille aussi',
    reprise.score === sauvee.score && reprise.taille === 5);
check('son hasard reprend au meme endroit',
    reprise.hasard.etat() === sauvee.hasard.etat());
check('ses annulations sont conservees',
    reprise.annulations === sauvee.annulations && reprise.historique.length === sauvee.historique.length);

// Le stockage vient du navigateur : il peut etre vide, tronque ou trafique.
check('rien a relire ne casse rien', relire(null) === null);
check('une taille inconnue est refusee', relire({ ...serialiser(sauvee), taille: 9 }) === null);
check('une grille de la mauvaise longueur est refusee',
    relire({ ...serialiser(sauvee), grille: [null, null] }) === null);
check('une grille entierement vide est refusee',
    relire({ ...serialiser(sauvee), grille: new Array(25).fill(null) }) === null);

report();
