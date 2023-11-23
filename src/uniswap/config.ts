
// Inputs that configure this example to run
export interface Config {
  rpc: string
  chainId: number
  wallet: {
    address: string
    privateKey: string
  }
}

export const CurrentConfig: Config = {
  rpc: "",
  chainId: 1,
  wallet: {
    address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    privateKey:
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
}
