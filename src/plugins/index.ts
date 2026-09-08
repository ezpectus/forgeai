import { registry } from './registry'
import { registerProviders } from './providers'
import { registerDeployers } from './deployers'
import type { AIProvider, Deployer } from '@/types'

export function initPlugins() {
  registerProviders()
  registerDeployers()
}

export function getProvider(name: string): AIProvider | undefined {
  return registry.getProvider(name)
}

export function getDeployer(name: string): Deployer | undefined {
  return registry.getDeployer(name)
}

export function getAllProviders(): AIProvider[] {
  return registry.getAllProviders()
}

export function getAllDeployers(): Deployer[] {
  return registry.getAllDeployers()
}
