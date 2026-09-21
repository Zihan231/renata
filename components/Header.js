// Top bar: "100 Bioequivalent Products" badge on the left, Renata PLC logo on the right.
export default function Header() {
  return (
    <div className="brand-row">
      <div className="brand brand-l">
        <img src="/img/logo-100.webp" alt="100 Bioequivalent Products – Young minds, global impact" width="320" height="182" decoding="async" />
      </div>
      <div className="brand brand-r">
        <img src="/img/logo.png" alt="Renata PLC" width="172" height="34" decoding="async" />
      </div>
    </div>
  );
}
