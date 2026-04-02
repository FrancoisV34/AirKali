import { wmoCodeToText } from './wmo-codes';

describe('wmoCodeToText', () => {
  it('should return "Ciel dégagé" for code 0', () => {
    expect(wmoCodeToText(0)).toBe('Ciel dégagé');
  });

  it('should return "Pluie modérée" for code 63', () => {
    expect(wmoCodeToText(63)).toBe('Pluie modérée');
  });

  it('should return "Orage" for code 95', () => {
    expect(wmoCodeToText(95)).toBe('Orage');
  });

  it('should return "Inconnu" for unknown code', () => {
    expect(wmoCodeToText(999)).toBe('Inconnu');
  });
});
