// Verifications structurelles de la page : les erreurs que ces tests attrapent
// ne provoquent aucune exception, elles laissent juste un bouton muet, une
// tuile sans couleur ou une mise a jour invisible pour les joueurs deja venus.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { counter } from './harness.mjs';

const { check, report } = counter();
console.log('\nPage\n');

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = chemin => readFileSync(join(racine, chemin), 'utf8');

const page = lire('index.html');
const worker = lire('sw.js');
const interfaceJs = lire('js/ui.js');
const style = lire('css/style.css');
const rendu = lire('js/rendu.js');

// Un module absent de la coquille du service worker manque a l'appel hors
// ligne : la page se charge, et l'import echoue en silence.
const modules = readdirSync(join(racine, 'js')).filter(nom => nom.endsWith('.js'));
const absents = modules.filter(nom => !worker.includes(`js/${nom}`));
check('le service worker connait tous les modules', absents.length === 0, absents.join(' '));

check('le service worker met en cache la feuille de style', worker.includes('css/style.css'));
check('le service worker porte un numero de version', /const VERSION = '2048-v\d+'/.test(worker));

// Chaque identifiant cherche par l'interface doit exister dans la page : une
// faute de frappe donne un `null` qui ne se voit qu'au premier clic.
const demandes = [...interfaceJs.matchAll(/\$\('([a-z-]+)'\)/g)].map(trouve => trouve[1]);
const introuvables = [...new Set(demandes)].filter(id => !page.includes(`id="${id}"`));
check('tous les elements cherches par l\'interface existent dans la page',
    introuvables.length === 0, introuvables.join(' '));

check('la page charge l\'application en module',
    page.includes('<script type="module" src="js/app.js">'));

// Le script pose-theme est recopie a la main dans le HTML : s'il lit une autre
// cle que le module de stockage, le theme clignote a chaque ouverture.
check('le script d\'amorce lit la meme cle que le stockage',
    page.includes("localStorage.getItem('2048.preferences')")
    && lire('js/storage.js').includes("CLE_PREFERENCES = '2048.preferences'"));

// Les couleurs des tuiles vivent dans le CSS, indexees par valeur. Une valeur
// oubliee donnerait une tuile sans couleur au moment le plus memorable.
const valeurs = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
const sansCouleur = valeurs.filter(valeur => !style.includes(`.tuile[data-valeur="${valeur}"]`));
check('chaque valeur de tuile a sa couleur', sansCouleur.length === 0, sansCouleur.join(' '));
check('les tuiles au-dela de la rampe en ont une aussi',
    style.includes('.tuile[data-valeur="max"]'));

// Le rendu attend la fin du glissement avant de poser les tuiles nees. Si les
// deux durees divergent, les fusions apparaissent avant l'arrivee des tuiles.
const dureeJs = /DUREE_GLISSE = (\d+)/.exec(rendu)?.[1];
const dureeCss = /transition: translate (\d+)ms/.exec(style)?.[1];
check('l\'attente du JavaScript colle a la transition du CSS',
    dureeJs !== undefined && dureeJs === dureeCss, `${dureeJs} vs ${dureeCss}`);

// Le manifeste porte l'identite du jeu : un champ perdu casse l'installation
// sur telephone, et la carte du hub qui le lit.
const manifeste = JSON.parse(lire('manifest.webmanifest'));
check('le manifeste a un nom et une description',
    manifeste.name.length > 0 && manifeste.description.length > 20);
check('le manifeste declare ses icones',
    manifeste.icons.length >= 2 && manifeste.icons.every(icone => icone.src.startsWith('assets/')));

// La page et le manifeste doivent annoncer la meme couleur de depart, sinon
// l'ecran de lancement de l'application installee clignote au demarrage.
check('la page et le manifeste s\'accordent sur la couleur de depart',
    page.includes(`content="${manifeste.theme_color}"`));

// Cacher un bouton passe par l'attribut `hidden`, que la mise en forme des
// boutons annule si le CSS ne le rappelle pas explicitement.
check('l\'attribut hidden cache vraiment', /\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(style));

// Le plateau se laisse glisser au doigt : sans touch-action, chaque geste fait
// aussi defiler la page derriere.
check('le plateau capte les gestes plutot que le defilement',
    /\.plateau\s*\{[^}]*touch-action:\s*none/s.test(style));

report();
