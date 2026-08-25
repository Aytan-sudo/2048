// L'interface autour du plateau : compteurs, dialogues, reglages.
//
// Tout ce qui lit ou ecrit dans la page passe par ici. app.js orchestre la
// partie et ne manipule jamais un element a la main.

import { VERSION } from './config.js';
import { libelleCourt } from './defi.js';
import { TAILLES, ANNULATIONS, objectifDe } from './partie.js';
import { recordDe } from './storage.js';
import { THEMES, AUTO, paletteDe, themeEffectif } from './themes.js';

const $ = id => document.getElementById(id);

export const elements = {
    plateau: $('plateau'),
    cellules: $('cellules'),
    couche: $('tuiles'),
    boiteScore: $('boite-score'),
    valeurScore: $('valeur-score'),
    valeurRecord: $('valeur-record'),
    objectif: $('valeur-objectif'),
    annonce: $('annonce'),
    boutonAnnuler: $('bouton-annuler'),
    restantes: $('annulations-restantes'),
    boutonRejouer: $('bouton-rejouer'),
    boutonTheme: $('bouton-theme'),
    boutonReglages: $('bouton-reglages'),
    boutonAide: $('bouton-aide'),
    boutonJour: $('bouton-jour'),
    bandeauJour: $('bandeau-jour'),
    dialogueFin: $('dialogue-fin'),
    finTitre: $('fin-titre'),
    finDetail: $('fin-detail'),
    finRecord: $('fin-record'),
    finPartager: $('fin-partager'),
    finAnnuler: $('fin-annuler'),
    finRejouer: $('fin-rejouer'),
    finContinuer: $('fin-continuer'),
    dialogueReglages: $('dialogue-reglages'),
    segmentsTaille: $('segments-taille'),
    palettes: $('palettes'),
    optionContinuer: $('option-continuer'),
    optionSons: $('option-sons'),
    optionVibration: $('option-vibration'),
    listeRecords: $('liste-records'),
    defiSerie: $('defi-serie'),
    defiRecordSerie: $('defi-record-serie'),
    defiRelevees: $('defi-relevees'),
    defiMeilleur: $('defi-meilleur'),
    version: $('version'),
    effacerRecords: $('effacer-records'),
    dialogueAide: $('dialogue-aide')
};

// Les scores se lisent par milliers, pas les tuiles : dans un jeu qui
// s'appelle 2048, ecrire « 2 048 » sur une tuile serait une faute.
export const nombre = valeur => valeur.toLocaleString('fr-FR');

// Les segments sont construits en JavaScript : la liste des tailles et celle
// des themes vivent deja dans les modules, les recopier dans le HTML serait la
// premiere chose a se desynchroniser.
export function construireSegments(surTaille, surTheme) {
    elements.segmentsTaille.replaceChildren(...TAILLES.map(taille => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'segment';
        bouton.dataset.taille = String(taille);
        bouton.innerHTML = `${taille}×${taille}<small>${objectifDe(taille)}</small>`;
        bouton.addEventListener('click', () => surTaille(taille));
        return bouton;
    }));

    // Une pastille par palette, plus le mode systeme en dernier : on choisit
    // une ambiance en la voyant, pas en lisant son nom.
    const choix = [...THEMES, { id: AUTO, nom: 'Système' }];
    elements.palettes.replaceChildren(...choix.map(theme => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'pastille-theme';
        bouton.dataset.theme = theme.id;
        bouton.setAttribute('aria-label', theme.id === AUTO
            ? 'Suivre la palette du système'
            : `Palette ${theme.nom}`);

        const rondelle = document.createElement('span');
        rondelle.className = 'rondelle';
        bouton.append(rondelle, theme.nom);
        bouton.addEventListener('click', () => surTheme(theme.id));
        return bouton;
    }));
}

const marquer = (groupe, attribut, valeur) => {
    for (const bouton of groupe.children) {
        bouton.classList.toggle('actif', bouton.dataset[attribut] === String(valeur));
    }
};

export function majReglages(preferences) {
    marquer(elements.segmentsTaille, 'taille', preferences.taille);
    marquer(elements.palettes, 'theme', preferences.theme);
    elements.optionContinuer.checked = preferences.continuer;
    elements.optionSons.checked = preferences.sons;
    elements.optionVibration.checked = preferences.vibration;
    elements.boutonTheme.setAttribute('aria-label',
        `Changer de palette, actuellement ${paletteDe(themeEffectif(preferences.theme)).nom}`);
}

export function majScore(partie, record) {
    elements.valeurScore.textContent = nombre(partie.score);
    elements.valeurRecord.textContent = nombre(record);
    elements.objectif.textContent = String(objectifDe(partie.taille));
}

export function majAnnulations(partie) {
    const reste = partie.annulations;
    const possible = reste > 0 && partie.historique.length > 0;
    elements.boutonAnnuler.disabled = !possible;
    elements.restantes.textContent = String(reste);
    elements.boutonAnnuler.setAttribute('aria-label',
        reste > 0 ? `Annuler le dernier coup, ${reste} sur ${ANNULATIONS} restantes` : 'Plus d\'annulation disponible');
}

export function annoncer(texte) {
    elements.annonce.textContent = texte;
}

// Le bandeau dit sur quelle grille on joue, et le bouton d'en-tete reste
// allume tant qu'on y est. Une grille du jour rouverte plus tard redonne la
// meme suite de tuiles, mais ne compte plus pour la serie : autant le dire.
export function majContexte(contexte) {
    const surLeJour = Boolean(contexte.jour);
    elements.bandeauJour.hidden = !surLeJour;
    if (surLeJour) {
        elements.bandeauJour.textContent = contexte.compte
            ? `Grille du jour · ${libelleCourt(contexte.jour)}`
            : `Grille du ${libelleCourt(contexte.jour)} · hors série`;
    }
    elements.boutonJour.classList.toggle('actif', surLeJour && contexte.compte);
    elements.boutonJour.setAttribute('aria-pressed', String(surLeJour && contexte.compte));
}

export function majDefi(defi) {
    const scores = Object.values(defi.resultats).map(resultat => resultat.score);
    elements.defiSerie.textContent = String(defi.serie || 0);
    elements.defiRecordSerie.textContent = String(defi.meilleureSerie || 0);
    elements.defiRelevees.textContent = String(scores.length);
    elements.defiMeilleur.textContent = scores.length ? nombre(Math.max(...scores)) : '—';
}

export function majVersion() {
    elements.version.textContent = `2048 ${VERSION}`;
}

export function majRecords(records) {
    const lignes = TAILLES.map(taille => {
        const record = recordDe(records, taille);
        const element = document.createElement('li');
        element.innerHTML = record.parties
            ? `<span>${taille}×${taille}</span><strong>${nombre(record.score)}</strong>`
                + `<small>tuile ${record.tuile} · ${record.parties} partie${record.parties > 1 ? 's' : ''}</small>`
            : `<span>${taille}×${taille}</span><strong>—</strong><small>jamais jouée</small>`;
        return element;
    });
    elements.listeRecords.replaceChildren(...lignes);
}

export function ouvrir(dialogue) {
    if (!dialogue.open) dialogue.showModal();
}

export function fermer(dialogue) {
    if (dialogue.open) dialogue.close();
}

// Les boutons marques `data-fermer` referment le dialogue qui les contient,
// sans qu'aucun d'eux ait besoin de son propre gestionnaire.
export function brancherFermetures() {
    for (const bouton of document.querySelectorAll('[data-fermer]')) {
        bouton.addEventListener('click', () => fermer(bouton.closest('dialog')));
    }
}
