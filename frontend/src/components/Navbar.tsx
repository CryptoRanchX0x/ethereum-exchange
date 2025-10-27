import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <nav style={{
      backgroundColor: "#EC7000",
      padding: "1rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      color: "white",
      fontWeight: "bold"
    }}>
      <span>🏦 IU Exchange</span>
      <div style={{ display: "flex", gap: "1rem" }}>
        <Link to="/" style={{ color: "white", textDecoration: "none" }}>Home</Link>
        <Link to="/mint" style={{ color: "white", textDecoration: "none" }}>Mint</Link>
        <Link to="/burn" style={{ color: "white", textDecoration: "none" }}>Burn</Link>
        <Link to="/call-function" style={{ color: "white", textDecoration: "none" }}>Call Function</Link>
      </div>
    </nav>
  );
}
