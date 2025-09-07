import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

// Sanitize text input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
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
  body('companyName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters')
    .customSanitizer(sanitizeInput),
  body('customerName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Contact person name must be between 2 and 50 characters')
    .customSanitizer(sanitizeInput),
  body('phone')
    .matches(/^(?:\+?88)?01[3-9]\d{8}$/)
    .withMessage('Please enter a valid Bangladeshi phone number (01XXXXXXXX)'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address')
    .custom((email) => {
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
  body('customerName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Customer name must be between 2 and 50 characters')
    .customSanitizer(sanitizeInput),
  body('phone')
    .matches(/^(?:\+?88)?01[3-9]\d{8}$/)
    .withMessage('Please enter a valid Bangladeshi phone number (01XXXXXXXX)'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
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
    .optional()
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
  body('fullName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .customSanitizer(sanitizeInput),
  body('phone')
    .matches(/^(?:\+?88)?01[3-9]\d{8}$/)
    .withMessage('Please enter a valid Bangladeshi phone number (01XXXXXXXX)'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
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
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .customSanitizer(sanitizeInput),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
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
  handleValidationErrors
];