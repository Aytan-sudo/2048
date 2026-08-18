// Un generateur reproductible, avec un etat qu'on peut relire et reposer.
//
// Deux raisons de ne pas se contenter de Math.random. La premiere : une partie
// reprise apres un rechargement doit continuer la meme suite de tirages. La
// seconde tient a l'annulation — reposer l'etat du generateur en meme temps que
// la grille garantit qu'un coup rejoue fait apparaitre exactement la meme
// tuile. Sans ca, annuler devient une machine a relancer les des jusqu'a ce que
// le hasard soit favorable.

export function creerHasard(graine) {
    let etat = graine >>> 0;

    // mulberry32 : trente lignes de moins qu'un vrai Mersenne, et largement
    // assez bon pour choisir une case parmi seize.
    const tirer = () => {
        etat = (etat + 0x6D2B79F5) >>> 0;
        let melange = etat;
        melange = Math.imul(melange ^ (melange >>> 15), 1 | melange);
        melange = (melange + Math.imul(melange ^ (melange >>> 7), 61 | melange)) ^ melange;
        return ((melange ^ (melange >>> 14)) >>> 0) / 4294967296;
    };

    tirer.etat = () => etat;
    tirer.reprendre = valeur => { etat = valeur >>> 0; };
    return tirer;
}

export const graineAleatoire = () => Math.floor(Math.random() * 4294967296) >>> 0;
