declare interface Pal {
  attack: {
    hp: number | null;
    melee: number | null;
    shot: number | null;
    defence: number | null;
  };
  speed: {
    stamina: number | null;
    walking: number | null;
    running: number | null;
    mounted: number | null;
    transporting: number | null;
  };
  code: string;
  name: string;
  type: string[];
  night: boolean;
  works: {
    type: string;
    level: number;
  }[];
  food: number;
  breedPower: number;
  price: number | null;
  captureMulti: number | null;
  malePercent: number | null;
  en_name: string;
}
