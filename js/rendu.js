// L'affichage du plateau.
//
// Chaque tuile est un element qui vit tant que la tuile vit, place par un
// `transform` que le navigateur anime tout seul. C'est pour ca que le moteur
// rend une liste de deplacements plutot qu'une simple grille : redessiner
// l'etat final d'un bloc donnerait un jeu qui clignote au lieu de glisser.

import { objectifDe } from './partie.js';

const DUREE_GLISSE = 110;   // doit rester d'accord avec la transition du CSS

const sansAnimation = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function creerRendu({ plateau, cellules, couche }) {
    const elements = new Map();   // id de tuile -> element
    let tailleAffichee = 0;
    let objectif = 0;
    let terminerEnCours = null;

    const poser = (element, index, taille) => {
        element.style.setProperty('--l', Math.floor(index / taille));
        element.style.setProperty('--c', index % taille);
    };

    const creerTuile = (tuile, index, taille, effet) => {
        const element = document.createElement('div');
        element.className = effet ? `tuile ${effet}` : 'tuile';
        element.dataset.valeur = tuile.valeur <= 8192 ? String(tuile.valeur) : 'max';
        element.dataset.long = String(String(tuile.valeur).length);
        if (tuile.valeur >= objectif) element.classList.add('objectif');
        element.textContent = String(tuile.valeur);
        poser(element, index, taille);
        couche.append(element);
        elements.set(tuile.id, element);
        return element;
    };

    const poserCadre = taille => {
        if (taille === tailleAffichee) return;
        plateau.style.setProperty('--n', taille);
        cellules.replaceChildren(...Array.from({ length: taille * taille }, () => {
            const case_ = document.createElement('div');
            case_.className = 'case';
            return case_;
        }));
        tailleAffichee = taille;
    };

    // Un joueur rapide enchaine les touches plus vite que les animations. On
    // solde alors le coup precedent d'un coup sec plutot que de laisser deux
    // series de tuiles se marcher dessus.
    const solder = () => {
        if (terminerEnCours) terminerEnCours();
    };

    const dessiner = partie => {
        solder();
        objectif = objectifDe(partie.taille);
        poserCadre(partie.taille);
        elements.clear();
        couche.replaceChildren();
        partie.grille.forEach((tuile, index) => {
            if (tuile) creerTuile(tuile, index, partie.taille, 'apparition');
        });
    };

    const appliquer = (partie, coup) => {
        solder();

        for (const deplacement of coup.deplacements) {
            const element = elements.get(deplacement.id);
            if (element) poser(element, deplacement.vers, partie.taille);
        }

        const conclure = () => {
            terminerEnCours = null;

            for (const fusion of coup.fusions) {
                for (const id of fusion.absorbees) {
                    elements.get(id)?.remove();
                    elements.delete(id);
                }
                creerTuile({ id: fusion.id, valeur: fusion.valeur }, fusion.index, partie.taille, 'fusion');
            }

            if (coup.naissance) {
                creerTuile(coup.naissance, coup.naissance.index, partie.taille, 'apparition');
            }
        };

        if (sansAnimation()) {
            conclure();
            return;
        }

        const minuteur = setTimeout(conclure, DUREE_GLISSE);
        terminerEnCours = () => { clearTimeout(minuteur); conclure(); };
    };

    return { dessiner, appliquer, solder };
}

// Le petit "+8" qui monte au-dessus du score. Il se supprime lui-meme : un
// element oublie par animation finirait par en laisser des centaines dans la
// page au bout d'une longue partie.
export function afficherGain(boite, gain) {
    if (!gain || sansAnimation()) return;

    const bulle = document.createElement('span');
    bulle.className = 'gain';
    bulle.textContent = `+${gain}`;
    bulle.addEventListener('animationend', () => bulle.remove());
    boite.append(bulle);
}
