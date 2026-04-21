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

In this codebase, the route base is currently defined in `src/pqs/loadCatalog.ts` as `PQS_ROUTE_RUN_BASE`.

