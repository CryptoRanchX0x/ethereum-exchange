type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function InputField({ label, value, onChange, placeholder }: Props) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", marginBottom: ".5rem", fontWeight: "bold" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: ".75rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontSize: "1rem",
        }}
      />
    </div>
  );
}
