// Tests de bout en bout du grimoire, pilotés par Playwright.
// Lance son propre serveur Vite, joue une partie complète, vérifie les règles
// et enregistre les captures d'écran utilisées par le README.
//
//   npm run test:e2e
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { nightOrder } from '../src/data/nightOrder.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'Documentation', 'screenshots');
const STORAGE_KEY = 'botc-grimoire-v1';
// Graine du tirage des rôles : la partie jouée (et les captures) est reproductible
const SEED = Number(process.env.SEED ?? 32);
const NAMES = ['Alice', 'Bruno', 'Chloé', 'David', 'Emma', 'Farid', 'Gaëlle', 'Hugo'];

const SELECT_ROLES = ['poisoner', 'slayer', 'monk', 'imp', 'fortuneteller', 'washerwoman', 'librarian', 'investigator', 'butler', 'ravenkeeper'];
const TOWNSFOLK = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'monk', 'ravenkeeper', 'virgin', 'slayer', 'soldier', 'mayor'];
const OUTSIDERS = ['butler', 'drunk', 'recluse', 'saint'];
const MINIONS = ['poisoner', 'spy', 'scarletwoman', 'baron'];

mkdirSync(SHOTS, { recursive: true });

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199 } });
await server.listen();
const URL = server.resolvedUrls.local[0];

// Les captures ont besoin de polices emoji et symboles, absentes de certaines machines
// (serveurs, CI) : on rattache celles de Noto aux polices de l'application, pour chaque
// graisse utilisée, uniquement dans le navigateur de test.
const FALLBACK_FONTS = ['Noto Color Emoji', 'Noto Sans Symbols 2'];
const fallbackCss = await Promise.all(FALLBACK_FONTS.map((font) =>
  fetch(`https://fonts.googleapis.com/css2?family=${font.replaceAll(' ', '+')}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' },
  })
    .then((r) => (r.ok ? r.text() : ''))
    .then((css) => ['Crimson Text', 'Cinzel'].flatMap((family) => [400, 600, 700].map((weight) => css
      .replaceAll(`'${font}'`, `'${family}'`)
      .replaceAll('font-weight: 400', `font-weight: ${weight}`))).join('\n'))
    .catch(() => '')))
  .then((parts) => parts.join('\n'));

const browser = await chromium.launch();
const results = [];
let page;
let errors;

// ===== OUTILS =====
const newPage = async (viewport = { width: 1440, height: 900 }, seed = SEED) => {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  // Math.random déterministe (mulberry32)
  await context.addInitScript((s) => {
    let a = s >>> 0;
    Math.random = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
  page = await context.newPage();
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await ready('header');
};

const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
const settle = () => page.waitForTimeout(150);
const ready = async (selector) => {
  await page.waitForSelector(selector);
  if (fallbackCss) await page.addStyleTag({ content: fallbackCss });
  await settle();
};
const shot = async (name) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2300); // fondu jour/nuit (2 s)
  await page.screenshot({ path: join(SHOTS, `${name}.jpg`), quality: 85 });
};
const token = (name) => page.locator('.player-token', { hasText: name });
const journal = () => page.locator('aside').innerText();
const headerText = () => page.locator('header').innerText();

const addPlayers = async (names) => {
  for (const name of names) {
    await page.getByRole('button', { name: '+ Ajouter un joueur' }).click();
    await page.getByPlaceholder('Nom du joueur...').fill(name);
    await page.keyboard.press('Enter');
  }
  await settle();
};

const player = (overrides) => ({
  role: 'unknown', alive: true, executed: false, poisoned: false, protected: false,
  decoy: false, ivre: false, master: false, used: false, notes: '', ...overrides,
});

// Charge une partie préparée (rôles imposés) comme si elle avait été sauvegardée
const loadGame = async (roles, overrides = {}) => {
  const players = roles.map((r, i) => player({ id: i + 1, name: NAMES[i], ...(typeof r === 'string' ? { role: r } : r) }));
  const game = {
    players, currentTime: 'NUIT', currentNight: 2, nightLog: [{ night: 2, events: [] }],
    completedActions: [], roleAssigned: true, isStarted: true, executionToday: false,
    lastExecutedPlayerId: null, killedTonightId: null, ...overrides,
  };
  await page.evaluate(([k, g]) => localStorage.setItem(k, JSON.stringify(g)), [STORAGE_KEY, game]);
  await page.reload();
  await ready('.player-token');
};

// Après un rechargement, la modale de victoire se rouvre. Elle est animée en continu :
// le clic est forcé, sans attendre que le bouton soit immobile.
const closeVictory = async () => {
  const close = page.getByRole('button', { name: 'Continuer' });
  if (await close.count()) await close.click({ force: true });
};

const nameOf = async (role) => (await state()).players.find((p) => p.role === role)?.name;

// Joue une étape de l'ordre de nuit/jour, avec sélection de cibles si nécessaire
const playStep = async (action, targets = [], onSelected = null) => {
  await page.locator('.night-step', { hasText: action }).click();
  if (targets.length > 0) {
    await page.getByText('Sélectionnez').waitFor();
    for (const name of targets) await token(name).click();
    if (onSelected) await onSelected();
    await page.getByRole('button', { name: '✓ Confirmer' }).click();
  }
  await settle();
};

const actionOf = (phase, role) => nightOrder[phase].find((s) => s.role === role).action;

const execute = async (name) => {
  await page.locator('aside').getByRole('button', { name, exact: true }).click();
  await settle();
};

const test = async (name, fn) => {
  try {
    await fn();
    assert.deepEqual(errors, [], 'erreurs JavaScript dans la page');
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  ✗ ${name}\n    ${String(err.message).split('\n').join('\n    ')}`);
  }
};

// Cibles choisies par chaque rôle pendant la partie de démonstration
const chooseTargets = (role, st) => {
  const alive = st.players.filter((p) => p.alive);
  const me = alive.find((p) => p.role === role);
  const others = alive.filter((p) => p.id !== me?.id);
  const imp = alive.find((p) => p.role === 'imp');
  const good = others.filter((p) => TOWNSFOLK.includes(p.role) || OUTSIDERS.includes(p.role));
  const names = (list) => list.map((p) => p.name);
  switch (role) {
    case 'poisoner': return names(good.filter((p) => p.role !== 'fortuneteller').slice(-1));
    case 'washerwoman':
    case 'librarian':
    case 'investigator': return names(others.slice(0, 2));
    case 'fortuneteller': return names([imp, good.find((p) => !p.decoy)]);
    case 'butler': return names(good.slice(0, 1));
    case 'monk': return names(good.filter((p) => p.role !== 'ravenkeeper').slice(0, 1));
    case 'imp': {
      const prey = good.filter((p) => !p.protected && p.role !== 'soldier');
      return names([prey.find((p) => p.role === 'ravenkeeper') ?? prey.at(-1)]);
    }
    case 'ravenkeeper': return names([imp]);
    case 'slayer': return names(others.filter((p) => MINIONS.includes(p.role)).slice(0, 1));
    default: return [];
  }
};

// Joue toutes les étapes actives d'une phase et vérifie l'état de chaque étape
const playPhase = async (phase, { skip = [], onSelected = {} } = {}) => {
  for (const step of nightOrder[phase]) {
    const st = await state();
    // Le Gardien ne se réveille que la nuit où il est tué
    const expectedActive = step.role === null || (step.role === 'ravenkeeper'
      ? st.players.some((p) => p.role === 'ravenkeeper' && p.id === st.killedTonightId)
      : st.players.some((p) => p.alive && p.role === step.role));
    const el = page.locator('.night-step', { hasText: step.action });
    const active = await el.evaluate((e) => e.style.opacity === '1');
    assert.equal(active, expectedActive, `étape « ${step.action} » active`);
    if (!active || skip.includes(step.role)) continue;

    const targets = SELECT_ROLES.includes(step.role) && step.type !== 'none' ? chooseTargets(step.role, st) : [];
    await playStep(step.action, targets, onSelected[step.role]);
    const after = await state();
    assert.equal(after.completedActions.length, st.completedActions.length + 1, `étape « ${step.action} » terminée`);
  }
};

// ===== PARTIE COMPLÈTE (et captures du README) =====
console.log(`\nPartie complète (graine ${SEED})`);
await newPage();

await test('écran d\'accueil vide', async () => {
  assert.match(await headerText(), /NUIT 1/);
  assert.match(await journal(), /Veuillez ajouter au moins 5 joueurs et assigner les rôles/);
  assert.match(await journal(), /Aucun événement/);
});

await test('ajout des joueurs et seuil de 5 joueurs', async () => {
  await addPlayers(NAMES.slice(0, 4));
  assert.equal(await page.getByRole('button', { name: 'Assigner les rôles' }).count(), 0);
  await addPlayers(NAMES.slice(4));
  assert.equal(await page.locator('.player-token').count(), 8);
  assert.ok(await page.getByText('8 / 8').isVisible());
  assert.ok(await page.getByRole('button', { name: 'Assigner les rôles' }).isVisible());

  await page.getByRole('button', { name: '+ Ajouter un joueur' }).click();
  await page.getByPlaceholder('Nom du joueur...').fill('   ');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.player-token').count(), 8, 'un nom vide est refusé');
  await page.getByRole('button', { name: '✕' }).click();
  await shot('01-joueurs');
});

await test('distribution des rôles conforme à la répartition officielle', async () => {
  await page.getByRole('button', { name: 'Assigner les rôles' }).click();
  await settle();
  const { players } = await state();
  const roles = players.map((p) => p.role);
  const count = (list) => roles.filter((r) => list.includes(r)).length;
  const baron = roles.includes('baron');
  assert.equal(new Set(roles).size, 8, 'rôles tous différents');
  assert.equal(count(['imp']), 1);
  assert.equal(count(MINIONS), 1);
  assert.equal(count(OUTSIDERS), baron ? 3 : 1);
  assert.equal(count(TOWNSFOLK), baron ? 3 : 5);
  assert.equal(players.filter((p) => p.decoy).length, roles.includes('fortuneteller') ? 1 : 0, 'Leurre de la Voyante');
  assert.match(await journal(), /Rôles distribués : \d Villageois, \d Étrangers, 1 Sbires, 1 Démon/);
  console.log(`    rôles : ${players.map((p) => `${p.name}=${p.role}${p.decoy ? '(leurre)' : ''}`).join(', ')}`);
  await shot('02-roles');
});

await test('un jeton déplacé à la main garde sa place', async () => {
  // Centre du jeton (sa taille varie au survol)
  const center = async (name) => {
    const box = await token(name).boundingBox();
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  };
  const near = (a, b) => Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2;
  const before = await center('Farid');
  await token('Farid').dragTo(page.locator('.grimoire-section'), { targetPosition: { x: 120, y: 150 } });
  await settle();
  const moved = await center('Farid');
  assert.ok(Math.abs(moved.x - 120) <= 5 && Math.abs(moved.y - before.y) > 50, 'jeton déplacé');
  await token('Alice').click();
  await page.locator('.grimoire-section').click({ position: { x: 5, y: 5 } });
  await settle();
  assert.ok(near(await center('Farid'), moved), 'position conservée après d\'autres actions');
  // Les positions manuelles valent pour une taille de grimoire donnée
  await page.setViewportSize({ width: 1400, height: 900 });
  await settle();
  assert.ok(!near(await center('Farid'), moved), 'replacé en cercle quand le grimoire change de taille');
  await page.setViewportSize({ width: 1440, height: 900 });
  await settle();
  assert.ok(near(await center('Farid'), moved), 'position retrouvée à la taille d\'origine');
  // Les positions ne sont pas sauvegardées : un rechargement remet les jetons en cercle
  await page.reload();
  await ready('.player-token');
  assert.ok(near(await center('Farid'), before), 'cercle après rechargement');
});

await test('fiche d\'un joueur : notes et statuts', async () => {
  await token('Alice').click();
  const notes = page.getByPlaceholder('Informations, rappels...');
  await notes.fill('Prétend être la Voyante');
  await page.getByText('🍺 Ivre').click();
  await settle();
  let alice = (await state()).players.find((p) => p.name === 'Alice');
  assert.equal(alice.notes, 'Prétend être la Voyante');
  assert.equal(alice.ivre, true);
  await shot('03-fiche-joueur');
  await page.getByText('🍺 Ivre').click();
  await notes.fill('');
  await page.locator('.grimoire-section').click({ position: { x: 5, y: 5 } });
  await settle();
  alice = (await state()).players.find((p) => p.name === 'Alice');
  assert.equal(alice.ivre, false);
  assert.equal(await notes.count(), 0, 'fiche refermée');
});

await test('première nuit : chaque rôle en jeu agit dans l\'ordre', async () => {
  await playPhase('first', {
    onSelected: { fortuneteller: () => shot('04-action-voyante') },
  });
  const st = await state();
  assert.ok(st.players.every((p) => p.alive), 'personne ne meurt la première nuit');
  assert.match(await journal(), /Le Démon découvre qui sont les Sbires/);
  if (st.players.some((p) => p.role === 'poisoner')) {
    assert.equal(st.players.filter((p) => p.poisoned).length, 1, 'un joueur empoisonné');
  }
  if (st.players.some((p) => p.role === 'fortuneteller' && !p.poisoned)) {
    assert.match(await journal(), /Voyante vérifie .*: Il y a un démon/);
  }
});

await test('lever du jour', async () => {
  await page.getByRole('button', { name: '☀️ Nouvelle Journée' }).click();
  await settle();
  assert.match(await headerText(), /JOUR 1/);
  assert.match(await journal(), /Lever du soleil/);
  assert.match(await journal(), /Joueur à exécuter/);
  assert.equal(await page.getByRole('button', { name: '+ Ajouter un joueur' }).count(), 0, 'plus d\'ajout de joueur en cours de partie');
  await playPhase('day', { skip: ['slayer', 'virgin', 'mayor'] });
  await shot('05-jour');
});

await test('exécution d\'un villageois puis passage à la nuit 2', async () => {
  const st = await state();
  const victim = st.players.find((p) => ['chef', 'washerwoman', 'librarian', 'investigator', 'virgin', 'mayor'].includes(p.role));
  await execute(victim.name);
  const after = await state();
  const dead = after.players.find((p) => p.id === victim.id);
  assert.equal(dead.alive, false);
  assert.equal(dead.executed, true);
  assert.equal(after.currentTime, 'NUIT');
  assert.equal(after.currentNight, 2);
  assert.equal(after.players.filter((p) => p.poisoned).length, 0, 'le poison de la veille est levé');
  assert.match(await headerText(), /NUIT 2/);
  assert.ok(await page.getByText('7 / 8').isVisible());
});

await test('nuit 2 : le Démon tue un joueur', async () => {
  await playPhase('other');
  const st = await state();
  assert.equal(st.players.filter((p) => p.alive).length, 6);
  assert.ok(st.killedTonightId, 'mort de la nuit enregistrée');
  assert.match(await journal(), /a été tué par le Démon/);
  assert.ok(await page.getByText('6 / 8').isVisible());
  await shot('06-nuit-2');
});

await test('exécution du Démon : victoire du Village', async () => {
  await page.getByRole('button', { name: '☀️ Nouvelle Journée' }).click();
  await settle();
  await execute(await nameOf('imp'));
  assert.ok(await page.getByText('Victoire du Village !').isVisible());
  assert.match(await page.locator('body').innerText(), /Le Démon est mort/);
  await shot('07-victoire');
});

await test('la partie survit à un rechargement de la page', async () => {
  const before = await state();
  await page.reload();
  await ready('.player-token');
  const after = await state();
  assert.deepEqual(after.players, before.players);
  assert.deepEqual(after.nightLog, before.nightLog);
  assert.match(await headerText(), /JOUR 2/);
  assert.equal(await page.locator('.player-token').count(), 8);
});

await test('aide intégrée', async () => {
  await closeVictory();
  await page.locator('.btn-help').click();
  await page.getByText('Vue d\'ensemble').click();
  assert.ok(await page.getByRole('strong').filter({ hasText: 'Phase de Nuit' }).isVisible());
  await shot('08-aide');
  await page.getByRole('button', { name: '✕ Fermer le Guide' }).click();
  assert.equal(await page.getByText('Fermer le Guide').count(), 0);
});

await test('« Recommencer » remet la partie à zéro en gardant les joueurs', async () => {
  await page.reload();
  await ready('.player-token');
  await closeVictory();
  await page.getByRole('button', { name: 'Recommencer' }).click();
  await settle();
  const st = await state();
  assert.equal(st.players.length, 8);
  assert.ok(st.players.every((p) => p.role === 'unknown' && p.alive && !p.executed && p.notes === ''));
  assert.equal(st.currentNight, 1);
  assert.equal(st.currentTime, 'NUIT');
  assert.equal(st.roleAssigned, false);
  assert.match(await headerText(), /NUIT 1/);
});

await test('suppression d\'un joueur', async () => {
  await token('Hugo').click();
  await page.getByRole('button', { name: /Supprimer|Retirer/ }).click();
  await settle();
  assert.equal(await page.locator('.player-token').count(), 7);
  assert.ok(!(await state()).players.some((p) => p.name === 'Hugo'));
});

await page.context().close();

// ===== RÈGLES DU JEU =====
console.log('\nRègles du jeu');
await newPage();

await test('le Démon ne tue pas la première nuit', async () => {
  await loadGame(['imp', 'chef', 'empath', 'poisoner', 'mayor'], { currentNight: 1, nightLog: [{ night: 1, events: [] }], isStarted: false });
  await playStep(nightOrder.first.find((s) => s.role === 'imp').action);
  assert.equal(await page.getByText('Sélectionnez').count(), 0, 'aucune cible demandée');
  const st = await state();
  assert.ok(st.players.every((p) => p.alive));
  assert.equal(st.completedActions.length, 1);
});

await test('le Moine protège sa cible de l\'attaque du Démon', async () => {
  await loadGame(['imp', 'monk', 'chef', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'monk'), ['Chloé']);
  assert.equal((await state()).players[2].protected, true);
  await playStep(actionOf('other', 'imp'), ['Chloé']);
  assert.equal((await state()).players[2].alive, true);
  assert.match(await journal(), /Chloé était protégé/);
});

await test('le Moine ne peut pas se protéger lui-même', async () => {
  await loadGame(['imp', 'monk', 'chef', 'empath', 'poisoner', 'saint']);
  await page.locator('.night-step', { hasText: actionOf('other', 'monk') }).click();
  await token('Bruno').click();
  assert.ok(await page.getByRole('button', { name: '✓ Confirmer' }).isDisabled());
  await page.getByRole('button', { name: '✕ Annuler' }).click();
});

await test('le Soldat résiste au Démon, sauf s\'il est empoisonné', async () => {
  await loadGame(['imp', 'soldier', 'chef', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'imp'), ['Bruno']);
  assert.equal((await state()).players[1].alive, true);
  assert.match(await journal(), /Soldat\) résiste/);

  await loadGame(['imp', 'soldier', 'chef', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'poisoner'), ['Bruno']);
  await playStep(actionOf('other', 'imp'), ['Bruno']);
  assert.equal((await state()).players[1].alive, false);
});

await test('un Démon empoisonné ne tue personne', async () => {
  await loadGame(['imp', 'soldier', 'chef', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'poisoner'), ['Alice']);
  await playStep(actionOf('other', 'imp'), ['Chloé']);
  assert.equal((await state()).players[2].alive, true);
  assert.match(await journal(), /sans effet/);
});

await test('la Voyante voit le Leurre comme un Démon, et reçoit une info marquée fausse si elle est empoisonnée', async () => {
  await loadGame(['imp', 'fortuneteller', { role: 'chef', decoy: true }, 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'fortuneteller'), ['Chloé', 'David']);
  assert.match(await journal(), /Voyante vérifie Chloé et David: Il y a un démon/);

  await loadGame(['imp', 'fortuneteller', 'chef', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'fortuneteller'), ['Chloé', 'David']);
  assert.match(await journal(), /Voyante vérifie Chloé et David: Il n'y a pas de démon/);

  await loadGame(['imp', { role: 'fortuneteller', poisoned: true }, 'chef', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'fortuneteller'), ['Chloé', 'David']);
  assert.match(await journal(), /Voyante \(empoisonnée\/ivre\)/);
  assert.equal((await state()).nightLog[0].events[0].isFalse, true);
});

await test('l\'Empathe compte ses voisins vivants maléfiques', async () => {
  // Cercle : Alice(Démon) Bruno(Empathe) Chloé(mort) David(Empoisonneur) ...
  await loadGame(['imp', 'empath', { role: 'chef', alive: false }, 'poisoner', 'saint', 'mayor']);
  await playStep(actionOf('other', 'empath'));
  assert.match(await journal(), /Empathe[^\n]*2/);
});

await test('le Gardien tué de nuit se réveille et apprend un rôle', async () => {
  await loadGame(['imp', 'ravenkeeper', 'chef', 'empath', 'poisoner', 'saint']);
  const step = page.locator('.night-step', { hasText: actionOf('other', 'ravenkeeper') });
  assert.equal(await step.evaluate((e) => e.style.opacity), '0.4', 'inactif tant qu\'il n\'est pas tué');
  await playStep(actionOf('other', 'imp'), ['Bruno']);
  assert.equal(await step.evaluate((e) => e.style.opacity), '1');
  await page.locator('.night-step', { hasText: actionOf('other', 'ravenkeeper') }).click();
  await token('Alice').click();
  await page.getByRole('button', { name: '✓ Confirmer' }).click();
  await settle();
  assert.match(await journal(), /Gardien[^\n]*Alice[^\n]*Démon/);
});

await test('le Croque-mort apprend le rôle du joueur exécuté', async () => {
  await loadGame(['imp', 'undertaker', 'chef', 'empath', 'poisoner', 'saint'], { currentTime: 'JOUR', currentNight: 1 });
  await execute('Chloé');
  await playStep(actionOf('other', 'undertaker'));
  assert.match(await journal(), /Croque-mort[^\n]*Chef/);
});

await test('le Mercenaire tue le Démon, une seule fois par partie', async () => {
  await loadGame(['imp', 'slayer', 'chef', 'empath', 'poisoner', 'saint'], { currentTime: 'JOUR' });
  await playStep(actionOf('day', 'slayer'), ['Chloé']);
  assert.match(await journal(), /rien ne se passe/);
  assert.equal((await state()).players[1].used, true);

  await loadGame(['imp', 'slayer', 'chef', 'empath', 'poisoner', 'saint'], { currentTime: 'JOUR' });
  await playStep(actionOf('day', 'slayer'), ['Alice']);
  assert.match(await journal(), /le Démon meurt/);
  assert.ok(await page.getByText('Victoire du Village !').isVisible());
});

await test('la Confidente devient le Démon si celui-ci meurt à 5 joueurs ou plus', async () => {
  await loadGame(['imp', 'scarletwoman', 'chef', 'empath', 'mayor', 'saint'], { currentTime: 'JOUR' });
  await execute('Alice');
  const st = await state();
  assert.equal(st.players[1].role, 'imp');
  assert.equal(await page.getByText('Victoire du Village !').count(), 0);
  assert.match(await journal(), /Bruno \(Confidente\) devient le nouveau Démon/);
  assert.equal(st.currentTime, 'NUIT', 'la partie continue');
});

await test('la Confidente ne succède pas à moins de 5 joueurs vivants', async () => {
  await loadGame(['imp', 'scarletwoman', 'chef', 'empath', { role: 'mayor', alive: false }, { role: 'saint', alive: false }], { currentTime: 'JOUR' });
  await execute('Alice');
  assert.ok(await page.getByText('Victoire du Village !').isVisible());
});

await test('le Démon qui se suicide transmet son rôle à un Sbire', async () => {
  await loadGame(['imp', 'poisoner', 'chef', 'empath', 'mayor', 'saint']);
  await playStep(actionOf('other', 'imp'), ['Alice']);
  const st = await state();
  assert.equal(st.players[0].alive, false);
  assert.equal(st.players[1].role, 'imp');
  assert.equal(await page.getByText(/Victoire/).count(), 0);
});

await test('exécuter le Saint fait gagner le Mal', async () => {
  await loadGame(['imp', 'poisoner', 'chef', 'empath', 'mayor', 'saint'], { currentTime: 'JOUR' });
  await execute('Farid');
  assert.ok(await page.getByText('Victoire du Mal !').isVisible());
});

await test('exécuter un Saint empoisonné ne termine pas la partie', async () => {
  await loadGame(['imp', 'poisoner', 'chef', 'empath', 'mayor', { role: 'saint', poisoned: true }], { currentTime: 'JOUR' });
  await execute('Farid');
  assert.equal(await page.getByText(/Victoire/).count(), 0);
  assert.equal((await state()).currentTime, 'NUIT');
});

await test('le Maire fait gagner le Village à 3 joueurs sans exécution', async () => {
  await loadGame(['imp', 'mayor', 'chef', { role: 'empath', alive: false }, { role: 'poisoner', alive: false }], { currentTime: 'JOUR' });
  await page.getByRole('button', { name: '⏭️ Pas d\'exécution' }).click();
  await settle();
  assert.ok(await page.getByText('Victoire du Village !').isVisible());
});

await test('sans Maire, une journée sans exécution mène à la nuit suivante', async () => {
  await loadGame(['imp', 'soldier', 'chef', 'empath', 'poisoner'], { currentTime: 'JOUR' });
  await page.getByRole('button', { name: '⏭️ Pas d\'exécution' }).click();
  await settle();
  const st = await state();
  assert.equal(st.currentTime, 'NUIT');
  assert.equal(st.currentNight, 3);
  assert.equal(await page.getByText(/Victoire/).count(), 0);
});

await test('le Mal gagne quand il ne reste que 2 joueurs vivants', async () => {
  await loadGame(['imp', 'chef', 'empath', { role: 'poisoner', alive: false }, { role: 'mayor', alive: false }]);
  await playStep(actionOf('other', 'imp'), ['Bruno']);
  assert.ok(await page.getByText('Victoire du Mal !').isVisible());
});

await test('le Majordome n\'a qu\'un seul Maître à la fois', async () => {
  await loadGame(['imp', 'butler', 'chef', 'empath', 'poisoner', 'mayor']);
  await playStep(actionOf('other', 'butler'), ['Chloé']);
  assert.deepEqual((await state()).players.filter((p) => p.master).map((p) => p.name), ['Chloé']);
});

await page.context().close();

// ===== RÉPARTITION DES RÔLES ET AFFICHAGE =====
console.log('\nRépartition et affichage');

await test('répartition officielle de 5 à 15 joueurs', async () => {
  const outsiders = [0, 1, 0, 1, 2, 0, 1, 2, 0, 1, 2];
  const minions = [1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3];
  const extra = ['Inès', 'Jules', 'Karim', 'Léa', 'Marc', 'Nina', 'Omar'];
  await newPage({ width: 1440, height: 900 }, 11);
  await addPlayers(NAMES.slice(0, 5));
  for (let n = 5; n <= 15; n++) {
    if (n > 5) await addPlayers(n <= 8 ? [NAMES[n - 1]] : [extra[n - 9]]);
    await page.getByRole('button', { name: /^(Assigner|Réassigner) les rôles$/ }).click();
    await settle();
    const roles = (await state()).players.map((p) => p.role);
    const count = (list) => roles.filter((r) => list.includes(r)).length;
    const bonus = roles.includes('baron') ? 2 : 0;
    assert.equal(roles.length, n);
    assert.equal(new Set(roles).size, n, `${n} joueurs : rôles uniques`);
    assert.equal(count(['imp']), 1, `${n} joueurs : un Démon`);
    assert.equal(count(MINIONS), minions[n - 5], `${n} joueurs : Sbires`);
    assert.equal(count(OUTSIDERS), outsiders[n - 5] + bonus, `${n} joueurs : Étrangers`);
    assert.equal(count(TOWNSFOLK), n - 1 - minions[n - 5] - outsiders[n - 5] - bonus, `${n} joueurs : Villageois`);
  }
  assert.equal(await page.getByRole('button', { name: '+ Ajouter un joueur' }).count(), 0, 'limite de 15 joueurs');
  await shot('09-quinze-joueurs');
  await page.context().close();
});

await test('affichage sur téléphone', async () => {
  await newPage({ width: 390, height: 844 });
  await addPlayers(NAMES);
  await page.getByRole('button', { name: 'Assigner les rôles' }).click();
  await settle();
  assert.equal(await page.locator('.player-token').count(), 8);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `débordement horizontal de ${overflow}px`);
  await shot('10-mobile');
  await page.context().close();
});

// ===== BILAN =====
await browser.close();
await server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests réussis`);
process.exit(failed.length ? 1 : 0);
