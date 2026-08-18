// Harnais commun aux tests. Le noyau du jeu (moteur, partie, records) ne touche
// ni au DOM ni a Math.random : il se teste en Node, sans navigateur.

export function counter() {
    const etat = { pass: 0, fail: 0 };
    const check = (libelle, condition, detail = '') => {
        if (condition) { etat.pass++; console.log(`  OK    ${libelle}`); }
        else { etat.fail++; console.log(`  ECHEC ${libelle} ${detail}`); }
    };
    const report = () => {
        console.log(`\n${etat.pass} reussis, ${etat.fail} echecs\n`);
        process.exit(etat.fail === 0 ? 0 : 1);
    };
    return { check, report };
}

// Compteur d'identifiants previsible : les tests peuvent nommer les tuiles
// nees d'une fusion.
export function compteur(depart = 100) {
    let prochain = depart;
    return () => prochain++;
}

// Une grille ecrite comme on la voit : 0 pour une case vide.
export function grilleDepuis(valeurs, depart = 1) {
    let id = depart;
    return valeurs.map(valeur => (valeur ? { id: id++, valeur } : null));
}

export const valeursDe = grille => grille.map(tuile => (tuile ? tuile.valeur : 0));

// Impose une grille a une partie en cours, sans toucher au reste de son etat.
export function poserGrille(partie, valeurs) {
    partie.grille = valeurs.map(valeur => (valeur ? { id: partie.prochainId++, valeur } : null));
    return partie;
}

// Un hasard qui ne varie pas : la tuile suivante tombe toujours sur la premiere
// case libre, et vaut toujours 2. De quoi ecrire des fins de partie a la main.
export function hasardFixe(valeur = 0.5) {
    const tirer = () => valeur;
    tirer.etat = () => 0;
    tirer.reprendre = () => {};
    return tirer;
}
