// Import necessary modules
import { SiweMessage } from 'siwe';
import { Address, createPublicClient, getContract, http, keccak256, toBytes } from 'viem';

// Define user object
const user = {
  baseProvider: 'test',
  userId: 'elonmusk', // <- Patchwallet default account is "test:elonmusk"
  patchId: '',
  salt: '',
  address: '',
};

// Generate patchId and salt for the user
user.patchId = `${user.baseProvider}:${user.userId}`;
user.salt = keccak256(toBytes(user.patchId + `:kernel-account`));

// Define constants for Patchwallet public client
const PATCHWALLET_PUBLIC_CLIENT_SECRET = 'k^yf57yg27MKo2SnuzwX';
const PATCHWALLET_PUBLIC_CLIENT_ID = 'demo-user-external';

// Define chain related constants
const chainObj = polygonMumbai;
const chain = 'mumbai';
const chainId = 80001;

// Create public client
const publicClient = createPublicClient({
  transport: http(),
  chain: polygonMumbai,
});

// Fetch access token
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

// Fetch user address
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

// Prepare message for signature
const preparedMessage: Partial<SiweMessage> = {
  domain: 'localhost',
  uri: 'https://localhost/',
  address: user.address,
  version: '1',
  chainId,
  statement: 'This is a test statement. You can put anything you want here.',
};

// Create new SiweMessage and prepare it
const message = new SiweMessage(preparedMessage);
const messageString = message.prepareMessage();

// Define body for fetch request
const body = JSON.stringify({
  userId: user.baseProvider + ':' + user.userId,
  string: messageString,
});

// Fetch signature
const result = await fetch(`https://paymagicapi.com/v1/kernel/sign`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${access_token}`,
  },
  body,
  redirect: 'follow',
});

// Extract signature from result
const signature: { signature: `0x${string}`; hash: `0x${string}`; type: string } = (await result.json()) as any;

// Define authSig object
let authSig = {
  sig: signature.signature,
  derivedVia: 'EIP1271',
  signedMessage: messageString,
  address: user.address,
};

// Import necessary modules
import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { getPublicClient } from 'wagmi/actions';
import { polygonMumbai } from 'viem/chains';

// Create new LitNodeClient
const client = new LitJsSdk.LitNodeClient({
  litNetwork: 'serrano',
  alertWhenUnauthorized: false,
  debug: false,
});

// Connect client
await client.connect();

// Encrypt test string
const { encryptedString, symmetricKey } = await LitJsSdk.encryptString('This is a test string');

// Define function to get access control conditions
const getAccessControlConditions = (chain: string) => {
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

// Log user, chain, and messageString
console.log({
  user,
  chain,
  messageString,
});

// Save encryption key
const encryptedSymmetricKey = await client
  .saveEncryptionKey({
    accessControlConditions: getAccessControlConditions(chain),
    symmetricKey,
    authSig,
    chain: chain,
  })
  .catch((e) => console.log(e));

// Get wallet contract
const walletContract = getContract({
  abi: [
    {
      inputs: [
        {
          internalType: 'bytes32',
          name: 'hash',
          type: 'bytes32',
        },
        {
          internalType: 'bytes',
          name: 'signature',
          type: 'bytes',
        },
      ],
      name: 'isValidSignature',
      outputs: [
        {
          internalType: 'bytes4',
          name: 'magicValue',
          type: 'bytes4',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  ],
  address: user.address as Address,
  publicClient,
});

// Check if signature is valid (ERC1271_SUCCESS = 0x1626ba7e)
console.log(
  'Is Signature Valid from contract: ' + ((await walletContract.read.isValidSignature([signature.hash, signature.signature])) === '0x1626ba7e')
);
