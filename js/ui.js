// L'interface autour du plateau : compteurs, dialogues, reglages.
//
// Tout ce qui lit ou ecrit dans la page passe par ici. app.js orchestre la
// partie et ne manipule jamais un element a la main.

import { TAILLES, ANNULATIONS, objectifDe } from './partie.js';
import { recordDe } from './storage.js';
import { THEMES, themeEffectif } from './themes.js';

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
    segmentsTheme: $('segments-theme'),
    optionContinuer: $('option-continuer'),
    optionVibration: $('option-vibration'),
    listeRecords: $('liste-records'),
    effacerRecords: $('effacer-records'),
    dialogueAide: $('dialogue-aide')
};

// Les scores se lisent par milliers, pas les tuiles : dans un jeu qui
// s'appelle 2048, ecrire « 2 048 » sur une tuile serait une faute.
export const nombre = valeur => valeur.toLocaleString('fr-FR');

const LIBELLES_THEME = { auto: 'Système', clair: 'Clair', sombre: 'Sombre' };

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

    elements.segmentsTheme.replaceChildren(...THEMES.map(theme => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'segment';
        bouton.dataset.theme = theme;
        bouton.textContent = LIBELLES_THEME[theme];
        bouton.addEventListener('click', () => surTheme(theme));
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
    marquer(elements.segmentsTheme, 'theme', preferences.theme);
    elements.optionContinuer.checked = preferences.continuer;
    elements.optionVibration.checked = preferences.vibration;
    elements.boutonTheme.setAttribute('aria-label',
        themeEffectif(preferences.theme) === 'sombre' ? 'Passer au thème clair' : 'Passer au thème sombre');
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
