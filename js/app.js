// L'assemblage : une partie, un affichage, des entrees.
//
// Le fil est toujours le meme — on joue un coup dans le modele, on demande a
// l'affichage de le montrer, on range le resultat. Aucune regle de jeu ne vit
// ici.
//
// Deux grilles cohabitent : la partie libre, avec sa graine tiree au sort et
// son palmares par taille, et la grille du jour, la meme pour tout le monde,
// avec sa serie. Le `contexte` dit sur laquelle on est, et c'est lui qui
// decide ou la partie se range.

import { TAILLE_DU_JOUR } from './config.js';
import { TAILLES, creerPartie, jouer, annuler, serialiser, relire, objectifDe, tuileMax, peutAnnuler } from './partie.js';
import { graineAleatoire } from './hasard.js';
import { creerRendu, afficherGain } from './rendu.js';
import {
    sonFusion, sonPalier, sonObjectif, sonRefus, sonAnnulation, sonFin,
    preparerSon, surveillerVisibilite
} from './son.js';
import { ecouterClavier, ecouterGestes } from './entree.js';
import { AUTO, appliquerTheme, themeSuivant } from './themes.js';
import {
    aujourdhui, graineDuJour, lireRoute, lienDuJour, lienDeGraine,
    messageDePartage, serieApres
} from './defi.js';
import {
    chargerPreferences, enregistrerPreferences,
    chargerRecords, recordDe, enregistrerFin, effacerRecords,
    chargerPartie, enregistrerPartie, oublierPartie,
    chargerDefi, enregistrerDefi, retenirResultat, effacerDefi
} from './storage.js';
import * as ui from './ui.js';

let preferences = chargerPreferences();
let records = chargerRecords();
let defi = chargerDefi();
let partie = null;

// Sur quelle grille on joue. `jour` porte une date quand la grille vient d'un
// jour donne ; `compte` n'est vrai que pour la grille d'aujourd'hui — un lien
// du jour rouvert plus tard redonne la grille, hors serie.
let contexte = { jour: null, compte: false };

// En deca de 128, les paliers s'enchainent trop vite pour meriter une fanfare.
const PALIER = 128;

const rendu = creerRendu({
    plateau: ui.elements.plateau,
    cellules: ui.elements.cellules,
    couche: ui.elements.couche
});

const meilleurDefi = () =>
    Object.values(defi.resultats).reduce((record, resultat) => Math.max(record, resultat.score), 0);

// Le « Record » affiche celui du palmares auquel la partie appartient : sur la
// grille du jour, comparer son score a un record personnel n'aurait aucun sens.
const meilleurAffiche = () => Math.max(
    contexte.jour ? meilleurDefi() : recordDe(records, partie.taille).score,
    partie.score);

const vibrer = motif => {
    if (preferences.vibration && navigator.vibrate) navigator.vibrate(motif);
};

const sonner = (jouerLeSon, ...arguments_) => {
    if (preferences.sons) jouerLeSon(...arguments_);
};

function ranger() {
    const donnees = { ...serialiser(partie), jour: contexte.jour };
    if (contexte.compte) {
        defi = { ...defi, partie: donnees };
        enregistrerDefi(defi);
    } else {
        enregistrerPartie(donnees);
    }
}

function rafraichir() {
    ui.majScore(partie, meilleurAffiche());
    ui.majAnnulations(partie);
}

// L'adresse suit la grille en cours : elle se copie et se partage telle
// quelle. Elle ne porte jamais un score, seulement de quoi refabriquer la
// grille.
function synchroniserAdresse() {
    const requete = contexte.jour
        ? lienDuJour(contexte.jour, '')
        : lienDeGraine(partie.graine, partie.taille, '');
    try {
        history.replaceState({}, '', `${location.pathname}${requete}`);
    } catch { /* adresse verrouillee : le jeu s'en passe */ }
}

// Pose une partie sur la table, quelle que soit sa provenance.
function poser(nouvelle, nouveauContexte) {
    partie = nouvelle;
    contexte = nouveauContexte;
    rendu.dessiner(partie);
    rafraichir();
    ui.majContexte(contexte);
    ui.annoncer('');
    ui.fermer(ui.elements.dialogueFin);
    synchroniserAdresse();
}

function nouvellePartie(taille = preferences.taille) {
    poser(creerPartie(taille, graineAleatoire()), { jour: null, compte: false });
    ranger();
}

// La grille du jour. Celle d'aujourd'hui se reprend la ou elle en etait ; une
// grille passee se refabrique a l'identique, mais hors serie.
function grilleDuJour(jour = aujourdhui()) {
    const compte = jour === aujourdhui();
    const reprise = compte && defi.partie?.jour === jour ? relire(defi.partie) : null;

    if (reprise) {
        poser(reprise, { jour, compte });
    } else {
        poser(creerPartie(TAILLE_DU_JOUR, graineDuJour(jour)), { jour, compte });
        ranger();
    }
    if (partie.terminee) afficherFin(null);
}

// La partie libre reprend la ou elle etait. Une adresse qui porte une graine ne
// relance une grille neuve que si ce n'est pas deja celle qui est enregistree :
// sinon un simple rechargement effacerait la partie en cours.
function partieLibre(route = null) {
    const donnees = chargerPartie();
    const reprise = relire(donnees);
    const taille = route && TAILLES.includes(route.taille) ? route.taille : preferences.taille;

    if (reprise && reprise.taille === taille && (!route || reprise.graine === route.graine)) {
        poser(reprise, { jour: donnees.jour ?? null, compte: false });
        if (partie.terminee) afficherFin(null);
        return;
    }

    oublierPartie();
    poser(creerPartie(taille, route ? route.graine : graineAleatoire()), { jour: null, compte: false });
    ranger();
}

// Le bouton d'en-tete fait l'aller-retour : on part sur la grille du jour, on
// revient a sa partie libre, qui n'a pas bouge.
const basculerJour = () => (contexte.compte ? partieLibre() : grilleDuJour());

// La fin de partie est enregistree une seule fois : annuler le coup fatal puis
// reperdre ne doit pas compter deux parties.
function conclure() {
    if (!partie.enregistree) {
        partie.enregistree = true;
        afficherFin(contexte.compte ? conclureLeJour() : conclureLibre());
    } else {
        afficherFin(null);
    }
    ranger();
    sonner(sonFin);
    vibrer([18, 60, 18]);
}

function conclureLibre() {
    const bilan = enregistrerFin(partie.taille, partie.score, tuileMax(partie));
    records = chargerRecords();
    return bilan;
}

// Seul le premier resultat compte : une grille du jour se releve une fois. La
// rejouer en connaissant la suite des tuiles n'aurait pas grand interet, et le
// palmares garde de toute facon le premier essai.
function conclureLeJour() {
    if (defi.resultats[contexte.jour]) return null;

    const serie = serieApres(defi.dernierJour, defi.serie, contexte.jour);
    defi = retenirResultat(defi, contexte.jour, {
        score: partie.score,
        tuile: tuileMax(partie),
        coups: partie.coups
    }, serie);
    enregistrerDefi(defi);
    return { jour: contexte.jour, serie };
}

function afficherFin(bilan) {
    ui.elements.finTitre.textContent = 'Plus aucun coup';
    ui.elements.finDetail.textContent =
        `${ui.nombre(partie.score)} points · meilleure tuile ${tuileMax(partie)} · ${partie.coups} coups`;

    ui.elements.finRecord.hidden = !bilan || (!bilan.jour && !bilan.record && !bilan.nouvelleTuile);
    if (bilan?.jour) {
        ui.elements.finRecord.textContent = bilan.serie > 1
            ? `Grille du jour relevée · ${bilan.serie} jours d'affilée`
            : 'Grille du jour relevée';
    } else if (bilan?.record) {
        ui.elements.finRecord.textContent = bilan.ancien
            ? `Nouveau record en ${partie.taille}×${partie.taille} : ${ui.nombre(bilan.ancien)} → ${ui.nombre(partie.score)}`
            : `Premier record en ${partie.taille}×${partie.taille}`;
    } else if (bilan?.nouvelleTuile) {
        ui.elements.finRecord.textContent = `Plus grosse tuile jamais atteinte en ${partie.taille}×${partie.taille}`;
    }

    ui.elements.finAnnuler.hidden = !peutAnnuler(partie);
    ui.elements.finContinuer.hidden = true;
    ui.elements.finRejouer.textContent = 'Nouvelle partie';
    ui.annoncer(`Partie terminée. ${ui.nombre(partie.score)} points.`);
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
    sonner(sonObjectif);
    vibrer([12, 40, 12, 40, 24]);
}

function coup(direction) {
    if (!partie || partie.terminee) return;

    // La plus grosse tuile d'avant le coup : c'est elle qui dit si une fusion
    // atteint un palier jamais vu dans cette partie.
    const sommet = tuileMax(partie);

    const resultat = jouer(partie, direction);
    if (!resultat) {             // rien n'a bouge : ni tuile, ni tour consomme
        sonner(sonRefus);
        return;
    }

    rendu.appliquer(partie, resultat);
    afficherGain(ui.elements.boiteScore, resultat.gain);
    resultat.fusions.forEach((fusion, rang) => {
        sonner(sonFusion, fusion.valeur, rang);
        if (fusion.valeur > sommet && fusion.valeur >= PALIER) sonner(sonPalier, fusion.valeur, rang);
    });
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
    sonner(sonAnnulation);
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
    const texte = messageDePartage({
        jour: contexte.jour,
        graine: partie.graine,
        taille: partie.taille,
        score: partie.score,
        tuile: tuileMax(partie),
        coups: partie.coups,
        serie: contexte.compte ? defi.serie : 0
    });

    try {
        if (navigator.share) await navigator.share({ text: texte });
        else {
            await navigator.clipboard.writeText(texte);
            ui.annoncer('Résultat copié dans le presse-papier.');
        }
    } catch { /* partage refuse ou presse-papier interdit : rien a signaler */ }
}

function brancher() {
    ui.construireSegments(changerTaille, changerTheme);
    ui.brancherFermetures();
    ui.majVersion();

    ecouterGestes(ui.elements.plateau, coup);
    ecouterClavier({
        surDirection: coup,
        raccourcis: {
            annuler: annulerCoup,
            u: annulerCoup,
            n: () => nouvellePartie(),
            r: () => nouvellePartie(),
            t: () => changerTheme(themeSuivant(preferences.theme)),
            '?': () => ui.ouvrir(ui.elements.dialogueAide)
        }
    });

    ui.elements.boutonAnnuler.addEventListener('click', annulerCoup);
    ui.elements.boutonRejouer.addEventListener('click', () => nouvellePartie());
    ui.elements.boutonTheme.addEventListener('click', () => changerTheme(themeSuivant(preferences.theme)));
    ui.elements.boutonAide.addEventListener('click', () => ui.ouvrir(ui.elements.dialogueAide));
    ui.elements.boutonJour.addEventListener('click', basculerJour);

    ui.elements.boutonReglages.addEventListener('click', () => {
        ui.majRecords(records);
        ui.majDefi(defi);
        ui.ouvrir(ui.elements.dialogueReglages);
    });

    ui.elements.finRejouer.addEventListener('click', () => nouvellePartie());
    ui.elements.finAnnuler.addEventListener('click', annulerCoup);
    ui.elements.finContinuer.addEventListener('click', () => ui.fermer(ui.elements.dialogueFin));
    ui.elements.finPartager.addEventListener('click', partager);

    ui.elements.optionSons.addEventListener('change', evenement => {
        preferences = { ...preferences, sons: evenement.target.checked };
        enregistrerPreferences(preferences);
        // Une note en guise d'accuse de reception : on entend ce qu'on active.
        if (preferences.sons) sonFusion(64);
    });
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
        effacerDefi();
        records = chargerRecords();
        defi = chargerDefi();
        ui.majRecords(records);
        ui.majDefi(defi);
        rafraichir();
    });

    // Le systeme peut basculer du clair au sombre pendant la partie ; tant que
    // le joueur n'a pas choisi de palette, la page suit.
    if (typeof matchMedia === 'function') {
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (preferences.theme !== AUTO) return;
            appliquerTheme(preferences.theme);
            ui.majReglages(preferences);
        });
    }
}

function demarrer() {
    appliquerTheme(preferences.theme);
    brancher();

    const route = lireRoute(location.search);
    if (route?.jour) grilleDuJour(route.jour);
    else partieLibre(route);

    ui.majReglages(preferences);
    preparerSon(document, () => preferences.sons);
    surveillerVisibilite(document);

    if ('serviceWorker' in navigator) {
        addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne indisponible */ }));
    }
}

demarrer();
