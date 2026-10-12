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
// Un Soûlard tient, à ses yeux, le rôle de Villageois qu'il croit avoir
const holds = (p, role) => p.role === role || (p.role === 'drunk' && p.shownRole === role);
const TOWNSFOLK_IDS = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'monk', 'ravenkeeper', 'virgin', 'slayer', 'soldier', 'mayor'];
const OUTSIDER_IDS = ['butler', 'drunk', 'recluse', 'saint'];
const MINION_IDS = ['poisoner', 'spy', 'scarletwoman', 'baron'];
const STARTING_INFO = { washerwoman: TOWNSFOLK_IDS, librarian: OUTSIDER_IDS, investigator: MINION_IDS };

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
  // Écran de choix du mode : ces tests se jouent en partie locale
  await page.locator('.mode-local').click();
  await ready('header');
};

const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
const settle = () => page.waitForTimeout(150);
const ready = async (selector) => {
  await page.waitForSelector(selector);
  if (fallbackCss) await page.addStyleTag({ content: fallbackCss });
  await settle();
};
const shot = async (name, target = page) => {
  await target.evaluate(() => document.fonts.ready);
  await target.waitForTimeout(2300); // fondu jour/nuit (2 s)
  await target.screenshot({ path: join(SHOTS, `${name}.jpg`), quality: 85 });
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
  const me = alive.find((p) => holds(p, role));
  const others = alive.filter((p) => p.id !== me?.id);
  const imp = alive.find((p) => p.role === 'imp');
  const good = others.filter((p) => TOWNSFOLK_IDS.includes(p.role) || OUTSIDER_IDS.includes(p.role));
  const names = (list) => list.map((p) => p.name);
  switch (role) {
    case 'poisoner': return names(good.filter((p) => p.role !== 'fortuneteller').slice(-1));
    case 'washerwoman':
    case 'librarian':
    case 'investigator': {
      // Le Conteur montre deux joueurs dont l'un a un rôle de la bonne catégorie
      const match = others.find((p) => STARTING_INFO[role].includes(p.role));
      if (!match) return [];
      return names([match, others.find((p) => p.id !== match.id)]);
    }
    case 'fortuneteller': return names([imp, good.find((p) => !p.decoy)]);
    case 'butler': return names(good.slice(0, 1));
    case 'monk': return names(good.filter((p) => p.role !== 'ravenkeeper').slice(0, 1));
    case 'imp': {
      const prey = good.filter((p) => !p.protected && !['soldier', 'mayor'].includes(p.role));
      return names([prey.find((p) => p.role === 'ravenkeeper') ?? prey.at(-1)]);
    }
    case 'ravenkeeper': return names([imp]);
    case 'slayer': return names(others.filter((p) => MINION_IDS.includes(p.role)).slice(0, 1));
    default: return [];
  }
};

// Joue toutes les étapes actives d'une phase et vérifie l'état de chaque étape
const playPhase = async (phase, { skip = [], onSelected = {} } = {}) => {
  for (const step of nightOrder[phase]) {
    const st = await state();
    // Le Gardien ne se réveille que la nuit où il est tué
    const expectedActive = !(step.minPlayers && st.players.length < step.minPlayers) && (step.role === null || (step.role === 'ravenkeeper'
      ? st.players.some((p) => holds(p, 'ravenkeeper') && p.id === st.killedTonightId)
      : st.players.some((p) => p.alive && holds(p, step.role))));
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
  assert.equal(count(MINION_IDS), 1);
  assert.equal(count(OUTSIDER_IDS), baron ? 3 : 1);
  assert.equal(count(TOWNSFOLK_IDS), baron ? 3 : 5);
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
  // La mise en page suit le redimensionnement avec un léger délai
  const eventually = async (check, message) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await check()) return;
      await page.waitForTimeout(100);
    }
    assert.fail(message);
  };
  const before = await center('Farid');
  await token('Farid').dragTo(page.locator('.grimoire-section'), { targetPosition: { x: 120, y: 150 } });
  await settle();
  const moved = await center('Farid');
  assert.ok(Math.abs(moved.x - 120) <= 5 && Math.abs(moved.y - before.y) > 50, 'jeton déplacé');
  await token('Alice').click();
  await page.locator('.grimoire-section').click({ position: { x: 5, y: 5 } });
  await settle();
  await eventually(async () => near(await center('Farid'), moved), 'position conservée après d\'autres actions');
  // Les positions manuelles valent pour une taille de grimoire donnée
  await page.setViewportSize({ width: 1400, height: 900 });
  await settle();
  await eventually(async () => !near(await center('Farid'), moved), 'replacé en cercle quand le grimoire change de taille');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);
  await eventually(async () => near(await center('Farid'), moved), 'position retrouvée à la taille d\'origine');
  // Les positions ne sont pas sauvegardées : un rechargement remet les jetons en cercle
  await page.reload();
  await ready('.player-token');
  await eventually(async () => near(await center('Farid'), before), 'cercle après rechargement');
});

await test('fiche d\'un joueur : notes et statuts', async () => {
  await token('Alice').click();
  const notes = page.getByPlaceholder('Informations, rappels...');
  assert.ok(await page.locator('.role-selector').isEnabled(), 'rôle modifiable avant le début de la partie');
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
  // Partie commencée : le Conteur ne peut plus changer le rôle d'un joueur
  await token('Alice').click();
  assert.ok(await page.locator('.role-selector').isDisabled(), 'rôle verrouillé en cours de partie');
  await page.locator('.role-selector').click({ force: true });
  assert.equal(await page.getByText('Étrangers', { exact: true }).count(), 0, 'liste des rôles fermée');
  await page.locator('.grimoire-section').click({ position: { x: 5, y: 5 } });
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
  await loadGame(['imp', 'chef', 'empath', 'poisoner', 'mayor', 'saint', 'soldier'], { currentNight: 1, nightLog: [{ night: 1, events: [] }], isStarted: false });
  await playStep(nightOrder.first.find((s) => s.role === 'imp').action);
  assert.equal(await page.getByText('Sélectionnez').count(), 0, 'aucune cible demandée');
  const st = await state();
  assert.ok(st.players.every((p) => p.alive));
  assert.equal(st.completedActions.length, 1);
});

await test('à moins de 7 joueurs, les Sbires et le Démon ne se réveillent pas la première nuit', async () => {
  await loadGame(['imp', 'chef', 'empath', 'poisoner', 'mayor', 'saint'], { currentNight: 1, nightLog: [{ night: 1, events: [] }], isStarted: false });
  for (const step of nightOrder.first.slice(0, 2)) {
    const el = page.locator('.night-step', { hasText: step.action });
    assert.equal(await el.evaluate((e) => e.style.opacity), '0.4', `« ${step.action} » inactive`);
    await el.click();
  }
  assert.equal((await state()).completedActions.length, 0);
  // Le poison, lui, agit normalement
  assert.equal(await page.locator('.night-step', { hasText: actionOf('first', 'poisoner') }).evaluate((e) => e.style.opacity), '1');
});

await test('bluffs du Démon : 3 rôles gentils absents de la partie, seulement à partir de 7 joueurs', async () => {
  // Calcul des vues chargé depuis le serveur de développement
  const check = await page.evaluate(async () => {
    const { buildRelayState, pickDemonBluffs } = await import('/src/multiplayer/views.js');
    const { shuffleArray } = await import('/src/utils/gameLogic.js');
    const { roles } = await import('/src/data/roles.js');
    const good = [...roles.townsfolk, ...roles.outsiders].map((r) => r.id);
    const cast = ['imp', 'poisoner', 'drunk', 'chef', 'empath', 'mayor', 'saint'];
    const make = (list) => list.map((role, i) => ({ id: i + 1, key: `k${i + 1}`, name: `J${i + 1}`, role, alive: true, shownRole: role === 'drunk' ? 'monk' : null }));
    const views = (players, demonBluffs) => buildRelayState({
      players, demonBluffs, bluffShares: {}, currentTime: 'NUIT', currentNight: 1, roleAssigned: true, joinOpen: false,
      gameEnd: null, deadAtNightStart: [], nightLog: [], activeAction: null, actorId: null, selectedTargets: [], day: null,
    }).views;

    const seven = make(cast);
    const six = make(cast.slice(0, 6));
    const draws = Array.from({ length: 30 }, () => pickDemonBluffs(seven, shuffleArray));
    const sevenViews = views(seven, draws[0]);
    const sixViews = views(six, pickDemonBluffs(six, shuffleArray));
    // Succession : le Démon d'origine est mort, la Confidente (J2) a pris sa place
    const succession = make(['dead', 'imp', 'poisoner', 'chef', 'empath', 'mayor', 'saint']).map((p) => (p.id === 1 ? { ...p, alive: false } : p));
    const frozen = buildRelayState({
      players: succession, demonBluffs: [], bluffShares: {}, evilInfo: { demonId: 1, minionIds: [2, 3] }, spyGrimoire: null,
      currentTime: 'NUIT', currentNight: 3, roleAssigned: true, joinOpen: false, gameEnd: null, deadAtNightStart: [1],
      nightLog: [], activeAction: null, actorId: null, selectedTargets: [], day: null,
    }).views;
    // Demandes envoyées aux joueurs pendant une action
    const prompts = (role, type) => buildRelayState({
      players: make(['imp', 'washerwoman', 'fortuneteller', 'butler', 'poisoner', 'mayor', 'saint']).map((p) => (p.id === 6 ? { ...p, alive: false } : p)),
      demonBluffs: [], bluffShares: {}, currentTime: 'NUIT', currentNight: 2, roleAssigned: true, joinOpen: false, gameEnd: null,
      deadAtNightStart: [6], nightLog: [], activeAction: { role, type, action: 'x' }, actorId: { washerwoman: 2, fortuneteller: 3, butler: 4 }[role],
      selectedTargets: [], day: null,
    }).views;
    return {
      washerwomanPrompt: prompts('washerwoman', 'select_two_info').k2.prompt,
      fortuneTellerTargets: prompts('fortuneteller', 'select_two').k3.prompt.selectable,
      butlerTargets: prompts('butler', 'select_one_master').k4.prompt.selectable,
      otherMinionSees: frozen.k3.known,
      newDemonSeesSelf: frozen.k2.known[2],
      sevenMinionSeesDemon: sevenViews.k2.known[1],
      sevenDemonSeesMinion: sevenViews.k1.known[2],
      sizes: [...new Set(draws.map((d) => d.length))],
      allGood: draws.flat().every((id) => good.includes(id)),
      noneInPlay: draws.flat().every((id) => !cast.includes(id) && id !== 'monk'),
      distinct: draws.every((d) => new Set(d).size === 3),
      sixBluffs: pickDemonBluffs(six, shuffleArray),
      sevenDemonKnows: Object.keys(sevenViews.k1.known).length,
      sevenMinionKnows: Object.keys(sevenViews.k2.known).length,
      sevenMinionBluffs: sevenViews.k2.bluffs.length,
      sixDemonKnows: Object.keys(sixViews.k1.known).length,
      sixMinionKnows: Object.keys(sixViews.k2.known).length,
    };
  });
  assert.deepEqual(check.sizes, [3]);
  assert.ok(check.allGood, 'uniquement des Villageois et des Étrangers');
  assert.ok(check.noneInPlay, 'aucun rôle en jeu, ni celui que croit avoir le Soûlard');
  assert.ok(check.distinct);
  assert.deepEqual(check.sixBluffs, [], 'pas de bluffs à 6 joueurs');
  assert.equal(check.sevenDemonKnows, 2, 'à 7, le Démon connaît son Sbire');
  assert.equal(check.sevenMinionKnows, 2, 'à 7, le Sbire connaît le Démon');
  assert.equal(check.sevenMinionBluffs, 0, 'le Sbire ne reçoit pas les bluffs d\'office');
  assert.equal(check.sixDemonKnows, 1, 'à 6, le Démon ne connaît que lui-même');
  assert.equal(check.sixMinionKnows, 1, 'à 6, le Sbire ne connaît que lui-même');
  assert.deepEqual(check.sevenMinionSeesDemon, { role: 'imp' });
  assert.deepEqual(check.sevenDemonSeesMinion, { team: 'minion' }, 'le Démon sait qui est Sbire, pas quel Sbire');
  // Une succession reste secrète : l'autre Sbire voit toujours l'ancien Démon, et la Confidente comme Sbire
  assert.deepEqual(check.otherMinionSees, { 1: { role: 'imp' }, 2: { team: 'minion' }, 3: { role: 'poisoner' } });
  assert.deepEqual(check.newDemonSeesSelf, { role: 'imp' });
  assert.equal(check.washerwomanPrompt, null, 'la Lavandière ne choisit pas elle-même les deux joueurs');
  assert.deepEqual(check.fortuneTellerTargets, [1, 2, 3, 4, 5, 6, 7], 'la Voyante peut désigner un mort ou elle-même');
  assert.deepEqual(check.butlerTargets, [1, 2, 3, 5, 6, 7], 'le Majordome ne peut pas se désigner');
});

const startOfGame = { currentNight: 1, nightLog: [{ night: 1, events: [] }], isStarted: false };
const stepOpacity = (action) => page.locator('.night-step', { hasText: action }).evaluate((e) => e.style.opacity);

await test('Lavandière : le Conteur montre deux joueurs dont un Villageois, sans dire lequel', async () => {
  await loadGame(['imp', 'washerwoman', 'chef', 'empath', 'poisoner', 'saint', 'butler'], startOfGame);
  await page.locator('.night-step', { hasText: actionOf('first', 'washerwoman') }).click();
  const confirm = page.getByRole('button', { name: '✓ Confirmer' });
  await token('Alice').click();
  await token('Emma').click();
  assert.match(await page.locator('.target-error').innerText(), /doit être un Villageois/);
  assert.ok(await confirm.isDisabled(), 'deux joueurs sans Villageois : refusé');
  await token('Bruno').click();
  assert.match(await page.locator('.target-error').innerText(), /lui-même/);
  assert.ok(await confirm.isDisabled(), 'la Lavandière ne se montre pas elle-même');
  // Chloé (Chef) et Emma (Empoisonneur) : un Villageois et un leurre
  await token('Chloé').click();
  await token('Emma').click();
  assert.equal(await page.locator('.target-error').count(), 0);
  await confirm.click();
  await settle();
  // Le joueur apprend le rôle, pas lequel des deux le détient
  assert.match(await journal(), /Lavandière apprend que (Emma ou Chloé|Chloé ou Emma) est Chef/);
  assert.equal((await state()).completedActions.length, 1);
});

await test('Libraire : apprend « 0 » quand aucun Étranger n\'est en jeu', async () => {
  await loadGame(['imp', 'librarian', 'chef', 'empath', 'poisoner', 'mayor', 'soldier'], startOfGame);
  await playStep(actionOf('first', 'librarian'));
  assert.equal(await page.getByText('Sélectionnez').count(), 0, 'aucun joueur à désigner');
  assert.match(await journal(), /Libraire apprend qu'il n'y a aucun Étranger en jeu/);
  assert.equal((await state()).completedActions.length, 1);
});

await test('Ermite et Espion sont vus sous le rôle choisi par le Conteur', async () => {
  // L'Ermite passe pour un Baron auprès de l'Enquêteur
  await loadGame(['imp', 'investigator', { role: 'recluse', seenAs: 'baron' }, 'empath', 'chef', 'mayor', 'soldier'], startOfGame);
  await playStep(actionOf('first', 'investigator'), ['Chloé', 'David']);
  assert.match(await journal(), /Enquêteur apprend que (Chloé ou David|David ou Chloé) est Baron/);

  // Cercle : Démon, Ermite vu comme Démon, Chef, ..., Empoisonneur (voisin du Démon) : 2 paires
  await loadGame(['imp', { role: 'recluse', seenAs: 'imp' }, 'chef', 'empath', 'mayor', 'soldier', 'poisoner'], startOfGame);
  await playStep(actionOf('first', 'chef'));
  assert.match(await journal(), /Le Chef détecte 2 paire/);

  // L'Espion vu comme Villageois n'est pas compté par l'Empathe
  await loadGame(['imp', 'empath', { role: 'spy', seenAs: 'chef' }, 'mayor', 'soldier', 'saint', 'butler']);
  await playStep(actionOf('other', 'empath'));
  assert.match(await journal(), /L'Empathe détecte 1 voisin/);

  // Le réglage se fait sur la fiche du joueur
  await token('Chloé').click();
  await page.locator('.seen-as select').selectOption({ label: 'Espion (son vrai rôle)' });
  await settle();
  assert.equal((await state()).players[2].seenAs, null);
  await page.locator('.grimoire-section').click({ position: { x: 5, y: 5 } });
});

await test('le Mercenaire tue un Ermite vu comme Démon, sans terminer la partie', async () => {
  await loadGame(['imp', 'slayer', { role: 'recluse', seenAs: 'imp' }, 'empath', 'poisoner', 'saint'], { currentTime: 'JOUR' });
  await playStep(actionOf('day', 'slayer'), ['Chloé']);
  assert.equal((await state()).players[2].alive, false);
  assert.match(await journal(), /Ermite vu comme Démon/);
  assert.equal(await page.getByText(/Victoire/).count(), 0);
});

await test('le Soûlard est réveillé comme le Villageois qu\'il croit être, sans effet', async () => {
  await loadGame(['imp', { role: 'drunk', shownRole: 'empath' }, 'chef', 'poisoner', 'mayor', 'saint']);
  assert.equal(await stepOpacity(actionOf('other', 'empath')), '1', 'étape de l\'Empathe active pour le Soûlard');
  await playStep(actionOf('other', 'empath'));
  const [event] = (await state()).nightLog[0].events;
  assert.match(event.text, /L'Empathe \(empoisonné\/ivre\)/);
  assert.equal(event.isFalse, true);
  assert.equal(event.to, 2, 'information destinée au Soûlard');
  // Le Conteur voit sur le grimoire le rôle que le Soûlard croit avoir
  assert.match(await token('Bruno').innerText(), /croit être Empathe/);

  await loadGame(['imp', { role: 'drunk', shownRole: 'monk' }, 'chef', 'poisoner', 'mayor', 'saint']);
  await playStep(actionOf('other', 'monk'), ['Chloé']);
  assert.equal((await state()).players[2].protected, false, 'le Soûlard « Moine » ne protège personne');
});

await test('la Voyante reçoit un OUI en désignant un Démon mort', async () => {
  await loadGame([{ role: 'dead', alive: false }, 'fortuneteller', 'chef', 'empath', 'imp', 'saint']);
  await playStep(actionOf('other', 'fortuneteller'), ['Alice', 'Chloé']);
  assert.match(await journal(), /Voyante vérifie Alice et Chloé: Il y a un démon/);
});

await test('le Démon : protégé il ne peut pas se suicider, et viser un mort est sans effet', async () => {
  await loadGame([{ role: 'imp', protected: true }, 'poisoner', 'chef', 'empath', 'mayor', 'saint']);
  await playStep(actionOf('other', 'imp'), ['Alice']);
  let st = await state();
  assert.equal(st.players[0].alive, true);
  assert.equal(st.players[1].role, 'poisoner');
  assert.match(await journal(), /Alice était protégé/);

  await loadGame(['imp', 'poisoner', { role: 'ravenkeeper', alive: false }, 'empath', 'chef', 'saint']);
  await playStep(actionOf('other', 'imp'), ['Chloé']);
  st = await state();
  assert.equal(st.killedTonightId, null);
  assert.match(await journal(), /déjà mort : aucun mort cette nuit/);
  assert.equal(await stepOpacity(actionOf('other', 'ravenkeeper')), '0.4', 'le Gardien mort n\'est pas réveillé');
});

await test('Maire attaqué de nuit : le Conteur peut faire mourir un autre joueur', async () => {
  await loadGame(['imp', 'mayor', 'ravenkeeper', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'imp'), ['Bruno']);
  assert.match(await page.locator('.choice-modal').innerText(), /Le Démon attaque Bruno \(Maire\)/);
  assert.equal((await state()).completedActions.length, 0, 'en attente de la décision du Conteur');
  await page.getByRole('button', { name: 'Chloé meurt à sa place' }).click();
  await settle();
  const st = await state();
  assert.equal(st.players[1].alive, true);
  assert.equal(st.players[2].alive, false);
  assert.equal(st.killedTonightId, 3);
  assert.equal(st.completedActions.length, 1);
  assert.equal(await stepOpacity(actionOf('other', 'ravenkeeper')), '1', 'le Gardien mort à la place du Maire est réveillé');

  await loadGame(['imp', 'mayor', 'ravenkeeper', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'imp'), ['Bruno']);
  await page.getByRole('button', { name: 'Le Maire meurt' }).click();
  await settle();
  assert.equal((await state()).players[1].alive, false);
});

await test('un joueur que le Conteur fait mourir la nuit réveille le Gardien', async () => {
  await loadGame(['imp', 'ravenkeeper', 'chef', 'empath', 'poisoner', 'saint']);
  await token('Bruno').click();
  await page.getByRole('button', { name: 'Vivant' }).click();
  await page.locator('.grimoire-section').click({ position: { x: 5, y: 5 } });
  await settle();
  assert.equal((await state()).killedTonightId, 2);
  assert.equal(await stepOpacity(actionOf('other', 'ravenkeeper')), '1');
});

await test('le poison cesse dès que l\'Empoisonneur meurt', async () => {
  await loadGame(['imp', 'poisoner', 'chef', 'empath', 'mayor', 'saint']);
  await playStep(actionOf('other', 'poisoner'), ['Chloé']);
  assert.equal((await state()).players[2].poisoned, true);
  await playStep(actionOf('other', 'imp'), ['Bruno']);
  const st = await state();
  assert.equal(st.players[1].alive, false);
  assert.equal(st.players[2].poisoned, false);
});

await test('la protection du Moine prend fin au lever du jour', async () => {
  await loadGame(['imp', 'monk', 'chef', 'empath', 'poisoner', 'saint']);
  await playStep(actionOf('other', 'monk'), ['Chloé']);
  assert.equal((await state()).players[2].protected, true);
  await page.getByRole('button', { name: '☀️ Nouvelle Journée' }).click();
  await settle();
  assert.equal((await state()).players[2].protected, false);
});

await test('Vierge : nominée par un Villageois, celui-ci est exécuté et la journée s\'arrête', async () => {
  const virginStep = nightOrder.day.find((s) => s.role === 'virgin').action;
  await loadGame(['imp', 'virgin', 'chef', 'empath', 'poisoner', 'saint', 'mayor'], { currentTime: 'JOUR' });
  await playStep(virginStep, ['Chloé']);
  let st = await state();
  assert.equal(st.players[2].alive, false);
  assert.equal(st.players[2].executed, true);
  assert.equal(st.players[1].used, true);
  assert.equal(st.currentTime, 'NUIT', 'c\'est l\'exécution du jour');

  // Nominée par un joueur qui n'est pas Villageois : rien ne se passe, mais la capacité est dépensée
  await loadGame(['imp', 'virgin', 'chef', 'empath', 'poisoner', 'saint', 'mayor'], { currentTime: 'JOUR' });
  await playStep(virginStep, ['Emma']);
  st = await state();
  assert.equal(st.players[4].alive, true);
  assert.equal(st.players[1].used, true);
  assert.equal(st.currentTime, 'JOUR');
  assert.match(await journal(), /Emma nomine la Vierge : rien ne se passe/);
});

await test('le Majordome ne peut pas se choisir lui-même comme Maître', async () => {
  await loadGame(['imp', 'butler', 'chef', 'empath', 'poisoner', 'mayor']);
  await page.locator('.night-step', { hasText: actionOf('other', 'butler') }).click();
  await token('Bruno').click();
  assert.ok(await page.getByRole('button', { name: '✓ Confirmer' }).isDisabled());
  await page.getByRole('button', { name: '✕ Annuler' }).click();
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
    assert.equal(count(MINION_IDS), minions[n - 5], `${n} joueurs : Sbires`);
    assert.equal(count(OUTSIDER_IDS), outsiders[n - 5] + bonus, `${n} joueurs : Étrangers`);
    assert.equal(count(TOWNSFOLK_IDS), n - 1 - minions[n - 5] - outsiders[n - 5] - bonus, `${n} joueurs : Villageois`);
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

// ===== PARTIE MULTIJOUEUR : UN CONTEUR ET 8 JOUEURS, CHACUN DANS SON NAVIGATEUR =====
console.log('\nMultijoueur (9 navigateurs)');
errors = [];
const MULTI_KEY = 'botc-grimoire-multi-v1';
const seats = {}; // page de chaque joueur, par nom
let host;
let roomCode;

const openBrowser = async (path = '', viewport = { width: 1440, height: 900 }) => {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  // Même graine que la partie locale : la distribution des rôles est connue d'avance
  await context.addInitScript((s) => {
    let a = s >>> 0;
    Math.random = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, 32);
  const p = await context.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(URL + path);
  if (fallbackCss) await p.addStyleTag({ content: fallbackCss });
  return p;
};

// Attend qu'une condition devienne vraie : la synchronisation passe par le réseau
const until = async (check, message) => {
  const deadline = Date.now() + 5000;
  for (;;) {
    if (await check()) return;
    if (Date.now() > deadline) assert.fail(`synchronisation attendue : ${message}`);
    await new Promise((r) => setTimeout(r, 50));
  }
};

const joinRoom = async (p, name) => {
  await p.getByPlaceholder('Votre nom...').fill(name);
  await p.getByRole('button', { name: 'Rejoindre la partie' }).click();
};
const hostState = () => host.evaluate((k) => JSON.parse(localStorage.getItem(k)), MULTI_KEY);
const hostPlayer = async (name) => (await hostState()).players.find((pl) => pl.name === name);
const seat = (p, name) => p.locator(`.seat[data-name="${name}"]`);
const knownRoles = (p) => p.$$eval('.seat', (els) => Object.fromEntries(els.filter((e) => e.dataset.role).map((e) => [e.dataset.name, e.dataset.role])));
const text = (p, selector = 'body') => p.locator(selector).innerText();
const everyPlayer = async (check) => {
  for (const [name, p] of Object.entries(seats)) await check(p, name);
};
const say = async (p, message) => {
  await p.getByPlaceholder('Votre message...').fill(message);
  await p.keyboard.press('Enter');
};
const hostStep = (action) => host.locator('.night-step', { hasText: action }).click();
// Le joueur désigne ses cibles sur son écran, puis le Conteur confirme
const playerPicks = async (name, targets) => {
  const p = seats[name];
  await p.locator('.prompt').waitFor();
  for (const target of targets) await seat(p, target).click();
  await p.getByRole('button', { name: '✓ Valider mon choix' }).click();
  await host.getByText(`${name} a fait son choix`).waitFor();
};
const hostConfirm = async () => {
  await host.getByRole('button', { name: '✓ Confirmer' }).click();
  await host.waitForTimeout(150);
};

const EXPECTED_ROLES = {
  Alice: 'Majordome', Bruno: 'Démon', Chloé: 'Voyante', David: 'Empoisonneur',
  Emma: 'Chef', Farid: 'Empathe', Gaëlle: 'Gardien', Hugo: 'Mercenaire',
};

await test('le Conteur choisit le mode multijoueur et obtient un code de salon', async () => {
  host = await openBrowser();
  assert.ok(await host.locator('.mode-local').isVisible());
  assert.ok(await host.locator('.mode-multi').isVisible());
  await shot('11-choix-mode', host);
  await host.locator('.mode-multi').click();
  await until(async () => /Salon [A-Z]{4}/.test(await text(host, '.btn-room')), 'code de salon');
  roomCode = (await text(host, '.btn-room')).match(/Salon ([A-Z]{4})/)[1];
  // En multijoueur, pas d'ajout manuel : les joueurs s'installent en rejoignant le salon
  assert.equal(await host.getByRole('button', { name: '+ Ajouter un joueur' }).count(), 0);
  assert.match(await text(host, '.invite-hint'), new RegExp(`code ${roomCode}`));
});

await test('un code de salon inconnu est refusé', async () => {
  const stranger = await openBrowser('?room=ZZZZ');
  await joinRoom(stranger, 'Zoé');
  await until(async () => /n'existe pas/.test(await text(stranger)), 'message d\'erreur');
  await stranger.context().close();
});

await test('8 joueurs rejoignent le salon depuis 8 navigateurs', async () => {
  for (const [index, name] of NAMES.entries()) {
    const p = await openBrowser(`?room=${roomCode}`, index === 2 ? { width: 1280, height: 800 } : { width: 1100, height: 760 });
    await joinRoom(p, name);
    await p.locator('.phase').waitFor();
    seats[name] = p;
    await until(async () => (await host.locator('.player-token').count()) === index + 1, `${name} dans le cercle du Conteur`);
  }
  assert.deepEqual((await hostState()).players.map((pl) => pl.name), NAMES);
  await everyPlayer(async (p, name) => {
    await until(async () => (await p.locator('.seat').count()) === 8, `${name} voit les 8 joueurs`);
    assert.deepEqual(await knownRoles(p), {}, 'aucun rôle visible avant la distribution');
    assert.match(await text(p, '.my-role'), /pas encore distribué/);
    assert.ok(await seat(p, name).evaluate((e) => e.classList.contains('seat-me')));
  });
});

await test('le Conteur règle la durée du débat avant le début de la partie', async () => {
  await host.locator('.debate-setting input').fill('2');
  await until(async () => (await hostState()).debateMinutes === 2, 'durée enregistrée');
});

await test('un nom déjà pris est refusé', async () => {
  const twin = await openBrowser(`?room=${roomCode}`);
  await joinRoom(twin, 'alice');
  await until(async () => /déjà pris/.test(await text(twin)), 'message d\'erreur');
  await twin.context().close();
  assert.equal(await host.locator('.player-token').count(), 8);
});

await test('discussion publique : un message arrive chez tous les joueurs et le Conteur', async () => {
  await say(seats.Alice, 'Bonjour à tous');
  await everyPlayer((p, name) => until(async () => /Bonjour à tous/.test(await text(p, '.chat-messages')), `message reçu par ${name}`));
  await until(async () => /Discussion \(1\)/.test(await text(host, 'aside')), 'compteur de messages non lus du Conteur');
  await host.getByRole('button', { name: /Discussion/ }).click();
  assert.match(await text(host, '.chat-messages'), /Alice : Bonjour à tous/);
  assert.match(await text(host, 'aside'), /8 joueurs connectés/);
});

await test('chaque joueur ne voit que son rôle ; le camp du Mal se connaît', async () => {
  await host.getByRole('button', { name: 'Assigner les rôles' }).click();
  await everyPlayer(async (p, name) => {
    await until(async () => (await p.locator('.role-name').count()) === 1 && (await text(p, '.role-name')) === EXPECTED_ROLES[name], `rôle de ${name}`);
    const known = Object.keys(await knownRoles(p)).sort();
    const evil = ['Bruno', 'David'].includes(name);
    assert.deepEqual(known, name === 'David' ? ['Bruno', 'David'] : [name], `rôles connus de ${name}`);
    assert.match(await text(p, '.role-team'), evil ? /camp du Mal/ : /camp du Village/);
    assert.equal(await p.locator('.bluffs').count(), name === 'Bruno' ? 1 : 0, 'seul le Démon reçoit des bluffs');
    assert.equal(await p.locator('.grimoire-note').count(), 0);
  });
  assert.deepEqual(await knownRoles(seats.David), { Bruno: 'imp', David: 'poisoner' });
  // Le Démon sait qui est son Sbire, sans connaître son rôle
  assert.equal(await seat(seats.Bruno, 'David').getAttribute('data-team'), 'minion');
  assert.equal(await seat(seats.Bruno, 'David').locator('.seat-role').innerText(), 'Sbire');
  assert.equal(await seats.Alice.locator('.seat[data-team="minion"]').count(), 0);
  const { demonBluffs, players } = await hostState();
  assert.equal(demonBluffs.length, 3);
  assert.ok(demonBluffs.every((id) => !players.some((pl) => pl.role === id)), 'bluffs absents de la partie');
  assert.match((await hostState()).nightLog[0].events[0].text, /Bluffs du Démon/, 'bluffs rappelés au Conteur dans le journal');
});

await test('le Démon transmet les bluffs de son choix à son Sbire', async () => {
  const { Bruno: demon, David: minion } = seats;
  assert.equal(await demon.locator('.bluff').count(), 3);
  assert.equal(await demon.locator('.bluff-share').count(), 3, 'un bouton par bluff pour l\'unique Sbire');
  assert.equal(await minion.locator('.shared-bluffs').count(), 0, 'le Sbire ne reçoit rien d\'office');

  const [first, second] = (await hostState()).demonBluffs;
  const roleName = (id) => demon.evaluate(async (roleId) => (await import('/src/data/roles.js')).allRoles.find((r) => r.id === roleId).name, id);
  await demon.locator('.bluff-share').nth(0).click();
  await demon.locator('.bluff-share').nth(1).click();
  await until(async () => (await minion.locator('.shared-bluffs').count()) === 1, 'bluffs reçus par le Sbire');
  await until(async () => (await text(minion, '.shared-bluffs')).includes(await roleName(second)), 'second bluff reçu');
  assert.ok((await text(minion, '.shared-bluffs')).includes(await roleName(first)));
  assert.equal(await demon.locator('.bluff-shared').count(), 2);

  // Le Démon peut reprendre un bluff
  await demon.locator('.bluff-share').nth(1).click();
  await until(async () => (await demon.locator('.bluff-shared').count()) === 1, 'bluff retiré chez le Démon');
  await until(async () => !(await text(minion, '.shared-bluffs')).includes(await roleName(second)), 'bluff retiré chez le Sbire');
  const david = await hostPlayer('David');
  assert.deepEqual((await hostState()).bluffShares, { [first]: [david.id], [second]: [] });
  await everyPlayer(async (p, name) => {
    if (name !== 'David') assert.equal(await p.locator('.shared-bluffs').count(), 0, `${name} ne voit pas les bluffs transmis`);
  });
});

await test('le salon se ferme dès que les rôles sont distribués', async () => {
  const late = await openBrowser(`?room=${roomCode}`);
  await joinRoom(late, 'Zoé');
  await until(async () => /déjà commencé/.test(await text(late)), 'message d\'erreur');
  await late.context().close();
  await host.waitForTimeout(300);
  const st = await hostState();
  assert.equal(st.players.length, 8, 'personne n\'a été ajouté au cercle');
  assert.equal(st.roleAssigned, true, 'les rôles distribués sont conservés');
});

await test('la nuit, les joueurs ne peuvent écrire qu\'au Conteur, en privé', async () => {
  await hostStep('Les Sbires se réveillent');
  assert.equal(await host.locator('.debate-setting').count(), 0, 'durée du débat figée une fois la partie commencée');
  await until(async () => seats.Chloé.locator('option[value="all"]').isDisabled(), 'discussion publique fermée');
  await say(seats.Chloé, 'Qui dois-je sonder ?');
  await until(async () => /Chloé \(privé\) : Qui dois-je sonder/.test(await text(host, '.chat-messages')), 'message privé reçu par le Conteur');
  assert.match(await text(seats.Chloé, '.chat-messages'), /Vous \(privé → Conteur\) : Qui dois-je sonder/);

  await host.getByLabel('Destinataire').selectOption({ label: 'Chloé' });
  await say(host, 'Deux joueurs de ton choix');
  await until(async () => /Conteur \(privé\) : Deux joueurs de ton choix/.test(await text(seats.Chloé, '.chat-messages')), 'réponse privée reçue');
  await host.waitForTimeout(300);
  await everyPlayer(async (p, name) => {
    if (name === 'Chloé') return;
    assert.doesNotMatch(await text(p, '.chat-messages'), /sonder|de ton choix/, `${name} ne voit pas les messages privés`);
  });
  await shot('12-multi-conteur', host);
});

await test('un joueur désigne lui-même sa cible, le Conteur confirme', async () => {
  await hostStep('L\'Empoisonneur choisit un joueur à empoisonner');
  await host.getByText('En attente du choix de David').waitFor();
  await seats.David.locator('.prompt').waitFor();
  await everyPlayer(async (p, name) => {
    if (name !== 'David') assert.equal(await p.locator('.prompt').count(), 0, `${name} n'est pas sollicité`);
  });
  assert.ok(await host.getByRole('button', { name: '✓ Confirmer' }).isDisabled());
  await playerPicks('David', ['Chloé']);
  await hostConfirm();
  assert.equal((await hostPlayer('Chloé')).poisoned, true);
  await until(async () => (await seats.David.locator('.prompt').count()) === 0, 'demande refermée chez David');
});

await test('les informations de nuit n\'arrivent qu\'au joueur concerné, sans révéler le poison', async () => {
  await hostStep('Le Chef apprend le nombre de paires');
  await until(async () => (await seats.Emma.locator('.my-infos').count()) === 1, 'information du Chef');
  assert.match(await text(seats.Emma, '.my-infos'), /Le Chef détecte \d paire/);

  await hostStep('La Voyante choisit 2 joueurs');
  const chloe = seats.Chloé;
  await chloe.locator('.prompt').waitFor();
  await seat(chloe, 'Bruno').click();
  await seat(chloe, 'Alice').click();
  await shot('13-multi-joueur', chloe);
  await chloe.getByRole('button', { name: '✓ Valider mon choix' }).click();
  await host.getByText('Chloé a fait son choix').waitFor();
  await hostConfirm();

  await until(async () => (await chloe.locator('.my-infos').count()) === 1, 'information de la Voyante');
  assert.match(await text(chloe, '.my-infos'), /Voyante vérifie Bruno et Alice: Il (y a un|n'y a pas de) démon/);
  // Le Conteur sait que l'information est fausse, pas la Voyante empoisonnée
  assert.match((await hostState()).nightLog[0].events[0].text, /Voyante \(empoisonnée\/ivre\)/);
  assert.doesNotMatch(await text(chloe), /empoisonn|ivre|FAUX/i);
  await everyPlayer(async (p, name) => {
    if (!['Emma', 'Chloé'].includes(name)) assert.equal(await p.locator('.my-infos').count(), 0, `${name} n'a reçu aucune information`);
  });
});

const vote = (name, yes) => seats[name].locator(yes ? '.vote-yes' : '.vote-no').click();
const nominateFrom = async (name, target) => {
  await seat(seats[name], target).click();
  await seats[name].getByRole('button', { name: `Nominer ${target}` }).click();
};

await test('le jour se lève pour tout le monde : débat chronométré et discussion publique', async () => {
  await host.getByRole('button', { name: '☀️ Nouvelle Journée' }).click();
  await everyPlayer(async (p, name) => {
    await until(async () => /Jour 1/.test(await text(p, '.phase')), `jour 1 chez ${name}`);
    await until(async () => /^(2:00|1:[0-5]\d)$/.test(await text(p, '.day-panel .countdown')), `compte à rebours de 2 minutes chez ${name}`);
    assert.equal(await p.getByRole('button', { name: /Nominer/ }).count(), 0, 'pas de nomination pendant le débat');
  });
  assert.match(await text(host, '.day-vote .countdown'), /^(2:00|1:[0-5]\d)$/);
  const first = await text(seats.Alice, '.day-panel .countdown');
  await until(async () => (await text(seats.Alice, '.day-panel .countdown')) !== first, 'le compte à rebours défile');

  await say(seats.Hugo, 'Je propose Emma');
  await until(async () => /Hugo : Je propose Emma/.test(await text(seats.Gaëlle, '.chat-messages')), 'discussion publique rouverte le jour');
});

await test('nomination et vote sur l\'écran de chaque joueur', async () => {
  await host.getByRole('button', { name: 'Ouvrir les nominations' }).click();
  await everyPlayer((p, name) => until(async () => /Nominations ouvertes · 4 voix nécessaires/.test(await text(p, '.day-panel')), `nominations ouvertes chez ${name}`));

  await nominateFrom('Hugo', 'Emma');
  await everyPlayer(async (p, name) => {
    await until(async () => /Hugo nomine Emma/.test(await text(p, '.day-panel')), `nomination vue par ${name}`);
    assert.equal(await p.locator('.vote-yes').count(), 1, `${name} peut voter`);
  });
  await shot('16-multi-vote', seats.Chloé);

  for (const name of ['Hugo', 'Alice', 'Bruno', 'David', 'Farid']) await vote(name, true);
  for (const name of ['Chloé', 'Gaëlle']) await vote(name, false);
  await until(async () => /7\/8 ont voté/.test(await text(seats.Emma, '.day-panel')), 'décompte des votants');
  // Les voix restent secrètes tant que le vote n'est pas clos
  assert.equal(await seats.Emma.locator('.vote-result').count(), 0);
  assert.match(await text(seats.Hugo, '.my-vote'), /Vous avez voté Oui/);
  assert.equal(await seats.Hugo.locator('.vote-yes').count(), 0, 'un seul vote par joueur');

  await vote('Emma', false);
  await everyPlayer((p, name) => until(async () => /Emma : 5 voix \(Alice, Bruno, David, Farid, Hugo\) — condamné/.test(await text(p, '.day-panel')), `résultat chez ${name}`));
  assert.match(await text(host, '.day-vote'), /Emma : 5 voix/);
});

await test('une nomination par joueur et par jour ; le plus de voix l\'emporte', async () => {
  assert.match(await text(seats.Hugo, '.day-panel'), /déjà nominé/);
  // Emma a déjà été nominée aujourd'hui : elle n'est plus sélectionnable
  await seat(seats.Alice, 'Emma').click();
  assert.ok(await seats.Alice.getByRole('button', { name: 'Nominer', exact: true }).isDisabled());

  await nominateFrom('Alice', 'Bruno');
  for (const name of ['Alice', 'Chloé', 'Gaëlle']) await vote(name, true);
  for (const name of ['Bruno', 'David', 'Emma', 'Farid', 'Hugo']) await vote(name, false);
  await everyPlayer(async (p, name) => {
    await until(async () => /Bruno : 3 voix/.test(await text(p, '.day-panel')), `second résultat chez ${name}`);
    assert.doesNotMatch(await text(p, '.day-panel'), /Bruno : 3 voix[^\n]*condamné/, '3 voix ne suffisent pas');
  });
  assert.match((await hostState()).nightLog[0].events[0].text, /Vote contre Bruno : 3 voix sur 4 nécessaires/);
});

await test('le Conteur exécute le condamné : tout le monde le voit', async () => {
  await host.getByRole('button', { name: 'Exécuter Emma' }).click();
  await everyPlayer(async (p, name) => {
    await until(async () => (await seat(p, 'Emma').getAttribute('data-alive')) === 'false', `mort d'Emma vue par ${name}`);
    await until(async () => /Nuit 2/.test(await text(p, '.phase')), `nuit 2 chez ${name}`);
    assert.equal(await p.locator('.day-panel').count(), 0);
  });
  assert.match(await text(seats.Emma, '.role-team'), /mort/);
});

await test('une mort de nuit reste secrète jusqu\'au lever du jour', async () => {
  await hostStep('Le Démon (Imp) choisit un joueur à tuer');
  await playerPicks('Bruno', ['Gaëlle']);
  await shot('14-multi-demon', seats.Bruno);
  await hostConfirm();
  assert.equal((await hostPlayer('Gaëlle')).alive, false);

  // Le Gardien, tué cette nuit, désigne un joueur et apprend son rôle
  await hostStep('Le Gardien (s\'il meurt cette nuit)');
  await playerPicks('Gaëlle', ['Bruno']);
  await hostConfirm();
  await until(async () => /Le Gardien apprend que Bruno est Démon/.test(await text(seats.Gaëlle)), 'information du Gardien');

  // Le Majordome choisit son Maître : il ne peut pas se désigner lui-même
  await hostStep('Le Majordome choisit son Maître');
  await seats.Alice.locator('.prompt').waitFor();
  await seat(seats.Alice, 'Alice').click();
  assert.ok(await seats.Alice.getByRole('button', { name: '✓ Valider mon choix' }).isDisabled());
  await playerPicks('Alice', ['Chloé']);
  await hostConfirm();
  assert.equal((await hostPlayer('Chloé')).master, true);

  await everyPlayer(async (p, name) => {
    assert.equal(await seat(p, 'Gaëlle').getAttribute('data-alive'), 'true', `${name} ne sait pas encore que Gaëlle est morte`);
  });
  // Horloge du Conteur sous contrôle, pour faire défiler le débat du jour suivant
  await host.clock.install();
  await host.getByRole('button', { name: '☀️ Nouvelle Journée' }).click();
  await everyPlayer((p, name) => until(async () => (await seat(p, 'Gaëlle').getAttribute('data-alive')) === 'false', `mort de Gaëlle annoncée à ${name}`));
});

await test('à la fin du débat, les nominations s\'ouvrent d\'elles-mêmes', async () => {
  await until(async () => /^(2:00|1:[0-5]\d)$/.test(await text(seats.Farid, '.day-panel .countdown')), 'débat du jour 2');
  await host.clock.fastForward(121000);
  // 6 vivants : 3 voix nécessaires
  await everyPlayer((p, name) => until(async () => /Nominations ouvertes · 3 voix nécessaires/.test(await text(p, '.day-panel')), `nominations ouvertes chez ${name}`));
  assert.match(await text(seats.Emma, '.day-panel'), /Les morts ne nominent pas/);
});

await test('un mort ne dispose que d\'un seul vote pour le reste de la partie', async () => {
  // Le jeton de vote des morts est visible de tous
  assert.equal(await seat(seats.Hugo, 'Emma').locator('.ghost-vote').count(), 1);
  await nominateFrom('Alice', 'Bruno');
  await until(async () => /unique vote/.test(await text(seats.Emma, '.day-panel')), 'rappel du vote de mort');
  await vote('Emma', true);
  await vote('Gaëlle', false);
  // Alice, Majordome, ne peut voter « Oui » qu'après son Maître, Chloé
  assert.match(await text(seats.Alice, '.master-vote'), /Chloé, n'a pas encore voté/);
  assert.ok(await seats.Alice.locator('.vote-yes').isDisabled());
  await vote('Chloé', true);
  await until(async () => seats.Alice.locator('.vote-yes').isEnabled(), 'le Majordome peut suivre son Maître');
  assert.match(await text(seats.Alice, '.master-vote'), /a voté Oui/);
  for (const name of ['Alice', 'Farid']) await vote(name, true);
  for (const name of ['Bruno', 'David', 'Hugo']) await vote(name, false);
  await until(async () => /Bruno : 4 voix \(Alice, Chloé, Emma, Farid\) — condamné/.test(await text(seats.Hugo, '.day-panel')), 'Bruno condamné');
  assert.equal((await hostPlayer('Emma')).ghostUsed, true, 'Emma a dépensé son vote');
  assert.equal((await hostPlayer('Gaëlle')).ghostUsed, false, 'un « Non » ne dépense pas le vote');
  await until(async () => (await seat(seats.Hugo, 'Emma').locator('.ghost-vote').count()) === 0, 'jeton de vote d\'Emma dépensé');
  assert.equal(await seat(seats.Hugo, 'Gaëlle').locator('.ghost-vote').count(), 1);

  // Vote suivant : Emma ne peut plus voter, Gaëlle le peut encore ; le Conteur clôt sans attendre tout le monde
  await nominateFrom('Chloé', 'David');
  await until(async () => (await seats.Emma.locator('.no-vote').count()) === 1, 'Emma ne vote plus');
  assert.equal(await seats.Emma.locator('.vote-yes').count(), 0);
  assert.equal(await seats.Gaëlle.locator('.vote-yes').count(), 1);
  await vote('Chloé', true);
  await vote('Gaëlle', true);
  await until(async () => /2\/7 ont voté/.test(await text(host, '.day-vote')), 'votes reçus par le Conteur');
  await host.getByRole('button', { name: 'Clore le vote' }).click();
  await until(async () => /David : 2 voix \(Chloé, Gaëlle\)/.test(await text(seats.Bruno, '.day-panel')), 'vote clos par le Conteur');
  assert.match(await text(seats.Bruno, '.day-panel'), /Bruno : 4 voix[^\n]*condamné/, 'Bruno reste condamné');
});

await test('un joueur ou le Conteur qui recharge sa page retrouve la partie', async () => {
  await seats.Alice.reload();
  if (fallbackCss) await seats.Alice.addStyleTag({ content: fallbackCss });
  await until(async () => (await seats.Alice.locator('.role-name').count()) === 1, 'Alice retrouve sa place');
  assert.equal(await text(seats.Alice, '.role-name'), 'Majordome');
  assert.match(await text(seats.Alice, '.phase'), /Jour 2/);
  assert.match(await text(seats.Alice, '.chat-messages'), /Bonjour à tous/);
  assert.equal(await host.locator('.player-token').count(), 8, 'pas de doublon dans le cercle');

  const before = await hostState();
  await host.reload();
  if (fallbackCss) await host.addStyleTag({ content: fallbackCss });
  await until(async () => (await text(host, '.btn-room')).includes(`Salon ${roomCode}`), 'le Conteur retrouve son salon');
  assert.deepEqual((await hostState()).players, before.players);
  await everyPlayer((p, name) => until(async () => (await p.locator('.connection-warning').count()) === 0, `Conteur de nouveau en ligne pour ${name}`));
});

await test('le salon est fermé aux nouveaux joueurs une fois la partie lancée', async () => {
  const late = await openBrowser(`?room=${roomCode}`);
  await joinRoom(late, 'Zoé');
  await until(async () => /déjà commencé/.test(await text(late)), 'message d\'erreur');
  await late.context().close();
});

await test('fin de partie : tous les joueurs voient le vainqueur et les rôles', async () => {
  await host.getByRole('button', { name: 'Exécuter Bruno' }).click();
  await host.getByText('Victoire du Village !').waitFor();
  await everyPlayer(async (p, name) => {
    await until(async () => (await p.locator('.game-end').count()) === 1, `fin de partie chez ${name}`);
    assert.match(await text(p, '.game-end'), /Victoire du Village/);
    await until(async () => Object.keys(await knownRoles(p)).length === 8, `rôles révélés à ${name}`);
  });
  await host.getByRole('button', { name: 'Continuer' }).click({ force: true });
});

await test('l\'Espion voit le grimoire quand il le consulte ; le Soûlard se croit Villageois', async () => {
  await host.getByRole('button', { name: 'Recommencer' }).click();
  await until(async () => /pas encore distribué/.test(await text(seats.Alice, '.my-role')), 'partie remise à zéro chez les joueurs');
  // Rôles imposés dans la sauvegarde du Conteur, les joueurs restant connectés
  await host.evaluate((k) => {
    const game = JSON.parse(localStorage.getItem(k));
    const cast = ['spy', 'imp', 'fortuneteller', 'chef', 'drunk', 'empath', 'virgin', 'slayer'];
    game.players = game.players.map((pl, i) => ({
      ...pl, role: cast[i], shownRole: cast[i] === 'drunk' ? 'monk' : null, poisoned: pl.name === 'Hugo',
    }));
    game.roleAssigned = true;
    game.isStarted = true;
    localStorage.setItem(k, JSON.stringify(game));
  }, MULTI_KEY);
  await host.reload();
  if (fallbackCss) await host.addStyleTag({ content: fallbackCss });

  const { Alice: spy, Emma: drunk } = seats;
  // Avant sa consultation, l'Espion ne connaît que son camp
  await until(async () => (await spy.locator('.role-name').count()) === 1, 'rôle de l\'Espion');
  assert.equal(await spy.locator('.grimoire-note').count(), 0);
  assert.deepEqual(await knownRoles(spy), { Alice: 'spy', Bruno: 'imp' });

  await hostStep('L\'Espion consulte le Grimoire');
  await until(async () => (await spy.locator('.grimoire-note').count()) === 1, 'grimoire consulté');
  assert.deepEqual(await knownRoles(spy), {
    Alice: 'spy', Bruno: 'imp', Chloé: 'fortuneteller', David: 'chef', Emma: 'drunk', Farid: 'empath', Gaëlle: 'virgin', Hugo: 'slayer',
  });
  assert.match(await seat(spy, 'Hugo').innerText(), /☠️/, 'l\'Espion voit qui est empoisonné');

  // Ce qui change ensuite n'apparaît pas avant sa prochaine consultation
  await host.locator('.player-token', { hasText: 'Farid' }).click();
  await host.getByText('☠️ Empoisonné').click();
  await host.locator('.grimoire-section').click({ position: { x: 5, y: 5 } });
  await until(async () => (await hostPlayer('Farid')).poisoned === true, 'Farid empoisonné chez le Conteur');
  await host.waitForTimeout(400);
  assert.doesNotMatch(await seat(spy, 'Farid').innerText(), /☠️/, 'le grimoire de l\'Espion n\'est pas en direct');

  await until(async () => (await drunk.locator('.role-name').count()) === 1, 'rôle du Soûlard');
  assert.equal(await text(drunk, '.role-name'), 'Moine');
  assert.match(await text(drunk, '.role-team'), /Villageois · camp du Village/);
  assert.deepEqual(await knownRoles(drunk), { Emma: 'monk' });
  assert.doesNotMatch(await text(drunk), /Soûlard/);
  assert.deepEqual(await knownRoles(seats.Bruno), { Bruno: 'imp' });
  assert.equal(await seat(seats.Bruno, 'Alice').getAttribute('data-team'), 'minion', 'le Démon connaît son Sbire');
});

await test('Vierge nominée à l\'écran par un Villageois : il est exécuté sans vote', async () => {
  await host.getByRole('button', { name: '☀️ Nouvelle Journée' }).click();
  await host.getByRole('button', { name: 'Ouvrir les nominations' }).click();
  await until(async () => /Nominations ouvertes/.test(await text(seats.David, '.day-panel')), 'nominations ouvertes');
  // David (Chef, Villageois) nomine Gaëlle (Vierge)
  await nominateFrom('David', 'Gaëlle');
  await everyPlayer(async (p, name) => {
    await until(async () => (await seat(p, 'David').getAttribute('data-alive')) === 'false', `exécution de David vue par ${name}`);
    await until(async () => /Nuit 2/.test(await text(p, '.phase')), `la journée s'arrête pour ${name}`);
    assert.equal(await p.locator('.vote-yes').count(), 0, 'aucun vote ouvert');
  });
  const st = await hostState();
  assert.equal(st.players.find((pl) => pl.name === 'Gaëlle').used, true);
  assert.equal(st.players.find((pl) => pl.name === 'David').executed, true);
});

await test('le Conteur retire un joueur : il est déconnecté de la partie', async () => {
  // Un joueur ne se retire qu'avant la distribution des rôles
  await host.getByRole('button', { name: 'Recommencer' }).click();
  await host.locator('.player-token', { hasText: 'Hugo' }).click();
  await host.getByRole('button', { name: /Retirer du cercle/ }).click();
  await until(async () => /retiré de la partie/.test(await text(seats.Hugo)), 'Hugo prévenu');
  await until(async () => (await seats.Alice.locator('.seat').count()) === 7, 'cercle à 7 joueurs');
  delete seats.Hugo;
});

await test('le menu permet de quitter puis de reprendre le même salon', async () => {
  await host.getByRole('button', { name: 'Menu' }).click();
  await host.locator('.mode-multi').waitFor();
  await until(async () => (await seats.Alice.locator('.connection-warning').count()) === 1, 'joueurs prévenus de l\'absence du Conteur');
  await host.locator('.mode-multi').click();
  await until(async () => (await text(host, '.btn-room')).includes(`Salon ${roomCode}`), 'même salon');
  assert.equal(await host.locator('.player-token').count(), 7);
  await until(async () => (await seats.Alice.locator('.connection-warning').count()) === 0, 'Conteur de retour');
});

await test('vue joueur sur téléphone', async () => {
  const phone = seats.Chloé;
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.waitForTimeout(300);
  assert.equal(await phone.locator('.seat').count(), 7);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `débordement horizontal de ${overflow}px`);
  await shot('15-multi-mobile', phone);
});

for (const p of [host, ...Object.values(seats)]) await p?.context().close();

// ===== BILAN =====
await browser.close();
await server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests réussis`);
process.exit(failed.length ? 1 : 0);
