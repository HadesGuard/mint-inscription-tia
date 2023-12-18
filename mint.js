import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import readline from 'readline';
import fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const readUserInputs = () => {
  try {
    const data = fs.readFileSync('user_inputs.txt', 'utf-8');
    const lines = data.trim().split('\n');
    const inputs = {};

    for (const line of lines) {
      const [key, value] = line.split(':').map((item) => item.trim());
      inputs[key] = value;
    }

    return inputs;
  } catch (error) {
    return {};
  }
};

const getRecoveryPhrase = () => new Promise((resolve) => {
  rl.question(`Enter your recovery phrase (${defaultValues.recoveryPhrase}): `, (answer) => {
    resolve(answer.trim() || defaultValues.recoveryPhrase);
  });
});

const getGasAndFee = () => new Promise((resolve) => {
  rl.question(`Enter gas amount (default is ${defaultValues.gas}): `, (gasAnswer) => {
    rl.question(`Enter fee amount (default is ${defaultValues.fee}): `, (feeAnswer) => {
      const gas = gasAnswer.trim() !== '' ? parseInt(gasAnswer.trim()) : defaultValues.gas;
      const fee = feeAnswer.trim() !== '' ? feeAnswer.trim() : defaultValues.fee;
      resolve({ gas, fee });
    });
  });
});

const getTotalTransactions = () => new Promise((resolve) => {
  rl.question(`Enter the total number of transactions (default is ${defaultValues.totalTransactions}): `, (answer) => {
    const totalTransactions = answer.trim() !== '' ? parseInt(answer.trim()) : defaultValues.totalTransactions;
    resolve(totalTransactions);
  });
});

const saveUserInputs = (recoveryPhrase, gas, fee, totalTransactions) => {
  const data = `Recovery Phrase: ${recoveryPhrase}\nGas: ${gas}\nFee: ${fee}\nTotal Transactions: ${totalTransactions}\n`;
  fs.writeFileSync('user_inputs.txt', data);
};

const defaultValues = {
  recoveryPhrase: '',
  gas: 100000,
  fee: '200',
  totalTransactions: 50,
};

const MEMO = "ZGF0YToseyJvcCI6Im1pbnQiLCJhbXQiOjEwMDAwLCJ0aWNrIjoiY2lhcyIsInAiOiJjaWEtMjAifQ==";
const RPC = "https://rpc.lunaroasis.net/";

const prepareAccount = async (recoveryPhrase) => {
  return DirectSecp256k1HdWallet.fromMnemonic(recoveryPhrase, {
    prefix: "celestia",
  });
};

const mintTokens = async (client, senderAddress, recipientAddress, amount, gas, fee) => {
  const result = await client.sendTokens(
    senderAddress,
    recipientAddress,
    [{ denom: "utia", amount: amount }],
    {
      amount: [{ denom: "utia", amount: fee }],
      gas: gas.toString(),
    },
    MEMO
  );

  return result.transactionHash;
};

const mint = async () => {
  const inputs = readUserInputs();
  defaultValues.recoveryPhrase = inputs['Recovery Phrase'] || '';
  defaultValues.gas = parseInt(inputs['Gas']) || 100000;
  defaultValues.fee = inputs['Fee'] || '200';
  defaultValues.totalTransactions = parseInt(inputs['Total Transactions']) || 50;

  const recoveryPhrase = await getRecoveryPhrase();
  const { gas, fee } = await getGasAndFee();
  const totalTransactions = await getTotalTransactions();

  saveUserInputs(recoveryPhrase, gas, fee, totalTransactions);

  const myWallet = await prepareAccount(recoveryPhrase);
  const myPubkey = (await myWallet.getAccounts())[0].address;

  const signingClient = await SigningStargateClient.connectWithSigner(
    RPC,
    myWallet
  );

  for (let i = 0; i < totalTransactions; i++) {
    const result = await mintTokens(
      signingClient,
      myPubkey,
      myPubkey,
      "100",
      gas,
      fee
    );

    console.log(
      `${i + 1}. Explorer: https://www.mintscan.io/celestia/tx/${result}`
    );
  }

  rl.close();
};

mint();
