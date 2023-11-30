import "@ethersproject/shims";
import { ethers } from "ethers";

export function hashData(dataTypes: readonly (string | ethers.utils.ParamType)[], dataValues: readonly any[]) {
  const bytes = ethers.utils.defaultAbiCoder.encode(dataTypes, dataValues);
  const hash = ethers.utils.keccak256(ethers.utils.arrayify(bytes));

  return hash;
}

export function hashString(string: string) {
  return hashData(["string"], [string]);
}