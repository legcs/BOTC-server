import { roles } from '../../data/roles';
import { startingInfoHandler } from './startingInfo';

export const handleWasherwomanAction = startingInfoHandler({
  icon: '🧺',
  label: 'Lavandière',
  impaired: '(empoisonnée/ivre)',
  category: 'townsfolk',
  pool: roles.townsfolk.filter(r => r.id !== 'unknown'),
});
