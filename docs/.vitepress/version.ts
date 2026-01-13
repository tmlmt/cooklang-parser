import pkg from "../../package.json";

const version = pkg.version;

/** Full version string with 'v' prefix, e.g., "v2.1.7" or "v3.0.0-alpha.1" */
export const fullVersion = `v${version}`;

/** Major version with 'v' prefix, e.g., "v2" or "v3" */
export const majorVersion = `v${version.split(".")[0]}`;

/** Major version number, e.g., 2 or 3 */
export const majorNumber = parseInt(version.split(".")[0], 10);

/** True if this is a prerelease version (contains a hyphen, e.g., "3.0.0-alpha.1") */
export const isPrerelease = version.includes("-");
