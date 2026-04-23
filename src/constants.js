// Real physical constants and orbital parameters
// All units: meters, seconds, kilograms

export const G = 6.674e-11; // Gravitational constant (m^3 kg^-1 s^-2)

// Celestial body data
export const SUN_MASS = 1.989e30;

export const EARTH_MASS = 5.972e24;
export const EARTH_RADIUS = 6.371e6; // meters
export const EARTH_ORBIT_RADIUS = 1.496e11; // ~1 AU
export const EARTH_ORBITAL_SPEED = 29780; // m/s

export const MOON_MASS = 7.342e22;
export const MOON_RADIUS = 1.737e6;
export const MOON_ORBIT_RADIUS = 3.844e8; // from Earth
export const MOON_ORBITAL_SPEED = 1022; // m/s around Earth

export const MARS_MASS = 6.417e23;
export const MARS_RADIUS = 3.3895e6;
export const MARS_ORBIT_RADIUS = 2.279e11; // from Sun
export const MARS_ORBITAL_SPEED = 24077; // m/s

// Spacecraft
export const SPACECRAFT_MASS = 5000; // kg (approximate)

// Simulation scale: 1 unit = SCALE_FACTOR meters
// We scale so Earth orbit radius ~ 100 units in 3D
export const SCALE_FACTOR = EARTH_ORBIT_RADIUS / 100;

// Time constants
export const SECONDS_PER_DAY = 86400;
export const EARTH_ORBITAL_PERIOD = 365.25 * SECONDS_PER_DAY;
export const MARS_ORBITAL_PERIOD = 687 * SECONDS_PER_DAY;
export const MOON_ORBITAL_PERIOD = 27.32 * SECONDS_PER_DAY;

// Visual scale multipliers (bodies would be invisible at true scale)
export const BODY_VISUAL_SCALE = 800;
export const MOON_VISUAL_SCALE = 2000;
export const SPACECRAFT_VISUAL_SCALE = 2000;

// Mars approach threshold for "success" (in meters)
export const MARS_SUCCESS_DISTANCE = MARS_RADIUS * 10; // within 10 Mars radii

// Launch speed range (m/s) - typical Earth escape velocity ~11,200 m/s
export const MIN_LAUNCH_SPEED = 8000;
export const MAX_LAUNCH_SPEED = 40000;
export const DEFAULT_LAUNCH_SPEED = 15000;

// Launch angle range (degrees)
export const MIN_LAUNCH_ANGLE = 0;
export const MAX_LAUNCH_ANGLE = 360;
export const DEFAULT_LAUNCH_ANGLE = 45;

// Simulation
export const MAX_SIM_TIME = 400 * SECONDS_PER_DAY; // 400 days max
export const PHYSICS_DT = 60; // 60 seconds per physics step
