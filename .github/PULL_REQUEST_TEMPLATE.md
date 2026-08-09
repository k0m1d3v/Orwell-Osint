## Summary

<!-- What does this PR do, and why? Link any related issue. -->

## Type of change

- [ ] Bug fix
- [ ] New plugin
- [ ] Change to a plugin (existing behavior/output)
- [ ] Core change (`core/`, CLI, build/CI)
- [ ] Docs only

## Breaking changes

- [ ] This PR changes an existing plugin's output shape, a manifest field
      meaning, or the core plugin contract
- If checked, describe what breaks and for whom:

## Checklist

- [ ] `npm test` passes locally
- [ ] `npm run lint` passes locally
- [ ] If this touches a plugin: `plugin.json` is valid (all required
      fields present, `id` matches the folder name, `sensitiveData`/
      `requiresConsent` accurately reflect what the plugin does)
- [ ] If this is a new plugin: it has a `README.md` documenting input,
      output shape, and known limitations (see
      [docs/PLUGIN_DEVELOPMENT.md](../docs/PLUGIN_DEVELOPMENT.md))
- [ ] If this is a new plugin with `sensitiveData: true`: I understand
      this will be merged only after direct maintainer review (see
      [CONTRIBUTING.md](../CONTRIBUTING.md))
