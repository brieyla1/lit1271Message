import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { SiweMessage } from 'siwe';
import { Address, createPublicClient, getContract, http, keccak256, toBytes, toHex } from 'viem';
import { polygonMumbai } from 'viem/chains';
import { abi, getAccessControlConditions } from './helpers';
import { ethers } from 'ethers';

const user = {
  baseProvider: 'test',
  userId: 'elonmusk', // <- Patchwallet default account is "test:elonmusk"
  patchId: '',
  salt: '',
  address: '',
};
user.patchId = `${user.baseProvider}:${user.userId}`;
user.salt = keccak256(toBytes(user.patchId + `:kernel-account`));

const PATCHWALLET_PUBLIC_CLIENT_SECRET = 'k^yf57yg27MKo2SnuzwX';
const PATCHWALLET_PUBLIC_CLIENT_ID = 'demo-user-external';

const chain = 'mumbai';
const publicClient = createPublicClient({
  transport: http(),
  chain: polygonMumbai,
});

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

const requestParamsPatch: Partial<FetchRequestInit> = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${access_token}`,
  },
  redirect: 'follow',
};

// -------------------- SIGNATURE ------------------------

const client = new LitJsSdk.LitNodeClient({
  litNetwork: 'serrano',

  // only on client
  alertWhenUnauthorized: false,
  debug: false,
});

const { encryptedString, symmetricKey } = await LitJsSdk.encryptString('This is a test string');

await client.connect();

const siwe = new SiweMessage({
  domain: 'localhost:3000',
  uri: 'https://localhost:3000/',
  address: user.address,
  version: '1',
  chainId: 1,
  statement: 'This is a test statement. You can put anything you want here.',
  issuedAt: new Date('2023-11-16T13:00:00.000Z').toISOString(),
  expirationTime: new Date('2023-12-16T13:00:00.000Z').toISOString(),
});

// Message to be signed
const messageString = siwe.prepareMessage();

// From rust code
const hexMessage = toBytes(toHex(toBytes(messageString)).slice(2).toLowerCase());
const hashBytes = keccak256(hexMessage);

// Same implementation using ethers
const hexMessageUsingEthers = ethers.utils.toUtf8Bytes(ethers.utils.hexlify(ethers.utils.toUtf8Bytes(messageString)).substring(2).toLowerCase());
const hashBytesUsingEthers = ethers.utils.keccak256(hexMessageUsingEthers);

// outputs: true
console.log('Is ethers the same: ' + (hashBytes === hashBytesUsingEthers && JSON.stringify(hexMessage) === JSON.stringify(hexMessageUsingEthers)));

// getting the signature from patch
const body = JSON.stringify({ userId: user.patchId, hash: hashBytes });
const result = (await fetch(`https://paymagicapi.com/v1/kernel/sign`, { ...requestParamsPatch, body })) as any;
const signature: { signature: `0x${string}`; hash: `0x${string}` } = await result.json();

const encryptedSymmetricKey = await client
  .saveEncryptionKey({
    accessControlConditions: getAccessControlConditions(chain),
    symmetricKey,
    authSig: {
      sig: signature.signature,
      derivedVia: 'EIP1271',
      signedMessage: messageString,
      address: user.address.toLowerCase(),
    },
    chain: 'mumbai',
  })
  // 401 Validation error: Authsig failed for contract 0xB0A2A03c55580EA55D6c9F6db0e79e218F21d179
  .catch((e) => console.log(e));

const onChainVerify = await getContract({
  abi,
  address: user.address as Address,
  publicClient,
}).read.isValidSignature([hashBytes, signature.signature]);

// returns: true ---> ERC1271_SUCCESS = "0x1626ba7e";
console.log('Is Signature Valid from contract: ' + (onChainVerify === '0x1626ba7e'));
