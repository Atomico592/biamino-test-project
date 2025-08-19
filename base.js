import { ethers } from "ethers";
import 'dotenv/config';

const RPC_URL= process.env.RPC_ETH_URL;
const PRIVATE_KEY =  process.env.WALLET_ETH_KEY;

const USDT = "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2";
const WETH = "0x4200000000000000000000000000000000000006";

const ROUTER = "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const amountInUSDT = ethers.parseUnits("1", 6);
const amountOutMinETH = ethers.parseEther("0.0001");
const amountInETH = ethers.parseEther("0.0001");
const amountOutMinUSDT = ethers.parseUnits("0.5", 6);

const routerAbi = [
    "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256)"
];
const router = new ethers.Contract(ROUTER, routerAbi, wallet);

const  swapUSDTtoETH = async () => {
    try {
    const erc20Abi = ["function approve(address spender, uint value) external returns (bool)"];
    const usdt = new ethers.Contract(USDT, erc20Abi, wallet);
    await (await usdt.approve(ROUTER, amountInUSDT)).wait();
    const params = {
        tokenIn: USDT,
        tokenOut: WETH,
        fee: 3000,
        recipient: await wallet.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
        amountIn: amountInUSDT,
        amountOutMinimum: amountOutMinETH,
        sqrtPriceLimitX96: 0
    };
    const tx = await router.exactInputSingle(params, { gasLimit: 500000 });
    await tx.wait();
    console.log(`USDT -> ETH: https://basescan.org/tx/${tx.hash}`);
    } catch (error) {
        console.error(error);
    }
}
const  swapETHtoUSDT = async () => {
    try {
    const params = {
        tokenIn: WETH,
        tokenOut: USDT,
        fee: 3000,
        recipient: await wallet.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
        amountIn: amountInETH,
        amountOutMinimum: amountOutMinUSDT,
        sqrtPriceLimitX96: 0
    };
    const tx = await router.exactInputSingle(params, {
        gasLimit: 500000,
        value: amountInETH
    });
    await tx.wait();
    console.log(`ETH -> USDT: https://basescan.org/tx/${tx.hash}`);
    } catch (error) {
        console.log(error);
    }
}

const runTx = async () => {
    await swapUSDTtoETH();
    await swapETHtoUSDT();
}

runTx();



