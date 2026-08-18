// Les entrees : clavier et gestes.
//
// Le jeu se joue a une main sur telephone et au clavier sur ordinateur, sans
// que l'un rende l'autre penible. Les deux mappings vivent ici, l'application
// ne recoit que des directions.

const TOUCHES = {
    ArrowLeft: 'gauche', ArrowRight: 'droite', ArrowUp: 'haut', ArrowDown: 'bas',
    // AZERTY et QWERTY : les deux dispositions cohabitent, personne n'a a
    // changer de clavier pour jouer.
    q: 'gauche', d: 'droite', z: 'haut', s: 'bas',
    a: 'gauche', w: 'haut',
    // Vi, pour ceux qui ont les doigts formes.
    h: 'gauche', l: 'droite', k: 'haut', j: 'bas'
};

const GLISSEMENT_MINIMAL = 24;   // en pixels : en dessous, c'est un appui, pas un geste

export function ecouterClavier({ surDirection, raccourcis = {} }) {
    document.addEventListener('keydown', evenement => {
        // Un dialogue ouvert a la priorite : sinon les fleches deplaceraient la
        // grille derriere le panneau de reglages.
        if (document.querySelector('dialog[open]')) return;
        if (evenement.altKey || evenement.metaKey) return;

        if ((evenement.ctrlKey && evenement.key.toLowerCase() === 'z') || evenement.key === 'Backspace') {
            evenement.preventDefault();
            raccourcis.annuler?.();
            return;
        }
        if (evenement.ctrlKey) return;

        const direction = TOUCHES[evenement.key] ?? TOUCHES[evenement.key.toLowerCase()];
        if (direction) {
            evenement.preventDefault();
            surDirection(direction);
            return;
        }

        const action = raccourcis[evenement.key.toLowerCase()];
        if (action) {
            evenement.preventDefault();
            action();
        }
    });
}

export function ecouterGestes(element, surDirection) {
    let depart = null;

    element.addEventListener('pointerdown', evenement => {
        depart = { x: evenement.clientX, y: evenement.clientY };
    });

    // Le geste se decide des que le seuil est franchi, sans attendre le lever du
    // doigt : c'est ce qui donne l'impression que le plateau repond a l'instant.
    element.addEventListener('pointermove', evenement => {
        if (!depart) return;

        const dx = evenement.clientX - depart.x;
        const dy = evenement.clientY - depart.y;
        if (Math.hypot(dx, dy) < GLISSEMENT_MINIMAL) return;

        depart = null;
        surDirection(Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'droite' : 'gauche')
            : (dy > 0 ? 'bas' : 'haut'));
    });

    const oublier = () => { depart = null; };
    element.addEventListener('pointerup', oublier);
    element.addEventListener('pointercancel', oublier);
    element.addEventListener('pointerleave', oublier);
}
