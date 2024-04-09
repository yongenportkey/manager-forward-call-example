import * as dotenv from "dotenv";
dotenv.config();

import { handleManagerForwardCall } from "@portkey/contracts";

import AElf from "aelf-sdk";
import { deserializeLogs } from "./deserialize-logs";

// https://docs.aelf.io/en/latest/reference/chain-sdk/javascript/js-sdk.html

// const RPC_URL = "https://aelf-test-node.aelf.io";
const RPC_URL = "http://10.0.0.170:8000";
const CA_CONTRACT_ADDRESS =
  "2LUmicHyH4RXrMjG4beDwuDsiWJESyLkgkwPdGTR8kahRzq5XS";
const CREATE_CA_TRANSACTION_ID =
  "8141ffd140742b3779a4651d9d14ddffab41bc758a690a6343859ff34723df79";
const TO_ADDRESS = "2d5VE47tFtaGuYdYd1qto8AXX33hQudZBPasB2u621JqFNwLep";

const aelf = new AElf(new AElf.providers.HttpProvider(RPC_URL));
const wallet = AElf.wallet.getWalletByPrivateKey(process.env.PRIVATE_KEY);

const tokenContractName = "AElf.ContractNames.Token";
let tokenContractAddress;
(async () => {
  // get chain status
  const chainStatus = await aelf.chain.getChainStatus();
  // get genesis contract address
  const GenesisContractAddress = chainStatus.GenesisContractAddress;
  // get genesis contract instance
  const zeroContract = await aelf.chain.contractAt(
    GenesisContractAddress,
    wallet
  );
  // Get contract address by the read only method `GetContractAddressByName` of genesis contract
  tokenContractAddress = await zeroContract.GetContractAddressByName.call(
    AElf.utils.sha256(tokenContractName)
  );

  const caContract = await aelf.chain.contractAt(CA_CONTRACT_ADDRESS, wallet);

  const res = await aelf.chain.getTxResult(CREATE_CA_TRANSACTION_ID);

  const logs = await deserializeLogs(
    aelf,
    res.Logs.filter((i) => i.Name === "CAHolderCreated")
  );

  const caHash = logs?.[0].caHash;

  if (caHash) {
    const params = await handleManagerForwardCall({
      paramsOption: {
        caHash,
        contractAddress: tokenContractAddress,
        methodName: "Transfer",
        args: {
          to: TO_ADDRESS,
          symbol: "ELF",
          amount: "20000000",
          memo: "ca transfer",
        },
      },
      instance: aelf,
      functionName: "Transfer",
    });

    const res = await caContract.ManagerForwardCall({
      caHash,
      contractAddress: tokenContractAddress,
      methodName: "Transfer",
      args: params.args,
    });

    try {
      const res2 = await aelf.chain.getTxResult(res.TransactionId);

      console.log(res2);
    } catch (err) {
      console.log(err);
    }
  }
})();
