export const abi = [
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
];

export const getAccessControlConditions = (chain: string) => {
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
