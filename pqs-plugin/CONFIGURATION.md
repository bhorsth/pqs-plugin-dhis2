## Overview

This plugin is designed to be deployed across multiple DHIS2 instances without code changes.
To do that, DHIS2-instance-specific artifacts (Route Manager route UID, and Capture field mapping)
are supplied via **Tracker Plugin Configurator**.

The plugin supports a **hybrid mapping** strategy:

- **Preferred**: explicit field mapping (IdFromPlugin aliases) provided in configuration.
- **Fallback**: attempt auto-mapping using `fieldsMetadata` (best-effort). If mappings are still missing, the plugin shows a clear error message in the UI listing what to configure.

## 1) Configure Route Manager (catalog + image proxy)

The plugin expects to load the WHO PQS catalogue JSON and (optionally) download images. Since browsers often block cross-origin requests, the recommended approach is using **DHIS2 Route Manager** to proxy the catalogue and image paths.

- Create a Route Manager route that proxies the WHO base URL.
- Note the **route UID** and the **API version** used by your DHIS2 instance (default expected is `42`).

## 2) Configure the plugin in Tracker Plugin Configurator

Add the plugin to your Capture form and provide a configuration object under the plugin settings (the exact UI varies by DHIS2 version).

### Configuration schema

```json
{
  "routeManager": { "apiVersion": 43, "routeId": "XwxOd6AJzBZ" },
  "catalogPath": "/prequal/sites/default/files/immunization_devices/json/catalogs/immunization_devices_catalogue.json",
  "catalogBucketKey": "e003",
  "enableImageUpload": true,
  "debugLogging": false,
  "fieldAliases": {
    "pqsCode": "pqsCODE",
    "pqsCategory": "pqsCAT",
    "typeOfAppliance": "typeofAPP",
    "company": "company",
    "manufacturedIn": "manufIN",
    "manufacturersReference": "manufREF",
    "energySource": "energySOURCE",
    "vaccineStorageCapacityL": "storageCAP",
    "vaccineGrossVolumeL": "vaccGROSSV",
    "freezerGrossVolumeL": "freezGROSSV",
    "applianceImage": "imageURL"
  }
}
```

### Notes

- **`fieldAliases`** values must match **IdFromPlugin** values in the field mapping table.
- The DHIS2 tracked entity attribute IDs (IdFromApp) are configured in the field mapping table; the plugin never needs those UIDs in code.
- If `catalogUrl` is set, it will be used as-is. Otherwise the plugin uses:
  - `routeManager` + `catalogPath` to build a same-origin URL like `/api/{v}/routes/{routeId}/run{catalogPath}`.

## 3) Auto-mapping behavior (fallback)

If some `fieldAliases` entries are missing, the plugin tries to infer them using `fieldsMetadata` (name/formName/shortName and type for IMAGE fields).
This is only a convenience for partial configuration; for consistent cross-instance deployments, configure all fields explicitly.

