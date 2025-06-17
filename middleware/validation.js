import Ajv from "ajv";
import addFormats from "ajv-formats";
import logger from "../utils/logger.js";
import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../utils/apiResponse.js";

// Initialize Ajv
const ajv = new Ajv({ allErrors: true, coerceTypes: true, useDefaults: true });
addFormats(ajv); // Add support for formats like email, date-time, etc.

/**
 * Validates request body, params, and/or query against given schemas
 * @param {Object} schemas - Object containing schemas for body, params, and/or query
 * @returns {Function} Express middleware function
 */
export const validateRequest = (schemas = {}) => {
  return (req, res, next) => {
    try {
      const errors = [];

      // Validate request body if schema provided
      if (schemas.body && Object.keys(req.body).length > 0) {
        const validateBody = ajv.compile(createJsonSchema(schemas.body));
        if (!validateBody(req.body)) {
          errors.push(...formatAjvErrors(validateBody.errors, "body"));
        }
      }

      // Validate request params if schema provided
      if (schemas.params && Object.keys(req.params).length > 0) {
        const validateParams = ajv.compile(createJsonSchema(schemas.params));
        if (!validateParams(req.params)) {
          errors.push(...formatAjvErrors(validateParams.errors, "params"));
        }
      }

      // Validate request query if schema provided
      if (schemas.query && Object.keys(req.query).length > 0) {
        const validateQuery = ajv.compile(createJsonSchema(schemas.query));
        if (!validateQuery(req.query)) {
          errors.push(...formatAjvErrors(validateQuery.errors, "query"));
        }
      }

      // If there are validation errors, return error response
      if (errors.length > 0) {
        logger.warn("Validation errors", {
          errors,
          path: req.path,
          userId: req.user?.userId,
          requestId: req.requestId,
        });

        return apiResponse(res, {
          status: StatusCodes.BAD_REQUEST,
          message: "Validation failed",
          error: "VALIDATION_ERROR",
          errors,
          requestId: req.requestId,
        });
      }

      return next();
    } catch (error) {
      logger.error("Validation middleware error", {
        error: error.message,
        stack: error.stack,
        path: req.path,
        requestId: req.requestId,
      });

      return apiResponse(res, {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Validation system error",
        error: "VALIDATION_SYSTEM_ERROR",
        requestId: req.requestId,
      });
    }
  };
};

/**
 * Creates a JSON Schema from a simplified schema object
 * @param {Object} schema - Simplified schema object
 * @returns {Object} JSON Schema object
 */
function createJsonSchema(schema) {
  return {
    type: "object",
    properties: schema,
    required: Object.keys(schema).filter((key) => schema[key].required),
    additionalProperties: false,
  };
}

/**
 * Formats AJV validation errors into a user-friendly format
 * @param {Array} ajvErrors - AJV error objects
 * @param {String} location - Location of the error (body, params, query)
 * @returns {Array} Formatted error objects
 */
function formatAjvErrors(ajvErrors, location) {
  return ajvErrors.map((err) => {
    const path =
      err.instancePath.substring(1) || err.params.missingProperty || "";
    const fullPath = path ? `${location}.${path}` : location;

    let message;
    switch (err.keyword) {
      case "required":
        message = `${err.params.missingProperty} is required`;
        break;
      case "type":
        message = `should be ${err.params.type}`;
        break;
      case "minLength":
        message = `should be at least ${err.params.limit} characters`;
        break;
      case "maxLength":
        message = `should not exceed ${err.params.limit} characters`;
        break;
      case "format":
        message = `should match format "${err.params.format}"`;
        break;
      case "pattern":
        message = `should match pattern`;
        break;
      case "enum":
        message = `should be one of: ${err.params.allowedValues.join(", ")}`;
        break;
      default:
        message = err.message;
    }

    return {
      path: fullPath,
      message,
      type: err.keyword,
    };
  });
}
