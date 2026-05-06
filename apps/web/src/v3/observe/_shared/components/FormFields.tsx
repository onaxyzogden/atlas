interface TextInputProps {
  label: string;
  value: string;
  wide?: boolean;
}

export function TextInput({ label, value, wide = false }: TextInputProps) {
  return (
    <label className={wide ? 'form-field wide' : 'form-field'}>
      <span>{label}</span>
      <input defaultValue={value} />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options?: string[];
}

export function SelectField({ label, value, options = [] }: SelectFieldProps) {
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

interface TextAreaFieldProps {
  label: string;
  value: string;
  max?: number;
}

export function TextAreaField({ label, value, max = 500 }: TextAreaFieldProps) {
  return (
    <label className="form-field textarea-field">
      <span>{label}</span>
      <textarea defaultValue={value} maxLength={max} />
      <small>
        {value.length} / {max}
      </small>
    </label>
  );
}
