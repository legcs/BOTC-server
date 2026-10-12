import { roles } from '../../data/roles';
import { startingInfoHandler } from './startingInfo';

export const handleInvestigatorAction = startingInfoHandler({
  icon: '🔍',
  label: 'Enquêteur',
  impaired: '(empoisonné/ivre)',
  category: 'minion',
  pool: roles.minions,
});
