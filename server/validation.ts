import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// Sanitize text input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

// Known spam company names and patterns
const SPAM_COMPANY_PATTERNS = [
  /^test\s?(company|corp|corporation|inc|ltd)?$/i,
  /^example\s?(company|corp|corporation|inc|ltd)?$/i,
  /^sample\s?(company|corp|corporation|inc|ltd)?$/i,
  /^demo\s?(company|corp|corporation|inc|ltd)?$/i,
  /^testcorp$/i,
  /^testcompany$/i,
  /^acme$/i,
  /^fake\s?(company|corp)?$/i,
  /^spam\s?(company|corp)?$/i,
  /^bot\s?(company|corp)?$/i,
  /^robot\s?(company|corp)?$/i
];

// Known spam names
const SPAM_NAMES = [
  /^john\s+doe$/i,
  /^jane\s+doe$/i,
  /^test\s+user$/i,
  /^test\s+test$/i,
  /^spam\s+spam$/i,
  /^bot\s+bot$/i,
  /^fake\s+name$/i,
  /^sample\s+name$/i
];

// Common disposable email domains
const DISPOSABLE_DOMAINS = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.org',
  'throwaway.email', 'yopmail.com', 'maildrop.cc', 'temp-mail.org',
  'getairmail.com', 'sharklasers.com', 'guerrillamail.org', 'dispostable.com',
  'spam4.me', 'mohmal.com', 'mailnesia.com', 'trashmail.com'
];

// Honeypot field validation middleware
export const validateHoneypot = (req: Request, res: Response, next: NextFunction) => {
  const honeypotFields = ['email_confirm', 'website', 'company_url', 'phone_secondary'];
  
  for (const field of honeypotFields) {
    if (req.body[field] && req.body[field].trim() !== '') {
      // Bot detected - log and reject silently
      console.log(`Honeypot triggered: ${field} = "${req.body[field]}" from IP ${req.ip}`);
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Invalid form submission' }]
      });
    }
  }
  next();
};

// Spam detection for company names
export const validateCompanyName = (value: string): boolean | string => {
  if (!value) return true;
  
  const trimmedValue = value.trim();
  for (const pattern of SPAM_COMPANY_PATTERNS) {
    if (pattern.test(trimmedValue)) {
      throw new Error('Please enter a valid company name');
    }
  }
  return true;
};

// Spam detection for names
export const validatePersonName = (value: string): boolean | string => {
  if (!value) return true;
  
  const trimmedValue = value.trim();
  for (const pattern of SPAM_NAMES) {
    if (pattern.test(trimmedValue)) {
      throw new Error('Please enter a valid name');
    }
  }
  return true;
};

// Enhanced email validation with spam and MX checking
export const validateEmail = async (email: string): Promise<boolean | string> => {
  if (!email) return true; // Allow empty email since it's optional in some forms
  
  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split('@')[1];
  
  if (!domain) {
    throw new Error('Please enter a valid email address');
  }
  
  // Check for disposable email domains
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    throw new Error('Please use a permanent email address, not a temporary one');
  }
  
  // Check for personal domains for corporate forms
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'icloud.com', 'me.com', 'protonmail.com', 'aol.com', 'mail.com',
    'yandex.com', 'zoho.com', 'rediffmail.com'
  ];
  
  // Check common spam patterns in email
  const spamPatterns = [
    /test@test\./i,
    /spam@/i,
    /fake@/i,
    /bot@/i,
    /noreply@/i,
    /example@/i
  ];
  
  for (const pattern of spamPatterns) {
    if (pattern.test(normalizedEmail)) {
      throw new Error('Please enter a valid email address');
    }
  }
  
  // Verify MX record exists for domain
  try {
    await resolveMx(domain);
  } catch (error) {
    throw new Error('Please enter an email with a valid domain');
  }
  
  return true;
};

// Middleware to check validation results
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Corporate booking validation rules
export const validateCorporateBooking = [
  // Honeypot validation first
  validateHoneypot,
  body('companyName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters')
    .customSanitizer(sanitizeInput)
    .custom(validateCompanyName),
  body('customerName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Contact person name must be between 2 and 50 characters')
    .customSanitizer(sanitizeInput)
    .custom(validatePersonName),
  body('phone')
    .matches(/^(?:\+?88)?01[3-9]\d{8}$/)
    .withMessage('Please enter a valid Bangladeshi phone number (01XXXXXXXX)'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address')
    .custom(async (email) => {
      if (!email) return true; // Allow empty email since it's optional
      const personalDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
        'icloud.com', 'me.com', 'protonmail.com', 'aol.com', 'mail.com',
        'yandex.com', 'zoho.com', 'rediffmail.com'
      ];
      const domain = email.split('@')[1]?.toLowerCase();
      if (personalDomains.includes(domain)) {
        throw new Error('Please enter a company email address, not a personal email');
      }
      return await validateEmail(email);
    }),
  body('recaptcha')
    .custom((value) => {
      // Only require reCAPTCHA if RECAPTCHA_SECRET_KEY is configured
      if (process.env.RECAPTCHA_SECRET_KEY && !value) {
        throw new Error('Please complete the security verification');
      }
      return true;
    }),
  body('officeAddress')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Office address cannot exceed 200 characters')
    .customSanitizer(sanitizeInput),
  body('serviceType')
    .isIn(['office-pick-drop', 'rental', 'airport-transfer'])
    .withMessage('Please select a valid service type'),
  body('contractType')
    .isIn(['ad-hoc', 'monthly', 'custom'])
    .withMessage('Please select a valid contract type'),
  handleValidationErrors
];

// Rental booking validation rules
export const validateRentalBooking = [
  // Honeypot validation first
  validateHoneypot,
  body('customerName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Customer name must be between 2 and 50 characters')
    .customSanitizer(sanitizeInput)
    .custom(validatePersonName),
  body('phone')
    .matches(/^(?:\+?88)?01[3-9]\d{8}$/)
    .withMessage('Please enter a valid Bangladeshi phone number (01XXXXXXXX)'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address')
    .custom(async (email) => {
      if (email) {
        return await validateEmail(email);
      }
      return true;
    }),
  body('recaptcha')
    .custom((value) => {
      // Only require reCAPTCHA if RECAPTCHA_SECRET_KEY is configured
      if (process.env.RECAPTCHA_SECRET_KEY && !value) {
        throw new Error('Please complete the security verification');
      }
      return true;
    }),
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date')
    .custom((value) => {
      const inputDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day
      if (inputDate < today) {
        throw new Error('Start date must be today or in the future');
      }
      return true;
    }),
  body('endDate')
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be on or after start date');
      }
      return true;
    }),
  body('startTime')
    .notEmpty()
    .matches(/^(1[0-2]|0?[1-9]):[0-5][0-9]\s?(AM|PM)$/)
    .withMessage('Please select a valid start time (e.g., 1:00 PM, 1:30 PM)'),
  body('endTime')
    .optional({ values: 'falsy' })
    .matches(/^(1[0-2]|0?[1-9]):[0-5][0-9]\s?(AM|PM)$/)
    .withMessage('Please select a valid end time (e.g., 2:00 PM, 2:30 PM)'),
  body('serviceType')
    .optional()
    .custom((value) => {
      // Accept any string or allow it to be optional
      return true;
    }),
  body('vehicleType')
    .notEmpty()
    .isIn(['super-economy', 'economy', 'standard', 'premium', 'luxury', 'ultra-luxury'])
    .withMessage('Please select a valid vehicle type'),
  body('capacity')
    .optional()
    .isIn(['4', '7', '11', '28', '32', '40'])
    .withMessage('Please select a valid vehicle capacity'),
  body('vehicleCapacity')
    .optional()
    .custom((value) => {
      // Accept any string or allow it to be optional
      return true;
    }),
  body('isReturnTrip')
    .optional()
    .isBoolean()
    .withMessage('Return trip must be true or false'),
  body('fromLocation')
    .notEmpty()
    .isLength({ min: 3, max: 200 })
    .withMessage('From location is required and must be between 3 and 200 characters')
    .customSanitizer(sanitizeInput),
  body('toLocation')
    .notEmpty()
    .isLength({ min: 3, max: 200 })
    .withMessage('To location is required and must be between 3 and 200 characters')
    .customSanitizer(sanitizeInput),
  handleValidationErrors
];

// Vendor registration validation rules
export const validateVendorRegistration = [
  // Honeypot validation first
  validateHoneypot,
  body('fullName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .customSanitizer(sanitizeInput)
    .custom(validatePersonName),
  body('phone')
    .matches(/^(?:\+?88)?01[3-9]\d{8}$/)
    .withMessage('Please enter a valid Bangladeshi phone number (01XXXXXXXX)'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address')
    .custom(async (email) => {
      return await validateEmail(email);
    }),
  body('recaptcha')
    .custom((value) => {
      // Only require reCAPTCHA if RECAPTCHA_SECRET_KEY is configured
      if (process.env.RECAPTCHA_SECRET_KEY && !value) {
        throw new Error('Please complete the security verification');
      }
      return true;
    }),
  body('location')
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters')
    .customSanitizer(sanitizeInput),
  body('vehicleTypes')
    .isArray({ min: 1 })
    .withMessage('Please select at least one vehicle type'),
  body('vehicleTypes.*')
    .isIn(['sedan', 'suv', 'microbus', 'van', 'bus', 'luxury-car'])
    .withMessage('Please select valid vehicle types'),
  body('serviceModality')
    .notEmpty()
    .isIn(['driver-vehicle', 'vehicle-only', 'driver-only', 'fleet-services'])
    .withMessage('Please select a valid service modality'),
  body('experience')
    .notEmpty()
    .isIn(['less-than-1', '1-3', '3-5', '5-10', 'more-than-10'])
    .withMessage('Please select a valid experience range'),
  body('additionalInfo')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Additional information cannot exceed 500 characters')
    .customSanitizer(sanitizeInput),
  handleValidationErrors
];

// Contact message validation rules
export const validateContactMessage = [
  // Honeypot validation first
  validateHoneypot,
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .customSanitizer(sanitizeInput)
    .custom(validatePersonName),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address')
    .custom(async (email) => {
      return await validateEmail(email);
    }),
  body('phone')
    .optional()
    .matches(/^(\+880|880|0)?1[3-9]\d{8}$/)
    .withMessage('Please enter a valid Bangladeshi phone number'),
  body('subject')
    .isLength({ min: 5, max: 100 })
    .withMessage('Subject must be between 5 and 100 characters')
    .customSanitizer(sanitizeInput),
  body('message')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
    .customSanitizer(sanitizeInput),
  body('recaptcha')
    .custom((value) => {
      // Only require reCAPTCHA if RECAPTCHA_SECRET_KEY is configured
      if (process.env.RECAPTCHA_SECRET_KEY && !value) {
        throw new Error('Please complete the security verification');
      }
      return true;
    }),
  handleValidationErrors
];