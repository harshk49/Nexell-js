/**
 * Standardized API response format
 *
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {Number} options.status - HTTP status code
 * @param {String} options.message - Response message
 * @param {Object} options.data - Response data
 * @param {String} options.error - Error code if applicable
 * @param {Array} options.errors - Detailed error information if applicable
 * @param {String} options.requestId - Request ID for tracking
 * @returns {Object} Express response
 */
export const apiResponse = (res, options) => {
  const {
    status = 200,
    message,
    data = {},
    error = null,
    errors = [],
    requestId = null,
  } = options;

  const responseBody = {
    success: status < 400,
    message,
    requestId,
  };

  // Include data only for success responses
  if (status < 400 && Object.keys(data).length > 0) {
    responseBody.data = data;
  }

  // Include error information for error responses
  if (status >= 400) {
    if (error) {
      responseBody.error = error;
    }

    if (errors && errors.length > 0) {
      responseBody.errors = errors;
    }
  }

  // Include pagination if provided
  if (data && data.pagination) {
    responseBody.pagination = data.pagination;

    // Remove pagination from data to avoid duplication
    if (responseBody.data && responseBody.data.pagination) {
      const { pagination, ...restData } = responseBody.data;
      responseBody.data = restData;
    }
  }

  return res.status(status).json(responseBody);
};

/**
 * Helper for creating a paginated response
 *
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {Number} options.status - HTTP status code (default: 200)
 * @param {String} options.message - Response message
 * @param {Array} options.data - Array of items
 * @param {Object} options.pagination - Pagination details
 * @param {String} options.requestId - Request ID for tracking
 * @returns {Object} Express response
 */
export const paginatedResponse = (res, options) => {
  const {
    status = 200,
    message,
    data = [],
    pagination = {},
    requestId = null,
  } = options;

  return apiResponse(res, {
    status,
    message,
    data: {
      items: data,
      pagination,
    },
    requestId,
  });
};
