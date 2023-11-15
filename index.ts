import { SiweMessage } from 'siwe';
import { keccak256, toBytes } from 'viem';

const user = {
  baseProvider: 'test',
  userId: 'test:elonmusk', // <- Patchwallet default account is "test:elonmusk"
  patchId: '',
  salt: '',
  address: '',
};
user.patchId = `${user.baseProvider}:${user.userId}`;
user.salt = keccak256(toBytes(user.patchId + `:kernel-account`));

const PATCHWALLET_PUBLIC_CLIENT_SECRET = 'k^yf57yg27MKo2SnuzwX';
const PATCHWALLET_PUBLIC_CLIENT_ID = 'demo-user-external';

const chain = 'mumbai';
const chainId = 80001;

const access_token = (
  (await (
    await fetch(`https://paymagicapi.com/v1/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: PATCHWALLET_PUBLIC_CLIENT_ID,
        client_secret: PATCHWALLET_PUBLIC_CLIENT_SECRET,
      }),
    })
  ).json()) as any
).access_token;

user.address = (
  (await (
    await fetch(`https://paymagicapi.com/v1/resolver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        userIds: user.patchId,
      }),
    })
  ).json()) as any
).users[0].accountAddress;

// -------------------- SIGNATURE ------------------------

const preparedMessage: Partial<SiweMessage> = {
  domain: 'localhost',
  uri: 'https://localhost/',
  address: user.address,
  version: '1',
  chainId,
  statement: 'This is a test statement. You can put anything you want here.',
  // expirationTime: 100000000000000000, // never expires
};

const message = new SiweMessage(preparedMessage);
const messageString = message.prepareMessage();

const body = JSON.stringify({
  userId: user.baseProvider + ':' + user.userId,
  string: messageString,
});

const result = await fetch(`https://paymagicapi.com/v1/kernel/sign`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${access_token}`,
  },
  body,
  redirect: 'follow',
});

const signature: { signature: string; hash: string; type: string } = (await result.json()) as any;

let authSig = {
  sig: signature.signature,
  derivedVia: 'EIP1271',
  signedMessage: messageString,
  address: user.address,
};

import * as LitJsSdk from '@lit-protocol/lit-node-client';

const client = new LitJsSdk.LitNodeClient({
  litNetwork: 'serrano',

  // only on client
  alertWhenUnauthorized: false,
  debug: false,
});

await client.connect();

const { encryptedString, symmetricKey } = await LitJsSdk.encryptString('This is a test string');

const getAccessControlConditions = (chain: string) => {
  // Checks if the user has at least 0 ETH
  return [
    {
      contractAddress: '',
      standardContractType: '',
      chain,
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        comparator: '>=',
        value: '0',
      },
    },
  ];
};

// this will Fail.
const encryptedSymmetricKey = await client
  .saveEncryptionKey({
    accessControlConditions: getAccessControlConditions(chain),
    symmetricKey,
    authSig,
    chain: chain,
  })
  .catch((e) => console.log(e));