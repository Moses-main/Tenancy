export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule | ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string;
}

export function validateField(value: string, rules: ValidationRule | ValidationRule[]): string | null {
  const ruleArray = Array.isArray(rules) ? rules : [rules];
  
  for (const rule of ruleArray) {
    if (rule.required && (!value || value.trim() === '')) {
      return 'This field is required';
    }
    
    if (value && rule.minLength !== undefined && value.length < rule.minLength) {
      return `Must be at least ${rule.minLength} characters`;
    }
    
    if (value && rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `Must be no more than ${rule.maxLength} characters`;
    }
    
    if (value && rule.min !== undefined && parseFloat(value) < rule.min) {
      return `Must be at least ${rule.min}`;
    }
    
    if (value && rule.max !== undefined && parseFloat(value) > rule.max) {
      return `Must be no more than ${rule.max}`;
    }
    
    if (value && rule.pattern && !rule.pattern.test(value)) {
      return 'Invalid format';
    }
    
    if (value && rule.custom) {
      const error = rule.custom(value);
      if (error) return error;
    }
  }
  
  return null;
}

export function validateForm(values: { [key: string]: string }, rules: ValidationRules): ValidationErrors {
  const errors: ValidationErrors = {};
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = values[field] || '';
    const error = validateField(value, fieldRules);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
}

export const commonRules = {
  required: { required: true },
  ethAddress: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    custom: (value: string) => {
      if (!value.startsWith('0x')) return 'Must start with 0x';
      if (value.length !== 42) return 'Must be 42 characters (including 0x)';
      return null;
    }
  },
  positiveNumber: {
    pattern: /^[0-9]+(\.[0-9]+)?$/,
    custom: (value: string) => {
      if (parseFloat(value) <= 0) return 'Must be a positive number';
      return null;
    }
  },
  url: {
    pattern: /^https?:\/\/.+/,
    custom: (value: string) => {
      try {
        new URL(value);
        return null;
      } catch {
        return 'Must be a valid URL';
      }
    }
  },
};

export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isPositiveNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

export function formatValidationError(error: string): string {
  return error.charAt(0).toUpperCase() + error.slice(1);
}
