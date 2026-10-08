import { handlePoisonerAction } from './poisoner';
import { handleMonkAction } from './monk';
import { handleFortuneTellerAction } from './fortuneteller';
import { handleButlerAction } from './butler';
import { handleChefAction } from './chef';
import { handleEmpathAction } from './empath';
import { handleImpAction } from './imp';
import { handleInvestigatorAction } from './investigator';
import { handleLibrarianAction } from './librarian';
import { handleRavenkeeperAction } from './ravenkeeper';
import { handleUndertakerAction } from './undertaker';
import { handleWasherwomanAction } from './washerwoman';
import { handleSpyAction } from './spy';
import { handleSlayerAction } from './slayer';

// Capacités résolues automatiquement, indexées par id de rôle
export const roleHandlers = {
  poisoner: handlePoisonerAction,
  monk: handleMonkAction,
  fortuneteller: handleFortuneTellerAction,
  butler: handleButlerAction,
  chef: handleChefAction,
  empath: handleEmpathAction,
  imp: handleImpAction,
  investigator: handleInvestigatorAction,
  librarian: handleLibrarianAction,
  ravenkeeper: handleRavenkeeperAction,
  undertaker: handleUndertakerAction,
  washerwoman: handleWasherwomanAction,
  spy: handleSpyAction,
  slayer: handleSlayerAction,
};
