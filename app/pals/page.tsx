import { PalList } from '#/ui/pal-list';
import data from '#/database/pals.json';

export default function Page() {
  return <PalList pals={data} />;
}
