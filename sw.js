// Service worker : rend le jeu jouable hors ligne.
//
// Le jeu tient en quelques dizaines de kilo-octets et n'a aucune donnee a
// charger : tout est mis en cache a l'installation. On sert ensuite reseau
// d'abord, cache en secours. Le cache-first serait plus rapide et c'est un
// piege : un `git push` resterait invisible pour tous ceux qui ont deja ouvert
// le jeu, jusqu'a ce qu'on pense a changer VERSION a la main.
//
// Le nom du cache est exactement la version de package.json, qui est aussi
// celle affichee au bas des Options : un test compare les trois. Si le service
// worker sert un vieux cache, c'est le vieux numero qui s'affiche dans le jeu —
// on voit d'un coup d'oeil si la mise a jour est arrivee sur l'appareil.

const VERSION = '2048-1.1.3';
const COQUILLE = [
    './',
    'index.html',
    'css/themes.css',
    'css/style.css',
    'js/app.js',
    'js/config.js',
    'js/defi.js',
    'js/moteur.js',
    'js/partie.js',
    'js/hasard.js',
    'js/rendu.js',
    'js/son.js',
    'js/entree.js',
    'js/storage.js',
    'js/themes.js',
    'js/ui.js',
    'manifest.webmanifest',
    'assets/icon.svg',
    'assets/icon-180.png',
    'assets/icon-192.png',
    'assets/icon-512.png'
];

self.addEventListener('install', evenement => {
    evenement.waitUntil(
        caches.open(VERSION)
            .then(cache => cache.addAll(COQUILLE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', evenement => {
    evenement.waitUntil(
        caches.keys()
            .then(cles => Promise.all(cles.filter(cle => cle !== VERSION).map(cle => caches.delete(cle))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', evenement => {
    if (evenement.request.method !== 'GET') return;

    evenement.respondWith(
        fetch(evenement.request)
            .then(reponse => {
                if (reponse.ok) {
                    const copie = reponse.clone();
                    caches.open(VERSION).then(cache => cache.put(evenement.request, copie));
                }
                return reponse;
            })
            .catch(() => caches.match(evenement.request).then(cache => cache || caches.match('./')))
    );
});
