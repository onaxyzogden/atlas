import styles from './FormFields.module.css';

interface TextInputProps {
  label: string;
  value: string;
  wide?: boolean;
  type?: 'text' | 'number' | 'email' | 'tel';
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function TextInput({
  label,
  value,
  wide = false,
  type = 'text',
  placeholder,
  onChange,
}: TextInputProps) {
  const controlled = onChange !== undefined;
  return (
    <label className={wide ? `${styles.field} wide` : styles.field}>
      <span>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : { defaultValue: value })}
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options?: string[];
  onChange?: (value: string) => void;
}

export function SelectField({ label, value, options = [], onChange }: SelectFieldProps) {
  const controlled = onChange !== undefined;
  const allOptions = [value, ...options.filter((option) => option !== value)];
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : { defaultValue: value })}
      >
        {allOptions.map((option) => (
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
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function TextAreaField({
  label,
  value,
  max = 500,
  placeholder,
  onChange,
}: TextAreaFieldProps) {
  const controlled = onChange !== undefined;
  return (
    <label className={`${styles.field} textarea-field`}>
      <span>{label}</span>
      <textarea
        maxLength={max}
        placeholder={placeholder}
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : { defaultValue: value })}
      />
      <small>
        {value.length} / {max}
      </small>
    </label>
  );
}
