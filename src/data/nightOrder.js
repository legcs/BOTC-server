// Ordre de nuit et actions de jour - Blood on the Clocktower: Trouble Brewing
// Basé sur les règles officielles et le Wiki BotC

export const nightOrder = {
  // PREMIÈRE NUIT - Ordre spécial avec informations initiales
  first: [
    { 
      role: null, 
      // À moins de 7 joueurs, les Sbires et le Démon ne se connaissent pas
      minPlayers: 7,
      action: 'Les Sbires se réveillent, se reconnaissent et apprennent qui est le Démon',
      description: 'Le Conteur réveille tous les Sbires. Ils se voient mutuellement, puis le Conteur leur désigne le Démon. Ils se rendorment.',
      order: 1
    },
    { 
      role: 'imp', 
      // Simple information : le Démon ne tue pas la première nuit
      type: 'none',
      minPlayers: 7,
      action: 'Le Démon découvre qui sont les Sbires et apprend 3 rôles non en jeu',
      description: 'Le Conteur montre au Démon qui sont ses Sbires, puis lui montre 3 jetons de rôles qui ne sont PAS en jeu (pour qu\'il puisse bluffer).',
      order: 2
    },
    { 
      role: 'poisoner', 
      action: 'L\'Empoisonneur choisit un joueur à empoisonner',
      description: 'L\'Empoisonneur se réveille et désigne un joueur. Ce joueur est empoisonné jusqu\'à la prochaine nuit (sa capacité dysfonctionne et il reçoit de fausses infos).',
      order: 3
    },
    { 
      role: 'washerwoman', 
      action: 'La Lavandière apprend un rôle Villageois parmi 2 joueurs',
      description: 'La Lavandière se réveille. Le Conteur lui montre 2 joueurs et 1 jeton de rôle Villageois. Un de ces joueurs a ce rôle (peut être faux si empoisonné/ivre).',
      order: 4
    },
    { 
      role: 'librarian', 
      action: 'Le Libraire apprend un rôle Étranger parmi 2 joueurs',
      description: 'Le Libraire se réveille. Le Conteur lui montre 2 joueurs et 1 jeton de rôle Étranger. Un de ces joueurs a ce rôle. Si 0 Étranger en jeu, le Conteur montre "0".',
      order: 5
    },
    { 
      role: 'investigator', 
      action: 'L\'Enquêteur apprend un rôle Sbire parmi 2 joueurs',
      description: 'L\'Enquêteur se réveille. Le Conteur lui montre 2 joueurs et 1 jeton de rôle Sbire. Un de ces joueurs a ce rôle (peut être faux si empoisonné/ivre).',
      order: 6
    },
    { 
      role: 'chef', 
      action: 'Le Chef apprend le nombre de paires de joueurs maléfiques voisins',
      description: 'Le Chef se réveille. Le Conteur lui montre un chiffre : le nombre de paires de joueurs maléfiques assis directement côte à côte. Un trio = 2 paires.',
      order: 7
    },
    { 
      role: 'empath', 
      action: 'L\'Empathe apprend combien de ses voisins vivants sont maléfiques',
      description: 'L\'Empathe se réveille. Le Conteur lui montre un chiffre (0, 1 ou 2) : le nombre de joueurs maléfiques parmi ses 2 voisins vivants directs.',
      order: 8
    },
    { 
      role: 'fortuneteller', 
      action: 'La Voyante choisit 2 joueurs et apprend si l\'un est le Démon',
      description: 'La Voyante se réveille et désigne 2 joueurs. Le Conteur répond OUI si l\'un est le Démon, NON sinon. Un joueur gentil (le Leurre) enregistre toujours OUI.',
      order: 9
    },
    { 
      role: 'butler', 
      action: 'Le Majordome choisit son Maître',
      description: 'Le Majordome se réveille et désigne un joueur (pas lui-même). Ce joueur devient son Maître. Demain, il ne pourra voter que si son Maître vote.',
      order: 10
    },
    { 
      role: 'spy', 
      action: 'L\'Espion consulte le Grimoire',
      description: 'L\'Espion se réveille. Le Conteur lui montre le Grimoire avec tous les rôles, statuts et informations de la partie.',
      order: 11
    },
  ],

  // AUTRES NUITS - Actions récurrentes
  other: [
    { 
      role: 'poisoner', 
      action: 'L\'Empoisonneur choisit un joueur à empoisonner',
      description: 'L\'Empoisonneur se réveille et désigne un joueur. Ce joueur est empoisonné jusqu\'à la prochaine nuit. Le joueur précédemment empoisonné ne l\'est plus.',
      order: 1
    },
    { 
      role: 'monk', 
      action: 'Le Moine choisit un joueur à protéger (pas soi-même)',
      description: 'Le Moine se réveille et désigne un joueur (pas lui-même). Si le Démon attaque ce joueur cette nuit, rien ne se passe (le joueur ne meurt pas).',
      order: 2
    },
    { 
      role: 'imp', 
      action: 'Le Démon (Imp) choisit un joueur à tuer',
      description: 'Le Démon se réveille et désigne un joueur. Ce joueur meurt (sauf s\'il est protégé par le Moine ou s\'il est le Soldat non-empoisonné). L\'Imp peut se choisir lui-même.',
      order: 4
    },
    { 
      role: 'ravenkeeper', 
      action: 'Le Gardien (s\'il meurt cette nuit) choisit un joueur et apprend son rôle',
      description: 'Si le Gardien meurt pendant la nuit, il se réveille immédiatement et désigne un joueur, vivant ou mort. Le Conteur lui montre le jeton de rôle de ce joueur.',
      order: 5
    },
    { 
      role: 'empath', 
      action: 'L\'Empathe apprend combien de ses voisins vivants sont maléfiques',
      description: 'L\'Empathe se réveille. Le Conteur lui montre un chiffre (0, 1 ou 2) : le nombre de joueurs maléfiques parmi ses 2 voisins vivants directs. Les morts ne comptent pas.',
      order: 6
    },
    { 
      role: 'fortuneteller', 
      action: 'La Voyante choisit 2 joueurs et apprend si l\'un est le Démon',
      description: 'La Voyante se réveille et désigne 2 joueurs. Le Conteur répond OUI si l\'un est le Démon (ou le Leurre), NON sinon.',
      order: 7
    },
    { 
      role: 'undertaker', 
      action: 'Le Croque-mort apprend le rôle du joueur exécuté aujourd\'hui',
      description: 'Le Croque-mort se réveille. Si un joueur a été exécuté aujourd\'hui, le Conteur lui montre le jeton de rôle de ce joueur. Si personne n\'a été exécuté, rien ne se passe.',
      order: 8
    },
    { 
      role: 'butler', 
      action: 'Le Majordome choisit son Maître',
      description: 'Le Majordome se réveille et désigne un joueur (pas lui-même). Ce joueur devient son nouveau Maître pour le jour suivant.',
      order: 9
    },
    { 
      role: 'spy', 
      action: 'L\'Espion consulte le Grimoire',
      description: 'L\'Espion se réveille. Le Conteur lui montre le Grimoire mis à jour avec tous les changements de la nuit (morts, empoisonnements, etc.).',
      order: 10
    },
  ],

  // PHASE DE JOUR - Actions diurnes
  day: [
    { 
      role: null, 
      action: 'Réveil et annonce des morts',
      description: 'Le Conteur annonce qui est mort pendant la nuit. Le rôle des morts n\'est pas révélé.',
      order: 1
    },
    { 
      role: null, 
      action: 'Débat et discussion',
      description: 'Les joueurs discutent librement, partagent leurs informations, accusent, défendent, et tentent de déduire qui est le Démon. Durée variable (15-45 min recommandées).',
      order: 2
    },
    { 
      role: null, 
      action: 'Nominations et votes pour exécution',
      description: 'Les joueurs nominent qui ils souhaitent exécuter (1 nomination par joueur vivant). Pour chaque nomination, vote à main levée. Le joueur avec le plus de votes est exécuté (égalité = personne).',
      order: 3
    },
    { 
      role: 'slayer', 
      action: 'Le Mercenaire peut utiliser sa capacité (une fois par partie)',
      description: 'À tout moment de la journée, le Mercenaire peut publiquement déclarer qu\'il utilise sa capacité et choisir un joueur. Si c\'est le Démon, il meurt immédiatement. Sinon, rien.',
      order: 4
    },
    { 
      role: 'virgin', 
      action: 'La Vierge est nominée pour la première fois : désignez son nominateur',
      description: 'La première fois que la Vierge est nominée, si le nominateur est un Villageois, il est exécuté immédiatement : c\'est l\'exécution du jour et les nominations s\'arrêtent. Sinon, rien ne se passe. La capacité est dépensée dans tous les cas, même si la Vierge est empoisonnée.',
      order: 5
    },
    { 
      role: 'mayor', 
      action: 'Si 3 joueurs vivants et aucune exécution, le Village gagne (Maire vivant et sain)',
      description: 'À la fin du jour, s\'il reste exactement 3 joueurs vivants et qu\'aucune exécution n\'a eu lieu (égalité ou pas de nomination), le Village gagne immédiatement.',
      order: 6
    },
  ],
};

// Export d'une fonction helper pour obtenir l'ordre complet avec les noms de rôles
export const getFullNightOrder = (phase = 'first') => {
  return nightOrder[phase].map(step => ({
    ...step,
    roleId: step.role,
    // Vous pouvez enrichir avec les noms des rôles depuis roles.js si besoin
  }));
};

// Export des rôles qui se réveillent chaque phase (utile pour l'UI)
export const wakeRoles = {
  first: nightOrder.first.filter(s => s.role).map(s => s.role),
  other: nightOrder.other.filter(s => s.role).map(s => s.role),
  day: nightOrder.day.filter(s => s.role).map(s => s.role),
};

export default nightOrder;