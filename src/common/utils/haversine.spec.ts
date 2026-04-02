import { haversineDistance, getBoundingBox } from './haversine';

describe('Haversine', () => {
  describe('haversineDistance', () => {
    it('should return ~392 km between Paris and Lyon', () => {
      const distance = haversineDistance(48.8566, 2.3522, 45.764, 4.8357);
      expect(distance).toBeGreaterThan(390);
      expect(distance).toBeLessThan(395);
    });

    it('should return 0 for the same point', () => {
      const distance = haversineDistance(48.8566, 2.3522, 48.8566, 2.3522);
      expect(distance).toBe(0);
    });

    it('should return ~10 km for nearby points', () => {
      const distance = haversineDistance(48.8566, 2.3522, 48.9, 2.35);
      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThan(6);
    });
  });

  describe('getBoundingBox', () => {
    it('should return a bounding box around a point', () => {
      const box = getBoundingBox(48.8566, 2.3522, 10);
      expect(box.minLat).toBeLessThan(48.8566);
      expect(box.maxLat).toBeGreaterThan(48.8566);
      expect(box.minLng).toBeLessThan(2.3522);
      expect(box.maxLng).toBeGreaterThan(2.3522);
    });
  });
});
