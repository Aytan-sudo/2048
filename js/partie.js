// L'etat d'une partie : la grille, le score, les annulations, la fin.
//
// Le moteur ne connait que des grilles. Cette couche y ajoute ce qui dure d'un
// coup a l'autre — le hasard, l'historique, l'objectif — et se serialise en
// entier pour que fermer l'onglet ne coute pas la partie en cours.

import { grilleVide, deplacer, coupsPossibles, casesLibres, meilleureTuile } from './moteur.js';
import { creerHasard, graineAleatoire } from './hasard.js';

export const TAILLES = [3, 4, 5, 6];

// L'objectif s'adapte au plateau. Viser 2048 sur une grille de 3x3 releve du
// coup de chance pur, et sur du 6x6 c'est une formalite : dans les deux cas la
// partie n'aurait plus de moment de bascule.
export const OBJECTIFS = { 3: 256, 4: 2048, 5: 4096, 6: 8192 };

export const ANNULATIONS = 3;

export const objectifDe = taille => OBJECTIFS[taille] ?? 2048;

export function creerPartie(taille, graine = graineAleatoire()) {
    const partie = {
        taille,
        graine,
        hasard: creerHasard(graine),
        grille: grilleVide(taille),
        score: 0,
        coups: 0,
        annulations: ANNULATIONS,
        historique: [],
        objectifAtteint: false,
        terminee: false,
        enregistree: false,
        prochainId: 1
    };

    semer(partie);
    semer(partie);
    return partie;
}

// Une tuile neuve dans une case libre : un 4 une fois sur dix, un 2 sinon.
export function semer(partie) {
    const libres = casesLibres(partie.grille);
    if (libres.length === 0) return null;

    const index = libres[Math.floor(partie.hasard() * libres.length)];
    const tuile = { id: partie.prochainId++, valeur: partie.hasard() < 0.1 ? 4 : 2 };
    partie.grille[index] = tuile;
    return { ...tuile, index };
}

const instantane = partie => ({
    grille: [...partie.grille],
    score: partie.score,
    coups: partie.coups,
    objectifAtteint: partie.objectifAtteint,
    hasard: partie.hasard.etat()
});

// Rend le detail du coup pour l'animation, ou `null` si rien n'a bouge — un
// coup impossible ne consomme ni tour ni tuile.
export function jouer(partie, direction) {
    if (partie.terminee) return null;

    const avant = instantane(partie);
    const coup = deplacer(partie.grille, partie.taille, direction, () => partie.prochainId++);
    if (!coup.bouge) return null;

    partie.grille = coup.grille;
    partie.score += coup.gain;
    partie.coups++;

    partie.historique.push(avant);
    while (partie.historique.length > ANNULATIONS) partie.historique.shift();

    const naissance = semer(partie);

    const objectif = objectifDe(partie.taille);
    const atteint = !partie.objectifAtteint && coup.fusions.some(fusion => fusion.valeur >= objectif);
    if (atteint) partie.objectifAtteint = true;

    partie.terminee = !coupsPossibles(partie.grille, partie.taille);

    return { ...coup, naissance, objectif: atteint };
}

// L'annulation revient sur le dernier coup, tuile apparue comprise, et rend la
// main meme sur une partie perdue : defaire le coup fatal est precisement ce a
// quoi elle sert.
export function annuler(partie) {
    if (partie.annulations <= 0 || partie.historique.length === 0) return false;

    const avant = partie.historique.pop();
    partie.grille = avant.grille;
    partie.score = avant.score;
    partie.coups = avant.coups;
    partie.objectifAtteint = avant.objectifAtteint;
    partie.hasard.reprendre(avant.hasard);
    partie.terminee = false;
    partie.annulations--;
    return true;
}

export const tuileMax = partie => meilleureTuile(partie.grille);

export const peutAnnuler = partie => partie.annulations > 0 && partie.historique.length > 0;

// Serialisation : on garde l'historique aussi, sinon un rechargement effacerait
// discretement les annulations restantes.
export function serialiser(partie) {
    return {
        taille: partie.taille,
        graine: partie.graine,
        hasard: partie.hasard.etat(),
        grille: partie.grille,
        score: partie.score,
        coups: partie.coups,
        annulations: partie.annulations,
        historique: partie.historique,
        objectifAtteint: partie.objectifAtteint,
        terminee: partie.terminee,
        enregistree: partie.enregistree,
        prochainId: partie.prochainId
    };
}

// Rend `null` sur des donnees abimees plutot que de laisser une grille bancale
// atteindre le moteur : le stockage vient du navigateur, pas du jeu.
export function relire(donnees) {
    if (!donnees || !TAILLES.includes(donnees.taille)) return null;

    const attendu = donnees.taille * donnees.taille;
    if (!Array.isArray(donnees.grille) || donnees.grille.length !== attendu) return null;

    const grille = donnees.grille.map(tuile => {
        if (!tuile) return null;
        const { id, valeur } = tuile;
        if (!Number.isFinite(id) || !Number.isFinite(valeur) || valeur < 2) return null;
        return { id, valeur };
    });

    const partie = {
        taille: donnees.taille,
        graine: donnees.graine >>> 0,
        hasard: creerHasard(donnees.hasard >>> 0),
        grille,
        score: Math.max(0, Number(donnees.score) || 0),
        coups: Math.max(0, Number(donnees.coups) || 0),
        annulations: Math.min(ANNULATIONS, Math.max(0, Number(donnees.annulations) || 0)),
        historique: Array.isArray(donnees.historique) ? donnees.historique.slice(-ANNULATIONS) : [],
        objectifAtteint: Boolean(donnees.objectifAtteint),
        terminee: Boolean(donnees.terminee),
        enregistree: Boolean(donnees.enregistree),
        prochainId: Math.max(1, Number(donnees.prochainId) || 1)
    };

    // Une grille vide n'arrive que si le stockage a ete tronque en cours
    // d'ecriture ; mieux vaut une partie neuve qu'un plateau fantome.
    if (casesLibres(partie.grille).length === attendu) return null;
    return partie;
}
