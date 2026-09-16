// Preferences, records et partie en cours, dans le localStorage.
//
// Un record est classe par taille de grille : un score de 20 000 en 6x6 et le
// meme en 3x3 n'ont rien a voir, les melanger dans un seul palmares reviendrait
// a rendre les petites grilles definitivement decevantes.

const CLE_PREFERENCES = '2048.preferences';
const CLE_RECORDS = '2048.records';
const CLE_PARTIE = '2048.partie';
const CLE_DEFI = '2048.defi';
const CLE_PASSEPORT = '2048.passeport';

// Ouvert depuis le hub avec un passeport, le jeu range tout dans l'espace du
// joueur ; en mode invite, dans le localStorage, exactement comme avant.
const passeport = globalThis.Passeport?.stockageJeu('2048') ?? null;
const magasin = () => passeport ?? localStorage;

export const SCHEMA_PREFERENCES = 2;

export const PREFERENCES_PAR_DEFAUT = {
    schema: SCHEMA_PREFERENCES,
    taille: 4,
    theme: 'auto',        // 'auto' suit le systeme tant que le joueur n'a pas tranche
    continuer: false,     // rester sur la grille apres l'objectif, sans l'annonce
    sons: true,
    vibration: true
};

// Palier 1 -> 2 : les deux themes d'origine sont devenus cinq palettes nommees.
// Sans cette table, un joueur revenu apres la mise a jour verrait sa preference
// rejetee et retomberait sur le mode systeme.
const THEMES_ANCIENS = { clair: 'sable', sombre: 'nuit' };

const lire = (cle, secours) => {
    try {
        const brut = magasin().getItem(cle);
        return brut ? { ...secours, ...JSON.parse(brut) } : { ...secours };
    } catch {
        return { ...secours };   // navigation privee, quota plein : on joue quand meme
    }
};

const ecrire = (cle, valeur) => {
    try {
        magasin().setItem(cle, JSON.stringify(valeur));
    } catch { /* sans persistance, le jeu reste jouable */ }
};

const effacer = cle => {
    try { magasin().removeItem(cle); } catch { /* rien a nettoyer */ }
};

export function chargerPreferences() {
    const enregistrees = lire(CLE_PREFERENCES, PREFERENCES_PAR_DEFAUT);
    return {
        ...enregistrees,
        theme: THEMES_ANCIENS[enregistrees.theme] ?? enregistrees.theme,
        schema: SCHEMA_PREFERENCES
    };
}

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
        const brut = magasin().getItem(CLE_PARTIE);
        return brut ? JSON.parse(brut) : null;
    } catch {
        return null;
    }
};

export const enregistrerPartie = donnees => ecrire(CLE_PARTIE, donnees);
export const oublierPartie = () => effacer(CLE_PARTIE);

// ------------------------------------------------------------------- le defi
//
// La grille du jour a son propre coin de stockage : la serie, le resultat de
// chaque jour releve, et la partie du jour en cours. Elle ne touche pas au
// palmares des parties libres — un score obtenu sur une grille imposee et un
// record personnel ne concourent pas ensemble.

export const SCHEMA_DEFI = 1;

const DEFI_VIDE = {
    schema: SCHEMA_DEFI,
    serie: 0,
    meilleureSerie: 0,
    dernierJour: null,
    resultats: {},        // 'AAAA-MM-JJ' -> { score, tuile, coups }
    partie: null          // la partie du jour en cours, serialisee
};

// Un schema inconnu vaut un stockage vide : mieux vaut perdre une serie que
// nourrir le jeu avec une forme qu'il ne sait plus lire.
export function chargerDefi() {
    const enregistre = lire(CLE_DEFI, DEFI_VIDE);
    if (enregistre.schema !== SCHEMA_DEFI) return { ...DEFI_VIDE };
    return { ...DEFI_VIDE, ...enregistre };
}

export const enregistrerDefi = defi => ecrire(CLE_DEFI, { ...defi, schema: SCHEMA_DEFI });

// Les resultats sont gardes trois mois : de quoi afficher une serie et un
// meilleur score, sans laisser la cle grossir indefiniment.
const JOURS_GARDES = 90;

export function retenirResultat(defi, jour, resultat, serie) {
    const resultats = { ...defi.resultats, [jour]: resultat };
    for (const date of Object.keys(resultats).sort().slice(0, -JOURS_GARDES)) delete resultats[date];

    return {
        ...defi,
        resultats,
        serie,
        meilleureSerie: Math.max(defi.meilleureSerie || 0, serie),
        dernierJour: jour
    };
}

export function effacerDefi() {
    ecrire(CLE_DEFI, DEFI_VIDE);
}

// -------------------------------------------------------------- le passeport
//
// Les coups du jour, pour le tampon a l'effort. Le compte vit dans l'espace du
// joueur et nulle part ailleurs : en mode invite, rien n'est compte ni ecrit,
// exactement comme avant le passeport.

export function compterCoupPasseport(jour, espace = passeport) {
    if (!espace) return null;
    let compte = null;
    try { compte = JSON.parse(espace.getItem(CLE_PASSEPORT)); } catch { /* illisible : on repart de zero */ }
    const coups = compte?.jour === jour && Number.isInteger(compte.coups) ? compte.coups + 1 : 1;
    try { espace.setItem(CLE_PASSEPORT, JSON.stringify({ jour, coups })); } catch { /* le passeport signale l'echec */ }
    return coups;
}
