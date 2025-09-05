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
    .withMessage('Please enter a valid email address'),
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
    .isAfter(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Allow today or future
    .withMessage('Start date must be today or in the future'),
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
    .matches(/^(1[0-2]|0?[1-9]):00\s?(AM|PM)$/)
    .withMessage('Please select a valid start time (e.g., 1:00 PM)'),
  body('endTime')
    .optional()
    .matches(/^(1[0-2]|0?[1-9]):00\s?(AM|PM)$/)
    .withMessage('Please select a valid end time (e.g., 2:00 PM)'),
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
  body('serviceType')
    .notEmpty()
    .isIn(['personal', 'business', 'airport', 'wedding', 'event', 'tourism'])
    .withMessage('Please select a valid service type'),
  body('vehicleType')
    .notEmpty()
    .isIn(['super-economy', 'economy', 'standard', 'premium', 'luxury', 'ultra-luxury'])
    .withMessage('Please select a valid vehicle type'),
  body('vehicleCapacity')
    .notEmpty()
    .isIn(['4-seater', '7-seater', '11-seater', '28-seater', '32-seater', '40-seater'])
    .withMessage('Please select a valid vehicle capacity'),
  body('isReturnTrip')
    .optional()
    .isBoolean()
    .withMessage('Return trip must be true or false'),
  handleValidationErrors
];

// Vendor registration validation rules
export const validateVendorRegistration = [
  body('companyName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters')
    .customSanitizer(sanitizeInput),
  body('contactPerson')
    .isLength({ min: 2, max: 50 })
    .withMessage('Contact person name must be between 2 and 50 characters')
    .customSanitizer(sanitizeInput),
  body('phone')
    .matches(/^(?:\+?88)?01[3-9]\d{8}$/)
    .withMessage('Please enter a valid Bangladeshi phone number (01XXXXXXXX)'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('vehicleTypes')
    .isArray({ min: 1 })
    .withMessage('Please select at least one vehicle type'),
  body('vehicleTypes.*')
    .isIn(['sedan', 'suv', 'microbus', 'bus', 'truck'])
    .withMessage('Please select valid vehicle types'),
  body('experience')
    .isIn(['1-2', '3-5', '5-10', '10+'])
    .withMessage('Please select a valid experience range'),
  body('coverage')
    .isArray({ min: 1 })
    .withMessage('Please select at least one coverage area'),
  body('coverage.*')
    .isIn(['dhaka', 'chittagong', 'sylhet', 'rajshahi', 'khulna', 'barisal', 'rangpur', 'mymensingh'])
    .withMessage('Please select valid coverage areas'),
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