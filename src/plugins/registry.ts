import type { AIProvider, Deployer } from '@/types'

class PluginRegistry {
  providers = new Map<string, AIProvider>()
  deployers = new Map<string, Deployer>()

  registerProvider(name: string, provider: AIProvider) {
    this.providers.set(name, provider)
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  registerDeployer(name: string, deployer: Deployer) {
    this.deployers.set(name, deployer)
  }

  getDeployer(name: string): Deployer | undefined {
    return this.deployers.get(name)
  }

  getAllDeployers(): Deployer[] {
    return Array.from(this.deployers.values())
  }
}

export const registry = new PluginRegistry()
