// La grille du jour : la meme suite de tuiles pour tout le monde, sans serveur.
//
// Personne ne distribue la graine — chaque navigateur la retrouve seul a partir
// de la date. Le generateur du jeu etant deterministe, deux joueurs qui jouent
// les memes coups voient exactement les memes tuiles apparaitre aux memes
// endroits. C'est aussi la limite assumee : l'horloge de la machine fait foi,
// et se tricher soi-meme est possible et sans interet.
//
// Rien ici ne touche au DOM ni au stockage : tout se teste en Node.

import { TAILLE_DU_JOUR, URL_JEU } from './config.js';

const FORME = /^\d{4}-\d{2}-\d{2}$/;

// La date locale, pas UTC : le jour change a minuit chez le joueur.
export function aujourdhui(date = new Date()) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
}

// Une date bien formee ne suffit pas : 2026-02-31 s'ecrit sans peine et ne
// designe rien. On la reconstruit pour verifier qu'elle existe.
export function estJour(valeur) {
    if (!FORME.test(valeur || '')) return false;
    const [annee, mois, jour] = valeur.split('-').map(Number);
    const date = new Date(annee, mois - 1, jour);
    return date.getFullYear() === annee && date.getMonth() === mois - 1 && date.getDate() === jour;
}

// FNV-1a, comme dans les autres jeux du dossier : court, deterministe, et
// identique en Node et dans le navigateur — donc testable.
export function hacher(texte) {
    let valeur = 2166136261;
    for (const caractere of String(texte)) {
        valeur ^= caractere.codePointAt(0);
        valeur = Math.imul(valeur, 16777619);
    }
    valeur ^= valeur >>> 16;
    valeur = Math.imul(valeur, 0x21f0aaad);
    valeur ^= valeur >>> 15;
    valeur = Math.imul(valeur, 0x735a2d97);
    return (valeur ^ (valeur >>> 15)) >>> 0;
}

// Le prefixe evite qu'une meme date donne la meme graine dans deux jeux du
// dossier : ce serait sans consequence, mais c'est gratuit.
export const graineDuJour = jour => hacher(`2048:${jour}`);

export const formaterJour = jour => jour.split('-').reverse().join('/');

// 2026-08-25 -> « 25 août ». Le libelle du bandeau, ou l'annee est de trop.
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function libelleCourt(jour) {
    const [, mois, date] = jour.split('-').map(Number);
    return `${date} ${MOIS[mois - 1]}`;
}

// ------------------------------------------------------------------ l'adresse

// Une adresse porte soit un jour, soit une graine libre — jamais un resultat.
export function lireRoute(recherche) {
    let parametres;
    try {
        parametres = new URLSearchParams(recherche);
    } catch {
        return null;                       // adresse illisible : partie libre
    }

    const jour = parametres.get('jour');
    if (estJour(jour)) return { jour, graine: graineDuJour(jour), taille: TAILLE_DU_JOUR };

    // Un parametre absent vaut `null`, et `Number(null)` vaut zero : sans ce
    // filtre, toute adresse sans graine passerait pour la graine 0.
    const entier = nom => (/^\d+$/.test(parametres.get(nom) ?? '') ? Number(parametres.get(nom)) : null);

    const graine = entier('seed');
    if (graine === null || graine > 0xFFFFFFFF) return null;

    return { jour: null, graine, taille: entier('taille') };
}

export function lienDuJour(jour, base = URL_JEU) {
    return `${base}?jour=${jour}`;
}

export function lienDeGraine(graine, taille, base = URL_JEU) {
    return `${base}?seed=${graine >>> 0}&taille=${taille}`;
}

// ------------------------------------------------------------------ la serie

// Le nombre de jours entre deux dates. Midi UTC plutot que minuit : un
// changement d'heure ne fera jamais basculer le calcul d'un jour.
export function ecartJours(depuis, jusqua) {
    return Math.round((Date.parse(`${jusqua}T12:00:00Z`) - Date.parse(`${depuis}T12:00:00Z`)) / 86400000);
}

// La serie ne compte que les jours consecutifs. Un jour saute la remet a un —
// pas a zero : le defi du jour vient d'etre releve.
export function serieApres(dernierJour, serie, jour) {
    return dernierJour && ecartJours(dernierJour, jour) === 1 ? (serie || 0) + 1 : 1;
}

// ------------------------------------------------------------------ le partage

// La progression en carres : un par doublement a partir de 8, la couleur suit
// les paliers de la rampe. Une partie qui monte a 2048 en aligne neuf — la
// barre grandit avec le joueur, sans jamais dire le score.
const BANDES = [
    { jusqua: 16, carre: '🟨' },
    { jusqua: 64, carre: '🟧' },
    { jusqua: 256, carre: '🟥' },
    { jusqua: 1024, carre: '🟪' },
    { jusqua: 4096, carre: '🟦' },
    { jusqua: Infinity, carre: '🟩' }
];

export function barreDeProgression(tuile) {
    const carres = [];
    for (let valeur = 8; valeur <= tuile; valeur *= 2) {
        carres.push(BANDES.find(bande => valeur <= bande.jusqua).carre);
    }
    return carres.join('');
}

const espacer = nombre => nombre.toLocaleString('fr-FR');

// Le lien porte la date ou la graine, jamais le score : celui qui l'ouvre
// trouve la grille intacte.
export function messageDePartage({ jour, graine, taille, score, tuile, coups, serie = 0 }, base = URL_JEU) {
    const lignes = [
        jour ? `2048 · grille du ${formaterJour(jour)}` : `2048 · grille ${taille}×${taille}`,
        `${espacer(score)} points · meilleure tuile ${espacer(tuile)} · ${coups} coups`
    ];

    const barre = barreDeProgression(tuile);
    if (barre) lignes.push(barre);
    if (jour && serie > 1) lignes.push(`Série : ${serie} jours`);
    lignes.push(jour ? lienDuJour(jour, base) : lienDeGraine(graine, taille, base));

    return lignes.join('\n');
}
