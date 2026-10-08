# Blood on the Clocktower - Grimoire du Conteur
## Structure du projet refactorisé

### 📁 Architecture des fichiers

```
src/
├── components/           # Composants React
│   ├── PlayerToken.jsx          # Token de joueur avec drag & drop
│   ├── StatusCard.jsx           # Carte de statut/édition du joueur
│   ├── VictoryModal.jsx         # Modal de victoire
│   ├── HelpModal.jsx            # Modal d'aide (à créer - voir original)
│   ├── Header.jsx               # En-tête de l'application
│   ├── GrimoireSection.jsx      # Section principale du grimoire
│   ├── Sidebar.jsx              # Barre latérale
│   ├── NightOrderPanel.jsx      # Panneau de l'ordre de nuit
│   ├── JournalPanel.jsx         # Panneau du journal
│   └── ActionControlPanel.jsx   # Panneau de contrôle des actions
│
├── data/                 # Données du jeu
│   ├── roles.js                 # Définition des rôles
│   └── nightOrder.js            # Ordre des actions de nuit
│
├── utils/                # Fonctions utilitaires
│   ├── roleUtils.js             # Utilitaires pour les rôles
│   ├── gameLogic.js             # Logique du jeu (victoire, assignation)
│   └── positionUtils.js         # Calcul des positions
│
├── styles/               # Styles
│   └── globalStyles.js          # Styles CSS-in-JS globaux
│
└── App.jsx               # Composant principal (à créer)
```

### 🔧 Fichiers créés

✅ **data/roles.js** - Toutes les données des rôles
✅ **data/nightOrder.js** - Ordre des actions de nuit
✅ **utils/roleUtils.js** - Fonctions utilitaires pour les rôles
✅ **utils/gameLogic.js** - Logique du jeu (assignation, victoire)
✅ **utils/positionUtils.js** - Calcul des positions des tokens
✅ **styles/globalStyles.js** - Styles CSS globaux
✅ **components/PlayerToken.jsx** - Composant de token de joueur
✅ **components/StatusCard.jsx** - Carte de statut du joueur
✅ **components/VictoryModal.jsx** - Modal de victoire

### 📝 Fichiers à créer

Les fichiers suivants doivent être extraits du fichier original :

1. **components/HelpModal.jsx** - Extraire la fonction `HelpModal` (lignes ~570-900)
2. **components/Header.jsx** - Extraire la section header (lignes ~2400-2520)
3. **components/ActionControlPanel.jsx** - Panneau de contrôle des actions actives
4. **components/Sidebar.jsx** - Barre latérale complète
5. **components/NightOrderPanel.jsx** - Liste des actions de nuit
6. **components/JournalPanel.jsx** - Journal des événements
7. **components/GrimoireSection.jsx** - Section principale avec les tokens
8. **App.jsx** - Composant principal avec toute la logique d'état

### 🚀 Avantages de cette structure

1. **Séparation des responsabilités** - Chaque fichier a un rôle précis
2. **Réutilisabilité** - Les composants peuvent être réutilisés
3. **Maintenabilité** - Plus facile de trouver et modifier du code
4. **Testabilité** - Chaque module peut être testé indépendamment
5. **Performance** - Possibilité d'optimiser avec React.memo sur les composants

### 📦 Imports typiques

```javascript
// Dans App.jsx
import { roles, allRoles } from './data/roles';
import { nightOrder } from './data/nightOrder';
import { getRoleCategory, getCategoryColor, getActionType } from './utils/roleUtils';
import { assignRoles, checkVictoryConditions, canUseAbility } from './utils/gameLogic';
import { calculateCirclePositions, calculateNewPlayerPosition } from './utils/positionUtils';
import { globalStyles } from './styles/globalStyles';

import PlayerToken from './components/PlayerToken';
import StatusCard from './components/StatusCard';
import VictoryModal from './components/VictoryModal';
import HelpModal from './components/HelpModal';
// ... autres composants
```

### 🔄 Prochaines étapes

1. Créer **App.jsx** avec toute la logique d'état (useState, useEffect)
2. Créer les composants manquants en extrayant du fichier original
3. Gérer les actions de nuit dans un module séparé (actionHandlers.js)
4. Ajouter PropTypes pour la validation des props
5. Optimiser avec React.memo si nécessaire

### 💡 Notes importantes

- Les **hooks** (useState, useEffect, useRef) restent dans App.jsx
- La **logique métier** est dans utils/gameLogic.js
- Les **données statiques** sont dans data/
- Les **composants** sont purement présentationnels quand possible
- Utiliser **PropTypes** ou **TypeScript** pour typer les props

### 🎯 Structure recommandée pour App.jsx

```javascript
function App() {
  // État
  const [players, setPlayers] = useState([]);
  const [currentTime, setCurrentTime] = useState('NUIT');
  const [currentNight, setCurrentNight] = useState(1);
  // ... autres états

  // Handlers
  const handlePlayerUpdate = (playerId, updates) => { ... };
  const handleAddPlayer = () => { ... };
  const handleExecutePlayer = (playerId) => { ... };
  // ... autres handlers

  // Effects
  useEffect(() => { ... }, [deps]);

  // Render
  return (
    <div>
      <style>{globalStyles}</style>
      <Header ... />
      <main>
        <GrimoireSection ... />
        <Sidebar ... />
      </main>
      {modals}
    </div>
  );
}
```