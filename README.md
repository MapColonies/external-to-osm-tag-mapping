# external-to-osm-tag-mapping

![badge-alerts-lgtm](https://img.shields.io/lgtm/alerts/github/MapColonies/external-to-osm-tag-mapping?style=for-the-badge)
![grade-badge-lgtm](https://img.shields.io/lgtm/grade/javascript/github/MapColonies/external-to-osm-tag-mapping?style=for-the-badge)
![snyk](https://img.shields.io/snyk/vulnerabilities/github/MapColonies/external-to-osm-tag-mapping?style=for-the-badge)

---

external-to-osm-tag-mapping is a RESTful service responsible for mapping between the external source feature metadata to our own MapColonies tags schema.

## Schema

A schema defines the means by which an object is mapped to a new represntation. The new object will retain its properties and will append new properties (key-value pairs) defined by the mapping.

### Schema Definition

A schema defintion contains several ways to map existing properties to the appended properties as well as to manipulate their values.

required:
* `name` schema name
* `enableExternalFetch` boolean whether to fetch mappings from external source
* `createdAt` timestamp when the schema was created (currently unused)
* `addSchemaPrefix` boolean whether to append schema's `name` to the property
* `explodeKeys` list of keys to explode by with a combination of an object's value to append a set of new properties. e.g. an `explodeKeys` of ['explode1'] with incoming {"explode1": "val1"} object, with a mapping of "explode1:val1" --> {"key1":"newval1"} will append the mapped value to object's new representation

optional:
* *`updatedAt`* timestamp when the schema was updated (currently unused)
* *`ignoreKeys`* list of keys to ignore when mapping
* *`renameKeys`* an object with keys to match the original keys and their values as their new keys

:information_source: Note: current implementation uses Redis as the external source for tag mappings.

## API

See the [OpenAPI specification](/openapi3.yaml).

## Configuration

To load schemas you need to set a provider.
To set a provider use the `SCHEMA_PROVIDER` environment variable.

### File provider

This provider loads schemas from a JSON file.
To select this provider set environment variable  `SCHEMA_PROVIDER` to `file`.
To configure the schema file location set the `SCHEMA_FILE_PATH` environment variable.
Check [schemas.json](/schemas.json) for some examples of schema definitions.

## Installation and Usage

### Local

```bash
git clone https://github.com/MapColonies/external-to-osm-tag-mapping.git
cd external-to-osm-tag-mapping
npm install
npm run start
```

### Helm

Clone the repo then build an image and push it to your container registry. Update `values.yaml` with values relevant for your release then deploy release with this command

```bash
cd helm
helm install external-to-osm-tag-mapping -f values.yaml .
```

## Running Tests

```bash
npm run test
```