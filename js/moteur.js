// Le noyau du jeu : tasser une grille dans une direction, fusionner ce qui se
// ressemble, dire s'il reste un coup.
//
// Rien ici ne touche au DOM ni au hasard. Ces fonctions prennent une grille et
// en rendent une autre, accompagnee de la liste de ce qui a bouge : l'affichage
// s'en sert pour animer le coup, et les tests peuvent tout verifier en Node.
//
// Une grille est un tableau plat de `taille * taille` cases, chacune valant
// `null` ou une tuile `{ id, valeur }`. L'identifiant sert uniquement a
// l'animation : c'est lui qui permet de suivre une tuile d'une case a l'autre
// plutot que de redessiner la grille d'un bloc a chaque coup.

export const DIRECTIONS = ['gauche', 'droite', 'haut', 'bas'];

export const grilleVide = taille => new Array(taille * taille).fill(null);

// Les indices de chaque rangee, ranges dans l'ordre ou les tuiles se tassent :
// la premiere case du tableau est celle contre laquelle tout vient buter. Avec
// ca, les quatre directions partagent le meme code de fusion.
export function rangees(taille, direction) {
    const horizontal = direction === 'gauche' || direction === 'droite';
    const remonte = direction === 'droite' || direction === 'bas';
    const toutes = [];

    for (let rangee = 0; rangee < taille; rangee++) {
        const indices = [];
        for (let pas = 0; pas < taille; pas++) {
            const avance = remonte ? taille - 1 - pas : pas;
            const ligne = horizontal ? rangee : avance;
            const colonne = horizontal ? avance : rangee;
            indices.push(ligne * taille + colonne);
        }
        toutes.push(indices);
    }
    return toutes;
}

// Tasse une rangee vers son debut. Une tuile ne fusionne qu'une fois par coup :
// 2 2 4 donne 4 4, jamais 8. C'est la regle qui empeche une rangee entiere de
// s'effondrer en une seule tuile, et tout l'equilibre du jeu tient dessus.
export function tasserRangee(cases, nouvelId) {
    const pleines = [];
    cases.forEach((tuile, place) => { if (tuile) pleines.push({ tuile, place }); });

    const resultat = new Array(cases.length).fill(null);
    const deplacements = [];
    const fusions = [];
    let gain = 0;
    let ecrit = 0;

    for (let rang = 0; rang < pleines.length; rang++) {
        const { tuile, place } = pleines[rang];
        const suivante = pleines[rang + 1];

        if (suivante && suivante.tuile.valeur === tuile.valeur) {
            const valeur = tuile.valeur * 2;
            const nee = { id: nouvelId(), valeur };
            resultat[ecrit] = nee;
            deplacements.push({ id: tuile.id, depuis: place, vers: ecrit });
            deplacements.push({ id: suivante.tuile.id, depuis: suivante.place, vers: ecrit });
            fusions.push({ id: nee.id, valeur, place: ecrit, absorbees: [tuile.id, suivante.tuile.id] });
            gain += valeur;
            rang++;                     // la voisine est consommee, elle ne rejoue pas
        } else {
            resultat[ecrit] = tuile;
            deplacements.push({ id: tuile.id, depuis: place, vers: ecrit });
        }
        ecrit++;
    }

    return { cases: resultat, deplacements, fusions, gain };
}

// Le coup complet. `bouge` vaut faux quand rien n'a change : le jeu doit alors
// refuser le coup sans faire apparaitre de nouvelle tuile, sinon la grille se
// remplirait toute seule en poussant contre un mur.
export function deplacer(grille, taille, direction, nouvelId) {
    const suivante = grilleVide(taille);
    const deplacements = [];
    const fusions = [];
    let gain = 0;
    let bouge = false;

    for (const indices of rangees(taille, direction)) {
        const rangee = tasserRangee(indices.map(index => grille[index]), nouvelId);

        rangee.cases.forEach((tuile, place) => { suivante[indices[place]] = tuile; });

        for (const deplacement of rangee.deplacements) {
            if (deplacement.depuis !== deplacement.vers) bouge = true;
            deplacements.push({
                id: deplacement.id,
                depuis: indices[deplacement.depuis],
                vers: indices[deplacement.vers]
            });
        }

        for (const { place, ...fusion } of rangee.fusions) {
            bouge = true;
            fusions.push({ ...fusion, index: indices[place] });
        }

        gain += rangee.gain;
    }

    return { grille: suivante, deplacements, fusions, gain, bouge };
}

export function casesLibres(grille) {
    const libres = [];
    for (let index = 0; index < grille.length; index++) {
        if (!grille[index]) libres.push(index);
    }
    return libres;
}

// La partie continue tant qu'il reste un trou ou deux voisines identiques. On
// teste seulement la droite et le bas : la paire gauche-droite est la meme vue
// de l'autre cote.
export function coupsPossibles(grille, taille) {
    for (let index = 0; index < grille.length; index++) {
        const tuile = grille[index];
        if (!tuile) return true;

        const colonne = index % taille;
        const droite = colonne + 1 < taille ? grille[index + 1] : null;
        const bas = index + taille < grille.length ? grille[index + taille] : null;

        if (droite && droite.valeur === tuile.valeur) return true;
        if (bas && bas.valeur === tuile.valeur) return true;
    }
    return false;
}

export function meilleureTuile(grille) {
    return grille.reduce((record, tuile) => Math.max(record, tuile ? tuile.valeur : 0), 0);
}
