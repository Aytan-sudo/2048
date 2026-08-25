// La liste des palettes et leur ordre, rien d'autre. Les couleurs, elles,
// vivent uniquement dans `css/themes.css`.
//
// La preference du joueur peut valoir « auto » : la page suit alors le systeme.
// Mais l'attribut `data-theme` porte toujours une palette nommee, jamais
// « auto » — c'est ce qui evite d'ecrire deux fois la meme palette dans le CSS,
// une fois sous son nom et une fois dans un bloc `prefers-color-scheme`.

export const THEMES = [
    { id: 'sable', nom: 'Sable', couleur: '#f7f2e8' },
    { id: 'celadon', nom: 'Céladon', couleur: '#eef3ef' },
    { id: 'nuit', nom: 'Nuit', couleur: '#12151d' },
    { id: 'cendre', nom: 'Cendre', couleur: '#191715' },
    { id: 'arcade', nom: 'Arcade', couleur: '#140f26' }
];

export const AUTO = 'auto';

// Les deux palettes que le mode systeme choisit. Ce sont celles d'origine du
// jeu : le joueur qui n'a jamais rien regle retrouve exactement ses couleurs.
export const PALETTE_CLAIRE = 'sable';
export const PALETTE_SOMBRE = 'nuit';

export const estPalette = id => THEMES.some(theme => theme.id === id);

export const paletteDe = id => THEMES.find(theme => theme.id === id) ?? THEMES[0];

export const systemeEnSombre = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

// La palette reellement affichee, une fois « auto » resolu.
export function themeEffectif(theme) {
    if (estPalette(theme)) return theme;
    return systemeEnSombre() ? PALETTE_SOMBRE : PALETTE_CLAIRE;
}

export function appliquerTheme(theme) {
    const palette = paletteDe(themeEffectif(theme));
    document.documentElement.dataset.theme = palette.id;

    const barre = document.getElementById('couleur-barre');
    if (barre) barre.content = palette.couleur;
    return palette;
}

// Le bouton d'en-tete fait tourner la liste. Depuis « auto », il repart de la
// palette affichee : le joueur voit la suivante de celle qu'il a sous les yeux,
// pas la premiere de la liste.
export function themeSuivant(theme) {
    const index = THEMES.findIndex(candidat => candidat.id === themeEffectif(theme));
    return THEMES[(index + 1) % THEMES.length].id;
}
