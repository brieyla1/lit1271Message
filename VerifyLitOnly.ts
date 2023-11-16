const userAddress = '0xB0A2A03c55580EA55D6c9F6db0e79e218F21d179';
const messageString =
  'localhost wants you to sign in with your Ethereum account:\n0xB0A2A03c55580EA55D6c9F6db0e79e218F21d179\n\nThis is a test statement. You can put anything you want here.\n\nURI: https://localhost/\nVersion: 1\nChain ID: 80001\nNonce: XAcFUQ2dmqTJd61mc\nIssued At: 2023-11-16T13:12:50.596Z';
const hash = hashMessage(messageString); // 0xd2539fa8e1f0c0a56c699d678f4c57ccaa71dff360e9f0e745749019f7e18ade
const signature =
  '0x1cead0e6619939c2fdc9b95e0cc393ac490d53947bf9ca0d7e20c205886facae2ee54957d65a28c2efddbbaf20b414b7ff64cbe267d3da51d0f4ce2f5ed0c9d81b';
const chain = 'mumbai';

let authSig = {
  sig: signature,
  derivedVia: 'EIP1271',
  signedMessage: messageString,
  address: userAddress,
};

import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { hashMessage } from 'viem';

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
    chain: 'mumbai',
  })
  .catch((e) => console.log(e));
