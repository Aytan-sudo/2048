// L'assemblage : une partie, un affichage, des entrees.
//
// Le fil est toujours le meme — on joue un coup dans le modele, on demande a
// l'affichage de le montrer, on range le resultat. Aucune regle de jeu ne vit
// ici.

import { creerPartie, jouer, annuler, serialiser, relire, objectifDe, tuileMax, peutAnnuler } from './partie.js';
import { creerRendu, afficherGain } from './rendu.js';
import { ecouterClavier, ecouterGestes } from './entree.js';
import { appliquerTheme, themeSuivant } from './themes.js';
import {
    chargerPreferences, enregistrerPreferences,
    chargerRecords, recordDe, enregistrerFin, effacerRecords,
    chargerPartie, enregistrerPartie, oublierPartie
} from './storage.js';
import * as ui from './ui.js';

let preferences = chargerPreferences();
let records = chargerRecords();
let partie = null;

const rendu = creerRendu({
    plateau: ui.elements.plateau,
    cellules: ui.elements.cellules,
    couche: ui.elements.couche
});

const meilleurAffiche = () => Math.max(recordDe(records, partie.taille).score, partie.score);

const vibrer = motif => {
    if (preferences.vibration && navigator.vibrate) navigator.vibrate(motif);
};

const ranger = () => enregistrerPartie(serialiser(partie));

function rafraichir() {
    ui.majScore(partie, meilleurAffiche());
    ui.majAnnulations(partie);
}

function nouvellePartie(taille = preferences.taille) {
    partie = creerPartie(taille);
    rendu.dessiner(partie);
    rafraichir();
    ui.annoncer('');
    ui.fermer(ui.elements.dialogueFin);
    ranger();
}

// La fin de partie est enregistree une seule fois : annuler le coup fatal puis
// reperdre ne doit pas compter deux parties.
function conclure() {
    if (!partie.enregistree) {
        const bilan = enregistrerFin(partie.taille, partie.score, tuileMax(partie));
        partie.enregistree = true;
        records = chargerRecords();
        afficherFin(bilan);
    } else {
        afficherFin(null);
    }
    ranger();
    vibrer([18, 60, 18]);
}

function afficherFin(bilan) {
    const record = recordDe(records, partie.taille);
    ui.elements.finTitre.textContent = 'Plus aucun coup';
    ui.elements.finDetail.textContent =
        `${ui.nombre(partie.score)} points · meilleure tuile ${tuileMax(partie)} · ${partie.coups} coups`;

    ui.elements.finRecord.hidden = !bilan || (!bilan.record && !bilan.nouvelleTuile);
    if (bilan?.record) {
        ui.elements.finRecord.textContent = bilan.ancien
            ? `Nouveau record en ${partie.taille}×${partie.taille} : ${ui.nombre(bilan.ancien)} → ${ui.nombre(partie.score)}`
            : `Premier record en ${partie.taille}×${partie.taille}`;
    } else if (bilan?.nouvelleTuile) {
        ui.elements.finRecord.textContent = `Plus grosse tuile jamais atteinte en ${partie.taille}×${partie.taille}`;
    }

    ui.elements.finAnnuler.hidden = !peutAnnuler(partie);
    ui.elements.finContinuer.hidden = true;
    ui.elements.finRejouer.textContent = 'Rejouer';
    ui.annoncer(`Partie terminée. ${ui.nombre(partie.score)} points, record ${ui.nombre(record.score)}.`);
    ui.ouvrir(ui.elements.dialogueFin);
}

function afficherVictoire() {
    ui.elements.finTitre.textContent = `${objectifDe(partie.taille)} !`;
    ui.elements.finDetail.textContent =
        `Objectif atteint en ${partie.coups} coups, ${ui.nombre(partie.score)} points. La grille tient encore.`;
    ui.elements.finRecord.hidden = true;
    ui.elements.finAnnuler.hidden = true;
    ui.elements.finContinuer.hidden = false;
    ui.elements.finRejouer.textContent = 'Nouvelle partie';
    ui.ouvrir(ui.elements.dialogueFin);
    vibrer([12, 40, 12, 40, 24]);
}

function coup(direction) {
    if (!partie || partie.terminee) return;

    const resultat = jouer(partie, direction);
    if (!resultat) return;       // rien n'a bouge : ni tuile, ni tour consomme

    rendu.appliquer(partie, resultat);
    afficherGain(ui.elements.boiteScore, resultat.gain);
    if (resultat.fusions.length) vibrer(10);
    rafraichir();
    ranger();

    if (resultat.objectif && !preferences.continuer) {
        setTimeout(afficherVictoire, 260);
        return;
    }
    if (partie.terminee) setTimeout(conclure, 260);
}

function annulerCoup() {
    if (!annuler(partie)) return;

    rendu.dessiner(partie);
    rafraichir();
    ranger();
    ui.fermer(ui.elements.dialogueFin);
    ui.annoncer(`Coup annulé, ${partie.annulations} annulation${partie.annulations > 1 ? 's' : ''} restante${partie.annulations > 1 ? 's' : ''}.`);
}

function changerTaille(taille) {
    preferences = { ...preferences, taille };
    enregistrerPreferences(preferences);
    ui.majReglages(preferences);
    nouvellePartie(taille);
}

function changerTheme(theme) {
    preferences = { ...preferences, theme };
    enregistrerPreferences(preferences);
    appliquerTheme(theme);
    ui.majReglages(preferences);
}

async function partager() {
    const texte = `2048 — grille ${partie.taille}×${partie.taille}\n`
        + `${ui.nombre(partie.score)} points · meilleure tuile ${tuileMax(partie)} · ${partie.coups} coups`;
    const url = location.href.split('#')[0];

    try {
        if (navigator.share) await navigator.share({ text: texte, url });
        else {
            await navigator.clipboard.writeText(`${texte}\n${url}`);
            ui.annoncer('Résultat copié dans le presse-papier.');
        }
    } catch { /* partage refuse ou presse-papier interdit : rien a signaler */ }
}

function brancher() {
    ui.construireSegments(changerTaille, changerTheme);
    ui.brancherFermetures();

    ecouterGestes(ui.elements.plateau, coup);
    ecouterClavier({
        surDirection: coup,
        raccourcis: {
            annuler: annulerCoup,
            u: annulerCoup,
            r: () => nouvellePartie(),
            t: () => changerTheme(themeSuivant(preferences.theme)),
            '?': () => ui.ouvrir(ui.elements.dialogueAide)
        }
    });

    ui.elements.boutonAnnuler.addEventListener('click', annulerCoup);
    ui.elements.boutonRejouer.addEventListener('click', () => nouvellePartie());
    ui.elements.boutonTheme.addEventListener('click', () => changerTheme(themeSuivant(preferences.theme)));
    ui.elements.boutonAide.addEventListener('click', () => ui.ouvrir(ui.elements.dialogueAide));

    ui.elements.boutonReglages.addEventListener('click', () => {
        ui.majRecords(records);
        ui.ouvrir(ui.elements.dialogueReglages);
    });

    ui.elements.finRejouer.addEventListener('click', () => nouvellePartie());
    ui.elements.finAnnuler.addEventListener('click', annulerCoup);
    ui.elements.finContinuer.addEventListener('click', () => ui.fermer(ui.elements.dialogueFin));
    ui.elements.finPartager.addEventListener('click', partager);

    ui.elements.optionContinuer.addEventListener('change', evenement => {
        preferences = { ...preferences, continuer: evenement.target.checked };
        enregistrerPreferences(preferences);
    });
    ui.elements.optionVibration.addEventListener('change', evenement => {
        preferences = { ...preferences, vibration: evenement.target.checked };
        enregistrerPreferences(preferences);
    });

    ui.elements.effacerRecords.addEventListener('click', () => {
        effacerRecords();
        records = chargerRecords();
        ui.majRecords(records);
        rafraichir();
    });

    // Le systeme peut changer de theme pendant la partie ; tant que le joueur
    // n'a rien choisi, la page suit.
    if (typeof matchMedia === 'function') {
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (preferences.theme === 'auto') ui.majReglages(preferences);
        });
    }
}

function demarrer() {
    appliquerTheme(preferences.theme);
    brancher();

    // Une partie en cours reprend la ou elle etait, sauf si elle vient d'une
    // autre taille de grille que celle choisie depuis.
    const reprise = relire(chargerPartie());
    if (reprise && reprise.taille === preferences.taille) {
        partie = reprise;
        rendu.dessiner(partie);
        rafraichir();
        if (partie.terminee) afficherFin(null);
    } else {
        oublierPartie();
        nouvellePartie();
    }

    ui.majReglages(preferences);

    if ('serviceWorker' in navigator) {
        addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne indisponible */ }));
    }
}

demarrer();
