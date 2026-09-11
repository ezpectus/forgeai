import { VercelDeployer } from './vercel'

/**
 * The deployer list is the single source of truth — API routes build their
 * lookup maps from this array, so adding a deployer is one import + one entry.
 */
export const deployers = [VercelDeployer]
