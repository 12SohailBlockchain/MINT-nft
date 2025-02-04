import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { notify } from "../utils/notifications";

const PROGRAM_ID = new PublicKey("BumhSMKnNLvWN2dbFumAQP4pfmHbHKiPnHQWtuqadXiP");

export default function Withdraw() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(0);

  const handleWithdraw = async () => {
    if (!publicKey) {
      notify({ type: "error", message: "Connect your wallet first!" });
      return;
    }
    setLoading(true);
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: PROGRAM_ID,
          toPubkey: publicKey,
          lamports: amount * 1_000_000_000, // Convert SOL to lamports
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "processed");
      notify({ type: "success", message: "Withdrawal Successful!", txid: signature });
    } catch (error) {
      notify({ type: "error", message: error.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount in SOL"
      />
      <button onClick={handleWithdraw} disabled={loading}>
        {loading ? "Withdrawing..." : "Withdraw SOL"}
      </button>
    </div>
  );
}
