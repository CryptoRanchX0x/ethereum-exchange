import { useState } from "react";
import { api } from "../services/api";
import { InputField } from "../components/InputField";

export function MintPage() {
  const [contract, setContract] = useState("");
  const [amount, setAmount] = useState("");
  const [response, setResponse] = useState<any>(null);

  async function handleMint() {
    const res = await api.post("/mint", { contract_address: contract, amount });
    setResponse(res.data);
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Mint Tokens</h2>
      <InputField label="Endereço do Contrato" value={contract} onChange={setContract} />
      <InputField label="Quantidade" value={amount} onChange={setAmount} />
      <button
        onClick={handleMint}
        style={{
          backgroundColor: "#EC7000",
          color: "white",
          padding: ".75rem 1.5rem",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer"
        }}
      >
        Executar Mint
      </button>

      {response && (
        <pre style={{ marginTop: "1rem", background: "#f5f5f5", padding: "1rem" }}>
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}
