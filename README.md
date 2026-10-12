# Grimoire du Conteur — Blood on the Clocktower

Un grimoire numérique en français pour le Conteur de [Blood on the Clocktower](https://bloodontheclocktower.com/), basé sur le scénario *Trouble Brewing*. L'application remplace le grimoire physique : elle suit les joueurs, leurs rôles et leurs états, et guide le Conteur à travers chaque nuit.

Tout tourne dans le navigateur, sans serveur ni compte.

![Le grimoire pendant la deuxième nuit](Documentation/screenshots/06-nuit-2.jpg)

## Le jeu en bref

*Blood on the Clocktower* est un jeu de déduction sociale pour 5 à 15 joueurs, animé par un Conteur. Chaque joueur reçoit en secret un rôle doté d'une capacité, dans l'un des deux camps :

- **Le Village** (Villageois et Étrangers) doit trouver et exécuter le Démon.
- **Le Mal** (Sbires et Démon) connaît ses membres et doit survivre jusqu'à ce qu'il ne reste que deux joueurs en vie.

La partie alterne deux phases. La **nuit**, le Conteur réveille les rôles un par un, dans un ordre précis : certains obtiennent une information, d'autres empoisonnent, protègent ou tuent. Le **jour**, les joueurs débattent, se nominent et votent pour exécuter l'un d'entre eux.

Le Conteur est le seul à tout savoir. Son grimoire recense le rôle de chacun, qui est vivant, empoisonné ou protégé, et ce qui s'est passé chaque nuit. C'est ce grimoire que l'application remplace.

## Une partie pas à pas

Les captures ci-dessous viennent d'une vraie partie à 8 joueurs, jouée automatiquement par les tests (voir [Tests](#tests)).

### 1. Installer les joueurs

Le Conteur ajoute les joueurs, qui se placent en cercle comme autour de la table. À partir de 5 joueurs, le bouton « Assigner les rôles » apparaît.

![Huit joueurs sans rôle](Documentation/screenshots/01-joueurs.jpg)

### 2. Distribuer les rôles

Les rôles sont tirés au sort en respectant la répartition officielle (ici 5 Villageois, 1 Étranger, 1 Sbire et 1 Démon). La couleur du jeton indique la catégorie : bleu pour les Villageois, vert pour les Étrangers, rouge pour les Sbires, violet pour le Démon. Le panneau de droite liste les rôles à réveiller ; ceux qui ne sont pas en jeu sont grisés.

![Rôles distribués, première nuit](Documentation/screenshots/02-roles.jpg)

### 3. Suivre chaque joueur

Un clic sur un jeton ouvre la fiche du joueur : changement de rôle, statuts (vivant, exécuté, Leurre, Maître, ivre, empoisonné, protégé) et notes du Conteur.

![Fiche d'un joueur](Documentation/screenshots/03-fiche-joueur.jpg)

### 4. Jouer la nuit

Le Conteur clique sur chaque étape dans l'ordre. Quand un rôle doit désigner des joueurs, il suffit de cliquer sur leurs jetons puis de confirmer : l'application calcule le résultat et l'inscrit au journal. Ici, l'Empoisonneur a empoisonné Hugo (badge ☠️) et la Voyante désigne Alice et Bruno pour savoir si l'un d'eux est le Démon.

Un rôle empoisonné ou ivre reçoit une information fausse, signalée comme telle dans le journal.

![La Voyante choisit deux joueurs](Documentation/screenshots/04-action-voyante.jpg)

### 5. Jouer le jour

Au lever du soleil, le décor change et le panneau affiche les étapes de la journée. Après les débats et le vote, le Conteur clique sur le joueur exécuté, ou sur « Pas d'exécution ». La nuit suivante commence aussitôt.

![Phase de jour et choix du joueur à exécuter](Documentation/screenshots/05-jour.jpg)

### 6. Les nuits suivantes

À partir de la deuxième nuit, le Démon tue. Les joueurs morts sont grisés et le compteur central indique le nombre de survivants. Dans cette partie, Emma a été exécutée le premier jour, puis le Démon a tué Gaëlle, le Gardien, qui apprend en mourant le rôle d'un joueur de son choix (c'est la capture en haut de cette page).

### 7. Fin de partie

L'application vérifie les conditions de victoire après chaque mort. Ici, le Village exécute Bruno, le Démon, le deuxième jour.

![Victoire du Village](Documentation/screenshots/07-victoire.jpg)

### Aide intégrée

Le bouton « ? » ouvre un guide du Conteur : règles, description des rôles, ordre de nuit et conditions de victoire.

![Guide du Conteur](Documentation/screenshots/08-aide.jpg)

### De 5 à 15 joueurs, sur ordinateur ou téléphone

<p>
  <img src="Documentation/screenshots/09-quinze-joueurs.jpg" alt="Partie à 15 joueurs" width="72%">
  <img src="Documentation/screenshots/10-mobile.jpg" alt="Affichage sur téléphone" width="21%">
</p>

## Fonctionnalités

- **Cercle des joueurs** : ajout des joueurs, jetons disposés en cercle et déplaçables à la souris ou au doigt.
- **Rôles** : distribution automatique des rôles ou attribution manuelle, avec les 22 rôles de *Trouble Brewing* (Villageois, Étrangers, Sbires, Démon).
- **États des joueurs** : mort, exécuté, empoisonné, protégé, ivre, capacité utilisée, notes libres.
- **Ordre de nuit** : liste des rôles à réveiller pour la première nuit et les suivantes, avec suivi des actions effectuées.
- **Actions guidées** : sélection des cibles et résolution des capacités (Empoisonneur, Moine, Démon, Voyante, Mercenaire, etc.).
- **Journal** : historique des événements, nuit par nuit.
- **Conditions de victoire** : détection de la fin de partie et annonce du camp vainqueur.
- **Aide intégrée** : rappel des règles, des rôles et de l'ordre de nuit.
- **Sauvegarde automatique** : la partie est conservée dans le navigateur (`localStorage`) et survit à un rechargement de la page.
- **Mode plein écran** et alternance visuelle jour / nuit.

## Démarrage

Prérequis : [Node.js](https://nodejs.org/) 20 ou plus récent.

```bash
git clone https://github.com/legcs/BOTC-server.git
cd BOTC-server
npm install
npm run dev
```

L'application est alors disponible sur `http://localhost:5173`. Le serveur de développement écoute aussi sur le réseau local (`vite --host`), ce qui permet de l'ouvrir depuis une tablette ou un téléphone connecté au même réseau.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Lance le serveur de développement avec rechargement à chaud |
| `npm run build` | Génère la version de production dans `dist/` |
| `npm run preview` | Sert localement la version de production |
| `npm run lint` | Analyse le code avec ESLint |
| `npm run test:e2e` | Lance les tests de bout en bout et régénère les captures |

## Tests

Les tests de bout en bout pilotent l'application dans un vrai navigateur avec [Playwright](https://playwright.dev/) :

```bash
npx playwright install chromium   # une seule fois
npm run test:e2e
```

Le script `tests/e2e.mjs` démarre son propre serveur Vite, puis :

- joue une partie complète à 8 joueurs, de l'ajout des joueurs à la victoire, en vérifiant l'état du grimoire à chaque étape ;
- vérifie les règles une par une à partir de parties préparées : Moine, Soldat, Voyante et Leurre, Empathe, Gardien, Croque-mort, Mercenaire, Majordome, Confidente, Saint, Maire, poison et conditions de victoire ;
- contrôle la répartition des rôles de 5 à 15 joueurs, la sauvegarde après rechargement et l'affichage sur téléphone ;
- régénère les captures d'écran de ce README dans `Documentation/screenshots/`.

Le tirage des rôles utilise une graine fixe, donc la partie jouée et les captures sont reproductibles. `SEED=41 npm run test:e2e` joue une autre distribution.

## Structure du projet

```
src/
├── App.jsx              État de la partie et orchestration
├── components/          Interface (en-tête, grimoire, jetons, panneaux, modales)
│   └── roles/           Logique de la capacité de chaque rôle
├── data/                Rôles, ordre de nuit, conditions de victoire
├── utils/               Règles du jeu, placement des jetons, sauvegarde
└── styles/              Styles globaux
public/images/           Icônes des rôles et fonds jour / nuit
tests/e2e.mjs            Tests de bout en bout (Playwright)
Documentation/           Notes sur la refactorisation et captures d'écran
```

## Technologies

- [React 19](https://react.dev/)
- [Vite 7](https://vite.dev/)
- [lucide-react](https://lucide.dev/) pour les icônes d'interface
- [Playwright](https://playwright.dev/) pour les tests

## Avertissement

Projet de fan non officiel, sans lien avec The Pandemonium Institute. *Blood on the Clocktower* est une marque de The Pandemonium Institute.
