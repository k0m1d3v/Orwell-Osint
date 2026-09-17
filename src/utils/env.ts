// Mirrors core/config-manager.js's envKeyFor() exactly — kept in sync by
// hand since the UI has no way to import Node-only backend code.
export function envKeyFor(pluginId: string): string {
  return `ORWELL_${pluginId.toUpperCase().replace(/-/g, '_')}_API_KEY`;
}
