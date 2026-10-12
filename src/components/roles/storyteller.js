import { playableRoles, roles } from '../../data/roles';
import { canUseAbility } from '../../utils/gameLogic';

// Décisions que le jeu laisse au Conteur pendant la résolution d'une capacité :
// - sous quel jour un Ermite ou un Espion est vu par cette capacité ;
// - quelle information donner à un joueur empoisonné ou ivre.

const ROLE_LABEL = { recluse: 'Ermite', spy: 'Espion' };
export const isAmbiguous = (player) => !!player && (player.role === 'recluse' || player.role === 'spy');

const title = (player) => `${player.name} (${ROLE_LABEL[player.role]}) : comment est-il vu ?`;

// Chaque question propose en premier la réponse « normale » (le vrai rôle)
export const alignmentQuestion = (player) => ({
  player,
  title: title(player),
  text: 'Le Conteur choisit s\'il est détecté comme gentil ou maléfique.',
  options: player.role === 'recluse'
    ? [{ label: 'Gentil', value: null }, { label: 'Maléfique', value: 'imp' }]
    : [{ label: 'Maléfique', value: null }, { label: 'Gentil', value: 'chef' }],
});

export const demonQuestion = (player) => ({
  player,
  title: title(player),
  text: 'L\'Ermite peut être vu comme le Démon.',
  options: [{ label: 'Pas le Démon', value: null }, { label: 'Vu comme le Démon', value: 'imp' }],
});

export const townsfolkQuestion = (player) => ({
  player,
  title: title(player),
  text: 'L\'Espion peut être vu comme un Villageois.',
  options: [{ label: 'Pas un Villageois', value: null }, { label: 'Vu comme un Villageois', value: 'chef' }],
});

const disguises = (player) => (player.role === 'recluse'
  ? [...roles.minions, ...roles.demons.filter(r => r.id === 'imp')]
  : [...roles.townsfolk.filter(r => r.id !== 'unknown'), ...roles.outsiders]);

// Sous quel rôle précis il apparaît (Croque-mort, Gardien)
export const roleQuestion = (player) => ({
  player,
  title: title(player),
  text: 'Le Conteur choisit le rôle montré.',
  options: [
    { label: `${ROLE_LABEL[player.role]} (son vrai rôle)`, value: null },
    ...disguises(player).map(r => ({ label: r.name, value: r.id })),
  ],
});

// Sous quel rôle d'une catégorie donnée il apparaît (Lavandière, Libraire, Enquêteur)
export const categoryQuestion = (player, pool) => ({
  player,
  title: title(player),
  text: 'Aucun des deux joueurs n\'a réellement ce type de rôle : le Conteur choisit celui qui est montré.',
  options: pool.map(r => ({ label: r.name, value: r.id })),
});

// Pose les questions une à une, puis rend les joueurs tels que la capacité doit les voir
export const askRegistration = (ask, players, questions, done) => {
  const next = (answers) => {
    if (!ask || answers.length === questions.length) {
      const seenAs = new Map(questions.map((q, i) => [q.player.id, ask ? answers[i] : q.options[0].value]));
      done(players.map(p => (seenAs.has(p.id) ? { ...p, seenAs: seenAs.get(p.id) } : p)));
      return;
    }
    const question = questions[answers.length];
    ask({
      title: question.title,
      text: question.text,
      options: question.options.map(o => ({ label: o.label, run: () => next([...answers, o.value]) })),
    });
  };
  next([]);
};

// Donne une information à un joueur. Sain, il reçoit la vérité. Empoisonné ou ivre,
// c'est le Conteur qui choisit ce qu'il apprend, vrai ou faux.
//   describe(valeur, mention) → texte du journal ; `mention` vaut '' ou ' (empoisonné/ivre)'
export const inform = ({ actor, ask, addNightEvent, actionKey }, { truth, options, describe, impaired = '(empoisonné/ivre)' }) => {
  if (canUseAbility(actor) || !ask) {
    addNightEvent(describe(truth, ''), actionKey);
    return;
  }
  ask({
    title: `${actor?.name ?? 'Ce joueur'} est empoisonné ou ivre`,
    text: 'Le Conteur choisit l\'information qu\'il reçoit : elle peut être fausse.',
    options: options.map(o => ({
      label: o.value === truth ? `${o.label} (vrai)` : o.label,
      run: () => addNightEvent(`${describe(o.value, ` ${impaired}`)}${o.value === truth ? '' : ' [FAUX]'}`, actionKey),
    })),
  });
};

export const roleOptions = (pool = playableRoles) => pool.map(r => ({ label: r.name, value: r.id }));
