# 2048

Le jeu de tuiles qui glissent, jouable au doigt comme au clavier, hors ligne,
sans serveur ni dépendance. Une page statique posée sur GitHub Pages.

Sa particularité : **l'annulation**. Trois retours en arrière par partie, y
compris sur le coup qui vient de tout faire perdre. C'est le seul reproche
sérieux qu'on puisse faire au 2048 d'origine — une seconde d'inattention efface
un quart d'heure de construction patiente, sans recours.

**Jouer : https://aytan-sudo.github.io/2048/**

## Version 1.1.3

**Toute l'échelle du son monte d'une octave.** Elle partait de 165 Hz parce
qu'« un 4 doit sonner grave » ; sur un ordinateur c'était juste, sur un
téléphone les fusions courantes n'existaient pas. Un haut-parleur de téléphone
ne restitue à peu près rien sous 300 Hz, et l'oreille y est de surcroît bien
moins sensible à faible volume : les assemblages de 4, 8, 16 et 32 tombaient
entre 165 et 247 Hz, donc dans le vide. Seuls le palier et la fin de partie
s'entendaient — ce qui donnait un jeu presque muet, sans que rien ne signale
d'erreur. Le jeu se voulant mobile d'abord, c'était un défaut, pas un réglage.

La musique est la même, une octave plus haut : un 4 sonne à 330 Hz, un 2048 à
1175 Hz. La fin de partie, l'annulation et le coup refusé remontent aussi — ce
dernier devient un « toc » descendant, sa hauteur ne pouvant plus le distinguer
d'une fusion. Le volume de la fusion passe de 0,032 à 0,045. Deux tests
gardent désormais le plancher des 300 Hz, l'un pour l'échelle, l'autre pour les
timbres à hauteur fixe.

## Version 1.1.2

Le déblocage du son de la 1.1.1 arrivait un geste trop tard : le contexte audio
naissait encore dans le `pointermove` qui déclenche le coup, avant que le lever
du doigt ait pu le préparer. Il est maintenant préparé dès le **poser** du
doigt, seul événement d'activation qui précède le glissement. Le lever et le
clic restent en filet pour les iOS anciens, où seul `touchend` débloque.

## Version 1.1.1

- **le son se débloque enfin sur téléphone.** Le plateau reconnaît le geste dès
  le seuil franchi, donc dans `pointermove` — que WebKit ne compte pas comme une
  activation. Le contexte audio y naissait suspendu et n'en repartait jamais :
  un joueur au doigt n'entendait rien de la partie, alors qu'au clavier tout
  fonctionnait. Il est désormais préparé au premier geste complet.
- **Céladon** ne ressemble plus à Sable sur fond vert : sa rampe descend d'un
  cran en clarté et monte d'un cran en pureté, ce qui la distingue et rend
  l'encre blanche lisible sur les tuiles chaudes.
- **Cendre et Arcade** : leurs tuiles 2 et 4 étaient plus sombres que les cases
  vides, si bien qu'une case pleine paraissait plus creuse qu'une case vide. Un
  test compare désormais les luminances dans chaque palette.

## Version 1.1.0

- **grille du jour** : la même suite de tuiles pour tout le monde, retrouvée par
  chaque navigateur à partir de la date, sans serveur ; série quotidienne, lien
  `?jour=` et résultat partageable en carrés ;
- **cinq palettes** — Sable, Céladon, Nuit, Cendre, Arcade — au lieu du seul
  couple clair/sombre, avec le mode Système en sixième choix ;
- **sons de synthèse** en option : la hauteur de la fusion monte avec la valeur
  née, sur une pentatonique mineure ;
- le dialogue « Réglages » devient « Options » et suit la structure de la
  collection ; le numéro de version s'affiche en bas, le cache du service worker
  le porte, et un test vérifie que les trois concordent ;
- <kbd>N</kbd> relance une partie, comme <kbd>R</kbd> ; intégration continue sur
  chaque poussée.

## Version 1.0.0

Le moteur, l'annulation et les quatre tailles de grille.

## Jouer

- **Au doigt** — glissez sur la grille dans la direction voulue. Le geste est
  reconnu dès que le seuil est franchi, sans attendre que le doigt se lève.
- **Au clavier** — les flèches, ou <kbd>ZQSD</kbd>, ou <kbd>WASD</kbd>, ou
  <kbd>HJKL</kbd>. <kbd>U</kbd> ou <kbd>Ctrl</kbd>+<kbd>Z</kbd> annule,
  <kbd>N</kbd> ou <kbd>R</kbd> relance, <kbd>T</kbd> fait tourner les palettes,
  <kbd>Échap</kbd> ferme un dialogue. La grille du jour n'a pas de raccourci :
  <kbd>H</kbd> <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> appartiennent au plateau,
  elle passe par le bouton ☀ de l'en-tête.

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

## La grille du jour

Le bouton ☀ ouvre un 4×4 dont la suite de tuiles est tirée de la date : la même
pour tout le monde, ce jour-là, sans qu'aucun serveur ne la distribue — c'est le
générateur du jeu qui la refabrique à l'identique chez chacun. Les jours
d'affilée font une série, visible dans les Options.

Elle se relève une fois : le premier résultat de la journée est celui qui
compte. Le lien partagé porte la date, jamais le score, si bien que celui qui
l'ouvre trouve la grille intacte. Rouvert un autre jour, il redonne la même
grille, mais hors série.

La grille du jour a son propre palmarès. Un score obtenu sur une grille imposée
et un record personnel ne concourent pas ensemble — c'est la même règle qui
donne à chaque taille de grille son propre record.

Le même bouton ramène ensuite à la partie libre, qui n'a pas bougé : les deux
vivent chacune de leur côté dans le stockage local. Une partie libre est
partageable elle aussi, par sa graine (`?seed=…&taille=…`) — l'adresse suit
toujours la grille en cours.

**Ce que la grille du jour ne promet pas :** l'horloge de la machine fait foi.
Se tricher soi-même est possible, et sans intérêt.

## Les palettes

Cinq ambiances, deux claires et trois sombres, qui se choisissent au bouton
<kbd>T</kbd> ou à la pastille dans les Options.

| | | |
| --- | --- | --- |
| **Sable** | clair, chaud | parchemin et sable mouillé, la palette d'origine |
| **Céladon** | clair, froid | porcelaine vert d'eau, rampe plus nette |
| **Nuit** | sombre, bleu | bleu d'encre et couleurs rabattues |
| **Cendre** | sombre, mat | gris-brun de foyer froid, tuiles pâles à l'encre sombre |
| **Arcade** | sombre, électrique | violet de borne et tuiles fluorescentes |

La rampe des treize tuiles est la langue du jeu — on lit un plateau à la couleur
avant de lire les chiffres. Elle survit donc dans chaque palette, avec le même
voyage : les deux premières tuiles se confondent presque avec le plateau, puis
viennent les tons chauds, puis les tons joyaux. Ce qui change, c'est la matière
du plateau et le régime de la rampe.

Un sixième choix, **Système**, suit le réglage clair/sombre de l'appareil. Il
est résolu par le script d'amorce de la page, avant le premier rendu : la page
ne s'ouvre jamais dans la mauvaise palette.

## Le son

Six timbres de synthèse, aucun fichier audio, réglables dans les Options. Le
timbre central est celui de la **fusion** : la hauteur monte avec la valeur née,
un 4 est grave, un 2048 est aigu. On entend la partie grandir sans regarder le
score. Les hauteurs suivent une pentatonique mineure, si bien que deux fusions
du même coup tombent toujours juste ensemble.

Une tuile qui dépasse la plus grosse de la partie ajoute une quinte par-dessus.
Le reste est plus sobre : l'objectif, le coup refusé contre un mur, l'annulation
— une note qui redescend, l'inverse d'une fusion — et la fin de partie.

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
- `js/defi.js` — la grille du jour : la date locale, le hachage qui en tire une
  graine, la lecture de l'adresse, la série et le message de partage. Rien n'y
  touche au DOM ni au stockage, tout s'y teste en Node.
- `js/son.js` — la synthèse WebAudio. Une seule fonction `note`, six timbres
  posés dessus, et une échelle pentatonique pour que les fusions simultanées
  s'accordent.
- `css/themes.css` — les cinq palettes, et rien d'autre : toutes les couleurs du
  jeu vivent là. Un test vérifie qu'aucune palette n'oublie une variable — une
  seule oubliée ne planterait pas, elle laisserait une couleur claire au milieu
  d'un thème sombre.
- `css/style.css` — la géométrie du plateau et les animations, sans une couleur
  écrite en dur. Le JavaScript pose une ligne, une colonne et une valeur ; le
  reste se calcule en CSS.

La partie en cours, les records, la grille du jour et les préférences vivent
dans le `localStorage`, sous des clés préfixées `2048.`. Fermer l'onglet ne
coûte rien, y compris les annulations restantes.

## Développer

```bash
npm test      # 181 vérifications : moteur, partie, grille du jour, son, stockage, page
npm run check # node --check sur chaque module
npm run serve # http://localhost:8765
```

Les tests couvrent les règles de fusion, la fin de partie, l'annulation, le
classement des records, le déterminisme de la grille du jour et la cohérence de
la page : coquille du service worker complète et sans fichier fantôme, modules
tous reliés à `app.js`, identifiants cherchés par l'interface, couleurs de
tuiles, palettes complètes, accord entre la durée d'animation du CSS et
l'attente du JavaScript, et concordance de la version entre `package.json`,
l'interface et le nom du cache.

## Ce qui n'est pas là

- **Pas de classement en ligne.** Aucun octet ne quitte la machine : ni serveur,
  ni télémétrie, ni CDN. La grille du jour se compare en collant un message
  quelque part, pas en consultant un tableau.
- **Pas d'annulation illimitée.** Trois par partie. Au-delà, ce ne serait plus
  une correction mais une machine à repasser le hasard.
- **Pas de rejeu de la grille du jour.** Elle se relève une fois, et le premier
  résultat est celui qui compte.
- **Pas de mode à deux ni de plateau tournant.** Le 2048 est un solitaire, et sa
  particularité tient à l'annulation, pas à l'accumulation de variantes.
