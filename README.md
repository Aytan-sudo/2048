# 2048

Le jeu de tuiles qui glissent, jouable au doigt comme au clavier, hors ligne,
sans serveur ni dépendance. Une page statique posée sur GitHub Pages.

Sa particularité : **l'annulation**. Trois retours en arrière par partie, y
compris sur le coup qui vient de tout faire perdre. C'est le seul reproche
sérieux qu'on puisse faire au 2048 d'origine — une seconde d'inattention efface
un quart d'heure de construction patiente, sans recours.

## Jouer

- **Au doigt** — glissez sur la grille dans la direction voulue. Le geste est
  reconnu dès que le seuil est franchi, sans attendre que le doigt se lève.
- **Au clavier** — les flèches, ou <kbd>ZQSD</kbd>, ou <kbd>WASD</kbd>, ou
  <kbd>HJKL</kbd>. <kbd>U</kbd> ou <kbd>Ctrl</kbd>+<kbd>Z</kbd> annule,
  <kbd>R</kbd> relance, <kbd>T</kbd> change de thème.

Toutes les tuiles glissent d'un bloc. Deux tuiles de même valeur qui se
rencontrent n'en font plus qu'une, du double — mais une tuile ne fusionne
qu'une fois par coup : `2 2 4` donne `4 4`, jamais `8`. À chaque coup, une
nouvelle tuile apparaît, un 2 ou, une fois sur dix, un 4.

## L'annulation

Trois par partie, et elles reposent aussi l'état du générateur aléatoire :
rejouer le même coup après une annulation fait réapparaître exactement la même
tuile, au même endroit. Sans cette précaution, annuler ne servirait plus à
corriger une erreur mais à relancer les dés jusqu'à ce qu'ils tombent bien.

Elles fonctionnent après la défaite. C'est là qu'elles servent le plus.

## Les grilles

Quatre tailles, chacune avec son objectif et son propre record.

| | | |
| --- | --- | --- |
| **3×3** | objectif 256 | une partie dure trois minutes et pardonne peu |
| **4×4** | objectif 2048 | le format d'origine |
| **5×5** | objectif 4096 | plus de place pour réparer une erreur |
| **6×6** | objectif 8192 | long, mais on y construit vraiment |

Viser 2048 sur un 3×3 relèverait du coup de chance pur, et sur du 6×6 ce serait
une formalité : dans les deux cas la partie n'aurait plus de moment de bascule.
L'objectif atteint, rien n'oblige à s'arrêter — la grille continue tant qu'il
reste un coup, et l'annonce peut être coupée dans les réglages.

## Sous le capot

Aucune dépendance, aucun outil de construction : les fichiers du dépôt sont
exactement ceux que le navigateur télécharge.

- `js/moteur.js` — le noyau. Il tasse une grille dans une direction et rend la
  liste de ce qui a bougé. Il ne touche ni au DOM ni au hasard, ce qui permet de
  tester tout le jeu en Node.
- `js/partie.js` — ce qui dure d'un coup à l'autre : score, historique,
  objectif, fin de partie, et la sérialisation complète d'une partie en cours.
- `js/rendu.js` — chaque tuile est un élément qui vit tant que la tuile vit.
  C'est pour ça que le moteur rend des déplacements plutôt qu'une simple
  grille : redessiner l'état final d'un bloc donnerait un jeu qui clignote au
  lieu de glisser.
- `css/style.css` — toutes les couleurs, la géométrie du plateau et les
  animations. Le JavaScript pose une ligne, une colonne et une valeur ; le reste
  se calcule en CSS.

La partie en cours, les records et les préférences vivent dans le
`localStorage`. Fermer l'onglet ne coûte rien, y compris les annulations
restantes.

## Développer

```bash
npm test      # 92 vérifications : moteur, partie, stockage, structure de la page
npm run serve # http://localhost:8765
```

Les tests couvrent les règles de fusion, la fin de partie, l'annulation, le
classement des records et la cohérence de la page — modules déclarés au service
worker, identifiants cherchés par l'interface, couleurs de tuiles, accord entre
la durée d'animation du CSS et l'attente du JavaScript.
