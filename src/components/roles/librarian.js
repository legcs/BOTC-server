import { roles } from '../../data/roles';
import { startingInfoHandler } from './startingInfo';

export const handleLibrarianAction = startingInfoHandler({
  icon: '📚',
  label: 'Libraire',
  impaired: '(empoisonné/ivre)',
  category: 'outsider',
  pool: roles.outsiders,
  noneText: 'qu\'il n\'y a aucun Étranger en jeu (0)',
});
