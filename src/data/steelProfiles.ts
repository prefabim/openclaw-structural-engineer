/**
 * European steel section profiles per Eurocode 3 (EN 10365).
 *
 * Units:
 *   h, b, tw, tf, r  → mm
 *   A                 → cm²
 *   Iy, Iz            → cm⁴
 *   Wy, Wz            → cm³  (elastic section modulus)
 *   iy, iz            → cm   (radius of gyration)
 *   mass              → kg/m
 */

export type ProfileFamily = "IPE" | "HEA" | "HEB" | "HEM" | "UPN" | "UPE";

export interface SteelProfile {
  name: string;
  family: ProfileFamily;
  h: number;   // overall depth
  b: number;   // flange width
  tw: number;  // web thickness
  tf: number;  // flange thickness
  r: number;   // root radius
  A: number;   // cross-section area
  Iy: number;  // moment of inertia, strong axis
  Iz: number;  // moment of inertia, weak axis
  Wy: number;  // elastic section modulus, strong axis
  Wz: number;  // elastic section modulus, weak axis
  iy: number;  // radius of gyration, strong axis
  iz: number;  // radius of gyration, weak axis
  mass: number; // mass per unit length
}

// ---------------------------------------------------------------------------
// IPE – European I-beams (narrow flange)
// ---------------------------------------------------------------------------
const IPE: SteelProfile[] = [
  { name: "IPE 80",  family: "IPE", h: 80,  b: 46,  tw: 3.8,  tf: 5.2,  r: 5,  A: 7.64,  Iy: 80.1,    Iz: 8.49,   Wy: 20.0,   Wz: 3.69,   iy: 3.24,  iz: 1.05,  mass: 6.0 },
  { name: "IPE 100", family: "IPE", h: 100, b: 55,  tw: 4.1,  tf: 5.7,  r: 7,  A: 10.3,  Iy: 171,     Iz: 15.9,   Wy: 34.2,   Wz: 5.79,   iy: 4.07,  iz: 1.24,  mass: 8.1 },
  { name: "IPE 120", family: "IPE", h: 120, b: 64,  tw: 4.4,  tf: 6.3,  r: 7,  A: 13.2,  Iy: 318,     Iz: 27.7,   Wy: 53.0,   Wz: 8.65,   iy: 4.90,  iz: 1.45,  mass: 10.4 },
  { name: "IPE 140", family: "IPE", h: 140, b: 73,  tw: 4.7,  tf: 6.9,  r: 7,  A: 16.4,  Iy: 541,     Iz: 44.9,   Wy: 77.3,   Wz: 12.3,   iy: 5.74,  iz: 1.65,  mass: 12.9 },
  { name: "IPE 160", family: "IPE", h: 160, b: 82,  tw: 5.0,  tf: 7.4,  r: 9,  A: 20.1,  Iy: 869,     Iz: 68.3,   Wy: 109,    Wz: 16.7,   iy: 6.58,  iz: 1.84,  mass: 15.8 },
  { name: "IPE 180", family: "IPE", h: 180, b: 91,  tw: 5.3,  tf: 8.0,  r: 9,  A: 23.9,  Iy: 1317,    Iz: 101,    Wy: 146,    Wz: 22.2,   iy: 7.42,  iz: 2.05,  mass: 18.8 },
  { name: "IPE 200", family: "IPE", h: 200, b: 100, tw: 5.6,  tf: 8.5,  r: 12, A: 28.5,  Iy: 1943,    Iz: 142,    Wy: 194,    Wz: 28.5,   iy: 8.26,  iz: 2.24,  mass: 22.4 },
  { name: "IPE 220", family: "IPE", h: 220, b: 110, tw: 5.9,  tf: 9.2,  r: 12, A: 33.4,  Iy: 2772,    Iz: 205,    Wy: 252,    Wz: 37.3,   iy: 9.11,  iz: 2.48,  mass: 26.2 },
  { name: "IPE 240", family: "IPE", h: 240, b: 120, tw: 6.2,  tf: 9.8,  r: 15, A: 39.1,  Iy: 3892,    Iz: 284,    Wy: 324,    Wz: 47.3,   iy: 9.97,  iz: 2.69,  mass: 30.7 },
  { name: "IPE 270", family: "IPE", h: 270, b: 135, tw: 6.6,  tf: 10.2, r: 15, A: 45.9,  Iy: 5790,    Iz: 420,    Wy: 429,    Wz: 62.2,   iy: 11.23, iz: 3.02,  mass: 36.1 },
  { name: "IPE 300", family: "IPE", h: 300, b: 150, tw: 7.1,  tf: 10.7, r: 15, A: 53.8,  Iy: 8356,    Iz: 604,    Wy: 557,    Wz: 80.5,   iy: 12.46, iz: 3.35,  mass: 42.2 },
  { name: "IPE 330", family: "IPE", h: 330, b: 160, tw: 7.5,  tf: 11.5, r: 18, A: 62.6,  Iy: 11770,   Iz: 788,    Wy: 713,    Wz: 98.5,   iy: 13.71, iz: 3.55,  mass: 49.1 },
  { name: "IPE 360", family: "IPE", h: 360, b: 170, tw: 8.0,  tf: 12.7, r: 18, A: 72.7,  Iy: 16270,   Iz: 1043,   Wy: 904,    Wz: 123,    iy: 14.95, iz: 3.79,  mass: 57.1 },
  { name: "IPE 400", family: "IPE", h: 400, b: 180, tw: 8.6,  tf: 13.5, r: 21, A: 84.5,  Iy: 23130,   Iz: 1318,   Wy: 1156,   Wz: 146,    iy: 16.55, iz: 3.95,  mass: 66.3 },
  { name: "IPE 450", family: "IPE", h: 450, b: 190, tw: 9.4,  tf: 14.6, r: 21, A: 98.8,  Iy: 33740,   Iz: 1676,   Wy: 1500,   Wz: 176,    iy: 18.48, iz: 4.12,  mass: 77.6 },
  { name: "IPE 500", family: "IPE", h: 500, b: 200, tw: 10.2, tf: 16.0, r: 21, A: 116.0, Iy: 48200,   Iz: 2142,   Wy: 1928,   Wz: 214,    iy: 20.43, iz: 4.31,  mass: 90.7 },
  { name: "IPE 550", family: "IPE", h: 550, b: 210, tw: 11.1, tf: 17.2, r: 24, A: 134.0, Iy: 67120,   Iz: 2668,   Wy: 2441,   Wz: 254,    iy: 22.35, iz: 4.45,  mass: 106 },
  { name: "IPE 600", family: "IPE", h: 600, b: 220, tw: 12.0, tf: 19.0, r: 24, A: 156.0, Iy: 92080,   Iz: 3387,   Wy: 3069,   Wz: 308,    iy: 24.30, iz: 4.66,  mass: 122 },
];

// ---------------------------------------------------------------------------
// HEA – European wide-flange beams (light series)
// ---------------------------------------------------------------------------
const HEA: SteelProfile[] = [
  { name: "HEA 100", family: "HEA", h: 96,  b: 100, tw: 5.0,  tf: 8.0,  r: 12, A: 21.2,  Iy: 349,     Iz: 134,    Wy: 72.8,   Wz: 26.8,   iy: 4.06,  iz: 2.51,  mass: 16.7 },
  { name: "HEA 120", family: "HEA", h: 114, b: 120, tw: 5.0,  tf: 8.0,  r: 12, A: 25.3,  Iy: 606,     Iz: 231,    Wy: 106,    Wz: 38.5,   iy: 4.89,  iz: 3.02,  mass: 19.9 },
  { name: "HEA 140", family: "HEA", h: 133, b: 140, tw: 5.5,  tf: 8.5,  r: 12, A: 31.4,  Iy: 1033,    Iz: 389,    Wy: 155,    Wz: 55.6,   iy: 5.73,  iz: 3.52,  mass: 24.7 },
  { name: "HEA 160", family: "HEA", h: 152, b: 160, tw: 6.0,  tf: 9.0,  r: 15, A: 38.8,  Iy: 1673,    Iz: 616,    Wy: 220,    Wz: 77.0,   iy: 6.57,  iz: 3.98,  mass: 30.4 },
  { name: "HEA 180", family: "HEA", h: 171, b: 180, tw: 6.0,  tf: 9.5,  r: 15, A: 45.3,  Iy: 2510,    Iz: 925,    Wy: 294,    Wz: 103,    iy: 7.45,  iz: 4.52,  mass: 35.5 },
  { name: "HEA 200", family: "HEA", h: 190, b: 200, tw: 6.5,  tf: 10.0, r: 18, A: 53.8,  Iy: 3692,    Iz: 1336,   Wy: 389,    Wz: 134,    iy: 8.28,  iz: 4.98,  mass: 42.3 },
  { name: "HEA 220", family: "HEA", h: 210, b: 220, tw: 7.0,  tf: 11.0, r: 18, A: 64.3,  Iy: 5410,    Iz: 1955,   Wy: 515,    Wz: 178,    iy: 9.17,  iz: 5.51,  mass: 50.5 },
  { name: "HEA 240", family: "HEA", h: 230, b: 240, tw: 7.5,  tf: 12.0, r: 21, A: 76.8,  Iy: 7763,    Iz: 2769,   Wy: 675,    Wz: 231,    iy: 10.05, iz: 6.00,  mass: 60.3 },
  { name: "HEA 260", family: "HEA", h: 250, b: 260, tw: 7.5,  tf: 12.5, r: 24, A: 86.8,  Iy: 10450,   Iz: 3668,   Wy: 836,    Wz: 282,    iy: 10.97, iz: 6.50,  mass: 68.2 },
  { name: "HEA 280", family: "HEA", h: 270, b: 280, tw: 8.0,  tf: 13.0, r: 24, A: 97.3,  Iy: 13670,   Iz: 4763,   Wy: 1013,   Wz: 340,    iy: 11.86, iz: 6.99,  mass: 76.4 },
  { name: "HEA 300", family: "HEA", h: 290, b: 300, tw: 8.5,  tf: 14.0, r: 27, A: 112.5, Iy: 18260,   Iz: 6310,   Wy: 1260,   Wz: 421,    iy: 12.74, iz: 7.49,  mass: 88.3 },
  { name: "HEA 320", family: "HEA", h: 310, b: 300, tw: 9.0,  tf: 15.5, r: 27, A: 124.4, Iy: 22930,   Iz: 6985,   Wy: 1479,   Wz: 466,    iy: 13.58, iz: 7.49,  mass: 97.6 },
  { name: "HEA 340", family: "HEA", h: 330, b: 300, tw: 9.5,  tf: 16.5, r: 27, A: 133.5, Iy: 27690,   Iz: 7436,   Wy: 1678,   Wz: 496,    iy: 14.40, iz: 7.46,  mass: 105 },
  { name: "HEA 360", family: "HEA", h: 350, b: 300, tw: 10.0, tf: 17.5, r: 27, A: 142.8, Iy: 33090,   Iz: 7887,   Wy: 1891,   Wz: 526,    iy: 15.22, iz: 7.43,  mass: 112 },
  { name: "HEA 400", family: "HEA", h: 390, b: 300, tw: 11.0, tf: 19.0, r: 27, A: 159.0, Iy: 45070,   Iz: 8564,   Wy: 2311,   Wz: 571,    iy: 16.84, iz: 7.34,  mass: 125 },
  { name: "HEA 450", family: "HEA", h: 440, b: 300, tw: 11.5, tf: 21.0, r: 27, A: 178.0, Iy: 63720,   Iz: 9465,   Wy: 2896,   Wz: 631,    iy: 18.92, iz: 7.29,  mass: 140 },
  { name: "HEA 500", family: "HEA", h: 490, b: 300, tw: 12.0, tf: 23.0, r: 27, A: 197.5, Iy: 86970,   Iz: 10370,  Wy: 3550,   Wz: 691,    iy: 20.98, iz: 7.24,  mass: 155 },
  { name: "HEA 550", family: "HEA", h: 540, b: 300, tw: 12.5, tf: 24.0, r: 27, A: 212.0, Iy: 111900,  Iz: 10820,  Wy: 4146,   Wz: 721,    iy: 22.99, iz: 7.15,  mass: 166 },
  { name: "HEA 600", family: "HEA", h: 590, b: 300, tw: 13.0, tf: 25.0, r: 27, A: 226.5, Iy: 141200,  Iz: 11270,  Wy: 4787,   Wz: 751,    iy: 24.96, iz: 7.05,  mass: 178 },
];

// ---------------------------------------------------------------------------
// HEB – European wide-flange beams (medium series)
// ---------------------------------------------------------------------------
const HEB: SteelProfile[] = [
  { name: "HEB 100", family: "HEB", h: 100, b: 100, tw: 6.0,  tf: 10.0, r: 12, A: 26.0,  Iy: 450,     Iz: 167,    Wy: 89.9,   Wz: 33.5,   iy: 4.16,  iz: 2.53,  mass: 20.4 },
  { name: "HEB 120", family: "HEB", h: 120, b: 120, tw: 6.5,  tf: 11.0, r: 12, A: 34.0,  Iy: 864,     Iz: 318,    Wy: 144,    Wz: 53.0,   iy: 5.04,  iz: 3.06,  mass: 26.7 },
  { name: "HEB 140", family: "HEB", h: 140, b: 140, tw: 7.0,  tf: 12.0, r: 12, A: 43.0,  Iy: 1509,    Iz: 550,    Wy: 216,    Wz: 78.5,   iy: 5.93,  iz: 3.58,  mass: 33.7 },
  { name: "HEB 160", family: "HEB", h: 160, b: 160, tw: 8.0,  tf: 13.0, r: 15, A: 54.3,  Iy: 2492,    Iz: 889,    Wy: 311,    Wz: 111,    iy: 6.78,  iz: 4.05,  mass: 42.6 },
  { name: "HEB 180", family: "HEB", h: 180, b: 180, tw: 8.5,  tf: 14.0, r: 15, A: 65.3,  Iy: 3831,    Iz: 1363,   Wy: 426,    Wz: 151,    iy: 7.66,  iz: 4.57,  mass: 51.2 },
  { name: "HEB 200", family: "HEB", h: 200, b: 200, tw: 9.0,  tf: 15.0, r: 18, A: 78.1,  Iy: 5696,    Iz: 2003,   Wy: 570,    Wz: 200,    iy: 8.54,  iz: 5.07,  mass: 61.3 },
  { name: "HEB 220", family: "HEB", h: 220, b: 220, tw: 9.5,  tf: 16.0, r: 18, A: 91.0,  Iy: 8091,    Iz: 2843,   Wy: 736,    Wz: 258,    iy: 9.43,  iz: 5.59,  mass: 71.5 },
  { name: "HEB 240", family: "HEB", h: 240, b: 240, tw: 10.0, tf: 17.0, r: 21, A: 106.0, Iy: 11260,   Iz: 3923,   Wy: 938,    Wz: 327,    iy: 10.31, iz: 6.08,  mass: 83.2 },
  { name: "HEB 260", family: "HEB", h: 260, b: 260, tw: 10.0, tf: 17.5, r: 24, A: 118.4, Iy: 14920,   Iz: 5135,   Wy: 1148,   Wz: 395,    iy: 11.22, iz: 6.58,  mass: 93.0 },
  { name: "HEB 280", family: "HEB", h: 280, b: 280, tw: 10.5, tf: 18.0, r: 24, A: 131.4, Iy: 19270,   Iz: 6595,   Wy: 1376,   Wz: 471,    iy: 12.11, iz: 7.09,  mass: 103 },
  { name: "HEB 300", family: "HEB", h: 300, b: 300, tw: 11.0, tf: 19.0, r: 27, A: 149.1, Iy: 25170,   Iz: 8563,   Wy: 1678,   Wz: 571,    iy: 12.99, iz: 7.58,  mass: 117 },
  { name: "HEB 320", family: "HEB", h: 320, b: 300, tw: 11.5, tf: 20.5, r: 27, A: 161.3, Iy: 30820,   Iz: 9239,   Wy: 1926,   Wz: 616,    iy: 13.82, iz: 7.57,  mass: 127 },
  { name: "HEB 340", family: "HEB", h: 340, b: 300, tw: 12.0, tf: 21.5, r: 27, A: 170.9, Iy: 36660,   Iz: 9690,   Wy: 2156,   Wz: 646,    iy: 14.65, iz: 7.53,  mass: 134 },
  { name: "HEB 360", family: "HEB", h: 360, b: 300, tw: 12.5, tf: 22.5, r: 27, A: 180.6, Iy: 43190,   Iz: 10140,  Wy: 2400,   Wz: 676,    iy: 15.46, iz: 7.49,  mass: 142 },
  { name: "HEB 400", family: "HEB", h: 400, b: 300, tw: 13.5, tf: 24.0, r: 27, A: 197.8, Iy: 57680,   Iz: 10820,  Wy: 2884,   Wz: 721,    iy: 17.08, iz: 7.40,  mass: 155 },
  { name: "HEB 450", family: "HEB", h: 450, b: 300, tw: 14.0, tf: 26.0, r: 27, A: 218.0, Iy: 79890,   Iz: 11720,  Wy: 3551,   Wz: 781,    iy: 19.14, iz: 7.33,  mass: 171 },
  { name: "HEB 500", family: "HEB", h: 500, b: 300, tw: 14.5, tf: 28.0, r: 27, A: 238.6, Iy: 107200,  Iz: 12620,  Wy: 4287,   Wz: 842,    iy: 21.19, iz: 7.27,  mass: 187 },
  { name: "HEB 550", family: "HEB", h: 550, b: 300, tw: 15.0, tf: 29.0, r: 27, A: 254.1, Iy: 136700,  Iz: 13080,  Wy: 4971,   Wz: 872,    iy: 23.20, iz: 7.17,  mass: 199 },
  { name: "HEB 600", family: "HEB", h: 600, b: 300, tw: 15.5, tf: 30.0, r: 27, A: 270.0, Iy: 171000,  Iz: 13530,  Wy: 5701,   Wz: 902,    iy: 25.17, iz: 7.08,  mass: 212 },
];

// ---------------------------------------------------------------------------
// HEM – European wide-flange beams (heavy series)
// ---------------------------------------------------------------------------
const HEM: SteelProfile[] = [
  { name: "HEM 100", family: "HEM", h: 120, b: 106, tw: 12.0, tf: 20.0, r: 12, A: 53.2,  Iy: 1143,    Iz: 399,    Wy: 190,    Wz: 75.3,   iy: 4.63,  iz: 2.74,  mass: 41.8 },
  { name: "HEM 120", family: "HEM", h: 140, b: 126, tw: 12.5, tf: 21.0, r: 12, A: 66.4,  Iy: 2018,    Iz: 703,    Wy: 288,    Wz: 112,    iy: 5.51,  iz: 3.25,  mass: 52.1 },
  { name: "HEM 140", family: "HEM", h: 160, b: 146, tw: 13.0, tf: 22.0, r: 12, A: 80.6,  Iy: 3291,    Iz: 1144,   Wy: 411,    Wz: 157,    iy: 6.39,  iz: 3.77,  mass: 63.2 },
  { name: "HEM 160", family: "HEM", h: 180, b: 166, tw: 14.0, tf: 23.0, r: 15, A: 97.1,  Iy: 5098,    Iz: 1759,   Wy: 566,    Wz: 212,    iy: 7.24,  iz: 4.26,  mass: 76.2 },
  { name: "HEM 180", family: "HEM", h: 200, b: 186, tw: 14.5, tf: 24.0, r: 15, A: 113.0, Iy: 7483,    Iz: 2580,   Wy: 748,    Wz: 277,    iy: 8.13,  iz: 4.78,  mass: 88.9 },
  { name: "HEM 200", family: "HEM", h: 220, b: 206, tw: 15.0, tf: 25.0, r: 18, A: 131.0, Iy: 10640,   Iz: 3651,   Wy: 967,    Wz: 354,    iy: 9.01,  iz: 5.28,  mass: 103 },
  { name: "HEM 220", family: "HEM", h: 240, b: 226, tw: 15.5, tf: 26.0, r: 18, A: 149.0, Iy: 14600,   Iz: 5012,   Wy: 1217,   Wz: 443,    iy: 9.89,  iz: 5.79,  mass: 117 },
  { name: "HEM 240", family: "HEM", h: 270, b: 248, tw: 18.0, tf: 32.0, r: 21, A: 200.0, Iy: 24290,   Iz: 8153,   Wy: 1799,   Wz: 658,    iy: 11.03, iz: 6.39,  mass: 157 },
  { name: "HEM 260", family: "HEM", h: 290, b: 268, tw: 18.0, tf: 32.5, r: 24, A: 220.0, Iy: 31310,   Iz: 10450,  Wy: 2159,   Wz: 780,    iy: 11.92, iz: 6.89,  mass: 172 },
  { name: "HEM 280", family: "HEM", h: 310, b: 288, tw: 18.5, tf: 33.0, r: 24, A: 240.0, Iy: 39550,   Iz: 13160,  Wy: 2551,   Wz: 914,    iy: 12.84, iz: 7.40,  mass: 189 },
  { name: "HEM 300", family: "HEM", h: 340, b: 310, tw: 21.0, tf: 39.0, r: 27, A: 303.0, Iy: 59200,   Iz: 19400,  Wy: 3482,   Wz: 1252,   iy: 13.98, iz: 8.00,  mass: 238 },
  { name: "HEM 320", family: "HEM", h: 359, b: 309, tw: 21.0, tf: 40.0, r: 27, A: 312.0, Iy: 68130,   Iz: 19710,  Wy: 3796,   Wz: 1276,   iy: 14.78, iz: 7.95,  mass: 245 },
  { name: "HEM 340", family: "HEM", h: 377, b: 309, tw: 21.0, tf: 40.0, r: 27, A: 316.0, Iy: 76370,   Iz: 19710,  Wy: 4052,   Wz: 1276,   iy: 15.55, iz: 7.90,  mass: 248 },
  { name: "HEM 360", family: "HEM", h: 395, b: 308, tw: 21.0, tf: 40.0, r: 27, A: 319.0, Iy: 84870,   Iz: 19520,  Wy: 4298,   Wz: 1268,   iy: 16.31, iz: 7.83,  mass: 250 },
  { name: "HEM 400", family: "HEM", h: 432, b: 307, tw: 21.0, tf: 40.0, r: 27, A: 326.0, Iy: 104100,  Iz: 19340,  Wy: 4820,   Wz: 1260,   iy: 17.88, iz: 7.70,  mass: 256 },
  { name: "HEM 450", family: "HEM", h: 478, b: 307, tw: 21.0, tf: 40.0, r: 27, A: 335.0, Iy: 131500,  Iz: 19340,  Wy: 5501,   Wz: 1260,   iy: 19.81, iz: 7.60,  mass: 263 },
  { name: "HEM 500", family: "HEM", h: 524, b: 306, tw: 21.0, tf: 40.0, r: 27, A: 344.0, Iy: 161900,  Iz: 19150,  Wy: 6180,   Wz: 1252,   iy: 21.69, iz: 7.46,  mass: 270 },
  { name: "HEM 550", family: "HEM", h: 572, b: 306, tw: 21.0, tf: 40.0, r: 27, A: 354.0, Iy: 198000,  Iz: 19160,  Wy: 6923,   Wz: 1252,   iy: 23.65, iz: 7.36,  mass: 278 },
  { name: "HEM 600", family: "HEM", h: 620, b: 305, tw: 21.0, tf: 40.0, r: 27, A: 364.0, Iy: 237400,  Iz: 18980,  Wy: 7660,   Wz: 1244,   iy: 25.55, iz: 7.22,  mass: 285 },
];

// ---------------------------------------------------------------------------
// UPN – European standard channels (tapered flanges)
// ---------------------------------------------------------------------------
const UPN: SteelProfile[] = [
  { name: "UPN 80",  family: "UPN", h: 80,  b: 45,  tw: 6.0,  tf: 8.0,  r: 8,    A: 11.0,  Iy: 106,     Iz: 19.4,   Wy: 26.5,   Wz: 6.36,   iy: 3.10,  iz: 1.33,  mass: 8.64 },
  { name: "UPN 100", family: "UPN", h: 100, b: 50,  tw: 6.0,  tf: 8.5,  r: 8.5,  A: 13.5,  Iy: 206,     Iz: 29.3,   Wy: 41.2,   Wz: 8.49,   iy: 3.91,  iz: 1.47,  mass: 10.6 },
  { name: "UPN 120", family: "UPN", h: 120, b: 55,  tw: 7.0,  tf: 9.0,  r: 9,    A: 17.0,  Iy: 364,     Iz: 43.2,   Wy: 60.7,   Wz: 11.1,   iy: 4.62,  iz: 1.59,  mass: 13.4 },
  { name: "UPN 140", family: "UPN", h: 140, b: 60,  tw: 7.0,  tf: 10.0, r: 10,   A: 20.4,  Iy: 605,     Iz: 62.7,   Wy: 86.4,   Wz: 14.8,   iy: 5.45,  iz: 1.75,  mass: 16.0 },
  { name: "UPN 160", family: "UPN", h: 160, b: 65,  tw: 7.5,  tf: 10.5, r: 10.5, A: 24.0,  Iy: 925,     Iz: 85.3,   Wy: 116,    Wz: 18.3,   iy: 6.21,  iz: 1.89,  mass: 18.8 },
  { name: "UPN 180", family: "UPN", h: 180, b: 70,  tw: 8.0,  tf: 11.0, r: 11,   A: 28.0,  Iy: 1350,    Iz: 114,    Wy: 150,    Wz: 22.4,   iy: 6.95,  iz: 2.02,  mass: 22.0 },
  { name: "UPN 200", family: "UPN", h: 200, b: 75,  tw: 8.5,  tf: 11.5, r: 11.5, A: 32.2,  Iy: 1910,    Iz: 148,    Wy: 191,    Wz: 27.0,   iy: 7.70,  iz: 2.14,  mass: 25.3 },
  { name: "UPN 220", family: "UPN", h: 220, b: 80,  tw: 9.0,  tf: 12.5, r: 12.5, A: 37.4,  Iy: 2690,    Iz: 197,    Wy: 245,    Wz: 33.6,   iy: 8.48,  iz: 2.30,  mass: 29.4 },
  { name: "UPN 240", family: "UPN", h: 240, b: 85,  tw: 9.5,  tf: 13.0, r: 13,   A: 42.3,  Iy: 3600,    Iz: 248,    Wy: 300,    Wz: 39.6,   iy: 9.22,  iz: 2.42,  mass: 33.2 },
  { name: "UPN 260", family: "UPN", h: 260, b: 90,  tw: 10.0, tf: 14.0, r: 14,   A: 48.4,  Iy: 4820,    Iz: 317,    Wy: 371,    Wz: 47.7,   iy: 9.99,  iz: 2.56,  mass: 38.0 },
  { name: "UPN 280", family: "UPN", h: 280, b: 95,  tw: 10.0, tf: 15.0, r: 15,   A: 53.3,  Iy: 6280,    Iz: 399,    Wy: 448,    Wz: 57.2,   iy: 10.85, iz: 2.74,  mass: 41.8 },
  { name: "UPN 300", family: "UPN", h: 300, b: 100, tw: 10.0, tf: 16.0, r: 16,   A: 58.8,  Iy: 8030,    Iz: 495,    Wy: 535,    Wz: 67.8,   iy: 11.69, iz: 2.90,  mass: 46.2 },
  { name: "UPN 320", family: "UPN", h: 320, b: 100, tw: 14.0, tf: 17.5, r: 17.5, A: 75.8,  Iy: 10870,   Iz: 597,    Wy: 679,    Wz: 80.6,   iy: 11.97, iz: 2.81,  mass: 59.5 },
  { name: "UPN 350", family: "UPN", h: 350, b: 100, tw: 14.0, tf: 16.0, r: 16,   A: 77.3,  Iy: 12840,   Iz: 570,    Wy: 734,    Wz: 75.0,   iy: 12.89, iz: 2.72,  mass: 60.6 },
  { name: "UPN 380", family: "UPN", h: 380, b: 102, tw: 13.5, tf: 16.0, r: 16,   A: 80.4,  Iy: 15760,   Iz: 615,    Wy: 829,    Wz: 78.7,   iy: 14.00, iz: 2.77,  mass: 63.1 },
  { name: "UPN 400", family: "UPN", h: 400, b: 110, tw: 14.0, tf: 18.0, r: 18,   A: 91.5,  Iy: 20350,   Iz: 846,    Wy: 1020,   Wz: 102,    iy: 14.92, iz: 3.04,  mass: 71.8 },
];

// ---------------------------------------------------------------------------
// UPE – European parallel-flange channels
// ---------------------------------------------------------------------------
const UPE: SteelProfile[] = [
  { name: "UPE 80",  family: "UPE", h: 80,  b: 50,  tw: 4.0,  tf: 7.0,  r: 9,  A: 10.1,  Iy: 107,     Iz: 26.4,   Wy: 26.8,   Wz: 7.56,   iy: 3.26,  iz: 1.62,  mass: 7.9 },
  { name: "UPE 100", family: "UPE", h: 100, b: 55,  tw: 4.5,  tf: 7.5,  r: 10, A: 12.9,  Iy: 210,     Iz: 39.9,   Wy: 42.0,   Wz: 10.2,   iy: 4.03,  iz: 1.76,  mass: 10.1 },
  { name: "UPE 120", family: "UPE", h: 120, b: 60,  tw: 5.0,  tf: 8.0,  r: 11, A: 16.0,  Iy: 375,     Iz: 56.6,   Wy: 62.5,   Wz: 13.2,   iy: 4.84,  iz: 1.88,  mass: 12.6 },
  { name: "UPE 140", family: "UPE", h: 140, b: 65,  tw: 5.0,  tf: 9.0,  r: 12, A: 19.1,  Iy: 599,     Iz: 81.9,   Wy: 85.6,   Wz: 17.5,   iy: 5.60,  iz: 2.07,  mass: 15.0 },
  { name: "UPE 160", family: "UPE", h: 160, b: 70,  tw: 5.5,  tf: 9.5,  r: 12, A: 22.8,  Iy: 909,     Iz: 112,    Wy: 114,    Wz: 21.8,   iy: 6.31,  iz: 2.22,  mass: 17.9 },
  { name: "UPE 180", family: "UPE", h: 180, b: 75,  tw: 5.5,  tf: 10.5, r: 13, A: 26.5,  Iy: 1337,    Iz: 151,    Wy: 149,    Wz: 27.6,   iy: 7.10,  iz: 2.39,  mass: 20.8 },
  { name: "UPE 200", family: "UPE", h: 200, b: 80,  tw: 6.0,  tf: 11.0, r: 13, A: 30.4,  Iy: 1910,    Iz: 187,    Wy: 191,    Wz: 32.0,   iy: 7.93,  iz: 2.48,  mass: 23.8 },
  { name: "UPE 220", family: "UPE", h: 220, b: 85,  tw: 6.5,  tf: 12.0, r: 14, A: 35.7,  Iy: 2710,    Iz: 249,    Wy: 246,    Wz: 39.6,   iy: 8.71,  iz: 2.64,  mass: 28.0 },
  { name: "UPE 240", family: "UPE", h: 240, b: 90,  tw: 7.0,  tf: 12.5, r: 15, A: 40.2,  Iy: 3640,    Iz: 310,    Wy: 303,    Wz: 46.1,   iy: 9.51,  iz: 2.78,  mass: 31.5 },
  { name: "UPE 270", family: "UPE", h: 270, b: 95,  tw: 7.5,  tf: 13.5, r: 15, A: 46.7,  Iy: 5250,    Iz: 403,    Wy: 389,    Wz: 56.0,   iy: 10.60, iz: 2.94,  mass: 36.1 },
  { name: "UPE 300", family: "UPE", h: 300, b: 100, tw: 8.0,  tf: 14.5, r: 16, A: 54.1,  Iy: 7370,    Iz: 515,    Wy: 491,    Wz: 67.5,   iy: 11.67, iz: 3.09,  mass: 42.4 },
  { name: "UPE 330", family: "UPE", h: 330, b: 105, tw: 8.5,  tf: 15.0, r: 17, A: 60.5,  Iy: 9910,    Iz: 620,    Wy: 600,    Wz: 76.5,   iy: 12.79, iz: 3.20,  mass: 47.5 },
  { name: "UPE 360", family: "UPE", h: 360, b: 110, tw: 9.0,  tf: 15.5, r: 18, A: 67.2,  Iy: 13060,   Iz: 738,    Wy: 726,    Wz: 86.8,   iy: 13.94, iz: 3.31,  mass: 52.7 },
  { name: "UPE 400", family: "UPE", h: 400, b: 115, tw: 9.5,  tf: 16.5, r: 18, A: 76.3,  Iy: 18140,   Iz: 895,    Wy: 907,    Wz: 100,    iy: 15.42, iz: 3.43,  mass: 59.9 },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const PROFILE_FAMILIES: ProfileFamily[] = ["IPE", "HEA", "HEB", "HEM", "UPN", "UPE"];

export const ALL_PROFILES: SteelProfile[] = [
  ...IPE,
  ...HEA,
  ...HEB,
  ...HEM,
  ...UPN,
  ...UPE,
];

export function getProfilesByFamily(family: ProfileFamily): SteelProfile[] {
  switch (family) {
    case "IPE": return IPE;
    case "HEA": return HEA;
    case "HEB": return HEB;
    case "HEM": return HEM;
    case "UPN": return UPN;
    case "UPE": return UPE;
  }
}

/** Column definitions for the profile table — used by the UI */
export const PROFILE_COLUMNS = [
  { key: "name",  label: "Profile",      unit: "",     width: "w-28" },
  { key: "h",     label: "h",            unit: "mm",   width: "w-16" },
  { key: "b",     label: "b",            unit: "mm",   width: "w-16" },
  { key: "tw",    label: "tw",           unit: "mm",   width: "w-16" },
  { key: "tf",    label: "tf",           unit: "mm",   width: "w-16" },
  { key: "r",     label: "r",            unit: "mm",   width: "w-14" },
  { key: "A",     label: "A",            unit: "cm²",  width: "w-16" },
  { key: "Iy",    label: "Iy",           unit: "cm⁴",  width: "w-20" },
  { key: "Iz",    label: "Iz",           unit: "cm⁴",  width: "w-20" },
  { key: "Wy",    label: "Wy",           unit: "cm³",  width: "w-18" },
  { key: "Wz",    label: "Wz",           unit: "cm³",  width: "w-18" },
  { key: "iy",    label: "iy",           unit: "cm",   width: "w-16" },
  { key: "iz",    label: "iz",           unit: "cm",   width: "w-16" },
  { key: "mass",  label: "Mass",         unit: "kg/m", width: "w-18" },
] as const;

export type ProfileColumnKey = (typeof PROFILE_COLUMNS)[number]["key"];
