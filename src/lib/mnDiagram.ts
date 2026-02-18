/**
 * M-N Interaction Diagram Calculator
 * EC2 rectangular stress block method for RC columns
 */

export interface MNInput {
  b: number;     // width mm
  h: number;     // height mm
  As1: number;   // tension rebar area mm²
  As2: number;   // compression rebar area mm²
  fck: number;   // concrete characteristic strength MPa
  fyk: number;   // steel yield strength MPa
  cover: number; // cover to centroid of rebar mm (default 45)
}

export interface MNPoint {
  N: number; // kN (positive = compression)
  M: number; // kNm
}

export interface MNResult {
  envelope: MNPoint[];
  pureCompression: MNPoint;
  pureBending: MNPoint;
  pureTension: MNPoint;
  balanced: MNPoint;
}

/**
 * Calculate M-N interaction envelope per EC2.
 * Convention: N positive = compression, M positive.
 */
export function calculateMNEnvelope(input: MNInput): MNResult {
  const { b, h, fck, fyk } = input;
  const cover = input.cover || 45;
  const As1 = input.As1; // bottom (tension side)
  const As2 = input.As2; // top (compression side)

  // Design strengths
  const fcd = 0.85 * fck / 1.5;  // αcc * fck / γc
  const fyd = fyk / 1.15;         // fyk / γs
  const Es = 200000;              // MPa
  const ecu = 0.0035;             // ultimate concrete strain

  const d = h - cover;   // effective depth to tension steel
  const d2 = cover;      // depth to compression steel

  // EC2 stress block: λ = 0.8, η = 1.0 for fck ≤ 50
  const lambda = fck <= 50 ? 0.8 : 0.8 - (fck - 50) / 400;
  const eta = fck <= 50 ? 1.0 : 1.0 - (fck - 50) / 200;

  const points: MNPoint[] = [];

  // Sweep neutral axis depth x from negative (pure tension) to beyond h (pure compression)
  const steps = 80;
  const xMin = -50;  // beyond pure tension
  const xMax = h * 2.5;  // beyond pure compression

  for (let i = 0; i <= steps; i++) {
    const x = xMin + (xMax - xMin) * (i / steps);

    // Concrete compression force (only if x > 0)
    let Nc = 0;
    let yc = 0; // depth of concrete force from top
    if (x > 0) {
      const xeff = Math.min(lambda * x, h); // effective stress block depth
      Nc = eta * fcd * b * xeff / 1000; // kN
      yc = xeff / 2; // centroid of rectangular stress block
    }

    // Steel strains (plane sections remain plane)
    let es2 = 0; // compression steel strain
    let es1 = 0; // tension steel strain

    if (x > 0.001) {
      es2 = ecu * (x - d2) / x;
      es1 = ecu * (x - d) / x; // negative = tension
    } else if (x < -0.001) {
      // Both steels in tension for x < 0
      es2 = -fyd / Es;
      es1 = -fyd / Es;
    } else {
      // x ≈ 0
      es2 = -ecu;
      es1 = -ecu;
    }

    // Steel stresses (capped at fyd)
    const ss2 = Math.max(-fyd, Math.min(fyd, Es * es2));
    const ss1 = Math.max(-fyd, Math.min(fyd, Es * es1));

    // Steel forces (kN) - positive = compression
    const Ns2 = As2 * ss2 / 1000;
    const Ns1 = As1 * ss1 / 1000;

    // Total axial force (positive = compression)
    const N = Nc + Ns2 + Ns1;

    // Moment about section centroid (h/2 from top)
    const centroid = h / 2;
    const Mc = Nc * (centroid - yc) / 1000; // kNm
    const Ms2 = Ns2 * (centroid - d2) / 1000;
    const Ms1 = Ns1 * (centroid - d) / 1000;
    const M = Math.abs(Mc + Ms2 + Ms1);

    points.push({ N, M });
  }

  // Find key points
  const pureCompression = points.reduce((a, b) => a.N > b.N ? a : b);
  const pureTension = points.reduce((a, b) => a.N < b.N ? a : b);
  const pureBending = points.reduce((a, b) => {
    if (Math.abs(a.N) < Math.abs(b.N)) return a;
    return b;
  });
  // Balanced: maximum moment
  const balanced = points.reduce((a, b) => a.M > b.M ? a : b);

  return {
    envelope: points,
    pureCompression,
    pureBending,
    pureTension,
    balanced,
  };
}
