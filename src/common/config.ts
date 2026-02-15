import { type ConfigInstance, config } from '@map-colonies/config';
import { vectorExternalToOsmTagMappingV1, type vectorExternalToOsmTagMappingV1Type } from '@map-colonies/schemas';

// Choose here the type of the config instance and import this type from the entire application
type ConfigType = ConfigInstance<vectorExternalToOsmTagMappingV1Type>;
type RedisConfig = vectorExternalToOsmTagMappingV1Type['redis'];

let configInstance: ConfigType | undefined;

/**
 * Initializes the configuration by fetching it from the server.
 * This should only be called from the instrumentation file.
 * @returns A Promise that resolves when the configuration is successfully initialized.
 */
async function initConfig(offlineMode?: boolean): Promise<void> {
  configInstance = await config({
    schema: vectorExternalToOsmTagMappingV1,
    offlineMode,
  });
}

function getConfig(): ConfigType {
  if (!configInstance) {
    throw new Error('config not initialized');
  }
  return configInstance;
}

export { getConfig, initConfig };
export type { ConfigType, RedisConfig };
