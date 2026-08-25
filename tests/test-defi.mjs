// La grille du jour. Tout ce qui suit est pur : une date entre, une graine, un
// lien ou une serie sortent. Aucun navigateur n'est necessaire — c'est la
// condition pour que la meme grille tombe chez tout le monde.

import { counter, valeursDe } from './harness.mjs';
import {
    aujourdhui, estJour, hacher, graineDuJour, formaterJour, libelleCourt,
    lireRoute, lienDuJour, lienDeGraine, ecartJours, serieApres,
    barreDeProgression, messageDePartage
} from '../js/defi.js';
import { creerPartie, jouer } from '../js/partie.js';

const { check, report } = counter();
console.log('\nGrille du jour\n');

check('la date locale s\'ecrit AAAA-MM-JJ', aujourdhui(new Date(2026, 7, 25)) === '2026-08-25');
check('le mois et le jour sont completes', aujourdhui(new Date(2026, 0, 3)) === '2026-01-03');

// La date vient de l'adresse : elle est bien formee ou elle n'est rien.
check('une vraie date est acceptee', estJour('2026-02-28'));
check('un 31 fevrier est refuse', !estJour('2026-02-31'));
check('une forme approximative est refusee', !estJour('2026-8-25') && !estJour('demain') && !estJour(null));
check('le 29 fevrier d\'une annee bissextile passe', estJour('2024-02-29') && !estJour('2026-02-29'));

check('le hachage est stable', hacher('2048:2026-08-25') === hacher('2048:2026-08-25'));
check('la graine du jour tient dans un entier non signe',
    Number.isInteger(graineDuJour('2026-08-25')) && graineDuJour('2026-08-25') >>> 0 === graineDuJour('2026-08-25'));
check('deux jours voisins ne partagent pas leur graine',
    graineDuJour('2026-08-25') !== graineDuJour('2026-08-26'));

// La promesse de la grille du jour : meme date, meme partie. C'est le
// generateur deterministe du jeu qui la tient, on verifie qu'elle est tenue.
const rejouer = () => {
    const partie = creerPartie(4, graineDuJour('2026-08-25'));
    for (const direction of ['gauche', 'haut', 'droite', 'bas', 'gauche', 'haut']) jouer(partie, direction);
    return { grille: valeursDe(partie.grille), score: partie.score };
};
const premiere = rejouer();
const seconde = rejouer();
check('la meme date donne la meme partie',
    JSON.stringify(premiere) === JSON.stringify(seconde));
check('et une autre date en donne une autre',
    JSON.stringify(valeursDe(creerPartie(4, graineDuJour('2026-08-26')).grille))
    !== JSON.stringify(valeursDe(creerPartie(4, graineDuJour('2026-08-25')).grille)));

check('la date s\'affiche a la francaise', formaterJour('2026-08-25') === '25/08/2026');
check('le bandeau dit le jour en toutes lettres', libelleCourt('2026-08-25') === '25 août');

// ------------------------------------------------------------------ l'adresse

const route = lireRoute('?jour=2026-08-25');
check('un jour se lit dans l\'adresse',
    route.jour === '2026-08-25' && route.graine === graineDuJour('2026-08-25') && route.taille === 4);
check('un jour impossible n\'est pas un jour', lireRoute('?jour=2026-02-31') === null);

const libre = lireRoute('?seed=123456&taille=5');
check('une graine libre se lit aussi', libre.jour === null && libre.graine === 123456 && libre.taille === 5);
check('une graine sans taille laisse la taille au joueur', lireRoute('?seed=7').taille === null);
check('une graine hors bornes est refusee',
    lireRoute('?seed=-1') === null && lireRoute('?seed=4294967296') === null && lireRoute('?seed=abc') === null);
check('une adresse vide ne dit rien', lireRoute('') === null && lireRoute('?rien=1') === null);

check('le lien du jour porte la date', lienDuJour('2026-08-25', 'https://exemple/') === 'https://exemple/?jour=2026-08-25');
check('le lien libre porte la graine et la taille',
    lienDeGraine(42, 6, 'https://exemple/') === 'https://exemple/?seed=42&taille=6');

// ------------------------------------------------------------------ la serie

check('deux jours consecutifs font un ecart de un', ecartJours('2026-08-25', '2026-08-26') === 1);
check('un changement de mois ne trouble pas le compte', ecartJours('2026-08-31', '2026-09-01') === 1);
check('la premiere grille relevee ouvre la serie', serieApres(null, 0, '2026-08-25') === 1);
check('un jour de plus l\'allonge', serieApres('2026-08-25', 4, '2026-08-26') === 5);
check('un jour saute la remet a un', serieApres('2026-08-23', 4, '2026-08-26') === 1);

// ------------------------------------------------------------------ le partage

check('sans rien depasser 4, la barre est vide', barreDeProgression(4) === '');
check('la barre grandit par doublements', barreDeProgression(2048).length / 2 === 9);
check('les paliers changent de couleur',
    barreDeProgression(64) === '🟨🟨🟧🟧' && barreDeProgression(8192).endsWith('🟩'));

const message = messageDePartage({
    jour: '2026-08-25', graine: 7, taille: 4, score: 20148, tuile: 2048, coups: 312, serie: 5
}, 'https://exemple/');
check('le message annonce la grille du jour', message.startsWith('2048 · grille du 25/08/2026'));
// Le separateur de milliers du francais est une espace fine insecable : on
// laisse `toLocaleString` la produire plutot que de la recopier a la main.
check('il dit le score, la tuile et les coups',
    message.includes(`${(20148).toLocaleString('fr-FR')} points`) && message.includes('312 coups'));
check('il montre la progression en carres', message.includes('🟪🟪🟦'));
check('il donne la serie quand elle depasse un jour', message.includes('Série : 5 jours'));
check('il finit par le lien du jour', message.endsWith('https://exemple/?jour=2026-08-25'));
check('le lien ne porte aucun resultat',
    !message.split('\n').at(-1).includes('20148') && !message.split('\n').at(-1).includes('2048&'));

const solo = messageDePartage({ jour: null, graine: 99, taille: 5, score: 1200, tuile: 128, coups: 60 }, 'https://exemple/');
check('une partie libre annonce sa taille', solo.startsWith('2048 · grille 5×5'));
check('et partage sa graine', solo.endsWith('https://exemple/?seed=99&taille=5'));
check('une partie libre n\'a pas de serie', !solo.includes('Série'));

report();
