# Grimoire du Conteur — Blood on the Clocktower

Un grimoire numérique en français pour le Conteur de [Blood on the Clocktower](https://bloodontheclocktower.com/), basé sur le scénario *Trouble Brewing*. L'application remplace le grimoire physique : elle suit les joueurs, leurs rôles et leurs états, et guide le Conteur à travers chaque nuit.

Tout tourne dans le navigateur, sans serveur ni compte.

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
Documentation/           Notes sur la refactorisation du projet
```

## Technologies

- [React 19](https://react.dev/)
- [Vite 7](https://vite.dev/)
- [lucide-react](https://lucide.dev/) pour les icônes d'interface

## Avertissement

Projet de fan non officiel, sans lien avec The Pandemonium Institute. *Blood on the Clocktower* est une marque de The Pandemonium Institute.
