import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>Solana NFT Minting</h1>
      <WalletMultiButton />
      
      {publicKey && (
        <>
          <p>Wallet Connected: {publicKey.toBase58()}</p>
          <Link href="/mint">
            <button style={{ margin: "10px", padding: "10px", fontSize: "16px" }}>Mint NFT</button>
          </Link>
          <Link href="/withdraw">
            <button style={{ margin: "10px", padding: "10px", fontSize: "16px" }}>Withdraw Funds</button>
          </Link>
        </>
      )}
    </div>
  );
}
