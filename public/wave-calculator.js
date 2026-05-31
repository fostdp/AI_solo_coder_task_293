const WaveCalculator = (function() {
  'use strict';

  const WAVELENGTH = 50;
  const MIN_DISTANCE = 10;
  const ATTENUATION_FACTOR = 30;

  function calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function calculatePhase(distance, wavelength) {
    return (2 * Math.PI * distance) / wavelength;
  }

  function calculateAttenuation(distance) {
    return ATTENUATION_FACTOR / Math.max(MIN_DISTANCE, distance);
  }

  function calculatePointWave(x, y, sourceX, sourceY, amplitude, wavelength) {
    const distance = calculateDistance(x, y, sourceX, sourceY);
    const phase = calculatePhase(distance, wavelength);
    const attenuation = calculateAttenuation(distance);
    return amplitude * attenuation * Math.sin(phase);
  }

  function calculateInterferenceAtPoint(x, y, source1, source2) {
    const wave1 = calculatePointWave(x, y, source1.x, source1.y, source1.amplitude, WAVELENGTH);
    const wave2 = calculatePointWave(x, y, source2.x, source2.y, source2.amplitude, WAVELENGTH);
    return wave1 + wave2;
  }

  function normalizePressure(pressure, maxAmplitude) {
    const clamped = Math.max(-maxAmplitude, Math.min(maxAmplitude, pressure));
    return (clamped + maxAmplitude) / (2 * maxAmplitude);
  }

  function pressureToColor(normalizedPressure) {
    const intensity = Math.floor(normalizedPressure * 255);
    return {
      r: Math.floor(intensity * 0.3),
      g: Math.floor(intensity * 0.6),
      b: intensity
    };
  }

  function calculateInterferenceImage(width, height, source1, source2) {
    const size = width * height;
    const pixelData = new Uint8ClampedArray(size * 4);
    const maxAmplitude = source1.amplitude + source2.amplitude;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pressure = calculateInterferenceAtPoint(x, y, source1, source2);
        const normalizedPressure = normalizePressure(pressure, maxAmplitude);
        const color = pressureToColor(normalizedPressure);
        
        const index = (y * width + x) * 4;
        pixelData[index] = color.r;
        pixelData[index + 1] = color.g;
        pixelData[index + 2] = color.b;
        pixelData[index + 3] = 255;
      }
    }

    return pixelData;
  }

  function calculateFringeSpacing(source1, source2) {
    const d = calculateDistance(source1.x, source1.y, source2.x, source2.y);
    const centerX = (source1.x + source2.x) / 2;
    const centerY = (source1.y + source2.y) / 2;
    
    let fringeCount = 0;
    let prevPressure = null;
    
    for (let y = centerY - 100; y < centerY + 100; y += 1) {
      const pressure = calculateInterferenceAtPoint(centerX, y, source1, source2);
      if (prevPressure !== null && ((prevPressure < 0 && pressure >= 0) || (prevPressure >= 0 && pressure < 0))) {
        fringeCount++;
      }
      prevPressure = pressure;
    }
    
    return fringeCount > 0 ? 200 / fringeCount : WAVELENGTH;
  }

  function getWaveAtTime(time, frequency, amplitude = 1) {
    return amplitude * Math.sin(2 * Math.PI * frequency * time);
  }

  function getBeatWave(time, freq1, freq2, amp1 = 1, amp2 = 1) {
    return getWaveAtTime(time, freq1, amp1) + getWaveAtTime(time, freq2, amp2);
  }

  return {
    calculateDistance,
    calculatePhase,
    calculateAttenuation,
    calculatePointWave,
    calculateInterferenceAtPoint,
    normalizePressure,
    pressureToColor,
    calculateInterferenceImage,
    calculateFringeSpacing,
    getWaveAtTime,
    getBeatWave,
    constants: {
      WAVELENGTH,
      MIN_DISTANCE,
      ATTENUATION_FACTOR
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WaveCalculator;
}
