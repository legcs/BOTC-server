// Conditions de Victoire et Défaite - Blood on the Clocktower: Trouble Brewing
// Basé sur les règles officielles

export const victoryConditions = {
  // ============================================
  // VICTOIRE DU VILLAGE (Gentils)
  // ============================================
  good: {
    standard: {
      title: "Victoire Standard du Village",
      condition: "Le Démon est mort",
      description: "Dès que le Démon meurt (par exécution, capacité du Mercenaire, ou autre moyen), le Village gagne immédiatement la partie.",
      details: [
        "La partie s'arrête instantanément",
        "Peu importe le nombre de joueurs vivants",
        "Même si le Démon meurt de nuit, le Village gagne au réveil",
        "Exception : Si la Confidente se transforme en Démon, la partie continue"
      ],
      timing: "Immédiat (dès la mort du Démon)",
      examples: [
        "Le Démon est exécuté pendant le jour → Village gagne",
        "Le Mercenaire tue le Démon → Village gagne",
        "L'Imp se suicide alors qu'aucun Sbire n'est vivant → Village gagne"
      ]
    },
    mayor: {
      title: "Victoire Alternative du Maire",
      condition: "3 joueurs vivants + aucune exécution",
      description: "Si le Maire est en jeu : à la fin d'un jour, s'il reste exactement 3 joueurs vivants et qu'aucune exécution n'a eu lieu ce jour-là, le Village gagne immédiatement.",
      details: [
        "Doit être EXACTEMENT 3 joueurs vivants (pas plus, pas moins)",
        "Aucune exécution ne doit avoir eu lieu ce jour-là",
        "Le Maire doit être vivant",
        "Ne fonctionne pas si le Maire est empoisonné ou ivre",
        "Les égalités de vote comptent comme 'aucune exécution'",
        "Si personne n'est nominé, cela compte comme 'aucune exécution'"
      ],
      timing: "À la fin du jour (après la phase de nomination/vote)",
      examples: [
        "Jour commence avec 4 joueurs, le Démon tue 1 la nuit suivante → il reste 3, si pas d'exécution le lendemain → Village gagne",
        "3 joueurs vivants, égalité de votes → Village gagne",
        "3 joueurs vivants, personne n'est nominé → Village gagne",
        "3 joueurs vivants, quelqu'un est exécuté → Partie continue (il reste 2)"
      ],
      counterplay: [
        "Le Démon doit forcer une exécution chaque jour",
        "Les Maléfiques doivent éliminer le Maire rapidement",
        "Éviter d'arriver à 3 joueurs sans avoir identifié le Démon"
      ]
    }
  },

  // ============================================
  // VICTOIRE DU MAL (Maléfiques)
  // ============================================
  evil: {
    standard: {
      title: "Victoire Standard du Mal",
      condition: "2 joueurs vivants (1 Démon + 1 autre)",
      description: "Dès qu'il ne reste que 2 joueurs vivants dont le Démon en fait partie, le Mal gagne immédiatement.",
      details: [
        "Peu importe qui est le 2ème joueur (Villageois, Étranger ou Sbire)",
        "La partie s'arrête instantanément",
        "Vérifié immédiatement, de jour comme de nuit",
        "Si les deux camps gagnent en même temps, le Village l'emporte"
      ],
      timing: "Immédiat (dès qu'il ne reste que 2 joueurs vivants)",
      examples: [
        "Nuit : Le Démon tue → il reste 2 joueurs → Mal gagne",
        "Jour : Exécution → il reste 2 joueurs avec le Démon → Mal gagne",
        "Si le Démon se suicide et qu'une Confidente se transforme → La partie continue"
      ]
    },
    saint: {
      title: "Victoire Instantanée via le Saint",
      condition: "Le Saint est exécuté",
      description: "Si le Saint est exécuté pendant la phase de jour, le Mal gagne immédiatement.",
      details: [
        "Ne fonctionne pas si le Saint est empoisonné ou ivre : son exécution est alors sans conséquence",
        "Fonctionne même s'il reste beaucoup de joueurs vivants",
        "Ne fonctionne QUE si exécuté (pas s'il meurt de nuit)",
        "La victoire est immédiate (la partie s'arrête avant la nuit)",
        "C'est une capacité passive qui s'active automatiquement"
      ],
      timing: "Immédiat (dès que le Saint est exécuté)",
      examples: [
        "Le Saint est exécuté au jour 1 → Mal gagne immédiatement",
        "Le Saint est tué par le Démon la nuit → Rien ne se passe (pas exécution)",
        "Le Saint est exécuté alors qu'il ne reste que 3 joueurs → Mal gagne (pas le Village)",
        "Le Saint empoisonné est exécuté → Rien ne se passe, la partie continue"
      ],
      strategy: [
        "Le Saint doit rester discret",
        "Les Maléfiques tentent de faire exécuter le Saint",
        "Le Village doit éviter d'exécuter des joueurs suspects d'être Saint"
      ]
    }
  },

  // ============================================
  // CONDITIONS SPÉCIALES ET EXCEPTIONS
  // ============================================
  special: {
    scarletWoman: {
      title: "Transformation de la Confidente",
      condition: "Le Démon meurt avec 5+ joueurs vivants",
      description: "Si le Démon meurt alors qu'il reste 5 joueurs vivants ou plus, la Confidente devient immédiatement le Démon et la partie continue.",
      details: [
        "La Confidente SE TRANSFORME en Imp (elle devient Démon)",
        "Elle garde ses souvenirs de Confidente",
        "Elle apprend qu'elle est devenue Démon cette nuit",
        "La partie continue normalement",
        "Le Village ne gagne PAS (ils pensent avoir gagné mais non)",
        "Si la Confidente est morte, cette capacité ne fonctionne pas"
      ],
      timing: "Immédiat (dès la mort du Démon, avant l'annonce de victoire)",
      examples: [
        "7 joueurs vivants, le Démon est exécuté, Confidente vivante → Transformation → Partie continue",
        "4 joueurs vivants, le Démon meurt → Pas de transformation (moins de 5) → Village gagne",
        "6 joueurs vivants, le Démon meurt, Confidente morte → Pas de transformation → Village gagne",
        "Le nouveau Démon (ex-Confidente) peut attaquer normalement la nuit suivante"
      ],
      verification: "Nombre de joueurs VIVANTS au moment de la mort du Démon",
      counterplay: [
        "Le Village doit tuer la Confidente avant d'exécuter le Démon",
        "Attendre qu'il reste 4 joueurs ou moins avant d'exécuter le Démon",
        "Identifier et éliminer la Confidente en priorité"
      ]
    },
    impSuicide: {
      title: "Suicide de l'Imp",
      condition: "L'Imp se choisit lui-même comme cible",
      description: "L'Imp peut volontairement se suicider la nuit en se choisissant comme cible. Il meurt et un Sbire vivant, choisi par le Conteur, devient le nouvel Imp.",
      details: [
        "L'Imp peut se tuer lui-même n'importe quelle nuit",
        "Le Conteur désigne le Sbire vivant qui devient le nouvel Imp (la Confidente en priorité)",
        "Si aucun Sbire vivant : l'Imp meurt et le Village gagne",
        "Le nouveau Imp apprend qu'il est devenu Démon",
        "Stratégie pour confondre le Village (faux mort suspect)",
        "Si Confidente vivante avec 5+ joueurs : la Confidente devient Démon (pas le Sbire choisi)"
      ],
      timing: "Phase de nuit (action de l'Imp)",
      examples: [
        "L'Imp se tue, 1 Sbire vivant → Ce Sbire devient Imp",
        "L'Imp se tue, 0 Sbire vivant → Village gagne",
        "L'Imp se tue, Confidente vivante, 6 joueurs → Confidente devient Démon (priorité)",
        "Utilisé pour faire croire que l'Imp était le joueur qui vient de mourir de nuit"
      ],
      strategy: [
        "Permet de brouiller les pistes (qui est vraiment le Démon ?)",
        "Sacrifier un Sbire exposé en le transformant en Démon",
        "Attention : sans Sbire, c'est suicidaire pour le Mal"
      ]
    },
    drunk: {
      title: "Le Soûlard (Ivresse)",
      condition: "Un joueur pense avoir un rôle mais est en fait le Soûlard",
      description: "Le Soûlard pense avoir un rôle Villageois mais est en réalité un Étranger dont la capacité ne fonctionne jamais.",
      details: [
        "Le Soûlard NE SAIT PAS qu'il est Soûlard",
        "Il pense être un Villageois spécifique",
        "Ses informations peuvent être fausses (au choix du Conteur)",
        "Sa capacité ne fonctionne jamais (même s'il pense l'utiliser)",
        "Compte comme un joueur Gentil pour les conditions de victoire",
        "Le Conteur doit le réveiller comme son rôle supposé"
      ],
      impact: "Aucun impact direct sur les conditions de victoire, mais peut créer de la confusion",
      examples: [
        "Le Soûlard pense être Empathe → Le Conteur lui donne des chiffres aléatoires",
        "Le Soûlard pense être Mercenaire → Sa capacité ne tue jamais personne",
        "Le Soûlard pense être Voyante → Le Conteur lui donne des réponses aléatoires"
      ]
    },
    poisoner: {
      title: "Empoisonnement",
      condition: "Un joueur est empoisonné par l'Empoisonneur",
      description: "Un joueur empoisonné a sa capacité dysfonctionnelle et reçoit de fausses informations.",
      details: [
        "Le joueur empoisonné ne sait pas qu'il l'est",
        "Sa capacité ne fonctionne pas correctement",
        "Les informations qu'il reçoit peuvent être fausses (au choix du Conteur)",
        "L'empoisonnement dure la nuit et le jour suivant ; il cesse aussi dès que l'Empoisonneur meurt",
        "Ne change pas les conditions de victoire",
        "Un joueur peut être empoisonné plusieurs nuits de suite"
      ],
      impact: "Aucun impact direct sur victoire/défaite, mais crée de la désinformation",
      examples: [
        "Empathe empoisonné → Reçoit un mauvais chiffre",
        "Voyante empoisonnée → Reçoit de fausses réponses",
        "Soldat empoisonné → Peut être tué par le Démon",
        "Saint empoisonné → Son exécution ne fait pas gagner le Mal"
      ]
    }
  },

  // ============================================
  // RÉSUMÉ RAPIDE DES CONDITIONS
  // ============================================
  summary: {
    good: [
      "✅ Le Démon meurt → VILLAGE GAGNE",
      "✅ 3 joueurs + pas d'exécution ce jour → VILLAGE GAGNE (Maire vivant et sain)"
    ],
    evil: [
      "❌ 2 joueurs vivants (dont Démon) → MAL GAGNE",
      "❌ Saint exécuté (ni empoisonné ni ivre) → MAL GAGNE"
    ],
    exceptions: [
      "⚠️ Démon meurt avec 5+ vivants + Confidente vivante → Confidente devient Démon → PARTIE CONTINUE",
      "⚠️ Imp se suicide avec Sbire vivant → Sbire devient Imp → PARTIE CONTINUE"
    ]
  },

  // ============================================
  // ORDRE DE VÉRIFICATION
  // ============================================
  checkOrder: {
    title: "Ordre de vérification des conditions de victoire",
    description: "L'ordre dans lequel le Conteur vérifie les conditions de victoire",
    steps: [
      {
        moment: "Immédiatement après une exécution",
        checks: [
          "1. Le Saint a-t-il été exécuté ? → MAL GAGNE",
          "2. Le Démon a-t-il été exécuté ? → Vérifier Confidente",
          "   - Si Confidente + 5+ vivants → Transformation → Partie continue",
          "   - Sinon → VILLAGE GAGNE"
        ]
      },
      {
        moment: "À la fin du jour",
        checks: [
          "1. Reste-t-il exactement 3 joueurs vivants ?",
          "2. Y a-t-il eu une exécution aujourd'hui ?",
          "3. Si NON à la question 2 → VILLAGE GAGNE (Maire)"
        ]
      },
      {
        moment: "Au réveil après la nuit",
        checks: [
          "1. Y a-t-il eu des morts cette nuit ?",
          "2. Reste-t-il seulement 2 joueurs vivants ?",
          "3. L'un des 2 est-il le Démon ? → MAL GAGNE"
        ]
      },
      {
        moment: "Après la mort du Démon",
        checks: [
          "1. Combien de joueurs vivants ?",
          "2. Y a-t-il une Confidente vivante ?",
          "3. Si 5+ joueurs + Confidente vivante → Transformation",
          "4. Sinon → VILLAGE GAGNE"
        ]
      }
    ]
  },

  // ============================================
  // CAS LIMITES ET CLARIFICATIONS
  // ============================================
  edgeCases: {
    mayorVsEvil: {
      question: "Que se passe-t-il si on arrive à 2 joueurs via la victoire du Maire ?",
      answer: "Cela ne peut pas arriver. Le Maire gagne SEULEMENT s'il y a exactement 3 joueurs ET aucune exécution. Si on exécute pour passer à 2, le Mal gagne (la condition du Mal est vérifiée en premier).",
      example: "3 joueurs, exécution → 2 joueurs dont le Démon → MAL GAGNE (pas le Maire)"
    },
    saintVsMayor: {
      question: "Que se passe-t-il si le Saint est exécuté avec la condition du Maire active ?",
      answer: "Le Saint a priorité. Si le Saint est exécuté, le Mal gagne immédiatement, même si c'était le seul joueur exécuté ce jour avec 3 vivants.",
      example: "3 joueurs, Saint exécuté → MAL GAGNE (pas le Village via Maire)"
    },
    scarletWomanTiming: {
      question: "Si le Démon meurt avec exactement 5 joueurs, la Confidente se transforme-t-elle ?",
      answer: "OUI. La condition est '5 joueurs vivants OU PLUS'. Donc 5, 6, 7... tous fonctionnent.",
      clarification: "Comptez les joueurs VIVANTS au moment de la mort du Démon (incluant le Démon qui vient de mourir dans le compte de 5)."
    },
    multipleDeaths: {
      question: "Si plusieurs joueurs meurent en même temps et qu'on arrive à 2 vivants ?",
      answer: "Le Mal gagne si l'un des 2 survivants est le Démon. Peu importe comment on est arrivé à 2 joueurs.",
      example: "5 joueurs, le Mercenaire tue quelqu'un ET l'exécution tue quelqu'un ET le Démon tue quelqu'un la nuit même → 2 survivants dont Démon → MAL GAGNE"
    },
    drunkSaint: {
      question: "Le Soûlard qui pense être Saint peut-il faire perdre le Village ?",
      answer: "NON. Le Soûlard est un Étranger, pas un Saint. Si le Soûlard (qui pense être Saint) est exécuté, rien ne se passe. Seul le VRAI Saint fait perdre le Village.",
      important: "Le Conteur ne doit PAS faire perdre le Village si le Soûlard-Saint est exécuté."
    },
    poisonedSaint: {
      question: "Si le Saint empoisonné est exécuté, le Mal gagne-t-il ?",
      answer: "NON. Un Saint empoisonné ou ivre n'a plus de capacité : son exécution est sans conséquence et la partie continue.",
      exception: "Le Saint suit la règle générale de l'empoisonnement et de l'ivresse."
    }
  }
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Obtient toutes les conditions de victoire sous forme de tableau
 * @returns {Array} Liste de toutes les conditions
 */
export const getAllConditions = () => {
  return [
    ...Object.values(victoryConditions.good),
    ...Object.values(victoryConditions.evil)
  ];
};

/**
 * Obtient un résumé textuel des conditions de victoire
 * @param {string} team - 'good' ou 'evil'
 * @returns {Array<string>} Liste des conditions pour l'équipe
 */
export const getConditionsSummary = (team) => {
  return victoryConditions.summary[team] || [];
};

export default victoryConditions;