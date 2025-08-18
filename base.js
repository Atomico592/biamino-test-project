import { ethers } from "ethers";

const RPC_URL= process.env.RPC_ETH_URL;
const PRIVATE_KEY =  process.env.WALLET_ETH_KEY;

const USDT = "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2";
const WETH = "0x4200000000000000000000000000000000000006";

const ROUTER = "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);


