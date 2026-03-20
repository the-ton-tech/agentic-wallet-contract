import { Address, toNano } from '@ton/core';
import { NetworkProvider, sleep } from '@ton/blueprint';
import {
    addressHash,
    AgenticWallet,
    createAddExtensionExtraAction,
    createSnakedExtraActions,
} from '../wrappers/AgenticWallet';

export async function run(provider: NetworkProvider, args: string[] = []) {
    const ui = provider.ui();
    const senderAddress = provider.sender().address;
    if (!senderAddress) {
        throw new Error('Sender address is required');
    }

    const walletAddress = args[0] ? Address.parse(args[0]) : await ui.inputAddress('Agentic wallet address');
    const extensionAddress = args[1] ? Address.parse(args[1]) : await ui.inputAddress('Extension address');
    const value = toNano(args[2] ?? '0.05');

    if (!(await provider.isContractDeployed(walletAddress))) {
        throw new Error(`Agentic wallet ${walletAddress.toString()} is not deployed`);
    }

    const wallet = provider.open(AgenticWallet.createFromAddress(walletAddress));
    const nftData = await wallet.getNftData();
    if (!nftData.isInitialized || !nftData.ownerAddress) {
        throw new Error(`Agentic wallet ${walletAddress.toString()} is not initialized`);
    }
    if (!nftData.ownerAddress.equals(senderAddress)) {
        throw new Error(
            `Sender ${senderAddress.toString()} is not wallet owner ${nftData.ownerAddress.toString()}`,
        );
    }

    const extensionHash = addressHash(extensionAddress);
    const extensionsBefore = await wallet.getExtensions();
    if (extensionsBefore.get(extensionHash)) {
        ui.write(`Extension ${extensionAddress.toString()} is already added to ${walletAddress.toString()}`);
        return;
    }

    ui.write(`Adding extension ${extensionAddress.toString()} to ${walletAddress.toString()}...`);

    await wallet.sendExtensionActionRequest(provider.sender(), value, {
        queryId: BigInt(Date.now()),
        hasExtraActions: true,
        extraActions: createSnakedExtraActions([createAddExtensionExtraAction(extensionAddress)]),
    });

    ui.write('Waiting for extension to appear in get_extensions...');

    let attempt = 1;
    while (true) {
        const extensions = await wallet.getExtensions();
        if (extensions.get(extensionHash)) {
            ui.clearActionPrompt();
            ui.write('Extension added successfully');
            return;
        }

        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        attempt += 1;
    }
}
