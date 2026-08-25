// Synthese WebAudio : aucun fichier audio, quelques oscillateurs et c'est tout.
//
// Le timbre central est celui de la fusion : la hauteur monte avec la valeur
// née. Un 4 est grave, un 2048 est aigu, et on entend la partie grandir sans
// regarder le score. Les hauteurs suivent une pentatonique mineure — deux
// fusions dans le meme coup tombent alors toujours juste ensemble, ce qu'une
// echelle chromatique ne garantirait pas.
//
// Le contexte audio ne se cree qu'a la premiere note, donc apres un geste du
// joueur : les navigateurs refusent de demarrer le son autrement. Un onglet
// passe a l'arriere-plan suspend tout — un jeu ne doit pas chanter dans le dos
// de quelqu'un qui est parti lire ailleurs.

let contexte;

function audio() {
    if (contexte) return contexte;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (AudioContext) contexte = new AudioContext();
    return contexte;
}

// Une note : attaque tres courte, extinction exponentielle. Le volume reste bas
// par principe — le son accompagne, il ne commente pas.
function note(frequence, { duree = 0.09, volume = 0.03, delai = 0, forme = 'triangle', vers = null } = {}) {
    const moteur = audio();
    if (!moteur) return;
    if (moteur.state === 'suspended') moteur.resume?.();

    const debut = moteur.currentTime + delai;
    const oscillateur = moteur.createOscillator();
    const gain = moteur.createGain();

    oscillateur.type = forme;
    oscillateur.frequency.setValueAtTime(frequence, debut);
    if (vers) oscillateur.frequency.exponentialRampToValueAtTime(vers, debut + duree);

    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume, debut + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);

    oscillateur.connect(gain).connect(moteur.destination);
    oscillateur.start(debut);
    oscillateur.stop(debut + duree + 0.02);
}

// La pentatonique mineure, en demi-tons. Douze degres suffisent : de la tuile 4
// a la tuile 8192, il y a douze doublements.
const PENTATONIQUE = [0, 3, 5, 7, 10];

// Mi 4, et pas l'octave en dessous. La premiere version partait de 165 Hz parce
// qu'un 4 « doit sonner grave » — sauf qu'un haut-parleur de telephone ne
// reproduit a peu près rien sous 300 Hz, et que l'oreille y est de surcroit
// bien moins sensible a faible volume. Les fusions courantes (4, 8, 16, 32)
// tombaient donc entre 165 et 247 Hz : inaudibles sur la cible du projet, alors
// meme qu'elles s'entendaient parfaitement sur un ordinateur. Toute l'echelle
// vit maintenant au-dessus de 330 Hz. C'est la meme musique, une octave plus
// haut.
const FONDAMENTALE = 330;

export function hauteurDe(valeur) {
    const degre = Math.max(0, Math.round(Math.log2(valeur)) - 2);
    const demiTons = 12 * Math.floor(degre / PENTATONIQUE.length) + PENTATONIQUE[degre % PENTATONIQUE.length];
    return FONDAMENTALE * 2 ** (demiTons / 12);
}

// Les fusions d'un meme coup sont decalees de quelques centiemes : ensemble
// elles font un accord, en rafale elles feraient une bouillie.
export const sonFusion = (valeur, rang = 0) =>
    note(hauteurDe(valeur), { duree: 0.11, volume: 0.045, delai: rang * 0.03 });

// Une tuile jamais atteinte dans la partie : une quinte par-dessus la fusion,
// juste apres, pour marquer le palier sans changer de langage.
export const sonPalier = (valeur, rang = 0) =>
    note(hauteurDe(valeur) * 1.5, { duree: 0.2, volume: 0.034, delai: rang * 0.03 + 0.07, forme: 'sine' });

// L'objectif : la seule fanfare du jeu, quatre notes qui montent.
export function sonObjectif() {
    [523, 659, 784, 1047].forEach((frequence, rang) =>
        note(frequence, { duree: 0.2, volume: 0.042, delai: rang * 0.09, forme: 'sine' }));
}

// Pousser contre un mur ne change rien a l'ecran : un toc trop bref pour
// deranger dit quand meme que le geste a ete recu. Il descend au lieu de tenir
// sa note — c'est ce qui le distingue d'une fusion, plutot qu'une hauteur plus
// grave, qu'aucun telephone ne restituerait.
export const sonRefus = () => note(420, { duree: 0.05, volume: 0.022, vers: 300, forme: 'sine' });

// L'annulation : l'inverse d'une fusion, une note qui redescend.
export const sonAnnulation = () => note(660, { duree: 0.14, volume: 0.034, vers: 440, forme: 'sine' });

// La fin de partie : deux notes descendantes, sans insister.
export function sonFin() {
    note(494, { duree: 0.24, volume: 0.036, forme: 'sine' });
    note(330, { duree: 0.34, volume: 0.036, delai: 0.2, forme: 'sine' });
}

// Le deblocage, et la raison d'etre de cette fonction.
//
// iOS ne laisse demarrer l'audio que depuis un evenement d'activation :
// `pointerup`, `touchend`, un clic, une touche. Or le plateau reconnait le
// geste des que le seuil est franchi, donc dans `pointermove` — qui n'en est
// pas un. Le contexte y naitrait suspendu, `resume()` serait refuse, et un
// joueur qui ne fait que glisser le doigt n'entendrait jamais rien de la
// partie. Au clavier, sur ordinateur, le defaut est invisible : Chrome accorde
// l'activation des le `pointerdown`.
//
// On prepare donc le contexte des le poser du doigt — le seul evenement
// d'activation qui precede le glissement, et donc la premiere fusion. Le lever
// et le clic sont gardes en filet : sur les iOS anciens, seul `touchend`
// debloque, et le son arrive alors au geste suivant plutot que jamais.
// `autorise` evite de creer un contexte audio chez qui a coupe le son.
const ACTIVATIONS = ['pointerdown', 'touchstart', 'pointerup', 'touchend', 'keydown', 'click'];

export function preparerSon(cible, autorise = () => true) {
    const reveiller = () => {
        if (!autorise()) return;
        const moteur = audio();
        if (moteur && moteur.state !== 'running') moteur.resume?.();
    };
    for (const activation of ACTIVATIONS) {
        cible.addEventListener(activation, reveiller, { capture: true, passive: true });
    }
}

export function surveillerVisibilite(document) {
    document.addEventListener('visibilitychange', () => {
        if (!contexte) return;
        if (document.hidden) contexte.suspend?.();
        else contexte.resume?.();
    });
}
