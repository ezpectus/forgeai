import { VercelDeployer } from './vercel'
import { E2BDeployer } from './e2b'
import { registry } from '../registry'

export const deployers = [VercelDeployer, E2BDeployer]

export function registerDeployers() {
  registry.registerDeployer('vercel', VercelDeployer)
  registry.registerDeployer('e2b', E2BDeployer)
}
