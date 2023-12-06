import { BigNumber, BigNumberish, Signer, ethers , providers} from "ethers";

import ReferralStorage from "../../../abis/ReferralStorage.json";
import Timelock from "../../../abis/Timelock.json";
import { getContract } from "../../../config/contracts";
import { callContract } from "../../../lib/contracts";
import { basisPointsToFloat } from "../../../lib/numbers";
import { getProvider } from "../../../lib/rpc";
import { isHashZero } from "../../../lib/legacy";
import { UserReferralInfo } from "../types";
import { decodeReferralCode, encodeReferralCode } from "../utils";

// export * from "./useReferralsData";


export async function useUserReferralInfo(
  signer: Signer | undefined,
  chainId: number,
  account?: string | null,
  _skipLocalReferralCode = true
): Promise<UserReferralInfo | undefined> {
  const { userReferralCode, userReferralCodeString, attachedOnChain, referralCodeForTxn } = await useUserReferralCode(
    signer,
    chainId,
    account!
  );

  if (
    !userReferralCode ||
    !userReferralCodeString ||
    !referralCodeForTxn
  ) {
    return undefined;
  }


  const { codeOwner } = await useCodeOwner(signer!, chainId, account!, userReferralCode);
  const { affiliateTier: tierId } = await useAffiliateTier(signer!, chainId, codeOwner);
  const { totalRebate, discountShare } = await useTiers(signer, chainId, tierId);
  const { discountShare: customDiscountShare } = await useReferrerDiscountShare(signer, chainId, codeOwner);
  const finalDiscountShare = customDiscountShare?.gt(0) ? customDiscountShare : discountShare;
  if (
    !codeOwner ||
    !tierId ||
    !totalRebate ||
    !finalDiscountShare
  ) {
    return undefined;
  }

  return {
    userReferralCode,
    userReferralCodeString,
    referralCodeForTxn,
    attachedOnChain,
    affiliate: codeOwner,
    tierId,
    totalRebate,
    totalRebateFactor: basisPointsToFloat(totalRebate),
    discountShare: finalDiscountShare,
    discountFactor: basisPointsToFloat(finalDiscountShare),
  };
}

export async function useAffiliateTier(signer: Signer | undefined, chainId: number, account: string) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const provider = getProvider(signer, chainId);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider);
  let res = await callContract(chainId, contract, "referrerTiers", [account], {});

  return {
    affiliateTier: res as BigNumber,
  };
}

export async function useTiers(signer: Signer | undefined, chainId: number, tierLevel?: BigNumberish) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const provider = getProvider(signer, chainId);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider);
  let res = await callContract(chainId, contract, "tiers", [tierLevel!.toString()], {}) as BigNumber[];
  return {
    totalRebate: res[0],
    discountShare: res[1],
  };
}

export async function setAffiliateTier(chainId: number, affiliate: string, tierId: number, signer: Signer, opts: any) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const timelockAddress = getContract(chainId, "Timelock");
  const contract = new ethers.Contract(timelockAddress, Timelock.abi, signer);
  return callContract(chainId, contract, "setReferrerTier", [referralStorageAddress, affiliate, tierId], opts);
}

export async function registerReferralCode(chainId: number, referralCode: string, signer: Signer, opts: any) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const referralCodeHex = encodeReferralCode(referralCode);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, signer);
  return callContract(chainId, contract, "registerCode", [referralCodeHex], opts);
}


export async function getReferralCodeOwner(chainId: number, referralCode: string) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const provider = getProvider(undefined, chainId);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider);
  const codeOwner = await contract.codeOwners(referralCode);
  return codeOwner;
}

export async function useUserReferralCode(_signer: Signer | undefined, chainId: number, account: string | null) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const provider = getProvider(_signer, chainId);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider);
  const onChainCode = await callContract(chainId, contract, "traderReferralCodes", [account], {}) as string;

  let attachedOnChain = false;
  let userReferralCode: string | undefined = undefined;
  let userReferralCodeString: string | undefined = undefined;
  let referralCodeForTxn = ethers.constants.HashZero;

  if ((onChainCode && !isHashZero(onChainCode))) {
    attachedOnChain = true;
    userReferralCode = onChainCode;
    userReferralCodeString = decodeReferralCode(onChainCode);
  }

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
    referralCodeForTxn,
  };
}

export async function useCodeOwner(signer: Signer | null, chainId: number, _account: string | null, code: string | undefined) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");
  const provider = getProvider(signer!, chainId);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider);
  const codeOwner = await callContract(chainId, contract, "codeOwners", [code], {}) as string;

  console.log("codeOwner", codeOwner)
  return {
    codeOwner,
  };
}

export async function useReferrerDiscountShare(library: Signer | undefined, chainId: number, owner: string) {
  const referralStorageAddress = getContract(chainId, "ReferralStorage");

  const provider = getProvider(library!, chainId);
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider);
  const discountShare = await callContract(chainId, contract, "referrerDiscountShares", [owner.toLowerCase()], {}) as BigNumber | undefined;

  return {
    discountShare,
  };
}

