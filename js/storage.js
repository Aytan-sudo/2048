// Preferences, records et partie en cours, dans le localStorage.
//
// Un record est classe par taille de grille : un score de 20 000 en 6x6 et le
// meme en 3x3 n'ont rien a voir, les melanger dans un seul palmares reviendrait
// a rendre les petites grilles definitivement decevantes.

const CLE_PREFERENCES = '2048.preferences';
const CLE_RECORDS = '2048.records';
const CLE_PARTIE = '2048.partie';

export const PREFERENCES_PAR_DEFAUT = {
    taille: 4,
    theme: 'auto',        // 'auto' suit le systeme tant que le joueur n'a pas tranche
    continuer: false,     // rester sur la grille apres l'objectif, sans l'annonce
    vibration: true
};

const lire = (cle, secours) => {
    try {
        const brut = localStorage.getItem(cle);
        return brut ? { ...secours, ...JSON.parse(brut) } : { ...secours };
    } catch {
        return { ...secours };   // navigation privee, quota plein : on joue quand meme
    }
};

const ecrire = (cle, valeur) => {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur));
    } catch { /* sans persistance, le jeu reste jouable */ }
};

const effacer = cle => {
    try { localStorage.removeItem(cle); } catch { /* rien a nettoyer */ }
};

export const chargerPreferences = () => lire(CLE_PREFERENCES, PREFERENCES_PAR_DEFAUT);
export const enregistrerPreferences = preferences => ecrire(CLE_PREFERENCES, preferences);

export const chargerRecords = () => lire(CLE_RECORDS, {});

export const recordDe = (records, taille) => records[taille] ?? { score: 0, tuile: 0, parties: 0 };

// Le score et la meilleure tuile progressent separement : une partie peut
// battre l'un sans toucher l'autre, et les deux meritent d'etre gardes.
export function enregistrerFin(taille, score, tuile) {
    const records = chargerRecords();
    const ancien = recordDe(records, taille);

    const suivant = {
        score: Math.max(ancien.score, score),
        tuile: Math.max(ancien.tuile, tuile),
        parties: ancien.parties + 1
    };

    records[taille] = suivant;
    ecrire(CLE_RECORDS, records);

    return {
        record: score > ancien.score,
        ancien: ancien.score,
        nouvelleTuile: tuile > ancien.tuile
    };
}

export function effacerRecords() {
    ecrire(CLE_RECORDS, {});
}

export const chargerPartie = () => {
    try {
        const brut = localStorage.getItem(CLE_PARTIE);
        return brut ? JSON.parse(brut) : null;
    } catch {
        return null;
    }
};

export const enregistrerPartie = donnees => ecrire(CLE_PARTIE, donnees);
export const oublierPartie = () => effacer(CLE_PARTIE);
