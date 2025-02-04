import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import idl from "../idl/solana_nft_anchor.json";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from "@solana/spl-token";
import { notify } from "../utils/notifications";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import dynamic from 'next/dynamic';

// Define program IDs - use the exact string to avoid any parsing issues
const PROGRAM_ID = new PublicKey("3aobcaoXeirkkssdrh5UZwvg2r9hg14RKW3vUqv3ZtYS");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Mint() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [program, setProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!connection || !wallet.publicKey) return;

    try {
      const provider = new anchor.AnchorProvider(
        connection, 
        wallet,
        { 
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        }
      );
      anchor.setProvider(provider);

      // Use the hardcoded PROGRAM_ID
      const program = new anchor.Program(idl, PROGRAM_ID, provider);
      setProgram(program);
    } catch (error) {
      console.error("Failed to initialize program:", error);
      notify({ type: "error", message: "Failed to initialize program" });
    }
  }, [connection, wallet.publicKey]);

  const mintNFT = async () => {
    if (!program || !wallet.publicKey) {
      notify({ type: "error", message: "Please connect your wallet first!" });
      return;
    }

    if (!wallet.signTransaction || !wallet.signAllTransactions) {
      notify({ type: "error", message: "Wallet doesn't support signing!" });
      return;
    }

    setIsLoading(true);
    try {
      // Generate a new keypair for the mint
      const mintKeypair = Keypair.generate();

      // Get associated token account address
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        wallet.publicKey
      );

      // Get metadata account address
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Get master edition account address
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Create transaction instruction
      const instruction = await program.methods
        .initNft(
          "Gold Membership NFT",
          "GMN",
          "https://rose-previous-peacock-704.mypinata.cloud/ipfs/bafkreih67bfr7taac6zd2izx5wllu32jklpw3ez5qrgdksw7qq4fpmwg7m"
        )
        .accounts({
          signer: wallet.publicKey,
          mint: mintKeypair.publicKey,
          associatedTokenAccount: associatedTokenAccount,
          metadataAccount: metadataAccount,
          masterEditionAccount: masterEditionAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // Create transaction
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      const transaction = new anchor.web3.Transaction({
        feePayer: wallet.publicKey,
        ...latestBlockhash,
      });

      // Add instruction to transaction
      transaction.add(instruction);

      // Add mint keypair as signer
      transaction.sign(mintKeypair);

      // Sign and send transaction
      try {
        const signedTransaction = await wallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        console.log("Sending transaction:", signature);

        const confirmation = await connection.confirmTransaction({
          signature,
          ...latestBlockhash
        }, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }

        console.log("Transaction confirmed:", signature);
        notify({ 
          type: "success", 
          message: `NFT Minted Successfully! Signature: ${signature.slice(0, 8)}...` 
        });
      } catch (txError) {
        console.error("Transaction error:", txError);
        throw new Error(`Transaction failed: ${txError.message}`);
      }
    } catch (error) {
      console.error("Mint error:", error);
      notify({ 
        type: "error", 
        message: `Error minting NFT: ${error.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <ToastContainer />
      <WalletMultiButtonDynamic />
      <button 
        onClick={mintNFT} 
        disabled={!wallet.publicKey || isLoading}
        className={`px-4 py-2 rounded mt-4 ${
          !wallet.publicKey 
            ? 'bg-gray-400' 
            : isLoading 
              ? 'bg-yellow-500' 
              : 'bg-blue-500 hover:bg-blue-600'
        } text-white font-bold`}
      >
        {isLoading ? "Minting..." : "Mint NFT"}
      </button>
    </div>
  );
}
