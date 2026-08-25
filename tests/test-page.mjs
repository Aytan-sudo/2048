// Verifications structurelles de la page : les erreurs que ces tests attrapent
// ne provoquent aucune exception, elles laissent juste un bouton muet, une
// tuile sans couleur ou une mise a jour invisible pour les joueurs deja venus.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { counter } from './harness.mjs';
import { VERSION } from '../js/config.js';
import { THEMES } from '../js/themes.js';

const { check, report } = counter();
console.log('\nPage\n');

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = chemin => readFileSync(join(racine, chemin), 'utf8');

// Un commentaire CSS mal referme avale les regles qui le suivent sans que rien
// ne proteste : la page s'affiche, la couleur manque. On verifie l'equilibre,
// puis on analyse le CSS debarrasse de ses commentaires — sinon une regle citee
// dans un commentaire passerait pour une vraie.
const sansCommentaires = texte => texte.replace(/\/\*[\s\S]*?\*\//g, '');

const page = lire('index.html');
const worker = lire('sw.js');
const interfaceJs = lire('js/ui.js');
const themesBrut = lire('css/themes.css');
const styleBrut = lire('css/style.css');
const themes = sansCommentaires(themesBrut);
const style = sansCommentaires(styleBrut);
const rendu = lire('js/rendu.js');

// Un module absent de la coquille du service worker manque a l'appel hors
// ligne : la page se charge, et l'import echoue en silence.
const paquet = JSON.parse(lire('package.json'));
const modules = readdirSync(join(racine, 'js')).filter(nom => nom.endsWith('.js'));

// ---------------------------------------------------------- la version, aux
// trois endroits. Un cache qui ne change pas de nom continue de servir l'ancien
// jeu, et rien ne le signale — sauf le numero affiche au bas des Options, qui
// vient du code reellement charge.
check('le paquet et le code s\'accordent sur la version', paquet.version === VERSION,
    `${paquet.version} vs ${VERSION}`);
check('la page affiche la meme', interfaceJs.includes('`2048 ${VERSION}`'));
check('le cache porte la meme', worker.includes(`const VERSION = '2048-${VERSION}'`));
check('le numero est en semver', /^\d+\.\d+\.\d+$/.test(VERSION), VERSION);

// ------------------------------------------------------- la coquille hors
// ligne. Un fichier absent manque a l'appel hors ligne : la page se charge, et
// l'import echoue en silence.
const coquille = [...worker.matchAll(/^\s+'([^']+)',?$/gm)].map(trouve => trouve[1]);
const attendus = [
    'index.html', 'manifest.webmanifest',
    ...readdirSync(join(racine, 'css')).map(nom => `css/${nom}`),
    ...modules.map(nom => `js/${nom}`),
    ...readdirSync(join(racine, 'assets')).map(nom => `assets/${nom}`)
];
const oublies = attendus.filter(chemin => !coquille.includes(chemin));
check('tous les fichiers du jeu sont en cache', oublies.length === 0, oublies.join(' '));
const fantomes = coquille.filter(chemin => chemin !== './' && !existsSync(join(racine, chemin)));
check('aucun fichier fantome dans la coquille', fantomes.length === 0, fantomes.join(' '));
check('la racine est servie hors ligne', coquille.includes('./'));
check('le service worker sert le reseau d\'abord', /respondWith\(\s*fetch\(/.test(worker));

// Un module que plus personne ne charge est du code mort qui continue de
// passer les tests. On suit les imports depuis app.js.
const vus = new Set();
const aVoir = ['app.js'];
while (aVoir.length) {
    const nom = aVoir.pop();
    if (vus.has(nom)) continue;
    vus.add(nom);
    for (const [, cible] of lire(`js/${nom}`).matchAll(/from\s+'\.\/([\w-]+\.js)'/g)) aVoir.push(cible);
}
const orphelins = modules.filter(nom => !vus.has(nom));
check('tous les modules sont relies a l\'application', orphelins.length === 0, orphelins.join(' '));

const nonControles = modules.filter(nom => !paquet.scripts.check.includes(`js/${nom}`));
check('npm run check couvre chaque module', nonControles.length === 0, nonControles.join(' '));
check('les scripts npm attendus existent',
    ['test', 'check', 'serve'].every(nom => typeof paquet.scripts[nom] === 'string'));

// Chaque suite doit etre appelee par `npm test` : un fichier de tests que
// personne ne lance est pire que pas de test du tout.
const suites = readdirSync(join(racine, 'tests')).filter(nom => nom.startsWith('test-'));
const nonLancees = suites.filter(nom => !paquet.scripts.test.includes(`tests/${nom}`));
check('npm test lance chaque suite', nonLancees.length === 0, nonLancees.join(' '));

// L'integration continue rejoue les deux scripts a chaque poussee.
const ci = lire('.github/workflows/tests.yml');
check('la CI lance les tests et le controle de syntaxe',
    ci.includes('npm test') && ci.includes('npm run check') && ci.includes('node-version: 22'));
check('la CI se declenche sur push et sur pull request',
    ci.includes('push:') && ci.includes('pull_request:'));

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

// ---------------------------------------------------------------- palettes
//
// Une variable oubliee dans une palette ne plante pas : elle laisse la couleur
// de la palette precedente au milieu d'un theme, souvent claire au milieu d'un
// sombre. C'est exactement le genre de faute qu'aucune exception ne signale.

for (const [nom, texte] of [['themes.css', themesBrut], ['style.css', styleBrut]]) {
    const ouvertures = (texte.match(/\/\*/g) || []).length;
    const fermetures = (texte.match(/\*\//g) || []).length;
    check(`${nom} : commentaires refermes`, ouvertures === fermetures,
        `${ouvertures} ouverts, ${fermetures} fermes`);
}

const blocDe = nom => {
    const debut = themes.indexOf(nom);
    if (debut === -1) return null;
    const ouvrante = themes.indexOf('{', debut);
    return themes.slice(ouvrante, themes.indexOf('}', ouvrante));
};
const variablesDe = texte => new Set([...texte.matchAll(/(--[\w-]+):/g)].map(trouve => trouve[1]));

const reference = variablesDe(blocDe('html[data-theme="sable"]') ?? '');
check('la palette de reference est fournie', reference.size >= 30, `${reference.size} variables`);
check('quatre a six palettes', THEMES.length >= 4 && THEMES.length <= 6, String(THEMES.length));

const incompletes = [];
for (const theme of THEMES) {
    const texte = blocDe(`html[data-theme="${theme.id}"]`);
    if (!texte) { incompletes.push(`${theme.id} (absente)`); continue; }
    const manquantes = [...reference].filter(nom => !variablesDe(texte).has(nom));
    if (manquantes.length) incompletes.push(`${theme.id} : ${manquantes.join(' ')}`);
}
check('chaque palette definit toutes les variables', incompletes.length === 0, incompletes.join(' | '));

check('des palettes claires et des sombres',
    /color-scheme: light/.test(themes) && /color-scheme: dark/.test(themes));

// Une couleur ecrite en dur hors des palettes echapperait aux themes : elle
// resterait claire au milieu d'un theme sombre.
const enDur = [...style.matchAll(/:\s*(#[0-9a-fA-F]{3,8}|rgba?\([\d.,\s]*\))/g)].map(trouve => trouve[1]);
check('aucune couleur en dur hors des palettes', enDur.length === 0, enDur.join(', '));

check('chaque palette a sa couleur de barre',
    THEMES.every(theme => /^#[0-9a-f]{6}$/i.test(theme.couleur)));
const sansPastille = THEMES.filter(theme => !themes.includes(`.pastille-theme[data-theme="${theme.id}"]`));
check('chaque palette a sa pastille', sansPastille.length === 0, sansPastille.map(theme => theme.id).join(' '));
check('le mode systeme a la sienne aussi', themes.includes('.pastille-theme[data-theme="auto"]'));

// Le script d'amorce recopie a la main la liste des palettes : s'il en oublie
// une, elle est refusee au chargement et la page s'ouvre sur une autre.
const connuesDuScript = THEMES.filter(theme => !page.includes(theme.id));
check('le script d\'amorce connait toutes les palettes',
    connuesDuScript.length === 0, connuesDuScript.map(theme => theme.id).join(' '));

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

check('le zoom tactile est neutralise', page.includes('user-scalable=no'));
check('les encoches sont prises en compte',
    page.includes('viewport-fit=cover') && style.includes('safe-area-inset-top'));
check('l\'apple-touch-icon est un PNG',
    page.includes('rel="apple-touch-icon" href="assets/icon-180.png"'));
check('les mouvements reduits sont respectes', style.includes('prefers-reduced-motion'));

report();
