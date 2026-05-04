export function TextInput({ label, value, wide = false }) {
  return (
    <label className={wide ? "form-field wide" : "form-field"}>
      <span>{label}</span>
      <input defaultValue={value} />
    </label>
  );
}

export function SelectField({ label, value, options = [] }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select defaultValue={value}>
        {[value, ...options.filter((option) => option !== value)].map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({ label, value, max = 500 }) {
  return (
    <label className="form-field textarea-field">
      <span>{label}</span>
      <textarea defaultValue={value} maxLength={max} />
      <small>{value.length} / {max}</small>
    </label>
  );
}
