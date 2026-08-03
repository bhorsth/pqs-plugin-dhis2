## Overview

This plugin loads the WHO PQS catalogue JSON and (optionally) downloads device images. Since browsers often block cross-origin requests, the recommended approach is using **DHIS2 Route Manager** to proxy the upstream WHO host.

## Route Manager (single route)

The plugin is designed to use **one** Route Manager route for both:

- Catalogue JSON
- Device images (by proxying `main_image` URL pathnames)

### Wildcard route requirement

To allow sub-path passthrough, the Route Manager destination URL must end with `/**` (double-asterisk). If you use `/*` the `/run/<subpath>` calls will fail with a DHIS2 error like:

`Route '<id>' does not allow sub-paths`

### Example route

- **URL**: `https://extranet.who.int/**`
- **Run base**: `/api/42/routes/S1CxnuYJebB/run`

### Effective proxy URLs

- **Catalogue**:
  - `/api/42/routes/S1CxnuYJebB/run/prequal/sites/default/files/immunization_devices/json/catalogs/immunization_devices_catalogue.json`
- **Images**:
  - `/api/42/routes/S1CxnuYJebB/run/<image-pathname>`

## Plugin-side settings

The plugin is designed to be deployed to multiple DHIS2 instances without rebuilding.

### Runtime configuration (DHIS2 DataStore)

The plugin reads runtime configuration from:

- `dataStoreNamespace`: `pqsPlugin`
- `dataStoreKey`: `config`

If the key does not exist, the plugin will create a default object so admins can edit it.

#### Minimum required keys

- `routeCode`: Route Manager route `code` (preferred) or `name`

#### Recommended keys

- `fieldIds`: mapping from semantic keys to **tracked entity attribute UIDs** (recommended) or Capture `fieldId`s.
  - This removes any dependency on instance-specific aliases (the old hard-coded defaults).
  - Use **tracked entity attribute UIDs** whenever possible.

##### Field mapping

The full mapping is defined in `src/pqs/pqsFieldMapping.ts` from the OpenFn PQS catalogue
attribute mapping reference. Each entry has:

- `key`: the plugin/DataStore mapping key.
- `fieldId`: the default Capture `fieldId` / `IdFromPlugin`.
- `sourcePath`: the PQS catalogue JSON source path.

Set keys in `pqsPlugin/config.fieldIds` only when your Capture `IdFromPlugin` values differ
from the defaults in `pqsFieldMapping.ts`.

Example (shape only):

```json
{
  "routeCode": "pqsCatalogue",
  "apiVersionStrategy": "fixed",
  "apiVersion": 42,
  "catalogPath": "/prequal/sites/default/files/immunization_devices/json/catalogs/immunization_devices_catalogue.json",
  "enableImages": true,
  "fieldIds": {
    "detailsImdPqsCode": "detailsImdPqsCode",
    "detailsManufacturer": "detailsManufacturer",
    "energySource": "energySource",
    "mainImage": "mainImage"
  }
}
```

