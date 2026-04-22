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

##### UID mapping (formerly hard-coded)

Set these keys in `pqsPlugin/config.fieldIds` to the **attribute UID** for each field in your Tracker program:

- `pqsCode`: PQS code
- `pqsCategory`: PQS category
- `typeOfAppliance`: Type of appliance
- `company`: Company
- `manufacturedIn`: Manufactured in
- `manufacturersReference`: Manufacturer's reference
- `energySource`: Energy source
- `vaccineStorageCapacityL`: Vaccine storage capacity (litres)
- `vaccineGrossVolumeL`: Vaccine gross volume (litres)
- `freezerGrossVolumeL`: Freezer gross volume (litres)
- `applianceImage`: Appliance image (if you use an IMAGE attribute)

Example (shape only; fill in your own UIDs):

```json
{
  "routeCode": "pqsCatalogue",
  "apiVersionStrategy": "fixed",
  "apiVersion": 42,
  "catalogPath": "/prequal/sites/default/files/immunization_devices/json/catalogs/immunization_devices_catalogue.json",
  "enableImages": true,
  "fieldIds": {
    "pqsCode": "<TEA_UID>",
    "pqsCategory": "<TEA_UID>",
    "typeOfAppliance": "<TEA_UID>",
    "company": "<TEA_UID>",
    "manufacturedIn": "<TEA_UID>",
    "manufacturersReference": "<TEA_UID>",
    "energySource": "<TEA_UID>",
    "vaccineStorageCapacityL": "<TEA_UID>",
    "vaccineGrossVolumeL": "<TEA_UID>",
    "freezerGrossVolumeL": "<TEA_UID>",
    "applianceImage": "<TEA_UID>"
  }
}
```

