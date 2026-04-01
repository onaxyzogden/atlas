import React from 'react';
import styles from './FormField.module.css';

export interface FormFieldProps {
  /** Text label displayed above the input. */
  label?: string;
  /** Associates the label with a specific input via id. */
  htmlFor?: string;
  /** Subtle guidance text shown below the input. */
  helperText?: string;
  /** Error message — replaces helper text and triggers error styling. */
  error?: string;
  /** Shows a required asterisk after the label. */
  required?: boolean;
  /** The form control(s) to render inside the field. */
  children: React.ReactNode;
  /** Additional class name on the outer wrapper. */
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  helperText,
  error,
  required = false,
  children,
  className,
}) => {
  const describedById = htmlFor
    ? error
      ? `${htmlFor}-error`
      : helperText
        ? `${htmlFor}-helper`
        : undefined
    : undefined;

  return (
    <div
      className={[styles.field, className ?? ''].filter(Boolean).join(' ')}
    >
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {required && <span className={styles.required} aria-hidden="true">*</span>}
        </label>
      )}

      <div className={styles.content}>
        {/* Clone child to inject aria-describedby if we have an id to link */}
        {describedById && React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              'aria-describedby': describedById,
            })
          : children}
      </div>

      {error ? (
        <p
          className={styles.errorText}
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          className={styles.helperText}
          id={htmlFor ? `${htmlFor}-helper` : undefined}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

FormField.displayName = 'FormField';
