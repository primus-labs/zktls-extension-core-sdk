# zktls-extension-core-sdk
Primus zktls algorithm sdk for extension.

## Overview

The Extension Core SDK allows you to verify data through **web endpoint responses**. An authorized token is required to request private data.

To integrate, **create a project** in the [Primus Develop Hub](https://dev.primuslabs.xyz/) to obtain a paired appID and appSecret. Then, configure these credentials in your project to utilize the Extension Core SDK.

Primus Extension Core SDK supports two models: the [Proxy TLS model](https://docs.primuslabs.xyz/data-verification/tech-intro#proxy-model) and the [MPC TLS model](https://docs.primuslabs.xyz/data-verification/tech-intro#mpc-model). You can specify the desired model by setting the "algorithmType" parameter during SDK integration.

For more details on setting up your project, refer to the [Developer Hub](https://docs.primuslabs.xyz/data-verification/developer-hub).

## How it Works

Here's a simplified flow of how the Primus Extension Core SDK works on your project:

**1. Create Project:** Create a project on the [Primus Developer Hub](https://dev.primuslabs.xyz/) to obtain a paired appID and appSecret, then configure them in your project.

**2. Configure Verification Parameters:** Ensure that two key parameters, including the request parameters and response data paths, are configured correctly. Refer to the [simple example](https://docs.primuslabs.xyz/data-verification/core-sdk/simpleexample) for guidance.

**3. Execute zkTLS Protocol:** Invoke the zkTLS protocol to initiate the data verification process.

**4. Verify Data Verification Result:** Your Extension retrieves the verification result from the Extension Core SDK and validates Primus' signature to ensure trustworthiness.

**5. Execute Business Logic:** Based on the verification result, your Extension executes the relevant business logic, such as submitting the proof on-chain or triggering other operations.

## Demo

This is a [Extension demo](https://github.com/primus-labs/zktls-demo/tree/main/extension-core-sdk-example) we developed using Primus Extension Core SDK.

## Installation

### Installation Steps

Open your terminal and navigate to your project directory. Then run one of the following commands:

- Using npm:

```text
npm install --save @primuslabs/zktls-ext-core-sdk
```

- Using yarn:

```text
yarn add --save @primuslabs/zktls-ext-core-sdk
```

### Importing the SDK

After installation, you can import the SDK in your JavaScript or TypeScript files. Here's how:

```javascript
const { PrimusExtCoreTLS } = require("@primuslabs/zktls-ext-core-sdk");
```

## Extension Config

Because our algorithm wasm library and wasm js encapsulation use SharedArrayBuffer, it must be run in the [extension offscreen html](https://developer.chrome.com/docs/extensions/reference/api/offscreen).

### webpack.config.js

When the extension is compiled, copy the 4 files directly to the extension build directory. `webpack.config.js` needs to add the following configuration. You can refer to [demo webpack.config.js](https://github.com/primus-labs/zktls-demo/blob/main/extension-core-sdk-example/webpack.config.js).

```javascript
new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/@primuslabs/zktls-ext-core-sdk/dist/algorithm/client_plugin.wasm',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/@primuslabs/zktls-ext-core-sdk/dist/algorithm/client_plugin.worker.js',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/@primuslabs/zktls-ext-core-sdk/dist/algorithm/client_plugin.js',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/@primuslabs/zktls-ext-core-sdk/dist/algorithm/primus_zk.js',
          to: path.join(__dirname, 'build'),
          force: true,
        },
      ],
    }),
```

### offscreen html

You need to import two js files in your offscreen html.

```html
<html>
  ......
  <script src="primus_zk.js"></script>
  <script src="client_plugin.js"></script>
  ......
</html>
```

### extension manifest.json

The extension manifest.json file may add the following configuration:

```json
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  },
  "permissions": [
    "offscreen"
  ],
```

## Test Example

The appSecret from Primus Developer Hub needs to sign the proof request parameters. For security reasons, appSecret cannot be configured on the extension side. The Test Example configures appSecret in the extension code to better illustrate the process.

This Test Example guide will walk you through the fundamental steps to integrate Primus's zkTLS Extension Core SDK and complete a basic data verification process through your Extension. You can learn about the integration process through this simple [demo](https://github.com/primus-labs/zktls-demo/blob/main/extension-core-sdk-example/src/pages/Background/index.js).

### Implementation

```javascript
const { PrimusExtCoreTLS } = require("@primuslabs/zktls-ext-core-sdk");

async function primusProofTest() {
    // Initialize parameters, the init function is recommended to be called when the program is initialized.
    const appId = "PRIMUS_APP_ID";
    const appSecret= "PRIMUS_APP_SECRET";
    const zkTLS = new PrimusExtCoreTLS();
    const initResult = await zkTLS.init(appId, appSecret);
    console.log("primusProof initResult=", initResult);

    // Set request and responseResolves.
    const request ={
        url: "YOUR_CUSTOM_URL", // Request endpoint.
        method: "REQUEST_METHOD", // Request method.
        header: {}, // Request headers.
        body: "" // Request body.
    };
    // The responseResolves is the response structure of the url.
    // For example the response of the url is: {"data":[{ ..."instFamily": "","instType":"SPOT",...}]}.
    const responseResolves = [
        {
            keyName: 'CUSTOM_KEY_NAME', // According to the response keyname, such as: instType.
            parsePath: 'CUSTOM_PARSE_PATH', // According to the response parsePath, such as: $.data[0].instType.
        }
    ];
    // Generate attestation request.
    const generateRequest = zkTLS.generateRequestParams(request, responseResolves);

    // Set zkTLS mode, default is proxy model. (This is optional)
    generateRequest.setAttMode({
        algorithmType: "proxytls"
    });

    // Transfer request object to string.
    const generateRequestStr = generateRequest.toJsonString();

    // Sign request.
    const signedRequestStr = await zkTLS.sign(generateRequestStr);

    // Start attestation process.
    const attestation = await zkTLS.startAttestation(signedRequestStr);
    console.log("attestation=", attestation);

    const verifyResult = zkTLS.verifyAttestation(attestation);
    console.log("verifyResult=", verifyResult);
    if (verifyResult === true) {
        // Business logic checks, such as attestation content and timestamp checks
        // do your own business logic.
    } else {
        // If failed, define your own logic.
    }
}
```

## Production Example

The Production Example and Test Example processes are the same. The difference is that the appSecret is stored on your server, and when signing the attestation request parameters, the parameters are passed to your server, which signs them and then passes them to the extension.

### zkTLS Models

We offer two modes in various user scenarios:

1. proxytls
2. mpctls

```javascript
// Set zkTLS mode, default is proxy model.
generateRequest.setAttMode({
  algorithmType: "proxytls",
});
```

### Extra Data

Developers can include custom additional parameters as auxiliary data when submitting an attestation request. These parameters will be returned alongside the proof results. For example, developers can pass the user's ID or other business-related parameters.

```javascript
// Set additionParams.
const additionParams = JSON.stringify({
  YOUR_CUSTOM_KEY: "YOUR_CUSTOM_VALUE",
  YOUR_CUSTOM_KEY2: "YOUR_CUSTOM_VALUE2",
});
generateRequest.setAdditionParams(additionParams);
```

### Extension Implementation

Extension does not require appSecret parameter to initialize SDK.

```javascript
const { PrimusExtCoreTLS } = require("@primuslabs/zktls-ext-core-sdk");

async function primusProofTest() {
    // Initialize parameters, the init function is recommended to be called when the program is initialized.
    const appId = "PRIMUS_APP_ID";
    const zkTLS = new PrimusExtCoreTLS();
    const initResult = await zkTLS.init(appId);
    console.log("primusProof initResult=", initResult);

    // Set request and responseResolves.
    const request ={
        url: "YOUR_CUSTOM_URL", // Request endpoint.
        method: "REQUEST_METHOD", // Request method.
        header: {}, // Request headers.
        body: "" // Request body.
    };
    // The responseResolves is the response structure of the url.
    // For example the response of the url is: {"data":[{ ..."instFamily": "","instType":"SPOT",...}]}.
    const responseResolves = [
        {
            keyName: 'CUSTOM_KEY_NAME', // According to the response keyname, such as: instType.
            parsePath: 'CUSTOM_PARSE_PATH', // According to the response parsePath, such as: $.data[0].instType.
        }
    ];
    // Generate attestation request.
    const generateRequest = zkTLS.generateRequestParams(request, responseResolves);

    // Set zkTLS mode, default is proxy model. (This is optional)
    generateRequest.setAttMode({
        algorithmType: "proxytls"
    });

    // Transfer request object to string.
    const generateRequestStr = generateRequest.toJsonString();

    // Get signed resopnse from backend.
    const response = await fetch(`http://YOUR_URL:PORT?YOUR_CUSTOM_PARAMETER=${generateRequestStr}`);
    const responseJson = await response.json();
    const signedRequestStr = responseJson.signResult;

    // Start attestation process.
    const attestation = await zkTLS.startAttestation(signedRequestStr);
    console.log("attestation=", attestation);

    const verifyResult = zkTLS.verifyAttestation(attestation);
    console.log("verifyResult=", verifyResult);
    if (verifyResult === true) {
        // Business logic checks, such as attestation content and timestamp checks
        // do your own business logic.
    } else {
        // If failed, define your own logic.
    }
}
```

### Server Implementation

The server is mainly responsible for obtaining the attestation parameters generated by the extension, and then using appSecret to sign the proof parameters.

```javascript
const express = require("express");
const cors = require("cors");
const { PrimusExtCoreTLS } = require("@primuslabs/zktls-ext-core-sdk");

const app = express();
const port = YOUR_PORT;

// Just for test, developers can modify it.
app.use(cors());

// Listen to the client's signature request and sign the attestation request.
app.get("/primus/sign", async (req, res) => {
  const appId = "YOUR_APPID";
  const appSecret = "YOUR_SECRET";

  // Create a PrimusZKTLS object.
  const zkTLS = new PrimusExtCoreTLS();

  // Set appId and appSecret through the initialization function.
  await zkTLS.init(appId, appSecret);

  // Sign the attestation request.
  console.log("signParams=", req.query.signParams);
  const signResult = await zkTLS.sign(req.query.signParams);
  console.log("signResult=", signResult);

  // Return signed result.
  res.json({ signResult });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
```
