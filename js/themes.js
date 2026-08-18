// Le theme, en trois etats : clair, sombre, ou celui du systeme.
//
// Tant que le joueur n'a rien choisi, la page suit `prefers-color-scheme` sans
// poser d'attribut — c'est la feuille de style qui s'en charge. Un clic fige un
// choix explicite, qui prend alors le pas sur le systeme.

export const THEMES = ['auto', 'clair', 'sombre'];

const COULEURS_BARRE = { clair: '#f7f2e8', sombre: '#12151d' };

export const systemeEnSombre = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

export const themeEffectif = theme => (theme === 'auto' ? (systemeEnSombre() ? 'sombre' : 'clair') : theme);

export function appliquerTheme(theme) {
    const racine = document.documentElement;
    if (theme === 'auto') delete racine.dataset.theme;
    else racine.dataset.theme = theme;

    const barre = document.getElementById('couleur-barre');
    if (barre) barre.content = COULEURS_BARRE[themeEffectif(theme)];
    return theme;
}

// Le bouton bascule entre clair et sombre a partir de ce qui est affiche : deux
// etats visibles valent mieux qu'un cycle a trois temps ou l'on ne sait jamais
// ou l'on va tomber. Le mode automatique reste accessible dans les reglages.
export const themeSuivant = theme => (themeEffectif(theme) === 'sombre' ? 'clair' : 'sombre');
