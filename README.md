# external-to-osm-tag-mapping

----------------------------------

![badge-alerts-lgtm](https://img.shields.io/lgtm/alerts/github/MapColonies/external-to-osm-tag-mapping?style=for-the-badge)

![grade-badge-lgtm](https://img.shields.io/lgtm/grade/javascript/github/MapColonies/external-to-osm-tag-mapping?style=for-the-badge)

![snyk](https://img.shields.io/snyk/vulnerabilities/github/MapColonies/external-to-osm-tag-mapping?style=for-the-badge)

----------------------------------

This is a RESTful service responssible for mapping between the external source feature metadata to our MapColonies tags schema.

## API
Checkout the OpenAPI spec [here](/openapi3.yaml)

## Installation

Install deps with npm

```bash
npm install
```

## Run Locally

Clone the project

```bash

git clone https://github.com/MapColonies/external-to-osm-tag-mapping.git

```

Go to the project directory

```bash

cd external-to-osm-tag-mapping

```

Install dependencies

```bash

npm install

```

Start the server

```bash

npm run start

```

## Running Tests

To run tests, run the following command

```bash

npm run test

```

To only run unit tests:
```bash
npm run test:unit
```

To only run integration tests:
```bash
npm run test:integration
```
